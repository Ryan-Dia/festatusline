import { renderFromStdin } from './render/index.js';
import { runTui } from './tui/index.js';
import { installToClaude } from './config/install.js';
import { runDoctor } from './config/doctor.js';
import { loadSettings } from './config/load.js';
import { setLocale, type Locale } from './i18n/index.js';

async function main(): Promise<void> {
  const settings = await loadSettings();
  const envLocale = process.env.FESTATUSLINE_LOCALE as Locale | undefined;
  setLocale(
    envLocale && ['ko', 'en', 'zh'].includes(envLocale) ? envLocale : (settings.locale as Locale),
  );

  const [, , sub] = process.argv;

  if (sub === 'install') {
    const force = process.argv.includes('--force');
    await installToClaude(force);
    return;
  }
  if (sub === 'doctor') {
    await runDoctor();
    return;
  }

  if (!process.stdin.isTTY) {
    await renderFromStdin();
    return;
  }

  await runTui();
}

main().catch((err) => {
  process.stderr.write(`festatusline error: ${String(err)}\n`);
  process.exit(1);
});
