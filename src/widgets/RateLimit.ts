import type { Widget, RenderContext, WidgetConfig } from './types.js';
import type { I18nKey } from '../i18n/index.js';
import { buildBar, fmtPct } from '../utils/bar.js';
import { formatRemainingHM } from '../utils/duration.js';

interface RateLimitParams {
  id: string;
  labelKey: I18nKey;
  prefix: string;
  color: string;
  period: 'five_hour' | 'seven_day';
}

function createRateLimitWidget(params: RateLimitParams): Widget {
  const { id, labelKey, prefix, color, period } = params;
  return {
    id,
    labelKey,
    render(ctx: RenderContext, _cfg: WidgetConfig): string | null {
      const slot = ctx.stdin.rate_limits?.[period];
      if (slot?.used_percentage == null || !slot?.resets_at)
        return `${prefix} ${buildBar(0, color)}  ?%`;

      const remainingMs = slot.resets_at * 1000 - ctx.now.getTime();
      const pct = remainingMs <= 0 ? 0 : Math.round(slot.used_percentage);
      const timeStr = remainingMs <= 0 ? 'reset' : formatRemainingHM(remainingMs);
      return `${prefix} ${buildBar(pct, color)} ${fmtPct(pct)} (${timeStr})`;
    },
  };
}

export const RateLimitWidget: Widget = createRateLimitWidget({
  id: 'rateLimit',
  labelKey: 'widget.rateLimit',
  prefix: '5h',
  color: '#ffd93d',
  period: 'five_hour',
});

export const WeeklyRateLimitWidget: Widget = createRateLimitWidget({
  id: 'weeklyRateLimit',
  labelKey: 'widget.weeklyRateLimit',
  prefix: 'All',
  color: '#6bcb77',
  period: 'seven_day',
});
