#!/usr/bin/env node

// src/cli.ts
import chalk4 from "chalk";

// src/render/index.ts
import { promises as fs6 } from "fs";
import { homedir } from "os";
import { join } from "path";
import { z as z6 } from "zod";

// src/data/stdin.ts
import { z } from "zod";
var ModelSchema = z.object({
  id: z.string(),
  display_name: z.string().optional(),
  max_output_tokens: z.number().optional()
});
var ContextWindowCurrentUsageSchema = z.object({
  input_tokens: z.number().optional(),
  output_tokens: z.number().optional(),
  cache_creation_input_tokens: z.number().optional(),
  cache_read_input_tokens: z.number().optional()
});
var ContextWindowSchema = z.object({
  total_input_tokens: z.number().optional(),
  total_output_tokens: z.number().optional(),
  context_window_size: z.number().optional(),
  current_usage: ContextWindowCurrentUsageSchema.optional(),
  used_percentage: z.number().optional(),
  remaining_percentage: z.number().optional()
});
var RateLimitPeriodSchema = z.object({
  used_percentage: z.number().optional(),
  resets_at: z.number().optional()
});
var RateLimitsSchema = z.object({
  five_hour: RateLimitPeriodSchema.optional(),
  seven_day: RateLimitPeriodSchema.optional()
});
var CostSchema = z.object({
  total_cost_usd: z.number().optional(),
  total_duration_ms: z.number().optional(),
  total_api_duration_ms: z.number().optional()
});
var WorkspaceSchema = z.object({
  current_dir: z.string().optional(),
  project_dir: z.string().optional()
});
var OutputStyleSchema = z.object({
  name: z.string().optional()
});
var ClaudeStdinSchema = z.object({
  type: z.string().optional(),
  model: ModelSchema.optional(),
  session_id: z.string().optional(),
  session_name: z.string().optional(),
  transcript_path: z.string().optional(),
  cwd: z.string().optional(),
  cost: CostSchema.optional(),
  context_window: ContextWindowSchema.optional(),
  workspace: WorkspaceSchema.optional(),
  hook_event_name: z.string().optional(),
  version: z.string().optional(),
  output_style: OutputStyleSchema.optional(),
  rate_limits: RateLimitsSchema.optional(),
  exceeds_200k_tokens: z.boolean().optional()
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
import os from "os";
import { z as z2 } from "zod";

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
var UsageSchema = z2.object({
  input_tokens: z2.number().optional().default(0),
  output_tokens: z2.number().optional().default(0),
  cache_creation_input_tokens: z2.number().optional().default(0),
  cache_read_input_tokens: z2.number().optional().default(0),
  cache_creation: z2.object({
    ephemeral_5m_input_tokens: z2.number().optional().default(0),
    ephemeral_1h_input_tokens: z2.number().optional().default(0)
  }).optional()
});
var JsonlLineSchema = z2.object({
  timestamp: z2.string().optional(),
  model: z2.string().optional(),
  message: z2.object({
    model: z2.string().optional(),
    usage: UsageSchema.optional()
  }).optional(),
  usage: UsageSchema.optional()
});
var fileCache = createMtimeCache();
function getClaudeDir() {
  return process.env.CLAUDE_CONFIG_DIR ?? path.join(os.homedir(), ".claude");
}
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
    const now = Date.now();
    const todayStart = /* @__PURE__ */ new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayStartMs = todayStart.getTime();
    const weekStartMs = now - 7 * 24 * 60 * 60 * 1e3;
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
import os2 from "os";
import readline2 from "readline";
import { z as z3 } from "zod";
var RateLimitSlotSchema = z3.object({
  used_percent: z3.number().optional().default(0),
  resets_at: z3.number()
});
var CodexEventSchema = z3.object({
  type: z3.literal("event_msg"),
  payload: z3.object({
    type: z3.literal("token_count"),
    rate_limits: z3.object({
      primary: RateLimitSlotSchema,
      secondary: RateLimitSlotSchema
    })
  })
});
function getCodexDir() {
  return process.env.CODEX_CONFIG_DIR ?? path2.join(os2.homedir(), ".codex");
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
      return { available: true, dailyRequests: 0, weeklyRequests: 0, rateLimits, model };
    }
    const now = Date.now();
    const todayStart = /* @__PURE__ */ new Date();
    todayStart.setHours(0, 0, 0, 0);
    const weekStart = now - 7 * 24 * 60 * 60 * 1e3;
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
        if (ts >= todayStart.getTime()) daily += 1;
        if (ts >= weekStart) weekly += 1;
      } catch (_e) {
      }
    }
    return { available: true, dailyRequests: daily, weeklyRequests: weekly, rateLimits, model };
  });
}

// src/data/claude-settings.ts
import fs4 from "fs";
import path3 from "path";
import os3 from "os";
import { z as z4 } from "zod";
var ClaudeSettingsSchema = z4.object({
  effortLevel: z4.string().optional()
});
async function readClaudeSettings() {
  const dir = process.env.CLAUDE_CONFIG_DIR ?? path3.join(os3.homedir(), ".claude");
  const settingsPath = path3.join(dir, "settings.json");
  try {
    const raw = await fs4.promises.readFile(settingsPath, "utf8");
    const result = ClaudeSettingsSchema.safeParse(JSON.parse(raw));
    return result.success ? result.data : {};
  } catch {
    return {};
  }
}

// src/config/load.ts
import fs5 from "fs";
import path4 from "path";
import os4 from "os";

// src/config/schema.ts
import { z as z5 } from "zod";
var WidgetConfigSchema = z5.object({
  id: z5.string(),
  color: z5.string().optional()
});
var SettingsSchema = z5.object({
  lines: z5.array(z5.array(WidgetConfigSchema)).default([
    [{ id: "dailyUsage" }, { id: "context" }, { id: "rateLimit" }],
    [{ id: "weeklyUsage" }, { id: "weeklyRateLimit" }],
    [{ id: "model" }, { id: "claudePeak" }]
  ]),
  theme: z5.string().default("default"),
  locale: z5.enum(["ko", "en", "zh"]).default("en"),
  weeklyAnchorDay: z5.number().min(0).max(6).nullable().default(null),
  separator: z5.string().default(" \u2502 ")
});

// src/config/load.ts
function getConfigPath() {
  const dir = process.env.XDG_CONFIG_HOME ?? path4.join(os4.homedir(), ".config");
  return path4.join(dir, "festatusline", "settings.json");
}
async function loadSettings() {
  const configPath = getConfigPath();
  try {
    const raw = await fs5.promises.readFile(configPath, "utf8");
    return SettingsSchema.parse(JSON.parse(raw));
  } catch {
    return SettingsSchema.parse({});
  }
}

// src/theme/themes.ts
var themes = {
  default: {
    name: "default",
    fg: "#ffffff",
    bg: "#1e1e2e",
    accent: "#89b4fa",
    warn: "#f9e2af",
    danger: "#f38ba8",
    muted: "#6c7086",
    separator: "\u2502"
  },
  dracula: {
    name: "dracula",
    fg: "#f8f8f2",
    bg: "#282a36",
    accent: "#bd93f9",
    warn: "#f1fa8c",
    danger: "#ff5555",
    muted: "#6272a4",
    separator: ""
  },
  nord: {
    name: "nord",
    fg: "#eceff4",
    bg: "#2e3440",
    accent: "#88c0d0",
    warn: "#ebcb8b",
    danger: "#bf616a",
    muted: "#4c566a",
    separator: ""
  },
  gruvbox: {
    name: "gruvbox",
    fg: "#ebdbb2",
    bg: "#282828",
    accent: "#83a598",
    warn: "#fabd2f",
    danger: "#fb4934",
    muted: "#928374",
    separator: ""
  },
  "tokyo-night": {
    name: "tokyo-night",
    fg: "#a9b1d6",
    bg: "#1a1b26",
    accent: "#7aa2f7",
    warn: "#e0af68",
    danger: "#f7768e",
    muted: "#565f89",
    separator: ""
  }
};
var THEME_NAMES = Object.keys(themes);

