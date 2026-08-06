#!/usr/bin/env node
import {
  createTranslator,
  external_exports,
  getClaudeDir,
  getTheme,
  loadSettings,
  renderAllLines,
  setLocale,
  source_default,
  t
} from "./chunk-AGLANR4T.js";

// src/render/index.ts
import { promises as fs5 } from "fs";
import { homedir } from "os";
import { join } from "path";

// src/data/stdin.ts
var ModelSchema = external_exports.object({
  id: external_exports.string(),
  display_name: external_exports.string().optional(),
  max_output_tokens: external_exports.number().optional()
});
var ContextWindowCurrentUsageSchema = external_exports.object({
  input_tokens: external_exports.number().optional(),
  output_tokens: external_exports.number().optional(),
  cache_creation_input_tokens: external_exports.number().optional(),
  cache_read_input_tokens: external_exports.number().optional()
});
var ContextWindowSchema = external_exports.object({
  total_input_tokens: external_exports.number().optional(),
  total_output_tokens: external_exports.number().optional(),
  context_window_size: external_exports.number().optional(),
  current_usage: ContextWindowCurrentUsageSchema.optional(),
  used_percentage: external_exports.number().optional(),
  remaining_percentage: external_exports.number().optional()
});
var RateLimitPeriodSchema = external_exports.object({
  used_percentage: external_exports.number().optional(),
  resets_at: external_exports.number().optional()
});
var RateLimitsSchema = external_exports.object({
  five_hour: RateLimitPeriodSchema.optional(),
  seven_day: RateLimitPeriodSchema.optional()
});
var CostSchema = external_exports.object({
  total_cost_usd: external_exports.number().optional(),
  total_duration_ms: external_exports.number().optional(),
  total_api_duration_ms: external_exports.number().optional()
});
var WorkspaceSchema = external_exports.object({
  current_dir: external_exports.string().optional(),
  project_dir: external_exports.string().optional()
});
var OutputStyleSchema = external_exports.object({
  name: external_exports.string().optional()
});
var ClaudeStdinSchema = external_exports.object({
  type: external_exports.string().optional(),
  model: ModelSchema.optional(),
  session_id: external_exports.string().optional(),
  session_name: external_exports.string().optional(),
  transcript_path: external_exports.string().optional(),
  cwd: external_exports.string().optional(),
  cost: CostSchema.optional(),
  context_window: ContextWindowSchema.optional(),
  workspace: WorkspaceSchema.optional(),
  hook_event_name: external_exports.string().optional(),
  version: external_exports.string().optional(),
  output_style: OutputStyleSchema.optional(),
  rate_limits: RateLimitsSchema.optional(),
  exceeds_200k_tokens: external_exports.boolean().optional()
});
async function readStdin() {
  return new Promise((resolve, reject) => {
    const chunks = [];
    process.stdin.on("data", (chunk) => chunks.push(chunk));
    process.stdin.on("end", () => {
      const raw = Buffer.concat(chunks).toString("utf8").trim();
      if (!raw) {
        resolve({});
        return;
      }
      try {
        const parsed = ClaudeStdinSchema.parse(JSON.parse(raw));
        resolve(parsed);
      } catch {
        resolve({});
      }
    });
    process.stdin.on("error", reject);
  });
}

// src/data/jsonl.ts
import fs2 from "fs";
import path from "path";
import readline from "readline";

// src/data/cache.ts
import { promises as fs } from "fs";
function createTtlCache(ttlMs) {
  let cached = null;
  return {
    async get(compute) {
      const now = Date.now();
      if (cached && now - cached.loadedAt < ttlMs) {
        return cached.value;
      }
      const value = await compute();
      cached = { value, loadedAt: now };
      return value;
    },
    invalidate() {
      cached = null;
    }
  };
}
function createMtimeCache() {
  const store = /* @__PURE__ */ new Map();
  return {
    async get(filePath, compute) {
      const stat = await fs.stat(filePath);
      const mtime = stat.mtimeMs;
      const entry = store.get(filePath);
      if (entry && entry.mtime === mtime) {
        return entry.value;
      }
      const value = await compute(filePath);
      store.set(filePath, { mtime, value });
      return value;
    }
  };
}

