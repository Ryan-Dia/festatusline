import React from 'react';
import { Box, Text } from 'ink';
import SelectInput from 'ink-select-input';
import type { Locale } from '../../i18n/index.js';
import { t } from '../../i18n/index.js';

interface Props {
  current: string;
  onSelect: (locale: Locale) => void;
  onBack: () => void;
}

const LOCALES: Locale[] = ['ko', 'en', 'zh'];

export default function LanguageSelect({ current, onSelect, onBack }: Props): React.ReactElement {
  const items = [
    ...LOCALES.map((l) => ({
      label: `${l === current ? '✓ ' : '  '}${t(`tui.lang.${l}` as Parameters<typeof t>[0])}`,
      value: l,
    })),
    { label: '← 뒤로', value: '__back__' as Locale | '__back__' },
  ];

  return (
    <Box flexDirection="column" padding={1}>
      <Text bold>{t('tui.mainMenu.selectLanguage')}</Text>
      <SelectInput
        items={items as Array<{ label: string; value: string }>}
        onSelect={(item) => {
          if (item.value === '__back__') {
            onBack();
            return;
          }
          onSelect(item.value as Locale);
        }}
      />
    </Box>
  );
}