// src/theme/index.ts
function getTheme(name) {
  return themes[name] ?? themes.default;
}

// src/i18n/ko.ts
var ko = {
  "widget.model": "\uBAA8\uB378",
  "widget.context": "\uCEE8\uD14D\uC2A4\uD2B8",
  "widget.peakTime": "\uD53C\uD06C \uC2DC\uAC04\uB300",
  "widget.dailyUsage": "\uC77C\uAC04 \uC0AC\uC6A9\uB7C9",
  "widget.dailyReset": "\uC77C\uAC04 \uCD08\uAE30\uD654",
  "widget.weeklyUsage": "\uC8FC\uAC04 \uC0AC\uC6A9\uB7C9",
  "widget.weeklyReset": "\uC8FC\uAC04 \uCD08\uAE30\uD654",
  "widget.sonnetWeeklyUsage": "\uC18C\uB137 \uC8FC\uAC04 \uC0AC\uC6A9\uB7C9",
  "widget.sonnetWeeklyReset": "\uC18C\uB137 \uC8FC\uAC04 \uCD08\uAE30\uD654",
  "widget.gptUsage": "GPT \uC0AC\uC6A9\uB7C9",
  "widget.codexRateLimit": "Codex 5h \uD55C\uB3C4",
  "widget.codexWeeklyRateLimit": "Codex 7\uC77C \uD55C\uB3C4",
  "widget.spacer": "\uACF5\uBC31",
  "widget.codexModel": "Codex \uBAA8\uB378",
  "widget.rateLimit": "5\uC2DC\uAC04 \uD560\uB2F9\uB7C9",
  "widget.weeklyRateLimit": "7\uC77C \uD560\uB2F9\uB7C9",
  "widget.sessionCost": "\uC138\uC158 \uBE44\uC6A9",
  "widget.cacheHit": "\uCE90\uC2DC \uC801\uC911\uB960",
  "widget.cacheTtl": "\uCE90\uC2DC \uC720\uD6A8\uC2DC\uAC04",
  "widget.claudePeak": "\uD074\uB85C\uB4DC \uD53C\uD06C",
  "widget.gitBranch": "Git \uBE0C\uB79C\uCE58",
  "widget.gitRepo": "Git \uB808\uD3EC",
  "reset.until": "\uAE4C\uC9C0",
  "reset.na": "\u2013",
  "usage.tokens": "\uD1A0\uD070",
  "usage.cost": "\uBE44\uC6A9",
  "peak.none": "\uB370\uC774\uD130 \uC5C6\uC74C",
  "tui.title": "festatusline \uC124\uC815",
  "tui.mainMenu.editWidgets": "\uC704\uC82F \uD3B8\uC9D1",
  "tui.mainMenu.selectPreset": "\uD504\uB9AC\uC14B \uC120\uD0DD",
  "tui.mainMenu.selectTheme": "\uD14C\uB9C8 \uC120\uD0DD",
  "tui.mainMenu.selectLanguage": "\uC5B8\uC5B4 \uC120\uD0DD",
  "tui.mainMenu.install": "Claude Code \uC5D0 \uC124\uCE58",
  "tui.mainMenu.quit": "\uC885\uB8CC",
  "tui.preset.minimal": "\uCD5C\uC18C",
  "tui.preset.full": "\uC804\uCCB4",
  "tui.preset.koreanDev": "\uD55C\uAD6D \uAC1C\uBC1C\uC790",
  "tui.preset.multiCli": "\uBA40\uD2F0 CLI",
  "tui.preset.lite": "Lite",
  "tui.preset.plus": "Plus",
  "tui.preset.pro": "Pro",
  "tui.lang.ko": "\uD55C\uAD6D\uC5B4",
  "tui.lang.en": "English",
  "tui.lang.zh": "\u4E2D\u6587",
  "install.success": "Claude Code \uC124\uC815\uC5D0 festatusline \uC744 \uB4F1\uB85D\uD588\uC2B5\uB2C8\uB2E4.",
  "install.alreadySet": "\uC774\uBBF8 \uB4F1\uB85D\uB418\uC5B4 \uC788\uC2B5\uB2C8\uB2E4.",
  "install.currentConfig": "  \uD604\uC7AC \uC124\uC815:",
  "install.overwriteHint": "  \uB36E\uC5B4\uC4F0\uB824\uBA74: festatusline install --force",
  "doctor.claudeDir": "Claude \uB370\uC774\uD130 \uACBD\uB85C",
  "doctor.codexDir": "Codex \uACBD\uB85C",
  "doctor.found": "\uBC1C\uACAC\uB428",
  "doctor.notFound": "\uC5C6\uC74C"
};

// src/i18n/en.ts
var en = {
  "widget.model": "Model",
  "widget.context": "Context",
  "widget.peakTime": "Peak Time",
  "widget.dailyUsage": "Daily Usage",
  "widget.dailyReset": "Daily Reset",
  "widget.weeklyUsage": "Weekly Usage",
  "widget.weeklyReset": "Weekly Reset",
  "widget.sonnetWeeklyUsage": "Sonnet Weekly",
  "widget.sonnetWeeklyReset": "Sonnet Weekly Reset",
  "widget.gptUsage": "GPT Usage",
  "widget.codexRateLimit": "Codex 5h Limit",
  "widget.codexWeeklyRateLimit": "Codex 7d Limit",
  "widget.spacer": "Spacer",
  "widget.codexModel": "Codex Model",
  "widget.rateLimit": "5h Limit",
  "widget.weeklyRateLimit": "7d Limit",
  "widget.sessionCost": "Session Cost",
  "widget.cacheHit": "Cache Hit",
  "widget.cacheTtl": "Cache TTL",
  "widget.claudePeak": "Claude Peak",
  "widget.gitBranch": "Git Branch",
  "widget.gitRepo": "Git Repo",
  "reset.until": "until reset",
  "reset.na": "\u2013",
  "usage.tokens": "tokens",
  "usage.cost": "cost",
  "peak.none": "no data",
  "tui.title": "festatusline Settings",
  "tui.mainMenu.editWidgets": "Edit Widgets",
  "tui.mainMenu.selectPreset": "Select Preset",
  "tui.mainMenu.selectTheme": "Select Theme",
  "tui.mainMenu.selectLanguage": "Language",
  "tui.mainMenu.install": "Install to Claude Code",
  "tui.mainMenu.quit": "Quit",
  "tui.preset.minimal": "Minimal",
  "tui.preset.full": "Full",
  "tui.preset.koreanDev": "Korean Dev",
  "tui.preset.multiCli": "Multi CLI",
  "tui.preset.lite": "Lite",
  "tui.preset.plus": "Plus",
  "tui.preset.pro": "Pro",
  "tui.lang.ko": "\uD55C\uAD6D\uC5B4",
  "tui.lang.en": "English",
  "tui.lang.zh": "\u4E2D\u6587",
  "install.success": "Registered festatusline in Claude Code settings.",
  "install.alreadySet": "Already registered.",
  "install.currentConfig": "  Current config:",
  "install.overwriteHint": "  To overwrite: festatusline install --force",
  "doctor.claudeDir": "Claude data dir",
  "doctor.codexDir": "Codex dir",
  "doctor.found": "found",
  "doctor.notFound": "not found"
};

