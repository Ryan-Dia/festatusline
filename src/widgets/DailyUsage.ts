import type { Widget, RenderContext, WidgetConfig } from './types.js';

export const DailyUsageWidget: Widget = {
  id: 'dailyUsage',
  labelKey: 'widget.dailyUsage',
  render(_ctx: RenderContext, _cfg: WidgetConfig): string | null {
    return 'Daily';
  },
};
