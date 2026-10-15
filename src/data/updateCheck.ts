import { promises as fs } from 'fs';
import { homedir } from 'os';
import { join } from 'path';
import { z } from 'zod';

// Raised by hand, and only for a release every user needs (a fix for something that harms the
// machine, not a new widget). A separate file rather than a field in marketplace.json, whose
// schema Claude Code validates: an unknown key there could break installs for everyone.
export const UPDATE_MANIFEST_URL =
  'https://raw.githubusercontent.com/Ryan-Dia/festatusline/main/update.json';

const CHECK_TTL_MS = 6 * 60 * 60 * 1000;
// Offline or behind a proxy (Node's fetch ignores HTTPS_PROXY), every render would otherwise
// wait out the timeout again.
const FAILURE_BACKOFF_MS = 60 * 60 * 1000;
const FETCH_TIMEOUT_MS = 1_500;

const VERSION_RE = /^\d+\.\d+\.\d+$/;
const VersionSchema = z.string().regex(VERSION_RE);

const ManifestSchema = z.object({ minVersion: VersionSchema });

const CacheSchema = z.object({
  checkedAt: z.number(),
  minVersion: VersionSchema.nullable(),
  failedAt: z.number().optional(),
});
type Cache = z.infer<typeof CacheSchema>;

function cacheDir(): string {
  const xdg = process.env.XDG_CACHE_HOME;
  return xdg ? join(xdg, 'festatusline') : join(homedir(), '.cache', 'festatusline');
}

function cachePath(): string {
  return join(cacheDir(), 'update_check.json');
}

/** Negative when `a` is older than `b`. Both are plain `x.y.z`. */
export function compareVersions(a: string, b: string): number {
  const pa = a.split('.').map(Number);
  const pb = b.split('.').map(Number);
  for (let i = 0; i < 3; i += 1) {
    const diff = (pa[i] ?? 0) - (pb[i] ?? 0);
    if (diff !== 0) return diff;
  }
  return 0;
}

async function readCache(): Promise<Cache | null> {
  try {
    const result = CacheSchema.safeParse(JSON.parse(await fs.readFile(cachePath(), 'utf8')));
    return result.success ? result.data : null;
  } catch {
    return null;
  }
}

async function writeCache(entry: Cache): Promise<void> {
  try {
    await fs.mkdir(cacheDir(), { recursive: true });
    await fs.writeFile(cachePath(), JSON.stringify(entry), 'utf8');
  } catch {
    // Best-effort: the next render just checks again.
  }
}

/** The minimum version, null when none is set, or undefined when the check failed. */
async function fetchMinVersion(): Promise<string | null | undefined> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    // A plain GET of a public file: no token, nothing about the user.
    const res = await fetch(UPDATE_MANIFEST_URL, { signal: controller.signal });
    if (res.status === 404) return null;
    if (!res.ok) return undefined;
    const result = ManifestSchema.safeParse(await res.json());
    return result.success ? result.data.minVersion : null;
  } catch {
    return undefined;
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * The version this install must update to, or null when it is new enough. Checked against
 * GitHub at most every 6 hours; a failed check keeps the last answer and waits an hour.
 */
export async function getRequiredUpdate(
  installed: string = FESTATUSLINE_VERSION,
): Promise<string | null> {
  const now = Date.now();
  const cache = await readCache();
  let minVersion = cache?.minVersion ?? null;
  const fresh = cache != null && now - cache.checkedAt < CHECK_TTL_MS;
  const backingOff = cache?.failedAt != null && now - cache.failedAt < FAILURE_BACKOFF_MS;
  if (!fresh && !backingOff) {
    const fetched = await fetchMinVersion();
    if (fetched === undefined) {
      await writeCache({ checkedAt: cache?.checkedAt ?? 0, minVersion, failedAt: now });
    } else {
      minVersion = fetched;
      await writeCache({ checkedAt: now, minVersion });
    }
  }
  if (!minVersion || !VERSION_RE.test(installed)) return null;
  return compareVersions(installed, minVersion) < 0 ? minVersion : null;
}
