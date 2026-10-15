import { z } from 'zod';

export const WidgetConfigSchema = z.object({
  id: z.string(),
  color: z.string().optional(),
});

export const SettingsSchema = z.object({
  // Setup records the preset name and the Codex opt-in rather than the rows they expand to,
  // so a release that adds a widget to that preset reaches existing users on update. `lines`
  // is written only when someone edits their layout by hand, and then it takes over — see
  // resolveLines in presets.ts for the full precedence.
  preset: z.string().optional(),
  codexRow: z.boolean().optional(),
  lines: z.array(z.array(WidgetConfigSchema)).optional(),
  theme: z.string().default('default'),
  locale: z.enum(['ko', 'en', 'zh']).default('en'),
  weeklyAnchorDay: z.number().min(0).max(6).nullable().default(null),
  separator: z.string().default(' │ '),
  // Parent folders shown above the current folder in the gitRepo widget. A top-level field
  // rather than widget config, since config lives in `lines` and writing that freezes the preset.
  pathDepth: z.number().int().min(0).max(3).default(0),
  // A line above the status line when a required update is out (src/data/updateCheck.ts).
  // Off also means no check against GitHub at all.
  updateNotice: z.boolean().default(true),
});

export type Settings = z.infer<typeof SettingsSchema>;
export type WidgetCfg = z.infer<typeof WidgetConfigSchema>;
