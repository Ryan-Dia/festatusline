import type { ClaudeStdin } from '../data/stdin.js';
import type { UsageSnapshot } from '../data/usage.js';
import type { CodexSnapshot } from '../data/codex.js';
import type { Theme } from '../theme/index.js';
import type { I18nKey } from '../i18n/index.js';

export interface RenderContext {
  stdin: ClaudeStdin;
  usage: UsageSnapshot | null;
  codex: CodexSnapshot | null;
  theme: Theme;
  t: (key: I18nKey) => string;
  now: Date;
  weeklyAnchorDay: number | null;
  effortLevel?: string;
  cacheTtlCreatedAt: number | null;
  cacheTtlMs: number;
}

export interface WidgetConfig {
  color?: string;
}

export interface Widget {
  id: string;
  labelKey: I18nKey;
  render(ctx: RenderContext, cfg: WidgetConfig): string | null;
}
