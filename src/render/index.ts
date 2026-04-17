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

async function readCache(): Promise<string> {
  return fs.readFile(CACHE_PATH, 'utf8').catch(() => '');
}

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

  // Update cache only when Claude Code provides model data (active API session).
  // On /clear or startup events stdin.model is absent, so we preserve the last
  // rich cache instead of overwriting it with minimal widget output.
  if (output && stdin.model) {
    await writeCache(output);
    process.stdout.write(`${output}\n`);
    return;
  }

  const cached = await readCache();
  if (cached) {
    process.stdout.write(`${cached}\n`);
    return;
  }

  // No cache yet (first ever start) — output whatever we can render.
  if (output) {
    process.stdout.write(`${output}\n`);
  }
}
