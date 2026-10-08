import type { Widget, RenderContext, WidgetConfig } from './types.js';
import { padDisplay } from '../utils/width.js';
import { rowLabelWidth } from './columns.js';

export const CodexModelWidget: Widget = {
  id: 'codexModel',
  labelKey: 'widget.codexModel',
  render(ctx: RenderContext, _cfg: WidgetConfig): string | null {
    // A product name, so it stays English; padded to the row-label column it heads.
    return padDisplay('Codex', rowLabelWidth(ctx.t));
  },
};
