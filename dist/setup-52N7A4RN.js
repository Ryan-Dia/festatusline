#!/usr/bin/env node
import {
  LanguageSelect,
  PRESETS,
  PresetPreview,
  saveSettings,
  withCodexRow
} from "./chunk-PAGFXNET.js";
import {
  SettingsSchema,
  loadSettings,
  setLocale,
  t
} from "./chunk-ASQAXTWT.js";

// src/tui/setup.ts
import React2 from "react";
import { render } from "ink";

// src/tui/screens/SetupWizard.tsx
import React, { useState } from "react";
import { Box, Text, useApp } from "ink";
import SelectInput from "ink-select-input";
var SETUP_PRESET_NAMES = ["basic", "pro", "max"];
var SETUP_PRESET_LABEL_KEYS = {
  basic: "tui.preset.basic",
  pro: "tui.preset.pro",
  max: "tui.preset.max"
};
function SetupWizard({ initialSettings, onSave }) {
  const { exit } = useApp();
  const [step, setStep] = useState("language");
  const [settings, setSettings] = useState(initialSettings);
  const [highlighted, setHighlighted] = useState(SETUP_PRESET_NAMES[0]);
  const [chosenPreset, setChosenPreset] = useState(SETUP_PRESET_NAMES[0]);
  const [codexHighlighted, setCodexHighlighted] = useState("no");
  if (step === "language") {
    return /* @__PURE__ */ React.createElement(
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
  if (step === "preset") {
    const items = [
      ...SETUP_PRESET_NAMES.map((name) => ({
        label: t(SETUP_PRESET_LABEL_KEYS[name] ?? name),
        value: name
      })),
      { label: "\u2190 \uB4A4\uB85C", value: "__back__" }
    ];
    return /* @__PURE__ */ React.createElement(Box, { flexDirection: "column", padding: 1 }, /* @__PURE__ */ React.createElement(Text, { bold: true }, t("tui.mainMenu.selectPreset")), /* @__PURE__ */ React.createElement(
      SelectInput,
      {
        items,
        onHighlight: (item) => setHighlighted(item.value),
        onSelect: (item) => {
          if (item.value === "__back__") {
            setStep("language");
            return;
          }
          setChosenPreset(item.value);
          setStep("codex");
        }
      }
    ), /* @__PURE__ */ React.createElement(PresetPreview, { name: highlighted, settings }));
  }
  const baseLines = PRESETS[chosenPreset]?.lines ?? [];
  const codexItems = [
    { label: t("tui.setup.codexNo"), value: "no" },
    { label: t("tui.setup.codexYes"), value: "yes" },
    { label: "\u2190 \uB4A4\uB85C", value: "__back__" }
  ];
  return /* @__PURE__ */ React.createElement(Box, { flexDirection: "column", padding: 1 }, /* @__PURE__ */ React.createElement(Text, { bold: true }, t("tui.setup.codexQuestion")), /* @__PURE__ */ React.createElement(
    SelectInput,
    {
      items: codexItems,
      onHighlight: (item) => {
        if (item.value === "yes" || item.value === "no") setCodexHighlighted(item.value);
      },
      onSelect: async (item) => {
        if (item.value === "__back__") {
          setStep("preset");
          return;
        }
        const lines = item.value === "yes" ? withCodexRow(baseLines) : baseLines;
        const preset = { ...PRESETS[chosenPreset], lines };
        const next = SettingsSchema.parse({ ...settings, ...preset });
        await onSave(next);
        exit();
      }
    }
  ), /* @__PURE__ */ React.createElement(
    PresetPreview,
    {
      lines: codexHighlighted === "yes" ? withCodexRow(baseLines) : baseLines,
      settings
    }
  ));
}

// src/tui/setup.ts
async function runSetupWizard() {
  const settings = await loadSettings();
  const { waitUntilExit } = render(
    React2.createElement(SetupWizard, { initialSettings: settings, onSave: saveSettings })
  );
  await waitUntilExit();
}
export {
  runSetupWizard
};
//# sourceMappingURL=setup-52N7A4RN.js.map