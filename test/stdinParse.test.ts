import { describe, it, expect } from 'vitest';
import { parseStdin, salvageStdin } from '../src/data/stdin.js';

describe('parseStdin', () => {
  it('returns an empty payload for blank or malformed input', () => {
    expect(parseStdin('')).toEqual({});
    expect(parseStdin('   ')).toEqual({});
    expect(parseStdin('not json')).toEqual({});
    expect(parseStdin('[1,2,3]')).toEqual({});
  });

  it('keeps the whole payload when context_window fields are null', () => {
    // Regression: Claude Code sends current_usage: null before the first API call and
    // again after /compact, plus null percentages early in a session. A strict
    // number()/object() schema failed the entire parse, blanking model, context and cost.
    const payload = parseStdin(
      JSON.stringify({
        model: { id: 'claude-opus-5', display_name: 'Opus' },
        cost: { total_cost_usd: 1.23 },
        context_window: {
          context_window_size: 1_000_000,
          current_usage: null,
          used_percentage: null,
          remaining_percentage: null,
          total_input_tokens: 15_500,
          total_output_tokens: 1_200,
        },
      }),
    );

    expect(payload.model?.display_name).toBe('Opus');
    expect(payload.cost?.total_cost_usd).toBe(1.23);
    expect(payload.context_window?.context_window_size).toBe(1_000_000);
    expect(payload.context_window?.total_input_tokens).toBe(15_500);
  });

  it('parses the fields added in recent Claude Code releases', () => {
    const payload = parseStdin(
      JSON.stringify({
        prompt_id: '550e8400-e29b-41d4-a716-446655440000',
        workspace: {
          current_dir: '/work/app',
          added_dirs: ['/work/lib'],
          git_worktree: 'feature-xyz',
          repo: { host: 'github.com', owner: 'anthropics', name: 'claude-code' },
        },
        cost: { total_lines_added: 156, total_lines_removed: 23 },
        fast_mode: true,
        thinking: { enabled: false },
        vim: { mode: 'NORMAL' },
        agent: { name: 'security-reviewer' },
        pr: { number: 1234, url: 'https://example.com/pull/1234', review_state: 'pending' },
        worktree: { name: 'my-feature', branch: 'worktree-my-feature' },
      }),
    );

    expect(payload.workspace?.repo?.name).toBe('claude-code');
    expect(payload.workspace?.added_dirs).toEqual(['/work/lib']);
    expect(payload.workspace?.git_worktree).toBe('feature-xyz');
    expect(payload.cost?.total_lines_added).toBe(156);
    expect(payload.fast_mode).toBe(true);
    expect(payload.thinking?.enabled).toBe(false);
    expect(payload.vim?.mode).toBe('NORMAL');
    expect(payload.agent?.name).toBe('security-reviewer');
    expect(payload.pr?.number).toBe(1234);
    expect(payload.worktree?.branch).toBe('worktree-my-feature');
  });

  it('ignores unknown fields instead of failing', () => {
    const payload = parseStdin(
      JSON.stringify({ model: { id: 'claude-opus-5' }, something_new: { nested: true } }),
    );
    expect(payload.model?.id).toBe('claude-opus-5');
    expect('something_new' in payload).toBe(false);
  });
});

describe('salvageStdin', () => {
  it('drops only the field whose type is wrong', () => {
    // If a future release changes a field's type, the status line should lose that one
    // widget rather than every widget.
    const payload = salvageStdin({
      model: { id: 'claude-opus-5', display_name: 'Opus' },
      cost: 'suddenly-a-string',
      fast_mode: true,
    });

    expect(payload.model?.display_name).toBe('Opus');
    expect(payload.fast_mode).toBe(true);
    expect(payload.cost).toBeUndefined();
  });

  it('returns an empty payload for non-objects', () => {
    expect(salvageStdin(null)).toEqual({});
    expect(salvageStdin('string')).toEqual({});
    expect(salvageStdin([1, 2])).toEqual({});
  });

  it('is reached automatically by parseStdin on a strict-parse failure', () => {
    const payload = parseStdin(
      JSON.stringify({ model: { id: 'claude-opus-5' }, context_window: 'broken' }),
    );
    expect(payload.model?.id).toBe('claude-opus-5');
    expect(payload.context_window).toBeUndefined();
  });
});
