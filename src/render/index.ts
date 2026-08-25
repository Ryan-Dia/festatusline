import { promises as fs } from 'fs';
import { homedir } from 'os';
import { join } from 'path';
import { readStdin, RateLimitsSchema, type RateLimits } from '../data/stdin.js';
import { getUsageSnapshot } from '../data/usage.js';
import { getCodexSnapshot } from '../data/codex.js';
import {
  getOAuthUsageSlots,
  type OAuthUsageSlots,
  type RateLimitSlot,
} from '../data/claudeOAuthUsage.js';
import { readClaudeSettings } from '../data/claude-settings.js';
import { getLastCacheCreation, getLastModelFromTranscript } from '../data/jsonl.js';
import { loadSettings } from '../config/load.js';
import { resolveLines } from '../config/presets.js';
import { getTheme } from '../theme/index.js';
import { createTranslator } from '../i18n/index.js';
import { renderAllLines } from './line.js';
import type { RenderContext } from '../widgets/types.js';

const CACHE_DIR = process.env.XDG_CACHE_HOME
  ? join(process.env.XDG_CACHE_HOME, 'festatusline')
  : join(homedir(), '.cache', 'festatusline');
const RATE_LIMITS_CACHE_PATH = join(CACHE_DIR, 'rate_limits.json');

// The cache mirrors the stdin payload verbatim so a cached window survives a Claude Code
// release that starts sending null where it used to omit the field.
const RateLimitsCacheSchema = RateLimitsSchema;

async function tryOrNull<T>(fn: () => Promise<T>): Promise<T | null> {
  try {
    return await fn();
  } catch {
    return null;
  }
}

async function readRateLimitsCache(): Promise<RateLimits | null> {
  return tryOrNull(async () => {
    const raw = await fs.readFile(RATE_LIMITS_CACHE_PATH, 'utf8');
    const result = RateLimitsCacheSchema.safeParse(JSON.parse(raw));
    return result.success ? result.data : null;
  });
}

async function writeRateLimitsCache(rateLimits: RateLimits): Promise<void> {
  await tryOrNull(async () => {
    await fs.mkdir(CACHE_DIR, { recursive: true });
    await fs.writeFile(RATE_LIMITS_CACHE_PATH, JSON.stringify(rateLimits), 'utf8');
  });
}

type RateLimitPeriod = NonNullable<RateLimits['five_hour']>;

function toRateLimitPeriod(slot: RateLimitSlot | null): RateLimitPeriod | null {
  return slot ? { used_percentage: slot.usedPercent, resets_at: slot.resetsAt } : null;
}

// Claude Code sends a rate-limit period as a present object with null sub-fields rather
// than omitting it outright (see stdin.ts's own nullish-everywhere note), so a truthy
// `{ used_percentage: null, resets_at: null }` must NOT win a `??` chain over a tier that
// actually has data — `resets_at == null` is what RateLimit.ts itself already treats as "no
// data" (renders `?%`), so that's the bar here too.
function usablePeriod(period: RateLimitPeriod | null | undefined): RateLimitPeriod | null {
  return period && period.resets_at != null ? period : null;
}

// Guards the on-disk stdin cache: before this session's first API call Claude Code sends the
// empty shell above, and writing that through would clobber the last real values — the only
// fallback an environment without OAuth credentials (macOS) has at session start.
export function hasUsableRateLimit(
  rateLimits: RateLimits | null | undefined,
): rateLimits is RateLimits {
  return usablePeriod(rateLimits?.five_hour) != null || usablePeriod(rateLimits?.seven_day) != null;
}

// Two snapshots of the same window can differ in `resets_at` by a second or so from rounding
// (observed: stdin 1787637000 vs OAuth 1787636999). Anything further apart is a different
// window.
const SAME_WINDOW_TOLERANCE_S = 120;

