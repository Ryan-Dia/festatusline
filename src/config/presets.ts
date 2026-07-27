import type { Settings } from './schema.js';

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
        { id: 'gptUsage' },
      ],
    ],
  },
  'multi-cli': {
    lines: [[{ id: 'model' }, { id: 'dailyUsage' }, { id: 'gptUsage' }]],
  },
  lite: {
    lines: [
      [{ id: 'dailyUsage' }, { id: 'context' }],
      [{ id: 'weeklyUsage' }, { id: 'weeklyRateLimit' }],
      [{ id: 'model' }, { id: 'gitRepo' }],
    ],
  },
  plus: {
    lines: [
      [{ id: 'dailyUsage' }, { id: 'context' }],
      [{ id: 'weeklyUsage' }, { id: 'weeklyRateLimit' }],
      [{ id: 'spacer' }],
      [{ id: 'cacheHit' }, { id: 'cacheTtl' }, { id: 'sessionCost' }],
      [{ id: 'model' }, { id: 'gitRepo' }],
    ],
  },
  pro: {
    lines: [
      [{ id: 'dailyUsage' }, { id: 'context' }],
      [{ id: 'weeklyUsage' }, { id: 'weeklyRateLimit' }],
      [{ id: 'codexModel' }, { id: 'codexWeeklyRateLimit' }],
      [{ id: 'spacer' }],
      [{ id: 'cacheHit' }, { id: 'cacheTtl' }, { id: 'sessionCost' }],
      [{ id: 'model' }, { id: 'gitRepo' }],
    ],
  },
};

export const PRESET_NAMES = Object.keys(PRESETS);
