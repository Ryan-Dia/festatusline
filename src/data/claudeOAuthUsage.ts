import { promises as fs } from 'fs';
import { homedir } from 'os';
import { join } from 'path';
import { z } from 'zod';
import { getClaudeDir } from '../config/load.js';
import { readKeychainToken } from './macKeychain.js';

// Claude Code never exposes a per-model (Opus/Sonnet/Fable) weekly rate limit on the
// statusline stdin payload — only `rate_limits.seven_day` for the account as a whole. The
// only way to get Fable's own bucket is the same undocumented endpoint the CLI itself calls
// for `/usage`, authenticated with the same OAuth token the CLI stores on disk. That same
// response also carries `five_hour`/`seven_day` — the account-wide numbers stdin already
// gives us, but only as fresh as this *session's* last actual turn. A session sitting idle
// while another device burns the shared quota keeps showing its last-seen stdin snapshot
// until it sends another message; polling this endpoint independently catches that drift.
const OAUTH_USAGE_URL = 'https://api.anthropic.com/api/oauth/usage';
const OAUTH_BETA_HEADER = 'oauth-2025-04-20';
const USER_AGENT = 'claude-code/2.1.0';
// This runs inside the statusline render itself, so a hung connection (firewall DROP,
// captive portal) stalls the whole bar for this long. The endpoint normally answers well
// under a second.
const FETCH_TIMEOUT_MS = 3_000;

// This endpoint is undocumented and not rate-limit-friendly, so a fresh network call on
// every render would be reckless. Five minutes keeps the numbers reasonably live without
// hammering it.
const TTL_MS = 5 * 60 * 1000;

// After a failed fetch, don't try again for a while. Without this, an offline or proxied
// machine (Node's fetch ignores HTTPS_PROXY) would re-attempt — and stall for the timeout —
// on every single render once the cache aged past TTL_MS.
const FAILURE_BACKOFF_MS = 60 * 1000;

// A window whose reset time has passed is stale no matter how recently it was fetched — the
// renderer draws it as `0% (reset)` while the real window has already started refilling. Cut
// the TTL rather than dropping it, so a bucket that legitimately stays expired can't turn
// every render into a fetch.
const EXPIRED_TTL_MS = 60 * 1000;

const CACHE_DIR = process.env.XDG_CACHE_HOME
  ? join(process.env.XDG_CACHE_HOME, 'festatusline')
  : join(homedir(), '.cache', 'festatusline');
const CACHE_PATH = join(CACHE_DIR, 'oauth_usage.json');

export interface RateLimitSlot {
  usedPercent: number;
  resetsAt: number;
}

export interface OAuthUsageSlots {
  fable: RateLimitSlot | null;
  session: RateLimitSlot | null;
  weekly: RateLimitSlot | null;
}

const EMPTY_SLOTS: OAuthUsageSlots = { fable: null, session: null, weekly: null };

interface CacheEntry {
  // When `slots` was last successfully fetched — governs data freshness (TTL_MS).
  fetchedAt: number;
  slots: OAuthUsageSlots;
  // When the most recent attempt failed, if it did — governs retry backoff, kept separate
  // from fetchedAt so a failure never masquerades as fresh data.
  failedAt?: number;
}

const CredentialsSchema = z.object({
  claudeAiOauth: z
    .object({
      accessToken: z.string().nullish(),
    })
    .nullish(),
});

const ResetsAtSchema = z.union([z.string(), z.number()]).nullish();

const ScopedLimitSchema = z.object({
  kind: z.string().nullish(),
  percent: z.number().nullish(),
  resets_at: ResetsAtSchema,
  scope: z
    .object({
      model: z
        .object({
          display_name: z.string().nullish(),
        })
        .nullish(),
    })
    .nullish(),
});

const UsageWindowSchema = z.object({
  utilization: z.number().nullish(),
  used_percentage: z.number().nullish(),
  resets_at: ResetsAtSchema,
});

const OAuthUsageResponseSchema = z.object({
  five_hour: UsageWindowSchema.nullish(),
  seven_day: UsageWindowSchema.nullish(),
  fable_weekly: UsageWindowSchema.nullish(),
  fable_seven_day: UsageWindowSchema.nullish(),
  seven_day_fable: UsageWindowSchema.nullish(),
  limits: z.array(ScopedLimitSchema).nullish(),
});

type OAuthUsageResponse = z.infer<typeof OAuthUsageResponseSchema>;
type UsageWindow = z.infer<typeof UsageWindowSchema>;

// 1e10 sits between any plausible seconds epoch (<2286) and any millisecond epoch, so it
// distinguishes the two units without extra metadata. Mirrors what the reset already does
// for stdin's own `rate_limits.*.resets_at` (always seconds), plus an ISO-string fallback
// for whatever shape this undocumented endpoint sends.
function parseResetTimestampMs(value: string | number | null | undefined): number | null {
  if (value == null) return null;
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) return null;
    return value > 10_000_000_000 ? value : value * 1000;
  }
  const numeric = Number(value);
  if (Number.isFinite(numeric) && value.trim() !== '') {
    return numeric > 10_000_000_000 ? numeric : numeric * 1000;
  }
  const parsed = new Date(value).getTime();
  return Number.isNaN(parsed) ? null : parsed;
}

