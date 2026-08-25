import type { Widget, RenderContext, WidgetConfig } from './types.js';
import { formatTokens } from '../utils/tokens.js';

export const FableWeeklyUsageWidget: Widget = {
  id: 'fableWeeklyUsage',
  labelKey: 'widget.fableWeeklyUsage',
  render(ctx: RenderContext, _cfg: WidgetConfig): string | null {
    if (!ctx.usage) return null;
    return `F:${formatTokens(ctx.usage.fableWeeklyTokens)}`;
  },
};
