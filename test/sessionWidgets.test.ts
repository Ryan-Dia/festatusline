import { describe, it, expect } from 'vitest';
import { ModelWidget } from '../src/widgets/Model.js';
import { ModelMixWidget } from '../src/widgets/ModelMix.js';
import { PrStatusWidget } from '../src/widgets/PrStatus.js';
import { FastModeWidget } from '../src/widgets/FastMode.js';
import { LinesChangedWidget } from '../src/widgets/LinesChanged.js';
import { GitBranchWidget, GitRepoWidget, formatDirPath } from '../src/widgets/GitInfo.js';
import { emptyFamilyTotals } from '../src/data/modelTier.js';
import { getTheme } from '../src/theme/index.js';
import type { RenderContext } from '../src/widgets/types.js';

function makeCtx(overrides: Partial<RenderContext> = {}): RenderContext {
  return {
    stdin: { type: 'statusLine' },
    usage: null,
    codex: null,
    fableRateLimit: null,
    theme: getTheme('default'),
    t: (k) => k,
    now: new Date('2026-08-25T12:00:00Z'),
    weeklyAnchorDay: null,
    cacheTtlCreatedAt: null,
    cacheTtlMs: 300_000,
    ...overrides,
  };
}

function usageWithMix(byFamily: Partial<Record<string, number>>): RenderContext['usage'] {
  const weightedWeeklyByFamily = { ...emptyFamilyTotals(), ...byFamily };
  const weightedWeekly = Object.values(weightedWeeklyByFamily).reduce((a, b) => a + b, 0);
  return {
    dailyTokens: 0,
    weeklyTokens: 0,
    sonnetWeeklyTokens: 0,
    fableWeeklyTokens: 0,
    weightedDaily: 0,
    weightedWeekly,
    weightedWeeklyByFamily,
    allEntries: [],
  };
}

describe('ModelWidget session flags', () => {
  const model = { id: 'claude-opus-5', display_name: 'Claude Opus 5' };

  it('renders just the name when no flag applies', () => {
    expect(ModelWidget.render(makeCtx({ stdin: { model } }), {})).toBe('Opus 5');
  });

  it('appends fast when fast mode is on', () => {
    const ctx = makeCtx({ stdin: { model, fast_mode: true } });
    expect(ModelWidget.render(ctx, {})).toBe('Opus 5 [fast]');
  });

  it('combines effort and fast mode in one bracket', () => {
    const ctx = makeCtx({
      stdin: { model, fast_mode: true, effort: { level: 'xhigh' }, version: '2.1.243' },
    });
    expect(ModelWidget.render(ctx, {})).toBe('Opus 5 [xhigh, fast]');
  });

  it('flags thinking only when explicitly disabled', () => {
    const off = makeCtx({ stdin: { model, thinking: { enabled: false } } });
    expect(ModelWidget.render(off, {})).toBe('Opus 5 [no-think]');

    const on = makeCtx({ stdin: { model, thinking: { enabled: true } } });
    expect(ModelWidget.render(on, {})).toBe('Opus 5');
  });

  it('leaves fast mode off when the field is absent or false', () => {
    expect(ModelWidget.render(makeCtx({ stdin: { model, fast_mode: false } }), {})).toBe('Opus 5');
  });
});

describe('FastModeWidget', () => {
  it('renders only while fast mode is on', () => {
    expect(FastModeWidget.render(makeCtx({ stdin: { fast_mode: true } }), {})).toBe('»fast');
    expect(FastModeWidget.render(makeCtx({ stdin: { fast_mode: false } }), {})).toBeNull();
    expect(FastModeWidget.render(makeCtx(), {})).toBeNull();
  });
});

describe('LinesChangedWidget', () => {
  it('renders the added and removed counts', () => {
    const ctx = makeCtx({ stdin: { cost: { total_lines_added: 156, total_lines_removed: 23 } } });
    expect(LinesChangedWidget.render(ctx, {})).toBe('+156/-23');
  });

  it('treats a missing half as zero', () => {
    const ctx = makeCtx({ stdin: { cost: { total_lines_added: 8 } } });
    expect(LinesChangedWidget.render(ctx, {})).toBe('+8/-0');
  });

  it('renders nothing before anything has been edited', () => {
    expect(LinesChangedWidget.render(makeCtx(), {})).toBeNull();
    const zeroed = makeCtx({ stdin: { cost: { total_lines_added: 0, total_lines_removed: 0 } } });
    expect(LinesChangedWidget.render(zeroed, {})).toBeNull();
  });
});

describe('PrStatusWidget', () => {
  it('renders a GitHub pull request with its review glyph', () => {
    const ctx = makeCtx({ stdin: { pr: { number: 1234, review_state: 'approved' } } });
    expect(PrStatusWidget.render(ctx, {})).toBe('PR #1234 ✓');
  });

  it('uses the GitLab sigil for a merge request', () => {
    const ctx = makeCtx({
      stdin: { pr: { number: 77, kind: 'mr', review_state: 'changes_requested' } },
    });
    expect(PrStatusWidget.render(ctx, {})).toBe('MR !77 ✗');
  });

  it('omits the glyph when review_state is absent or unrecognized', () => {
    expect(PrStatusWidget.render(makeCtx({ stdin: { pr: { number: 5 } } }), {})).toBe('PR #5');
    const future = makeCtx({ stdin: { pr: { number: 5, review_state: 'something_new' } } });
    expect(PrStatusWidget.render(future, {})).toBe('PR #5');
  });

  it('renders nothing without an open PR', () => {
    expect(PrStatusWidget.render(makeCtx(), {})).toBeNull();
    expect(PrStatusWidget.render(makeCtx({ stdin: { pr: { url: 'x' } } }), {})).toBeNull();
  });
});

