import type { Widget, RenderContext, WidgetConfig } from './types.js';

/**
 * Standalone counterpart to the `fast` flag the model widget appends, for setups that
 * place the indicator on its own row. Renders nothing while fast mode is off.
 */
export const FastModeWidget: Widget = {
  id: 'fastMode',
  labelKey: 'widget.fastMode',
  render(ctx: RenderContext, _cfg: WidgetConfig): string | null {
    return ctx.stdin.fast_mode === true ? '»fast' : null;
  },
};
