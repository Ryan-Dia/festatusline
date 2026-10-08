import type { Widget } from './types.js';
import { createRateLimitWidget } from './rateLimitRenderer.js';

export const FableWeeklyRateLimitWidget: Widget = createRateLimitWidget({
  id: 'fableWeeklyRateLimit',
  labelKey: 'widget.fableWeeklyRateLimit',
  prefix: 'Fable',
  // Violet: the one hue no other bar uses, and clear of the 80% alert red.
  color: '#bd93f9',
  // Shares the `Session` column with the daily row, so the two bars line up.
  column: 'second',
  getSlot: (ctx) => ctx.fableRateLimit,
  // Unlike the stdin-backed bars, this one has no data at all without OAuth credentials
  // (macOS keeps the token in the Keychain), where a permanent `?%` would be pure noise.
  hideWhenMissing: true,
});
