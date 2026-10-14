#!/usr/bin/env node
import {
  LanguageSelect,
  PresetPreview,
  saveSettings
} from "./chunk-WZK773VF.js";
import {
  PRESETS,
  SettingsSchema,
  expandPreset,
  loadSettings,
  setLocale,
  t,
  withCodexRow
} from "./chunk-WUMAV2DH.js";
import "./chunk-2H7UOFLK.js";

// src/tui/setup.ts
import React2 from "react";
import { render } from "ink";

// src/tui/screens/SetupWizard.tsx
import React, { useState } from "react";
import { Box, Text, useApp } from "ink";
import SelectInput from "ink-select-input";
var SETUP_PRESET_NAMES = ["basic", "pro", "max"];
var PATH_DEPTH_LABEL_KEYS = [
  "tui.setup.pathDepth0",
  "tui.setup.pathDepth1",
  "tui.setup.pathDepth2",
  "tui.setup.pathDepth3"
];
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
  const [codexRow, setCodexRow] = useState(false);
  const [depthHighlighted, setDepthHighlighted] = useState(0);
  const baseLines = expandPreset(chosenPreset);
  const chosenLines = codexRow ? withCodexRow(baseLines) : baseLines;
  const finish = async (withCodex, pathDepth) => {
    const next = SettingsSchema.parse({
      ...settings,
      ...PRESETS[chosenPreset],
      preset: chosenPreset,
      codexRow: withCodex,
      pathDepth,
      lines: void 0
    });
    await onSave(next);
    exit();
  };
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
      { label: t("tui.back"), value: "__back__" }
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
  if (step === "codex") {
    const codexItems = [
      { label: t("tui.setup.codexNo"), value: "no" },
      { label: t("tui.setup.codexYes"), value: "yes" },
      { label: t("tui.back"), value: "__back__" }
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
          const withCodex = item.value === "yes";
          setCodexRow(withCodex);
          if (baseLines.flat().some((w) => w.id === "gitRepo")) {
            setStep("path");
            return;
          }
          await finish(withCodex, settings.pathDepth);
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
  const pathItems = [
    ...PATH_DEPTH_LABEL_KEYS.map((key, depth) => ({ label: t(key), value: String(depth) })),
    { label: t("tui.back"), value: "__back__" }
  ];
  return /* @__PURE__ */ React.createElement(Box, { flexDirection: "column", padding: 1 }, /* @__PURE__ */ React.createElement(Text, { bold: true }, t("tui.setup.pathQuestion")), /* @__PURE__ */ React.createElement(
    SelectInput,
    {
      items: pathItems,
      onHighlight: (item) => {
        if (item.value !== "__back__") setDepthHighlighted(Number(item.value));
      },
      onSelect: async (item) => {
        if (item.value === "__back__") {
          setStep("codex");
          return;
        }
        await finish(codexRow, Number(item.value));
      }
    }
  ), /* @__PURE__ */ React.createElement(PresetPreview, { lines: chosenLines, settings: { ...settings, pathDepth: depthHighlighted } }));
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
//# sourceMappingURL=setup-KLJZOR6C.js.map