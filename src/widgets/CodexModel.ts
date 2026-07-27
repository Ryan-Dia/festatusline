import type { Widget, RenderContext, WidgetConfig } from './types.js';

export const CodexModelWidget: Widget = {
  id: 'codexModel',
  labelKey: 'widget.codexModel',
  render(_ctx: RenderContext, _cfg: WidgetConfig): string | null {
    return 'Codex  ';
  },
};
