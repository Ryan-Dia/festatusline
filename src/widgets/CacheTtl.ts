import type { Widget, RenderContext, WidgetConfig } from './types.js';
import { formatRemainingHM } from '../utils/duration.js';

export const CacheTtlWidget: Widget = {
  id: 'cacheTtl',
  labelKey: 'widget.cacheTtl',
  render(ctx: RenderContext, _cfg: WidgetConfig): string | null {
    if (ctx.cacheTtlCreatedAt == null) return null;
    const remaining = ctx.cacheTtlCreatedAt + ctx.cacheTtlMs - ctx.now.getTime();
    if (remaining <= 0) return null;
    return `⏱ ${formatRemainingHM(remaining)}`;
  },
};
