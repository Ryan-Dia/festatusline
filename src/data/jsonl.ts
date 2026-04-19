import fs from 'fs';
import path from 'path';
import readline from 'readline';
import os from 'os';

export interface UsageEntry {
  timestamp: number;
  model: string;
  inputTokens: number;
  outputTokens: number;
  cacheCreationTokens: number;
  cacheReadTokens: number;
  ephemeral5mTokens: number;
  ephemeral1hTokens: number;
}

interface MtimeCache {
  mtime: number;
  entries: UsageEntry[];
}

const fileCache = new Map<string, MtimeCache>();

function getClaudeDir(): string {
  return process.env.CLAUDE_CONFIG_DIR ?? path.join(os.homedir(), '.claude');
}

async function parseJsonlFile(filePath: string): Promise<UsageEntry[]> {
  const stat = await fs.promises.stat(filePath);
  const mtime = stat.mtimeMs;

  const cached = fileCache.get(filePath);
  if (cached && cached.mtime === mtime) {
    return cached.entries;
  }

  const entries: UsageEntry[] = [];
  const stream = fs.createReadStream(filePath, { encoding: 'utf8' });
  const rl = readline.createInterface({ input: stream, crlfDelay: Infinity });

  for await (const line of rl) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    try {
      const obj = JSON.parse(trimmed);
      const msg = obj?.message ?? obj;
      const usage = msg?.usage;
      if (!usage) continue;
      const timestamp: number = obj.timestamp ? new Date(obj.timestamp).getTime() : Date.now();
      const model: string = msg.model ?? obj.model ?? '';
      const cacheCreation = usage.cache_creation;
      entries.push({
        timestamp,
        model,
        inputTokens: usage.input_tokens ?? 0,
        outputTokens: usage.output_tokens ?? 0,
        cacheCreationTokens: usage.cache_creation_input_tokens ?? 0,
        cacheReadTokens: usage.cache_read_input_tokens ?? 0,
        ephemeral5mTokens: cacheCreation?.ephemeral_5m_input_tokens ?? 0,
        ephemeral1hTokens: cacheCreation?.ephemeral_1h_input_tokens ?? 0,
      });
    } catch {
      // skip malformed lines
    }
  }

  fileCache.set(filePath, { mtime, entries });
  return entries;
}

export async function loadAllEntries(): Promise<UsageEntry[]> {
  const projectsDir = path.join(getClaudeDir(), 'projects');
  let projectDirs: string[];
  try {
    projectDirs = await fs.promises.readdir(projectsDir);
  } catch {
    return [];
  }

  const all: UsageEntry[] = [];
  await Promise.all(
    projectDirs.map(async (dir) => {
      const dirPath = path.join(projectsDir, dir);
      let files: string[];
      try {
        files = await fs.promises.readdir(dirPath);
      } catch {
        return;
      }
      const jsonlFiles = files.filter((f) => f.endsWith('.jsonl'));
      await Promise.all(
        jsonlFiles.map(async (file) => {
          const entries = await parseJsonlFile(path.join(dirPath, file));
          all.push(...entries);
        }),
      );
    }),
  );
  return all;
}

export async function getLastCacheCreation(): Promise<{ timestamp: number; ttlMs: number } | null> {
  const entries = await loadAllEntries();
  let latest: UsageEntry | null = null;
  for (const e of entries) {
    if (e.cacheCreationTokens > 0) {
      if (!latest || e.timestamp > latest.timestamp) latest = e;
    }
  }
  if (!latest) return null;
  const ttlMs = latest.ephemeral1hTokens > 0 ? 3_600_000 : 300_000;
  return { timestamp: latest.timestamp, ttlMs };
}
