export function formatTokens(n: number): string {
  if (!Number.isFinite(n) || n <= 0) return '0';
  if (n >= 999_500) {
    const m = n / 1_000_000;
    const formatted = m.toFixed(1);
    return formatted.endsWith('.0') ? `${Math.round(m)}M` : `${formatted}M`;
  }
  if (n >= 995) {
    return `${Math.round(n / 1_000)}K`;
  }
  return String(Math.round(n));
}
