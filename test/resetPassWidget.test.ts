import { describe, it, expect } from 'vitest';
import { ResetPassWidget, formatResetPassDeadline } from '../src/widgets/ResetPass.js';
import { getTheme } from '../src/theme/index.js';
import { createTranslator } from '../src/i18n/index.js';
import type { RenderContext } from '../src/widgets/types.js';

const NOW = new Date('2026-10-08T12:00:00Z');
const NOW_SECS = NOW.getTime() / 1000;
const HOUR = 3600;
const DAY = 24 * HOUR;
const ANSI_RE = /\x1b\[[0-9;]*m/g;

function makeCtx(overrides: Partial<RenderContext> = {}): RenderContext {
  return {
    stdin: { type: 'statusLine' },
    usage: null,
    codex: null,
    fableRateLimit: null,
    theme: getTheme('default'),
    t: createTranslator('en'),
    now: NOW,
    weeklyAnchorDay: null,
    cacheTtlCreatedAt: null,
    cacheTtlMs: 300_000,
    ...overrides,
  };
}

function render(overrides: Partial<RenderContext>): string | null {
  return ResetPassWidget.render(makeCtx(overrides), {})?.replace(ANSI_RE, '') ?? null;
}

describe('formatResetPassDeadline', () => {
  const en = createTranslator('en');

  it('counts whole days up, so 25h left is still D-2', () => {
    expect(formatResetPassDeadline(28 * DAY * 1000, en)).toBe('D-28');
    expect(formatResetPassDeadline(25 * HOUR * 1000, en)).toBe('D-2');
    expect(formatResetPassDeadline(24 * HOUR * 1000, en)).toBe('D-1');
  });

  it('switches to hours under a day and minutes under an hour', () => {
    expect(formatResetPassDeadline(5.5 * HOUR * 1000, en)).toBe('5h left');
    expect(formatResetPassDeadline(42 * 60 * 1000, en)).toBe('42m left');
    expect(formatResetPassDeadline(10 * 1000, en)).toBe('1m left');
    // Just under an hour reads 59m, not a 60m that would sit between 1h and 59m.
    expect(formatResetPassDeadline(59.5 * 60 * 1000, en)).toBe('59m left');
  });

  it('localises the sub-day forms', () => {
    expect(formatResetPassDeadline(5 * HOUR * 1000, createTranslator('ko'))).toBe('5시간 남음');
    expect(formatResetPassDeadline(42 * 60 * 1000, createTranslator('zh'))).toBe('剩42分钟');
  });
});

describe('ResetPassWidget', () => {
  it('hides when there is no reset data or the account is not eligible', () => {
    expect(render({})).toBeNull();
    expect(render({ resetPass: null })).toBeNull();
  });

  it('renders the real Opus 5.5 grant as D-15 on 2026-10-08', () => {
    // ends_at 2026-10-22T16:00Z — 14.2 days out, counted up.
    const resetPass = { count: 1, expiresAt: 1_792_684_800 };
    expect(render({ resetPass })).toBe('🎟 Reset 1 · D-15');
  });

  it('uses the plural label above one', () => {
    const resetPass = { count: 2, expiresAt: NOW_SECS + 28 * DAY };
    expect(render({ resetPass })).toBe('🎟 Resets 2 · D-28');
  });

  it('keeps showing zero rather than disappearing', () => {
    expect(render({ resetPass: { count: 0, expiresAt: null } })).toBe('🎟 Resets 0');
  });

  it('treats an expired pass as zero until the next fetch catches up', () => {
    const resetPass = { count: 1, expiresAt: NOW_SECS - 60 };
    expect(render({ resetPass })).toBe('🎟 Resets 0');
  });

  it('omits the deadline when the pass has none', () => {
    expect(render({ resetPass: { count: 2, expiresAt: null } })).toBe('🎟 Resets 2');
  });

  it('localises the label', () => {
    const resetPass = { count: 1, expiresAt: NOW_SECS + 5 * HOUR };
    expect(render({ resetPass, t: createTranslator('ko') })).toBe('🎟 리셋권 1 · 5시간 남음');
  });
});
