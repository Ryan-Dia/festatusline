import chalk from 'chalk';
import type { Widget, RenderContext, WidgetConfig } from './types.js';
import { getClaudePeakInfo } from '../data/peak-time.js';

const COLOR_PEAK = '#ff4d4d';
const COLOR_OFFPEAK = '#4dff6e';

function formatRemaining(ms: number): string {
  const totalMins = Math.max(1, Math.ceil(ms / 60000));
  const h = Math.floor(totalMins / 60);
  const m = totalMins % 60;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

export const ClaudePeakWidget: Widget = {
  id: 'claudePeak',
  labelKey: 'widget.claudePeak',
  render(_ctx: RenderContext, _cfg: WidgetConfig): string | null {
    const { isPeak, remainingMs } = getClaudePeakInfo();
    const dot = isPeak ? '🔴' : '🟢';
    const status = chalk.hex(isPeak ? COLOR_PEAK : COLOR_OFFPEAK)(isPeak ? 'Peak' : 'Off-Peak');
    const time = formatRemaining(remainingMs);
    return `${dot} ${status} (${time})`;
  },
};
