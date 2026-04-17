import type { Widget, RenderContext, WidgetConfig } from './types.js';
import type { ResetTimer } from '../data/reset.js';
import type { I18nKey } from '../i18n/index.js';

interface ResetTimerParams {
  id: string;
  labelKey: I18nKey;
  prefix: string;
  getTimer: (ctx: RenderContext) => ResetTimer;
}

export function createResetTimerWidget(params: ResetTimerParams): Widget {
  const { id, labelKey, prefix, getTimer } = params;
  return {
    id,
    labelKey,
    render(ctx: RenderContext, _cfg: WidgetConfig): string | null {
      const timer = getTimer(ctx);
      return `${prefix} ${timer.label}`;
    },
  };
}
