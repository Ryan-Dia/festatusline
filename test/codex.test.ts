import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { promises as fs } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';

describe('getCodexSnapshot', () => {
  let tmpDir: string;

  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(join(tmpdir(), 'festatusline-codex-'));
    process.env.CODEX_CONFIG_DIR = tmpDir;
    vi.resetModules();
  });

  afterEach(async () => {
    delete process.env.CODEX_CONFIG_DIR;
    await fs.rm(tmpDir, { recursive: true, force: true });
  });

  it('returns unavailable snapshot when no history file or sessions dir exists', async () => {
    const { getCodexSnapshot } = await import('../src/data/codex.js');
    const snap = await getCodexSnapshot();
    expect(snap.available).toBe(false);
    expect(snap.dailyRequests).toBe(0);
    expect(snap.weeklyRequests).toBe(0);
    expect(snap.rateLimits).toBeNull();
    expect(snap.model).toBeNull();
  });

  it('reads model name from config.toml', async () => {
    await fs.writeFile(join(tmpDir, 'config.toml'), 'model = "o4-mini"\n');
    await fs.mkdir(join(tmpDir, 'sessions'), { recursive: true });

    const { getCodexSnapshot } = await import('../src/data/codex.js');
    const snap = await getCodexSnapshot();
    expect(snap.available).toBe(true);
    expect(snap.model).toBe('o4-mini');
  });

  it('counts session JSONL files in today directory', async () => {
    const today = new Date();
    const year = String(today.getFullYear());
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    const dayDir = join(tmpDir, 'sessions', year, month, day);
    await fs.mkdir(dayDir, { recursive: true });
    await fs.writeFile(join(dayDir, 'sess1.jsonl'), '');
    await fs.writeFile(join(dayDir, 'sess2.jsonl'), '');
    await fs.writeFile(join(dayDir, 'not-a-session.txt'), '');

    const { getCodexSnapshot } = await import('../src/data/codex.js');
    const snap = await getCodexSnapshot();
    expect(snap.available).toBe(true);
    expect(snap.dailyRequests).toBe(2);
    expect(snap.weeklyRequests).toBe(2);
  });

  it('excludes old sessions from daily count but includes in weekly', async () => {
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);

    const fmt = (d: Date) => ({
      year: String(d.getFullYear()),
      month: String(d.getMonth() + 1).padStart(2, '0'),
      day: String(d.getDate()).padStart(2, '0'),
    });

    const todayFmt = fmt(today);
    const yestFmt = fmt(yesterday);

    const todayDir = join(tmpDir, 'sessions', todayFmt.year, todayFmt.month, todayFmt.day);
    const yestDir = join(tmpDir, 'sessions', yestFmt.year, yestFmt.month, yestFmt.day);
    await fs.mkdir(todayDir, { recursive: true });
    await fs.mkdir(yestDir, { recursive: true });
    await fs.writeFile(join(todayDir, 'today.jsonl'), '');
    await fs.writeFile(join(yestDir, 'yesterday.jsonl'), '');

    const { getCodexSnapshot } = await import('../src/data/codex.js');
    const snap = await getCodexSnapshot();
    expect(snap.dailyRequests).toBe(1);
    expect(snap.weeklyRequests).toBe(2);
  });

  it('falls back to CODEX_HOME when CODEX_CONFIG_DIR is unset', async () => {
    delete process.env.CODEX_CONFIG_DIR;
    process.env.CODEX_HOME = tmpDir;
    await fs.writeFile(join(tmpDir, 'config.toml'), 'model = "o4-mini"\n');
    await fs.mkdir(join(tmpDir, 'sessions'), { recursive: true });

    const { getCodexSnapshot } = await import('../src/data/codex.js');
    const snap = await getCodexSnapshot();
    expect(snap.available).toBe(true);
    expect(snap.model).toBe('o4-mini');

    delete process.env.CODEX_HOME;
  });

  it('counts history.jsonl entries using the real "ts" epoch-seconds field', async () => {
    const nowSec = Math.floor(Date.now() / 1000);
    const todaySec = nowSec;
    const lastWeekSec = nowSec - 10 * 24 * 60 * 60;

    await fs.writeFile(
      join(tmpDir, 'history.jsonl'),
      [
        JSON.stringify({ session_id: 'a', ts: todaySec, text: 'today entry' }),
        JSON.stringify({ session_id: 'b', ts: lastWeekSec, text: 'old entry' }),
      ].join('\n') + '\n',
    );

    const { getCodexSnapshot } = await import('../src/data/codex.js');
    const snap = await getCodexSnapshot();
    expect(snap.available).toBe(true);
    expect(snap.dailyRequests).toBe(1);
    expect(snap.weeklyRequests).toBe(1);
  });

  it('reads rate limits when secondary window is null (single-window plans)', async () => {
    const dayDir = join(tmpDir, 'sessions', '2026', '08', '13');
    await fs.mkdir(dayDir, { recursive: true });
    const event = {
      timestamp: '2026-08-13T20:32:47.000Z',
      type: 'event_msg',
      payload: {
        type: 'token_count',
        rate_limits: {
          primary: { used_percent: 35, window_minutes: 10_080, resets_at: 1_787_201_135 },
          secondary: null,
        },
      },
    };
    await fs.writeFile(join(dayDir, 'rollout.jsonl'), `${JSON.stringify(event)}\n`);

    const { getCodexSnapshot, selectLongestWindowSlot } = await import('../src/data/codex.js');
    const snap = await getCodexSnapshot();
    expect(snap.rateLimits?.secondary).toBeNull();
    expect(snap.rateLimits?.primary?.usedPercent).toBe(35);

    const slot = selectLongestWindowSlot(snap.rateLimits);
    expect(slot?.usedPercent).toBe(35);
  });

  it('prefers the session file most recently written to over the one with the latest filename', async () => {
    const dayDir = join(tmpDir, 'sessions', '2026', '08', '13');
    await fs.mkdir(dayDir, { recursive: true });

    const makeEvent = (usedPercent: number) =>
      JSON.stringify({
        timestamp: '2026-08-13T00:00:00.000Z',
        type: 'event_msg',
        payload: {
          type: 'token_count',
          rate_limits: {
            primary: { used_percent: usedPercent, window_minutes: 10_080, resets_at: 1_787_201_135 },
            secondary: null,
          },
        },
      });

    // Started earlier in the day, but is a still-active long-running session.
    const stillActive = join(dayDir, 'rollout-2026-08-13T10-00-00-aaa.jsonl');
    // Started later, but was abandoned right away — filename sorts after `stillActive`.
    const abandoned = join(dayDir, 'rollout-2026-08-13T20-00-00-bbb.jsonl');

    await fs.writeFile(abandoned, `${makeEvent(35)}\n`);
    await fs.writeFile(stillActive, `${makeEvent(41)}\n`);

    const past = new Date(Date.now() - 60_000);
    await fs.utimes(abandoned, past, past);
    await fs.utimes(stillActive, new Date(), new Date());

    const { getCodexSnapshot } = await import('../src/data/codex.js');
    const snap = await getCodexSnapshot();
    expect(snap.rateLimits?.primary?.usedPercent).toBe(41);
  });
});
