import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { promises as fs } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';

function jsonResponse(body: unknown, ok = true): Response {
  return {
    ok,
    json: () => Promise.resolve(body),
  } as Response;
}

describe('getOAuthUsageSlots', () => {
  let claudeDir: string;
  let cacheDir: string;

  beforeEach(async () => {
    claudeDir = await fs.mkdtemp(join(tmpdir(), 'festatusline-claude-'));
    cacheDir = await fs.mkdtemp(join(tmpdir(), 'festatusline-cache-'));
    process.env.CLAUDE_CONFIG_DIR = claudeDir;
    process.env.XDG_CACHE_HOME = cacheDir;
    vi.resetModules();
    vi.unstubAllGlobals();
  });

  afterEach(async () => {
    delete process.env.CLAUDE_CONFIG_DIR;
    delete process.env.XDG_CACHE_HOME;
    vi.unstubAllGlobals();
    await fs.rm(claudeDir, { recursive: true, force: true });
    await fs.rm(cacheDir, { recursive: true, force: true });
  });

  it('returns all-null slots when no credentials file exists', async () => {
    const { getOAuthUsageSlots } = await import('../src/data/claudeOAuthUsage.js');
    expect(await getOAuthUsageSlots()).toEqual({ fable: null, session: null, weekly: null });
  });

  it('fetches the scoped Fable weekly limit alongside session and weekly', async () => {
    await fs.writeFile(
      join(claudeDir, '.credentials.json'),
      JSON.stringify({ claudeAiOauth: { accessToken: 'test-token' } }),
    );
    const fetchMock = vi.fn().mockResolvedValue(
      jsonResponse({
        five_hour: { used_percentage: 30, resets_at: 1_900_000_000 },
        seven_day: { used_percentage: 53, resets_at: 1_900_000_100 },
        limits: [
          {
            kind: 'weekly_scoped',
            percent: 89,
            resets_at: 1_900_000_200,
            scope: { model: { display_name: 'Fable' } },
          },
        ],
      }),
    );
    vi.stubGlobal('fetch', fetchMock);

    const { getOAuthUsageSlots } = await import('../src/data/claudeOAuthUsage.js');
    const slots = await getOAuthUsageSlots();
    expect(slots).toEqual({
      fable: { usedPercent: 89, resetsAt: 1_900_000_200 },
      session: { usedPercent: 30, resetsAt: 1_900_000_000 },
      weekly: { usedPercent: 53, resetsAt: 1_900_000_100 },
    });
    expect(fetchMock).toHaveBeenCalledWith(
      'https://api.anthropic.com/api/oauth/usage',
      expect.objectContaining({
        headers: expect.objectContaining({ authorization: 'Bearer test-token' }),
        // Never follow a redirect — the bearer token must not leave this URL.
        redirect: 'error',
      }),
    );
  });

  it('never writes the access token into the on-disk cache', async () => {
    await fs.writeFile(
      join(claudeDir, '.credentials.json'),
      JSON.stringify({ claudeAiOauth: { accessToken: 'super-secret-token' } }),
    );
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        jsonResponse({ seven_day: { used_percentage: 10, resets_at: 1_900_000_000 } }),
      ),
    );

    const { getOAuthUsageSlots } = await import('../src/data/claudeOAuthUsage.js');
    await getOAuthUsageSlots();
    const cached = await fs.readFile(join(cacheDir, 'festatusline', 'oauth_usage.json'), 'utf8');
    expect(cached).not.toContain('super-secret-token');
    expect(JSON.parse(cached)).toEqual({
      fetchedAt: expect.any(Number),
      slots: { fable: null, session: null, weekly: { usedPercent: 10, resetsAt: 1_900_000_000 } },
    });
  });

  it('falls back to legacy fable_weekly field when no scoped limit matches', async () => {
    await fs.writeFile(
      join(claudeDir, '.credentials.json'),
      JSON.stringify({ claudeAiOauth: { accessToken: 'test-token' } }),
    );
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        jsonResponse({
          fable_weekly: { used_percentage: 42, resets_at: 1_900_000_000 },
        }),
      ),
    );

    const { getOAuthUsageSlots } = await import('../src/data/claudeOAuthUsage.js');
    const slots = await getOAuthUsageSlots();
    expect(slots.fable).toEqual({ usedPercent: 42, resetsAt: 1_900_000_000 });
  });

  it('does not re-fetch while the cached value is still fresh', async () => {
    await fs.writeFile(
      join(claudeDir, '.credentials.json'),
      JSON.stringify({ claudeAiOauth: { accessToken: 'test-token' } }),
    );
    const fetchMock = vi.fn().mockResolvedValue(
      jsonResponse({ seven_day: { used_percentage: 10, resets_at: 1_900_000_000 } }),
    );
    vi.stubGlobal('fetch', fetchMock);

    const { getOAuthUsageSlots } = await import('../src/data/claudeOAuthUsage.js');
    await getOAuthUsageSlots();
    await getOAuthUsageSlots();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('falls back to the stale cache when a re-fetch fails', async () => {
    const cachePath = join(cacheDir, 'festatusline', 'oauth_usage.json');
    await fs.mkdir(join(cacheDir, 'festatusline'), { recursive: true });
    await fs.writeFile(
      cachePath,
      JSON.stringify({
        fetchedAt: 0,
        slots: {
          fable: { usedPercent: 55, resetsAt: 1_900_000_000 },
          session: null,
          weekly: null,
        },
      }),
    );
    await fs.writeFile(
      join(claudeDir, '.credentials.json'),
      JSON.stringify({ claudeAiOauth: { accessToken: 'test-token' } }),
    );
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('network down')));

    const { getOAuthUsageSlots } = await import('../src/data/claudeOAuthUsage.js');
    const slots = await getOAuthUsageSlots();
    expect(slots.fable).toEqual({ usedPercent: 55, resetsAt: 1_900_000_000 });
  });

  it('returns all-null slots when the credentials file has no access token', async () => {
    await fs.writeFile(join(claudeDir, '.credentials.json'), JSON.stringify({}));
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    const { getOAuthUsageSlots } = await import('../src/data/claudeOAuthUsage.js');
    expect(await getOAuthUsageSlots()).toEqual({ fable: null, session: null, weekly: null });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('falls back to null (no stale cache) on a non-200 response', async () => {
    await fs.writeFile(
      join(claudeDir, '.credentials.json'),
      JSON.stringify({ claudeAiOauth: { accessToken: 'test-token' } }),
    );
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse({ error: 'nope' }, false)));

    const { getOAuthUsageSlots } = await import('../src/data/claudeOAuthUsage.js');
    expect(await getOAuthUsageSlots()).toEqual({ fable: null, session: null, weekly: null });
  });

  it('falls back to the stale cache when the request is aborted (timeout)', async () => {
    const cachePath = join(cacheDir, 'festatusline', 'oauth_usage.json');
    await fs.mkdir(join(cacheDir, 'festatusline'), { recursive: true });
    await fs.writeFile(
      cachePath,
      JSON.stringify({
        fetchedAt: 0,
        slots: {
          fable: null,
          session: { usedPercent: 12, resetsAt: 1_900_000_000 },
          weekly: null,
        },
      }),
    );
    await fs.writeFile(
      join(claudeDir, '.credentials.json'),
      JSON.stringify({ claudeAiOauth: { accessToken: 'test-token' } }),
    );
    const abortError = Object.assign(new Error('The operation was aborted'), {
      name: 'AbortError',
    });
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(abortError));

    const { getOAuthUsageSlots } = await import('../src/data/claudeOAuthUsage.js');
    const slots = await getOAuthUsageSlots();
    expect(slots.session).toEqual({ usedPercent: 12, resetsAt: 1_900_000_000 });
  });

  it('backs off after a failure instead of retrying on every render', async () => {
    await fs.writeFile(
      join(claudeDir, '.credentials.json'),
      JSON.stringify({ claudeAiOauth: { accessToken: 'test-token' } }),
    );
    const fetchMock = vi.fn().mockRejectedValue(new Error('network down'));
    vi.stubGlobal('fetch', fetchMock);

    const { getOAuthUsageSlots } = await import('../src/data/claudeOAuthUsage.js');
    await getOAuthUsageSlots();
    await getOAuthUsageSlots();
    await getOAuthUsageSlots();
    expect(fetchMock).toHaveBeenCalledTimes(1);

    const cached = JSON.parse(
      await fs.readFile(join(cacheDir, 'festatusline', 'oauth_usage.json'), 'utf8'),
    );
    expect(cached.failedAt).toEqual(expect.any(Number));
    // A failure must never be recorded as fresh data.
    expect(cached.fetchedAt).toBe(0);
  });

  it('keeps stale slots through a failure and retries once the backoff passes', async () => {
    const cachePath = join(cacheDir, 'festatusline', 'oauth_usage.json');
    await fs.mkdir(join(cacheDir, 'festatusline'), { recursive: true });
    await fs.writeFile(
      cachePath,
      JSON.stringify({
        fetchedAt: 0,
        // Backoff window expired long ago.
        failedAt: Date.now() - 10 * 60 * 1000,
        slots: { fable: null, session: null, weekly: { usedPercent: 21, resetsAt: 1_900_000_000 } },
      }),
    );
    await fs.writeFile(
      join(claudeDir, '.credentials.json'),
      JSON.stringify({ claudeAiOauth: { accessToken: 'test-token' } }),
    );
    const fetchMock = vi.fn().mockRejectedValue(new Error('still down'));
    vi.stubGlobal('fetch', fetchMock);

    const { getOAuthUsageSlots } = await import('../src/data/claudeOAuthUsage.js');
    const slots = await getOAuthUsageSlots();
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(slots.weekly).toEqual({ usedPercent: 21, resetsAt: 1_900_000_000 });
  });

  it('treats a corrupted cache file as no cache instead of throwing', async () => {
    const cachePath = join(cacheDir, 'festatusline', 'oauth_usage.json');
    await fs.mkdir(join(cacheDir, 'festatusline'), { recursive: true });
    await fs.writeFile(cachePath, '{ not valid json');

    const { getOAuthUsageSlots } = await import('../src/data/claudeOAuthUsage.js');
    await expect(getOAuthUsageSlots()).resolves.toEqual({
      fable: null,
      session: null,
      weekly: null,
    });
  });

  it('clamps an out-of-range percent from a drifted response into 0-100', async () => {
    await fs.writeFile(
      join(claudeDir, '.credentials.json'),
      JSON.stringify({ claudeAiOauth: { accessToken: 'test-token' } }),
    );
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        jsonResponse({
          five_hour: { used_percentage: 137, resets_at: 1_900_000_000 },
          seven_day: { used_percentage: -4, resets_at: 1_900_000_000 },
        }),
      ),
    );

    const { getOAuthUsageSlots } = await import('../src/data/claudeOAuthUsage.js');
    const slots = await getOAuthUsageSlots();
    expect(slots.session?.usedPercent).toBe(100);
    expect(slots.weekly?.usedPercent).toBe(0);
  });
});
