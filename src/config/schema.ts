import { z } from 'zod';

export const WidgetConfigSchema = z.object({
  id: z.string(),
  color: z.string().optional(),
});

export const SettingsSchema = z.object({
  lines: z
    .array(z.array(WidgetConfigSchema))
    .default([
      [{ id: 'dailyUsage' }, { id: 'context' }, { id: 'rateLimit' }],
      [{ id: 'weeklyUsage' }, { id: 'weeklyRateLimit' }],
      [{ id: 'model' }],
    ]),
  theme: z.string().default('default'),
  locale: z.enum(['ko', 'en', 'zh']).default('en'),
  weeklyAnchorDay: z.number().min(0).max(6).nullable().default(null),
  separator: z.string().default(' │ '),
});

export type Settings = z.infer<typeof SettingsSchema>;
export type WidgetCfg = z.infer<typeof WidgetConfigSchema>;
