// `prepare` runs on every install, including Claude Code's plugin dependency install, which
// skips dev dependencies (so husky is absent) and runs outside any git repo. Hooks only matter
// in a development checkout, so anywhere husky can't load, skip it instead of failing the
// install.
try {
  const { default: husky } = await import('husky');
  const message = husky();
  if (message) console.log(message);
} catch {
  // husky not installed: a production or plugin install.
}
