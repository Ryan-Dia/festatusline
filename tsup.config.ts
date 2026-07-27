import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/cli.ts"],
  format: ["esm"],
  target: "node18",
  platform: "node",
  clean: true,
  // Code splitting is required so the dynamic import()s in cli.ts (used to
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
  noExternal: ["chalk", "zod"],
  banner: {
    js: "#!/usr/bin/env node",
  },
});
