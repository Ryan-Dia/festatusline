import { describe, it, expect } from 'vitest';
import { renderRateLimitSlot } from '../src/widgets/rateLimitRenderer.js';

const NOW = 1_000_000_000_000;
const ONE_HOUR_MS = 60 * 60 * 1000;

describe('renderRateLimitSlot', () => {
  it('shows ?% when usedPercent is null', () => {
    const result = renderRateLimitSlot({
      prefix: '5h',
      color: '#fff',
      usedPercent: null,
      resetsAtMs: null,
      now: NOW,
    });
    expect(result).toContain('?%');
  });

  it('shows ?% when resetsAtMs is null', () => {
    const result = renderRateLimitSlot({
      prefix: '5h',
      color: '#fff',
      usedPercent: 50,
      resetsAtMs: null,
      now: NOW,
    });
    expect(result).toContain('?%');
  });

  it('shows "reset" when time has expired', () => {
    const result = renderRateLimitSlot({
      prefix: '5h',
      color: '#fff',
      usedPercent: 100,
      resetsAtMs: NOW - 1,
      now: NOW,
    });
    expect(result).toContain('reset');
    expect(result).toContain('0%');
  });

  it('shows remaining time in hh:mm format', () => {
    const result = renderRateLimitSlot({
      prefix: '5h',
      color: '#fff',
      usedPercent: 75,
      resetsAtMs: NOW + ONE_HOUR_MS * 2,
      now: NOW,
      timeFormat: 'remaining',
    });
    expect(result).toContain('75%');
    expect(result).toMatch(/2h\s*0m/);
  });

  it('pads prefix to prefixWidth', () => {
    const result = renderRateLimitSlot({
      prefix: '5h',
      color: '#fff',
      usedPercent: 50,
      resetsAtMs: NOW + ONE_HOUR_MS,
      now: NOW,
      prefixWidth: 5,
    });
    expect(result.startsWith('5h   ')).toBe(true);
  });

  it('pads time expression to timeExprWidth', () => {
    const result = renderRateLimitSlot({
      prefix: '5h',
      color: '#fff',
      usedPercent: 50,
      resetsAtMs: NOW + ONE_HOUR_MS,
      now: NOW,
      timeExprWidth: 15,
    });
    const match = result.match(/\([^)]+\)\s*/);
    expect(match).not.toBeNull();
    expect(match![0].length).toBe(15);
  });
});
