import { execFile } from 'child_process';
import { createHash } from 'crypto';

/**
 * Reads Claude Code's OAuth credentials out of the macOS Keychain.
 *
 * On Linux, WSL and Windows the CLI writes them to a plaintext `.credentials.json`; on macOS
 * that file does not exist and the same JSON lives in a Keychain item instead, which is why
 * the OAuth-backed widgets were inert on macOS before this.
 *
 * Service and account names verified against Orca's `claude-accounts/keychain.ts`, which reads
 * the same item.
 */
const BASE_SERVICE = 'Claude Code-credentials';
// The statusline blocks on this, and `security` can sit waiting on a Keychain access prompt.
const TIMEOUT_MS = 3_000;

export type SecurityRunner = (args: string[]) => Promise<string | null>;

/**
 * Claude Code 2.1+ scopes the Keychain item by config dir, using the first 8 hex characters of
 * sha256(CLAUDE_CONFIG_DIR); older builds used the bare service name. Try the scoped item
 * first and fall back, so both layouts resolve.
 */
export function keychainServiceNames(configDir: string): string[] {
  const suffix = createHash('sha256').update(configDir).digest('hex').slice(0, 8);
  return [`${BASE_SERVICE}-${suffix}`, BASE_SERVICE];
}

function keychainAccount(): string {
  return process.env.USER || process.env.USERNAME || 'user';
}

const runSecurity: SecurityRunner = (args) =>
  new Promise((resolve) => {
    execFile('security', args, { timeout: TIMEOUT_MS }, (err, stdout) => {
      // A missing item exits non-zero — indistinguishable here from a denied prompt or a
      // timeout, and all three mean the same thing to the caller: no token this way.
      resolve(err ? null : stdout.trim() || null);
    });
  });

function extractToken(raw: string): string | null {
  try {
    const parsed: unknown = JSON.parse(raw);
    const oauth = (parsed as { claudeAiOauth?: { accessToken?: unknown } } | null)?.claudeAiOauth;
    return typeof oauth?.accessToken === 'string' ? oauth.accessToken : null;
  } catch {
    return null;
  }
}

/**
 * The OAuth access token from the Keychain, or null on any other platform, when the item is
 * absent, or when `security` fails or is denied. Never throws — callers treat null as
 * "no OAuth data" and fall back to the stdin payload.
 */
export async function readKeychainToken(
  configDir: string,
  run: SecurityRunner = runSecurity,
): Promise<string | null> {
  if (process.platform !== 'darwin') return null;

  const account = keychainAccount();
  for (const service of keychainServiceNames(configDir)) {
    const raw = await run(['find-generic-password', '-s', service, '-a', account, '-w']);
    if (!raw) continue;
    const token = extractToken(raw);
    if (token) return token;
  }
  return null;
}
