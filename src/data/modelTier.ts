/**
 * Model families and the relative spend weights Claude Code's own `/usage` applies when
 * it attributes a window's cost. Mirroring those weights here means a festatusline share
 * lines up with what `/usage` reports for the same window, instead of treating an Opus
 * token and a Haiku token as equal.
 */
export type ModelFamily = 'fable' | 'opus' | 'sonnet' | 'haiku' | 'other';

// Ordered: Claude Code checks fable, then opus, then haiku, and treats everything else
// as the middle tier. Sonnet is split out here so usage can be broken down by family.
const FAMILY_PATTERNS: ReadonlyArray<readonly [ModelFamily, RegExp]> = [
  ['fable', /fable/i],
  ['opus', /opus/i],
  ['haiku', /haiku/i],
  ['sonnet', /sonnet/i],
];

const FAMILY_TIERS: Record<ModelFamily, number> = {
  fable: 10,
  opus: 5,
  sonnet: 3,
  haiku: 1,
  // An unrecognized or missing model name lands on the same tier Claude Code defaults to.
  other: 3,
};

const FAMILY_LABELS: Record<ModelFamily, string> = {
  fable: 'Fable',
  opus: 'Opus',
  sonnet: 'Sonnet',
  haiku: 'Haiku',
  other: 'Other',
};

// Per-token multipliers from the same source: a cache read is the unit, uncached input is
// 10x, a cache write 12.5x, and output 50x.
const CACHE_READ_WEIGHT = 1;
const INPUT_WEIGHT = 10;
const CACHE_WRITE_WEIGHT = 12.5;
const OUTPUT_WEIGHT = 50;

export type WeightedUsage = {
  model: string;
  inputTokens: number;
  outputTokens: number;
  cacheCreationTokens: number;
  cacheReadTokens: number;
};

export function modelFamily(model: string | null | undefined): ModelFamily {
  if (!model) return 'other';
  const matched = FAMILY_PATTERNS.find(([, pattern]) => pattern.test(model));
  return matched ? matched[0] : 'other';
}

export function modelTier(model: string | null | undefined): number {
  return FAMILY_TIERS[modelFamily(model)];
}

export function familyLabel(family: ModelFamily): string {
  return FAMILY_LABELS[family];
}

export function isSonnetModel(model: string | null | undefined): boolean {
  return modelFamily(model) === 'sonnet';
}

/**
 * Relative spend for one usage record. The unit is arbitrary and only meaningful next to
 * another weightedCost, which is why it is reported as a share rather than a total.
 */
export function weightedCost(entry: WeightedUsage): number {
  const perToken =
    entry.cacheReadTokens * CACHE_READ_WEIGHT +
    entry.inputTokens * INPUT_WEIGHT +
    entry.cacheCreationTokens * CACHE_WRITE_WEIGHT +
    entry.outputTokens * OUTPUT_WEIGHT;
  return perToken * modelTier(entry.model);
}

export function emptyFamilyTotals(): Record<ModelFamily, number> {
  return { fable: 0, opus: 0, sonnet: 0, haiku: 0, other: 0 };
}
