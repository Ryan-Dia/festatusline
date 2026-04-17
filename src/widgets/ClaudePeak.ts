import chalk from 'chalk';
import type { Widget, RenderContext, WidgetConfig } from './types.js';
import { getClaudePeakInfo } from '../data/peak-time.js';
import { formatRemainingHM } from '../utils/duration.js';

const COLOR_PEAK = '#ff4d4d';
const COLOR_OFFPEAK = '#4dff6e';

export const ClaudePeakWidget: Widget = {
  id: 'claudePeak',
  labelKey: 'widget.claudePeak',
  render(_ctx: RenderContext, _cfg: WidgetConfig): string | null {
    const { isPeak, remainingMs } = getClaudePeakInfo();
    const dot = isPeak ? '🔴' : '🟢';
    const status = chalk.hex(isPeak ? COLOR_PEAK : COLOR_OFFPEAK)(isPeak ? 'Peak' : 'Off-Peak');
    return `${dot} ${status} (${formatRemainingHM(remainingMs)})`;
  },
};
