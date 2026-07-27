import type { Widget, RenderContext, WidgetConfig } from './types.js';

export const CodexModelWidget: Widget = {
  id: 'codexModel',
  labelKey: 'widget.codexModel',
  render(ctx: RenderContext, _cfg: WidgetConfig): string | null {
    if (!ctx.codex?.available) return null;
    const name = ctx.codex.model ?? 'Codex';
    return `Codex ${name.slice(0, 7).padEnd(7)}`;
  },
};
