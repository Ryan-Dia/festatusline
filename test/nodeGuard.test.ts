import { describe, it, expect } from 'vitest';
import { guardAction, tooOldMessage } from '../src/nodeGuard.js';

describe('guardAction', () => {
  it('runs on Node 22 and later', () => {
    expect(guardAction('v22.0.0', undefined, false)).toBe('run');
    expect(guardAction('v24.3.1', 'install', true)).toBe('run');
  });

  it('shows the message in the statusline when Claude Code pipes the payload in', () => {
    expect(guardAction('v20.11.1', undefined, false)).toBe('statusline');
  });

  it('stays silent in the SessionStart hook', () => {
    expect(guardAction('v18.20.4', 'migrate', false)).toBe('silent');
  });

  it('fails other commands and the TUI', () => {
    expect(guardAction('v20.11.1', 'install', false)).toBe('error');
    expect(guardAction('v20.11.1', undefined, true)).toBe('error');
  });
});

describe('tooOldMessage', () => {
  it('asks for the update and names the found version', () => {
    expect(tooOldMessage('v20.11.1')).toBe(
      'festatusline: please update Node to 22+ (found v20.11.1)',
    );
  });
});
