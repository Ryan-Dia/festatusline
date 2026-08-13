import { describe, it, expect } from 'vitest';
import { shortName, effortLabel } from '../src/widgets/Model.js';

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
