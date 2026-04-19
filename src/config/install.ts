import fs from 'fs';
import path from 'path';
import os from 'os';
import { fileURLToPath } from 'url';
import { t } from '../i18n/index.js';

function getClaudeSettingsPath(): string {
  const dir = process.env.CLAUDE_CONFIG_DIR ?? path.join(os.homedir(), '.claude');
  return path.join(dir, 'settings.json');
}

async function resolveCliPath(): Promise<string> {
  const pluginCacheBase = path.join(
    os.homedir(),
    '.claude',
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
    process.stdout.write(`  현재 설정: ${JSON.stringify(current.statusLine)}\n`);
    process.stdout.write(`  덮어쓰려면: festatusline install --force\n`);
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
  };

  await fs.promises.mkdir(path.dirname(settingsPath), { recursive: true });
  await fs.promises.writeFile(settingsPath, `${JSON.stringify(current, null, 2)}\n`, 'utf8');

  process.stdout.write(`${t('install.success')}\n`);
}
