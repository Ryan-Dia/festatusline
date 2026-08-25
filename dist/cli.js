#!/usr/bin/env node
import {
  createMtimeCache,
  createTranslator,
  createTtlCache,
  emptyFamilyTotals,
  external_exports,
  getClaudeDir,
  getCodexSnapshot,
  getTheme,
  getTimeWindows,
  isFableModel,
  isSonnetModel,
  loadSettings,
  modelFamily,
  renderAllLines,
  resolveLines,
  setLocale,
  source_default,
  t,
  weightedCost
} from "./chunk-JZ3T26QR.js";

// src/render/index.ts
import { promises as fs4 } from "fs";
import { homedir as homedir2 } from "os";
import { join as join2 } from "path";

// src/data/stdin.ts
var nullableNumber = () => external_exports.number().nullish();
var nullableString = () => external_exports.string().nullish();
var ModelSchema = external_exports.object({
  id: nullableString(),
  display_name: nullableString()
});
var ContextWindowCurrentUsageSchema = external_exports.object({
  input_tokens: nullableNumber(),
  output_tokens: nullableNumber(),
  cache_creation_input_tokens: nullableNumber(),
  cache_read_input_tokens: nullableNumber()
});
var ContextWindowSchema = external_exports.object({
  total_input_tokens: nullableNumber(),
  total_output_tokens: nullableNumber(),
  context_window_size: nullableNumber(),
  current_usage: ContextWindowCurrentUsageSchema.nullish(),
  used_percentage: nullableNumber(),
  remaining_percentage: nullableNumber()
});
var RateLimitPeriodSchema = external_exports.object({
  used_percentage: nullableNumber(),
  resets_at: nullableNumber()
});
var RateLimitsSchema = external_exports.object({
  five_hour: RateLimitPeriodSchema.nullish(),
  seven_day: RateLimitPeriodSchema.nullish()
});
var CostSchema = external_exports.object({
  total_cost_usd: nullableNumber(),
  total_duration_ms: nullableNumber(),
  total_api_duration_ms: nullableNumber(),
  total_lines_added: nullableNumber(),
  total_lines_removed: nullableNumber()
});
var RepoSchema = external_exports.object({
  host: nullableString(),
  owner: nullableString(),
  name: nullableString()
});
var WorkspaceSchema = external_exports.object({
  current_dir: nullableString(),
  project_dir: nullableString(),
  added_dirs: external_exports.array(external_exports.string()).nullish(),
  // Set for any linked worktree created with `git worktree add`, unlike the top-level
  // `worktree` object which only appears for --worktree sessions.
  git_worktree: nullableString(),
  repo: RepoSchema.nullish()
});
var OutputStyleSchema = external_exports.object({
  name: nullableString()
});
var EffortSchema = external_exports.object({
  level: nullableString()
});
var ThinkingSchema = external_exports.object({
  enabled: external_exports.boolean().nullish()
});
var VimSchema = external_exports.object({
  mode: nullableString()
});
var AgentSchema = external_exports.object({
  name: nullableString()
});
var PrSchema = external_exports.object({
  number: nullableNumber(),
  url: nullableString(),
  review_state: nullableString(),
  kind: nullableString()
});
var WorktreeSchema = external_exports.object({
  name: nullableString(),
  path: nullableString(),
  branch: nullableString(),
  original_cwd: nullableString(),
  original_branch: nullableString()
});
var stdinShape = {
  type: nullableString(),
  model: ModelSchema.nullish(),
  session_id: nullableString(),
  session_name: nullableString(),
  prompt_id: nullableString(),
  transcript_path: nullableString(),
  cwd: nullableString(),
  cost: CostSchema.nullish(),
  context_window: ContextWindowSchema.nullish(),
  workspace: WorkspaceSchema.nullish(),
  hook_event_name: nullableString(),
  version: nullableString(),
  output_style: OutputStyleSchema.nullish(),
  rate_limits: RateLimitsSchema.nullish(),
  exceeds_200k_tokens: external_exports.boolean().nullish(),
  fast_mode: external_exports.boolean().nullish(),
  effort: EffortSchema.nullish(),
  thinking: ThinkingSchema.nullish(),
  vim: VimSchema.nullish(),
  agent: AgentSchema.nullish(),
  pr: PrSchema.nullish(),
  worktree: WorktreeSchema.nullish()
};
var ClaudeStdinSchema = external_exports.object(stdinShape);
function salvageStdin(raw) {
  if (typeof raw !== "object" || raw === null || Array.isArray(raw)) return {};
  const source = raw;
  const salvaged = {};
  for (const [key, schema] of Object.entries(stdinShape)) {
    const result = schema.safeParse(source[key]);
    if (result.success && result.data != null) salvaged[key] = result.data;
  }
  return salvaged;
}
function parseStdin(raw) {
  const trimmed = raw.trim();
  if (!trimmed) return {};
  let json;
  try {
    json = JSON.parse(trimmed);
  } catch {
    return {};
  }
  const result = ClaudeStdinSchema.safeParse(json);
  return result.success ? result.data : salvageStdin(json);
}
async function readStdin() {
  return new Promise((resolve, reject) => {
    const chunks = [];
    process.stdin.on("data", (chunk) => chunks.push(chunk));
    process.stdin.on("end", () => {
      resolve(parseStdin(Buffer.concat(chunks).toString("utf8")));
    });
    process.stdin.on("error", reject);
  });
}

