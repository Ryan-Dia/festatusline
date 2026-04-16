import fs from "fs";
import path from "path";
import os from "os";
import { t } from "../i18n/index.js";

function getClaudeSettingsPath(): string {
  const dir = process.env["CLAUDE_CONFIG_DIR"] ?? path.join(os.homedir(), ".claude");
  return path.join(dir, "settings.json");
}

export async function installToClaude(): Promise<void> {
  const settingsPath = getClaudeSettingsPath();

  let current: Record<string, unknown> = {};
  try {
    const raw = await fs.promises.readFile(settingsPath, "utf8");
    current = JSON.parse(raw) as Record<string, unknown>;
  } catch {
    // file may not exist yet
  }

  if (current["statusLine"]) {
    process.stdout.write(t("install.alreadySet") + "\n");
    return;
  }

  const backup = settingsPath + ".bak";
  if (Object.keys(current).length > 0) {
    await fs.promises.writeFile(backup, JSON.stringify(current, null, 2) + "\n", "utf8");
  }

  current["statusLine"] = {
    type: "command",
    command: "npx -y festatusline",
  };

  await fs.promises.mkdir(path.dirname(settingsPath), { recursive: true });
  await fs.promises.writeFile(settingsPath, JSON.stringify(current, null, 2) + "\n", "utf8");

  process.stdout.write(t("install.success") + "\n");
}
