#!/usr/bin/env node
import {
  LanguageSelect,
  PRESETS,
  saveSettings
} from "./chunk-BZNV6SZX.js";
import {
  SettingsSchema,
  loadSettings,
  setLocale,
  t
} from "./chunk-YFNHIZ7Z.js";

// src/tui/setup.ts
import React2 from "react";
import { render } from "ink";

// src/tui/screens/SetupWizard.tsx
import React, { useState } from "react";
import { Box, Text, useApp } from "ink";
import SelectInput from "ink-select-input";
var SETUP_PRESET_NAMES = ["lite", "plus", "pro"];
var SETUP_PRESET_LABEL_KEYS = {
  lite: "tui.preset.lite",
  plus: "tui.preset.plus",
  pro: "tui.preset.pro"
};
function SetupWizard({ initialSettings, onSave }) {
  const { exit } = useApp();
  const [step, setStep] = useState("language");
  const [settings, setSettings] = useState(initialSettings);
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
  const { waitUntilExit } = render(
    React2.createElement(SetupWizard, { initialSettings: settings, onSave: saveSettings })
  );
  await waitUntilExit();
}
export {
  runSetupWizard
};
//# sourceMappingURL=setup-ZRYLRBVJ.js.map