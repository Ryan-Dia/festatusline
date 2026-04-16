import type { Widget, RenderContext, WidgetConfig } from "./types.js";
import { getDailyReset } from "../data/reset.js";

export const DailyResetTimerWidget: Widget = {
  id: "dailyReset",
  labelKey: "widget.dailyReset",
  render(ctx: RenderContext, _cfg: WidgetConfig): string | null {
    const timer = getDailyReset(ctx.now);
    return `↺ ${timer.label}`;
  },
};
