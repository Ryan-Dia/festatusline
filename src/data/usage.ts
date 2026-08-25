import { loadAllEntries, type UsageEntry } from './jsonl.js';
import { createTtlCache } from './cache.js';
import { getTimeWindows } from './time.js';
import {
  emptyFamilyTotals,
  isFableModel,
  isSonnetModel,
  modelFamily,
  weightedCost,
  type ModelFamily,
} from './modelTier.js';

export interface UsageSnapshot {
  dailyTokens: number;
  weeklyTokens: number;
  sonnetWeeklyTokens: number;
  fableWeeklyTokens: number;
  // Relative spend, Claude Code's /usage weighting. Only comparable against each other,
  // so widgets present these as shares rather than absolute figures.
  weightedDaily: number;
  weightedWeekly: number;
  weightedWeeklyByFamily: Record<ModelFamily, number>;
  allEntries: UsageEntry[];
}

function totalTokens(e: UsageEntry): number {
  return e.inputTokens + e.outputTokens + e.cacheCreationTokens + e.cacheReadTokens;
}

const cache = createTtlCache<UsageSnapshot>(30_000);

export async function getUsageSnapshot(): Promise<UsageSnapshot> {
  return cache.get(async () => {
    const entries = await loadAllEntries();
    const { todayStartMs, weekStartMs } = getTimeWindows();

    let dailyTokens = 0;
    let weeklyTokens = 0;
    let sonnetWeeklyTokens = 0;
    let fableWeeklyTokens = 0;
    let weightedDaily = 0;
    let weightedWeekly = 0;
    const weightedWeeklyByFamily = emptyFamilyTotals();

    for (const e of entries) {
      const total = totalTokens(e);
      const weighted = weightedCost(e);
      if (e.timestamp >= todayStartMs) {
        dailyTokens += total;
        weightedDaily += weighted;
      }
      if (e.timestamp >= weekStartMs) {
        weeklyTokens += total;
        weightedWeekly += weighted;
        weightedWeeklyByFamily[modelFamily(e.model)] += weighted;
        if (isSonnetModel(e.model)) sonnetWeeklyTokens += total;
        if (isFableModel(e.model)) fableWeeklyTokens += total;
      }
    }

    return {
      dailyTokens,
      weeklyTokens,
      sonnetWeeklyTokens,
      fableWeeklyTokens,
      weightedDaily,
      weightedWeekly,
      weightedWeeklyByFamily,
      allEntries: entries,
    };
  });
}