// src/data/jsonl.ts
import fs from "fs";
import path from "path";
import readline from "readline";
var UsageSchema = external_exports.object({
  input_tokens: external_exports.number().optional().default(0),
  output_tokens: external_exports.number().optional().default(0),
  cache_creation_input_tokens: external_exports.number().optional().default(0),
  cache_read_input_tokens: external_exports.number().optional().default(0),
  cache_creation: external_exports.object({
    ephemeral_5m_input_tokens: external_exports.number().optional().default(0),
    ephemeral_1h_input_tokens: external_exports.number().optional().default(0)
  }).optional()
});
var JsonlLineSchema = external_exports.object({
  timestamp: external_exports.string().optional(),
  model: external_exports.string().optional(),
  message: external_exports.object({
    model: external_exports.string().optional(),
    usage: UsageSchema.optional()
  }).optional(),
  usage: UsageSchema.optional()
});
var fileCache = createMtimeCache();
async function parseJsonlFile(filePath) {
  return fileCache.get(filePath, async (p) => {
    const entries = [];
    const stream = fs.createReadStream(p, { encoding: "utf8" });
    const rl = readline.createInterface({ input: stream, crlfDelay: Infinity });
    for await (const line of rl) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      try {
        const raw = JSON.parse(trimmed);
        const result = JsonlLineSchema.safeParse(raw);
        if (!result.success) continue;
        const obj = result.data;
        const usage = obj.message?.usage ?? obj.usage;
        if (!usage) continue;
        const timestamp = obj.timestamp ? new Date(obj.timestamp).getTime() : Date.now();
        const model = obj.message?.model ?? obj.model ?? "";
        const cacheCreation = usage.cache_creation;
        entries.push({
          timestamp,
          model,
          inputTokens: usage.input_tokens,
          outputTokens: usage.output_tokens,
          cacheCreationTokens: usage.cache_creation_input_tokens,
          cacheReadTokens: usage.cache_read_input_tokens,
          ephemeral5mTokens: cacheCreation?.ephemeral_5m_input_tokens ?? 0,
          ephemeral1hTokens: cacheCreation?.ephemeral_1h_input_tokens ?? 0
        });
      } catch {
      }
    }
    return entries;
  });
}
async function loadAllEntries() {
  const projectsDir = path.join(getClaudeDir(), "projects");
  let projectDirs;
  try {
    projectDirs = await fs.promises.readdir(projectsDir);
  } catch {
    return [];
  }
  const all = [];
  await Promise.all(
    projectDirs.map(async (dir) => {
      const dirPath = path.join(projectsDir, dir);
      let files;
      try {
        files = await fs.promises.readdir(dirPath);
      } catch {
        return;
      }
      const jsonlFiles = files.filter((f) => f.endsWith(".jsonl"));
      await Promise.all(
        jsonlFiles.map(async (file) => {
          const entries = await parseJsonlFile(path.join(dirPath, file));
          all.push(...entries);
        })
      );
    })
  );
  return all;
}
async function getLastModelFromTranscript(transcriptPath) {
  try {
    const entries = await parseJsonlFile(transcriptPath);
    let lastModel = null;
    let lastTimestamp = 0;
    for (const e of entries) {
      if (e.model && e.timestamp > lastTimestamp) {
        lastTimestamp = e.timestamp;
        lastModel = e.model;
      }
    }
    return lastModel;
  } catch {
    return null;
  }
}
async function getLastCacheCreation() {
  const entries = await loadAllEntries();
  let latest = null;
  for (const e of entries) {
    if (e.cacheCreationTokens > 0) {
      if (!latest || e.timestamp > latest.timestamp) latest = e;
    }
  }
  if (!latest) return null;
  const ttlMs = latest.ephemeral1hTokens > 0 ? 36e5 : 3e5;
  return { timestamp: latest.timestamp, ttlMs };
}

