import chalk from 'chalk';
import { renderFromStdin } from './render/index.js';
import { installToClaude } from './config/install.js';
import { runDoctor } from './config/doctor.js';
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

async function main(): Promise<void> {
  const settings = await loadSettings();
  const envLocale = process.env.FESTATUSLINE_LOCALE;
  setLocale(isLocale(envLocale) ? envLocale : settings.locale);
  await dispatch(process.argv);
}

main().catch((err) => {
  process.stderr.write(`festatusline error: ${String(err)}\n`);
  process.exit(1);
});
