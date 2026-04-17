import type { UsageEntry } from './jsonl.js';

export interface ClaudePeakInfo {
  isPeak: boolean;
  remainingMs: number;
}

/** Peak = UTC 12:00–18:00 (KST 21:00–03:00, PST 05:00–11:00) */
export function getClaudePeakInfo(now = Date.now()): ClaudePeakInfo {
  const d = new Date(now);
  const utcSecsOfDay = d.getUTCHours() * 3600 + d.getUTCMinutes() * 60 + d.getUTCSeconds();
  const utcMsOfDay = utcSecsOfDay * 1000 + d.getUTCMilliseconds();

  const peakStartMs = 12 * 3600 * 1000;
  const peakEndMs = 18 * 3600 * 1000;
  const dayMs = 24 * 3600 * 1000;

  const isPeak = utcMsOfDay >= peakStartMs && utcMsOfDay < peakEndMs;

  let remainingMs: number;
  if (isPeak) {
    remainingMs = peakEndMs - utcMsOfDay;
  } else if (utcMsOfDay < peakStartMs) {
    remainingMs = peakStartMs - utcMsOfDay;
  } else {
    remainingMs = dayMs - utcMsOfDay + peakStartMs;
  }

  return { isPeak, remainingMs };
}

export interface PeakTimeResult {
  hour: number;
  label: string;
  /** 12개 버킷 (2시간 단위), 값은 0–1 정규화 */
  buckets: number[];
}

export function computePeakTime(entries: UsageEntry[], windowDays = 14): PeakTimeResult | null {
  const cutoff = Date.now() - windowDays * 24 * 60 * 60 * 1000;
  const raw = new Array<number>(24).fill(0);

  for (const e of entries) {
    if (e.timestamp < cutoff) continue;
    const hour = new Date(e.timestamp).getHours();
    raw[hour] =
      (raw[hour] ?? 0) + e.inputTokens + e.outputTokens + e.cacheCreationTokens + e.cacheReadTokens;
  }

  let maxTokens = 0;
  let peakHour = 0;
  for (let h = 0; h < 24; h++) {
    if ((raw[h] ?? 0) > maxTokens) {
      maxTokens = raw[h] ?? 0;
      peakHour = h;
    }
  }

  if (maxTokens === 0) return null;

  const end = (peakHour + 1) % 24;
  const label = `${String(peakHour).padStart(2, '0')}:00–${String(end).padStart(2, '0')}:00`;

  const raw12 = new Array<number>(12).fill(0);
  for (let i = 0; i < 12; i++) {
    raw12[i] = (raw[i * 2] ?? 0) + (raw[i * 2 + 1] ?? 0);
  }
  const maxBucket = Math.max(...raw12);
  const buckets = raw12.map((v) => (maxBucket > 0 ? v / maxBucket : 0));

  return { hour: peakHour, label, buckets };
}
