import { PRESETS } from '../config/presets.js';
import { SettingsSchema, type Settings } from '../config/schema.js';
import { renderAllLines } from '../render/line.js';
import { getTheme } from '../theme/index.js';
import { createTranslator } from '../i18n/index.js';
import type { RenderContext } from '../widgets/types.js';

const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;

// Representative numbers so every widget has something to draw. Reset timestamps are
// relative to now, otherwise the bars would render as "reset" the day this ships.
function buildPreviewContext(settings: Settings): RenderContext {
  const now = new Date();
  const unixAfter = (ms: number): number => Math.floor((now.getTime() + ms) / 1000);

  return {
    stdin: {
      type: 'statusLine',
      model: { id: 'claude-opus-5', display_name: 'Claude Opus 5' },
      cost: { total_cost_usd: 0.42 },
      context_window: {
        context_window_size: 200_000,
        used_percentage: 38,
        current_usage: {
          input_tokens: 18_000,
          output_tokens: 2_400,
          cache_creation_input_tokens: 12_000,
          cache_read_input_tokens: 43_000,
        },
      },
      rate_limits: {
        five_hour: { used_percentage: 30, resets_at: unixAfter(3 * HOUR_MS) },
        seven_day: { used_percentage: 25, resets_at: unixAfter(4 * DAY_MS) },
      },
    },
    usage: {
      dailyTokens: 480_000,
      weeklyTokens: 3_100_000,
      sonnetWeeklyTokens: 1_300_000,
      allEntries: [],
      lastModel: 'claude-opus-5',
    },
    codex: {
      available: true,
      dailyRequests: 12,
      weeklyRequests: 84,
      rateLimits: {
        primary: { usedPercent: 22, resetsAt: unixAfter(2 * HOUR_MS) },
        secondary: { usedPercent: 10, resetsAt: unixAfter(DAY_MS) },
      },
      model: 'gpt-5',
    },
    theme: getTheme(settings.theme),
    t: createTranslator(settings.locale),
    now,
    weeklyAnchorDay: settings.weeklyAnchorDay,
    effortLevel: 'high',
    cacheTtlCreatedAt: now.getTime() - 30 * 60 * 1000,
    cacheTtlMs: HOUR_MS,
  };
}

export type PreviewLine = {
  /** Stable React key — preview rows have no natural id and may repeat verbatim. */
  id: string;
  text: string;
};

/** Renders a preset exactly as the statusline would, for the TUI preview pane. */
export function renderPresetPreview(name: string, settings: Settings): PreviewLine[] {
  const preset = PRESETS[name];
  if (!preset) return [];
  const merged = SettingsSchema.parse({ ...settings, ...preset });
  const output = renderAllLines(merged.lines, buildPreviewContext(merged), merged.separator);
  if (!output) return [];
  return output.split('\n').map((text, i) => ({ id: `${name}:${i}`, text }));
}
