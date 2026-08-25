import type { WidgetCfg } from './schema.js';

/**
 * Preset layouts exactly as they shipped through 0.5.0, back when settings.json stored the
 * expanded widget rows and nothing recorded which preset they came from.
 *
 * A config written by one of those releases has no `preset` field, so the only way to tell a
 * stock layout from a hand-tuned one is to compare it against what the presets looked like at
 * the time. A match adopts the preset name, which is what lets a release that adds a widget to
 * a preset reach someone who set up before this mechanism existed.
 *
 * This table is a fixed historical snapshot — it must not be updated when PRESETS changes,
 * or configs written by older releases stop matching. Anything written from 0.6.0 on records
 * its preset directly and never consults this.
 */
const DAILY_ROW = ['dailyUsage', 'context', 'sessionRateLimit'];
const WEEKLY_ROW = ['weeklyUsage', 'weeklyRateLimit'];
const CODEX_ROW = ['codexModel', 'codexWeeklyRateLimit'];
const DENSE_ROW = [
  'model',
  'context',
  'dailyUsage',
  'dailyReset',
  'weeklyUsage',
  'weeklyReset',
  'sonnetWeeklyUsage',
  'sonnetWeeklyReset',
];

const LEGACY_LAYOUTS: ReadonlyArray<readonly [string, string[][]]> = [
  ['minimal', [['dailyUsage', 'context'], WEEKLY_ROW, ['model']]],
  // 0.5.0 slipped fableWeeklyRateLimit into these two; earlier releases had neither.
  ['full', [[...DENSE_ROW, 'gptUsage']]],
  ['full', [[...DENSE_ROW, 'fableWeeklyRateLimit', 'gptUsage']]],
  ['korean-dev', [[...DENSE_ROW, 'gptUsage']]],
  ['korean-dev', [[...DENSE_ROW, 'fableWeeklyRateLimit', 'gptUsage']]],
  ['multi-cli', [['model', 'dailyUsage', 'gptUsage']]],
  ['basic', [DAILY_ROW, WEEKLY_ROW]],
  ['pro', [DAILY_ROW, WEEKLY_ROW, ['spacer'], ['model', 'gitRepo']]],
  [
    'max',
    [
      DAILY_ROW,
      WEEKLY_ROW,
      ['spacer'],
      ['cacheHit', 'cacheTtl', 'sessionCost'],
      ['model', 'gitRepo'],
    ],
  ],
];

/** Mirrors withCodexRow: the Codex row went in right below the weekly row, at index 2. */
function withCodexRowIds(lines: string[][]): string[][] {
  return [...lines.slice(0, 2), CODEX_ROW, ...lines.slice(2)];
}

function sameLayout(a: string[][], b: string[][]): boolean {
  return (
    a.length === b.length &&
    a.every((row, i) => {
      const other = b[i];
      return other?.length === row.length && row.every((id, j) => other[j] === id);
    })
  );
}

export interface DetectedPreset {
  name: string;
  codexRow: boolean;
}

/**
 * Returns the preset a pre-0.6.0 `lines` array was expanded from, or null if it was edited.
 *
 * A per-widget `color` override counts as edited: adopting the preset would re-expand the rows
 * and silently drop those colors, so a config carrying any is left exactly as the user wrote it.
 */
export function detectLegacyPreset(lines: WidgetCfg[][]): DetectedPreset | null {
  if (lines.some((row) => row.some((w) => w.color != null))) return null;
  const ids = lines.map((row) => row.map((w) => w.id));

  for (const [name, layout] of LEGACY_LAYOUTS) {
    if (sameLayout(ids, layout)) return { name, codexRow: false };
    if (sameLayout(ids, withCodexRowIds(layout))) return { name, codexRow: true };
  }
  return null;
}
