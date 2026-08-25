#!/usr/bin/env node
import {
  LanguageSelect,
  PresetPreview,
  saveSettings
} from "./chunk-QJF4TD2Y.js";
import {
  ALL_WIDGETS,
  PRESETS,
  PRESET_NAMES,
  SettingsSchema,
  THEME_NAMES,
  loadSettings,
  resolveLines,
  setLocale,
  t,
  themes
} from "./chunk-JZ3T26QR.js";

// src/tui/index.ts
import React6 from "react";
import { render } from "ink";

// src/tui/App.tsx
import React5, { useState as useState3 } from "react";
import { Box as Box5, Text as Text4, useApp } from "ink";

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
import React2, { useState } from "react";
import { Box as Box2, Text } from "ink";
import SelectInput2 from "ink-select-input";
var PRESET_LABEL_KEYS = {
  minimal: "tui.preset.minimal",
  full: "tui.preset.full",
  "korean-dev": "tui.preset.koreanDev",
  "multi-cli": "tui.preset.multiCli",
  basic: "tui.preset.basic",
  pro: "tui.preset.pro",
  max: "tui.preset.max"
};
function PresetMenu({
  currentSettings,
  onSelect,
  onBack
}) {
  const [highlighted, setHighlighted] = useState(PRESET_NAMES[0] ?? "");
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
      onHighlight: (item) => setHighlighted(item.value),
      onSelect: async (item) => {
        if (item.value === "__back__") {
          onBack();
          return;
        }
        const next = SettingsSchema.parse({
          ...currentSettings,
          ...PRESETS[item.value] ?? {},
          preset: item.value,
          codexRow: false,
          lines: void 0
        });
        await onSelect(next);
      }
    }
  ), /* @__PURE__ */ React2.createElement(PresetPreview, { name: highlighted, settings: currentSettings }));
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

// src/tui/screens/WidgetEditor.tsx
import React4, { useState as useState2 } from "react";
import { Box as Box4, Text as Text3 } from "ink";
import SelectInput4 from "ink-select-input";
function WidgetAddMode({ firstLine, onCommit, onBack }) {
  const existing = new Set(firstLine.map((w) => w.id));
  const items = [
    ...ALL_WIDGETS.filter((w) => !existing.has(w.id)).map((w) => ({
      label: t(w.labelKey),
      value: w.id
    })),
    { label: "\u2190 \uB4A4\uB85C", value: "__back__" }
  ];
  return /* @__PURE__ */ React4.createElement(Box4, { flexDirection: "column", padding: 1 }, /* @__PURE__ */ React4.createElement(Text3, { bold: true }, "\uC704\uC82F \uCD94\uAC00"), /* @__PURE__ */ React4.createElement(
    SelectInput4,
    {
      items,
      onSelect: (item) => {
        if (item.value === "__back__") {
          onBack();
          return;
        }
        onCommit([...firstLine, { id: item.value }]);
      }
    }
  ));
}
function WidgetRemoveMode({ firstLine, onCommit, onBack }) {
  const items = [
    ...firstLine.map((w) => {
      const labelKey = ALL_WIDGETS.find((a) => a.id === w.id)?.labelKey ?? "widget.model";
      return { label: t(labelKey), value: w.id };
    }),
    { label: "\u2190 \uB4A4\uB85C", value: "__back__" }
  ];
  return /* @__PURE__ */ React4.createElement(Box4, { flexDirection: "column", padding: 1 }, /* @__PURE__ */ React4.createElement(Text3, { bold: true }, "\uC704\uC82F \uC81C\uAC70"), /* @__PURE__ */ React4.createElement(
    SelectInput4,
    {
      items,
      onSelect: (item) => {
        if (item.value === "__back__") {
          onBack();
          return;
        }
        onCommit(firstLine.filter((w) => w.id !== item.value));
      }
    }
  ));
}
function WidgetEditor({ lines, onSave, onBack }) {
  const [currentLines, setCurrentLines] = useState2(lines);
  const [mode, setMode] = useState2("view");
  const firstLine = currentLines[0] ?? [];
  const commitFirstLine = (updated) => {
    setCurrentLines([updated, ...currentLines.slice(1)]);
    setMode("view");
  };
  if (mode === "add") {
    return /* @__PURE__ */ React4.createElement(
      WidgetAddMode,
      {
        firstLine,
        onCommit: commitFirstLine,
        onBack: () => setMode("view")
      }
    );
  }
  if (mode === "remove") {
    return /* @__PURE__ */ React4.createElement(
      WidgetRemoveMode,
      {
        firstLine,
        onCommit: commitFirstLine,
        onBack: () => setMode("view")
      }
    );
  }
  const actions = [
    { label: "+ \uC704\uC82F \uCD94\uAC00", value: "add" },
    { label: "- \uC704\uC82F \uC81C\uAC70", value: "remove" },
    { label: "\u2713 \uC800\uC7A5 \uD6C4 \uB3CC\uC544\uAC00\uAE30", value: "save" },
    { label: "\u2190 \uCDE8\uC18C", value: "back" }
  ];
  return /* @__PURE__ */ React4.createElement(Box4, { flexDirection: "column", padding: 1 }, /* @__PURE__ */ React4.createElement(Text3, { bold: true }, "\uC704\uC82F \uD3B8\uC9D1"), /* @__PURE__ */ React4.createElement(Text3, { dimColor: true }, firstLine.map((w) => w.id).join(" \u2502 ")), /* @__PURE__ */ React4.createElement(
    SelectInput4,
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
  const [settings, setSettings] = useState3(initialSettings);
  const [screen, setScreen] = useState3("main");
  const [saved, setSaved] = useState3(false);
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
    return /* @__PURE__ */ React5.createElement(
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
    return /* @__PURE__ */ React5.createElement(
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
    return /* @__PURE__ */ React5.createElement(
      LanguageSelect,
      {
        current: settings.locale,
        onSelect: changeLocale,
        onBack: () => setScreen("main")
      }
    );
  }
  if (screen === "widgets") {
    return /* @__PURE__ */ React5.createElement(
      WidgetEditor,
      {
        lines: resolveLines(settings),
        onSave: async (lines) => {
          await handleSave({ ...settings, lines, preset: void 0, codexRow: void 0 });
          setScreen("main");
        },
        onBack: () => setScreen("main")
      }
    );
  }
  return /* @__PURE__ */ React5.createElement(Box5, { flexDirection: "column", padding: 1 }, /* @__PURE__ */ React5.createElement(Text4, { bold: true, color: "cyan" }, t("tui.title")), saved && /* @__PURE__ */ React5.createElement(Text4, { color: "green" }, "\u2713 \uC800\uC7A5\uB428"), /* @__PURE__ */ React5.createElement(
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
    React6.createElement(App, { initialSettings: settings, onSave: saveSettings })
  );
  await waitUntilExit();
}
export {
  runTui
};
//# sourceMappingURL=tui-IW7U2ZZO.js.map