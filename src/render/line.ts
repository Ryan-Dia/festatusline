import chalk from 'chalk';
import type { RenderContext } from '../widgets/types.js';
import { getWidget } from '../widgets/index.js';
import type { WidgetCfg } from '../config/schema.js';

export function renderLine(
  widgetCfgs: WidgetCfg[],
  ctx: RenderContext,
  separator: string,
): string {
  const parts: string[] = [];

  for (const cfg of widgetCfgs) {
    const widget = getWidget(cfg.id);
    if (!widget) continue;
    const text = widget.render(ctx, cfg);
    if (!text) continue;
    const color = cfg.color ?? ctx.theme.accent;
    parts.push(chalk.hex(color)(text));
  }

  const sep = chalk.hex(ctx.theme.muted)(separator);
  return parts.join(sep);
}

export function renderAllLines(
  lines: WidgetCfg[][],
  ctx: RenderContext,
  separator: string,
): string {
  return lines
    .map((line) => renderLine(line, ctx, separator))
    .filter(Boolean)
    .join('\n');
}
