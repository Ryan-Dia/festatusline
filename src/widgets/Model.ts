import type { Widget, RenderContext, WidgetConfig } from './types.js';

const EFFORT_LABELS: Record<string, string> = {
  low: 'low',
  normal: 'normal',
  high: 'high',
  'max-tokens': 'max',
};

/** "Claude Sonnet 4.6" → "Sonnet 4.6", "claude-sonnet-4-6" → "Sonnet 4.6" */
export function shortName(raw: string): string {
  // Strip "Claude " prefix from display names
  const stripped = raw.replace(/^Claude\s+/i, '');
  if (stripped !== raw) return stripped;

  // Format model IDs: claude-sonnet-4-6 → Sonnet 4.6
  const withoutPrefix = raw.replace(/^claude-/i, '');
  const match = withoutPrefix.match(/^([a-z]+(?:-[a-z]+)*)-(\d+)-(\d+)(?:-\d+)*$/i);
  if (match) {
    const name = match[1]!.replace(/-/g, ' ');
    return `${name.charAt(0).toUpperCase()}${name.slice(1)} ${match[2]}.${match[3]}`;
  }
  return withoutPrefix;
}

export const ModelWidget: Widget = {
  id: 'model',
  labelKey: 'widget.model',
  render(ctx: RenderContext, _cfg: WidgetConfig): string | null {
    const rawName =
      ctx.stdin.model?.display_name ?? ctx.stdin.model?.id ?? ctx.usage?.lastModel ?? null;
    if (!rawName) return '?';

    const name = shortName(rawName);
    const effort = ctx.effortLevel;
    if (effort && effort !== 'normal') {
      const label = EFFORT_LABELS[effort] ?? effort;
      return `${name} [${label}]`;
    }
    return name;
  },
};