// src/data/usage.ts
function totalTokens(e) {
  return e.inputTokens + e.outputTokens + e.cacheCreationTokens + e.cacheReadTokens;
}
var cache = createTtlCache(3e4);
async function getUsageSnapshot() {
  return cache.get(async () => {
    const entries = await loadAllEntries();
    const { todayStartMs, weekStartMs } = getTimeWindows();
    let dailyTokens = 0;
    let weeklyTokens = 0;
    let sonnetWeeklyTokens = 0;
    let fableWeeklyTokens = 0;
    let weightedDaily = 0;
    let weightedWeekly = 0;
    const weightedWeeklyByFamily = emptyFamilyTotals();
    for (const e of entries) {
      const total = totalTokens(e);
      const weighted = weightedCost(e);
      if (e.timestamp >= todayStartMs) {
        dailyTokens += total;
        weightedDaily += weighted;
      }
      if (e.timestamp >= weekStartMs) {
        weeklyTokens += total;
        weightedWeekly += weighted;
        weightedWeeklyByFamily[modelFamily(e.model)] += weighted;
        if (isSonnetModel(e.model)) sonnetWeeklyTokens += total;
        if (isFableModel(e.model)) fableWeeklyTokens += total;
      }
    }
    return {
      dailyTokens,
      weeklyTokens,
      sonnetWeeklyTokens,
      fableWeeklyTokens,
      weightedDaily,
      weightedWeekly,
      weightedWeeklyByFamily,
      allEntries: entries
    };
  });
}

// src/data/claudeOAuthUsage.ts
import { promises as fs2 } from "fs";
import { homedir } from "os";
import { join } from "path";

// src/data/macKeychain.ts
import { execFile } from "child_process";
import { createHash } from "crypto";
var BASE_SERVICE = "Claude Code-credentials";
var TIMEOUT_MS = 3e3;
function keychainServiceNames(configDir) {
  const suffix = createHash("sha256").update(configDir).digest("hex").slice(0, 8);
  return [`${BASE_SERVICE}-${suffix}`, BASE_SERVICE];
}
function keychainAccount() {
  return process.env.USER || process.env.USERNAME || "user";
}
var runSecurity = (args) => new Promise((resolve) => {
  execFile("security", args, { timeout: TIMEOUT_MS }, (err, stdout) => {
    resolve(err ? null : stdout.trim() || null);
  });
});
function extractToken(raw) {
  try {
    const parsed = JSON.parse(raw);
    const oauth = parsed?.claudeAiOauth;
    return typeof oauth?.accessToken === "string" ? oauth.accessToken : null;
  } catch {
    return null;
  }
}
async function readKeychainToken(configDir, run = runSecurity) {
  if (process.platform !== "darwin") return null;
  const account = keychainAccount();
  for (const service of keychainServiceNames(configDir)) {
    const raw = await run(["find-generic-password", "-s", service, "-a", account, "-w"]);
    if (!raw) continue;
    const token = extractToken(raw);
    if (token) return token;
  }
  return null;
}

