import fs from 'fs';
import path from 'path';
import os from 'os';
import readline from 'readline';
import { z } from 'zod';
import { createTtlCache } from './cache.js';
import { getTimeWindows } from './time.js';

const RateLimitSlotSchema = z
  .object({
    used_percent: z.number().optional().default(0),
    window_minutes: z.number().optional(),
    resets_at: z.number(),
  })
  .nullable();

const CodexEventSchema = z.object({
  type: z.literal('event_msg'),
  payload: z.object({
    type: z.literal('token_count'),
    rate_limits: z.object({
      primary: RateLimitSlotSchema,
      secondary: RateLimitSlotSchema,
    }),
  }),
});

export interface CodexRateLimitSlot {
  usedPercent: number;
  resetsAt: number;
  windowMinutes: number | null;
}

export interface CodexRateLimits {
  primary: CodexRateLimitSlot | null;
  secondary: CodexRateLimitSlot | null;
}

// Some plans only report a single window (usually the 7d one) in `primary`
// and leave `secondary` null, so pick whichever slot covers the longer window.
export function selectLongestWindowSlot(
  rateLimits: CodexRateLimits | null,
): CodexRateLimitSlot | null {
  const { primary, secondary } = rateLimits ?? {};
  if (primary && secondary) {
    return (primary.windowMinutes ?? 0) >= (secondary.windowMinutes ?? 0) ? primary : secondary;
  }
  return secondary ?? primary ?? null;
}

export interface CodexSnapshot {
  available: boolean;
  dailyRequests: number;
  weeklyRequests: number;
  rateLimits: CodexRateLimits | null;
  model: string | null;
}

function getCodexDir(): string {
  return (
    process.env.CODEX_CONFIG_DIR ?? process.env.CODEX_HOME ?? path.join(os.homedir(), '.codex')
  );
}

async function readCodexModel(): Promise<string | null> {
  try {
    const raw = await fs.promises.readFile(path.join(getCodexDir(), 'config.toml'), 'utf8');
    const match = raw.match(/^model\s*=\s*"([^"]+)"/m);
    return match?.[1] ?? null;
  } catch {
    return null;
  }
}

async function findHistoryFile(): Promise<string | null> {
  const base = getCodexDir();
  const candidates = [path.join(base, 'history.jsonl'), path.join(base, 'sessions')];
  for (const c of candidates) {
    try {
      await fs.promises.access(c);
      return c;
    } catch {
      continue;
    }
  }
  return null;
}

async function findLatestSessionFile(): Promise<string | null> {
  const sessionsDir = path.join(getCodexDir(), 'sessions');
  try {
    const years = (await fs.promises.readdir(sessionsDir))
      .filter((y) => /^\d{4}$/.test(y))
      .sort()
      .reverse();
    for (const year of years) {
      const months = (await fs.promises.readdir(path.join(sessionsDir, year))).sort().reverse();
      for (const month of months) {
        const days = (await fs.promises.readdir(path.join(sessionsDir, year, month)))
          .sort()
          .reverse();
        for (const day of days) {
          const dayDir = path.join(sessionsDir, year, month, day);
          const files = (await fs.promises.readdir(dayDir))
            .filter((f) => f.endsWith('.jsonl'))
            .sort()
            .reverse();
          if (files.length > 0) return path.join(dayDir, files[0] as string);
        }
      }
    }
  } catch (_e) {
    // sessions dir not found or unreadable
  }
  return null;
}

async function readLastRateLimits(filePath: string): Promise<CodexRateLimits | null> {
  const stream = fs.createReadStream(filePath, { encoding: 'utf8' });
  const rl = readline.createInterface({ input: stream, crlfDelay: Infinity });
  let last: CodexRateLimits | null = null;
  for await (const line of rl) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    try {
      const result = CodexEventSchema.safeParse(JSON.parse(trimmed));
      if (!result.success) continue;
      const { rate_limits: r } = result.data.payload;
      const toSlot = (
        slot: { used_percent: number; window_minutes?: number; resets_at: number } | null,
      ): CodexRateLimitSlot | null =>
        slot === null
          ? null
          : {
              usedPercent: slot.used_percent,
              resetsAt: slot.resets_at,
              windowMinutes: slot.window_minutes ?? null,
            };
      last = {
        primary: toSlot(r.primary),
        secondary: toSlot(r.secondary),
      };
    } catch (_e) {
      // skip malformed lines
    }
  }
  return last;
}

function extractHistoryEntryTimestampMs(entry: unknown): number {
  if (typeof entry !== 'object' || entry === null) return 0;
  const { ts, timestamp } = entry as Record<string, unknown>;
  if (typeof ts === 'number') return ts * 1000;
  if (typeof timestamp === 'string') {
    const ms = new Date(timestamp).getTime();
    return Number.isNaN(ms) ? 0 : ms;
  }
  return 0;
}

async function countSessionFiles(sessionsDir: string): Promise<{ daily: number; weekly: number }> {
  const { todayStartMs, weekStartMs } = getTimeWindows();
  let daily = 0;
  let weekly = 0;
  try {
    for (const year of await fs.promises.readdir(sessionsDir)) {
      if (!/^\d{4}$/.test(year)) continue;
      for (const month of await fs.promises.readdir(path.join(sessionsDir, year))) {
        for (const day of await fs.promises.readdir(path.join(sessionsDir, year, month))) {
          const dayMs = new Date(Number(year), Number(month) - 1, Number(day)).getTime();
          if (dayMs + 86_400_000 <= weekStartMs) continue;
          const files = (
            await fs.promises.readdir(path.join(sessionsDir, year, month, day))
          ).filter((f) => f.endsWith('.jsonl')).length;
          if (dayMs >= todayStartMs) daily += files;
          weekly += files;
        }
      }
    }
  } catch {
    // sessions dir not accessible
  }
  return { daily, weekly };
}

const codexCache = createTtlCache<CodexSnapshot>(30_000);

export async function getCodexSnapshot(): Promise<CodexSnapshot> {
  return codexCache.get(async () => {
    const histPath = await findHistoryFile();
    if (!histPath) {
      return {
        available: false,
        dailyRequests: 0,
        weeklyRequests: 0,
        rateLimits: null,
        model: null,
      };
    }

    const [stat, latestSession, model] = await Promise.all([
      fs.promises.stat(histPath),
      findLatestSessionFile(),
      readCodexModel(),
    ]);
    const rateLimits = latestSession ? await readLastRateLimits(latestSession) : null;

    if (stat.isDirectory()) {
      const { daily, weekly } = await countSessionFiles(histPath);
      return { available: true, dailyRequests: daily, weeklyRequests: weekly, rateLimits, model };
    }

    const { todayStartMs, weekStartMs } = getTimeWindows();
    let daily = 0;
    let weekly = 0;

    const stream = fs.createReadStream(histPath, { encoding: 'utf8' });
    const rl = readline.createInterface({ input: stream, crlfDelay: Infinity });

    for await (const line of rl) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      try {
        const obj: unknown = JSON.parse(trimmed);
        const ts = extractHistoryEntryTimestampMs(obj);
        if (ts >= todayStartMs) daily += 1;
        if (ts >= weekStartMs) weekly += 1;
      } catch (_e) {
        // skip malformed lines
      }
    }

    return { available: true, dailyRequests: daily, weeklyRequests: weekly, rateLimits, model };
  });
}
