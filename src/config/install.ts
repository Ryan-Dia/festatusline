import fs from 'fs';
import path from 'path';
import os from 'os';
import { t } from '../i18n/index.js';

function getClaudeSettingsPath(): string {
  const dir = process.env.CLAUDE_CONFIG_DIR ?? path.join(os.homedir(), '.claude');
  return path.join(dir, 'settings.json');
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

  current.statusLine = {
    type: 'command',
    command: 'npx -y cwstatusline',
  };

  await fs.promises.mkdir(path.dirname(settingsPath), { recursive: true });
  await fs.promises.writeFile(settingsPath, `${JSON.stringify(current, null, 2)}\n`, 'utf8');

  process.stdout.write(`${t('install.success')}\n`);
}
