import type { Widget } from './types.js';
import { createRateLimitWidget } from './rateLimitRenderer.js';
import { ALERT_PERCENT } from '../utils/bar.js';

// Prefixes sit in the stacked bar columns (columns.ts), which keep the Daily and Weekly rows
// aligned in every locale. The padded time expression makes the weekly column as wide as
// Ctx's (which carries token counts), so whatever sits in the third slot lines up too.
const WEEKLY_TIME_EXPR_WIDTH = 11;

export const SessionRateLimitWidget: Widget = createRateLimitWidget({
  id: 'sessionRateLimit',
  labelKey: 'widget.sessionRateLimit',
  prefix: { key: 'bar.session' },
  color: '#ffd93d',
  column: 'second',
  alertAt: ALERT_PERCENT,
  getSlot: (ctx) => {
    const s = ctx.stdin.rate_limits?.five_hour;
    if (!s || s.resets_at == null) return null;
    return { usedPercent: s.used_percentage ?? 0, resetsAt: s.resets_at };
  },
});

export const WeeklyRateLimitWidget: Widget = createRateLimitWidget({
  id: 'weeklyRateLimit',
  labelKey: 'widget.weeklyRateLimit',
  prefix: { key: 'bar.all' },
  color: '#6bcb77',
  column: 'first',
  timeExprWidth: WEEKLY_TIME_EXPR_WIDTH,
  getSlot: (ctx) => {
    const s = ctx.stdin.rate_limits?.seven_day;
    if (!s || s.resets_at == null) return null;
    return { usedPercent: s.used_percentage ?? 0, resetsAt: s.resets_at };
  },
});
