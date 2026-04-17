import type { Widget, RenderContext, WidgetConfig } from './types.js';
import { formatTokens } from '../utils/tokens.js';

export const DailyUsageWidget: Widget = {
  id: 'dailyUsage',
  labelKey: 'widget.dailyUsage',
  render(ctx: RenderContext, _cfg: WidgetConfig): string | null {
    if (!ctx.usage) return 'Daily ?';
    return `Daily ${formatTokens(ctx.usage.dailyTokens)}`;
  },
};
