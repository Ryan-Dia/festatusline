import { describe, it, expect } from 'vitest';
import { renderPresetPreview, renderLinesPreview } from '../src/tui/preview.js';
import { PRESETS, PRESET_NAMES, withCodexRow } from '../src/config/presets.js';
import { SettingsSchema } from '../src/config/schema.js';
import { displayWidth } from '../src/utils/width.js';

const SETTINGS = SettingsSchema.parse({ locale: 'ko' });
const ANSI_RE = new RegExp(`${String.fromCharCode(27)}\\[[0-9;]*m`, 'g');

function plain(name: string, settings = SETTINGS): string[] {
  return renderPresetPreview(name, settings).map((l) => l.text.replace(ANSI_RE, ''));
}

// Terminal column where `mark` first appears — CJK labels take two cells per character, so
// a string index would call aligned rows misaligned.
function column(line: string, mark: string): number {
  return displayWidth(line.slice(0, line.indexOf(mark)));
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
  it('has 2 / 4 / 5 rows', () => {
    expect(plain('basic')).toHaveLength(2);
    expect(plain('pro')).toHaveLength(4);
    expect(plain('max')).toHaveLength(5);
  });

  it('shares the same daily and weekly rows across all three', () => {
    const [basicDaily, basicWeekly] = plain('basic');
    for (const name of ['pro', 'max']) {
      const [daily, weekly] = plain(name);
      expect(daily, name).toBe(basicDaily);
      expect(weekly, name).toBe(basicWeekly);
    }
  });

  it('aligns the weekly and Codex rows against the daily row in every locale', () => {
    for (const locale of ['en', 'ko', 'zh'] as const) {
      const settings = SettingsSchema.parse({ locale });
      const [daily, weekly, codex] = renderLinesPreview(
        withCodexRow(PRESETS.basic.lines ?? []),
        settings,
      ).map((l) => l.text.replace(ANSI_RE, ''));
      for (const [name, row] of [
        ['weekly', weekly],
        ['codex', codex],
      ] as const) {
        expect(column(row, '│'), `${locale} ${name}`).toBe(column(daily, '│'));
        // The first bar of each row ('all' / '7d' under 'Ctx') starts at the same column.
        expect(column(row, '■'), `${locale} ${name}`).toBe(column(daily, '■'));
      }
      // The second bars (Fable under Session) start at the same column too.
      const second = (line: string) =>
        column(line, '│') + 1 + column(line.slice(line.indexOf('│') + 1), '│');
      expect(second(weekly), locale).toBe(second(daily));
    }
  });

  it('translates the row and bar labels but keeps names English', () => {
    const [daily, weekly] = plain('basic', SettingsSchema.parse({ locale: 'ko' }));
    expect(daily).toMatch(/^일간 .*Ctx .*세션 /);
    expect(weekly).toMatch(/^주간 .*전체 .*Fable /);
    const [enDaily, enWeekly] = plain('basic', SettingsSchema.parse({ locale: 'en' }));
    expect(enDaily).toMatch(/^Daily {3}│ Ctx .*│ Session /);
    expect(enWeekly).toMatch(/^Weekly {2}│ all .*│ Fable {3}/);
  });

  it('adds gitRepo on pro and the cache/cost row on max', () => {
    expect(plain('pro').at(-1)).toContain('📁');
    expect(plain('max').some((l) => l.includes('$'))).toBe(true);
  });

  it('does not bundle Codex into any preset by default', () => {
    for (const name of PRESET_NAMES) {
      expect(plain(name).some((l) => l.startsWith('Codex')), name).toBe(false);
    }
  });
});

describe('withCodexRow', () => {
  function plainLines(lines: (typeof PRESETS)['basic']['lines']): string[] {
    return renderLinesPreview(lines ?? [], SETTINGS).map((l) => l.text.replace(ANSI_RE, ''));
  }

  it('inserts a Codex row directly after the weekly row on every tier', () => {
    for (const name of ['basic', 'pro', 'max']) {
      const withCodex = plainLines(withCodexRow(PRESETS[name].lines ?? []));
      const without = plain(name);
      expect(withCodex, name).toHaveLength(without.length + 1);
      expect(withCodex[2], name).toMatch(/^Codex/);
      // Everything else keeps its relative order, just shifted down by one row.
      expect(withCodex[0], name).toBe(without[0]);
      expect(withCodex[1], name).toBe(without[1]);
      expect(withCodex.slice(3), name).toEqual(without.slice(2));
    }
  });
});
