import chalk from 'chalk';
import { setTimeout as sleep } from 'timers/promises';
import { renderFromStdin } from './render/index.js';
import { installToClaude } from './config/install.js';
import { runDoctor } from './config/doctor.js';
import { MIGRATE_DELAY_MS, migrateStatusLine, scheduleMigration } from './config/migrate.js';
import { loadSettings } from './config/load.js';
import { setLocale, type Locale } from './i18n/index.js';

chalk.level = 3;

function isLocale(v: string | undefined): v is Locale {
  return v === 'ko' || v === 'en' || v === 'zh';
}

type Command = (args: string[]) => Promise<void>;

// Dynamically imported so the statusline render path (the hot path, invoked
// on every message) never has to resolve ink/react — only the interactive
// TUI and setup wizard do.
const commands: Record<string, Command> = {
  setup: async () => {
    const { runSetupWizard } = await import('./tui/setup.js');
    return runSetupWizard();
  },
  install: (args) => installToClaude(args.includes('--force')),
  doctor: () => runDoctor(),
  // Run by the plugin's SessionStart hook on every start. Silent and never failing: a hook's
  // stdout lands in Claude's context, and a stale statusLine is no reason to bother anyone.
  migrate: async (args) => {
    if (args.includes('--now')) {
      await sleep(MIGRATE_DELAY_MS);
      await migrateStatusLine().catch(() => false);
      return;
    }
    // The hook runs this as `node <plugin>/dist/cli.js migrate`, so argv[1] is that same CLI.
    await scheduleMigration(process.argv[1] ?? '').catch(() => false);
  },
};

async function dispatch(argv: string[]): Promise<void> {
  const [, , sub, ...rest] = argv;
  const cmd = sub ? commands[sub] : undefined;
  if (cmd) {
    await cmd(rest);
    return;
  }
  if (!process.stdin.isTTY) {
    await renderFromStdin();
    return;
  }
  const { runTui } = await import('./tui/index.js');
  await runTui();
}

export async function main(): Promise<void> {
  const settings = await loadSettings();
  const envLocale = process.env.FESTATUSLINE_LOCALE;
  setLocale(isLocale(envLocale) ? envLocale : settings.locale);
  await dispatch(process.argv);
}
