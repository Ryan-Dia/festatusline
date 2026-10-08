import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { z } from 'zod';
import { t } from '../i18n/index.js';
import { getClaudeDir } from './load.js';
import { launcherPath, writeLauncher } from './launcher.js';

const ClaudeSettingsSchema = z
  .object({ statusLine: z.record(z.unknown()).optional() })
  .catchall(z.unknown());

type ClaudeSettingsFile = z.infer<typeof ClaudeSettingsSchema>;

function getClaudeSettingsPath(): string {
  return path.join(getClaudeDir(), 'settings.json');
}

/**
 * The CLI the launcher falls back to when no plugin install is found. `dist/cli.js` sits
 * beside the bundle chunk running this code; `argv[1]` is the backup for anything else, but
 * never when it is the launcher itself (`install` run through it), which would import itself.
 */
function fallbackCliPath(): string {
  const besideBundle = path.join(path.dirname(fileURLToPath(import.meta.url)), 'cli.js');
  if (fs.existsSync(besideBundle)) return besideBundle;
  const invoked = process.argv[1] ? path.resolve(process.argv[1]) : '';
  return invoked === launcherPath() ? '' : invoked;
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

  const command = await writeLauncher(fallbackCliPath());
  // Merge rather than replace: /festatusline:update runs this on every update, and a user's
  // own refreshIntervalMs or padding must survive it. The interval is only a default.
  current.statusLine = {
    refreshIntervalMs: 60000,
    ...current.statusLine,
    type: 'command',
    command,
  };

  await fs.promises.mkdir(path.dirname(settingsPath), { recursive: true });
  await fs.promises.writeFile(settingsPath, `${JSON.stringify(current, null, 2)}\n`, 'utf8');

  process.stdout.write(`${t('install.success')}\n`);
}
