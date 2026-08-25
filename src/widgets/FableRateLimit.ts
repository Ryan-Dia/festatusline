import type { Widget } from './types.js';
import { createRateLimitWidget } from './rateLimitRenderer.js';

const PREFIX_WIDTH = 3;

export const FableWeeklyRateLimitWidget: Widget = createRateLimitWidget({
  id: 'fableWeeklyRateLimit',
  labelKey: 'widget.fableWeeklyRateLimit',
  prefix: 'F',
  color: '#ff79c6',
  prefixWidth: PREFIX_WIDTH,
  getSlot: (ctx) => ctx.fableRateLimit,
});
