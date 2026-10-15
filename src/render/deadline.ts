// A render takes ~0.1 s, and a first one that builds the transcript index a few seconds; the
// OAuth fetch and the Keychain read each give up after 3 s. A render still alive past this is
// stuck on something, and Claude Code has long stopped waiting for its output.
export const RENDER_DEADLINE_MS = 15_000;

/** Ends a stuck render. unref: the timer never keeps a finished render alive. */
export function armRenderDeadline(ms = RENDER_DEADLINE_MS): void {
  setTimeout(() => process.exit(1), ms).unref();
}
