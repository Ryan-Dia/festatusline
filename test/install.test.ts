import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { promises as fs } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { installToClaude } from '../src/config/install.js';
import { launcherPath } from '../src/config/launcher.js';

describe('installToClaude', () => {
  let root: string;
  let settingsPath: string;
  let argv1: string | undefined;

  beforeEach(async () => {
    root = await fs.mkdtemp(join(tmpdir(), 'festatusline-install-'));
    process.env.CLAUDE_CONFIG_DIR = join(root, 'claude');
    process.env.XDG_CONFIG_HOME = join(root, 'config');
    settingsPath = join(root, 'claude', 'settings.json');
    await fs.mkdir(join(root, 'claude'), { recursive: true });
    vi.spyOn(process.stdout, 'write').mockImplementation(() => true);
    [, argv1] = process.argv;
  });

  afterEach(async () => {
    process.argv[1] = argv1 ?? '';
    vi.restoreAllMocks();
    delete process.env.CLAUDE_CONFIG_DIR;
    delete process.env.XDG_CONFIG_HOME;
    await fs.rm(root, { recursive: true, force: true });
  });

  async function statusLine(): Promise<Record<string, unknown>> {
    return JSON.parse(await fs.readFile(settingsPath, 'utf8')).statusLine;
  }

  it('repoints the command but keeps statusLine fields the user tuned', async () => {
    await fs.writeFile(
      settingsPath,
      JSON.stringify({
        model: 'opus',
        statusLine: {
          type: 'command',
          command: 'node /old/cli.js',
          refreshIntervalMs: 10_000,
          padding: 2,
        },
      }),
    );
    await installToClaude(true);
    expect(await statusLine()).toEqual({
      type: 'command',
      command: `node ${JSON.stringify(launcherPath())}`,
      refreshIntervalMs: 10_000,
      padding: 2,
    });
    expect(JSON.parse(await fs.readFile(settingsPath, 'utf8')).model).toBe('opus');
  });

  it('fills in the refresh interval only when none is set', async () => {
    await fs.writeFile(settingsPath, '{}');
    await installToClaude(true);
    expect((await statusLine()).refreshIntervalMs).toBe(60_000);
  });

  it('never makes the launcher fall back to itself', async () => {
    // Running `install` through the launcher puts the launcher in argv[1].
    await fs.writeFile(settingsPath, '{}');
    process.argv[1] = launcherPath();
    await installToClaude(true);
    const source = await fs.readFile(launcherPath(), 'utf8');
    const fallback = /const FALLBACK_CLI = (".*");/.exec(source)?.[1];
    expect(fallback && JSON.parse(fallback)).not.toBe(launcherPath());
  });

  it('replaces the launcher in one step, leaving no temp file behind', async () => {
    await fs.writeFile(settingsPath, '{}');
    await installToClaude(true);
    await installToClaude(true);
    const files = await fs.readdir(join(root, 'config', 'festatusline'));
    expect(files).toEqual(['statusline.mjs']);
  });
});
