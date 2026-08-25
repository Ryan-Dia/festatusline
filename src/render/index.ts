import { promises as fs } from 'fs';
import { homedir } from 'os';
import { join } from 'path';
import { readStdin, RateLimitsSchema, type RateLimits } from '../data/stdin.js';
import { getUsageSnapshot } from '../data/usage.js';
import { getCodexSnapshot } from '../data/codex.js';
import { readClaudeSettings } from '../data/claude-settings.js';
import { getLastCacheCreation, getLastModelFromTranscript } from '../data/jsonl.js';
import { loadSettings } from '../config/load.js';
import { getTheme } from '../theme/index.js';
import { createTranslator } from '../i18n/index.js';
import { renderAllLines } from './line.js';
import type { RenderContext } from '../widgets/types.js';

const CACHE_DIR = process.env.XDG_CACHE_HOME
  ? join(process.env.XDG_CACHE_HOME, 'festatusline')
  : join(homedir(), '.cache', 'festatusline');
const RATE_LIMITS_CACHE_PATH = join(CACHE_DIR, 'rate_limits.json');

// The cache mirrors the stdin payload verbatim so a cached window survives a Claude Code
// release that starts sending null where it used to omit the field.
const RateLimitsCacheSchema = RateLimitsSchema;

async function tryOrNull<T>(fn: () => Promise<T>): Promise<T | null> {
  try {
    return await fn();
  } catch {
    return null;
  }
}

async function readRateLimitsCache(): Promise<RateLimits | null> {
  return tryOrNull(async () => {
    const raw = await fs.readFile(RATE_LIMITS_CACHE_PATH, 'utf8');
    const result = RateLimitsCacheSchema.safeParse(JSON.parse(raw));
    return result.success ? result.data : null;
  });
}

async function writeRateLimitsCache(rateLimits: RateLimits): Promise<void> {
  await tryOrNull(async () => {
    await fs.mkdir(CACHE_DIR, { recursive: true });
    await fs.writeFile(RATE_LIMITS_CACHE_PATH, JSON.stringify(rateLimits), 'utf8');
  });
}

export async function renderFromStdin(): Promise<void> {
  const [stdin, settings, claudeSettings, usage, codex, cachedRateLimits, lastCacheCreation] =
    await Promise.all([
      readStdin(),
      loadSettings(),
      readClaudeSettings(),
      tryOrNull(getUsageSnapshot),
      tryOrNull(getCodexSnapshot),
      readRateLimitsCache(),
      tryOrNull(getLastCacheCreation),
    ]);

  const t = createTranslator(settings.locale);

  if (stdin.rate_limits) {
    writeRateLimitsCache(stdin.rate_limits).catch(() => {});
  }

  const cacheCreated = stdin.context_window?.current_usage?.cache_creation_input_tokens;
  const cacheTtlCreatedAt =
    cacheCreated && cacheCreated > 0 ? Date.now() : (lastCacheCreation?.timestamp ?? null);
  const cacheTtlMs = lastCacheCreation?.ttlMs ?? 300_000;

  let sessionLastModel: string | null = null;
  if (!stdin.model && stdin.transcript_path) {
    const transcriptPath = stdin.transcript_path;
    sessionLastModel = await tryOrNull(() => getLastModelFromTranscript(transcriptPath));
  }

  const theme = getTheme(settings.theme);
  const ctx: RenderContext = {
    stdin: {
      ...stdin,
      rate_limits: stdin.rate_limits ?? cachedRateLimits ?? undefined,
    },
    usage,
    codex,
    sessionLastModel,
    theme,
    t,
    now: new Date(),
    weeklyAnchorDay: settings.weeklyAnchorDay,
    envEffortLevel: process.env.CLAUDE_EFFORT,
    ultracode: claudeSettings.ultracode,
    cacheTtlCreatedAt,
    cacheTtlMs,
  };

  const output = renderAllLines(settings.lines, ctx, settings.separator);
  process.stdout.write(`${output}\n`);
}
