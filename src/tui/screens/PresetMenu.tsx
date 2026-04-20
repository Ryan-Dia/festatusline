import React from 'react';
import { Box, Text } from 'ink';
import SelectInput from 'ink-select-input';
import { PRESETS, PRESET_NAMES } from '../../config/presets.js';
import { SettingsSchema, type Settings } from '../../config/schema.js';
import { t } from '../../i18n/index.js';

interface Props {
  currentSettings: Settings;
  onSelect: (settings: Settings) => Promise<void>;
  onBack: () => void;
}

const PRESET_LABEL_KEYS: Record<string, string> = {
  minimal: 'tui.preset.minimal',
  full: 'tui.preset.full',
  'korean-dev': 'tui.preset.koreanDev',
  'multi-cli': 'tui.preset.multiCli',
  lite: 'tui.preset.lite',
  plus: 'tui.preset.plus',
  pro: 'tui.preset.pro',
};

export default function PresetMenu({
  currentSettings,
  onSelect,
  onBack,
}: Props): React.ReactElement {
  const items = [
    ...PRESET_NAMES.map((name) => ({
      label: t((PRESET_LABEL_KEYS[name] ?? name) as Parameters<typeof t>[0]),
      value: name,
    })),
    { label: '← 뒤로', value: '__back__' },
  ];

  return (
    <Box flexDirection="column" padding={1}>
      <Text bold>{t('tui.mainMenu.selectPreset')}</Text>
      <SelectInput
        items={items}
        onSelect={async (item) => {
          if (item.value === '__back__') {
            onBack();
            return;
          }
          const preset = PRESETS[item.value] ?? {};
          const next = SettingsSchema.parse({ ...currentSettings, ...preset });
          await onSelect(next);
        }}
      />
    </Box>
  );
}
