import fs from 'fs';
import path from 'path';
import { z } from 'zod';
import { t } from '../i18n/index.js';
import { getClaudeDir } from './load.js';
import { writeLauncher } from './launcher.js';

const ClaudeSettingsSchema = z
  .object({ statusLine: z.record(z.unknown()).optional() })
  .catchall(z.unknown());

type ClaudeSettingsFile = z.infer<typeof ClaudeSettingsSchema>;

function getClaudeSettingsPath(): string {
  return path.join(getClaudeDir(), 'settings.json');
}

export async function installToClaude(force = false): Promise<void> {
  const settingsPath = getClaudeSettingsPath();

  let current: ClaudeSettingsFile = {};
  try {
    const raw = await fs.promises.readFile(settingsPath, 'utf8');
    const parsed = ClaudeSettingsSchema.safeParse(JSON.parse(raw));
    if (parsed.success) current = parsed.data;
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

  // The CLI running this install: what the launcher falls back to when no plugin is found.
  const command = await writeLauncher(path.resolve(process.argv[1] ?? ''));
  current.statusLine = {
    type: 'command',
    command,
    refreshIntervalMs: 60000,
  };

  await fs.promises.mkdir(path.dirname(settingsPath), { recursive: true });
  await fs.promises.writeFile(settingsPath, `${JSON.stringify(current, null, 2)}\n`, 'utf8');

  process.stdout.write(`${t('install.success')}\n`);
}
