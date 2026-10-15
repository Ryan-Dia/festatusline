import { readFileSync } from 'fs';
import { defineConfig, type Options } from 'tsup';

const { version } = JSON.parse(readFileSync('package.json', 'utf8')) as { version: string };

// `import { z } from "zod"` pulls in zod's whole namespace, including `z.locales`: every
// locale, ~360 KB that the statusline re-parsed on every render for nothing. Nothing here
// reads `z.locales`, and zod registers its English messages from locales/en.js directly, so
// the index that re-exports all of them is swapped for an empty module.
const dropZodLocales: NonNullable<Options['esbuildPlugins']>[number] = {
  name: 'drop-zod-locales',
  setup(build) {
    build.onResolve({ filter: /\/locales\/index\.js$/ }, (args) =>
      /[\\/]node_modules[\\/]zod[\\/]/.test(args.importer)
        ? { path: 'zod-locales', namespace: 'zod-locales-stub' }
        : undefined,
    );
    build.onLoad({ filter: /.*/, namespace: 'zod-locales-stub' }, () => ({
      contents: 'export {};',
      loader: 'js',
    }));
  },
};

export default defineConfig({
  entry: ['src/cli.ts'],
  format: ['esm'],
  target: 'node22',
  platform: 'node',
  clean: true,
  // Code splitting is required so the dynamic import()s in cli.ts/main.ts (used to
  // lazy-load the ink/react-based TUI) produce a separate chunk file that's
  // only resolved when actually invoked — otherwise esbuild inlines
  // everything into one file and hoists react/ink's imports to the top,
  // making them eagerly required even for the plain statusline render path.
  splitting: true,
  sourcemap: true,
  // Bundle only the statusline render path's own deps (chalk, zod). The TUI's
  // ink/react tree pulls in CJS packages with dynamic-require shims that don't
  // survive ESM bundling cleanly, and the render path (what Claude Code's
  // statusLine hook actually invokes) never touches them.
  noExternal: ['chalk', 'zod'],
  esbuildPlugins: [dropZodLocales],
  // The render compares this against update.json's minVersion (src/data/updateCheck.ts).
  define: { FESTATUSLINE_VERSION: JSON.stringify(version) },
  banner: {
    js: '#!/usr/bin/env node',
  },
});
