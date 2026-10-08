import type { Widget } from './types.js';
import { createRateLimitWidget } from './rateLimitRenderer.js';
import { selectLongestWindowSlot } from '../data/codex.js';

const TIME_EXPR_WIDTH = 11;

export const CodexWeeklyRateLimitWidget: Widget = createRateLimitWidget({
  id: 'codexWeeklyRateLimit',
  labelKey: 'widget.codexWeeklyRateLimit',
  prefix: '7d',
  color: '#48dbfb',
  getSlot: (ctx) => selectLongestWindowSlot(ctx.codex?.rateLimits ?? null),
  timeFormat: 'remaining',
  column: 'first',
  timeExprWidth: TIME_EXPR_WIDTH,
});
