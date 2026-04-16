import React from 'react';
import { Box } from 'ink';
import SelectInput from 'ink-select-input';
import { t } from '../../i18n/index.js';

interface Props {
  onSelect: (action: string) => void;
}

export default function MainMenu({ onSelect }: Props): React.ReactElement {
  const items = [
    { label: t('tui.mainMenu.editWidgets'), value: 'widgets' },
    { label: t('tui.mainMenu.selectPreset'), value: 'preset' },
    { label: t('tui.mainMenu.selectTheme'), value: 'theme' },
    { label: t('tui.mainMenu.selectLanguage'), value: 'language' },
    { label: t('tui.mainMenu.quit'), value: 'quit' },
  ];

  return (
    <Box flexDirection="column" marginTop={1}>
      <SelectInput
        items={items}
        onSelect={(item) => onSelect(item.value)}
      />
    </Box>
  );
}
