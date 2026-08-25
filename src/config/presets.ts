import type { Settings, WidgetCfg } from './schema.js';
import { detectLegacyPreset } from './legacyPresets.js';

// Shared by the basic/pro/max ladder so the two usage rows stay column-aligned. The weekly
// row's third slot sits under the daily row's `Session` bar; `fableWeeklyRateLimit` hides
// itself when there is no Fable data, so this stays a two-column row for everyone else.
const DAILY_ROW = [{ id: 'dailyUsage' }, { id: 'context' }, { id: 'sessionRateLimit' }];
const WEEKLY_ROW = [
  { id: 'weeklyUsage' },
  { id: 'weeklyRateLimit' },
  { id: 'fableWeeklyRateLimit' },
];

// Optional row, offered independently of preset tier (setup wizard's Codex step) rather
// than baked into any one preset.
export const CODEX_ROW = [{ id: 'codexModel' }, { id: 'codexWeeklyRateLimit' }];

/** Inserts the Codex row right after the weekly row, which sits at index 1 on every tier. */
export function withCodexRow(lines: WidgetCfg[][]): WidgetCfg[][] {
  return [...lines.slice(0, 2), CODEX_ROW, ...lines.slice(2)];
}

export const PRESETS: Record<string, Partial<Settings>> = {
  minimal: {
    lines: [
      [{ id: 'dailyUsage' }, { id: 'context' }],
      [{ id: 'weeklyUsage' }, { id: 'weeklyRateLimit' }],
      [{ id: 'model' }],
    ],
  },
  full: {
    lines: [
      [
        { id: 'model' },
        { id: 'context' },
        { id: 'dailyUsage' },
        { id: 'dailyReset' },
        { id: 'weeklyUsage' },
        { id: 'weeklyReset' },
        { id: 'sonnetWeeklyUsage' },
        { id: 'sonnetWeeklyReset' },
        { id: 'fableWeeklyRateLimit' },
        { id: 'gptUsage' },
      ],
    ],
  },
  'korean-dev': {
    locale: 'ko',
    lines: [
      [
        { id: 'model' },
        { id: 'context' },
        { id: 'dailyUsage' },
        { id: 'dailyReset' },
        { id: 'weeklyUsage' },
        { id: 'weeklyReset' },
        { id: 'sonnetWeeklyUsage' },
        { id: 'sonnetWeeklyReset' },
        { id: 'fableWeeklyRateLimit' },
        { id: 'gptUsage' },
      ],
    ],
  },
  'multi-cli': {
    lines: [[{ id: 'model' }, { id: 'dailyUsage' }, { id: 'gptUsage' }]],
  },
  basic: {
    lines: [DAILY_ROW, WEEKLY_ROW],
  },
  pro: {
    lines: [DAILY_ROW, WEEKLY_ROW, [{ id: 'spacer' }], [{ id: 'model' }, { id: 'gitRepo' }]],
  },
  max: {
    lines: [
      DAILY_ROW,
      WEEKLY_ROW,
      [{ id: 'spacer' }],
      [{ id: 'cacheHit' }, { id: 'cacheTtl' }, { id: 'sessionCost' }],
      [{ id: 'model' }, { id: 'gitRepo' }],
    ],
  },
};

export const PRESET_NAMES = Object.keys(PRESETS);

/** Used when a config names no preset and carries no rows of its own. */
export const DEFAULT_PRESET = 'minimal';

export function expandPreset(name: string, codexRow = false): WidgetCfg[][] {
  const lines = PRESETS[name]?.lines ?? PRESETS[DEFAULT_PRESET]?.lines ?? [];
  return codexRow ? withCodexRow(lines) : lines;
}

/**
 * The widget rows to actually render, in precedence order:
 *
 *   1. `lines` written by hand — an explicit layout always wins, so an update never
 *      rearranges a statusline someone tuned themselves.
 *   2. ...unless the config predates preset tracking and its rows still match a preset as it
 *      shipped back then, in which case it is treated as that preset and follows updates.
 *   3. `preset` (+ `codexRow`), which is what setup writes now.
 *   4. The default preset.
 */
export function resolveLines(settings: Settings): WidgetCfg[][] {
  if (settings.lines) {
    if (!settings.preset) {
      const detected = detectLegacyPreset(settings.lines);
      if (detected) return expandPreset(detected.name, detected.codexRow);
    }
    return settings.lines;
  }
  return expandPreset(settings.preset ?? DEFAULT_PRESET, settings.codexRow ?? false);
}
