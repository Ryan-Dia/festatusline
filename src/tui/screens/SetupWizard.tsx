import React, { useState } from 'react';
import { Box, Text, useApp } from 'ink';
import SelectInput from 'ink-select-input';
import { SettingsSchema, type Settings } from '../../config/schema.js';
import { t, setLocale } from '../../i18n/index.js';
import { PRESETS, expandPreset, withCodexRow } from '../../config/presets.js';
import LanguageSelect from './LanguageSelect.js';
import PresetPreview from './PresetPreview.js';

type Step = 'language' | 'preset' | 'codex' | 'path';
type YesNo = 'yes' | 'no';

const SETUP_PRESET_NAMES = ['basic', 'pro', 'max'] as const;
const PATH_DEPTH_LABEL_KEYS = [
  'tui.setup.pathDepth0',
  'tui.setup.pathDepth1',
  'tui.setup.pathDepth2',
  'tui.setup.pathDepth3',
] as const;
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
  const [chosenPreset, setChosenPreset] = useState<string>(SETUP_PRESET_NAMES[0]);
  const [codexHighlighted, setCodexHighlighted] = useState<YesNo>('no');
  const [codexRow, setCodexRow] = useState(false);
  const [depthHighlighted, setDepthHighlighted] = useState(0);

  const baseLines = expandPreset(chosenPreset);
  const chosenLines = codexRow ? withCodexRow(baseLines) : baseLines;

  // Record the preset and the Codex answer, not the rows they expand to, so a later release
  // that adds a widget to this preset shows up on update.
  const finish = async (withCodex: boolean, pathDepth: number): Promise<void> => {
    const next = SettingsSchema.parse({
      ...settings,
      ...PRESETS[chosenPreset],
      preset: chosenPreset,
      codexRow: withCodex,
      pathDepth,
      lines: undefined,
    });
    await onSave(next);
    exit();
  };

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

  if (step === 'preset') {
    const items = [
      ...SETUP_PRESET_NAMES.map((name) => ({
        label: t((SETUP_PRESET_LABEL_KEYS[name] ?? name) as Parameters<typeof t>[0]),
        value: name as string,
      })),
      { label: t('tui.back'), value: '__back__' },
    ];

    return (
      <Box flexDirection="column" padding={1}>
        <Text bold>{t('tui.mainMenu.selectPreset')}</Text>
        <SelectInput
          items={items}
          onHighlight={(item) => setHighlighted(item.value)}
          onSelect={(item) => {
            if (item.value === '__back__') {
              setStep('language');
              return;
            }
            setChosenPreset(item.value);
            setStep('codex');
          }}
        />
        <PresetPreview name={highlighted} settings={settings} />
      </Box>
    );
  }

  if (step === 'codex') {
    const codexItems = [
      { label: t('tui.setup.codexNo'), value: 'no' as const },
      { label: t('tui.setup.codexYes'), value: 'yes' as const },
      { label: t('tui.back'), value: '__back__' },
    ];

    return (
      <Box flexDirection="column" padding={1}>
        <Text bold>{t('tui.setup.codexQuestion')}</Text>
        <SelectInput
          items={codexItems}
          onHighlight={(item) => {
            if (item.value === 'yes' || item.value === 'no') setCodexHighlighted(item.value);
          }}
          onSelect={async (item) => {
            if (item.value === '__back__') {
              setStep('preset');
              return;
            }
            const withCodex = item.value === 'yes';
            setCodexRow(withCodex);
            // `basic` has no folder widget, so there is nothing for the depth to change.
            if (baseLines.flat().some((w) => w.id === 'gitRepo')) {
              setStep('path');
              return;
            }
            await finish(withCodex, settings.pathDepth);
          }}
        />
        <PresetPreview
          lines={codexHighlighted === 'yes' ? withCodexRow(baseLines) : baseLines}
          settings={settings}
        />
      </Box>
    );
  }

  const pathItems = [
    ...PATH_DEPTH_LABEL_KEYS.map((key, depth) => ({ label: t(key), value: String(depth) })),
    { label: t('tui.back'), value: '__back__' },
  ];

  return (
    <Box flexDirection="column" padding={1}>
      <Text bold>{t('tui.setup.pathQuestion')}</Text>
      <SelectInput
        items={pathItems}
        onHighlight={(item) => {
          if (item.value !== '__back__') setDepthHighlighted(Number(item.value));
        }}
        onSelect={async (item) => {
          if (item.value === '__back__') {
            setStep('codex');
            return;
          }
          await finish(codexRow, Number(item.value));
        }}
      />
      <PresetPreview lines={chosenLines} settings={{ ...settings, pathDepth: depthHighlighted }} />
    </Box>
  );
}
