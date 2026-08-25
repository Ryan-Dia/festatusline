import { describe, it, expect } from 'vitest';
import { formatTokens } from '../src/utils/tokens.js';

describe('formatTokens', () => {
  it('formats zero or invalid numbers as 0', () => {
    expect(formatTokens(0)).toBe('0');
    expect(formatTokens(-5)).toBe('0');
    expect(formatTokens(NaN)).toBe('0');
    expect(formatTokens(Infinity)).toBe('0');
  });

  it('formats small token counts as plain integers', () => {
    expect(formatTokens(1)).toBe('1');
    expect(formatTokens(500)).toBe('500');
    expect(formatTokens(994)).toBe('994');
  });

  it('formats thousands as K with rounding', () => {
    expect(formatTokens(995)).toBe('1K');
    expect(formatTokens(1_000)).toBe('1K');
    expect(formatTokens(18_000)).toBe('18K');
    expect(formatTokens(47_400)).toBe('47K');
    expect(formatTokens(75_000)).toBe('75K');
    expect(formatTokens(200_000)).toBe('200K');
    expect(formatTokens(999_400)).toBe('999K');
  });

  it('formats millions as M with clean integer or 1 decimal place', () => {
    expect(formatTokens(999_500)).toBe('1M');
    expect(formatTokens(999_999)).toBe('1M');
    expect(formatTokens(1_000_000)).toBe('1M');
    expect(formatTokens(1_300_000)).toBe('1.3M');
    expect(formatTokens(2_000_000)).toBe('2M');
    expect(formatTokens(3_100_000)).toBe('3.1M');
  });
});