// This endpoint is undocumented and can drift without notice, so a stray out-of-range
// percent (>100, negative) shouldn't render as a visibly broken bar/label.
function clampPercent(pct: number): number {
  return Math.min(100, Math.max(0, pct));
}

function extractWindowSlot(window: UsageWindow | null | undefined): RateLimitSlot | null {
  if (!window) return null;
  const pct = window.utilization ?? window.used_percentage;
  if (typeof pct !== 'number') return null;
  const resetsAtMs = parseResetTimestampMs(window.resets_at);
  if (resetsAtMs == null) return null;
  return { usedPercent: clampPercent(pct), resetsAt: Math.floor(resetsAtMs / 1000) };
}

function extractFableSlot(data: OAuthUsageResponse): RateLimitSlot | null {
  const scoped = data.limits?.find(
    (limit) =>
      limit.kind === 'weekly_scoped' &&
      typeof limit.percent === 'number' &&
      limit.scope?.model?.display_name?.trim().toLowerCase() === 'fable',
  );
  if (scoped && typeof scoped.percent === 'number') {
    const resetsAtMs = parseResetTimestampMs(scoped.resets_at);
    if (resetsAtMs != null) {
      return { usedPercent: clampPercent(scoped.percent), resetsAt: Math.floor(resetsAtMs / 1000) };
    }
  }

  for (const legacy of [data.fable_weekly, data.fable_seven_day, data.seven_day_fable]) {
    const slot = extractWindowSlot(legacy);
    if (slot) return slot;
  }

  return null;
}

function extractSlots(data: OAuthUsageResponse): OAuthUsageSlots {
  return {
    fable: extractFableSlot(data),
    session: extractWindowSlot(data.five_hour),
    weekly: extractWindowSlot(data.seven_day),
  };
}

async function readAccessToken(): Promise<string | null> {
  const configDir = getClaudeDir();
  try {
    const raw = await fs.readFile(join(configDir, '.credentials.json'), 'utf8');
    const result = CredentialsSchema.safeParse(JSON.parse(raw));
    const token = result.success ? (result.data.claudeAiOauth?.accessToken ?? null) : null;
    if (token) return token;
  } catch {
    // Falls through: on macOS this file does not exist at all.
  }
  return readKeychainToken(configDir);
}

async function readCache(): Promise<CacheEntry | null> {
  try {
    const raw = await fs.readFile(CACHE_PATH, 'utf8');
    return JSON.parse(raw) as CacheEntry;
  } catch {
    return null;
  }
}

async function writeCache(entry: CacheEntry): Promise<void> {
  try {
    await fs.mkdir(CACHE_DIR, { recursive: true });
    await fs.writeFile(CACHE_PATH, JSON.stringify(entry), 'utf8');
  } catch {
    // Best-effort — a failed cache write just means the next render fetches again.
  }
}

async function fetchOAuthSlots(token: string): Promise<OAuthUsageSlots | null> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(OAUTH_USAGE_URL, {
      headers: {
        authorization: `Bearer ${token}`,
        'anthropic-beta': OAUTH_BETA_HEADER,
        'user-agent': USER_AGENT,
      },
      // The bearer token must never be forwarded anywhere but the URL above. This endpoint
      // has no reason to redirect, so treat any redirect as a failure rather than following
      // it (older Node 18 fetch implementations did not reliably strip Authorization on a
      // cross-origin redirect).
      redirect: 'error',
      signal: controller.signal,
    });
    if (!res.ok) return null;
    const json: unknown = await res.json();
    const result = OAuthUsageResponseSchema.safeParse(json);
    return result.success ? extractSlots(result.data) : null;
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

function hasExpiredSlot(slots: OAuthUsageSlots, nowMs: number): boolean {
  return Object.values(slots).some((slot) => slot != null && slot.resetsAt * 1000 <= nowMs);
}

export async function getOAuthUsageSlots(): Promise<OAuthUsageSlots> {
  const cache = await readCache();
  const now = Date.now();
  if (cache) {
    const ttl = hasExpiredSlot(cache.slots, now) ? EXPIRED_TTL_MS : TTL_MS;
    if (now - cache.fetchedAt < ttl) return cache.slots;
  }
  if (cache?.failedAt != null && now - cache.failedAt < FAILURE_BACKOFF_MS) {
    return cache.slots;
  }

  const token = await readAccessToken();
  if (!token) {
    return cache?.slots ?? EMPTY_SLOTS;
  }

  const slots = await fetchOAuthSlots(token);
  if (slots) {
    await writeCache({ fetchedAt: now, slots });
    return slots;
  }
  // Network or parse failure — keep serving the last good values instead of blanking out,
  // and remember the failure so the next renders don't all pay the timeout again.
  const stale: CacheEntry = cache ?? { fetchedAt: 0, slots: EMPTY_SLOTS };
  await writeCache({ ...stale, failedAt: now });
  return stale.slots;
}
