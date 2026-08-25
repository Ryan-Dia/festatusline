import { describe, it, expect, vi, afterEach } from 'vitest';
import { createHash } from 'crypto';
import { keychainServiceNames, readKeychainToken } from '../src/data/macKeychain.js';

const realPlatform = process.platform;

function setPlatform(value: string): void {
  Object.defineProperty(process, 'platform', { value, configurable: true });
}

afterEach(() => {
  setPlatform(realPlatform);
});

const CREDENTIALS = JSON.stringify({ claudeAiOauth: { accessToken: 'keychain-token' } });

describe('keychainServiceNames', () => {
  it('scopes by the first 8 hex of sha256(configDir), then falls back to the bare name', () => {
    const dir = '/Users/example/.claude';
    const suffix = createHash('sha256').update(dir).digest('hex').slice(0, 8);
    expect(keychainServiceNames(dir)).toEqual([
      `Claude Code-credentials-${suffix}`,
      'Claude Code-credentials',
    ]);
  });

  it('derives a different scoped name for a different config dir', () => {
    const [a] = keychainServiceNames('/Users/a/.claude');
    const [b] = keychainServiceNames('/Users/b/.claude');
    expect(a).not.toBe(b);
  });
});

describe('readKeychainToken', () => {
  it('never shells out on a non-darwin platform', async () => {
    setPlatform('linux');
    const run = vi.fn();
    expect(await readKeychainToken('/home/u/.claude', run)).toBeNull();
    expect(run).not.toHaveBeenCalled();
  });

  it('reads the token from the scoped item', async () => {
    setPlatform('darwin');
    const run = vi.fn().mockResolvedValue(CREDENTIALS);
    expect(await readKeychainToken('/Users/example/.claude', run)).toBe('keychain-token');

    const [args] = run.mock.calls[0];
    expect(args[0]).toBe('find-generic-password');
    expect(args).toContain('-w');
    expect(args[2]).toMatch(/^Claude Code-credentials-[0-9a-f]{8}$/);
  });

  it('falls back to the unscoped item when the scoped one is absent', async () => {
    setPlatform('darwin');
    const run = vi.fn().mockResolvedValueOnce(null).mockResolvedValueOnce(CREDENTIALS);
    expect(await readKeychainToken('/Users/example/.claude', run)).toBe('keychain-token');
    expect(run).toHaveBeenCalledTimes(2);
    expect(run.mock.calls[1][0][2]).toBe('Claude Code-credentials');
  });

  it('returns null when security fails for every candidate', async () => {
    setPlatform('darwin');
    // A denied Keychain prompt, a timeout and a missing item all surface the same way.
    const run = vi.fn().mockResolvedValue(null);
    expect(await readKeychainToken('/Users/example/.claude', run)).toBeNull();
    expect(run).toHaveBeenCalledTimes(2);
  });

  it('returns null when the item holds something that is not credentials JSON', async () => {
    setPlatform('darwin');
    const run = vi.fn().mockResolvedValue('not json at all');
    expect(await readKeychainToken('/Users/example/.claude', run)).toBeNull();
  });

  it('returns null when the JSON carries no access token', async () => {
    setPlatform('darwin');
    const run = vi.fn().mockResolvedValue(JSON.stringify({ claudeAiOauth: {} }));
    expect(await readKeychainToken('/Users/example/.claude', run)).toBeNull();
  });
});
