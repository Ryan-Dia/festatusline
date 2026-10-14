// No imports on purpose: cli.ts runs this before loading anything else, on whatever Node
// happens to be on PATH.

export const MIN_NODE_MAJOR = 22;

export type GuardAction = 'run' | 'statusline' | 'silent' | 'error';

/**
 * What the CLI should do on this Node. The bundled chalk 6 and the rest need Node 22, and on
 * an older one the statusline would otherwise fail to load and go blank with no hint why.
 */
export function guardAction(
  nodeVersion: string,
  sub: string | undefined,
  isTty: boolean,
): GuardAction {
  const major = Number(nodeVersion.replace(/^v/, '').split('.')[0]);
  if (major >= MIN_NODE_MAJOR) return 'run';
  // The SessionStart hook: its stdout lands in Claude's context, so it never prints.
  if (sub === 'migrate') return 'silent';
  // Claude Code piping the payload in: the statusline itself is where the user will look.
  if (!sub && !isTty) return 'statusline';
  return 'error';
}

export function tooOldMessage(nodeVersion: string): string {
  return `festatusline: please update Node to ${MIN_NODE_MAJOR}+ (found ${nodeVersion})`;
}
