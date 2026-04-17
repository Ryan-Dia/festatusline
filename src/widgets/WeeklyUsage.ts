import type { Widget, RenderContext, WidgetConfig } from './types.js';

export const WeeklyUsageWidget: Widget = {
  id: 'weeklyUsage',
  labelKey: 'widget.weeklyUsage',
  render(_ctx: RenderContext, _cfg: WidgetConfig): string | null {
    return '7days';
  },
};
