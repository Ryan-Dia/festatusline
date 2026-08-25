import { describe, it, expect } from 'vitest';
import { shortName, effortLabel, ModelWidget } from '../src/widgets/Model.js';
import type { RenderContext } from '../src/widgets/types.js';
import { getTheme } from '../src/theme/index.js';
import { createTranslator } from '../src/i18n/index.js';

const NOW = new Date('2026-01-01T12:00:00Z');

function makeCtx(overrides: Partial<RenderContext> = {}): RenderContext {
  return {
    stdin: { type: 'statusLine' },
    usage: null,
    codex: null,
    theme: getTheme('default'),
    t: createTranslator('en'),
    now: NOW,
    weeklyAnchorDay: null,
    cacheTtlCreatedAt: null,
    cacheTtlMs: 300_000,
    ...overrides,
  };
}

describe('shortName', () => {
  it('strips "Claude " prefix from display names', () => {
    expect(shortName('Claude Sonnet 4.6')).toBe('Sonnet 4.6');
    expect(shortName('Claude Opus 4.7')).toBe('Opus 4.7');
  });

  it('is case-insensitive for the prefix', () => {
    expect(shortName('claude Sonnet 4.6')).toBe('Sonnet 4.6');
  });

  it('formats model IDs', () => {
    expect(shortName('claude-sonnet-4-6')).toBe('Sonnet 4.6');
    expect(shortName('claude-opus-4-7')).toBe('Opus 4.7');
    expect(shortName('claude-haiku-4-5')).toBe('Haiku 4.5');
  });

  it('formats current-generation IDs that carry no minor version', () => {
    // Regression: these used to fall through unformatted as "opus-5" / "sonnet-5",
    // which is what the model widget showed whenever display_name was absent.
    expect(shortName('claude-opus-5')).toBe('Opus 5');
    expect(shortName('claude-sonnet-5')).toBe('Sonnet 5');
    expect(shortName('claude-fable-5')).toBe('Fable 5');
  });

  it('ignores a trailing date snapshot', () => {
    expect(shortName('claude-sonnet-4-5-20250929')).toBe('Sonnet 4.5');
  });

  it('handles multi-word model names', () => {
    expect(shortName('claude-claude-instant-1-2')).toBe('Claude instant 1.2');
  });

  it('returns unknown IDs as-is (without claude- prefix)', () => {
    expect(shortName('claude-unknown')).toBe('unknown');
  });

  it('returns unknown display names unchanged', () => {
    expect(shortName('gpt-4o')).toBe('gpt-4o');
  });
});

describe('effortLabel', () => {
  it('uses the resolved level from the payload', () => {
    expect(effortLabel({ stdin: { effort: { level: 'max' } } })).toBe('max');
    expect(effortLabel({ stdin: { version: '2.1.243', effort: { level: 'high' } } })).toBe('high');
  });

  it('prefers the payload over CLAUDE_EFFORT when both are present', () => {
    // They always agree in practice — Claude Code builds the env var from the same value —
    // but the payload is the direct channel.
    const ctx = { stdin: { effort: { level: 'max' } }, envEffortLevel: 'xhigh' };
    expect(effortLabel(ctx)).toBe('max');
  });

  it('falls back to CLAUDE_EFFORT when the payload could not be parsed', () => {
    // A payload that failed to parse leaves stdin empty, but Claude Code still exported the
    // level to this spawn, so the label stays correct instead of vanishing.
    expect(effortLabel({ stdin: {}, envEffortLevel: 'xhigh' })).toBe('xhigh');
  });

  it('shows nothing when neither channel carries a level', () => {
    // This is the model-has-no-effort-support case: the payload omits `effort` and Claude
    // Code omits CLAUDE_EFFORT too, so no label is the right answer.
    expect(effortLabel({ stdin: {} })).toBeNull();
    expect(effortLabel({ stdin: { version: '2.1.243' } })).toBeNull();
  });

  it('never reads a level out of the settings file', () => {
    // Regression: `effortLevel` in ~/.claude/settings.json lags the live session — it misses
    // /effort changes and the per-model modelSettings override — so it used to print a level
    // the session was not running at. It is no longer a source at all.
    const stale = { stdin: {}, effortLevel: 'medium' } as Parameters<typeof effortLabel>[0];
    expect(effortLabel(stale)).toBeNull();
  });

  it('labels ultracode when the settings flag is set and effort resolves to xhigh', () => {
    const stdin = { version: '2.1.243', effort: { level: 'xhigh' } };
    expect(effortLabel({ stdin, ultracode: true })).toBe('ultracode');
    expect(effortLabel({ stdin, ultracode: false })).toBe('xhigh');
  });

  it('does not label ultracode when effort resolves to something other than xhigh', () => {
    const stdin = { version: '2.1.243', effort: { level: 'max' } };
    expect(effortLabel({ stdin, ultracode: true })).toBe('max');
  });

  it('passes unmapped levels through as-is', () => {
    expect(effortLabel({ stdin: { effort: { level: 'medium' } } })).toBe('medium');
    expect(effortLabel({ stdin: { effort: { level: 'xhigh' } } })).toBe('xhigh');
  });

  it('maps the legacy max-tokens level from either channel', () => {
    expect(effortLabel({ stdin: { effort: { level: 'max-tokens' } } })).toBe('max');
    expect(effortLabel({ stdin: {}, envEffortLevel: 'max-tokens' })).toBe('max');
  });

  it('hides the legacy normal level', () => {
    expect(effortLabel({ stdin: { effort: { level: 'normal' } } })).toBeNull();
    expect(effortLabel({ stdin: {}, envEffortLevel: 'normal' })).toBeNull();
  });
});

describe('ModelWidget.render', () => {
  it('prefers stdin.model.display_name over everything else', () => {
    const ctx = makeCtx({
      stdin: { type: 'statusLine', model: { id: 'claude-sonnet-4-6', display_name: 'Claude Sonnet 4.6' } },
      sessionLastModel: 'claude-fable-5',
    });
    expect(ModelWidget.render(ctx, {})).toBe('Sonnet 4.6');
  });

  it('falls back to stdin.model.id when display_name is absent', () => {
    const ctx = makeCtx({ stdin: { type: 'statusLine', model: { id: 'claude-sonnet-4-6' } } });
    expect(ModelWidget.render(ctx, {})).toBe('Sonnet 4.6');
  });

  it('falls back to sessionLastModel only when stdin has no model at all', () => {
    const ctx = makeCtx({ stdin: { type: 'statusLine' }, sessionLastModel: 'claude-sonnet-4-6' });
    expect(ModelWidget.render(ctx, {})).toBe('Sonnet 4.6');
  });

  it('never falls back to a different session\'s model just because stdin.model is missing', () => {
    // Regression: this used to fall back to the most-recently-used model across every
    // project on the machine, so right after /clear it could show an unrelated
    // session's model (e.g. Fable) instead of the current session's actual model.
    const ctx = makeCtx({ stdin: { type: 'statusLine' }, sessionLastModel: null });
    expect(ModelWidget.render(ctx, {})).toBe('?');
  });

  it('shows "?" when neither stdin nor the session transcript has a model', () => {
    const ctx = makeCtx({ stdin: { type: 'statusLine' } });
    expect(ModelWidget.render(ctx, {})).toBe('?');
  });
});
