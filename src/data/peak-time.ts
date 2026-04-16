import type { UsageEntry } from "./jsonl.js";

export interface PeakTimeResult {
  hour: number;
  label: string;
}

export function computePeakTime(
  entries: UsageEntry[],
  windowDays = 14
): PeakTimeResult | null {
  const cutoff = Date.now() - windowDays * 24 * 60 * 60 * 1000;
  const buckets = new Array<number>(24).fill(0);

  for (const e of entries) {
    if (e.timestamp < cutoff) continue;
    const hour = new Date(e.timestamp).getHours();
    buckets[hour] =
      (buckets[hour] ?? 0) +
      e.inputTokens +
      e.outputTokens +
      e.cacheCreationTokens +
      e.cacheReadTokens;
  }

  let maxTokens = 0;
  let peakHour = 0;
  for (let h = 0; h < 24; h++) {
    if ((buckets[h] ?? 0) > maxTokens) {
      maxTokens = buckets[h] ?? 0;
      peakHour = h;
    }
  }

  if (maxTokens === 0) return null;

  const end = (peakHour + 1) % 24;
  const label = `${String(peakHour).padStart(2, "0")}:00–${String(end).padStart(2, "0")}:00`;
  return { hour: peakHour, label };
}
