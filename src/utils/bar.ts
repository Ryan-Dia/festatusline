import chalk from 'chalk';

export const BAR_WIDTH = 10;

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
