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
  isSonnetModel,
  loadSettings,
  modelFamily,
  renderAllLines,
  setLocale,
  source_default,
  t,
  weightedCost
} from "./chunk-VGK3S3F3.js";

// src/render/index.ts
import { promises as fs3 } from "fs";
import { homedir } from "os";
import { join } from "path";

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
      }
    }
    return {
      dailyTokens,
      weeklyTokens,
      sonnetWeeklyTokens,
      weightedDaily,
      weightedWeekly,
      weightedWeeklyByFamily,
      allEntries: entries
    };
  });
}

// src/data/claude-settings.ts
import fs2 from "fs";
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
    const raw = await fs2.promises.readFile(settingsPath, "utf8");
    const result = ClaudeSettingsSchema.safeParse(JSON.parse(raw));
    return result.success ? result.data : {};
  } catch {
    return {};
  }
}

// src/render/index.ts
var CACHE_DIR = process.env.XDG_CACHE_HOME ? join(process.env.XDG_CACHE_HOME, "festatusline") : join(homedir(), ".cache", "festatusline");
var RATE_LIMITS_CACHE_PATH = join(CACHE_DIR, "rate_limits.json");
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
    const raw = await fs3.readFile(RATE_LIMITS_CACHE_PATH, "utf8");
    const result = RateLimitsCacheSchema.safeParse(JSON.parse(raw));
    return result.success ? result.data : null;
  });
}
async function writeRateLimitsCache(rateLimits) {
  await tryOrNull(async () => {
    await fs3.mkdir(CACHE_DIR, { recursive: true });
    await fs3.writeFile(RATE_LIMITS_CACHE_PATH, JSON.stringify(rateLimits), "utf8");
  });
}
async function renderFromStdin() {
  const [stdin, settings, claudeSettings, usage, codex, cachedRateLimits, lastCacheCreation] = await Promise.all([
    readStdin(),
    loadSettings(),
    readClaudeSettings(),
    tryOrNull(getUsageSnapshot),
    tryOrNull(getCodexSnapshot),
    readRateLimitsCache(),
    tryOrNull(getLastCacheCreation)
  ]);
  const t2 = createTranslator(settings.locale);
  if (stdin.rate_limits) {
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
      rate_limits: stdin.rate_limits ?? cachedRateLimits ?? void 0
    },
    usage,
    codex,
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
  const output = renderAllLines(settings.lines, ctx, settings.separator);
  process.stdout.write(`${output}
`);
}

// src/config/install.ts
import fs4 from "fs";
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
    const versions = await fs4.promises.readdir(pluginCacheBase);
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
    const raw = await fs4.promises.readFile(settingsPath, "utf8");
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
    await fs4.promises.writeFile(backup, `${JSON.stringify(current, null, 2)}
`, "utf8");
  }
  const cliPath = await resolveCliPath();
  current.statusLine = {
    type: "command",
    command: `node ${cliPath}`,
    refreshIntervalMs: 6e4
  };
  await fs4.promises.mkdir(path3.dirname(settingsPath), { recursive: true });
  await fs4.promises.writeFile(settingsPath, `${JSON.stringify(current, null, 2)}
`, "utf8");
  process.stdout.write(`${t("install.success")}
`);
}

// src/config/doctor.ts
import fs5 from "fs";
import path4 from "path";
import os from "os";
async function exists(p) {
  try {
    await fs5.promises.access(p);
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
    const { runSetupWizard } = await import("./setup-HYYXIEO6.js");
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
  const { runTui } = await import("./tui-BZDUYLAV.js");
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