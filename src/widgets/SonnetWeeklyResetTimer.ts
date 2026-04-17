import { getWeeklyReset } from '../data/reset.js';
import { createResetTimerWidget } from './resetTimerFactory.js';

export const SonnetWeeklyResetTimerWidget = createResetTimerWidget({
  id: 'sonnetWeeklyReset',
  labelKey: 'widget.sonnetWeeklyReset',
  prefix: 'S↺',
  getTimer: (ctx) => getWeeklyReset(ctx.weeklyAnchorDay, ctx.now),
});
