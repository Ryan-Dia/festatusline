import fs from 'fs';
import path from 'path';
import os from 'os';
import { z } from 'zod';

const ClaudeSettingsSchema = z.object({
  effortLevel: z.string().optional(),
});

export type ClaudeSettings = z.infer<typeof ClaudeSettingsSchema>;

export async function readClaudeSettings(): Promise<ClaudeSettings> {
  const dir = process.env.CLAUDE_CONFIG_DIR ?? path.join(os.homedir(), '.claude');
  const settingsPath = path.join(dir, 'settings.json');
  try {
    const raw = await fs.promises.readFile(settingsPath, 'utf8');
    const result = ClaudeSettingsSchema.safeParse(JSON.parse(raw));
    return result.success ? result.data : {};
  } catch {
    return {};
  }
}
