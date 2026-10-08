import type { Widget } from './types.js';
import { padDisplay } from '../utils/width.js';
import { rowLabelWidth } from './columns.js';

export const DailyUsageWidget: Widget = {
  id: 'dailyUsage',
  labelKey: 'widget.dailyUsage',
  render: (ctx) => padDisplay(ctx.t('row.daily'), rowLabelWidth(ctx.t)),
};
