import type { Widget, RenderContext, WidgetConfig } from './types.js';
import { buildBar, fmtPct } from '../utils/bar.js';
import { formatTokens } from '../utils/tokens.js';

export const ContextWidget: Widget = {
  id: 'context',
  labelKey: 'widget.context',
  render(ctx: RenderContext, _cfg: WidgetConfig): string | null {
    const cw = ctx.stdin.context_window;
    if (!cw?.context_window_size)
      return `Ctx ${buildBar(0, '#22d3ee')} ${fmtPct(0)} ${'(-/-)'.padEnd(11)}`;

    const usage = cw.current_usage;
    const used =
      (usage?.input_tokens ?? 0) +
      (usage?.output_tokens ?? 0) +
      (usage?.cache_creation_input_tokens ?? 0) +
      (usage?.cache_read_input_tokens ?? 0);
    const max = cw.context_window_size;
    const pct = Math.round(cw.used_percentage ?? Math.min(100, (used / max) * 100));

    const tokenExpr = `(${formatTokens(used)}/${formatTokens(max)})`.padEnd(11);
    return `Ctx ${buildBar(pct, '#22d3ee')} ${fmtPct(pct)} ${tokenExpr}`;
  },
};
