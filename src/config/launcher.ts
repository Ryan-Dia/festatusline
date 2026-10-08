import fs from 'fs';
import path from 'path';
import { getConfigPath } from './load.js';

/**
 * `statusLine` used to point straight at `plugins/cache/festatusline/festatusline/<version>/`,
 * so every plugin update left it running the old version until settings.json was edited
 * again. It now points at this launcher, kept at a fixed path, which finds the installed
 * version on every run: Claude Code's plugin registry first, then the newest cached version,
 * then the CLI that wrote it (a repo checkout or any non-plugin install).
 */
export function launcherPath(): string {
  return path.join(path.dirname(getConfigPath()), 'statusline.mjs');
}

export function launcherSource(fallbackCli: string): string {
  return `// festatusline statusline launcher, written by \`festatusline install\`. It looks up the
// installed plugin version on every run, so a plugin update needs no settings.json edit.
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

const FALLBACK_CLI = ${JSON.stringify(fallbackCli)};
const PLUGIN_ID = 'festatusline@festatusline';
const pluginsDir = join(process.env.CLAUDE_CONFIG_DIR ?? join(homedir(), '.claude'), 'plugins');

function existing(cli) {
  return existsSync(cli) ? cli : null;
}

function fromRegistry() {
  try {
    const registry = JSON.parse(readFileSync(join(pluginsDir, 'installed_plugins.json'), 'utf8'));
    const entries = registry?.plugins?.[PLUGIN_ID] ?? [];
    // A user-scope install is the one statusLine belongs to; project scopes come after.
    const ordered = [...entries].sort((a, b) => (a.scope === 'user' ? -1 : b.scope === 'user' ? 1 : 0));
    for (const entry of ordered) {
      const cli = typeof entry?.installPath === 'string' ? existing(join(entry.installPath, 'dist', 'cli.js')) : null;
      if (cli) return cli;
    }
  } catch {
    // No registry, or one this launcher can't read: fall through.
  }
  return null;
}

function newestCached() {
  const base = join(pluginsDir, 'cache', 'festatusline', 'festatusline');
  try {
    const versions = readdirSync(base)
      .filter((v) => /^\\d+\\.\\d+\\.\\d+$/.test(v))
      .sort((a, b) => b.localeCompare(a, undefined, { numeric: true }));
    for (const version of versions) {
      const cli = existing(join(base, version, 'dist', 'cli.js'));
      if (cli) return cli;
    }
  } catch {
    // Not installed as a plugin.
  }
  return null;
}

const cli = fromRegistry() ?? newestCached() ?? existing(FALLBACK_CLI);
if (cli) {
  await import(pathToFileURL(cli).href);
} else {
  process.stdout.write('festatusline is not installed. Run /festatusline:setup\\n');
}
`;
}

/** Writes the launcher and returns the `statusLine` command that runs it. */
export async function writeLauncher(fallbackCli: string): Promise<string> {
  const target = launcherPath();
  await fs.promises.mkdir(path.dirname(target), { recursive: true });
  await fs.promises.writeFile(target, launcherSource(fallbackCli), 'utf8');
  return `node ${JSON.stringify(target)}`;
}
