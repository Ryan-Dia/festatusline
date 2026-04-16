import type { Widget } from "./types.js";
import { ModelWidget } from "./Model.js";
import { ContextWidget } from "./Context.js";
import { PeakTimeWidget } from "./PeakTime.js";
import { DailyUsageWidget } from "./DailyUsage.js";
import { DailyResetTimerWidget } from "./DailyResetTimer.js";
import { WeeklyUsageWidget } from "./WeeklyUsage.js";
import { WeeklyResetTimerWidget } from "./WeeklyResetTimer.js";
import { SonnetWeeklyUsageWidget } from "./SonnetWeeklyUsage.js";
import { SonnetWeeklyResetTimerWidget } from "./SonnetWeeklyResetTimer.js";
import { GptUsageWidget } from "./GptUsage.js";

export const ALL_WIDGETS: Widget[] = [
  ModelWidget,
  ContextWidget,
  PeakTimeWidget,
  DailyUsageWidget,
  DailyResetTimerWidget,
  WeeklyUsageWidget,
  WeeklyResetTimerWidget,
  SonnetWeeklyUsageWidget,
  SonnetWeeklyResetTimerWidget,
  GptUsageWidget,
];

const registry = new Map<string, Widget>(ALL_WIDGETS.map((w) => [w.id, w]));

export function getWidget(id: string): Widget | undefined {
  return registry.get(id);
}

export type { Widget, RenderContext, WidgetConfig } from "./types.js";
