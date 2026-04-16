import { readStdin } from '../data/stdin.js';
import { getUsageSnapshot } from '../data/usage.js';
import { getCodexSnapshot } from '../data/codex.js';
import { loadSettings } from '../config/load.js';
import { getTheme } from '../theme/index.js';
import { t, setLocale, type Locale } from '../i18n/index.js';
import { renderAllLines } from './line.js';
import type { RenderContext } from '../widgets/types.js';

export async function renderFromStdin(): Promise<void> {
  const [stdin, settings] = await Promise.all([readStdin(), loadSettings()]);

  setLocale(settings.locale as Locale);

  const [usage, codex] = await Promise.all([
    getUsageSnapshot().catch(() => null),
    getCodexSnapshot().catch(() => null),
  ]);

  const theme = getTheme(settings.theme);
  const ctx: RenderContext = {
    stdin,
    usage,
    codex,
    theme,
    t,
    now: new Date(),
    weeklyAnchorDay: settings.weeklyAnchorDay,
  };

  const output = renderAllLines(settings.lines, ctx, settings.separator);
  if (output) {
    process.stdout.write(`${output}\n`);
  }
}
