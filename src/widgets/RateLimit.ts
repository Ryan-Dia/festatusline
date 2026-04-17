import type { Widget, RenderContext, WidgetConfig } from './types.js';
import { buildBar, fmtPct } from '../utils/bar.js';
import { formatRemainingHM } from '../utils/duration.js';

export const RateLimitWidget: Widget = {
  id: 'rateLimit',
  labelKey: 'widget.rateLimit',
  render(ctx: RenderContext, _cfg: WidgetConfig): string | null {
    const fiveHour = ctx.stdin.rate_limits?.five_hour;
    if (fiveHour?.used_percentage == null || !fiveHour?.resets_at) return null;

    const pct = Math.round(fiveHour.used_percentage);
    const remainingMs = fiveHour.resets_at * 1000 - ctx.now.getTime();
    return `5h ${buildBar(pct, '#ffd93d')} ${fmtPct(pct)} (${formatRemainingHM(remainingMs)})`;
  },
};

export const WeeklyRateLimitWidget: Widget = {
  id: 'weeklyRateLimit',
  labelKey: 'widget.weeklyRateLimit',
  render(ctx: RenderContext, _cfg: WidgetConfig): string | null {
    const sevenDay = ctx.stdin.rate_limits?.seven_day;
    if (sevenDay?.used_percentage == null || !sevenDay?.resets_at) return null;

    const pct = Math.round(sevenDay.used_percentage);
    const remainingMs = sevenDay.resets_at * 1000 - ctx.now.getTime();
    return `All ${buildBar(pct, '#6bcb77')} ${fmtPct(pct)} (${formatRemainingHM(remainingMs)})`;
  },
};
