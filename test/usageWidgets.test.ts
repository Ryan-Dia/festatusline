import { describe, it, expect } from 'vitest';
import { DailyUsageWidget } from '../src/widgets/DailyUsage.js';
import { WeeklyUsageWidget } from '../src/widgets/WeeklyUsage.js';
import { SonnetWeeklyUsageWidget } from '../src/widgets/SonnetWeeklyUsage.js';
import { FableWeeklyUsageWidget } from '../src/widgets/FableWeeklyUsage.js';
import { emptyFamilyTotals } from '../src/data/modelTier.js';
import { getTheme } from '../src/theme/index.js';
import type { RenderContext } from '../src/widgets/types.js';

function makeCtx(usage: RenderContext['usage'] = null): RenderContext {
  return {
    stdin: { type: 'statusLine' },
    usage,
    codex: null,
    fableRateLimit: null,
    theme: getTheme('default'),
    t: (k) => k,
    now: new Date('2026-08-25T12:00:00Z'),
    weeklyAnchorDay: null,
    cacheTtlCreatedAt: null,
    cacheTtlMs: 300_000,
  };
}

describe('DailyUsageWidget and WeeklyUsageWidget', () => {
  it('render fixed-width labels', () => {
    // The trailing spaces are load-bearing: they keep the Daily and Weekly rows of the
    // basic/pro/max presets aligned with the bars underneath them.
    const ctx = makeCtx(null);
    expect(DailyUsageWidget.render(ctx, {})).toBe('Daily  ');
    expect(WeeklyUsageWidget.render(ctx, {})).toBe('Weekly ');
  });

  it('render regardless of whether a usage snapshot loaded', () => {
    const ctx = makeCtx({
      dailyTokens: 480_000,
      weeklyTokens: 3_100_000,
      sonnetWeeklyTokens: 1_300_000,
      fableWeeklyTokens: 0,
      weightedDaily: 0,
      weightedWeekly: 0,
      weightedWeeklyByFamily: emptyFamilyTotals(),
      allEntries: [],
    });
    expect(DailyUsageWidget.render(ctx, {})).toBe('Daily  ');
    expect(WeeklyUsageWidget.render(ctx, {})).toBe('Weekly ');
  });
});

describe('SonnetWeeklyUsageWidget', () => {
  it('renders S:<tokens> from the weekly Sonnet total', () => {
    const ctx = makeCtx({
      dailyTokens: 0,
      weeklyTokens: 3_100_000,
      sonnetWeeklyTokens: 1_300_000,
      fableWeeklyTokens: 0,
      weightedDaily: 0,
      weightedWeekly: 0,
      weightedWeeklyByFamily: emptyFamilyTotals(),
      allEntries: [],
    });
    expect(SonnetWeeklyUsageWidget.render(ctx, {})).toBe('S:1.3M');
  });

  it('returns null when no usage snapshot is available', () => {
    expect(SonnetWeeklyUsageWidget.render(makeCtx(null), {})).toBeNull();
  });
});

describe('FableWeeklyUsageWidget', () => {
  it('renders F:<tokens> from the weekly Fable total', () => {
    const ctx = makeCtx({
      dailyTokens: 0,
      weeklyTokens: 3_100_000,
      sonnetWeeklyTokens: 0,
      fableWeeklyTokens: 900_000,
      weightedDaily: 0,
      weightedWeekly: 0,
      weightedWeeklyByFamily: emptyFamilyTotals(),
      allEntries: [],
    });
    expect(FableWeeklyUsageWidget.render(ctx, {})).toBe('F:900K');
  });

  it('returns null when no usage snapshot is available', () => {
    expect(FableWeeklyUsageWidget.render(makeCtx(null), {})).toBeNull();
  });
});
