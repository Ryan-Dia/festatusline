import { promises as fs } from 'fs';
import { homedir } from 'os';
import { dirname, join } from 'path';
import { readStdin } from '../data/stdin.js';
import { getUsageSnapshot } from '../data/usage.js';
import { getCodexSnapshot } from '../data/codex.js';
import { readClaudeSettings } from '../data/claude-settings.js';
import { loadSettings } from '../config/load.js';
import { getTheme } from '../theme/index.js';
import { t, setLocale, type Locale } from '../i18n/index.js';
import { renderAllLines } from './line.js';
import type { RenderContext } from '../widgets/types.js';

const CACHE_DIR = process.env.XDG_CACHE_HOME
  ? join(process.env.XDG_CACHE_HOME, 'festatusline')
  : join(homedir(), '.cache', 'festatusline');
const CACHE_PATH = join(CACHE_DIR, 'last.txt');

async function writeCache(output: string): Promise<void> {
  await fs.mkdir(dirname(CACHE_PATH), { recursive: true }).catch(() => {});
  await fs.writeFile(CACHE_PATH, output, 'utf8').catch(() => {});
}

export async function renderFromStdin(): Promise<void> {
  const [stdin, settings, claudeSettings, usage, codex] = await Promise.all([
    readStdin(),
    loadSettings(),
    readClaudeSettings(),
    getUsageSnapshot().catch(() => null),
    getCodexSnapshot().catch(() => null),
  ]);

  setLocale(settings.locale as Locale);

  const theme = getTheme(settings.theme);
  const ctx: RenderContext = {
    stdin,
    usage,
    codex,
    theme,
    t,
    now: new Date(),
    weeklyAnchorDay: settings.weeklyAnchorDay,
    effortLevel: claudeSettings.effortLevel,
  };

  const output = renderAllLines(settings.lines, ctx, settings.separator);

  // Output always (widgets render placeholders when data is absent).
  // Update the cache only when we have real API session data (context_window
  // present), so /clear and startup events don't overwrite the last rich cache.
  if (stdin.context_window) {
    await writeCache(output);
  }
  process.stdout.write(`${output}\n`);
}