// Neither source carries a "captured at" timestamp, but the windows themselves give one
// away: `resets_at` is fixed for a window and usage inside it only ever climbs. So between
// two snapshots, the one in the later window is newer, and within the same window the
// higher percentage is newer. Ties go to `a`, so callers pass the preferred source first.
function fresher(a: RateLimitPeriod | null, b: RateLimitPeriod | null): RateLimitPeriod | null {
  if (!a) return b;
  if (!b) return a;
  const windowGap = (b.resets_at ?? 0) - (a.resets_at ?? 0);
  if (Math.abs(windowGap) > SAME_WINDOW_TOLERANCE_S) return windowGap > 0 ? b : a;
  return (b.used_percentage ?? 0) > (a.used_percentage ?? 0) ? b : a;
}

// stdin is what Claude Code piggybacked on this session's *last* API call — free and exact
// the moment it arrives, but it keeps re-sending that same snapshot on every idle refresh,
// so it never sees quota another device burns while this session sits. The OAuth fetch does
// (up to TTL_MS behind). Rather than rank the sources, rank the snapshots: whichever is
// provably newer wins (see `fresher`), with stdin taking ties. The last stdin we cached on
// disk only matters when stdin itself carries nothing usable (see `usablePeriod`).
export function mergeRateLimits(
  stdinRateLimits: RateLimits | null | undefined,
  oauthSlots: OAuthUsageSlots | null,
  cachedRateLimits: RateLimits | null,
): RateLimits | undefined {
  const pick = (
    stdin: RateLimitPeriod | null | undefined,
    oauth: RateLimitSlot | null | undefined,
    cached: RateLimitPeriod | null | undefined,
  ): RateLimitPeriod | undefined => {
    // The on-disk cache is just an older stdin, so it can only stand in for stdin — it never
    // competes with it.
    const local = usablePeriod(stdin) ?? usablePeriod(cached);
    return fresher(local, toRateLimitPeriod(oauth ?? null)) ?? undefined;
  };

  const fiveHour = pick(
    stdinRateLimits?.five_hour,
    oauthSlots?.session,
    cachedRateLimits?.five_hour,
  );
  const sevenDay = pick(
    stdinRateLimits?.seven_day,
    oauthSlots?.weekly,
    cachedRateLimits?.seven_day,
  );
  return fiveHour || sevenDay ? { five_hour: fiveHour, seven_day: sevenDay } : undefined;
}

export async function renderFromStdin(): Promise<void> {
  const [
    stdin,
    settings,
    claudeSettings,
    usage,
    codex,
    oauthSlots,
    cachedRateLimits,
    lastCacheCreation,
  ] = await Promise.all([
    readStdin(),
    loadSettings(),
    readClaudeSettings(),
    tryOrNull(getUsageSnapshot),
    tryOrNull(getCodexSnapshot),
    tryOrNull(getOAuthUsageSlots),
    readRateLimitsCache(),
    tryOrNull(getLastCacheCreation),
  ]);

  const t = createTranslator(settings.locale);

  if (hasUsableRateLimit(stdin.rate_limits)) {
    writeRateLimitsCache(stdin.rate_limits).catch(() => {});
  }

  const cacheCreated = stdin.context_window?.current_usage?.cache_creation_input_tokens;
  const cacheTtlCreatedAt =
    cacheCreated && cacheCreated > 0 ? Date.now() : (lastCacheCreation?.timestamp ?? null);
  const cacheTtlMs = lastCacheCreation?.ttlMs ?? 300_000;

  let sessionLastModel: string | null = null;
  if (!stdin.model && stdin.transcript_path) {
    const transcriptPath = stdin.transcript_path;
    sessionLastModel = await tryOrNull(() => getLastModelFromTranscript(transcriptPath));
  }

  const theme = getTheme(settings.theme);
  const ctx: RenderContext = {
    stdin: {
      ...stdin,
      rate_limits: mergeRateLimits(stdin.rate_limits, oauthSlots, cachedRateLimits),
    },
    usage,
    codex,
    fableRateLimit: oauthSlots?.fable ?? null,
    sessionLastModel,
    theme,
    t,
    now: new Date(),
    weeklyAnchorDay: settings.weeklyAnchorDay,
    envEffortLevel: process.env.CLAUDE_EFFORT,
    ultracode: claudeSettings.ultracode,
    cacheTtlCreatedAt,
    cacheTtlMs,
  };

  const output = renderAllLines(resolveLines(settings), ctx, settings.separator);
  process.stdout.write(`${output}\n`);
}
