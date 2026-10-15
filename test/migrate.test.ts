import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { promises as fs } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import {
  migrateStatusLine,
  pointsAtVersionedCli,
  refreshLauncher,
  scheduleMigration,
} from '../src/config/migrate.js';
import { launcherPath, launcherSource } from '../src/config/launcher.js';

const PINNED = 'node ~/.claude/plugins/cache/festatusline/festatusline/0.7.0/dist/cli.js';

describe('pointsAtVersionedCli', () => {
  it('matches what setups before 0.11.0 wrote, in any quoting or separator', () => {
    expect(pointsAtVersionedCli(PINNED)).toBe(true);
    expect(
      pointsAtVersionedCli(
        'node "/Users/a/.claude/plugins/cache/festatusline/festatusline/0.10.0/dist/cli.js"',
      ),
    ).toBe(true);
    expect(
      pointsAtVersionedCli(
        'node C:\\Users\\a\\.claude\\plugins\\cache\\festatusline\\festatusline\\0.9.0\\dist\\cli.js',
      ),
    ).toBe(true);
  });

  it('leaves the launcher, other statuslines and other plugins alone', () => {
    expect(pointsAtVersionedCli('node "/Users/a/.config/festatusline/statusline.mjs"')).toBe(false);
    expect(pointsAtVersionedCli('npx -y ccstatusline@latest')).toBe(false);
    expect(pointsAtVersionedCli('node ~/.claude/plugins/cache/other/other/1.0.0/dist/cli.js')).toBe(
      false,
    );
    expect(pointsAtVersionedCli(undefined)).toBe(false);
  });
});

describe('migrateStatusLine', () => {
  let root: string;
  let settingsPath: string;

  beforeEach(async () => {
    root = await fs.mkdtemp(join(tmpdir(), 'festatusline-migrate-'));
    process.env.CLAUDE_CONFIG_DIR = join(root, 'claude');
    process.env.XDG_CONFIG_HOME = join(root, 'config');
    settingsPath = join(root, 'claude', 'settings.json');
    await fs.mkdir(join(root, 'claude'), { recursive: true });
  });

  afterEach(async () => {
    delete process.env.CLAUDE_CONFIG_DIR;
    delete process.env.XDG_CONFIG_HOME;
    await fs.rm(root, { recursive: true, force: true });
  });

  async function settings(): Promise<Record<string, unknown>> {
    return JSON.parse(await fs.readFile(settingsPath, 'utf8'));
  }

  it('moves a pinned statusLine onto the launcher, keeping everything else', async () => {
    await fs.writeFile(
      settingsPath,
      JSON.stringify({
        model: 'opus',
        statusLine: { type: 'command', command: PINNED, padding: 1 },
      }),
    );
    expect(await migrateStatusLine()).toBe(true);
    expect(await settings()).toEqual({
      model: 'opus',
      statusLine: {
        type: 'command',
        command: `node ${JSON.stringify(launcherPath())}`,
        padding: 1,
        refreshIntervalMs: 60000,
      },
    });
    await expect(fs.access(launcherPath())).resolves.toBeUndefined();
    expect(await fs.readdir(join(root, 'claude'))).toEqual(['settings.json']);
  });

  it('is a no-op once migrated, and for any other statusline', async () => {
    for (const command of [
      `node ${JSON.stringify(launcherPath())}`,
      'npx -y ccstatusline@latest',
    ]) {
      const raw = JSON.stringify({ statusLine: { type: 'command', command } });
      await fs.writeFile(settingsPath, raw);
      expect(await migrateStatusLine()).toBe(false);
      expect(await fs.readFile(settingsPath, 'utf8')).toBe(raw);
    }
  });

  it('never touches a settings file it cannot read', async () => {
    // A hand-edited file with a trailing comma: rewriting it from scratch would lose it all.
    const broken = `{ "statusLine": { "command": "${PINNED}" }, }`;
    await fs.writeFile(settingsPath, broken);
    expect(await migrateStatusLine()).toBe(false);
    expect(await fs.readFile(settingsPath, 'utf8')).toBe(broken);

    await fs.rm(settingsPath);
    expect(await migrateStatusLine()).toBe(false);
    await expect(fs.access(settingsPath)).rejects.toThrow();
  });

  it('writes through a symlinked settings file and keeps its mode', async () => {
    const real = join(root, 'dotfiles-settings.json');
    await fs.writeFile(real, JSON.stringify({ statusLine: { command: PINNED } }), { mode: 0o600 });
    await fs.symlink(real, settingsPath);
    expect(await migrateStatusLine()).toBe(true);
    expect((await fs.lstat(settingsPath)).isSymbolicLink()).toBe(true);
    expect((await fs.stat(real)).mode & 0o777).toBe(0o600);
    expect(JSON.parse(await fs.readFile(real, 'utf8')).statusLine.command).toContain(
      'statusline.mjs',
    );
  });
});

