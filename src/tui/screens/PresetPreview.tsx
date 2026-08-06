import React from 'react';
import { Box, Text } from 'ink';
import type { Settings } from '../../config/schema.js';
import { t } from '../../i18n/index.js';
import { renderPresetPreview } from '../preview.js';

interface Props {
  name: string;
  settings: Settings;
}

export default function PresetPreview({ name, settings }: Props): React.ReactElement | null {
  const lines = renderPresetPreview(name, settings);
  if (!lines.length) return null;

  return (
    <Box flexDirection="column" marginTop={1} paddingX={1} borderStyle="round">
      <Text dimColor>{t('tui.preset.preview')}</Text>
      {lines.map((line) => (
        <Text key={line.id}>{line.text}</Text>
      ))}
    </Box>
  );
}
