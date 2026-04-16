import type { Widget, RenderContext, WidgetConfig } from "./types.js";
import { getWeeklyReset } from "../data/reset.js";

export const SonnetWeeklyResetTimerWidget: Widget = {
  id: "sonnetWeeklyReset",
  labelKey: "widget.sonnetWeeklyReset",
  render(ctx: RenderContext, _cfg: WidgetConfig): string | null {
    const timer = getWeeklyReset(ctx.weeklyAnchorDay, ctx.now);
    return `S↺ ${timer.label}`;
  },
};