// src/data/claudeOAuthUsage.ts
var OAUTH_USAGE_URL = "https://api.anthropic.com/api/oauth/usage";
var OAUTH_BETA_HEADER = "oauth-2025-04-20";
var USER_AGENT = "claude-code/2.1.0";
var FETCH_TIMEOUT_MS = 3e3;
var TTL_MS = 5 * 60 * 1e3;
var FAILURE_BACKOFF_MS = 60 * 1e3;
var EXPIRED_TTL_MS = 60 * 1e3;
var CACHE_DIR = process.env.XDG_CACHE_HOME ? join(process.env.XDG_CACHE_HOME, "festatusline") : join(homedir(), ".cache", "festatusline");
var CACHE_PATH = join(CACHE_DIR, "oauth_usage.json");
var EMPTY_SLOTS = { fable: null, session: null, weekly: null };
var CredentialsSchema = external_exports.object({
  claudeAiOauth: external_exports.object({
    accessToken: external_exports.string().nullish()
  }).nullish()
});
var ResetsAtSchema = external_exports.union([external_exports.string(), external_exports.number()]).nullish();
var ScopedLimitSchema = external_exports.object({
  kind: external_exports.string().nullish(),
  percent: external_exports.number().nullish(),
  resets_at: ResetsAtSchema,
  scope: external_exports.object({
    model: external_exports.object({
      display_name: external_exports.string().nullish()
    }).nullish()
  }).nullish()
});
var UsageWindowSchema = external_exports.object({
  utilization: external_exports.number().nullish(),
  used_percentage: external_exports.number().nullish(),
  resets_at: ResetsAtSchema
});
var OAuthUsageResponseSchema = external_exports.object({
  five_hour: UsageWindowSchema.nullish(),
  seven_day: UsageWindowSchema.nullish(),
  fable_weekly: UsageWindowSchema.nullish(),
  fable_seven_day: UsageWindowSchema.nullish(),
  seven_day_fable: UsageWindowSchema.nullish(),
  limits: external_exports.array(ScopedLimitSchema).nullish()
});
function parseResetTimestampMs(value) {
  if (value == null) return null;
  if (typeof value === "number") {
    if (!Number.isFinite(value)) return null;
    return value > 1e10 ? value : value * 1e3;
  }
  const numeric = Number(value);
  if (Number.isFinite(numeric) && value.trim() !== "") {
    return numeric > 1e10 ? numeric : numeric * 1e3;
  }
  const parsed = new Date(value).getTime();
  return Number.isNaN(parsed) ? null : parsed;
}
function clampPercent(pct) {
  return Math.min(100, Math.max(0, pct));
}
function extractWindowSlot(window) {
  if (!window) return null;
  const pct = window.utilization ?? window.used_percentage;
  if (typeof pct !== "number") return null;
  const resetsAtMs = parseResetTimestampMs(window.resets_at);
  if (resetsAtMs == null) return null;
  return { usedPercent: clampPercent(pct), resetsAt: Math.floor(resetsAtMs / 1e3) };
}
function extractFableSlot(data) {
  const scoped = data.limits?.find(
    (limit) => limit.kind === "weekly_scoped" && typeof limit.percent === "number" && limit.scope?.model?.display_name?.trim().toLowerCase() === "fable"
  );
  if (scoped && typeof scoped.percent === "number") {
    const resetsAtMs = parseResetTimestampMs(scoped.resets_at);
    if (resetsAtMs != null) {
      return { usedPercent: clampPercent(scoped.percent), resetsAt: Math.floor(resetsAtMs / 1e3) };
    }
  }
  for (const legacy of [data.fable_weekly, data.fable_seven_day, data.seven_day_fable]) {
    const slot = extractWindowSlot(legacy);
    if (slot) return slot;
  }
  return null;
}
function extractSlots(data) {
  return {
    fable: extractFableSlot(data),
    session: extractWindowSlot(data.five_hour),
    weekly: extractWindowSlot(data.seven_day)
  };
}
async function readAccessToken() {
  const configDir = getClaudeDir();
  try {
    const raw = await fs2.readFile(join(configDir, ".credentials.json"), "utf8");
    const result = CredentialsSchema.safeParse(JSON.parse(raw));
    const token = result.success ? result.data.claudeAiOauth?.accessToken ?? null : null;
    if (token) return token;
  } catch {
  }
  return readKeychainToken(configDir);
}
async function readCache() {
  try {
    const raw = await fs2.readFile(CACHE_PATH, "utf8");
    return JSON.parse(raw);
  } catch {
    return null;
  }
}
async function writeCache(entry) {
  try {
    await fs2.mkdir(CACHE_DIR, { recursive: true });
    await fs2.writeFile(CACHE_PATH, JSON.stringify(entry), "utf8");
  } catch {
  }
}
async function fetchOAuthSlots(token) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(OAUTH_USAGE_URL, {
      headers: {
        authorization: `Bearer ${token}`,
        "anthropic-beta": OAUTH_BETA_HEADER,
        "user-agent": USER_AGENT
      },
      // The bearer token must never be forwarded anywhere but the URL above. This endpoint
      // has no reason to redirect, so treat any redirect as a failure rather than following
      // it (older Node 18 fetch implementations did not reliably strip Authorization on a
      // cross-origin redirect).
      redirect: "error",
      signal: controller.signal
    });
    if (!res.ok) return null;
    const json = await res.json();
    const result = OAuthUsageResponseSchema.safeParse(json);
    return result.success ? extractSlots(result.data) : null;
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}
function hasExpiredSlot(slots, nowMs) {
  return Object.values(slots).some((slot) => slot != null && slot.resetsAt * 1e3 <= nowMs);
}
async function getOAuthUsageSlots() {
  const cache2 = await readCache();
  const now = Date.now();
  if (cache2) {
    const ttl = hasExpiredSlot(cache2.slots, now) ? EXPIRED_TTL_MS : TTL_MS;
    if (now - cache2.fetchedAt < ttl) return cache2.slots;
  }
  if (cache2?.failedAt != null && now - cache2.failedAt < FAILURE_BACKOFF_MS) {
    return cache2.slots;
  }
  const token = await readAccessToken();
  if (!token) {
    return cache2?.slots ?? EMPTY_SLOTS;
  }
  const slots = await fetchOAuthSlots(token);
  if (slots) {
    await writeCache({ fetchedAt: now, slots });
    return slots;
  }
  const stale = cache2 ?? { fetchedAt: 0, slots: EMPTY_SLOTS };
  await writeCache({ ...stale, failedAt: now });
  return stale.slots;
}

