import { getDailyReset } from '../data/reset.js';
import { createResetTimerWidget } from './resetTimerFactory.js';

export const DailyResetTimerWidget = createResetTimerWidget({
  id: 'dailyReset',
  labelKey: 'widget.dailyReset',
  prefix: '↺',
  getTimer: (ctx) => getDailyReset(ctx.now),
});