// src/i18n/zh.ts
var zh = {
  "widget.model": "\u6A21\u578B",
  "widget.context": "\u4E0A\u4E0B\u6587",
  "widget.peakTime": "\u9AD8\u5CF0\u65F6\u6BB5",
  "widget.dailyUsage": "\u65E5\u7528\u91CF",
  "widget.dailyReset": "\u65E5\u91CD\u7F6E",
  "widget.weeklyUsage": "\u5468\u7528\u91CF",
  "widget.weeklyReset": "\u5468\u91CD\u7F6E",
  "widget.sonnetWeeklyUsage": "Sonnet \u5468\u7528\u91CF",
  "widget.sonnetWeeklyReset": "Sonnet \u5468\u91CD\u7F6E",
  "widget.gptUsage": "GPT \u7528\u91CF",
  "widget.codexRateLimit": "Codex 5\u5C0F\u65F6\u9650\u989D",
  "widget.codexWeeklyRateLimit": "Codex 7\u5929\u9650\u989D",
  "widget.spacer": "\u95F4\u9694",
  "widget.codexModel": "Codex \u6A21\u578B",
  "widget.rateLimit": "5\u5C0F\u65F6\u9650\u989D",
  "widget.weeklyRateLimit": "7\u5929\u9650\u989D",
  "widget.sessionCost": "\u4F1A\u8BDD\u8D39\u7528",
  "widget.cacheHit": "\u7F13\u5B58\u547D\u4E2D\u7387",
  "widget.cacheTtl": "\u7F13\u5B58\u6709\u6548\u671F",
  "widget.claudePeak": "Claude\u9AD8\u5CF0",
  "widget.gitBranch": "Git \u5206\u652F",
  "widget.gitRepo": "Git \u4ED3\u5E93",
  "reset.until": "\u91CD\u7F6E\u5012\u8BA1\u65F6",
  "reset.na": "\u2013",
  "usage.tokens": "\u4EE4\u724C",
  "usage.cost": "\u8D39\u7528",
  "peak.none": "\u65E0\u6570\u636E",
  "tui.title": "festatusline \u8BBE\u7F6E",
  "tui.mainMenu.editWidgets": "\u7F16\u8F91\u7EC4\u4EF6",
  "tui.mainMenu.selectPreset": "\u9009\u62E9\u9884\u8BBE",
  "tui.mainMenu.selectTheme": "\u9009\u62E9\u4E3B\u9898",
  "tui.mainMenu.selectLanguage": "\u8BED\u8A00",
  "tui.mainMenu.install": "\u5B89\u88C5\u5230 Claude Code",
  "tui.mainMenu.quit": "\u9000\u51FA",
  "tui.preset.minimal": "\u7B80\u6D01",
  "tui.preset.full": "\u5B8C\u6574",
  "tui.preset.koreanDev": "\u97E9\u56FD\u5F00\u53D1\u8005",
  "tui.preset.multiCli": "\u591A CLI",
  "tui.preset.lite": "Lite",
  "tui.preset.plus": "Plus",
  "tui.preset.pro": "Pro",
  "tui.lang.ko": "\uD55C\uAD6D\uC5B4",
  "tui.lang.en": "English",
  "tui.lang.zh": "\u4E2D\u6587",
  "install.success": "\u5DF2\u5C06 festatusline \u6CE8\u518C\u5230 Claude Code \u8BBE\u7F6E\u3002",
  "install.alreadySet": "\u5DF2\u6CE8\u518C\u3002",
  "install.currentConfig": "  \u5F53\u524D\u914D\u7F6E\uFF1A",
  "install.overwriteHint": "  \u8986\u76D6\u65B9\u6CD5\uFF1Afestatusline install --force",
  "doctor.claudeDir": "Claude \u6570\u636E\u76EE\u5F55",
  "doctor.codexDir": "Codex \u76EE\u5F55",
  "doctor.found": "\u5DF2\u627E\u5230",
  "doctor.notFound": "\u672A\u627E\u5230"
};

// src/i18n/index.ts
var bundles = { ko, en, zh };
function detectLocale() {
  const override = process.env.FESTATUSLINE_LOCALE;
  if (override === "ko" || override === "en" || override === "zh") return override;
  const lang = (process.env.LANG ?? "").toLowerCase();
  if (lang.startsWith("ko")) return "ko";
  if (lang.startsWith("zh")) return "zh";
  return "en";
}
var currentLocale = detectLocale();
function setLocale(locale) {
  currentLocale = locale;
}
function t(key) {
  return bundles[currentLocale][key] ?? bundles.en[key] ?? key;
}
function createTranslator(locale) {
  return (key) => bundles[locale][key] ?? bundles.en[key] ?? key;
}

// src/render/line.ts
import chalk3 from "chalk";

// src/widgets/Model.ts
var EFFORT_LABELS = {
  low: "low",
  normal: "normal",
  high: "high",
  "max-tokens": "max"
};
function shortName(raw) {
  const stripped = raw.replace(/^Claude\s+/i, "");
  if (stripped !== raw) return stripped;
  const withoutPrefix = raw.replace(/^claude-/i, "");
  const match = withoutPrefix.match(/^([a-z]+(?:-[a-z]+)*)-(\d+)-(\d+)(?:-\d+)*$/i);
  if (match) {
    const name = match[1].replace(/-/g, " ");
    return `${name.charAt(0).toUpperCase()}${name.slice(1)} ${match[2]}.${match[3]}`;
  }
  return withoutPrefix;
}
var ModelWidget = {
  id: "model",
  labelKey: "widget.model",
  render(ctx, _cfg) {
    const rawName = ctx.stdin.model?.display_name ?? ctx.stdin.model?.id ?? ctx.usage?.lastModel ?? null;
    if (!rawName) return "?";
    const name = shortName(rawName);
    const effort = ctx.effortLevel;
    if (effort && effort !== "normal") {
      const label = EFFORT_LABELS[effort] ?? effort;
      return `${name} [${label}]`;
    }
    return name;
  }
};

// src/utils/bar.ts
import chalk from "chalk";
var BAR_WIDTH = 10;
var DIM_FACTOR = 0.35;
function dimColor(hex) {
  const r = Math.round(parseInt(hex.slice(1, 3), 16) * DIM_FACTOR).toString(16).padStart(2, "0");
  const g = Math.round(parseInt(hex.slice(3, 5), 16) * DIM_FACTOR).toString(16).padStart(2, "0");
  const b = Math.round(parseInt(hex.slice(5, 7), 16) * DIM_FACTOR).toString(16).padStart(2, "0");
  return `#${r}${g}${b}`;
}
function buildBar(pct, color, width = BAR_WIDTH) {
  const clamped = Math.max(0, Math.min(100, pct));
  const filled = Math.round(clamped / 100 * width);
  const filledStr = chalk.hex(color)("\u25A0".repeat(filled));
  const emptyStr = chalk.hex(dimColor(color))("\u25A0".repeat(width - filled));
  return filledStr + emptyStr;
}
function fmtPct(pct) {
  return `${String(pct).padStart(3)}%`;
}

