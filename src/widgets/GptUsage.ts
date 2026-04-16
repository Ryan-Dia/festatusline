import type { Widget, RenderContext, WidgetConfig } from "./types.js";

export const GptUsageWidget: Widget = {
  id: "gptUsage",
  labelKey: "widget.gptUsage",
  render(ctx: RenderContext, _cfg: WidgetConfig): string | null {
    if (!ctx.codex?.available) return null;
    return `GPT:${ctx.codex.dailyRequests}req`;
  },
};
