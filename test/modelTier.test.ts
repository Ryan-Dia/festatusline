import { describe, it, expect } from 'vitest';
import {
  familyLabel,
  isSonnetModel,
  modelFamily,
  modelTier,
  weightedCost,
} from '../src/data/modelTier.js';

describe('modelFamily', () => {
  it('classifies each Claude family from a model id', () => {
    expect(modelFamily('claude-fable-5')).toBe('fable');
    expect(modelFamily('claude-opus-5')).toBe('opus');
    expect(modelFamily('claude-sonnet-4-6')).toBe('sonnet');
    expect(modelFamily('claude-haiku-4-5')).toBe('haiku');
  });

  it('classifies display names and the 1M context suffix', () => {
    expect(modelFamily('Claude Opus 5')).toBe('opus');
    expect(modelFamily('claude-opus-5[1m]')).toBe('opus');
  });

  it('falls back to other for unknown or missing models', () => {
    expect(modelFamily('gpt-5')).toBe('other');
    expect(modelFamily('')).toBe('other');
    expect(modelFamily(null)).toBe('other');
    expect(modelFamily(undefined)).toBe('other');
  });
});

describe('modelTier', () => {
  it('matches the weights Claude Code /usage applies', () => {
    expect(modelTier('claude-fable-5')).toBe(10);
    expect(modelTier('claude-opus-5')).toBe(5);
    expect(modelTier('claude-sonnet-4-6')).toBe(3);
    expect(modelTier('claude-haiku-4-5')).toBe(1);
  });

  it('puts unrecognized models on the same middle tier Claude Code defaults to', () => {
    expect(modelTier('gpt-5')).toBe(3);
    expect(modelTier(undefined)).toBe(3);
  });
});

describe('isSonnetModel', () => {
  it('matches only the sonnet family', () => {
    expect(isSonnetModel('claude-sonnet-4-6')).toBe(true);
    expect(isSonnetModel('Claude Sonnet 5')).toBe(true);
    expect(isSonnetModel('claude-opus-5')).toBe(false);
    expect(isSonnetModel('')).toBe(false);
  });
});

describe('weightedCost', () => {
  const entry = {
    model: 'claude-sonnet-4-6',
    inputTokens: 1_000,
    outputTokens: 100,
    cacheCreationTokens: 200,
    cacheReadTokens: 5_000,
  };

  it('applies the per-token multipliers then the model tier', () => {
    // (5000*1 + 1000*10 + 200*12.5 + 100*50) * 3
    expect(weightedCost(entry)).toBe(22_500 * 3);
  });

  it('scales with the model tier for identical token counts', () => {
    const opus = weightedCost({ ...entry, model: 'claude-opus-5' });
    const sonnet = weightedCost(entry);
    expect(opus / sonnet).toBeCloseTo(5 / 3);
  });

  it('weighs output far above cache reads', () => {
    const base = { model: 'claude-opus-5', inputTokens: 0, cacheCreationTokens: 0 };
    const output = weightedCost({ ...base, outputTokens: 1_000, cacheReadTokens: 0 });
    const cacheRead = weightedCost({ ...base, outputTokens: 0, cacheReadTokens: 1_000 });
    expect(output).toBe(cacheRead * 50);
  });

  it('is zero for an entry with no tokens', () => {
    expect(
      weightedCost({
        model: 'claude-opus-5',
        inputTokens: 0,
        outputTokens: 0,
        cacheCreationTokens: 0,
        cacheReadTokens: 0,
      }),
    ).toBe(0);
  });
});

describe('familyLabel', () => {
  it('returns display labels for every family', () => {
    expect(familyLabel('fable')).toBe('Fable');
    expect(familyLabel('opus')).toBe('Opus');
    expect(familyLabel('sonnet')).toBe('Sonnet');
    expect(familyLabel('haiku')).toBe('Haiku');
    expect(familyLabel('other')).toBe('Other');
  });
});
