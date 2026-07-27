import type { Widget } from './types.js';
import { createRateLimitWidget } from './rateLimitRenderer.js';

export const SessionRateLimitWidget: Widget = createRateLimitWidget({
  id: 'sessionRateLimit',
  labelKey: 'widget.sessionRateLimit',
  prefix: 'Session',
  color: '#ffd93d',
  getSlot: (ctx) => {
    const s = ctx.stdin.rate_limits?.five_hour;
    if (!s || s.resets_at == null) return null;
    return { usedPercent: s.used_percentage ?? 0, resetsAt: s.resets_at };
  },
});

export const WeeklyRateLimitWidget: Widget = createRateLimitWidget({
  id: 'weeklyRateLimit',
  labelKey: 'widget.weeklyRateLimit',
  prefix: '7d',
  color: '#6bcb77',
  getSlot: (ctx) => {
    const s = ctx.stdin.rate_limits?.seven_day;
    if (!s || s.resets_at == null) return null;
    return { usedPercent: s.used_percentage ?? 0, resetsAt: s.resets_at };
  },
});