// src/utils/tokens.ts
function formatTokens(n) {
  if (n >= 1e6) return `${(n / 1e6).toFixed(1)}M`;
  if (n >= 1e3) return `${Math.round(n / 1e3)}K`;
  return String(n);
}

// src/widgets/Context.ts
var ContextWidget = {
  id: "context",
  labelKey: "widget.context",
  render(ctx, _cfg) {
    const cw = ctx.stdin.context_window;
    if (!cw?.context_window_size)
      return `Ctx ${buildBar(0, "#22d3ee")} ${fmtPct(0)} ${"(-/-)".padEnd(11)}`;
    const usage = cw.current_usage;
    const used = (usage?.input_tokens ?? 0) + (usage?.output_tokens ?? 0) + (usage?.cache_creation_input_tokens ?? 0) + (usage?.cache_read_input_tokens ?? 0);
    const max = cw.context_window_size;
    const pct = Math.round(cw.used_percentage ?? Math.min(100, used / max * 100));
    const tokenExpr = `(${formatTokens(used)}/${formatTokens(max)})`.padEnd(11);
    return `Ctx ${buildBar(pct, "#22d3ee")} ${fmtPct(pct)} ${tokenExpr}`;
  }
};

// src/data/peak-time.ts
function getClaudePeakInfo(now = Date.now()) {
  const d = new Date(now);
  const utcSecsOfDay = d.getUTCHours() * 3600 + d.getUTCMinutes() * 60 + d.getUTCSeconds();
  const utcMsOfDay = utcSecsOfDay * 1e3 + d.getUTCMilliseconds();
  const peakStartMs = 12 * 3600 * 1e3;
  const peakEndMs = 18 * 3600 * 1e3;
  const dayMs = 24 * 3600 * 1e3;
  const isPeak = utcMsOfDay >= peakStartMs && utcMsOfDay < peakEndMs;
  let remainingMs;
  if (isPeak) {
    remainingMs = peakEndMs - utcMsOfDay;
  } else if (utcMsOfDay < peakStartMs) {
    remainingMs = peakStartMs - utcMsOfDay;
  } else {
    remainingMs = dayMs - utcMsOfDay + peakStartMs;
  }
  return { isPeak, remainingMs };
}
function computePeakTime(entries, windowDays = 14) {
  const cutoff = Date.now() - windowDays * 24 * 60 * 60 * 1e3;
  const raw = new Array(24).fill(0);
  for (const e of entries) {
    if (e.timestamp < cutoff) continue;
    const hour = new Date(e.timestamp).getHours();
    raw[hour] = (raw[hour] ?? 0) + e.inputTokens + e.outputTokens + e.cacheCreationTokens + e.cacheReadTokens;
  }
  let maxTokens = 0;
  let peakHour = 0;
  for (let h = 0; h < 24; h++) {
    if ((raw[h] ?? 0) > maxTokens) {
      maxTokens = raw[h] ?? 0;
      peakHour = h;
    }
  }
  if (maxTokens === 0) return null;
  const end = (peakHour + 1) % 24;
  const label = `${String(peakHour).padStart(2, "0")}:00\u2013${String(end).padStart(2, "0")}:00`;
  const raw12 = new Array(12).fill(0);
  for (let i = 0; i < 12; i++) {
    raw12[i] = (raw[i * 2] ?? 0) + (raw[i * 2 + 1] ?? 0);
  }
  const maxBucket = Math.max(...raw12);
  const buckets = raw12.map((v) => maxBucket > 0 ? v / maxBucket : 0);
  return { hour: peakHour, label, buckets };
}

// src/widgets/PeakTime.ts
var PeakTimeWidget = {
  id: "peakTime",
  labelKey: "widget.peakTime",
  render(ctx, _cfg) {
    if (!ctx.usage) return null;
    const result = computePeakTime(ctx.usage.allEntries);
    if (!result) return ctx.t("peak.none");
    return result.label;
  }
};

// src/widgets/types.ts
function staticLabel(id, labelKey, text) {
  return { id, labelKey, render: () => text };
}

// src/widgets/DailyUsage.ts
var DailyUsageWidget = staticLabel("dailyUsage", "widget.dailyUsage", "Daily  ");

