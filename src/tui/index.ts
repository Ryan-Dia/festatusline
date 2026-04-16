import React from 'react';
import { render } from 'ink';
import { loadSettings } from '../config/load.js';
import { saveSettings } from '../config/save.js';
import { setLocale, type Locale } from '../i18n/index.js';
import App from './App.js';

export async function runTui(): Promise<void> {
  const settings = await loadSettings();
  setLocale(settings.locale as Locale);

  const { waitUntilExit } = render(
    React.createElement(App, { initialSettings: settings, onSave: saveSettings }),
  );
  await waitUntilExit();
}
