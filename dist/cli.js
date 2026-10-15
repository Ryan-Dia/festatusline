#!/usr/bin/env node
import "./chunk-2H7UOFLK.js";

// src/nodeGuard.ts
var MIN_NODE_MAJOR = 22;
function guardAction(nodeVersion, sub, isTty) {
  const major = Number(nodeVersion.replace(/^v/, "").split(".")[0]);
  if (major >= MIN_NODE_MAJOR) return "run";
  if (sub === "migrate") return "silent";
  if (!sub && !isTty) return "statusline";
  return "error";
}
function tooOldMessage(nodeVersion) {
  return `festatusline: please update Node to ${MIN_NODE_MAJOR}+ (found ${nodeVersion})`;
}

// src/cli.ts
var action = guardAction(process.version, process.argv[2], Boolean(process.stdin.isTTY));
if (action === "run") {
  const { main } = await import("./main-CTFAI7HF.js");
  await main().catch((err) => {
    process.stderr.write(`festatusline error: ${String(err)}
`);
    process.exit(1);
  });
} else if (action === "statusline") {
  process.stdout.write(`${tooOldMessage(process.version)}
`);
} else if (action === "error") {
  process.stderr.write(`${tooOldMessage(process.version)}
`);
  process.exitCode = 1;
}
//# sourceMappingURL=cli.js.map