describe('ModelMixWidget', () => {
  it('reports each family as a share of the week, largest first', () => {
    const ctx = makeCtx({ usage: usageWithMix({ opus: 75, sonnet: 25 }) });
    expect(ModelMixWidget.render(ctx, {})).toBe('Opus 75% · Sonnet 25%');
  });

  it('drops families below one percent', () => {
    const ctx = makeCtx({ usage: usageWithMix({ opus: 995, sonnet: 4, haiku: 1 }) });
    expect(ModelMixWidget.render(ctx, {})).toBe('Opus 100%');
  });

  it('makes the printed shares add up to exactly 100', () => {
    // Independent rounding of 85.4 / 14.2 / 0.4 would print 85 + 14 + 2 = 101.
    const ctx = makeCtx({ usage: usageWithMix({ fable: 854, opus: 142, sonnet: 24 }) });
    const out = ModelMixWidget.render(ctx, {}) ?? '';
    const total = [...out.matchAll(/(\d+)%/g)].reduce((sum, m) => sum + Number(m[1]), 0);
    expect(total).toBe(100);
    expect(out).toBe('Fable 84% · Opus 14% · Sonnet 2%');
  });

  it('still totals 100 for a lopsided three-way split', () => {
    const ctx = makeCtx({ usage: usageWithMix({ opus: 1, sonnet: 1, haiku: 1 }) });
    const out = ModelMixWidget.render(ctx, {}) ?? '';
    const total = [...out.matchAll(/(\d+)%/g)].reduce((sum, m) => sum + Number(m[1]), 0);
    expect(total).toBe(100);
  });

  it('renders nothing without usage or with an empty week', () => {
    expect(ModelMixWidget.render(makeCtx(), {})).toBeNull();
    expect(ModelMixWidget.render(makeCtx({ usage: usageWithMix({}) }), {})).toBeNull();
  });
});

describe('GitInfo widgets read the payload before shelling out', () => {
  it('shows the current folder name rather than the origin repo name', () => {
    const ctx = makeCtx({
      stdin: {
        workspace: {
          current_dir: '/nonexistent/work/my-clone',
          repo: { host: 'github.com', owner: 'anthropics', name: 'claude-code' },
        },
        worktree: { branch: 'worktree-my-feature' },
      },
    });
    expect(GitRepoWidget.render(ctx, {})).toBe('📁 my-clone(worktree-my-feature)');
  });

  it('adds parent folders up to pathDepth', () => {
    const ctx = makeCtx({
      stdin: {
        workspace: { current_dir: '/nonexistent/work/my-clone' },
        worktree: { branch: 'main' },
      },
      pathDepth: 1,
    });
    expect(GitRepoWidget.render(ctx, {})).toBe('📁 …/work/my-clone(main)');
  });

  it('takes the branch from a --worktree session payload', () => {
    const ctx = makeCtx({
      stdin: {
        workspace: { current_dir: '/nonexistent/path' },
        worktree: { branch: 'worktree-my-feature' },
      },
    });
    expect(GitBranchWidget.render(ctx, {})).toBe('worktree-my-feature');
  });

  it('still shows the folder outside a git repo, without a branch', () => {
    const ctx = makeCtx({ stdin: { workspace: { current_dir: '/' } } });
    expect(GitRepoWidget.render(ctx, {})).toBe('📁 /');
  });
});

describe('formatDirPath', () => {
  const home = '/Users/me';
  const deep = '/Users/me/dev/company/team/orca/festatusline';

  it('shows only the folder name at depth 0', () => {
    expect(formatDirPath(deep, 0, home)).toBe('festatusline');
    expect(formatDirPath('/Users/me/orca', 0, home)).toBe('orca');
  });

  it('marks cut-off parents with …/', () => {
    expect(formatDirPath(deep, 1, home)).toBe('…/orca/festatusline');
    expect(formatDirPath(deep, 2, home)).toBe('…/team/orca/festatusline');
    expect(formatDirPath(deep, 3, home)).toBe('…/company/team/orca/festatusline');
  });

  it('starts from ~ once the parents reach the home directory', () => {
    expect(formatDirPath('/Users/me/dev/orca/festatusline', 3, home))
      .toBe('~/dev/orca/festatusline');
    expect(formatDirPath('/Users/me/orca/festatusline', 2, home)).toBe('~/orca/festatusline');
    expect(formatDirPath('/Users/me/orca/festatusline', 3, home)).toBe('~/orca/festatusline');
  });

  it('starts from / once the parents reach the root outside home', () => {
    expect(formatDirPath('/opt/work/infra/orca/festatusline', 3, home))
      .toBe('…/work/infra/orca/festatusline');
    expect(formatDirPath('/opt/orca', 3, home)).toBe('/opt/orca');
  });

  it('does not treat a sibling that shares the home prefix as home', () => {
    expect(formatDirPath('/Users/meow/orca', 2, home)).toBe('/Users/meow/orca');
  });

  it('renders home and root themselves', () => {
    expect(formatDirPath(home, 0, home)).toBe('~');
    expect(formatDirPath(`${home}/`, 2, home)).toBe('~');
    expect(formatDirPath('/', 1, home)).toBe('/');
  });
});