describe('refreshLauncher', () => {
  let root: string;

  beforeEach(async () => {
    root = await fs.mkdtemp(join(tmpdir(), 'festatusline-refresh-'));
    process.env.XDG_CONFIG_HOME = root;
  });

  afterEach(async () => {
    delete process.env.XDG_CONFIG_HOME;
    await fs.rm(root, { recursive: true, force: true });
  });

  it('rewrites a launcher an older release wrote, keeping its fallback CLI', async () => {
    // What 0.11.0–0.14.0 wrote: no render deadline.
    const old = launcherSource('/repo/dist/cli.js').replace(
      /^if \(!process\.stdin\.isTTY\).*\n/m,
      '',
    );
    await fs.mkdir(join(root, 'festatusline'), { recursive: true });
    await fs.writeFile(launcherPath(), old);
    expect(await refreshLauncher()).toBe(true);
    expect(await fs.readFile(launcherPath(), 'utf8')).toBe(launcherSource('/repo/dist/cli.js'));
    expect(await refreshLauncher()).toBe(false);
  });

  it('moves a plugin-cache fallback onto the running plugin version', async () => {
    const cached = (v: string): string =>
      `/u/.claude/plugins/cache/festatusline/festatusline/${v}/dist/cli.js`;
    await fs.mkdir(join(root, 'festatusline'), { recursive: true });
    await fs.writeFile(launcherPath(), launcherSource(cached('0.14.0')));
    const argv = process.argv[1];
    process.argv[1] = cached('0.15.0');
    try {
      expect(await refreshLauncher()).toBe(true);
    } finally {
      process.argv[1] = argv;
    }
    expect(await fs.readFile(launcherPath(), 'utf8')).toBe(launcherSource(cached('0.15.0')));
  });

  it('never creates a launcher that is not there', async () => {
    expect(await refreshLauncher()).toBe(false);
    await expect(fs.access(launcherPath())).rejects.toThrow();
  });
});

describe('scheduleMigration', () => {
  let root: string;

  beforeEach(async () => {
    root = await fs.mkdtemp(join(tmpdir(), 'festatusline-schedule-'));
    process.env.CLAUDE_CONFIG_DIR = root;
  });

  afterEach(async () => {
    delete process.env.CLAUDE_CONFIG_DIR;
    await fs.rm(root, { recursive: true, force: true });
  });

  // Stands in for dist/cli.js: records the arguments it was started with.
  async function fakeCli(): Promise<{ cli: string; marker: string }> {
    const marker = join(root, 'ran.json');
    const cli = join(root, 'fake-cli.mjs');
    await fs.writeFile(
      cli,
      `import { writeFileSync } from 'fs';\n` +
        `writeFileSync(${JSON.stringify(marker)}, JSON.stringify(process.argv.slice(2)));\n`,
    );
    return { cli, marker };
  }

  it('starts a detached `migrate --now` only when statusLine is pinned', async () => {
    const { cli, marker } = await fakeCli();
    await fs.writeFile(
      join(root, 'settings.json'),
      JSON.stringify({ statusLine: { command: PINNED } }),
    );
    expect(await scheduleMigration(cli)).toBe(true);
    let ran: string | null = null;
    for (let i = 0; i < 50 && ran === null; i += 1) {
      // eslint-disable-next-line no-await-in-loop
      ran = await fs.readFile(marker, 'utf8').catch(async () => {
        await new Promise((resolve) => {
          setTimeout(resolve, 100);
        });
        return null;
      });
    }
    expect(ran).toBe(JSON.stringify(['migrate', '--now']));
  });

  it('starts nothing for any other statusline, keeping session start cheap', async () => {
    const { cli, marker } = await fakeCli();
    await fs.writeFile(
      join(root, 'settings.json'),
      JSON.stringify({ statusLine: { command: 'npx -y ccstatusline@latest' } }),
    );
    expect(await scheduleMigration(cli)).toBe(false);
    await new Promise((resolve) => {
      setTimeout(resolve, 300);
    });
    await expect(fs.access(marker)).rejects.toThrow();
  });
});
