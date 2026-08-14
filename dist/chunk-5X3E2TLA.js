#!/usr/bin/env node
import {
  SettingsSchema,
  createTranslator,
  getConfigPath,
  getTheme,
  renderAllLines,
  t
} from "./chunk-PZXUSLUV.js";

// src/config/save.ts
import fs from "fs";
import path from "path";
async function saveSettings(settings) {
  const configPath = getConfigPath();
  await fs.promises.mkdir(path.dirname(configPath), { recursive: true });
  await fs.promises.writeFile(configPath, `${JSON.stringify(settings, null, 2)}
`, "utf8");
}

// src/config/presets.ts
var DAILY_ROW = [{ id: "dailyUsage" }, { id: "context" }, { id: "sessionRateLimit" }];
var WEEKLY_ROW = [{ id: "weeklyUsage" }, { id: "weeklyRateLimit" }];
var CODEX_ROW = [{ id: "codexModel" }, { id: "codexWeeklyRateLimit" }];
function withCodexRow(lines) {
  return [...lines.slice(0, 2), CODEX_ROW, ...lines.slice(2)];
}
var PRESETS = {
  minimal: {
    lines: [
      [{ id: "dailyUsage" }, { id: "context" }],
      [{ id: "weeklyUsage" }, { id: "weeklyRateLimit" }],
      [{ id: "model" }]
    ]
  },
  full: {
    lines: [
      [
        { id: "model" },
        { id: "context" },
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
        { id: "context" },
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
  basic: {
    lines: [DAILY_ROW, WEEKLY_ROW]
  },
  pro: {
    lines: [DAILY_ROW, WEEKLY_ROW, [{ id: "spacer" }], [{ id: "model" }, { id: "gitRepo" }]]
  },
  max: {
    lines: [
      DAILY_ROW,
      WEEKLY_ROW,
      [{ id: "spacer" }],
      [{ id: "cacheHit" }, { id: "cacheTtl" }, { id: "sessionCost" }],
      [{ id: "model" }, { id: "gitRepo" }]
    ]
  }
};
var PRESET_NAMES = Object.keys(PRESETS);

// src/tui/screens/LanguageSelect.tsx
import React from "react";
import { Box, Text } from "ink";
import SelectInput from "ink-select-input";
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
  return /* @__PURE__ */ React.createElement(Box, { flexDirection: "column", padding: 1 }, /* @__PURE__ */ React.createElement(Text, { bold: true }, t("tui.mainMenu.selectLanguage")), /* @__PURE__ */ React.createElement(
    SelectInput,
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

// src/tui/screens/PresetPreview.tsx
import React2 from "react";
import { Box as Box2, Text as Text2 } from "ink";

// src/tui/preview.ts
var HOUR_MS = 60 * 60 * 1e3;
var DAY_MS = 24 * HOUR_MS;
function buildPreviewContext(settings) {
  const now = /* @__PURE__ */ new Date();
  const unixAfter = (ms) => Math.floor((now.getTime() + ms) / 1e3);
  return {
    stdin: {
      type: "statusLine",
      model: { id: "claude-opus-5", display_name: "Claude Opus 5" },
      cost: { total_cost_usd: 0.42 },
      context_window: {
        context_window_size: 2e5,
        used_percentage: 38,
        current_usage: {
          input_tokens: 18e3,
          output_tokens: 2400,
          cache_creation_input_tokens: 12e3,
          cache_read_input_tokens: 43e3
        }
      },
      rate_limits: {
        five_hour: { used_percentage: 30, resets_at: unixAfter(3 * HOUR_MS) },
        seven_day: { used_percentage: 25, resets_at: unixAfter(4 * DAY_MS) }
      }
    },
    usage: {
      dailyTokens: 48e4,
      weeklyTokens: 31e5,
      sonnetWeeklyTokens: 13e5,
      allEntries: [],
      lastModel: "claude-opus-5"
    },
    codex: {
      available: true,
      dailyRequests: 12,
      weeklyRequests: 84,
      rateLimits: {
        primary: { usedPercent: 22, resetsAt: unixAfter(2 * HOUR_MS), windowMinutes: 300 },
        secondary: { usedPercent: 10, resetsAt: unixAfter(DAY_MS), windowMinutes: 10080 }
      },
      model: "gpt-5"
    },
    theme: getTheme(settings.theme),
    t: createTranslator(settings.locale),
    now,
    weeklyAnchorDay: settings.weeklyAnchorDay,
    effortLevel: "high",
    cacheTtlCreatedAt: now.getTime() - 30 * 60 * 1e3,
    cacheTtlMs: HOUR_MS
  };
}
function renderLinesPreview(lines, settings) {
  const merged = SettingsSchema.parse({ ...settings, lines });
  const output = renderAllLines(merged.lines, buildPreviewContext(merged), merged.separator);
  if (!output) return [];
  return output.split("\n").map((text, i) => ({ id: `lines:${i}`, text }));
}
function renderPresetPreview(name, settings) {
  const preset = PRESETS[name];
  if (!preset) return [];
  const merged = SettingsSchema.parse({ ...settings, ...preset });
  const output = renderAllLines(merged.lines, buildPreviewContext(merged), merged.separator);
  if (!output) return [];
  return output.split("\n").map((text, i) => ({ id: `${name}:${i}`, text }));
}

// src/tui/screens/PresetPreview.tsx
function resolvePreviewLines(name, lines, settings) {
  if (lines) return renderLinesPreview(lines, settings);
  if (name) return renderPresetPreview(name, settings);
  return [];
}
function PresetPreview({ name, lines, settings }) {
  const previewLines = resolvePreviewLines(name, lines, settings);
  if (!previewLines.length) return null;
  return /* @__PURE__ */ React2.createElement(Box2, { flexDirection: "column", marginTop: 1, paddingX: 1, borderStyle: "round" }, /* @__PURE__ */ React2.createElement(Text2, { dimColor: true }, t("tui.preset.preview")), previewLines.map((line) => /* @__PURE__ */ React2.createElement(Text2, { key: line.id }, line.text)));
}

export {
  saveSettings,
  withCodexRow,
  PRESETS,
  PRESET_NAMES,
  LanguageSelect,
  PresetPreview
};
//# sourceMappingURL=chunk-5X3E2TLA.js.map