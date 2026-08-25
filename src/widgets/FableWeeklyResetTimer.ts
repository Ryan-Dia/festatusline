import { getWeeklyReset } from '../data/reset.js';
import { createResetTimerWidget } from './resetTimerFactory.js';

export const FableWeeklyResetTimerWidget = createResetTimerWidget({
  id: 'fableWeeklyReset',
  labelKey: 'widget.fableWeeklyReset',
  prefix: 'F↺',
  getTimer: (ctx) => getWeeklyReset(ctx.weeklyAnchorDay, ctx.now),
});
