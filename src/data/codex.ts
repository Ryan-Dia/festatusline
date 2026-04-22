import fs from 'fs';
import path from 'path';
import os from 'os';
import readline from 'readline';
import { z } from 'zod';
import { createTtlCache } from './cache.js';

const RateLimitSlotSchema = z.object({
  used_percent: z.number().optional().default(0),
  resets_at: z.number(),
});

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

export interface CodexRateLimits {
  primary: { usedPercent: number; resetsAt: number };
  secondary: { usedPercent: number; resetsAt: number };
}

export interface CodexSnapshot {
  available: boolean;
  dailyRequests: number;
  weeklyRequests: number;
  rateLimits: CodexRateLimits | null;
  model: string | null;
}

function getCodexDir(): string {
  return process.env.CODEX_CONFIG_DIR ?? path.join(os.homedir(), '.codex');
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
      last = {
        primary: { usedPercent: r.primary.used_percent, resetsAt: r.primary.resets_at },
        secondary: { usedPercent: r.secondary.used_percent, resetsAt: r.secondary.resets_at },
      };
    } catch (_e) {
      // skip malformed lines
    }
  }
  return last;
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
      return { available: true, dailyRequests: 0, weeklyRequests: 0, rateLimits, model };
    }

    const now = Date.now();
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const weekStart = now - 7 * 24 * 60 * 60 * 1000;

    let daily = 0;
    let weekly = 0;

    const stream = fs.createReadStream(histPath, { encoding: 'utf8' });
    const rl = readline.createInterface({ input: stream, crlfDelay: Infinity });

    for await (const line of rl) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      try {
        const obj = JSON.parse(trimmed);
        const ts = obj.timestamp ? new Date(obj.timestamp).getTime() : 0;
        if (ts >= todayStart.getTime()) daily += 1;
        if (ts >= weekStart) weekly += 1;
      } catch (_e) {
        // skip malformed lines
      }
    }

    return { available: true, dailyRequests: daily, weeklyRequests: weekly, rateLimits, model };
  });
}
