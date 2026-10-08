import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import chalk from 'chalk';
import { ContextWidget } from '../src/widgets/Context.js';
import { SessionRateLimitWidget, WeeklyRateLimitWidget } from '../src/widgets/RateLimit.js';
import { FableWeeklyRateLimitWidget } from '../src/widgets/FableRateLimit.js';
import { getTheme } from '../src/theme/index.js';
import type { RenderContext } from '../src/widgets/types.js';

// Truecolor foreground sequences, so the test reads the actual colour chosen.
const RED = '\x1b[38;2;255;85;85m'; // #ff5555
const VIOLET = '\x1b[38;2;189;147;249m'; // #bd93f9
const NOW = new Date('2026-10-08T12:00:00Z');
const RESETS_AT = NOW.getTime() / 1000 + 3600;

function makeCtx(overrides: Partial<RenderContext> = {}): RenderContext {
  return {
    stdin: { type: 'statusLine' },
    usage: null,
    codex: null,
    fableRateLimit: null,
    theme: getTheme('default'),
    t: (k) => k,
    now: NOW,
    weeklyAnchorDay: null,
    cacheTtlCreatedAt: null,
    cacheTtlMs: 300_000,
    ...overrides,
  };
}

function session(pct: number): string {
  const ctx = makeCtx({
    stdin: { rate_limits: { five_hour: { used_percentage: pct, resets_at: RESETS_AT } } },
  });
  return SessionRateLimitWidget.render(ctx, {}) ?? '';
}

function context(pct: number): string {
  const ctx = makeCtx({
    stdin: { context_window: { used_percentage: pct, context_window_size: 200_000 } },
  });
  return ContextWidget.render(ctx, {}) ?? '';
}

describe('80% alert colour', () => {
  let level: typeof chalk.level;
  beforeAll(() => {
    level = chalk.level;
    chalk.level = 3;
  });
  afterAll(() => {
    chalk.level = level;
  });

  it('turns the session bar and its percent red from 80%', () => {
    const out = session(80);
    expect(out).toContain(`${RED}■`);
    expect(out).toContain(`${RED} 80%`);
    expect(session(79)).not.toContain(RED);
  });

  it('turns the context bar and its percent red from 80%', () => {
    const out = context(82);
    expect(out).toContain(`${RED}■`);
    expect(out).toContain(`${RED} 82%`);
    expect(context(79)).not.toContain(RED);
  });

  it('leaves the other bars alone however full they are', () => {
    const weekly = WeeklyRateLimitWidget.render(
      makeCtx({
        stdin: { rate_limits: { seven_day: { used_percentage: 95, resets_at: RESETS_AT } } },
      }),
      {},
    );
    const fable = FableWeeklyRateLimitWidget.render(
      makeCtx({ fableRateLimit: { usedPercent: 95, resetsAt: RESETS_AT } }),
      {},
    );
    expect(weekly).not.toContain(RED);
    expect(fable).not.toContain(RED);
  });

  it('draws the Fable bar in violet, clear of the red alert', () => {
    const fable = FableWeeklyRateLimitWidget.render(
      makeCtx({ fableRateLimit: { usedPercent: 50, resetsAt: RESETS_AT } }),
      {},
    );
    expect(fable).toContain(`${VIOLET}■`);
  });
});
