import React, { useState } from 'react';
import { Box, Text, useApp } from 'ink';
import type { Settings } from '../config/schema.js';
import { t, setLocale, type Locale } from '../i18n/index.js';
import MainMenu from './screens/MainMenu.js';
import PresetMenu from './screens/PresetMenu.js';
import ThemeMenu from './screens/ThemeMenu.js';
import LanguageSelect from './screens/LanguageSelect.js';
import WidgetEditor from './screens/WidgetEditor.js';

type Screen = 'main' | 'preset' | 'theme' | 'language' | 'widgets';

interface AppProps {
  initialSettings: Settings;
  onSave: (s: Settings) => Promise<void>;
}

export default function App({ initialSettings, onSave }: AppProps): React.ReactElement {
  const { exit } = useApp();
  const [settings, setSettings] = useState<Settings>(initialSettings);
  const [screen, setScreen] = useState<Screen>('main');
  const [saved, setSaved] = useState(false);

  async function handleSave(next: Settings): Promise<void> {
    setSettings(next);
    await onSave(next);
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
  }

  function changeLocale(locale: Locale): void {
    setLocale(locale);
    const next = { ...settings, locale };
    void handleSave(next);
    setScreen('main');
  }

  if (screen === 'preset') {
    return (
      <PresetMenu
        currentSettings={settings}
        onSelect={async (next) => {
          await handleSave(next);
          setScreen('main');
        }}
        onBack={() => setScreen('main')}
      />
    );
  }

  if (screen === 'theme') {
    return (
      <ThemeMenu
        current={settings.theme}
        onSelect={async (theme) => {
          await handleSave({ ...settings, theme });
          setScreen('main');
        }}
        onBack={() => setScreen('main')}
      />
    );
  }

  if (screen === 'language') {
    return (
      <LanguageSelect
        current={settings.locale}
        onSelect={changeLocale}
        onBack={() => setScreen('main')}
      />
    );
  }

  if (screen === 'widgets') {
    return (
      <WidgetEditor
        lines={settings.lines}
        onSave={async (lines) => {
          await handleSave({ ...settings, lines });
          setScreen('main');
        }}
        onBack={() => setScreen('main')}
      />
    );
  }

  return (
    <Box flexDirection="column" padding={1}>
      <Text bold color="cyan">{t('tui.title')}</Text>
      {saved && <Text color="green">✓ 저장됨</Text>}
      <MainMenu
        onSelect={(action) => {
          if (action === 'quit') exit();
          else setScreen(action as Screen);
        }}
      />
    </Box>
  );
}
