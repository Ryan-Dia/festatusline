// Code point ranges a terminal draws two cells wide: Hangul, CJK, kana, fullwidth forms, and
// the emoji blocks the widgets use. Enough for the labels festatusline renders; not a full
// East Asian Width table.
const WIDE_RANGES: [number, number][] = [
  [0x1100, 0x115f],
  [0x2e80, 0x303e],
  [0x3041, 0x33ff],
  [0x3400, 0x4dbf],
  [0x4e00, 0x9fff],
  [0xa000, 0xa4cf],
  [0xac00, 0xd7a3],
  [0xf900, 0xfaff],
  [0xfe30, 0xfe4f],
  [0xff00, 0xff60],
  [0xffe0, 0xffe6],
  [0x1f300, 0x1f64f],
  [0x1f900, 0x1f9ff],
  [0x20000, 0x3fffd],
];

function isWide(codePoint: number): boolean {
  return WIDE_RANGES.some(([lo, hi]) => codePoint >= lo && codePoint <= hi);
}

/** Terminal cells `text` occupies. `String#padEnd` counts code units, which misaligns CJK. */
export function displayWidth(text: string): number {
  return [...text].reduce((sum, ch) => sum + (isWide(ch.codePointAt(0) ?? 0) ? 2 : 1), 0);
}

export function padDisplay(text: string, width: number): string {
  return text + ' '.repeat(Math.max(0, width - displayWidth(text)));
}
