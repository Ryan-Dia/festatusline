import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { promises as fs } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { pluginCacheDir, pruneOldVersions } from '../src/config/prune.js';
import { launcherPath, launcherSource } from '../src/config/launcher.js';

describe('pruneOldVersions', () => {
  let root: string;
  let claude: string;

  beforeEach(async () => {
    root = await fs.mkdtemp(join(tmpdir(), 'festatusline-prune-'));
    claude = join(root, 'claude');
    process.env.CLAUDE_CONFIG_DIR = claude;
    process.env.XDG_CONFIG_HOME = join(root, 'config');
    await fs.mkdir(join(claude, 'plugins'), { recursive: true });
    await fs.writeFile(join(claude, 'settings.json'), JSON.stringify({ model: 'opus' }));
  });

  afterEach(async () => {
    delete process.env.CLAUDE_CONFIG_DIR;
    delete process.env.XDG_CONFIG_HOME;
    await fs.rm(root, { recursive: true, force: true });
  });

  const cli = (version: string): string => join(pluginCacheDir(), version, 'dist', 'cli.js');

  async function cache(...versions: string[]): Promise<void> {
    await Promise.all(
      versions.map(async (v) => {
        await fs.mkdir(join(pluginCacheDir(), v, 'dist'), { recursive: true });
        await fs.writeFile(cli(v), '');
      }),
    );
  }

  async function install(...versions: string[]): Promise<void> {
    const entries = versions.map((v) => ({ scope: 'user', installPath: join(pluginCacheDir(), v) }));
    await fs.writeFile(
      join(claude, 'plugins', 'installed_plugins.json'),
      JSON.stringify({ version: 2, plugins: { 'festatusline@festatusline': entries } }),
    );
  }

  const left = async (): Promise<string[]> => (await fs.readdir(pluginCacheDir())).sort();

  it('removes versions older than the installed one', async () => {
    await cache('0.9.0', '0.13.2', '0.14.0', '0.15.0');
    await install('0.15.0');
    expect((await pruneOldVersions(cli('0.15.0'))).sort()).toEqual(['0.13.2', '0.14.0', '0.9.0']);
    expect(await left()).toEqual(['0.15.0']);
  });

  it('keeps a newer folder, which may be an update still being written', async () => {
    await cache('0.14.0', '0.15.0', '0.16.0');
    await install('0.15.0');
    await pruneOldVersions(cli('0.15.0'));
    expect(await left()).toEqual(['0.15.0', '0.16.0']);
  });

  it('keeps every version something still names', async () => {
    await cache('0.10.0', '0.12.0', '0.13.0', '0.14.0', '0.15.0');
    // A project-scope install, a pre-0.11.0 pinned statusLine, a launcher fallback and the
    // CLI running this (a session started before the update) each hold one.
    await install('0.15.0', '0.12.0');
    await fs.writeFile(
      join(claude, 'settings.json'),
      JSON.stringify({ statusLine: { command: `node "${cli('0.10.0')}"` } }),
    );
    await fs.mkdir(join(root, 'config', 'festatusline'), { recursive: true });
    await fs.writeFile(launcherPath(), launcherSource(cli('0.13.0')));
    expect(await pruneOldVersions(cli('0.14.0'))).toEqual([]);
    expect(await left()).toEqual(['0.10.0', '0.12.0', '0.13.0', '0.14.0', '0.15.0']);
  });

  it('deletes nothing when it cannot tell what is installed or in use', async () => {
    await cache('0.14.0', '0.15.0');
    expect(await pruneOldVersions('')).toEqual([]);

    await install('0.15.0');
    await fs.writeFile(join(claude, 'settings.json'), '{ "statusLine": {}, }');
    expect(await pruneOldVersions('')).toEqual([]);
    expect(await left()).toEqual(['0.14.0', '0.15.0']);
  });

  it('is a no-op outside a plugin install', async () => {
    expect(await pruneOldVersions('/repo/dist/cli.js')).toEqual([]);
  });
});
