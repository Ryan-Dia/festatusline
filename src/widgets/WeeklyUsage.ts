import type { Widget, RenderContext, WidgetConfig } from './types.js';
import { formatTokens } from '../utils/tokens.js';

export const WeeklyUsageWidget: Widget = {
  id: 'weeklyUsage',
  labelKey: 'widget.weeklyUsage',
  render(ctx: RenderContext, _cfg: WidgetConfig): string | null {
    if (!ctx.usage) return '7days ?';
    return `7days ${formatTokens(ctx.usage.weeklyTokens)}`;
  },
};
