import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { promises as fs } from 'fs';
import { execFileSync } from 'child_process';
import { join } from 'path';
import { tmpdir } from 'os';
import { launcherSource } from '../src/config/launcher.js';

// Each fake CLI prints which copy ran, so the test sees what the launcher picked.
async function fakeCli(dir: string, name: string): Promise<string> {
  const cli = join(dir, 'dist', 'cli.js');
  await fs.mkdir(join(dir, 'dist'), { recursive: true });
  await fs.writeFile(cli, `process.stdout.write(${JSON.stringify(name)});\n`);
  return cli;
}

describe('statusline launcher', () => {
  let root: string;
  let claudeDir: string;
  let cacheBase: string;
  let launcher: string;

  beforeEach(async () => {
    root = await fs.mkdtemp(join(tmpdir(), 'festatusline-launcher-'));
    claudeDir = join(root, 'claude');
    cacheBase = join(claudeDir, 'plugins', 'cache', 'festatusline', 'festatusline');
    launcher = join(root, 'statusline.mjs');
  });

  afterEach(async () => {
    await fs.rm(root, { recursive: true, force: true });
  });

  async function run(fallbackCli: string): Promise<string> {
    await fs.writeFile(launcher, launcherSource(fallbackCli));
    return execFileSync(process.execPath, [launcher], {
      env: { ...process.env, CLAUDE_CONFIG_DIR: claudeDir },
      encoding: 'utf8',
    });
  }

  async function writeRegistry(entries: unknown[]): Promise<void> {
    await fs.mkdir(join(claudeDir, 'plugins'), { recursive: true });
    await fs.writeFile(
      join(claudeDir, 'plugins', 'installed_plugins.json'),
      JSON.stringify({ version: 2, plugins: { 'festatusline@festatusline': entries } }),
    );
  }

  it('runs the version the plugin registry says is installed', async () => {
    await fakeCli(join(cacheBase, '0.9.1'), 'v0.9.1');
    await fakeCli(join(cacheBase, '0.10.0'), 'v0.10.0');
    await writeRegistry([{ scope: 'user', installPath: join(cacheBase, '0.9.1') }]);
    expect(await run('/nowhere/cli.js')).toBe('v0.9.1');
  });

  it('prefers the user-scope install over a project-scope one', async () => {
    await fakeCli(join(root, 'project-copy'), 'project');
    await fakeCli(join(cacheBase, '0.10.0'), 'user');
    await writeRegistry([
      { scope: 'project', installPath: join(root, 'project-copy') },
      { scope: 'user', installPath: join(cacheBase, '0.10.0') },
    ]);
    expect(await run('/nowhere/cli.js')).toBe('user');
  });

  it('falls back to the newest cached version, comparing numerically', async () => {
    await fakeCli(join(cacheBase, '0.9.1'), 'v0.9.1');
    await fakeCli(join(cacheBase, '0.10.0'), 'v0.10.0');
    await writeRegistry([{ scope: 'user', installPath: join(root, 'deleted') }]);
    expect(await run('/nowhere/cli.js')).toBe('v0.10.0');
  });

  it('falls back to the CLI that wrote it when no plugin is installed', async () => {
    const checkout = await fakeCli(join(root, 'checkout'), 'checkout');
    expect(await run(checkout)).toBe('checkout');
  });

  it('says how to fix it rather than crashing when nothing is found', async () => {
    expect(await run('/nowhere/cli.js')).toContain('/festatusline:setup');
  });
});
