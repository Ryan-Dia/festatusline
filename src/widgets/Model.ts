import type { Widget, RenderContext, WidgetConfig } from './types.js';

// Claude Code resolves effort to low | medium | high | xhigh | max. Anything else is a
// legacy value left in ~/.claude/settings.json by older releases; unmapped levels pass
// through as-is so new levels keep rendering without a code change.
const EFFORT_LABELS: Record<string, string> = {
  'max-tokens': 'max',
};

// Status line stdin gained `effort.level` in Claude Code 2.1.119. From that version on a
// missing `effort` means the model has no effort support rather than an old payload, so
// falling back to settings.json would print a level the session isn't running at.
const EFFORT_IN_STDIN_SINCE = [2, 1, 119];

function isAtLeast(version: string | undefined, min: number[]): boolean {
  if (!version) return false;
  const parts = version.split('.').map((part) => Number.parseInt(part, 10));
  if (parts.length < min.length || parts.some((part) => Number.isNaN(part))) return false;
  for (let i = 0; i < min.length; i += 1) {
    const part = parts[i] ?? 0;
    const floor = min[i] ?? 0;
    if (part !== floor) return part > floor;
  }
  return true;
}

/** Resolved effort from the statusline payload, falling back to the saved setting. */
export function effortLabel(
  ctx: Pick<RenderContext, 'stdin' | 'effortLevel' | 'ultracode'>,
): string | null {
  const fromStdin = ctx.stdin.effort?.level;
  const stale = isAtLeast(ctx.stdin.version, EFFORT_IN_STDIN_SINCE) ? undefined : ctx.effortLevel;
  const level = fromStdin ?? stale;
  if (!level || level === 'normal') return null;
  // Ultracode runs at xhigh, so the payload can't distinguish it on its own.
  if (ctx.ultracode && level === 'xhigh') return 'ultracode';
  return EFFORT_LABELS[level] ?? level;
}

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
      ctx.stdin.model?.display_name ?? ctx.stdin.model?.id ?? ctx.sessionLastModel ?? null;
    if (!rawName) return '?';

    const name = shortName(rawName);
    const label = effortLabel(ctx);
    return label ? `${name} [${label}]` : name;
  },
};
