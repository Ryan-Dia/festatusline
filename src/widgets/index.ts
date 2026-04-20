import type { Widget } from './types.js';
import { ModelWidget } from './Model.js';
import { ContextWidget } from './Context.js';
import { PeakTimeWidget } from './PeakTime.js';
import { DailyUsageWidget } from './DailyUsage.js';
import { DailyResetTimerWidget } from './DailyResetTimer.js';
import { WeeklyUsageWidget } from './WeeklyUsage.js';
import { WeeklyResetTimerWidget } from './WeeklyResetTimer.js';
import { SonnetWeeklyUsageWidget } from './SonnetWeeklyUsage.js';
import { SonnetWeeklyResetTimerWidget } from './SonnetWeeklyResetTimer.js';
import { GptUsageWidget } from './GptUsage.js';
import { RateLimitWidget, WeeklyRateLimitWidget } from './RateLimit.js';
import { ClaudePeakWidget } from './ClaudePeak.js';
import { CodexRateLimitWidget, CodexWeeklyRateLimitWidget } from './CodexRateLimit.js';
import { SpacerWidget } from './Spacer.js';
import { CodexModelWidget } from './CodexModel.js';
import { SessionCostWidget } from './SessionCost.js';
import { CacheHitWidget } from './CacheHit.js';
import { CacheTtlWidget } from './CacheTtl.js';
import { GitBranchWidget, GitRepoWidget } from './GitInfo.js';

export const ALL_WIDGETS: Widget[] = [
  ModelWidget,
  ContextWidget,
  RateLimitWidget,
  WeeklyRateLimitWidget,
  PeakTimeWidget,
  DailyUsageWidget,
  DailyResetTimerWidget,
  WeeklyUsageWidget,
  WeeklyResetTimerWidget,
  SonnetWeeklyUsageWidget,
  SonnetWeeklyResetTimerWidget,
  GptUsageWidget,
  ClaudePeakWidget,
  CodexRateLimitWidget,
  CodexWeeklyRateLimitWidget,
  SpacerWidget,
  CodexModelWidget,
  SessionCostWidget,
  CacheHitWidget,
  CacheTtlWidget,
  GitBranchWidget,
  GitRepoWidget,
];

const registry = new Map<string, Widget>(ALL_WIDGETS.map((w) => [w.id, w]));

export function getWidget(id: string): Widget | undefined {
  return registry.get(id);
}

export type { Widget, RenderContext, WidgetConfig } from './types.js';
