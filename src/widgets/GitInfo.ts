import { execFileSync } from 'child_process';
import { homedir } from 'os';
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

function splitPath(p: string): string[] {
  return p.split(/[\\/]+/).filter(Boolean);
}

/**
 * The folder name, plus `depth` parent folders when asked for. Paths under the home directory
 * start from `~`; once the requested parents stop short of `~` or the filesystem root, a `…/`
 * marks the cut. Depth 0 is the bare folder name whatever sits above it.
 */
export function formatDirPath(dir: string, depth: number, home: string): string {
  const segments = splitPath(dir);
  const homeSegments = splitPath(home);
  const underHome =
    homeSegments.length > 0 &&
    homeSegments.length <= segments.length &&
    homeSegments.every((segment, i) => segment === segments[i]);
  const rest = underHome ? segments.slice(homeSegments.length) : segments;
  if (!rest.length) return underHome ? '~' : '/';

  const shown = rest.slice(-(depth + 1));
  if (depth === 0) return shown.join('/');
  if (shown.length < rest.length) return `…/${shown.join('/')}`;
  return `${underHome ? '~' : ''}/${shown.join('/')}`;
}

export const GitBranchWidget: Widget = {
  id: 'gitBranch',
  labelKey: 'widget.gitBranch',
  render(ctx: RenderContext, _cfg: WidgetConfig): string | null {
    return getCachedBranch(ctx);
  },
};

// The id predates the folder display: it showed the origin repo name, and stays `gitRepo` so
// saved layouts and the legacy preset fingerprints keep matching.
export const GitRepoWidget: Widget = {
  id: 'gitRepo',
  labelKey: 'widget.gitRepo',
  render(ctx: RenderContext, _cfg: WidgetConfig): string | null {
    const folder = formatDirPath(workspaceDir(ctx), ctx.pathDepth ?? 0, homedir());
    const branch = getCachedBranch(ctx);
    return branch ? `📁 ${folder}(${branch})` : `📁 ${folder}`;
  },
};
