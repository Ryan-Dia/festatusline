import type { Widget, RenderContext, WidgetConfig } from "./types.js";

function fmtTokens(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}k`;
  return String(n);
}

export const WeeklyUsageWidget: Widget = {
  id: "weeklyUsage",
  labelKey: "widget.weeklyUsage",
  render(ctx: RenderContext, _cfg: WidgetConfig): string | null {
    if (!ctx.usage) return null;
    return fmtTokens(ctx.usage.weeklyTokens);
  },
};
