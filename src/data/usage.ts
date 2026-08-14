import { loadAllEntries, type UsageEntry } from './jsonl.js';
import { createTtlCache } from './cache.js';
import { getTimeWindows } from './time.js';

export interface UsageSnapshot {
  dailyTokens: number;
  weeklyTokens: number;
  sonnetWeeklyTokens: number;
  allEntries: UsageEntry[];
}

function totalTokens(e: UsageEntry): number {
  return e.inputTokens + e.outputTokens + e.cacheCreationTokens + e.cacheReadTokens;
}

function isSonnet(model: string): boolean {
  return /sonnet/i.test(model);
}

const cache = createTtlCache<UsageSnapshot>(30_000);

export async function getUsageSnapshot(): Promise<UsageSnapshot> {
  return cache.get(async () => {
    const entries = await loadAllEntries();
    const { todayStartMs, weekStartMs } = getTimeWindows();

    let dailyTokens = 0;
    let weeklyTokens = 0;
    let sonnetWeeklyTokens = 0;

    for (const e of entries) {
      const total = totalTokens(e);
      if (e.timestamp >= todayStartMs) dailyTokens += total;
      if (e.timestamp >= weekStartMs) {
        weeklyTokens += total;
        if (isSonnet(e.model)) sonnetWeeklyTokens += total;
      }
    }

    return { dailyTokens, weeklyTokens, sonnetWeeklyTokens, allEntries: entries };
  });
}
