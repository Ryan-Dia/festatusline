import { describe, it, expect } from 'vitest';
import { renderPresetPreview } from '../src/tui/preview.js';
import { PRESETS, PRESET_NAMES } from '../src/config/presets.js';
import { SettingsSchema } from '../src/config/schema.js';

const SETTINGS = SettingsSchema.parse({ locale: 'ko' });
const ANSI_RE = new RegExp(`${String.fromCharCode(27)}\\[[0-9;]*m`, 'g');

function plain(name: string): string[] {
  return renderPresetPreview(name, SETTINGS).map((l) => l.text.replace(ANSI_RE, ''));
}

describe('renderPresetPreview', () => {
  it('returns an empty array for an unknown preset', () => {
    expect(renderPresetPreview('nope', SETTINGS)).toEqual([]);
  });

  it('renders every registered preset to at least one line', () => {
    for (const name of PRESET_NAMES) {
      expect(renderPresetPreview(name, SETTINGS).length, name).toBeGreaterThan(0);
    }
  });

  it('renders one preview line per configured row', () => {
    for (const name of PRESET_NAMES) {
      expect(plain(name).length, name).toBe(PRESETS[name].lines?.length);
    }
  });
});

describe('basic / pro / max ladder', () => {
  it('has 2 / 4 / 6 rows', () => {
    expect(plain('basic')).toHaveLength(2);
    expect(plain('pro')).toHaveLength(4);
    expect(plain('max')).toHaveLength(6);
  });

  it('shares the same daily and weekly rows across all three', () => {
    const [basicDaily, basicWeekly] = plain('basic');
    for (const name of ['pro', 'max']) {
      const [daily, weekly] = plain(name);
      expect(daily, name).toBe(basicDaily);
      expect(weekly, name).toBe(basicWeekly);
    }
  });

  it('aligns the weekly row against the daily row above it', () => {
    const [daily, weekly] = plain('basic');
    expect(weekly.indexOf('│')).toBe(daily.indexOf('│'));
    // 'all' sits directly under 'Ctx', so both bars start at the same column.
    expect(weekly.indexOf('■')).toBe(daily.indexOf('■'));
  });

  it('adds gitRepo on pro and the Codex / cache rows on max', () => {
    expect(plain('pro').at(-1)).toContain('📁');
    expect(plain('max').some((l) => l.startsWith('Codex'))).toBe(true);
    expect(plain('max').some((l) => l.includes('$'))).toBe(true);
  });
});
