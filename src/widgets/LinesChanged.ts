import type { Widget, RenderContext, WidgetConfig } from './types.js';

export const LinesChangedWidget: Widget = {
  id: 'linesChanged',
  labelKey: 'widget.linesChanged',
  render(ctx: RenderContext, _cfg: WidgetConfig): string | null {
    const added = ctx.stdin.cost?.total_lines_added ?? 0;
    const removed = ctx.stdin.cost?.total_lines_removed ?? 0;
    // Both zero means nothing has been edited yet this session, not missing data.
    if (added === 0 && removed === 0) return null;
    return `+${added}/-${removed}`;
  },
};
