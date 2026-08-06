import React, { useState } from 'react';
import { Box, Text, useApp } from 'ink';
import SelectInput from 'ink-select-input';
import { SettingsSchema, type Settings } from '../../config/schema.js';
import { t, setLocale } from '../../i18n/index.js';
import { PRESETS } from '../../config/presets.js';
import LanguageSelect from './LanguageSelect.js';
import PresetPreview from './PresetPreview.js';

type Step = 'language' | 'preset';

const SETUP_PRESET_NAMES = ['basic', 'pro', 'max'] as const;
const SETUP_PRESET_LABEL_KEYS: Record<string, string> = {
  basic: 'tui.preset.basic',
  pro: 'tui.preset.pro',
  max: 'tui.preset.max',
};

interface Props {
  initialSettings: Settings;
  onSave: (s: Settings) => Promise<void>;
}

export default function SetupWizard({ initialSettings, onSave }: Props): React.ReactElement {
  const { exit } = useApp();
  const [step, setStep] = useState<Step>('language');
  const [settings, setSettings] = useState<Settings>(initialSettings);
  const [highlighted, setHighlighted] = useState<string>(SETUP_PRESET_NAMES[0]);

  if (step === 'language') {
    return (
      <LanguageSelect
        current={settings.locale}
        hideBack
        onSelect={(locale) => {
          setLocale(locale);
          setSettings((prev) => ({ ...prev, locale }));
          setStep('preset');
        }}
        onBack={() => {}}
      />
    );
  }

  const items = [
    ...SETUP_PRESET_NAMES.map((name) => ({
      label: t((SETUP_PRESET_LABEL_KEYS[name] ?? name) as Parameters<typeof t>[0]),
      value: name as string,
    })),
    { label: '← 뒤로', value: '__back__' },
  ];

  return (
    <Box flexDirection="column" padding={1}>
      <Text bold>{t('tui.mainMenu.selectPreset')}</Text>
      <SelectInput
        items={items}
        onHighlight={(item) => setHighlighted(item.value)}
        onSelect={async (item) => {
          if (item.value === '__back__') {
            setStep('language');
            return;
          }
          const preset = PRESETS[item.value] ?? {};
          const next = SettingsSchema.parse({ ...settings, ...preset });
          await onSave(next);
          exit();
        }}
      />
      <PresetPreview name={highlighted} settings={settings} />
    </Box>
  );
}
