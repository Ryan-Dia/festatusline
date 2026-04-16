import { loadAllEntries, type UsageEntry } from "./jsonl.js";

export interface UsageSnapshot {
  dailyTokens: number;
  dailyCost: number;
  weeklyTokens: number;
  weeklyCost: number;
  sonnetWeeklyTokens: number;
  sonnetWeeklyCost: number;
  allEntries: UsageEntry[];
}

const TOKEN_COST_PER_M_INPUT = 3.0;
const TOKEN_COST_PER_M_OUTPUT = 15.0;

function entryToCost(e: UsageEntry): number {
  return (
    (e.inputTokens / 1_000_000) * TOKEN_COST_PER_M_INPUT +
    (e.outputTokens / 1_000_000) * TOKEN_COST_PER_M_OUTPUT
  );
}

function totalTokens(e: UsageEntry): number {
  return e.inputTokens + e.outputTokens + e.cacheCreationTokens + e.cacheReadTokens;
}

function isSonnet(model: string): boolean {
  return /claude-(3-5-sonnet|sonnet)/i.test(model);
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
  const weekStart = new Date(now - 7 * 24 * 60 * 60 * 1000);

  let dailyTokens = 0;
  let dailyCost = 0;
  let weeklyTokens = 0;
  let weeklyCost = 0;
  let sonnetWeeklyTokens = 0;
  let sonnetWeeklyCost = 0;

  for (const e of entries) {
    if (e.timestamp >= todayStart.getTime()) {
      dailyTokens += totalTokens(e);
      dailyCost += entryToCost(e);
    }
    if (e.timestamp >= weekStart.getTime()) {
      weeklyTokens += totalTokens(e);
      weeklyCost += entryToCost(e);
      if (isSonnet(e.model)) {
        sonnetWeeklyTokens += totalTokens(e);
        sonnetWeeklyCost += entryToCost(e);
      }
    }
  }

  const snapshot: UsageSnapshot = {
    dailyTokens,
    dailyCost,
    weeklyTokens,
    weeklyCost,
    sonnetWeeklyTokens,
    sonnetWeeklyCost,
    allEntries: entries,
  };
  cached = { snapshot, loadedAt: now };
  return snapshot;
}
