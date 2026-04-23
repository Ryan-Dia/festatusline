import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { t } from '../i18n/index.js';
import { getClaudeDir } from './load.js';

function getClaudeSettingsPath(): string {
  return path.join(getClaudeDir(), 'settings.json');
}

async function resolveCliPath(): Promise<string> {
  const pluginCacheBase = path.join(
    getClaudeDir(),
    'plugins',
    'cache',
    'festatusline',
    'festatusline',
  );
  try {
    const versions = await fs.promises.readdir(pluginCacheBase);
    const sorted = versions
      .filter((v) => /^\d+\.\d+\.\d+$/.test(v))
      .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
    const latest = sorted.at(-1);
    if (latest) {
      return path.join(pluginCacheBase, latest, 'dist', 'cli.js');
    }
  } catch {
    // not installed as plugin — fall through to local path
  }
  return fileURLToPath(import.meta.url);
}

export async function installToClaude(force = false): Promise<void> {
  const settingsPath = getClaudeSettingsPath();

  let current: Record<string, unknown> = {};
  try {
    const raw = await fs.promises.readFile(settingsPath, 'utf8');
    current = JSON.parse(raw) as Record<string, unknown>;
  } catch {
    // file may not exist yet
  }

  if (current.statusLine && !force) {
    process.stdout.write(`${t('install.alreadySet')}\n`);
    process.stdout.write(`${t('install.currentConfig')} ${JSON.stringify(current.statusLine)}\n`);
    process.stdout.write(`${t('install.overwriteHint')}\n`);
    return;
  }

  const backup = `${settingsPath}.bak`;
  if (Object.keys(current).length > 0) {
    await fs.promises.writeFile(backup, `${JSON.stringify(current, null, 2)}\n`, 'utf8');
  }

  const cliPath = await resolveCliPath();
  current.statusLine = {
    type: 'command',
    command: `node ${cliPath}`,
    refreshIntervalMs: 60000,
  };

  await fs.promises.mkdir(path.dirname(settingsPath), { recursive: true });
  await fs.promises.writeFile(settingsPath, `${JSON.stringify(current, null, 2)}\n`, 'utf8');

  process.stdout.write(`${t('install.success')}\n`);
}
