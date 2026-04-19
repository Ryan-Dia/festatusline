import type { Widget, RenderContext, WidgetConfig } from './types.js';
import type { I18nKey } from '../i18n/index.js';
import { buildBar, fmtPct } from '../utils/bar.js';
import { formatRemainingHM, formatAbsDatetime } from '../utils/duration.js';
import type { CodexRateLimits } from '../data/codex.js';

type Period = keyof CodexRateLimits;
type TimeFormat = 'remaining' | 'abs';

interface CodexRateLimitParams {
  id: string;
  labelKey: I18nKey;
  prefix: string;
  color: string;
  period: Period;
  timeFormat: TimeFormat;
  prefixWidth?: number;
  timeExprWidth?: number;
}

function createCodexRateLimitWidget(params: CodexRateLimitParams): Widget {
  const { id, labelKey, prefix, color, period, timeFormat, prefixWidth, timeExprWidth } = params;
  return {
    id,
    labelKey,
    render(ctx: RenderContext, _cfg: WidgetConfig): string | null {
      const slot = ctx.codex?.rateLimits?.[period];
      const paddedPrefix = prefixWidth != null ? prefix.padEnd(prefixWidth) : prefix;
      if (!slot) return `${paddedPrefix} ${buildBar(0, color)} ?%`;

      const remainingMs = slot.resetsAt * 1000 - ctx.now.getTime();
      const pct = remainingMs <= 0 ? 0 : Math.round(slot.usedPercent);
      let timeStr: string;
      if (remainingMs <= 0) {
        timeStr = 'reset';
      } else if (timeFormat === 'abs') {
        timeStr = formatAbsDatetime(slot.resetsAt);
      } else {
        timeStr = formatRemainingHM(remainingMs);
      }

      const timeExpr =
        timeExprWidth != null ? `(${timeStr})`.padEnd(timeExprWidth) : `(${timeStr})`;
      return `${paddedPrefix} ${buildBar(pct, color)} ${fmtPct(pct)} ${timeExpr}`;
    },
  };
}

export const CodexRateLimitWidget: Widget = createCodexRateLimitWidget({
  id: 'codexRateLimit',
  labelKey: 'widget.codexRateLimit',
  prefix: '5h',
  color: '#ff9f43',
  period: 'primary',
  timeFormat: 'remaining',
  prefixWidth: 3,
  timeExprWidth: 11,
});

export const CodexWeeklyRateLimitWidget: Widget = createCodexRateLimitWidget({
  id: 'codexWeeklyRateLimit',
  labelKey: 'widget.codexWeeklyRateLimit',
  prefix: '7d',
  color: '#48dbfb',
  period: 'secondary',
  timeFormat: 'remaining',
  prefixWidth: 3,
  timeExprWidth: 11,
});
