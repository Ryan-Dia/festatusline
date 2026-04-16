import type { Widget, RenderContext, WidgetConfig } from "./types.js";

function buildBar(pct: number, width = 8): string {
  const filled = Math.round((pct / 100) * width);
  return "█".repeat(filled) + "░".repeat(width - filled);
}

export const ContextWidget: Widget = {
  id: "context",
  labelKey: "widget.context",
  render(ctx: RenderContext, _cfg: WidgetConfig): string | null {
    const inputTokens = ctx.stdin.usage?.input_tokens ?? 0;
    const cacheRead = ctx.stdin.usage?.cache_read_input_tokens ?? 0;
    const cacheCreate = ctx.stdin.usage?.cache_creation_input_tokens ?? 0;
    const used = inputTokens + cacheRead + cacheCreate;
    const max = ctx.stdin.model?.context_window;
    if (!max || used === 0) return null;
    const pct = Math.min(100, Math.round((used / max) * 100));
    const bar = buildBar(pct);
    return `${bar} ${pct}%`;
  },
};
