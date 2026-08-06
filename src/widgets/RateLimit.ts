import type { Widget } from './types.js';
import { createRateLimitWidget } from './rateLimitRenderer.js';

// Prefix widths keep the Daily and Weekly rows aligned when stacked:
//   Daily  │ Ctx <bar> <pct> <expr> │ Session <bar> <pct> <expr>
//   Weekly │ all <bar> <pct> <expr>
// 'all' mirrors the Context widget's 3-char 'Ctx' prefix.
const WEEKLY_PREFIX_WIDTH = 3;
const SESSION_PREFIX_WIDTH = 7;

export const SessionRateLimitWidget: Widget = createRateLimitWidget({
  id: 'sessionRateLimit',
  labelKey: 'widget.sessionRateLimit',
  prefix: 'Session',
  color: '#ffd93d',
  prefixWidth: SESSION_PREFIX_WIDTH,
  getSlot: (ctx) => {
    const s = ctx.stdin.rate_limits?.five_hour;
    if (!s || s.resets_at == null) return null;
    return { usedPercent: s.used_percentage ?? 0, resetsAt: s.resets_at };
  },
});

export const WeeklyRateLimitWidget: Widget = createRateLimitWidget({
  id: 'weeklyRateLimit',
  labelKey: 'widget.weeklyRateLimit',
  prefix: 'all',
  color: '#6bcb77',
  prefixWidth: WEEKLY_PREFIX_WIDTH,
  getSlot: (ctx) => {
    const s = ctx.stdin.rate_limits?.seven_day;
    if (!s || s.resets_at == null) return null;
    return { usedPercent: s.used_percentage ?? 0, resetsAt: s.resets_at };
  },
});
