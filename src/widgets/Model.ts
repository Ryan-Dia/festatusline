import type { Widget, RenderContext, WidgetConfig } from './types.js';

// Claude Code resolves effort to low | medium | high | xhigh | max. Anything else is a
// legacy value from an older release; unmapped levels pass through as-is so new levels
// keep rendering without a code change.
const EFFORT_LABELS: Record<string, string> = {
  'max-tokens': 'max',
};

/**
 * Resolved effort for this session.
 *
 * Both sources carry the same value: Claude Code puts the resolved level on the payload as
 * `effort.level` and, for that very same spawn, exports it as CLAUDE_EFFORT. So the env var
 * is not a second opinion — it is a backstop for a payload we failed to parse, and it is
 * absent exactly when the payload's `effort` is (a model with no effort support).
 *
 * Deliberately *not* a source: `effortLevel` in ~/.claude/settings.json. It records neither
 * the session-only levels nor mid-session `/effort` changes, and it ignores the per-model
 * `modelSettings` override — so it reports a level the session is not running at.
 */
export function effortLabel(
  ctx: Pick<RenderContext, 'stdin' | 'envEffortLevel' | 'ultracode'>,
): string | null {
  const level = ctx.stdin.effort?.level ?? ctx.envEffortLevel;
  if (!level || level === 'normal') return null;
  // Ultracode is not a distinct level — it reports as xhigh on every channel Claude Code
  // exposes, so only a settings file that pins `ultracode` can tell the two apart.
  if (ctx.ultracode && level === 'xhigh') return 'ultracode';
  return EFFORT_LABELS[level] ?? level;
}

// name, major version, then an optional minor and any trailing date snapshot. The minor
// is optional because the current generation dropped it: claude-opus-5, claude-sonnet-5.
const MODEL_ID_RE = /^([a-z]+(?:-[a-z]+)*)-(\d+)(?:-(\d+))?(?:-\d+)*$/i;

/**
 * "Claude Sonnet 4.6" → "Sonnet 4.6", "claude-sonnet-4-6" → "Sonnet 4.6",
 * "claude-opus-5" → "Opus 5".
 */
export function shortName(raw: string): string {
  // Strip "Claude " prefix from display names
  const stripped = raw.replace(/^Claude\s+/i, '');
  if (stripped !== raw) return stripped;

  const withoutPrefix = raw.replace(/^claude-/i, '');
  const match = withoutPrefix.match(MODEL_ID_RE);
  if (match) {
    const name = match[1]!.replace(/-/g, ' ');
    const version = match[3] ? `${match[2]}.${match[3]}` : match[2];
    return `${name.charAt(0).toUpperCase()}${name.slice(1)} ${version}`;
  }
  return withoutPrefix;
}

/**
 * Session flags worth showing next to the model name because they change how it behaves:
 * the resolved effort, fast mode, and thinking being switched off. `thinking.enabled` is
 * true unless explicitly disabled, so only the `false` case is surfaced.
 */
function modelFlags(ctx: RenderContext): string[] {
  const flags: string[] = [];
  const effort = effortLabel(ctx);
  if (effort) flags.push(effort);
  if (ctx.stdin.fast_mode === true) flags.push('fast');
  if (ctx.stdin.thinking?.enabled === false) flags.push('no-think');
  return flags;
}

export const ModelWidget: Widget = {
  id: 'model',
  labelKey: 'widget.model',
  render(ctx: RenderContext, _cfg: WidgetConfig): string | null {
    const rawName =
      ctx.stdin.model?.display_name ?? ctx.stdin.model?.id ?? ctx.sessionLastModel ?? null;
    if (!rawName) return '?';

    const name = shortName(rawName);
    const flags = modelFlags(ctx);
    return flags.length > 0 ? `${name} [${flags.join(', ')}]` : name;
  },
};
