import type { Widget } from './types.js';
import { padDisplay } from '../utils/width.js';
import { rowLabelWidth } from './columns.js';

export const WeeklyUsageWidget: Widget = {
  id: 'weeklyUsage',
  labelKey: 'widget.weeklyUsage',
  render: (ctx) => padDisplay(ctx.t('row.weekly'), rowLabelWidth(ctx.t)),
};
