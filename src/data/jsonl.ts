import { createHash } from 'crypto';
import fs from 'fs';
import { homedir } from 'os';
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

function parseUsageLine(line: string): UsageEntry | null {
  const trimmed = line.trim();
  // Most transcript lines are prompts and tool output with no usage block. Skipping them
  // before JSON.parse is what keeps a first read of a large transcript affordable.
  if (!trimmed || !trimmed.includes('"usage"')) return null;
  try {
    const result = JsonlLineSchema.safeParse(JSON.parse(trimmed));
    if (!result.success) return null;
    const obj = result.data;
    const usage = obj.message?.usage ?? obj.usage;
    if (!usage) return null;
    const cacheCreation = usage.cache_creation;
    return {
      timestamp: obj.timestamp ? new Date(obj.timestamp).getTime() : Date.now(),
      model: obj.message?.model ?? obj.model ?? '',
      inputTokens: usage.input_tokens,
      outputTokens: usage.output_tokens,
      cacheCreationTokens: usage.cache_creation_input_tokens,
      cacheReadTokens: usage.cache_read_input_tokens,
      ephemeral5mTokens: cacheCreation?.ephemeral_5m_input_tokens ?? 0,
      ephemeral1hTokens: cacheCreation?.ephemeral_1h_input_tokens ?? 0,
    };
  } catch {
    return null;
  }
}

const fileCache = createMtimeCache<UsageEntry[]>();

async function parseJsonlFile(filePath: string): Promise<UsageEntry[]> {
  return fileCache.get(filePath, async (p) => {
    const entries: UsageEntry[] = [];
    const stream = fs.createReadStream(p, { encoding: 'utf8' });
    const rl = readline.createInterface({ input: stream, crlfDelay: Infinity });
    for await (const line of rl) {
      const entry = parseUsageLine(line);
      if (entry) entries.push(entry);
    }
    return entries;
  });
}

// Every render is a fresh process, so an in-memory cache never survives to the next one, and
// re-reading every transcript took ~1.8 s on 240 MB of them. The parsed entries are kept on
// disk instead, with how far each transcript has been read. Transcripts are append-only, so
// the next render reads only the bytes added since.
const INDEX_VERSION = 1;
const READ_CHUNK_BYTES = 4 * 1024 * 1024;

// [timestamp, model, input, output, cacheCreation, cacheRead, ephemeral5m, ephemeral1h] —
// positional to keep a week of entries small on disk.
const EntryTupleSchema = z.tuple([
  z.number(),
  z.string(),
  z.number(),
  z.number(),
  z.number(),
  z.number(),
  z.number(),
  z.number(),
]);
type EntryTuple = z.infer<typeof EntryTupleSchema>;

const TranscriptIndexSchema = z.object({
  version: z.literal(INDEX_VERSION),
  // `offset` is the byte just past the last complete line read.
  files: z.record(z.object({ offset: z.number(), entries: z.array(EntryTupleSchema) })),
});

type FileProgress = { offset: number; entries: UsageEntry[] };

const toTuple = (e: UsageEntry): EntryTuple => [
  e.timestamp,
  e.model,
  e.inputTokens,
  e.outputTokens,
  e.cacheCreationTokens,
  e.cacheReadTokens,
  e.ephemeral5mTokens,
  e.ephemeral1hTokens,
];

const fromTuple = ([
  timestamp,
  model,
  inputTokens,
  outputTokens,
  cacheCreationTokens,
  cacheReadTokens,
  ephemeral5mTokens,
  ephemeral1hTokens,
]: EntryTuple): UsageEntry => ({
  timestamp,
  model,
  inputTokens,
  outputTokens,
  cacheCreationTokens,
  cacheReadTokens,
  ephemeral5mTokens,
  ephemeral1hTokens,
});

// Keyed by the projects folder so sessions on different CLAUDE_CONFIG_DIRs don't evict each
// other's entries.
function indexPath(projectsDir: string): string {
  const cacheDir = process.env.XDG_CACHE_HOME
    ? path.join(process.env.XDG_CACHE_HOME, 'festatusline')
    : path.join(homedir(), '.cache', 'festatusline');
  const key = createHash('sha256').update(projectsDir).digest('hex').slice(0, 8);
  return path.join(cacheDir, `transcripts-${key}.json`);
}

async function readIndex(filePath: string): Promise<Map<string, FileProgress>> {
  try {
    const parsed = TranscriptIndexSchema.parse(
      JSON.parse(await fs.promises.readFile(filePath, 'utf8')),
    );
    return new Map(
      Object.entries(parsed.files).map(([file, { offset, entries }]) => [
        file,
        { offset, entries: entries.map(fromTuple) },
      ]),
    );
  } catch {
    return new Map();
  }
}

