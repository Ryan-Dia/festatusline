import { describe, it, expect } from 'vitest';
import { renderLine, renderAllLines } from '../src/render/line.js';
import type { RenderContext } from '../src/widgets/types.js';
import { getTheme } from '../src/theme/index.js';
import { createTranslator } from '../src/i18n/index.js';

function makeCtx(override: Partial<RenderContext> = {}): RenderContext {
  return {
    stdin: {
      type: 'statusLine',
      model: { id: 'claude-opus-4', display_name: 'Claude Opus 4' },
      context_window: {
        used_percentage: 10,
        current_usage: {
          input_tokens: 1000,
          output_tokens: 500,
          cache_creation_input_tokens: 0,
          cache_read_input_tokens: 0,
        },
        context_window_size: 200_000,
      },
    },
    usage: null,
    codex: null,
    fableRateLimit: null,
    theme: getTheme('default'),
    t: createTranslator('en'),
    now: new Date('2026-01-01T12:00:00Z'),
    weeklyAnchorDay: null,
    cacheTtlCreatedAt: null,
    cacheTtlMs: 300_000,
    ...override,
  };
}

describe('renderLine', () => {
  it('renders a known widget to a non-empty string', () => {
    const result = renderLine([{ id: 'model' }], makeCtx(), ' | ');
    expect(result.length).toBeGreaterThan(0);
  });

  it('skips unknown widget IDs silently', () => {
    const result = renderLine([{ id: 'no-such-widget' }], makeCtx(), ' | ');
    expect(result).toBe('');
  });

  it('returns empty string when all widgets produce null', () => {
    // gptUsage returns null when codex is not available (codex: null)
    const result = renderLine([{ id: 'gptUsage' }], makeCtx({ codex: null }), ' | ');
    expect(result).toBe('');
  });

  it('joins multiple widgets with the separator', () => {
    const ctx = makeCtx();
    const result = renderLine([{ id: 'model' }, { id: 'spacer' }], ctx, '>>SEP<<');
    expect(result).toContain('>>SEP<<');
  });

  it('applies custom color override from widget config', () => {
    const result = renderLine([{ id: 'model', color: '#ff0000' }], makeCtx(), ' | ');
    expect(result.length).toBeGreaterThan(0);
  });
});

describe('renderAllLines', () => {
  it('renders multiple non-empty lines joined by newline', () => {
    const ctx = makeCtx();
    const result = renderAllLines([[{ id: 'model' }], [{ id: 'spacer' }]], ctx, ' | ');
    const lines = result.split('\n');
    expect(lines.length).toBeGreaterThanOrEqual(1);
    expect(lines.every((l) => l.length > 0)).toBe(true);
  });

  it('filters out lines where all widgets produce null or unknown ids', () => {
    const ctx = makeCtx();
    const result = renderAllLines(
      [[{ id: 'model' }], [{ id: 'totally-unknown-id' }]],
      ctx,
      ' | ',
    );
    expect(result.split('\n')).toHaveLength(1);
  });

  it('returns empty string when all lines are empty', () => {
    const ctx = makeCtx();
    const result = renderAllLines([[{ id: 'no-widget' }]], ctx, ' | ');
    expect(result).toBe('');
  });
});
