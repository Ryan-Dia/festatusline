import { execFileSync } from 'child_process';
import { basename } from 'path';
import type { Widget, RenderContext, WidgetConfig } from './types.js';

function gitCommand(args: string[], cwd: string): string | null {
  try {
    return execFileSync('git', args, {
      cwd,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim();
  } catch {
    return null;
  }
}

/** `workspace.current_dir` is the documented preferred spelling; `cwd` is its alias. */
function workspaceDir(ctx: RenderContext): string {
  return ctx.stdin.workspace?.current_dir ?? ctx.stdin.cwd ?? process.cwd();
}

// Cache branch per cwd for 5 s to avoid double git invocation when
// both gitBranch and gitRepo widgets are active in the same render line.
const branchCache = new Map<string, { value: string | null; expiresAt: number }>();

function getCachedBranch(ctx: RenderContext): string | null {
  // A --worktree session already carries its checked-out branch, so skip the subprocess.
  const fromStdin = ctx.stdin.worktree?.branch;
  if (fromStdin) return fromStdin;

  const cwd = workspaceDir(ctx);
  const now = Date.now();
  const cached = branchCache.get(cwd);
  if (cached && now < cached.expiresAt) return cached.value;
  const value = gitCommand(['rev-parse', '--abbrev-ref', 'HEAD'], cwd);
  branchCache.set(cwd, { value, expiresAt: now + 5_000 });
  return value;
}

/**
 * Claude Code parses the repo name off the `origin` remote and ships it on the payload, so
 * the common case costs no subprocess. It is absent outside a git repo and when no origin
 * is configured — an origin-less local repo still has a name, hence the git fallback.
 */
function getRepoName(ctx: RenderContext): string | null {
  const fromStdin = ctx.stdin.workspace?.repo?.name;
  if (fromStdin) return fromStdin;

  const topLevel = gitCommand(['rev-parse', '--show-toplevel'], workspaceDir(ctx));
  return topLevel ? basename(topLevel) : null;
}

export const GitBranchWidget: Widget = {
  id: 'gitBranch',
  labelKey: 'widget.gitBranch',
  render(ctx: RenderContext, _cfg: WidgetConfig): string | null {
    return getCachedBranch(ctx);
  },
};

export const GitRepoWidget: Widget = {
  id: 'gitRepo',
  labelKey: 'widget.gitRepo',
  render(ctx: RenderContext, _cfg: WidgetConfig): string | null {
    const repo = getRepoName(ctx);
    if (!repo) return null;
    const branch = getCachedBranch(ctx);
    return branch ? `📁 ${repo}(${branch})` : `📁 ${repo}`;
  },
};
