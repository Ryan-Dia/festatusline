import { describe, it, expect } from 'vitest';
import { shortName } from '../src/widgets/Model.js';

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
