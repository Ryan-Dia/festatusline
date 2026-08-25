import { describe, it, expect } from 'vitest';
import { resolveLines, expandPreset, PRESETS, withCodexRow } from '../src/config/presets.js';
import { detectLegacyPreset } from '../src/config/legacyPresets.js';
import { SettingsSchema } from '../src/config/schema.js';

const ids = (lines: { id: string }[][]): string[][] => lines.map((row) => row.map((w) => w.id));

// pro + Codex exactly as 0.5.0 and earlier wrote it into settings.json.
const LEGACY_PRO_CODEX = [
  [{ id: 'dailyUsage' }, { id: 'context' }, { id: 'sessionRateLimit' }],
  [{ id: 'weeklyUsage' }, { id: 'weeklyRateLimit' }],
  [{ id: 'codexModel' }, { id: 'codexWeeklyRateLimit' }],
  [{ id: 'spacer' }],
  [{ id: 'model' }, { id: 'gitRepo' }],
];

describe('resolveLines', () => {
  it('expands a stored preset name', () => {
    const settings = SettingsSchema.parse({ preset: 'pro' });
    expect(ids(resolveLines(settings))).toEqual(ids(expandPreset('pro')));
  });

  it('adds the Codex row when the stored opt-in says so', () => {
    const settings = SettingsSchema.parse({ preset: 'pro', codexRow: true });
    expect(ids(resolveLines(settings))).toEqual(ids(withCodexRow(expandPreset('pro'))));
  });

  it('falls back to the default preset when nothing is stored', () => {
    expect(ids(resolveLines(SettingsSchema.parse({})))).toEqual(ids(expandPreset('minimal')));
  });

  it('keeps a hand-edited layout verbatim', () => {
    const custom = [[{ id: 'model' }, { id: 'gitBranch' }]];
    const settings = SettingsSchema.parse({ lines: custom });
    expect(ids(resolveLines(settings))).toEqual([['model', 'gitBranch']]);
  });

  it('lets explicit lines win over a stored preset', () => {
    const custom = [[{ id: 'model' }]];
    const settings = SettingsSchema.parse({ preset: 'max', lines: custom });
    expect(ids(resolveLines(settings))).toEqual([['model']]);
  });

  it('adopts the preset a pre-0.6.0 config was expanded from, so updates reach it', () => {
    // The whole point: this config predates preset tracking and never mentioned "pro", yet it
    // must pick up fableWeeklyRateLimit now that the preset carries it.
    const settings = SettingsSchema.parse({ lines: LEGACY_PRO_CODEX });
    const resolved = ids(resolveLines(settings));
    expect(resolved).toEqual(ids(withCodexRow(expandPreset('pro'))));
    expect(resolved[1]).toContain('fableWeeklyRateLimit');
  });

  it('leaves a legacy layout alone once it carries a color override', () => {
    // Re-expanding the preset would silently drop the color, so treat it as customized.
    const colored = LEGACY_PRO_CODEX.map((row, i) =>
      i === 1 ? [{ id: 'weeklyUsage', color: '#ff0000' }, { id: 'weeklyRateLimit' }] : row,
    );
    const settings = SettingsSchema.parse({ lines: colored });
    expect(ids(resolveLines(settings))).toEqual(ids(colored));
  });
});

describe('detectLegacyPreset', () => {
  it('recognises every basic/pro/max layout, with and without the Codex row', () => {
    for (const name of ['basic', 'pro', 'max']) {
      // Rebuild the pre-0.6.0 weekly row: it had no Fable bar.
      const legacy = expandPreset(name).map((row) =>
        row.filter((w) => w.id !== 'fableWeeklyRateLimit'),
      );
      expect(detectLegacyPreset(legacy), name).toEqual({ name, codexRow: false });
      expect(detectLegacyPreset(withCodexRow(legacy)), `${name}+codex`).toEqual({
        name,
        codexRow: true,
      });
    }
  });

  it('returns null for a layout that matches no preset', () => {
    expect(detectLegacyPreset([[{ id: 'model' }, { id: 'context' }]])).toBeNull();
  });
});

describe('preset definitions', () => {
  it('gives basic, pro, and max the Fable bar via the shared weekly row', () => {
    for (const name of ['basic', 'pro', 'max']) {
      const weeklyRow = PRESETS[name]?.lines?.[1]?.map((w) => w.id) ?? [];
      expect(weeklyRow, name).toContain('fableWeeklyRateLimit');
    }
  });
});
