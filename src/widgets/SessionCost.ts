import type { Widget, RenderContext, WidgetConfig } from './types.js';

function formatCost(usd: number): string {
  if (usd >= 1) return `$${usd.toFixed(2)}`;
  if (usd >= 0.01) return `$${usd.toFixed(3)}`;
  return `$${usd.toFixed(4)}`;
}

export const SessionCostWidget: Widget = {
  id: 'sessionCost',
  labelKey: 'widget.sessionCost',
  render(ctx: RenderContext, _cfg: WidgetConfig): string | null {
    const cost = ctx.stdin.cost?.total_cost_usd;
    if (cost == null) return '$-';
    return formatCost(cost);
  },
};
