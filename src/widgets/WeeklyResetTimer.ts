import type { Widget, RenderContext, WidgetConfig } from "./types.js";
import { getWeeklyReset } from "../data/reset.js";

export const WeeklyResetTimerWidget: Widget = {
  id: "weeklyReset",
  labelKey: "widget.weeklyReset",
  render(ctx: RenderContext, _cfg: WidgetConfig): string | null {
    const timer = getWeeklyReset(ctx.weeklyAnchorDay, ctx.now);
    return `↺ ${timer.label}`;
  },
};
