#!/usr/bin/env node
import {
  PRESETS,
  SettingsSchema,
  createTranslator,
  emptyFamilyTotals,
  getConfigPath,
  getTheme,
  renderAllLines,
  resolveLines,
  t
} from "./chunk-JZ3T26QR.js";

// src/config/save.ts
import fs from "fs";
import path from "path";
async function saveSettings(settings) {
  const configPath = getConfigPath();
  await fs.promises.mkdir(path.dirname(configPath), { recursive: true });
  await fs.promises.writeFile(configPath, `${JSON.stringify(settings, null, 2)}
`, "utf8");
}

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
      },
      cost: { total_cost_usd: 0.42, total_lines_added: 156, total_lines_removed: 23 },
      fast_mode: false,
      pr: { number: 1234, url: "https://example.com/pull/1234", review_state: "approved" },
      effort: { level: "xhigh" }
    },
    usage: {
      dailyTokens: 48e4,
      weeklyTokens: 31e5,
      sonnetWeeklyTokens: 13e5,
      fableWeeklyTokens: 0,
      weightedDaily: 24e6,
      weightedWeekly: 155e6,
      weightedWeeklyByFamily: {
        ...emptyFamilyTotals(),
        opus: 11625e4,
        sonnet: 3875e4
      },
      allEntries: []
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
    fableRateLimit: { usedPercent: 89, resetsAt: unixAfter(4 * DAY_MS) },
    theme: getTheme(settings.theme),
    t: createTranslator(settings.locale),
    now,
    weeklyAnchorDay: settings.weeklyAnchorDay,
    cacheTtlCreatedAt: now.getTime() - 30 * 60 * 1e3,
    cacheTtlMs: HOUR_MS
  };
}
function renderLinesPreview(lines, settings) {
  const merged = SettingsSchema.parse({ ...settings, lines });
  const output = renderAllLines(lines, buildPreviewContext(merged), merged.separator);
  if (!output) return [];
  return output.split("\n").map((text, i) => ({ id: `lines:${i}`, text }));
}
function renderPresetPreview(name, settings) {
  const preset = PRESETS[name];
  if (!preset) return [];
  const merged = SettingsSchema.parse({ ...settings, ...preset });
  const output = renderAllLines(
    resolveLines(merged),
    buildPreviewContext(merged),
    merged.separator
  );
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
  LanguageSelect,
  PresetPreview
};
//# sourceMappingURL=chunk-QJF4TD2Y.js.map