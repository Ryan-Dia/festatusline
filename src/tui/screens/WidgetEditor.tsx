import React, { useState } from 'react';
import { Box, Text } from 'ink';
import SelectInput from 'ink-select-input';
import { ALL_WIDGETS } from '../../widgets/index.js';
import { t } from '../../i18n/index.js';
import type { WidgetCfg } from '../../config/schema.js';

interface Props {
  lines: WidgetCfg[][];
  onSave: (lines: WidgetCfg[][]) => Promise<void>;
  onBack: () => void;
}

type EditorMode = 'view' | 'add' | 'remove';

interface ModeProps {
  firstLine: WidgetCfg[];
  onCommit: (updated: WidgetCfg[]) => void;
  onBack: () => void;
}

function WidgetAddMode({ firstLine, onCommit, onBack }: ModeProps): React.ReactElement {
  const existing = new Set(firstLine.map((w) => w.id));
  const items = [
    ...ALL_WIDGETS.filter((w) => !existing.has(w.id)).map((w) => ({
      label: t(w.labelKey),
      value: w.id,
    })),
    { label: t('tui.back'), value: '__back__' },
  ];
  return (
    <Box flexDirection="column" padding={1}>
      <Text bold>위젯 추가</Text>
      <SelectInput
        items={items}
        onSelect={(item) => {
          if (item.value === '__back__') {
            onBack();
            return;
          }
          onCommit([...firstLine, { id: item.value }]);
        }}
      />
    </Box>
  );
}

function WidgetRemoveMode({ firstLine, onCommit, onBack }: ModeProps): React.ReactElement {
  const items = [
    ...firstLine.map((w) => {
      const labelKey = ALL_WIDGETS.find((a) => a.id === w.id)?.labelKey ?? 'widget.model';
      return { label: t(labelKey), value: w.id };
    }),
    { label: t('tui.back'), value: '__back__' },
  ];
  return (
    <Box flexDirection="column" padding={1}>
      <Text bold>위젯 제거</Text>
      <SelectInput
        items={items}
        onSelect={(item) => {
          if (item.value === '__back__') {
            onBack();
            return;
          }
          onCommit(firstLine.filter((w) => w.id !== item.value));
        }}
      />
    </Box>
  );
}

export default function WidgetEditor({ lines, onSave, onBack }: Props): React.ReactElement {
  const [currentLines, setCurrentLines] = useState<WidgetCfg[][]>(lines);
  const [mode, setMode] = useState<EditorMode>('view');

  const firstLine = currentLines[0] ?? [];

  const commitFirstLine = (updated: WidgetCfg[]): void => {
    setCurrentLines([updated, ...currentLines.slice(1)]);
    setMode('view');
  };

  if (mode === 'add') {
    return (
      <WidgetAddMode
        firstLine={firstLine}
        onCommit={commitFirstLine}
        onBack={() => setMode('view')}
      />
    );
  }

  if (mode === 'remove') {
    return (
      <WidgetRemoveMode
        firstLine={firstLine}
        onCommit={commitFirstLine}
        onBack={() => setMode('view')}
      />
    );
  }

  const actions = [
    { label: '+ 위젯 추가', value: 'add' },
    { label: '- 위젯 제거', value: 'remove' },
    { label: '✓ 저장 후 돌아가기', value: 'save' },
    { label: t('tui.cancel'), value: 'back' },
  ];

  return (
    <Box flexDirection="column" padding={1}>
      <Text bold>위젯 편집</Text>
      <Text dimColor>{firstLine.map((w) => w.id).join(' │ ')}</Text>
      <SelectInput
        items={actions}
        onSelect={async (item) => {
          if (item.value === 'add') {
            setMode('add');
            return;
          }
          if (item.value === 'remove') {
            setMode('remove');
            return;
          }
          if (item.value === 'save') {
            await onSave(currentLines);
            return;
          }
          onBack();
        }}
      />
    </Box>
  );
}
