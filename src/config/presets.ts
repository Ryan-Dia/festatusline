import type { Settings } from './schema.js';

// Shared by the basic/pro/max ladder so the two usage rows stay column-aligned.
const DAILY_ROW = [{ id: 'dailyUsage' }, { id: 'context' }, { id: 'sessionRateLimit' }];
const WEEKLY_ROW = [{ id: 'weeklyUsage' }, { id: 'weeklyRateLimit' }];

// Optional row, offered independently of preset tier (setup wizard's Codex step) rather
// than baked into any one preset.
export const CODEX_ROW = [{ id: 'codexModel' }, { id: 'codexWeeklyRateLimit' }];

/** Inserts the Codex row right after the weekly row, which sits at index 1 on every tier. */
export function withCodexRow(lines: Settings['lines']): Settings['lines'] {
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
