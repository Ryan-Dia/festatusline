import { describe, it, expect } from 'vitest';
import { hasUsableRateLimit, mergeRateLimits } from '../src/render/index.js';

// Fixed windows: usage inside one only ever climbs, and a later resets_at is a newer window.
const FIVE_HOUR_RESET = 1_787_637_000;
const SEVEN_DAY_RESET = 1_787_724_000;

const NO_OAUTH = { fable: null, session: null, weekly: null };

function stdinOf(fivePct: number | null, sevenPct: number | null) {
  return {
    five_hour: fivePct == null ? null : { used_percentage: fivePct, resets_at: FIVE_HOUR_RESET },
    seven_day: sevenPct == null ? null : { used_percentage: sevenPct, resets_at: SEVEN_DAY_RESET },
  };
}

function oauthOf(sessionPct: number | null, weeklyPct: number | null, resetOffsetS = 0) {
  return {
    fable: null,
    session:
      sessionPct == null
        ? null
        : { usedPercent: sessionPct, resetsAt: FIVE_HOUR_RESET + resetOffsetS },
    weekly:
      weeklyPct == null
        ? null
        : { usedPercent: weeklyPct, resetsAt: SEVEN_DAY_RESET + resetOffsetS },
  };
}

describe('mergeRateLimits', () => {
  it('keeps stdin when it is the higher (newer) snapshot of the same window', () => {
    // This session just took a turn: stdin 37% is ahead of a 5-minute-old OAuth 34%.
    const result = mergeRateLimits(stdinOf(37, 54), oauthOf(34, 54), null);
    expect(result?.five_hour).toEqual({ used_percentage: 37, resets_at: FIVE_HOUR_RESET });
  });

  it('prefers OAuth when it is higher — quota burned elsewhere while this session idled', () => {
    // stdin still re-sends the snapshot from an hour ago; OAuth saw another device's usage.
    const result = mergeRateLimits(stdinOf(34, 54), oauthOf(41, 58), null);
    expect(result?.five_hour).toEqual({ used_percentage: 41, resets_at: FIVE_HOUR_RESET });
    expect(result?.seven_day).toEqual({ used_percentage: 58, resets_at: SEVEN_DAY_RESET });
  });

  it('breaks an exact tie in favour of stdin', () => {
    const result = mergeRateLimits(stdinOf(54, 54), oauthOf(54, 54), null);
    expect(result?.five_hour).toEqual({ used_percentage: 54, resets_at: FIVE_HOUR_RESET });
  });

  it('treats a resets_at that differs by rounding as the same window', () => {
    // Observed in the wild: stdin 1787637000 vs OAuth 1787636999 for the same window.
    const result = mergeRateLimits(stdinOf(37, 54), oauthOf(34, 54, -1), null);
    expect(result?.five_hour?.used_percentage).toBe(37);
  });

  it('prefers the later window even when its percentage is lower', () => {
    // The old window ran to 96% and reset; another device already started the new one at 3%.
    const newWindow = oauthOf(3, 54, 5 * 60 * 60);
    const result = mergeRateLimits(stdinOf(96, 54), newWindow, null);
    expect(result?.five_hour).toEqual({
      used_percentage: 3,
      resets_at: FIVE_HOUR_RESET + 5 * 60 * 60,
    });
  });

  it('falls back to OAuth when stdin sends a present-but-empty period object', () => {
    // Claude Code sends `{ used_percentage: null, resets_at: null }` rather than omitting
    // the field outright before the session's first API call — a truthy object with no
    // usable data. It must not shadow a real OAuth-fetched value.
    const emptyShell = {
      five_hour: { used_percentage: null, resets_at: null },
      seven_day: { used_percentage: null, resets_at: null },
    };
    // The on-disk cache (an older stdin) is genuinely older here, so OAuth is the newest.
    const result = mergeRateLimits(emptyShell, oauthOf(40, 53), stdinOf(12, 20));
    expect(result?.five_hour).toEqual({ used_percentage: 40, resets_at: FIVE_HOUR_RESET });
    expect(result?.seven_day).toEqual({ used_percentage: 53, resets_at: SEVEN_DAY_RESET });

    const noCache = mergeRateLimits(emptyShell, oauthOf(40, 53), null);
    expect(noCache?.five_hour?.used_percentage).toBe(40);
  });

  it('falls back to the last cached stdin value when OAuth has nothing either', () => {
    const result = mergeRateLimits(null, NO_OAUTH, stdinOf(99, 88));
    expect(result).toEqual({
      five_hour: { used_percentage: 99, resets_at: FIVE_HOUR_RESET },
      seven_day: { used_percentage: 88, resets_at: SEVEN_DAY_RESET },
    });
  });

  it('resolves each bucket independently', () => {
    // five_hour only on stdin, seven_day only on OAuth.
    const result = mergeRateLimits(stdinOf(20, null), oauthOf(null, 53), null);
    expect(result?.five_hour?.used_percentage).toBe(20);
    expect(result?.seven_day?.used_percentage).toBe(53);
  });

  it('tolerates a null OAuth slots object', () => {
    const result = mergeRateLimits(stdinOf(20, null), null, stdinOf(99, 88));
    expect(result?.five_hour?.used_percentage).toBe(20);
    expect(result?.seven_day?.used_percentage).toBe(88);
  });

  it('never lets the on-disk stdin cache outrank a live stdin value', () => {
    // The cache is only ever an older stdin, so a stale-but-higher cached figure must not
    // win the freshness comparison against what this session is sending right now.
    const result = mergeRateLimits(stdinOf(20, 30), NO_OAUTH, stdinOf(99, 88));
    expect(result?.five_hour?.used_percentage).toBe(20);
    expect(result?.seven_day?.used_percentage).toBe(30);
  });

  it('returns undefined when every tier is empty', () => {
    const emptyShell = { five_hour: { used_percentage: null, resets_at: null }, seven_day: null };
    expect(mergeRateLimits(emptyShell, NO_OAUTH, emptyShell)).toBeUndefined();
    expect(mergeRateLimits(null, NO_OAUTH, null)).toBeUndefined();
  });
});

describe('hasUsableRateLimit', () => {
  it('rejects the pre-first-call empty shell so it never clobbers the on-disk cache', () => {
    expect(
      hasUsableRateLimit({
        five_hour: { used_percentage: null, resets_at: null },
        seven_day: { used_percentage: null, resets_at: null },
      }),
    ).toBe(false);
    expect(hasUsableRateLimit(null)).toBe(false);
    expect(hasUsableRateLimit(undefined)).toBe(false);
  });

  it('accepts a payload with at least one real period', () => {
    expect(hasUsableRateLimit(stdinOf(20, null))).toBe(true);
    expect(hasUsableRateLimit(stdinOf(null, 30))).toBe(true);
  });
});
