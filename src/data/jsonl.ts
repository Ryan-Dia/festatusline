import fs from 'fs';
import path from 'path';
import readline from 'readline';
import { z } from 'zod';
import { createMtimeCache } from './cache.js';
import { getClaudeDir } from '../config/load.js';

const UsageSchema = z.object({
  input_tokens: z.number().optional().default(0),
  output_tokens: z.number().optional().default(0),
  cache_creation_input_tokens: z.number().optional().default(0),
  cache_read_input_tokens: z.number().optional().default(0),
  cache_creation: z
    .object({
      ephemeral_5m_input_tokens: z.number().optional().default(0),
      ephemeral_1h_input_tokens: z.number().optional().default(0),
    })
    .optional(),
});

const JsonlLineSchema = z.object({
  timestamp: z.string().optional(),
  model: z.string().optional(),
  message: z
    .object({
      model: z.string().optional(),
      usage: UsageSchema.optional(),
    })
    .optional(),
  usage: UsageSchema.optional(),
});

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

const fileCache = createMtimeCache<UsageEntry[]>();

async function parseJsonlFile(filePath: string): Promise<UsageEntry[]> {
  return fileCache.get(filePath, async (p) => {
    const entries: UsageEntry[] = [];
    const stream = fs.createReadStream(p, { encoding: 'utf8' });
    const rl = readline.createInterface({ input: stream, crlfDelay: Infinity });

    for await (const line of rl) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      try {
        const raw = JSON.parse(trimmed);
        const result = JsonlLineSchema.safeParse(raw);
        if (!result.success) continue;
        const obj = result.data;
        const usage = obj.message?.usage ?? obj.usage;
        if (!usage) continue;
        const timestamp = obj.timestamp ? new Date(obj.timestamp).getTime() : Date.now();
        const model = obj.message?.model ?? obj.model ?? '';
        const cacheCreation = usage.cache_creation;
        entries.push({
          timestamp,
          model,
          inputTokens: usage.input_tokens,
          outputTokens: usage.output_tokens,
          cacheCreationTokens: usage.cache_creation_input_tokens,
          cacheReadTokens: usage.cache_read_input_tokens,
          ephemeral5mTokens: cacheCreation?.ephemeral_5m_input_tokens ?? 0,
          ephemeral1hTokens: cacheCreation?.ephemeral_1h_input_tokens ?? 0,
        });
      } catch {
        // skip malformed lines
      }
    }

    return entries;
  });
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

// The model in the statusline's own stdin payload is scoped to the current session, so
// when it's missing this fallback must read only the current session's transcript —
// never another project's, or the statusline would show whatever model was last used
// anywhere on the machine.
export async function getLastModelFromTranscript(transcriptPath: string): Promise<string | null> {
  try {
    const entries = await parseJsonlFile(transcriptPath);
    let lastModel: string | null = null;
    let lastTimestamp = 0;
    for (const e of entries) {
      if (e.model && e.timestamp > lastTimestamp) {
        lastTimestamp = e.timestamp;
        lastModel = e.model;
      }
    }
    return lastModel;
  } catch {
    return null;
  }
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
