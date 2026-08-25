import type { Widget, RenderContext, WidgetConfig } from './types.js';

// Claude Code reports GitLab merge requests through the same field with kind 'mr', so the
// widget follows each host's own sigil: #123 for a PR, !123 for an MR.
const MR_KIND = 'mr';

const REVIEW_GLYPHS: Record<string, string> = {
  approved: '✓',
  changes_requested: '✗',
  pending: '·',
  draft: '○',
};

export const PrStatusWidget: Widget = {
  id: 'pr',
  labelKey: 'widget.pr',
  render(ctx: RenderContext, _cfg: WidgetConfig): string | null {
    const { pr } = ctx.stdin;
    if (!pr || pr.number == null) return null;

    const isMergeRequest = pr.kind === MR_KIND;
    const head = isMergeRequest ? `MR !${pr.number}` : `PR #${pr.number}`;
    // review_state can be absent even when pr is present, and future states should not
    // render as an empty glyph gap.
    const glyph = pr.review_state ? REVIEW_GLYPHS[pr.review_state] : undefined;
    return glyph ? `${head} ${glyph}` : head;
  },
};
