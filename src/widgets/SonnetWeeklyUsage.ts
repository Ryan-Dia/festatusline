import type { Widget, RenderContext, WidgetConfig } from './types.js';
import { formatTokens } from '../utils/tokens.js';

export const SonnetWeeklyUsageWidget: Widget = {
  id: 'sonnetWeeklyUsage',
  labelKey: 'widget.sonnetWeeklyUsage',
  render(ctx: RenderContext, _cfg: WidgetConfig): string | null {
    if (!ctx.usage) return null;
    return `S:${formatTokens(ctx.usage.sonnetWeeklyTokens)}`;
  },
};
