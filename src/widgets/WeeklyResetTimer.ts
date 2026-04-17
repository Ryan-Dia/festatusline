import { getWeeklyReset } from '../data/reset.js';
import { createResetTimerWidget } from './resetTimerFactory.js';

export const WeeklyResetTimerWidget = createResetTimerWidget({
  id: 'weeklyReset',
  labelKey: 'widget.weeklyReset',
  prefix: '↺',
  getTimer: (ctx) => getWeeklyReset(ctx.weeklyAnchorDay, ctx.now),
});
