import type { Widget } from './types.js';
import { createRateLimitWidget } from './rateLimitRenderer.js';

// Matches the `Session` column the daily row puts in this slot, so the two bars line up.
const PREFIX_WIDTH = 7;

export const FableWeeklyRateLimitWidget: Widget = createRateLimitWidget({
  id: 'fableWeeklyRateLimit',
  labelKey: 'widget.fableWeeklyRateLimit',
  prefix: 'Fable',
  // Violet: the one hue no other bar uses, and clear of the 80% alert red.
  color: '#bd93f9',
  prefixWidth: PREFIX_WIDTH,
  getSlot: (ctx) => ctx.fableRateLimit,
  // Unlike the stdin-backed bars, this one has no data at all without OAuth credentials
  // (macOS keeps the token in the Keychain), where a permanent `?%` would be pure noise.
  hideWhenMissing: true,
});
