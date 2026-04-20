import type { Settings } from './schema.js';

export const PRESETS: Record<string, Partial<Settings>> = {
  minimal: {
    lines: [
      [{ id: 'dailyUsage' }, { id: 'context' }, { id: 'rateLimit' }],
      [{ id: 'weeklyUsage' }, { id: 'weeklyRateLimit' }],
      [{ id: 'model' }, { id: 'claudePeak' }],
    ],
  },
  full: {
    lines: [
      [
        { id: 'model' },
        { id: 'claudePeak' },
        { id: 'context' },
        { id: 'rateLimit' },
        { id: 'peakTime' },
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
        { id: 'claudePeak' },
        { id: 'context' },
        { id: 'rateLimit' },
        { id: 'peakTime' },
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
    lines: [[{ id: 'model' }, { id: 'claudePeak' }, { id: 'dailyUsage' }, { id: 'weeklyUsage' }]],
  },
  plus: {
    lines: [
      [
        { id: 'model' },
        { id: 'claudePeak' },
        { id: 'dailyUsage' },
        { id: 'weeklyUsage' },
        { id: 'cacheHit' },
        { id: 'cacheTtl' },
        { id: 'sessionCost' },
      ],
    ],
  },
  pro: {
    lines: [
      [
        { id: 'model' },
        { id: 'claudePeak' },
        { id: 'dailyUsage' },
        { id: 'weeklyUsage' },
        { id: 'cacheHit' },
        { id: 'cacheTtl' },
        { id: 'sessionCost' },
        { id: 'gptUsage' },
      ],
    ],
  },
};

export const PRESET_NAMES = Object.keys(PRESETS);