// src/data/claude-settings.ts
import fs3 from "fs";
import path2 from "path";
var ClaudeSettingsSchema = external_exports.object({
  // Session-scoped flag, normally supplied via --settings. `/effort ultracode` picked in
  // the TUI never lands here, so this only catches sessions pinned through the file — and
  // it is the only channel that distinguishes ultracode from plain xhigh at all.
  ultracode: external_exports.boolean().optional()
});
async function readClaudeSettings() {
  const settingsPath = path2.join(getClaudeDir(), "settings.json");
  try {
    const raw = await fs3.promises.readFile(settingsPath, "utf8");
    const result = ClaudeSettingsSchema.safeParse(JSON.parse(raw));
    return result.success ? result.data : {};
  } catch {
    return {};
  }
}

// src/render/index.ts
var CACHE_DIR2 = process.env.XDG_CACHE_HOME ? join2(process.env.XDG_CACHE_HOME, "festatusline") : join2(homedir2(), ".cache", "festatusline");
var RATE_LIMITS_CACHE_PATH = join2(CACHE_DIR2, "rate_limits.json");
var RateLimitsCacheSchema = RateLimitsSchema;
async function tryOrNull(fn) {
  try {
    return await fn();
  } catch {
    return null;
  }
}
async function readRateLimitsCache() {
  return tryOrNull(async () => {
    const raw = await fs4.readFile(RATE_LIMITS_CACHE_PATH, "utf8");
    const result = RateLimitsCacheSchema.safeParse(JSON.parse(raw));
    return result.success ? result.data : null;
  });
}
async function writeRateLimitsCache(rateLimits) {
  await tryOrNull(async () => {
    await fs4.mkdir(CACHE_DIR2, { recursive: true });
    await fs4.writeFile(RATE_LIMITS_CACHE_PATH, JSON.stringify(rateLimits), "utf8");
  });
}
function toRateLimitPeriod(slot) {
  return slot ? { used_percentage: slot.usedPercent, resets_at: slot.resetsAt } : null;
}
function usablePeriod(period) {
  return period && period.resets_at != null ? period : null;
}
function hasUsableRateLimit(rateLimits) {
  return usablePeriod(rateLimits?.five_hour) != null || usablePeriod(rateLimits?.seven_day) != null;
}
var SAME_WINDOW_TOLERANCE_S = 120;
function fresher(a, b) {
  if (!a) return b;
  if (!b) return a;
  const windowGap = (b.resets_at ?? 0) - (a.resets_at ?? 0);
  if (Math.abs(windowGap) > SAME_WINDOW_TOLERANCE_S) return windowGap > 0 ? b : a;
  return (b.used_percentage ?? 0) > (a.used_percentage ?? 0) ? b : a;
}
function mergeRateLimits(stdinRateLimits, oauthSlots, cachedRateLimits) {
  const pick = (stdin, oauth, cached) => {
    const local = usablePeriod(stdin) ?? usablePeriod(cached);
    return fresher(local, toRateLimitPeriod(oauth ?? null)) ?? void 0;
  };
  const fiveHour = pick(
    stdinRateLimits?.five_hour,
    oauthSlots?.session,
    cachedRateLimits?.five_hour
  );
  const sevenDay = pick(
    stdinRateLimits?.seven_day,
    oauthSlots?.weekly,
    cachedRateLimits?.seven_day
  );
  return fiveHour || sevenDay ? { five_hour: fiveHour, seven_day: sevenDay } : void 0;
}
async function renderFromStdin() {
  const [
    stdin,
    settings,
    claudeSettings,
    usage,
    codex,
    oauthSlots,
    cachedRateLimits,
    lastCacheCreation
  ] = await Promise.all([
    readStdin(),
    loadSettings(),
    readClaudeSettings(),
    tryOrNull(getUsageSnapshot),
    tryOrNull(getCodexSnapshot),
    tryOrNull(getOAuthUsageSlots),
    readRateLimitsCache(),
    tryOrNull(getLastCacheCreation)
  ]);
  const t2 = createTranslator(settings.locale);
  if (hasUsableRateLimit(stdin.rate_limits)) {
    writeRateLimitsCache(stdin.rate_limits).catch(() => {
    });
  }
  const cacheCreated = stdin.context_window?.current_usage?.cache_creation_input_tokens;
  const cacheTtlCreatedAt = cacheCreated && cacheCreated > 0 ? Date.now() : lastCacheCreation?.timestamp ?? null;
  const cacheTtlMs = lastCacheCreation?.ttlMs ?? 3e5;
  let sessionLastModel = null;
  if (!stdin.model && stdin.transcript_path) {
    const transcriptPath = stdin.transcript_path;
    sessionLastModel = await tryOrNull(() => getLastModelFromTranscript(transcriptPath));
  }
  const theme = getTheme(settings.theme);
  const ctx = {
    stdin: {
      ...stdin,
      rate_limits: mergeRateLimits(stdin.rate_limits, oauthSlots, cachedRateLimits)
    },
    usage,
    codex,
    fableRateLimit: oauthSlots?.fable ?? null,
    sessionLastModel,
    theme,
    t: t2,
    now: /* @__PURE__ */ new Date(),
    weeklyAnchorDay: settings.weeklyAnchorDay,
    envEffortLevel: process.env.CLAUDE_EFFORT,
    ultracode: claudeSettings.ultracode,
    cacheTtlCreatedAt,
    cacheTtlMs
  };
  const output = renderAllLines(resolveLines(settings), ctx, settings.separator);
  process.stdout.write(`${output}
`);
}

