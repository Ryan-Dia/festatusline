import { describe, it, expect } from 'vitest';
import { SessionRateLimitWidget, WeeklyRateLimitWidget } from '../src/widgets/RateLimit.js';
import type { RenderContext } from '../src/widgets/types.js';
import { getTheme } from '../src/theme/index.js';
import { createTranslator } from '../src/i18n/index.js';

const NOW = new Date('2026-01-01T12:00:00Z');
const RESETS_AT = Math.floor(NOW.getTime() / 1000) + 2 * 60 * 60;
const ANSI_RE = new RegExp(`${String.fromCharCode(27)}\\[[0-9;]*m`, 'g');

function makeCtx(rateLimits: RenderContext['stdin']['rate_limits']): RenderContext {
  return {
    stdin: { type: 'statusLine', rate_limits: rateLimits },
    usage: null,
    codex: null,
    theme: getTheme('default'),
    t: createTranslator('en'),
    now: NOW,
    weeklyAnchorDay: null,
    cacheTtlCreatedAt: null,
    cacheTtlMs: 300_000,
  };
}

function render(widget: typeof WeeklyRateLimitWidget, ctx: RenderContext): string {
  return (widget.render(ctx, {}) ?? '').replace(ANSI_RE, '');
}

describe('WeeklyRateLimitWidget', () => {
  it('uses the "all" prefix for the seven_day bucket', () => {
    const out = render(
      WeeklyRateLimitWidget,
      makeCtx({ seven_day: { used_percentage: 25, resets_at: RESETS_AT } }),
    );
    expect(out.startsWith('all ')).toBe(true);
    expect(out).toContain('25%');
  });

  it('shows ?% when the bucket is absent', () => {
    expect(render(WeeklyRateLimitWidget, makeCtx({}))).toContain('?%');
  });

  it('aligns its bar with the Ctx column of the daily row', () => {
    const out = render(WeeklyRateLimitWidget, makeCtx({}));
    expect(out.indexOf('■')).toBe('Ctx '.length);
  });
});

describe('SessionRateLimitWidget', () => {
  it('renders the five_hour bucket behind a padded Session prefix', () => {
    const out = render(
      SessionRateLimitWidget,
      makeCtx({ five_hour: { used_percentage: 30, resets_at: RESETS_AT } }),
    );
    expect(out.startsWith('Session ')).toBe(true);
    expect(out).toContain('30%');
  });
});
