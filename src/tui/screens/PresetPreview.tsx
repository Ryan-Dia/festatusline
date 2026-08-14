import React from 'react';
import { Box, Text } from 'ink';
import type { Settings } from '../../config/schema.js';
import { t } from '../../i18n/index.js';
import { renderPresetPreview, renderLinesPreview } from '../preview.js';

interface Props {
  name?: string;
  lines?: Settings['lines'];
  settings: Settings;
}

function resolvePreviewLines(
  name: string | undefined,
  lines: Settings['lines'] | undefined,
  settings: Settings,
): ReturnType<typeof renderPresetPreview> {
  if (lines) return renderLinesPreview(lines, settings);
  if (name) return renderPresetPreview(name, settings);
  return [];
}

export default function PresetPreview({ name, lines, settings }: Props): React.ReactElement | null {
  const previewLines = resolvePreviewLines(name, lines, settings);
  if (!previewLines.length) return null;

  return (
    <Box flexDirection="column" marginTop={1} paddingX={1} borderStyle="round">
      <Text dimColor>{t('tui.preset.preview')}</Text>
      {previewLines.map((line) => (
        <Text key={line.id}>{line.text}</Text>
      ))}
    </Box>
  );
}
