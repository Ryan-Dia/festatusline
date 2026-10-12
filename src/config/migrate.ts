import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fallbackCliPath, getClaudeSettingsPath } from './install.js';
import { writeLauncher } from './launcher.js';

// What setups before 0.11.0 wrote: one version's own CLI inside the plugin cache, e.g.
// `node ~/.claude/plugins/cache/festatusline/festatusline/0.7.0/dist/cli.js`.
const VERSIONED_CLI_RE =
  /[\\/]plugins[\\/]cache[\\/]festatusline[\\/]festatusline[\\/][^\\/"']+[\\/]dist[\\/]cli\.js/;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function pointsAtVersionedCli(command: unknown): boolean {
  return typeof command === 'string' && VERSIONED_CLI_RE.test(command);
}

// Claude Code reads statusLine at startup and only then starts watching settings.json, so a
// change made while the SessionStart hook runs is never seen that session (observed on 2.1.296:
// the old command kept rendering). A change a few seconds later is picked up live.
export const MIGRATE_DELAY_MS = 5_000;

async function readSettings(settingsPath: string): Promise<Record<string, unknown> | null> {
  try {
    const parsed: unknown = JSON.parse(await fs.promises.readFile(settingsPath, 'utf8'));
    return isRecord(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

function pinned(settings: Record<string, unknown> | null): settings is Record<string, unknown> & {
  statusLine: Record<string, unknown>;
} {
  return isRecord(settings?.statusLine) && pointsAtVersionedCli(settings?.statusLine.command);
}

/**
 * What the SessionStart hook runs: a quick check, and only when there is something to move,
 * a detached `migrate --now` that waits out Claude Code's startup before writing. The hook
 * itself returns at once, so it never holds up the session.
 */
export async function scheduleMigration(cliPath: string): Promise<boolean> {
  if (!pinned(await readSettings(getClaudeSettingsPath()))) return false;
  spawn(process.execPath, [cliPath, 'migrate', '--now'], {
    detached: true,
    stdio: 'ignore',
  }).unref();
  return true;
}

/**
 * Moves a `statusLine` still pinned to one cached plugin version onto the launcher. Before
 * 0.11.0 a plain `/plugin update` never changed that path, so the old version kept running —
 * and went blank once Claude Code cleaned up its orphaned folder. The plugin's SessionStart
 * hook gets this run (see scheduleMigration), so the first start after an update fixes it
 * with no command to run.
 *
 * It touches settings.json only when that file parses and its statusLine is ours and pinned;
 * anything else — another statusline, the launcher already, an unreadable file — is left
 * exactly as it is. Returns whether it rewrote the file.
 */
export async function migrateStatusLine(): Promise<boolean> {
  const settingsPath = getClaudeSettingsPath();
  const current = await readSettings(settingsPath);
  if (!pinned(current)) return false;

  const command = await writeLauncher(fallbackCliPath());
  const next = {
    ...current,
    statusLine: { refreshIntervalMs: 60000, ...current.statusLine, type: 'command', command },
  };
  // Claude Code reads this file while starting up, around when the hook runs; a rename swaps
  // the whole file in at once so it never sees half of one. It goes to the real file, so a
  // settings.json symlinked from a dotfiles repo stays a symlink, and keeps that file's mode.
  const target = await fs.promises.realpath(settingsPath);
  const { mode } = await fs.promises.stat(target);
  const temp = path.join(path.dirname(target), `.settings.json.${process.pid}.tmp`);
  await fs.promises.writeFile(temp, `${JSON.stringify(next, null, 2)}\n`, { mode });
  await fs.promises.rename(temp, target);
  return true;
}
