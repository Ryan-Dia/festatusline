import type { Widget, RenderContext, WidgetConfig } from './types.js';
import type { I18nKey } from '../i18n/index.js';
import { barWithPct, buildBar } from '../utils/bar.js';
import { formatRemainingHM, formatAbsDatetime } from '../utils/duration.js';
import { padDisplay } from '../utils/width.js';
import { firstBarPrefixWidth, secondBarPrefixWidth } from './columns.js';

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
  // Turn bar and percent red from this percent on; unset bars never change colour.
  alertAt?: number;
  // Shown in place of the countdown once the window has passed.
  resetLabel?: string;
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
    alertAt,
    resetLabel = 'reset',
  } = params;

  const paddedPrefix = prefixWidth != null ? padDisplay(prefix, prefixWidth) : prefix;

  if (usedPercent == null || resetsAtMs == null) {
    return `${paddedPrefix} ${buildBar(0, color)}  ?%`;
  }

  const remainingMs = resetsAtMs - now;
  const pct = remainingMs <= 0 ? 0 : Math.round(usedPercent);

  let timeStr: string;
  if (remainingMs <= 0) {
    timeStr = resetLabel;
  } else if (timeFormat === 'abs') {
    timeStr = formatAbsDatetime(resetsAtMs / 1000);
  } else {
    timeStr = formatRemainingHM(remainingMs);
  }

  const timeExpr =
    timeExprWidth != null ? padDisplay(`(${timeStr})`, timeExprWidth) : `(${timeStr})`;
  return `${paddedPrefix} ${barWithPct(pct, color, alertAt)} ${timeExpr}`;
}

interface RateLimitWidgetParams {
  id: string;
  labelKey: I18nKey;
  // A plain string for names that stay English (Fable, 7d); a key for words that translate.
  prefix: string | { key: I18nKey };
  color: string;
  getSlot: (ctx: RenderContext) => { usedPercent: number; resetsAt: number } | null | undefined;
  timeFormat?: RateLimitTimeFormat;
  // Which stacked bar column this sits in (see columns.ts); its width follows the locale.
  column?: 'first' | 'second';
  timeExprWidth?: number;
  /**
   * Hide the widget entirely when there is no slot, instead of drawing an empty `?%` bar.
   * For buckets that arrive on the stdin payload, `?%` is the right answer — the data is
   * merely late and will fill in. For one sourced elsewhere it can be permanently absent
   * (no OAuth credentials, macOS), and a bar that never resolves is just noise.
   */
  hideWhenMissing?: boolean;
  alertAt?: number;
}

export function createRateLimitWidget(params: RateLimitWidgetParams): Widget {
  const { id, labelKey, prefix, color, getSlot, timeFormat, column, timeExprWidth, alertAt } =
    params;
  const columnWidth = { first: firstBarPrefixWidth, second: secondBarPrefixWidth };
  return {
    id,
    labelKey,
    render(ctx: RenderContext, _cfg: WidgetConfig): string | null {
      const slot = getSlot(ctx);
      if (!slot && params.hideWhenMissing) return null;
      return renderRateLimitSlot({
        prefix: typeof prefix === 'string' ? prefix : ctx.t(prefix.key),
        color,
        usedPercent: slot?.usedPercent ?? null,
        resetsAtMs: slot?.resetsAt != null ? slot.resetsAt * 1000 : null,
        now: ctx.now.getTime(),
        timeFormat,
        prefixWidth: column ? columnWidth[column](ctx.t) : undefined,
        timeExprWidth,
        alertAt,
        resetLabel: ctx.t('bar.reset'),
      });
    },
  };
}
