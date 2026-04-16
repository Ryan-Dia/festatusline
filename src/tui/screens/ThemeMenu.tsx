import React from 'react';
import { Box, Text } from 'ink';
import SelectInput from 'ink-select-input';
import { THEME_NAMES, themes } from '../../theme/index.js';
import { t } from '../../i18n/index.js';

interface Props {
  current: string;
  onSelect: (theme: string) => Promise<void>;
  onBack: () => void;
}

export default function ThemeMenu({ current, onSelect, onBack }: Props): React.ReactElement {
  const items = [
    ...THEME_NAMES.map((name) => ({
      label: `${name === current ? '✓ ' : '  '}${name}`,
      value: name,
    })),
    { label: '← 뒤로', value: '__back__' },
  ];

  const theme = themes[current];

  return (
    <Box flexDirection="column" padding={1}>
      <Text bold>{t('tui.mainMenu.selectTheme')}</Text>
      {theme && (
        <Text color={theme.accent}>
          {`accent: ${theme.accent}  warn: ${theme.warn}  danger: ${theme.danger}`}
        </Text>
      )}
      <SelectInput
        items={items}
        onSelect={async (item) => {
          if (item.value === '__back__') {
            onBack();
            return;
          }
          await onSelect(item.value);
        }}
      />
    </Box>
  );
}