// Write-then-rename, since statuslines in other sessions may be reading it at the same time.
async function writeIndex(filePath: string, files: Map<string, FileProgress>): Promise<void> {
  const body = {
    version: INDEX_VERSION,
    files: Object.fromEntries(
      [...files].map(([file, { offset, entries }]) => [
        file,
        { offset, entries: entries.map(toTuple) },
      ]),
    ),
  };
  const tmpPath = `${filePath}.${process.pid}.tmp`;
  await fs.promises.mkdir(path.dirname(filePath), { recursive: true });
  await fs.promises.writeFile(tmpPath, JSON.stringify(body), 'utf8');
  await fs.promises.rename(tmpPath, filePath);
}

/** Parses what was appended to `filePath` since `prev`, stopping at the last complete line. */
async function readAppended(
  filePath: string,
  size: number,
  prev: FileProgress | undefined,
): Promise<FileProgress> {
  // Shorter than what was already read means the file was rewritten, not appended to.
  const resume = prev && prev.offset <= size ? prev : { offset: 0, entries: [] };
  if (resume.offset === size) return resume;

  const added: UsageEntry[] = [];
  const handle = await fs.promises.open(filePath, 'r');
  let position = resume.offset;
  let carry = Buffer.alloc(0);
  try {
    while (position < size) {
      const chunk = Buffer.alloc(Math.min(READ_CHUNK_BYTES, size - position));
      // eslint-disable-next-line no-await-in-loop -- chunks must be read in order
      const { bytesRead } = await handle.read(chunk, 0, chunk.length, position);
      if (bytesRead === 0) break;
      position += bytesRead;
      const data = Buffer.concat([carry, chunk.subarray(0, bytesRead)]);
      const lastNewline = data.lastIndexOf(0x0a);
      if (lastNewline < 0) {
        carry = data;
      } else {
        data
          .toString('utf8', 0, lastNewline)
          .split('\n')
          .forEach((line) => {
            const entry = parseUsageLine(line);
            if (entry) added.push(entry);
          });
        carry = data.subarray(lastNewline + 1);
      }
    }
  } finally {
    await handle.close();
  }
  // A line still being written stays in `carry` and is read in full next time.
  return { offset: position - carry.length, entries: [...resume.entries, ...added] };
}

type Transcript = { filePath: string; size: number };

async function listTranscripts(projectsDir: string, sinceMs: number): Promise<Transcript[]> {
  const projectDirs = await fs.promises.readdir(projectsDir);
  const perDir = await Promise.all(
    projectDirs.map(async (dir) => {
      const dirPath = path.join(projectsDir, dir);
      let files: string[];
      try {
        files = await fs.promises.readdir(dirPath);
      } catch {
        return [];
      }
      const stats = await Promise.all(
        files
          .filter((f) => f.endsWith('.jsonl'))
          .map(async (f) => {
            const filePath = path.join(dirPath, f);
            try {
              const { size, mtimeMs } = await fs.promises.stat(filePath);
              // Untouched since `sinceMs` means it holds nothing newer than that.
              return mtimeMs >= sinceMs ? [{ filePath, size }] : [];
            } catch {
              return [];
            }
          }),
      );
      return stats.flat();
    }),
  );
  return perDir.flat();
}

/**
 * Usage entries from every transcript modified at or after `sinceMs`. A file outside the
 * window can still contribute entries older than `sinceMs`, so callers filter by timestamp.
 */
export async function loadAllEntries(sinceMs = 0): Promise<UsageEntry[]> {
  const projectsDir = path.join(getClaudeDir(), 'projects');
  let transcripts: Transcript[];
  try {
    transcripts = await listTranscripts(projectsDir, sinceMs);
  } catch {
    return [];
  }

  const indexFile = indexPath(projectsDir);
  const index = await readIndex(indexFile);
  // Only the files read this time are kept, so transcripts that fall out of the window or
  // get deleted drop out of the index instead of growing it forever.
  const next = new Map<string, FileProgress>();
  let changed = false;
  // One at a time: a first read can hold several MB per file, and parsing is CPU-bound anyway.
  for (const { filePath, size } of transcripts) {
    const prev = index.get(filePath);
    try {
      // eslint-disable-next-line no-await-in-loop -- sequential on purpose, see above
      const progress = await readAppended(filePath, size, prev);
      next.set(filePath, progress);
      if (progress !== prev) changed = true;
    } catch {
      if (prev) next.set(filePath, prev);
    }
  }

  if (changed || next.size !== index.size) {
    await writeIndex(indexFile, next).catch(() => {});
  }
  return [...next.values()].flatMap((p) => p.entries);
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

export function getLastCacheCreation(
  entries: UsageEntry[],
): { timestamp: number; ttlMs: number } | null {
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
