import { EventEmitter } from 'events';
import React from 'react';
import { render } from 'ink';
import { describe, it, expect, vi } from 'vitest';
import SetupWizard from '../src/tui/screens/SetupWizard.js';
import { SettingsSchema, type Settings } from '../src/config/schema.js';

// Enough of a TTY for Ink to read keys from, the way ink-testing-library drives components.
class FakeStdin extends EventEmitter {
  isTTY = true;

  private pending: string | null = null;

  write(data: string): void {
    this.pending = data;
    this.emit('readable');
    this.emit('data', data);
  }

  read(): string | null {
    const data = this.pending;
    this.pending = null;
    return data;
  }

  setEncoding(): void {}

  setRawMode(): void {}

  resume(): void {}

  pause(): void {}

  ref(): void {}

  unref(): void {}
}

class FakeStdout extends EventEmitter {
  columns = 120;

  rows = 40;

  isTTY = true;

  frames: string[] = [];

  write(frame: string): boolean {
    this.frames.push(frame);
    return true;
  }
}

const tick = (): Promise<void> => new Promise((resolve) => { setTimeout(resolve, 30); });

async function runWizard(keys: string[]): Promise<Settings | undefined> {
  const stdin = new FakeStdin();
  const stdout = new FakeStdout();
  const onSave = vi.fn(async () => {});
  const app = render(
    React.createElement(SetupWizard, {
      initialSettings: SettingsSchema.parse({ locale: 'en' }),
      onSave,
    }),
    {
      stdin: stdin as unknown as NodeJS.ReadStream,
      stdout: stdout as unknown as NodeJS.WriteStream,
      debug: true,
      exitOnCtrlC: false,
      patchConsole: false,
    },
  );
  await tick();
  for (const key of keys) {
    stdin.write(key);
    // eslint-disable-next-line no-await-in-loop -- each key must land before the next
    await tick();
  }
  app.unmount();
  return onSave.mock.calls[0]?.[0] as Settings | undefined;
}

const ENTER = '\r';
const DOWN = '\u001B[B';

describe('SetupWizard', () => {
  it('records the preset, the Codex answer and the path depth', async () => {
    // English, then Pro, then Codex "No", then two folders up.
    const saved = await runWizard([ENTER, DOWN, ENTER, ENTER, DOWN, DOWN, ENTER]);
    expect(saved).toMatchObject({ preset: 'pro', codexRow: false, pathDepth: 2 });
  });

  it('saves Codex "Yes" and keeps the default depth', async () => {
    const saved = await runWizard([ENTER, DOWN, ENTER, DOWN, ENTER, ENTER]);
    expect(saved).toMatchObject({ preset: 'pro', codexRow: true, pathDepth: 0 });
  });

  it('skips the path question for basic, which has no folder widget', async () => {
    const saved = await runWizard([ENTER, ENTER, ENTER]);
    expect(saved).toMatchObject({ preset: 'basic', codexRow: false, pathDepth: 0 });
  });
});