// src/data/jsonl.ts
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
    const stream = fs2.createReadStream(p, { encoding: "utf8" });
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
    projectDirs = await fs2.promises.readdir(projectsDir);
  } catch {
    return [];
  }
  const all = [];
  await Promise.all(
    projectDirs.map(async (dir) => {
      const dirPath = path.join(projectsDir, dir);
      let files;
      try {
        files = await fs2.promises.readdir(dirPath);
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

// src/data/time.ts
function getTimeWindows() {
  const now = Date.now();
  const todayStart = /* @__PURE__ */ new Date();
  todayStart.setHours(0, 0, 0, 0);
  return { now, todayStartMs: todayStart.getTime(), weekStartMs: now - 7 * 24 * 60 * 60 * 1e3 };
}

// src/data/usage.ts
function totalTokens(e) {
  return e.inputTokens + e.outputTokens + e.cacheCreationTokens + e.cacheReadTokens;
}
function isSonnet(model) {
  return /sonnet/i.test(model);
}
var cache = createTtlCache(3e4);
async function getUsageSnapshot() {
  return cache.get(async () => {
    const entries = await loadAllEntries();
    const { todayStartMs, weekStartMs } = getTimeWindows();
    let dailyTokens = 0;
    let weeklyTokens = 0;
    let sonnetWeeklyTokens = 0;
    let lastModel = null;
    let lastTimestamp = 0;
    for (const e of entries) {
      const total = totalTokens(e);
      if (e.timestamp >= todayStartMs) dailyTokens += total;
      if (e.timestamp >= weekStartMs) {
        weeklyTokens += total;
        if (isSonnet(e.model)) sonnetWeeklyTokens += total;
      }
      if (e.model && e.timestamp > lastTimestamp) {
        lastTimestamp = e.timestamp;
        lastModel = e.model;
      }
    }
    return { dailyTokens, weeklyTokens, sonnetWeeklyTokens, allEntries: entries, lastModel };
  });
}

// src/data/codex.ts
import fs3 from "fs";
import path2 from "path";
import os from "os";
import readline2 from "readline";
var RateLimitSlotSchema = external_exports.object({
  used_percent: external_exports.number().optional().default(0),
  resets_at: external_exports.number()
});
var CodexEventSchema = external_exports.object({
  type: external_exports.literal("event_msg"),
  payload: external_exports.object({
    type: external_exports.literal("token_count"),
    rate_limits: external_exports.object({
      primary: RateLimitSlotSchema,
      secondary: RateLimitSlotSchema
    })
  })
});
function getCodexDir() {
  return process.env.CODEX_CONFIG_DIR ?? path2.join(os.homedir(), ".codex");
}
async function readCodexModel() {
  try {
    const raw = await fs3.promises.readFile(path2.join(getCodexDir(), "config.toml"), "utf8");
    const match = raw.match(/^model\s*=\s*"([^"]+)"/m);
    return match?.[1] ?? null;
  } catch {
    return null;
  }
}
async function findHistoryFile() {
  const base = getCodexDir();
  const candidates = [path2.join(base, "history.jsonl"), path2.join(base, "sessions")];
  for (const c of candidates) {
    try {
      await fs3.promises.access(c);
      return c;
    } catch {
      continue;
    }
  }
  return null;
}
async function findLatestSessionFile() {
  const sessionsDir = path2.join(getCodexDir(), "sessions");
  try {
    const years = (await fs3.promises.readdir(sessionsDir)).filter((y) => /^\d{4}$/.test(y)).sort().reverse();
    for (const year of years) {
      const months = (await fs3.promises.readdir(path2.join(sessionsDir, year))).sort().reverse();
      for (const month of months) {
        const days = (await fs3.promises.readdir(path2.join(sessionsDir, year, month))).sort().reverse();
        for (const day of days) {
          const dayDir = path2.join(sessionsDir, year, month, day);
          const files = (await fs3.promises.readdir(dayDir)).filter((f) => f.endsWith(".jsonl")).sort().reverse();
          if (files.length > 0) return path2.join(dayDir, files[0]);
        }
      }
    }
  } catch (_e) {
  }
  return null;
}
async function readLastRateLimits(filePath) {
  const stream = fs3.createReadStream(filePath, { encoding: "utf8" });
  const rl = readline2.createInterface({ input: stream, crlfDelay: Infinity });
  let last = null;
  for await (const line of rl) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    try {
      const result = CodexEventSchema.safeParse(JSON.parse(trimmed));
      if (!result.success) continue;
      const { rate_limits: r } = result.data.payload;
      last = {
        primary: { usedPercent: r.primary.used_percent, resetsAt: r.primary.resets_at },
        secondary: { usedPercent: r.secondary.used_percent, resetsAt: r.secondary.resets_at }
      };
    } catch (_e) {
    }
  }
  return last;
}
async function countSessionFiles(sessionsDir) {
  const { todayStartMs, weekStartMs } = getTimeWindows();
  let daily = 0;
  let weekly = 0;
  try {
    for (const year of await fs3.promises.readdir(sessionsDir)) {
      if (!/^\d{4}$/.test(year)) continue;
      for (const month of await fs3.promises.readdir(path2.join(sessionsDir, year))) {
        for (const day of await fs3.promises.readdir(path2.join(sessionsDir, year, month))) {
          const dayMs = new Date(Number(year), Number(month) - 1, Number(day)).getTime();
          if (dayMs + 864e5 <= weekStartMs) continue;
          const files = (await fs3.promises.readdir(path2.join(sessionsDir, year, month, day))).filter((f) => f.endsWith(".jsonl")).length;
          if (dayMs >= todayStartMs) daily += files;
          weekly += files;
        }
      }
    }
  } catch {
  }
  return { daily, weekly };
}
var codexCache = createTtlCache(3e4);
async function getCodexSnapshot() {
  return codexCache.get(async () => {
    const histPath = await findHistoryFile();
    if (!histPath) {
      return {
        available: false,
        dailyRequests: 0,
        weeklyRequests: 0,
        rateLimits: null,
        model: null
      };
    }
    const [stat, latestSession, model] = await Promise.all([
      fs3.promises.stat(histPath),
      findLatestSessionFile(),
      readCodexModel()
    ]);
    const rateLimits = latestSession ? await readLastRateLimits(latestSession) : null;
    if (stat.isDirectory()) {
      const { daily: daily2, weekly: weekly2 } = await countSessionFiles(histPath);
      return { available: true, dailyRequests: daily2, weeklyRequests: weekly2, rateLimits, model };
    }
    const { todayStartMs, weekStartMs } = getTimeWindows();
    let daily = 0;
    let weekly = 0;
    const stream = fs3.createReadStream(histPath, { encoding: "utf8" });
    const rl = readline2.createInterface({ input: stream, crlfDelay: Infinity });
    for await (const line of rl) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      try {
        const obj = JSON.parse(trimmed);
        const ts = obj.timestamp ? new Date(obj.timestamp).getTime() : 0;
        if (ts >= todayStartMs) daily += 1;
        if (ts >= weekStartMs) weekly += 1;
      } catch (_e) {
      }
    }
    return { available: true, dailyRequests: daily, weeklyRequests: weekly, rateLimits, model };
  });
}

// src/data/claude-settings.ts
import fs4 from "fs";
import path3 from "path";
var ClaudeSettingsSchema = external_exports.object({
  effortLevel: external_exports.string().optional()
});
async function readClaudeSettings() {
  const settingsPath = path3.join(getClaudeDir(), "settings.json");
  try {
    const raw = await fs4.promises.readFile(settingsPath, "utf8");
    const result = ClaudeSettingsSchema.safeParse(JSON.parse(raw));
    return result.success ? result.data : {};
  } catch {
    return {};
  }
}

// src/render/index.ts
var CACHE_DIR = process.env.XDG_CACHE_HOME ? join(process.env.XDG_CACHE_HOME, "festatusline") : join(homedir(), ".cache", "festatusline");
var RATE_LIMITS_CACHE_PATH = join(CACHE_DIR, "rate_limits.json");
var RateLimitPeriodSchema2 = external_exports.object({
  used_percentage: external_exports.number().optional(),
  resets_at: external_exports.number().optional()
});
var RateLimitsCacheSchema = external_exports.object({
  five_hour: RateLimitPeriodSchema2.optional(),
  seven_day: RateLimitPeriodSchema2.optional()
});
async function tryOrNull(fn) {
  try {
    return await fn();
  } catch {
    return null;
  }
}
async function readRateLimitsCache() {
  return tryOrNull(async () => {
    const raw = await fs5.readFile(RATE_LIMITS_CACHE_PATH, "utf8");
    const result = RateLimitsCacheSchema.safeParse(JSON.parse(raw));
    return result.success ? result.data : null;
  });
}
async function writeRateLimitsCache(rateLimits) {
  await tryOrNull(async () => {
    await fs5.mkdir(CACHE_DIR, { recursive: true });
    await fs5.writeFile(RATE_LIMITS_CACHE_PATH, JSON.stringify(rateLimits), "utf8");
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
  const theme = getTheme(settings.theme);
  const ctx = {
    stdin: {
      ...stdin,
      rate_limits: stdin.rate_limits ?? cachedRateLimits ?? void 0
    },
    usage,
    codex,
    theme,
    t: t2,
    now: /* @__PURE__ */ new Date(),
    weeklyAnchorDay: settings.weeklyAnchorDay,
    effortLevel: claudeSettings.effortLevel,
    cacheTtlCreatedAt,
    cacheTtlMs
  };
  const output = renderAllLines(settings.lines, ctx, settings.separator);
  process.stdout.write(`${output}
`);
}

// src/config/install.ts
import fs6 from "fs";
import path4 from "path";
import { fileURLToPath } from "url";
var ClaudeSettingsSchema2 = external_exports.object({ statusLine: external_exports.record(external_exports.unknown()).optional() }).catchall(external_exports.unknown());
function getClaudeSettingsPath() {
  return path4.join(getClaudeDir(), "settings.json");
}
async function resolveCliPath() {
  const pluginCacheBase = path4.join(
    getClaudeDir(),
    "plugins",
    "cache",
    "festatusline",
    "festatusline"
  );
  try {
    const versions = await fs6.promises.readdir(pluginCacheBase);
    const sorted = versions.filter((v) => /^\d+\.\d+\.\d+$/.test(v)).sort((a, b) => a.localeCompare(b, void 0, { numeric: true }));
    const latest = sorted.at(-1);
    if (latest) {
      return path4.join(pluginCacheBase, latest, "dist", "cli.js");
    }
  } catch {
  }
  return fileURLToPath(import.meta.url);
}
async function installToClaude(force = false) {
  const settingsPath = getClaudeSettingsPath();
  let current = {};
  try {
    const raw = await fs6.promises.readFile(settingsPath, "utf8");
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
    await fs6.promises.writeFile(backup, `${JSON.stringify(current, null, 2)}
`, "utf8");
  }
  const cliPath = await resolveCliPath();
  current.statusLine = {
    type: "command",
    command: `node ${cliPath}`,
    refreshIntervalMs: 6e4
  };
  await fs6.promises.mkdir(path4.dirname(settingsPath), { recursive: true });
  await fs6.promises.writeFile(settingsPath, `${JSON.stringify(current, null, 2)}
`, "utf8");
  process.stdout.write(`${t("install.success")}
`);
}

// src/config/doctor.ts
import fs7 from "fs";
import path5 from "path";
import os2 from "os";
async function exists(p) {
  try {
    await fs7.promises.access(p);
    return true;
  } catch {
    return false;
  }
}
async function runDoctor() {
  const claudeDir = getClaudeDir();
  const codexDir = process.env.CODEX_CONFIG_DIR ?? path5.join(os2.homedir(), ".codex");
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
    const { runSetupWizard } = await import("./setup-GZLPJ53B.js");
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
  const { runTui } = await import("./tui-PGUC6YXE.js");
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