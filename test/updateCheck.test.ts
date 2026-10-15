import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { promises as fs } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { compareVersions, getRequiredUpdate } from '../src/data/updateCheck.js';

const HOUR = 60 * 60 * 1000;

function respond(status: number, body: unknown = {}): ReturnType<typeof vi.fn> {
  return vi.fn(async () => new Response(JSON.stringify(body), { status }));
}

describe('compareVersions', () => {
  it('compares numerically, part by part', () => {
    expect(compareVersions('0.9.1', '0.10.0')).toBeLessThan(0);
    expect(compareVersions('0.15.0', '0.15.0')).toBe(0);
    expect(compareVersions('1.0.0', '0.99.99')).toBeGreaterThan(0);
  });
});

describe('getRequiredUpdate', () => {
  let root: string;

  beforeEach(async () => {
    root = await fs.mkdtemp(join(tmpdir(), 'festatusline-update-'));
    process.env.XDG_CACHE_HOME = root;
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-10-15T00:00:00Z'));
  });

  afterEach(async () => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
    delete process.env.XDG_CACHE_HOME;
    await fs.rm(root, { recursive: true, force: true });
  });

  it('names the required version only when this install is older', async () => {
    vi.stubGlobal('fetch', respond(200, { minVersion: '0.15.0' }));
    expect(await getRequiredUpdate('0.14.0')).toBe('0.15.0');
    expect(await getRequiredUpdate('0.15.0')).toBeNull();
    expect(await getRequiredUpdate('0.16.2')).toBeNull();
  });

  it('asks GitHub at most every 6 hours', async () => {
    const fetchMock = respond(200, { minVersion: '0.15.0' });
    vi.stubGlobal('fetch', fetchMock);
    await getRequiredUpdate('0.14.0');
    vi.setSystemTime(Date.now() + 5 * HOUR);
    expect(await getRequiredUpdate('0.14.0')).toBe('0.15.0');
    expect(fetchMock).toHaveBeenCalledTimes(1);
    vi.setSystemTime(Date.now() + 2 * HOUR);
    await getRequiredUpdate('0.14.0');
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('keeps the last answer through a failed check, and waits an hour to retry', async () => {
    vi.stubGlobal('fetch', respond(200, { minVersion: '0.15.0' }));
    await getRequiredUpdate('0.14.0');
    vi.setSystemTime(Date.now() + 7 * HOUR);
    const failing = vi.fn(async () => {
      throw new Error('offline');
    });
    vi.stubGlobal('fetch', failing);
    expect(await getRequiredUpdate('0.14.0')).toBe('0.15.0');
    vi.setSystemTime(Date.now() + 30 * 60 * 1000);
    expect(await getRequiredUpdate('0.14.0')).toBe('0.15.0');
    expect(failing).toHaveBeenCalledTimes(1);
  });

  it('shows nothing when no minimum is published or the manifest is malformed', async () => {
    vi.stubGlobal('fetch', respond(404));
    expect(await getRequiredUpdate('0.1.0')).toBeNull();
    vi.setSystemTime(Date.now() + 7 * HOUR);
    vi.stubGlobal('fetch', respond(200, { minVersion: 'latest' }));
    expect(await getRequiredUpdate('0.1.0')).toBeNull();
  });

  it('shows nothing for a build without a release version', async () => {
    vi.stubGlobal('fetch', respond(200, { minVersion: '0.15.0' }));
    expect(await getRequiredUpdate('0.0.0-test')).toBeNull();
  });
});
