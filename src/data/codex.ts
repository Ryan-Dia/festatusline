import fs from 'fs';
import path from 'path';
import os from 'os';
import readline from 'readline';

export interface CodexSnapshot {
  available: boolean;
  dailyRequests: number;
  weeklyRequests: number;
}

function getCodexDir(): string {
  return process.env.CODEX_CONFIG_DIR ?? path.join(os.homedir(), '.codex');
}

async function findHistoryFile(): Promise<string | null> {
  const base = getCodexDir();
  const candidates = [
    path.join(base, 'history.jsonl'),
    path.join(base, 'sessions'),
  ];
  for (const c of candidates) {
    try {
      await fs.promises.access(c);
      return c;
    } catch {
      continue;
    }
  }
  return null;
}

export async function getCodexSnapshot(): Promise<CodexSnapshot> {
  const histPath = await findHistoryFile();
  if (!histPath) {
    return { available: false, dailyRequests: 0, weeklyRequests: 0 };
  }

  const stat = await fs.promises.stat(histPath);
  if (stat.isDirectory()) {
    return { available: true, dailyRequests: 0, weeklyRequests: 0 };
  }

  const now = Date.now();
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const weekStart = now - 7 * 24 * 60 * 60 * 1000;

  let daily = 0;
  let weekly = 0;

  const stream = fs.createReadStream(histPath, { encoding: 'utf8' });
  const rl = readline.createInterface({ input: stream, crlfDelay: Infinity });

  for await (const line of rl) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    try {
      const obj = JSON.parse(trimmed);
      const ts = obj.timestamp ? new Date(obj.timestamp).getTime() : 0;
      if (ts >= todayStart.getTime()) daily += 1;
      if (ts >= weekStart) weekly += 1;
    } catch {
      // skip
    }
  }

  return { available: true, dailyRequests: daily, weeklyRequests: weekly };
}