// src/config/install.ts
import fs5 from "fs";
import path3 from "path";
import { fileURLToPath } from "url";
var ClaudeSettingsSchema2 = external_exports.object({ statusLine: external_exports.record(external_exports.unknown()).optional() }).catchall(external_exports.unknown());
function getClaudeSettingsPath() {
  return path3.join(getClaudeDir(), "settings.json");
}
async function resolveCliPath() {
  const pluginCacheBase = path3.join(
    getClaudeDir(),
    "plugins",
    "cache",
    "festatusline",
    "festatusline"
  );
  try {
    const versions = await fs5.promises.readdir(pluginCacheBase);
    const sorted = versions.filter((v) => /^\d+\.\d+\.\d+$/.test(v)).sort((a, b) => a.localeCompare(b, void 0, { numeric: true }));
    const latest = sorted.at(-1);
    if (latest) {
      return path3.join(pluginCacheBase, latest, "dist", "cli.js");
    }
  } catch {
  }
  return fileURLToPath(import.meta.url);
}
async function installToClaude(force = false) {
  const settingsPath = getClaudeSettingsPath();
  let current = {};
  try {
    const raw = await fs5.promises.readFile(settingsPath, "utf8");
    const parsed = ClaudeSettingsSchema2.safeParse(JSON.parse(raw));
    if (parsed.success) current = parsed.data;
  } catch {
  }
  if (current.statusLine && !force) {
    process.stdout.write(`${t("install.alreadySet")}
`);
    process.stdout.write(`${t("install.currentConfig")} ${JSON.stringify(current.statusLine)}
`);
    process.stdout.write(`${t("install.overwriteHint")}
`);
    return;
  }
  const backup = `${settingsPath}.bak`;
  if (Object.keys(current).length > 0) {
    await fs5.promises.writeFile(backup, `${JSON.stringify(current, null, 2)}
`, "utf8");
  }
  const cliPath = await resolveCliPath();
  current.statusLine = {
    type: "command",
    command: `node ${cliPath}`,
    refreshIntervalMs: 6e4
  };
  await fs5.promises.mkdir(path3.dirname(settingsPath), { recursive: true });
  await fs5.promises.writeFile(settingsPath, `${JSON.stringify(current, null, 2)}
`, "utf8");
  process.stdout.write(`${t("install.success")}
`);
}

