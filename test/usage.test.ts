import { describe, it, expect } from "vitest";
import { computePeakTime } from "../src/data/peak-time.js";
import { getDailyReset, getWeeklyReset } from "../src/data/reset.js";

describe("computePeakTime", () => {
  it("returns null when no entries", () => {
    expect(computePeakTime([])).toBeNull();
  });

  it("finds peak hour", () => {
    const base = Date.now() - 60 * 60 * 1000;
    const hour = new Date(base).getHours();
    const entries = [
      { timestamp: base, model: "claude-sonnet", inputTokens: 5000, outputTokens: 1000, cacheCreationTokens: 0, cacheReadTokens: 0 },
      { timestamp: base - 3600_000, model: "claude-sonnet", inputTokens: 100, outputTokens: 100, cacheCreationTokens: 0, cacheReadTokens: 0 },
    ];
    const result = computePeakTime(entries);
    expect(result).not.toBeNull();
    expect(result?.hour).toBe(hour);
  });
});

describe("getDailyReset", () => {
  it("returns a label with hh:mm format", () => {
    const now = new Date("2026-04-17T14:30:00");
    const result = getDailyReset(now);
    expect(result.label).toMatch(/^\d{2}:\d{2}$/);
    expect(result.remainingMs).toBeGreaterThan(0);
  });
});

describe("getWeeklyReset", () => {
  it("rolling mode returns ~7 days", () => {
    const now = new Date("2026-04-17T14:30:00");
    const result = getWeeklyReset(null, now);
    const days = result.remainingMs / (1000 * 60 * 60 * 24);
    expect(days).toBeCloseTo(7, 0);
  });

  it("anchor mode returns time until next anchor day", () => {
    const now = new Date("2026-04-17T14:30:00"); // Friday
    const result = getWeeklyReset(1, now); // next Monday
    const days = result.remainingMs / (1000 * 60 * 60 * 24);
    expect(days).toBeGreaterThan(0);
    expect(days).toBeLessThanOrEqual(7);
  });
});