// src/utils/duration.ts
function formatRemainingHM(ms) {
  const totalMins = Math.max(0, Math.ceil(ms / 6e4));
  const h = Math.floor(totalMins / 60);
  const m = totalMins % 60;
  if (h >= 24) {
    const d = Math.floor(h / 24);
    const rh = h % 24;
    return `${d}d ${rh}h`;
  }
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}
function formatAbsDatetime(unixSecs) {
  const d = new Date(unixSecs * 1e3);
  const M = String(d.getMonth() + 1).padStart(2, "0");
  const D = String(d.getDate()).padStart(2, "0");
  const h = String(d.getHours()).padStart(2, "0");
  const m = String(d.getMinutes()).padStart(2, "0");
  return `${M}/${D} ${h}:${m}`;
}
function formatRemainingClock(ms) {
  const totalSecs = Math.max(0, Math.floor(ms / 1e3));
  const h = Math.floor(totalSecs / 3600);
  const m = Math.floor(totalSecs % 3600 / 60);
  if (h > 24) {
    const d = Math.floor(h / 24);
    const rh = h % 24;
    return `${d}d ${rh}h`;
  }
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

// src/data/reset.ts
function getDailyReset(now = /* @__PURE__ */ new Date()) {
  const midnight = new Date(now);
  midnight.setDate(midnight.getDate() + 1);
  midnight.setHours(0, 0, 0, 0);
  const remainingMs = midnight.getTime() - now.getTime();
  return { remainingMs, label: formatRemainingClock(remainingMs) };
}
function getWeeklyReset(anchorDay, now = /* @__PURE__ */ new Date()) {
  let targetMs;
  if (anchorDay !== null) {
    const current = now.getDay();
    const daysUntil = (anchorDay - current + 7) % 7 || 7;
    const target = new Date(now);
    target.setDate(target.getDate() + daysUntil);
    target.setHours(0, 0, 0, 0);
    targetMs = target.getTime();
  } else {
    targetMs = now.getTime() + 7 * 24 * 60 * 60 * 1e3;
  }
  const remainingMs = targetMs - now.getTime();
  return { remainingMs, label: formatRemainingClock(remainingMs) };
}

// src/widgets/resetTimerFactory.ts
function createResetTimerWidget(params) {
  const { id, labelKey, prefix, getTimer } = params;
  return {
    id,
    labelKey,
    render(ctx, _cfg) {
      const timer = getTimer(ctx);
      return `${prefix} ${timer.label}`;
    }
  };
}

// src/widgets/DailyResetTimer.ts
var DailyResetTimerWidget = createResetTimerWidget({
  id: "dailyReset",
  labelKey: "widget.dailyReset",
  prefix: "\u21BA",
  getTimer: (ctx) => getDailyReset(ctx.now)
});

// src/widgets/WeeklyUsage.ts
var WeeklyUsageWidget = staticLabel("weeklyUsage", "widget.weeklyUsage", "7days  ");

// src/widgets/WeeklyResetTimer.ts
var WeeklyResetTimerWidget = createResetTimerWidget({
  id: "weeklyReset",
  labelKey: "widget.weeklyReset",
  prefix: "\u21BA",
  getTimer: (ctx) => getWeeklyReset(ctx.weeklyAnchorDay, ctx.now)
});

// src/widgets/SonnetWeeklyUsage.ts
var SonnetWeeklyUsageWidget = {
  id: "sonnetWeeklyUsage",
  labelKey: "widget.sonnetWeeklyUsage",
  render(ctx, _cfg) {
    if (!ctx.usage) return null;
    return `S:${formatTokens(ctx.usage.sonnetWeeklyTokens)}`;
  }
};

// src/widgets/SonnetWeeklyResetTimer.ts
var SonnetWeeklyResetTimerWidget = createResetTimerWidget({
  id: "sonnetWeeklyReset",
  labelKey: "widget.sonnetWeeklyReset",
  prefix: "S\u21BA",
  getTimer: (ctx) => getWeeklyReset(ctx.weeklyAnchorDay, ctx.now)
});

// src/widgets/GptUsage.ts
var GptUsageWidget = {
  id: "gptUsage",
  labelKey: "widget.gptUsage",
  render(ctx, _cfg) {
    if (!ctx.codex?.available) return null;
    return `GPT:${ctx.codex.dailyRequests}req`;
  }
};

// src/widgets/rateLimitRenderer.ts
function renderRateLimitSlot(params) {
  const {
    prefix,
    color,
    usedPercent,
    resetsAtMs,
    now,
    timeFormat = "remaining",
    prefixWidth,
    timeExprWidth
  } = params;
  const paddedPrefix = prefixWidth != null ? prefix.padEnd(prefixWidth) : prefix;
  if (usedPercent == null || resetsAtMs == null) {
    return `${paddedPrefix} ${buildBar(0, color)}  ?%`;
  }
  const remainingMs = resetsAtMs - now;
  const pct = remainingMs <= 0 ? 0 : Math.round(usedPercent);
  let timeStr;
  if (remainingMs <= 0) {
    timeStr = "reset";
  } else if (timeFormat === "abs") {
    timeStr = formatAbsDatetime(resetsAtMs / 1e3);
  } else {
    timeStr = formatRemainingHM(remainingMs);
  }
  const timeExpr = timeExprWidth != null ? `(${timeStr})`.padEnd(timeExprWidth) : `(${timeStr})`;
  return `${paddedPrefix} ${buildBar(pct, color)} ${fmtPct(pct)} ${timeExpr}`;
}

// src/widgets/RateLimit.ts
function createRateLimitWidget(params) {
  const { id, labelKey, prefix, color, period } = params;
  return {
    id,
    labelKey,
    render(ctx, _cfg) {
      const slot = ctx.stdin.rate_limits?.[period];
      return renderRateLimitSlot({
        prefix,
        color,
        usedPercent: slot?.used_percentage ?? null,
        resetsAtMs: slot?.resets_at != null ? slot.resets_at * 1e3 : null,
        now: ctx.now.getTime()
      });
    }
  };
}
var RateLimitWidget = createRateLimitWidget({
  id: "rateLimit",
  labelKey: "widget.rateLimit",
  prefix: "5h",
  color: "#ffd93d",
  period: "five_hour"
});
var WeeklyRateLimitWidget = createRateLimitWidget({
  id: "weeklyRateLimit",
  labelKey: "widget.weeklyRateLimit",
  prefix: "All",
  color: "#6bcb77",
  period: "seven_day"
});

// src/widgets/ClaudePeak.ts
import chalk2 from "chalk";
var COLOR_PEAK = "#ff4d4d";
var COLOR_OFFPEAK = "#4dff6e";
var ClaudePeakWidget = {
  id: "claudePeak",
  labelKey: "widget.claudePeak",
  render(_ctx, _cfg) {
    const { isPeak, remainingMs } = getClaudePeakInfo();
    const dot = isPeak ? "\u{1F534}" : "\u{1F7E2}";
    const status = chalk2.hex(isPeak ? COLOR_PEAK : COLOR_OFFPEAK)(isPeak ? "Peak" : "Off-Peak");
    return `${dot} ${status} (${formatRemainingHM(remainingMs)})`;
  }
};

// src/widgets/CodexRateLimit.ts
function createCodexRateLimitWidget(params) {
  const { id, labelKey, prefix, color, period, timeFormat, prefixWidth, timeExprWidth } = params;
  return {
    id,
    labelKey,
    render(ctx, _cfg) {
      const slot = ctx.codex?.rateLimits?.[period];
      return renderRateLimitSlot({
        prefix,
        color,
        usedPercent: slot?.usedPercent ?? null,
        resetsAtMs: slot?.resetsAt != null ? slot.resetsAt * 1e3 : null,
        now: ctx.now.getTime(),
        timeFormat,
        prefixWidth,
        timeExprWidth
      });
    }
  };
}
var CodexRateLimitWidget = createCodexRateLimitWidget({
  id: "codexRateLimit",
  labelKey: "widget.codexRateLimit",
  prefix: "5h",
  color: "#ff9f43",
  period: "primary",
  timeFormat: "remaining",
  prefixWidth: 3,
  timeExprWidth: 11
});
var CodexWeeklyRateLimitWidget = createCodexRateLimitWidget({
  id: "codexWeeklyRateLimit",
  labelKey: "widget.codexWeeklyRateLimit",
  prefix: "7d",
  color: "#48dbfb",
  period: "secondary",
  timeFormat: "remaining",
  prefixWidth: 3,
  timeExprWidth: 11
});

// src/widgets/Spacer.ts
var SpacerWidget = {
  id: "spacer",
  labelKey: "widget.spacer",
  render(_ctx, _cfg) {
    return " ";
  }
};

// src/widgets/CodexModel.ts
var CodexModelWidget = {
  id: "codexModel",
  labelKey: "widget.codexModel",
  render(ctx, _cfg) {
    if (!ctx.codex?.available) return null;
    const name = ctx.codex.model ?? "Codex";
    return name.slice(0, 7).padEnd(7);
  }
};

// src/widgets/SessionCost.ts
function formatCost(usd) {
  if (usd >= 1) return `$${usd.toFixed(2)}`;
  if (usd >= 0.01) return `$${usd.toFixed(3)}`;
  return `$${usd.toFixed(4)}`;
}
var SessionCostWidget = {
  id: "sessionCost",
  labelKey: "widget.sessionCost",
  render(ctx, _cfg) {
    const cost = ctx.stdin.cost?.total_cost_usd;
    if (cost == null) return "$-";
    return formatCost(cost);
  }
};

// src/widgets/CacheHit.ts
var CacheHitWidget = {
  id: "cacheHit",
  labelKey: "widget.cacheHit",
  render(ctx, _cfg) {
    const usage = ctx.stdin.context_window?.current_usage;
    if (!usage) return null;
    const cached = usage.cache_read_input_tokens ?? 0;
    const input = usage.input_tokens ?? 0;
    const denom = input + cached;
    if (denom === 0) return null;
    const pct = Math.round(cached / denom * 100);
    return `\u26A1${pct}%`;
  }
};

// src/widgets/CacheTtl.ts
var CacheTtlWidget = {
  id: "cacheTtl",
  labelKey: "widget.cacheTtl",
  render(ctx, _cfg) {
    if (ctx.cacheTtlCreatedAt == null) return null;
    const remaining = ctx.cacheTtlCreatedAt + ctx.cacheTtlMs - ctx.now.getTime();
    if (remaining <= 0) return null;
    return `\u23F1 ${formatRemainingHM(remaining)}`;
  }
};

// src/widgets/GitInfo.ts
import { execFileSync } from "child_process";
import { basename } from "path";
function gitCommand(args, cwd) {
  try {
    return execFileSync("git", args, {
      cwd,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"]
    }).trim();
  } catch {
    return null;
  }
}
var GitBranchWidget = {
  id: "gitBranch",
  labelKey: "widget.gitBranch",
  render(ctx, _cfg) {
    const cwd = ctx.stdin.cwd ?? process.cwd();
    return gitCommand(["rev-parse", "--abbrev-ref", "HEAD"], cwd);
  }
};
var GitRepoWidget = {
  id: "gitRepo",
  labelKey: "widget.gitRepo",
  render(ctx, _cfg) {
    const cwd = ctx.stdin.cwd ?? process.cwd();
    const topLevel = gitCommand(["rev-parse", "--show-toplevel"], cwd);
    return topLevel ? basename(topLevel) : null;
  }
};

// src/widgets/index.ts
var ALL_WIDGETS = [
  ModelWidget,
  ContextWidget,
  RateLimitWidget,
  WeeklyRateLimitWidget,
  PeakTimeWidget,
  DailyUsageWidget,
  DailyResetTimerWidget,
  WeeklyUsageWidget,
  WeeklyResetTimerWidget,
  SonnetWeeklyUsageWidget,
  SonnetWeeklyResetTimerWidget,
  GptUsageWidget,
  ClaudePeakWidget,
  CodexRateLimitWidget,
  CodexWeeklyRateLimitWidget,
  SpacerWidget,
  CodexModelWidget,
  SessionCostWidget,
  CacheHitWidget,
  CacheTtlWidget,
  GitBranchWidget,
  GitRepoWidget
];
var registry = new Map(ALL_WIDGETS.map((w) => [w.id, w]));
function getWidget(id) {
  return registry.get(id);
}

// src/render/line.ts
function renderLine(widgetCfgs, ctx, separator) {
  const parts = [];
  for (const cfg of widgetCfgs) {
    const widget = getWidget(cfg.id);
    if (!widget) continue;
    const text = widget.render(ctx, cfg);
    if (!text) continue;
    const color = cfg.color ?? ctx.theme.accent;
    parts.push(chalk3.hex(color)(text));
  }
  const sep = chalk3.hex(ctx.theme.muted)(separator);
  return parts.join(sep);
}
function renderAllLines(lines, ctx, separator) {
  return lines.map((line) => renderLine(line, ctx, separator)).filter(Boolean).join("\n");
}

// src/render/index.ts
var CACHE_DIR = process.env.XDG_CACHE_HOME ? join(process.env.XDG_CACHE_HOME, "festatusline") : join(homedir(), ".cache", "festatusline");
var RATE_LIMITS_CACHE_PATH = join(CACHE_DIR, "rate_limits.json");
var RateLimitPeriodSchema2 = z6.object({
  used_percentage: z6.number().optional(),
  resets_at: z6.number().optional()
});
var RateLimitsCacheSchema = z6.object({
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
    const raw = await fs6.readFile(RATE_LIMITS_CACHE_PATH, "utf8");
    const result = RateLimitsCacheSchema.safeParse(JSON.parse(raw));
    return result.success ? result.data : null;
  });
}
async function writeRateLimitsCache(rateLimits) {
  await tryOrNull(async () => {
    await fs6.mkdir(CACHE_DIR, { recursive: true });
    await fs6.writeFile(RATE_LIMITS_CACHE_PATH, JSON.stringify(rateLimits), "utf8");
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

// src/tui/index.ts
import React7 from "react";
import { render } from "ink";

// src/config/save.ts
import fs7 from "fs";
import path5 from "path";
async function saveSettings(settings) {
  const configPath = getConfigPath();
  await fs7.promises.mkdir(path5.dirname(configPath), { recursive: true });
  await fs7.promises.writeFile(configPath, `${JSON.stringify(settings, null, 2)}
`, "utf8");
}

// src/tui/App.tsx
import React6, { useState as useState2 } from "react";
import { Box as Box6, Text as Text5, useApp } from "ink";

// src/tui/screens/MainMenu.tsx
import React from "react";
import { Box } from "ink";
import SelectInput from "ink-select-input";
function MainMenu({ onSelect }) {
  const items = [
    { label: t("tui.mainMenu.editWidgets"), value: "widgets" },
    { label: t("tui.mainMenu.selectPreset"), value: "preset" },
    { label: t("tui.mainMenu.selectTheme"), value: "theme" },
    { label: t("tui.mainMenu.selectLanguage"), value: "language" },
    { label: t("tui.mainMenu.quit"), value: "quit" }
  ];
  return /* @__PURE__ */ React.createElement(Box, { flexDirection: "column", marginTop: 1 }, /* @__PURE__ */ React.createElement(SelectInput, { items, onSelect: (item) => onSelect(item.value) }));
}

// src/tui/screens/PresetMenu.tsx
import React2 from "react";
import { Box as Box2, Text } from "ink";
import SelectInput2 from "ink-select-input";

// src/config/presets.ts
var PRESETS = {
  minimal: {
    lines: [
      [{ id: "dailyUsage" }, { id: "context" }, { id: "rateLimit" }],
      [{ id: "weeklyUsage" }, { id: "weeklyRateLimit" }],
      [{ id: "model" }, { id: "claudePeak" }]
    ]
  },
  full: {
    lines: [
      [
        { id: "model" },
        { id: "claudePeak" },
        { id: "context" },
        { id: "rateLimit" },
        { id: "peakTime" },
        { id: "dailyUsage" },
        { id: "dailyReset" },
        { id: "weeklyUsage" },
        { id: "weeklyReset" },
        { id: "sonnetWeeklyUsage" },
        { id: "sonnetWeeklyReset" },
        { id: "gptUsage" }
      ]
    ]
  },
  "korean-dev": {
    locale: "ko",
    lines: [
      [
        { id: "model" },
        { id: "claudePeak" },
        { id: "context" },
        { id: "rateLimit" },
        { id: "peakTime" },
        { id: "dailyUsage" },
        { id: "dailyReset" },
        { id: "weeklyUsage" },
        { id: "weeklyReset" },
        { id: "sonnetWeeklyUsage" },
        { id: "sonnetWeeklyReset" },
        { id: "gptUsage" }
      ]
    ]
  },
  "multi-cli": {
    lines: [[{ id: "model" }, { id: "dailyUsage" }, { id: "gptUsage" }]]
  },
  lite: {
    lines: [
      [{ id: "dailyUsage" }, { id: "context" }, { id: "rateLimit" }],
      [{ id: "weeklyUsage" }, { id: "weeklyRateLimit" }],
      [{ id: "model" }, { id: "claudePeak" }, { id: "gitRepo" }, { id: "gitBranch" }]
    ]
  },
  plus: {
    lines: [
      [{ id: "dailyUsage" }, { id: "context" }, { id: "rateLimit" }],
      [{ id: "weeklyUsage" }, { id: "weeklyRateLimit" }],
      [{ id: "spacer" }],
      [{ id: "cacheHit" }, { id: "cacheTtl" }, { id: "sessionCost" }],
      [{ id: "model" }, { id: "claudePeak" }, { id: "gitRepo" }, { id: "gitBranch" }]
    ]
  },
  pro: {
    lines: [
      [{ id: "dailyUsage" }, { id: "context" }, { id: "rateLimit" }],
      [{ id: "weeklyUsage" }, { id: "weeklyRateLimit" }],
      [{ id: "codexModel" }, { id: "codexRateLimit" }, { id: "codexWeeklyRateLimit" }],
      [{ id: "spacer" }],
      [{ id: "cacheHit" }, { id: "cacheTtl" }, { id: "sessionCost" }],
      [{ id: "model" }, { id: "claudePeak" }, { id: "gitRepo" }, { id: "gitBranch" }]
    ]
  }
};
var PRESET_NAMES = Object.keys(PRESETS);

// src/tui/screens/PresetMenu.tsx
var PRESET_LABEL_KEYS = {
  minimal: "tui.preset.minimal",
  full: "tui.preset.full",
  "korean-dev": "tui.preset.koreanDev",
  "multi-cli": "tui.preset.multiCli",
  lite: "tui.preset.lite",
  plus: "tui.preset.plus",
  pro: "tui.preset.pro"
};
function PresetMenu({
  currentSettings,
  onSelect,
  onBack
}) {
  const items = [
    ...PRESET_NAMES.map((name) => ({
      label: t(PRESET_LABEL_KEYS[name] ?? name),
      value: name
    })),
    { label: "\u2190 \uB4A4\uB85C", value: "__back__" }
  ];
  return /* @__PURE__ */ React2.createElement(Box2, { flexDirection: "column", padding: 1 }, /* @__PURE__ */ React2.createElement(Text, { bold: true }, t("tui.mainMenu.selectPreset")), /* @__PURE__ */ React2.createElement(
    SelectInput2,
    {
      items,
      onSelect: async (item) => {
        if (item.value === "__back__") {
          onBack();
          return;
        }
        const preset = PRESETS[item.value] ?? {};
        const next = SettingsSchema.parse({ ...currentSettings, ...preset });
        await onSelect(next);
      }
    }
  ));
}

// src/tui/screens/ThemeMenu.tsx
import React3 from "react";
import { Box as Box3, Text as Text2 } from "ink";
import SelectInput3 from "ink-select-input";
function ThemeMenu({ current, onSelect, onBack }) {
  const items = [
    ...THEME_NAMES.map((name) => ({
      label: `${name === current ? "\u2713 " : "  "}${name}`,
      value: name
    })),
    { label: "\u2190 \uB4A4\uB85C", value: "__back__" }
  ];
  const theme = themes[current];
  return /* @__PURE__ */ React3.createElement(Box3, { flexDirection: "column", padding: 1 }, /* @__PURE__ */ React3.createElement(Text2, { bold: true }, t("tui.mainMenu.selectTheme")), theme && /* @__PURE__ */ React3.createElement(Text2, { color: theme.accent }, `accent: ${theme.accent}  warn: ${theme.warn}  danger: ${theme.danger}`), /* @__PURE__ */ React3.createElement(
    SelectInput3,
    {
      items,
      onSelect: async (item) => {
        if (item.value === "__back__") {
          onBack();
          return;
        }
        await onSelect(item.value);
      }
    }
  ));
}

// src/tui/screens/LanguageSelect.tsx
import React4 from "react";
import { Box as Box4, Text as Text3 } from "ink";
import SelectInput4 from "ink-select-input";
var LOCALES = ["ko", "en", "zh"];
function LanguageSelect({
  current,
  onSelect,
  onBack,
  hideBack = false
}) {
  const localeItems = LOCALES.map((l) => ({
    label: `${l === current ? "\u2713 " : "  "}${t(`tui.lang.${l}`)}`,
    value: l
  }));
  const items = hideBack ? localeItems : [...localeItems, { label: "\u2190 \uB4A4\uB85C", value: "__back__" }];
  return /* @__PURE__ */ React4.createElement(Box4, { flexDirection: "column", padding: 1 }, /* @__PURE__ */ React4.createElement(Text3, { bold: true }, t("tui.mainMenu.selectLanguage")), /* @__PURE__ */ React4.createElement(
    SelectInput4,
    {
      items,
      onSelect: (item) => {
        if (item.value === "__back__") {
          onBack();
          return;
        }
        onSelect(item.value);
      }
    }
  ));
}

// src/tui/screens/WidgetEditor.tsx
import React5, { useState } from "react";
import { Box as Box5, Text as Text4 } from "ink";
import SelectInput5 from "ink-select-input";
function WidgetEditor({ lines, onSave, onBack }) {
  const [currentLines, setCurrentLines] = useState(lines);
  const [mode, setMode] = useState("view");
  const firstLine = currentLines[0] ?? [];
  const actions = [
    { label: "+ \uC704\uC82F \uCD94\uAC00", value: "add" },
    { label: "- \uC704\uC82F \uC81C\uAC70", value: "remove" },
    { label: "\u2713 \uC800\uC7A5 \uD6C4 \uB3CC\uC544\uAC00\uAE30", value: "save" },
    { label: "\u2190 \uCDE8\uC18C", value: "back" }
  ];
  if (mode === "add") {
    const existing = new Set(firstLine.map((w) => w.id));
    const addable = ALL_WIDGETS.filter((w) => !existing.has(w.id)).map((w) => ({
      label: t(w.labelKey),
      value: w.id
    }));
    return /* @__PURE__ */ React5.createElement(Box5, { flexDirection: "column", padding: 1 }, /* @__PURE__ */ React5.createElement(Text4, { bold: true }, "\uC704\uC82F \uCD94\uAC00"), /* @__PURE__ */ React5.createElement(
      SelectInput5,
      {
        items: [...addable, { label: "\u2190 \uB4A4\uB85C", value: "__back__" }],
        onSelect: (item) => {
          if (item.value === "__back__") {
            setMode("view");
            return;
          }
          setCurrentLines([[...firstLine, { id: item.value }], ...currentLines.slice(1)]);
          setMode("view");
        }
      }
    ));
  }
  if (mode === "remove") {
    const removable = firstLine.map((w) => {
      const labelKey = ALL_WIDGETS.find((a) => a.id === w.id)?.labelKey ?? "widget.model";
      return { label: t(labelKey), value: w.id };
    });
    return /* @__PURE__ */ React5.createElement(Box5, { flexDirection: "column", padding: 1 }, /* @__PURE__ */ React5.createElement(Text4, { bold: true }, "\uC704\uC82F \uC81C\uAC70"), /* @__PURE__ */ React5.createElement(
      SelectInput5,
      {
        items: [...removable, { label: "\u2190 \uB4A4\uB85C", value: "__back__" }],
        onSelect: (item) => {
          if (item.value === "__back__") {
            setMode("view");
            return;
          }
          const updated = firstLine.filter((w) => w.id !== item.value);
          setCurrentLines([updated, ...currentLines.slice(1)]);
          setMode("view");
        }
      }
    ));
  }
  return /* @__PURE__ */ React5.createElement(Box5, { flexDirection: "column", padding: 1 }, /* @__PURE__ */ React5.createElement(Text4, { bold: true }, "\uC704\uC82F \uD3B8\uC9D1"), /* @__PURE__ */ React5.createElement(Text4, { dimColor: true }, firstLine.map((w) => w.id).join(" \u2502 ")), /* @__PURE__ */ React5.createElement(
    SelectInput5,
    {
      items: actions,
      onSelect: async (item) => {
        if (item.value === "add") {
          setMode("add");
          return;
        }
        if (item.value === "remove") {
          setMode("remove");
          return;
        }
        if (item.value === "save") {
          await onSave(currentLines);
          return;
        }
        onBack();
      }
    }
  ));
}

// src/tui/App.tsx
function App({ initialSettings, onSave }) {
  const { exit } = useApp();
  const [settings, setSettings] = useState2(initialSettings);
  const [screen, setScreen] = useState2("main");
  const [saved, setSaved] = useState2(false);
  async function handleSave(next) {
    setSettings(next);
    await onSave(next);
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
  }
  function changeLocale(locale) {
    setLocale(locale);
    const next = { ...settings, locale };
    void handleSave(next);
    setScreen("main");
  }
  if (screen === "preset") {
    return /* @__PURE__ */ React6.createElement(
      PresetMenu,
      {
        currentSettings: settings,
        onSelect: async (next) => {
          await handleSave(next);
          setScreen("main");
        },
        onBack: () => setScreen("main")
      }
    );
  }
  if (screen === "theme") {
    return /* @__PURE__ */ React6.createElement(
      ThemeMenu,
      {
        current: settings.theme,
        onSelect: async (theme) => {
          await handleSave({ ...settings, theme });
          setScreen("main");
        },
        onBack: () => setScreen("main")
      }
    );
  }
  if (screen === "language") {
    return /* @__PURE__ */ React6.createElement(
      LanguageSelect,
      {
        current: settings.locale,
        onSelect: changeLocale,
        onBack: () => setScreen("main")
      }
    );
  }
  if (screen === "widgets") {
    return /* @__PURE__ */ React6.createElement(
      WidgetEditor,
      {
        lines: settings.lines,
        onSave: async (lines) => {
          await handleSave({ ...settings, lines });
          setScreen("main");
        },
        onBack: () => setScreen("main")
      }
    );
  }
  return /* @__PURE__ */ React6.createElement(Box6, { flexDirection: "column", padding: 1 }, /* @__PURE__ */ React6.createElement(Text5, { bold: true, color: "cyan" }, t("tui.title")), saved && /* @__PURE__ */ React6.createElement(Text5, { color: "green" }, "\u2713 \uC800\uC7A5\uB428"), /* @__PURE__ */ React6.createElement(
    MainMenu,
    {
      onSelect: (action) => {
        if (action === "quit") exit();
        else setScreen(action);
      }
    }
  ));
}

// src/tui/index.ts
async function runTui() {
  const settings = await loadSettings();
  setLocale(settings.locale);
  const { waitUntilExit } = render(
    React7.createElement(App, { initialSettings: settings, onSave: saveSettings })
  );
  await waitUntilExit();
}

// src/tui/setup.ts
import React9 from "react";
import { render as render2 } from "ink";

// src/tui/screens/SetupWizard.tsx
import React8, { useState as useState3 } from "react";
import { Box as Box7, Text as Text6, useApp as useApp2 } from "ink";
import SelectInput6 from "ink-select-input";
var SETUP_PRESET_NAMES = ["lite", "plus", "pro"];
var SETUP_PRESET_LABEL_KEYS = {
  lite: "tui.preset.lite",
  plus: "tui.preset.plus",
  pro: "tui.preset.pro"
};
function SetupWizard({ initialSettings, onSave }) {
  const { exit } = useApp2();
  const [step, setStep] = useState3("language");
  const [settings, setSettings] = useState3(initialSettings);
  if (step === "language") {
    return /* @__PURE__ */ React8.createElement(
      LanguageSelect,
      {
        current: settings.locale,
        hideBack: true,
        onSelect: (locale) => {
          setLocale(locale);
          setSettings((prev) => ({ ...prev, locale }));
          setStep("preset");
        },
        onBack: () => {
        }
      }
    );
  }
  const items = [
    ...SETUP_PRESET_NAMES.map((name) => ({
      label: t(SETUP_PRESET_LABEL_KEYS[name] ?? name),
      value: name
    })),
    { label: "\u2190 \uB4A4\uB85C", value: "__back__" }
  ];
  return /* @__PURE__ */ React8.createElement(Box7, { flexDirection: "column", padding: 1 }, /* @__PURE__ */ React8.createElement(Text6, { bold: true }, t("tui.mainMenu.selectPreset")), /* @__PURE__ */ React8.createElement(
    SelectInput6,
    {
      items,
      onSelect: async (item) => {
        if (item.value === "__back__") {
          setStep("language");
          return;
        }
        const preset = PRESETS[item.value] ?? {};
        const next = SettingsSchema.parse({ ...settings, ...preset });
        await onSave(next);
        exit();
      }
    }
  ));
}

// src/tui/setup.ts
async function runSetupWizard() {
  const settings = await loadSettings();
  const { waitUntilExit } = render2(
    React9.createElement(SetupWizard, { initialSettings: settings, onSave: saveSettings })
  );
  await waitUntilExit();
}

// src/config/install.ts
import fs8 from "fs";
import path6 from "path";
import os5 from "os";
import { fileURLToPath } from "url";
function getClaudeSettingsPath() {
  const dir = process.env.CLAUDE_CONFIG_DIR ?? path6.join(os5.homedir(), ".claude");
  return path6.join(dir, "settings.json");
}
async function resolveCliPath() {
  const pluginCacheBase = path6.join(
    os5.homedir(),
    ".claude",
    "plugins",
    "cache",
    "festatusline",
    "festatusline"
  );
  try {
    const versions = await fs8.promises.readdir(pluginCacheBase);
    const sorted = versions.filter((v) => /^\d+\.\d+\.\d+$/.test(v)).sort((a, b) => a.localeCompare(b, void 0, { numeric: true }));
    const latest = sorted.at(-1);
    if (latest) {
      return path6.join(pluginCacheBase, latest, "dist", "cli.js");
    }
  } catch {
  }
  return fileURLToPath(import.meta.url);
}
async function installToClaude(force = false) {
  const settingsPath = getClaudeSettingsPath();
  let current = {};
  try {
    const raw = await fs8.promises.readFile(settingsPath, "utf8");
    current = JSON.parse(raw);
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
    await fs8.promises.writeFile(backup, `${JSON.stringify(current, null, 2)}
`, "utf8");
  }
  const cliPath = await resolveCliPath();
  current.statusLine = {
    type: "command",
    command: `node ${cliPath}`,
    refreshIntervalMs: 6e4
  };
  await fs8.promises.mkdir(path6.dirname(settingsPath), { recursive: true });
  await fs8.promises.writeFile(settingsPath, `${JSON.stringify(current, null, 2)}
`, "utf8");
  process.stdout.write(`${t("install.success")}
`);
}

// src/config/doctor.ts
import fs9 from "fs";
import path7 from "path";
import os6 from "os";
async function exists(p) {
  try {
    await fs9.promises.access(p);
    return true;
  } catch {
    return false;
  }
}
async function runDoctor() {
  const claudeDir = process.env.CLAUDE_CONFIG_DIR ?? path7.join(os6.homedir(), ".claude");
  const codexDir = process.env.CODEX_CONFIG_DIR ?? path7.join(os6.homedir(), ".codex");
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
chalk4.level = 3;
function isLocale(v) {
  return v === "ko" || v === "en" || v === "zh";
}
var commands = {
  setup: () => runSetupWizard(),
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