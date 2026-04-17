import type { Widget, RenderContext, WidgetConfig } from './types.js';

const EFFORT_LABELS: Record<string, string> = {
  low: 'low',
  normal: 'normal',
  high: 'high',
  'max-tokens': 'max',
};

export const ModelWidget: Widget = {
  id: 'model',
  labelKey: 'widget.model',
  render(ctx: RenderContext, _cfg: WidgetConfig): string | null {
    const name = ctx.stdin.model?.display_name ?? ctx.stdin.model?.id ?? null;
    if (!name) return '?';
    const effort = ctx.effortLevel;
    if (effort && effort !== 'normal') {
      const label = EFFORT_LABELS[effort] ?? effort;
      return `${name} [${label}]`;
    }
    return name;
  },
};
