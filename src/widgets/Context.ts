import type { Widget, RenderContext, WidgetConfig } from './types.js';
import { buildBar, fmtPct } from '../utils/bar.js';
import { formatTokens } from '../utils/tokens.js';

export const ContextWidget: Widget = {
  id: 'context',
  labelKey: 'widget.context',
  render(ctx: RenderContext, _cfg: WidgetConfig): string | null {
    const cw = ctx.stdin.context_window;
    const max = cw?.context_window_size ?? (ctx.stdin.exceeds_200k_tokens ? 1_000_000 : 200_000);

    const usage = cw?.current_usage;
    const currentUsageTokens =
      (usage?.input_tokens ?? 0) +
      (usage?.output_tokens ?? 0) +
      (usage?.cache_creation_input_tokens ?? 0) +
      (usage?.cache_read_input_tokens ?? 0);

    const totalTokens = (cw?.total_input_tokens ?? 0) + (cw?.total_output_tokens ?? 0);

    let used = currentUsageTokens || totalTokens;
    let pct: number;

    if (cw?.used_percentage != null) {
      pct = Math.round(cw.used_percentage);
      if (used === 0 && pct > 0 && max > 0) {
        used = Math.round((pct / 100) * max);
      }
    } else if (max > 0 && used > 0) {
      pct = Math.min(100, Math.round((used / max) * 100));
    } else {
      pct = 0;
    }

    if (!cw && !ctx.stdin.model && used === 0) {
      return `Ctx ${buildBar(0, '#22d3ee')} ${fmtPct(0)} ${'(-/-)'.padEnd(11)}`;
    }

    const tokenExpr = `(${formatTokens(used)}/${formatTokens(max)})`.padEnd(11);
    return `Ctx ${buildBar(pct, '#22d3ee')} ${fmtPct(pct)} ${tokenExpr}`;
  },
};
