import fs from 'fs';
import path from 'path';
import { getClaudeDir } from './load.js';
import { launcherFallback, launcherPath } from './launcher.js';
import { isRecord, readSettings } from './migrate.js';

const PLUGIN_ID = 'festatusline@festatusline';
const VERSION_RE = /^\d+\.\d+\.\d+$/;

export function pluginCacheDir(): string {
  return path.join(getClaudeDir(), 'plugins', 'cache', 'festatusline', 'festatusline');
}

function compareVersions(a: string, b: string): number {
  const [x, y] = [a, b].map((v) => v.split('.').map(Number));
  for (let i = 0; i < 3; i += 1) {
    const diff = (x?.[i] ?? 0) - (y?.[i] ?? 0);
    if (diff !== 0) return diff;
  }
  return 0;
}

/** The cached versions Claude Code's plugin registry says are installed, in any scope. */
async function installedVersions(cacheDir: string): Promise<string[]> {
  try {
    const registryPath = path.join(getClaudeDir(), 'plugins', 'installed_plugins.json');
    const registry: unknown = JSON.parse(await fs.promises.readFile(registryPath, 'utf8'));
    const plugins = isRecord(registry) ? registry.plugins : undefined;
    const entries = isRecord(plugins) ? plugins[PLUGIN_ID] : [];
    if (!Array.isArray(entries)) return [];
    return entries
      .map((entry: unknown) => (isRecord(entry) ? entry.installPath : undefined))
      .filter((p): p is string => typeof p === 'string' && path.dirname(p) === cacheDir)
      .map((p) => path.basename(p))
      .filter((v) => VERSION_RE.test(v))
      .filter((v) => fs.existsSync(path.join(cacheDir, v, 'dist', 'cli.js')));
  } catch {
    return [];
  }
}

function mentions(ref: string, version: string): boolean {
  return ref.replace(/\\/g, '/').includes(`/festatusline/festatusline/${version}/`);
}

/**
 * Deletes the plugin cache folders of versions older than the installed one. `/plugin update`
 * leaves every old version behind (Claude Code marks them `.orphaned_at` but was seen keeping
 * them for over 11 days), and since 0.14.0 each one carries its own `node_modules` (~217 MB).
 *
 * A folder goes only when it is older than the newest installed version — so one a concurrent
 * update is still writing survives — and nothing still names it: the registry, the launcher's
 * fallback, `statusLine` (a pre-0.11.0 setup still pinned to it, until `migrate` moves it), or
 * the CLI running this. With no readable registry or settings.json it deletes nothing.
 * Returns the versions it removed.
 */
export async function pruneOldVersions(runningCli: string): Promise<string[]> {
  const cacheDir = pluginCacheDir();
  const installed = await installedVersions(cacheDir);
  const newest = [...installed].sort(compareVersions).pop();
  if (!newest) return [];

  const settings = await readSettings(path.join(getClaudeDir(), 'settings.json'));
  if (!settings) return [];
  const launcher = await fs.promises.readFile(launcherPath(), 'utf8').catch(() => '');
  const refs = [
    isRecord(settings.statusLine) && typeof settings.statusLine.command === 'string'
      ? settings.statusLine.command
      : '',
    launcherFallback(launcher) ?? '',
    runningCli,
  ];

  const stale = (await fs.promises.readdir(cacheDir)).filter(
    (v) =>
      VERSION_RE.test(v) &&
      compareVersions(v, newest) < 0 &&
      !installed.includes(v) &&
      !refs.some((ref) => mentions(ref, v)),
  );
  await Promise.all(
    stale.map((v) => fs.promises.rm(path.join(cacheDir, v), { recursive: true, force: true })),
  );
  return stale;
}
