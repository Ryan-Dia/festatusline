import type { Widget } from './types.js';
import { ModelWidget } from './Model.js';
import { ContextWidget } from './Context.js';
import { DailyUsageWidget } from './DailyUsage.js';
import { DailyResetTimerWidget } from './DailyResetTimer.js';
import { WeeklyUsageWidget } from './WeeklyUsage.js';
import { WeeklyResetTimerWidget } from './WeeklyResetTimer.js';
import { SonnetWeeklyUsageWidget } from './SonnetWeeklyUsage.js';
import { SonnetWeeklyResetTimerWidget } from './SonnetWeeklyResetTimer.js';
import { FableWeeklyUsageWidget } from './FableWeeklyUsage.js';
import { FableWeeklyResetTimerWidget } from './FableWeeklyResetTimer.js';
import { FableWeeklyRateLimitWidget } from './FableRateLimit.js';
import { GptUsageWidget } from './GptUsage.js';
import { SessionRateLimitWidget, WeeklyRateLimitWidget } from './RateLimit.js';
import { CodexWeeklyRateLimitWidget } from './CodexRateLimit.js';
import { SpacerWidget } from './Spacer.js';
import { CodexModelWidget } from './CodexModel.js';
import { SessionCostWidget } from './SessionCost.js';
import { CacheHitWidget } from './CacheHit.js';
import { CacheTtlWidget } from './CacheTtl.js';
import { GitBranchWidget, GitRepoWidget } from './GitInfo.js';

import { ModelMixWidget } from './ModelMix.js';
import { PrStatusWidget } from './PrStatus.js';
import { FastModeWidget } from './FastMode.js';
import { LinesChangedWidget } from './LinesChanged.js';

export const ALL_WIDGETS: Widget[] = [
  ModelWidget,
  ContextWidget,
  SessionRateLimitWidget,
  WeeklyRateLimitWidget,
  DailyUsageWidget,
  DailyResetTimerWidget,
  WeeklyUsageWidget,
  WeeklyResetTimerWidget,
  SonnetWeeklyUsageWidget,
  SonnetWeeklyResetTimerWidget,
  FableWeeklyUsageWidget,
  FableWeeklyResetTimerWidget,
  FableWeeklyRateLimitWidget,
  ModelMixWidget,
  GptUsageWidget,
  CodexWeeklyRateLimitWidget,
  SpacerWidget,
  CodexModelWidget,
  SessionCostWidget,
  CacheHitWidget,
  CacheTtlWidget,
  GitBranchWidget,
  GitRepoWidget,
  PrStatusWidget,
  FastModeWidget,
  LinesChangedWidget,
];

const registry = new Map<string, Widget>(ALL_WIDGETS.map((w) => [w.id, w]));

export function getWidget(id: string): Widget | undefined {
  return registry.get(id);
}

export type { Widget, RenderContext, WidgetConfig } from './types.js';
