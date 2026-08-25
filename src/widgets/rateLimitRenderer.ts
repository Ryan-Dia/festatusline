import type { Widget, RenderContext, WidgetConfig } from './types.js';
import type { I18nKey } from '../i18n/index.js';
import { buildBar, fmtPct } from '../utils/bar.js';
import { formatRemainingHM, formatAbsDatetime } from '../utils/duration.js';

export type RateLimitTimeFormat = 'remaining' | 'abs';

export interface RateLimitSlotParams {
  prefix: string;
  color: string;
  usedPercent: number | null;
  resetsAtMs: number | null;
  now: number;
  timeFormat?: RateLimitTimeFormat;
  prefixWidth?: number;
  timeExprWidth?: number;
}

export function renderRateLimitSlot(params: RateLimitSlotParams): string {
  const {
    prefix,
    color,
    usedPercent,
    resetsAtMs,
    now,
    timeFormat = 'remaining',
    prefixWidth,
    timeExprWidth,
  } = params;

  const paddedPrefix = prefixWidth != null ? prefix.padEnd(prefixWidth) : prefix;

  if (usedPercent == null || resetsAtMs == null) {
    return `${paddedPrefix} ${buildBar(0, color)}  ?%`;
  }

  const remainingMs = resetsAtMs - now;
  const pct = remainingMs <= 0 ? 0 : Math.round(usedPercent);

  let timeStr: string;
  if (remainingMs <= 0) {
    timeStr = 'reset';
  } else if (timeFormat === 'abs') {
    timeStr = formatAbsDatetime(resetsAtMs / 1000);
  } else {
    timeStr = formatRemainingHM(remainingMs);
  }

  const timeExpr = timeExprWidth != null ? `(${timeStr})`.padEnd(timeExprWidth) : `(${timeStr})`;
  return `${paddedPrefix} ${buildBar(pct, color)} ${fmtPct(pct)} ${timeExpr}`;
}

interface RateLimitWidgetParams {
  id: string;
  labelKey: I18nKey;
  prefix: string;
  color: string;
  getSlot: (ctx: RenderContext) => { usedPercent: number; resetsAt: number } | null | undefined;
  timeFormat?: RateLimitTimeFormat;
  prefixWidth?: number;
  timeExprWidth?: number;
  /**
   * Hide the widget entirely when there is no slot, instead of drawing an empty `?%` bar.
   * For buckets that arrive on the stdin payload, `?%` is the right answer — the data is
   * merely late and will fill in. For one sourced elsewhere it can be permanently absent
   * (no OAuth credentials, macOS), and a bar that never resolves is just noise.
   */
  hideWhenMissing?: boolean;
}

export function createRateLimitWidget(params: RateLimitWidgetParams): Widget {
  const { id, labelKey, prefix, color, getSlot, timeFormat, prefixWidth, timeExprWidth } = params;
  return {
    id,
    labelKey,
    render(ctx: RenderContext, _cfg: WidgetConfig): string | null {
      const slot = getSlot(ctx);
      if (!slot && params.hideWhenMissing) return null;
      return renderRateLimitSlot({
        prefix,
        color,
        usedPercent: slot?.usedPercent ?? null,
        resetsAtMs: slot?.resetsAt != null ? slot.resetsAt * 1000 : null,
        now: ctx.now.getTime(),
        timeFormat,
        prefixWidth,
        timeExprWidth,
      });
    },
  };
}
