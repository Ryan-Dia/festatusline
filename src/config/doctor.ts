import fs from "fs";
import path from "path";
import os from "os";
import { t } from "../i18n/index.js";

async function exists(p: string): Promise<boolean> {
  try {
    await fs.promises.access(p);
    return true;
  } catch {
    return false;
  }
}

export async function runDoctor(): Promise<void> {
  const claudeDir = process.env["CLAUDE_CONFIG_DIR"] ?? path.join(os.homedir(), ".claude");
  const codexDir = process.env["CODEX_CONFIG_DIR"] ?? path.join(os.homedir(), ".codex");

  const claudeOk = await exists(claudeDir);
  const codexOk = await exists(codexDir);

  process.stdout.write(`${t("doctor.claudeDir")}: ${claudeDir} — ${claudeOk ? t("doctor.found") : t("doctor.notFound")}\n`);
  process.stdout.write(`${t("doctor.codexDir")}: ${codexDir} — ${codexOk ? t("doctor.found") : t("doctor.notFound")}\n`);
}
