import type { Widget, RenderContext, WidgetConfig } from './types.js';

export const CodexModelWidget: Widget = {
  id: 'codexModel',
  labelKey: 'widget.codexModel',
  render(ctx: RenderContext, _cfg: WidgetConfig): string | null {
    if (!ctx.codex?.available) return null;
    return 'Codex  ';
  },
};
