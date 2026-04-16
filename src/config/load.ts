import fs from "fs";
import path from "path";
import os from "os";
import { SettingsSchema, type Settings } from "./schema.js";

export function getConfigPath(): string {
  const dir = process.env["XDG_CONFIG_HOME"] ?? path.join(os.homedir(), ".config");
  return path.join(dir, "festatusline", "settings.json");
}

export async function loadSettings(): Promise<Settings> {
  const configPath = getConfigPath();
  try {
    const raw = await fs.promises.readFile(configPath, "utf8");
    return SettingsSchema.parse(JSON.parse(raw));
  } catch {
    return SettingsSchema.parse({});
  }
}