// src/config/doctor.ts
import fs6 from "fs";
import path4 from "path";
import os from "os";
async function exists(p) {
  try {
    await fs6.promises.access(p);
    return true;
  } catch {
    return false;
  }
}
async function runDoctor() {
  const claudeDir = getClaudeDir();
  const codexDir = process.env.CODEX_CONFIG_DIR ?? process.env.CODEX_HOME ?? path4.join(os.homedir(), ".codex");
  const claudeOk = await exists(claudeDir);
  const codexOk = await exists(codexDir);
  process.stdout.write(
    `${t("doctor.claudeDir")}: ${claudeDir} \u2014 ${claudeOk ? t("doctor.found") : t("doctor.notFound")}
`
  );
  process.stdout.write(
    `${t("doctor.codexDir")}: ${codexDir} \u2014 ${codexOk ? t("doctor.found") : t("doctor.notFound")}
`
  );
}

// src/cli.ts
source_default.level = 3;
function isLocale(v) {
  return v === "ko" || v === "en" || v === "zh";
}
var commands = {
  setup: async () => {
    const { runSetupWizard } = await import("./setup-YGKCCL7E.js");
    return runSetupWizard();
  },
  install: (args) => installToClaude(args.includes("--force")),
  doctor: () => runDoctor()
};
async function dispatch(argv) {
  const [, , sub, ...rest] = argv;
  const cmd = sub ? commands[sub] : void 0;
  if (cmd) {
    await cmd(rest);
    return;
  }
  if (!process.stdin.isTTY) {
    await renderFromStdin();
    return;
  }
  const { runTui } = await import("./tui-IW7U2ZZO.js");
  await runTui();
}
async function main() {
  const settings = await loadSettings();
  const envLocale = process.env.FESTATUSLINE_LOCALE;
  setLocale(isLocale(envLocale) ? envLocale : settings.locale);
  await dispatch(process.argv);
}
main().catch((err) => {
  process.stderr.write(`festatusline error: ${String(err)}
`);
  process.exit(1);
});
//# sourceMappingURL=cli.js.map