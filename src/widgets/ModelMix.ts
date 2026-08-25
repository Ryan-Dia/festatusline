import type { Widget, RenderContext, WidgetConfig } from './types.js';
import { familyLabel, type ModelFamily } from '../data/modelTier.js';

// Below this share a family is noise on a one-line status bar.
const MIN_SHARE_PCT = 1;

type Share = { family: ModelFamily; pct: number };

/**
 * Largest-remainder rounding, so the displayed shares add up to exactly 100 instead of
 * drifting to 99 or 101 the way independent rounding does.
 */
function roundToHundred(exact: { family: ModelFamily; exactPct: number }[]): Share[] {
  const floored = exact.map((entry) => ({
    family: entry.family,
    pct: Math.floor(entry.exactPct),
    remainder: entry.exactPct - Math.floor(entry.exactPct),
  }));

  const assigned = floored.reduce((sum, entry) => sum + entry.pct, 0);
  const byRemainder = [...floored].sort((a, b) => b.remainder - a.remainder);
  for (let i = 0; i < 100 - assigned; i += 1) {
    const target = byRemainder[i % byRemainder.length];
    if (target) target.pct += 1;
  }

  return floored.map(({ family, pct }) => ({ family, pct }));
}

export const ModelMixWidget: Widget = {
  id: 'modelMix',
  labelKey: 'widget.modelMix',
  render(ctx: RenderContext, _cfg: WidgetConfig): string | null {
    if (!ctx.usage) return null;
    const { weightedWeekly, weightedWeeklyByFamily } = ctx.usage;
    if (weightedWeekly <= 0) return null;

    const entries = Object.entries(weightedWeeklyByFamily) as [ModelFamily, number][];
    // Drop the rounding-noise families first, then renormalize over what is left so the
    // printed shares still cover the whole bar.
    const kept = entries.filter(
      ([, weighted]) => (weighted / weightedWeekly) * 100 >= MIN_SHARE_PCT,
    );
    const keptTotal = kept.reduce((sum, [, weighted]) => sum + weighted, 0);
    if (keptTotal <= 0) return null;

    const shares = roundToHundred(
      kept.map(([family, weighted]) => ({ family, exactPct: (weighted / keptTotal) * 100 })),
    ).sort((a, b) => b.pct - a.pct);

    return shares.map(({ family, pct }) => `${familyLabel(family)} ${pct}%`).join(' · ');
  },
};
