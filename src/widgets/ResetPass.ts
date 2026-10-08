import chalk from 'chalk';
import type { Widget, RenderContext, WidgetConfig } from './types.js';
import type { I18nKey } from '../i18n/index.js';

const MINUTE_MS = 60 * 1000;
const HOUR_MS = 60 * MINUTE_MS;
const DAY_MS = 24 * HOUR_MS;
// A reset left unused this close to its deadline is about to be lost, so flag it.
const WARN_WITHIN_MS = 3 * DAY_MS;

/**
 * `D-n` while a day or more remains, counting whole days up (25h left is D-2), then hours and
 * finally minutes — on the last day "D-day" would hide whether that means 20h or 20m.
 */
export function formatResetPassDeadline(ms: number, t: (key: I18nKey) => string): string {
  if (ms >= DAY_MS) return `D-${Math.ceil(ms / DAY_MS)}`;
  if (ms >= HOUR_MS) {
    return t('resetPass.hoursLeft').replace('{n}', String(Math.floor(ms / HOUR_MS)));
  }
  const minutes = Math.max(1, Math.ceil(ms / MINUTE_MS));
  return t('resetPass.minutesLeft').replace('{n}', String(minutes));
}

export const ResetPassWidget: Widget = {
  id: 'resetPass',
  labelKey: 'widget.resetPass',
  render(ctx: RenderContext, _cfg: WidgetConfig): string | null {
    const { resetPass } = ctx;
    if (!resetPass) return null;

    // The cache can outlive the deadline by up to its TTL; a lapsed reset is no longer usable.
    const remainingMs =
      resetPass.expiresAt == null ? null : resetPass.expiresAt * 1000 - ctx.now.getTime();
    const count = remainingMs != null && remainingMs <= 0 ? 0 : Math.max(0, resetPass.count);

    const label = `🎟 ${ctx.t(count === 1 ? 'resetPass.one' : 'resetPass.other')} ${count}`;
    if (count === 0 || remainingMs == null) return label;

    const deadline = formatResetPassDeadline(remainingMs, ctx.t);
    const shown = remainingMs <= WARN_WITHIN_MS ? chalk.hex(ctx.theme.warn)(deadline) : deadline;
    return `${label} · ${shown}`;
  },
};
