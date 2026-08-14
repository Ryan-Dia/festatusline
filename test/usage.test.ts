import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { UsageEntry } from '../src/data/jsonl.js';

let mockEntries: UsageEntry[] = [];

vi.mock('../src/data/jsonl.js', () => ({
  loadAllEntries: vi.fn(() => Promise.resolve(mockEntries)),
}));

function makeEntry(overrides: Partial<UsageEntry> = {}): UsageEntry {
  return {
    timestamp: Date.now(),
    model: 'claude-opus-4',
    inputTokens: 0,
    outputTokens: 0,
    cacheCreationTokens: 0,
    cacheReadTokens: 0,
    ephemeral5mTokens: 0,
    ephemeral1hTokens: 0,
    ...overrides,
  };
}

describe('getUsageSnapshot', () => {
  beforeEach(() => {
    vi.resetModules();
    mockEntries = [];
    vi.doMock('../src/data/jsonl.js', () => ({
      loadAllEntries: vi.fn(() => Promise.resolve(mockEntries)),
    }));
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns zeros and null model for empty entries', async () => {
    const { getUsageSnapshot } = await import('../src/data/usage.js');
    const snap = await getUsageSnapshot();
    expect(snap.dailyTokens).toBe(0);
    expect(snap.weeklyTokens).toBe(0);
    expect(snap.sonnetWeeklyTokens).toBe(0);
    expect(snap.allEntries).toHaveLength(0);
  });

  it('counts today tokens for dailyTokens and excludes older entries', async () => {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayMs = todayStart.getTime();

    mockEntries = [
      makeEntry({ timestamp: todayMs + 1000, inputTokens: 100, outputTokens: 50 }),
      makeEntry({ timestamp: todayMs - 1000, inputTokens: 200, outputTokens: 100 }),
    ];

    const { getUsageSnapshot } = await import('../src/data/usage.js');
    const snap = await getUsageSnapshot();
    expect(snap.dailyTokens).toBe(150);
    expect(snap.weeklyTokens).toBe(450);
  });

  it('filters Sonnet model for sonnetWeeklyTokens', async () => {
    const weekAgoMs = Date.now() - 6 * 24 * 60 * 60 * 1000;

    mockEntries = [
      makeEntry({ timestamp: weekAgoMs + 1000, model: 'claude-sonnet-4-6', inputTokens: 100, outputTokens: 50 }),
      makeEntry({ timestamp: weekAgoMs + 1000, model: 'claude-opus-4', inputTokens: 200, outputTokens: 100 }),
    ];

    const { getUsageSnapshot } = await import('../src/data/usage.js');
    const snap = await getUsageSnapshot();
    expect(snap.sonnetWeeklyTokens).toBe(150);
    expect(snap.weeklyTokens).toBe(450);
  });

  it('excludes entries older than 7 days from weeklyTokens', async () => {
    const eightDaysAgoMs = Date.now() - 8 * 24 * 60 * 60 * 1000;

    mockEntries = [
      makeEntry({ timestamp: eightDaysAgoMs, inputTokens: 500, outputTokens: 500 }),
    ];

    const { getUsageSnapshot } = await import('../src/data/usage.js');
    const snap = await getUsageSnapshot();
    expect(snap.weeklyTokens).toBe(0);
  });

  it('includes all cache token types in total', async () => {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    mockEntries = [
      makeEntry({
        timestamp: todayStart.getTime() + 1000,
        inputTokens: 10,
        outputTokens: 5,
        cacheCreationTokens: 20,
        cacheReadTokens: 15,
      }),
    ];

    const { getUsageSnapshot } = await import('../src/data/usage.js');
    const snap = await getUsageSnapshot();
    expect(snap.dailyTokens).toBe(50);
  });
});
