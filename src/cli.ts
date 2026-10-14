import { guardAction, tooOldMessage } from './nodeGuard.js';

// Everything else loads only after the Node check, so an older Node gets a message instead of
// a module that fails to load.
const action = guardAction(process.version, process.argv[2], Boolean(process.stdin.isTTY));

if (action === 'run') {
  const { main } = await import('./main.js');
  await main().catch((err: unknown) => {
    process.stderr.write(`festatusline error: ${String(err)}\n`);
    process.exit(1);
  });
} else if (action === 'statusline') {
  process.stdout.write(`${tooOldMessage(process.version)}\n`);
} else if (action === 'error') {
  process.stderr.write(`${tooOldMessage(process.version)}\n`);
  process.exitCode = 1;
}
