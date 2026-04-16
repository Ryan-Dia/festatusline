import fs from "fs";
import path from "path";
import { getConfigPath } from "./load.js";
import type { Settings } from "./schema.js";

export async function saveSettings(settings: Settings): Promise<void> {
  const configPath = getConfigPath();
  await fs.promises.mkdir(path.dirname(configPath), { recursive: true });
  await fs.promises.writeFile(configPath, JSON.stringify(settings, null, 2) + "\n", "utf8");
}
