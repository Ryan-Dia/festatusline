import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createTtlCache } from '../src/data/cache.js';

describe('createTtlCache', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  it('calls compute on first access', async () => {
    const cache = createTtlCache<number>(1000);
    const compute = vi.fn().mockResolvedValue(42);

    const result = await cache.get(compute);
    expect(result).toBe(42);
    expect(compute).toHaveBeenCalledTimes(1);
  });

  it('returns cached value within TTL', async () => {
    const cache = createTtlCache<number>(1000);
    const compute = vi.fn().mockResolvedValue(42);

    await cache.get(compute);
    vi.advanceTimersByTime(500);
    await cache.get(compute);

    expect(compute).toHaveBeenCalledTimes(1);
  });

  it('recomputes after TTL expires', async () => {
    const cache = createTtlCache<number>(1000);
    const compute = vi.fn().mockResolvedValue(42);

    await cache.get(compute);
    vi.advanceTimersByTime(1001);
    await cache.get(compute);

    expect(compute).toHaveBeenCalledTimes(2);
  });

  it('invalidate forces recompute on next access', async () => {
    const cache = createTtlCache<number>(60_000);
    const compute = vi.fn().mockResolvedValue(1);

    await cache.get(compute);
    cache.invalidate();
    await cache.get(compute);

    expect(compute).toHaveBeenCalledTimes(2);
  });

  afterEach(() => {
    vi.useRealTimers();
  });
});
