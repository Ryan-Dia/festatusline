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
  it('prefers the resolved level from stdin over the saved setting', () => {
    expect(effortLabel({ stdin: { effort: { level: 'max' } }, effortLevel: 'xhigh' })).toBe('max');
  });

  it('falls back to the saved setting on payloads older than 2.1.119', () => {
    expect(effortLabel({ stdin: { version: '2.1.118' }, effortLevel: 'xhigh' })).toBe('xhigh');
    expect(effortLabel({ stdin: { version: '1.9.999' }, effortLevel: 'xhigh' })).toBe('xhigh');
    expect(effortLabel({ stdin: {}, effortLevel: 'xhigh' })).toBe('xhigh');
  });

  it('drops the fallback from 2.1.119 on, where a missing effort means no support', () => {
    expect(effortLabel({ stdin: { version: '2.1.119' }, effortLevel: 'xhigh' })).toBeNull();
    expect(effortLabel({ stdin: { version: '2.1.226' }, effortLevel: 'xhigh' })).toBeNull();
    expect(effortLabel({ stdin: { version: '3.0.0' }, effortLevel: 'xhigh' })).toBeNull();
  });

  it('still trusts stdin effort on new payloads', () => {
    expect(effortLabel({ stdin: { version: '2.1.226', effort: { level: 'max' } } })).toBe('max');
  });

  it('labels ultracode when the settings flag is set and effort resolves to xhigh', () => {
    const stdin = { version: '2.1.226', effort: { level: 'xhigh' } };
    expect(effortLabel({ stdin, ultracode: true })).toBe('ultracode');
    expect(effortLabel({ stdin, ultracode: false })).toBe('xhigh');
  });

  it('does not label ultracode when effort resolves to something other than xhigh', () => {
    const stdin = { version: '2.1.226', effort: { level: 'max' } };
    expect(effortLabel({ stdin, ultracode: true })).toBe('max');
  });

  it('passes unmapped levels through as-is', () => {
    expect(effortLabel({ stdin: { effort: { level: 'medium' } } })).toBe('medium');
    expect(effortLabel({ stdin: { effort: { level: 'xhigh' } } })).toBe('xhigh');
  });

  it('maps the legacy max-tokens level', () => {
    expect(effortLabel({ stdin: {}, effortLevel: 'max-tokens' })).toBe('max');
  });

  it('hides the legacy normal level and missing values', () => {
    expect(effortLabel({ stdin: {}, effortLevel: 'normal' })).toBeNull();
    expect(effortLabel({ stdin: {} })).toBeNull();
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
