import React from 'react';
import { render } from 'ink';
import { loadSettings } from '../config/load.js';
import { saveSettings } from '../config/save.js';
import SetupWizard from './screens/SetupWizard.js';

export async function runSetupWizard(): Promise<void> {
  const settings = await loadSettings();
  const { waitUntilExit } = render(
    React.createElement(SetupWizard, { initialSettings: settings, onSave: saveSettings }),
  );
  await waitUntilExit();
}
