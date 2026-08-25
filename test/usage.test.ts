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

  it('weights the week by model family so an Opus token outweighs a Sonnet one', async () => {
    const weekAgoMs = Date.now() - 6 * 24 * 60 * 60 * 1000;

    mockEntries = [
      makeEntry({ timestamp: weekAgoMs + 1000, model: 'claude-opus-5', inputTokens: 1_000 }),
      makeEntry({ timestamp: weekAgoMs + 1000, model: 'claude-sonnet-4-6', inputTokens: 1_000 }),
    ];

    const { getUsageSnapshot } = await import('../src/data/usage.js');
    const snap = await getUsageSnapshot();

    // Identical raw token counts, but Opus sits on tier 5 against Sonnet's tier 3.
    expect(snap.weeklyTokens).toBe(2_000);
    expect(snap.weightedWeeklyByFamily.opus).toBe(1_000 * 10 * 5);
    expect(snap.weightedWeeklyByFamily.sonnet).toBe(1_000 * 10 * 3);
    expect(snap.weightedWeekly).toBe(80_000);
  });

  it('scopes weightedDaily to today while weightedWeekly keeps the week', async () => {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayMs = todayStart.getTime();

    mockEntries = [
      makeEntry({ timestamp: todayMs + 1000, model: 'claude-opus-5', inputTokens: 100 }),
      makeEntry({ timestamp: todayMs - 1000, model: 'claude-opus-5', inputTokens: 100 }),
    ];

    const { getUsageSnapshot } = await import('../src/data/usage.js');
    const snap = await getUsageSnapshot();
    expect(snap.weightedDaily).toBe(100 * 10 * 5);
    expect(snap.weightedWeekly).toBe(2 * 100 * 10 * 5);
  });

  it('buckets an unrecognized model under the other family', async () => {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    mockEntries = [
      makeEntry({ timestamp: todayStart.getTime() + 1000, model: '', outputTokens: 10 }),
    ];

    const { getUsageSnapshot } = await import('../src/data/usage.js');
    const snap = await getUsageSnapshot();
    expect(snap.weightedWeeklyByFamily.other).toBe(10 * 50 * 3);
    expect(snap.weightedWeeklyByFamily.opus).toBe(0);
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
