import { loadAllEntries, type UsageEntry } from './jsonl.js';

export interface UsageSnapshot {
  dailyTokens: number;
  weeklyTokens: number;
  sonnetWeeklyTokens: number;
  allEntries: UsageEntry[];
  lastModel: string | null;
}

function totalTokens(e: UsageEntry): number {
  return e.inputTokens + e.outputTokens + e.cacheCreationTokens + e.cacheReadTokens;
}

function isSonnet(model: string): boolean {
  return /sonnet/i.test(model);
}

let cached: { snapshot: UsageSnapshot; loadedAt: number } | null = null;
const CACHE_TTL_MS = 30_000;

export async function getUsageSnapshot(): Promise<UsageSnapshot> {
  const now = Date.now();
  if (cached && now - cached.loadedAt < CACHE_TTL_MS) {
    return cached.snapshot;
  }

  const entries = await loadAllEntries();
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todayStartMs = todayStart.getTime();
  const weekStartMs = now - 7 * 24 * 60 * 60 * 1000;

  let dailyTokens = 0;
  let weeklyTokens = 0;
  let sonnetWeeklyTokens = 0;
  let lastModel: string | null = null;
  let lastTimestamp = 0;

  for (const e of entries) {
    const total = totalTokens(e);
    if (e.timestamp >= todayStartMs) dailyTokens += total;
    if (e.timestamp >= weekStartMs) {
      weeklyTokens += total;
      if (isSonnet(e.model)) sonnetWeeklyTokens += total;
    }
    if (e.model && e.timestamp > lastTimestamp) {
      lastTimestamp = e.timestamp;
      lastModel = e.model;
    }
  }

  const snapshot: UsageSnapshot = {
    dailyTokens,
    weeklyTokens,
    sonnetWeeklyTokens,
    allEntries: entries,
    lastModel,
  };
  cached = { snapshot, loadedAt: now };
  return snapshot;
}
