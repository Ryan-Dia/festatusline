import chalk from 'chalk';

export const BAR_WIDTH = 10;

// Bars that warn — context and the 5-hour session — switch bar and percent to this red at
// ALERT_PERCENT. A fixed red rather than theme.danger: the default theme's danger is a pink
// too close to the Fable bar to read as a warning beside it.
export const ALERT_COLOR = '#ff5555';
export const ALERT_PERCENT = 80;

const DIM_FACTOR = 0.35;

function dimColor(hex: string): string {
  const r = Math.round(parseInt(hex.slice(1, 3), 16) * DIM_FACTOR)
    .toString(16)
    .padStart(2, '0');
  const g = Math.round(parseInt(hex.slice(3, 5), 16) * DIM_FACTOR)
    .toString(16)
    .padStart(2, '0');
  const b = Math.round(parseInt(hex.slice(5, 7), 16) * DIM_FACTOR)
    .toString(16)
    .padStart(2, '0');
  return `#${r}${g}${b}`;
}

export function buildBar(pct: number, color: string, width: number = BAR_WIDTH): string {
  const clamped = Math.max(0, Math.min(100, pct));
  const filled = Math.round((clamped / 100) * width);
  const filledStr = chalk.hex(color)('■'.repeat(filled));
  const emptyStr = chalk.hex(dimColor(color))('■'.repeat(width - filled));
  return filledStr + emptyStr;
}

export function fmtPct(pct: number): string {
  return `${String(pct).padStart(3)}%`;
}

/** Bar plus percent, both in ALERT_COLOR once `alertAt` is set and reached. */
export function barWithPct(pct: number, color: string, alertAt?: number): string {
  if (alertAt == null || pct < alertAt) return `${buildBar(pct, color)} ${fmtPct(pct)}`;
  return `${buildBar(pct, ALERT_COLOR)} ${chalk.hex(ALERT_COLOR)(fmtPct(pct))}`;
}
