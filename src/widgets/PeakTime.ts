import type { Widget, RenderContext, WidgetConfig } from "./types.js";
import { computePeakTime } from "../data/peak-time.js";

export const PeakTimeWidget: Widget = {
  id: "peakTime",
  labelKey: "widget.peakTime",
  render(ctx: RenderContext, _cfg: WidgetConfig): string | null {
    if (!ctx.usage) return null;
    const result = computePeakTime(ctx.usage.allEntries);
    if (!result) return ctx.t("peak.none");
    return result.label;
  },
};
