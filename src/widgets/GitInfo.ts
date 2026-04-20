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

export const GitBranchWidget: Widget = {
  id: 'gitBranch',
  labelKey: 'widget.gitBranch',
  render(ctx: RenderContext, _cfg: WidgetConfig): string | null {
    const cwd = ctx.stdin.cwd ?? process.cwd();
    return gitCommand(['rev-parse', '--abbrev-ref', 'HEAD'], cwd);
  },
};

export const GitRepoWidget: Widget = {
  id: 'gitRepo',
  labelKey: 'widget.gitRepo',
  render(ctx: RenderContext, _cfg: WidgetConfig): string | null {
    const cwd = ctx.stdin.cwd ?? process.cwd();
    const topLevel = gitCommand(['rev-parse', '--show-toplevel'], cwd);
    return topLevel ? basename(topLevel) : null;
  },
};
