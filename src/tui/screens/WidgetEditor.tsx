import React, { useState } from "react";
import { Box, Text, useInput } from "ink";
import SelectInput from "ink-select-input";
import { ALL_WIDGETS } from "../../widgets/index.js";
import { t } from "../../i18n/index.js";
import type { WidgetCfg } from "../../config/schema.js";

interface Props {
  lines: WidgetCfg[][];
  onSave: (lines: WidgetCfg[][]) => Promise<void>;
  onBack: () => void;
}

type EditorMode = "view" | "add" | "remove";

export default function WidgetEditor({ lines, onSave, onBack }: Props): React.ReactElement {
  const [currentLines, setCurrentLines] = useState<WidgetCfg[][]>(lines);
  const [mode, setMode] = useState<EditorMode>("view");

  const firstLine = currentLines[0] ?? [];

  const actions = [
    { label: "+ 위젯 추가", value: "add" },
    { label: "- 위젯 제거", value: "remove" },
    { label: "✓ 저장 후 돌아가기", value: "save" },
    { label: "← 취소", value: "back" },
  ];

  if (mode === "add") {
    const existing = new Set(firstLine.map((w) => w.id));
    const addable = ALL_WIDGETS.filter((w) => !existing.has(w.id)).map((w) => ({
      label: t(w.labelKey),
      value: w.id,
    }));
    return (
      <Box flexDirection="column" padding={1}>
        <Text bold>위젯 추가</Text>
        <SelectInput
          items={[...addable, { label: "← 뒤로", value: "__back__" }]}
          onSelect={(item) => {
            if (item.value === "__back__") { setMode("view"); return; }
            setCurrentLines([[...firstLine, { id: item.value }], ...currentLines.slice(1)]);
            setMode("view");
          }}
        />
      </Box>
    );
  }

  if (mode === "remove") {
    const removable = firstLine.map((w) => ({ label: t((ALL_WIDGETS.find((a) => a.id === w.id)?.labelKey ?? "widget.model")), value: w.id }));
    return (
      <Box flexDirection="column" padding={1}>
        <Text bold>위젯 제거</Text>
        <SelectInput
          items={[...removable, { label: "← 뒤로", value: "__back__" }]}
          onSelect={(item) => {
            if (item.value === "__back__") { setMode("view"); return; }
            setCurrentLines([firstLine.filter((w) => w.id !== item.value), ...currentLines.slice(1)]);
            setMode("view");
          }}
        />
      </Box>
    );
  }

  return (
    <Box flexDirection="column" padding={1}>
      <Text bold>위젯 편집</Text>
      <Text dimColor>{firstLine.map((w) => w.id).join(" │ ")}</Text>
      <SelectInput
        items={actions}
        onSelect={async (item) => {
          if (item.value === "add") { setMode("add"); return; }
          if (item.value === "remove") { setMode("remove"); return; }
          if (item.value === "save") { await onSave(currentLines); return; }
          onBack();
        }}
      />
    </Box>
  );
}
