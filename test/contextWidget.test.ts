import { describe, it, expect } from 'vitest';
import { ContextWidget } from '../src/widgets/Context.js';
import type { RenderContext } from '../src/widgets/types.js';

const ANSI_RE = new RegExp(`${String.fromCharCode(27)}\\[[0-9;]*m`, 'g');

function clean(str: string | null): string {
  return (str ?? '').replace(ANSI_RE, '');
}

function makeCtx(stdin: Partial<RenderContext['stdin']> = {}): RenderContext {
  return {
    stdin: {
      type: 'statusLine',
      ...stdin,
    },
    usage: null,
    codex: null,
    fableRateLimit: null,
    theme: {
      accent: '#89b4fa',
      dim: '#45475a',
      text: '#cdd6f4',
      subtext: '#a6adc8',
      separator: '#585b70',
      success: '#a6e3a1',
      warning: '#f9e2af',
      error: '#f38ba8',
    },
    t: (k) => k,
    now: new Date('2026-08-14T12:00:00Z'),
    weeklyAnchorDay: null,
    cacheTtlCreatedAt: null,
    cacheTtlMs: 300_000,
  };
}

describe('ContextWidget', () => {
  it('renders standard current_usage payload with bar, percentage, and used/max', () => {
    const ctx = makeCtx({
      context_window: {
        context_window_size: 200_000,
        current_usage: {
          input_tokens: 50_000,
          output_tokens: 1_000,
          cache_creation_input_tokens: 10_000,
          cache_read_input_tokens: 20_000,
        },
      },
    });
    const out = clean(ContextWidget.render(ctx, {}));
    expect(out).toContain('Ctx');
    expect(out).toContain('41%');
    expect(out).toContain('(81K/200K)');
  });

  it('falls back to calculating used tokens from used_percentage when current_usage is absent', () => {
    const ctx = makeCtx({
      context_window: {
        context_window_size: 200_000,
        used_percentage: 25,
      },
    });
    const out = clean(ContextWidget.render(ctx, {}));
    expect(out).toContain('25%');
    expect(out).toContain('(50K/200K)');
  });

  it('falls back to total_input_tokens + total_output_tokens when current_usage is absent', () => {
    const ctx = makeCtx({
      context_window: {
        context_window_size: 200_000,
        total_input_tokens: 40_000,
        total_output_tokens: 6_000,
      },
    });
    const out = clean(ContextWidget.render(ctx, {}));
    expect(out).toContain('23%');
    expect(out).toContain('(46K/200K)');
  });

  it('handles 1M context window when exceeds_200k_tokens is true', () => {
    const ctx = makeCtx({
      exceeds_200k_tokens: true,
      context_window: {
        current_usage: {
          input_tokens: 150_000,
          output_tokens: 5_000,
          cache_creation_input_tokens: 20_000,
          cache_read_input_tokens: 75_000,
        },
      },
    });
    const out = clean(ContextWidget.render(ctx, {}));
    expect(out).toContain('25%');
    expect(out).toContain('(250K/1M)');
  });

  it('renders (-/-) when no context data and no model is present', () => {
    const ctx = makeCtx({});
    const out = clean(ContextWidget.render(ctx, {}));
    expect(out).toContain('0%');
    expect(out).toContain('(-/-)');
  });
});
