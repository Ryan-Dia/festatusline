import type { Widget, RenderContext, WidgetConfig } from './types.js';

export const CacheHitWidget: Widget = {
  id: 'cacheHit',
  labelKey: 'widget.cacheHit',
  render(ctx: RenderContext, _cfg: WidgetConfig): string | null {
    const usage = ctx.stdin.context_window?.current_usage;
    if (!usage) return null;
    const cached = usage.cache_read_input_tokens ?? 0;
    const input = usage.input_tokens ?? 0;
    const denom = input + cached;
    if (denom === 0) return null;
    const pct = Math.round((cached / denom) * 100);
    return `⚡${pct}%`;
  },
};
