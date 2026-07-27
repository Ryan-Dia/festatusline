#!/usr/bin/env node
import {
  getConfigPath,
  t
} from "./chunk-YFNHIZ7Z.js";

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
  lite: {
    lines: [
      [{ id: "dailyUsage" }, { id: "context" }],
      [{ id: "weeklyUsage" }, { id: "weeklyRateLimit" }],
      [{ id: "model" }, { id: "gitRepo" }]
    ]
  },
  plus: {
    lines: [
      [{ id: "dailyUsage" }, { id: "context" }],
      [{ id: "weeklyUsage" }, { id: "weeklyRateLimit" }],
      [{ id: "spacer" }],
      [{ id: "cacheHit" }, { id: "cacheTtl" }, { id: "sessionCost" }],
      [{ id: "model" }, { id: "gitRepo" }]
    ]
  },
  pro: {
    lines: [
      [{ id: "dailyUsage" }, { id: "context" }],
      [{ id: "weeklyUsage" }, { id: "weeklyRateLimit" }],
      [{ id: "codexModel" }, { id: "codexWeeklyRateLimit" }],
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

export {
  saveSettings,
  PRESETS,
  PRESET_NAMES,
  LanguageSelect
};
//# sourceMappingURL=chunk-BZNV6SZX.js.map