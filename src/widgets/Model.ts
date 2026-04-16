import type { Widget, RenderContext, WidgetConfig } from "./types.js";

export const ModelWidget: Widget = {
  id: "model",
  labelKey: "widget.model",
  render(ctx: RenderContext, _cfg: WidgetConfig): string | null {
    const name =
      ctx.stdin.model?.display_name ??
      ctx.stdin.model?.id ??
      null;
    if (!name) return null;
    return name;
  },
};
