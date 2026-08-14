import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { promises as fs } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { loadAllEntries, getLastCacheCreation, getLastModelFromTranscript } from '../src/data/jsonl.js';

const makeUsageLine = (overrides: Record<string, unknown> = {}): string =>
  JSON.stringify({
    timestamp: '2026-01-01T10:00:00.000Z',
    model: 'claude-opus-4',
    usage: {
      input_tokens: 100,
      output_tokens: 50,
      cache_creation_input_tokens: 0,
      cache_read_input_tokens: 0,
    },
    ...overrides,
  });

describe('loadAllEntries', () => {
  let tmpDir: string;

  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(join(tmpdir(), 'festatusline-jsonl-'));
    process.env.CLAUDE_CONFIG_DIR = tmpDir;
  });

  afterEach(async () => {
    delete process.env.CLAUDE_CONFIG_DIR;
    await fs.rm(tmpDir, { recursive: true, force: true });
  });

  it('returns empty array when projects dir is missing', async () => {
    const entries = await loadAllEntries();
    expect(entries).toEqual([]);
  });

  it('parses valid JSONL entries correctly', async () => {
    const projDir = join(tmpDir, 'projects', 'proj-1');
    await fs.mkdir(projDir, { recursive: true });
    await fs.writeFile(join(projDir, 'session.jsonl'), makeUsageLine() + '\n');

    const entries = await loadAllEntries();
    expect(entries).toHaveLength(1);
    expect(entries[0]!.inputTokens).toBe(100);
    expect(entries[0]!.outputTokens).toBe(50);
    expect(entries[0]!.model).toBe('claude-opus-4');
    expect(entries[0]!.timestamp).toBe(new Date('2026-01-01T10:00:00.000Z').getTime());
  });

  it('skips malformed JSON lines but keeps valid ones', async () => {
    const projDir = join(tmpDir, 'projects', 'proj-2');
    await fs.mkdir(projDir, { recursive: true });
    await fs.writeFile(
      join(projDir, 'session.jsonl'),
      `{broken json\n${makeUsageLine({ model: 'claude-sonnet-4-6' })}\n`,
    );

    const entries = await loadAllEntries();
    expect(entries).toHaveLength(1);
    expect(entries[0]!.model).toBe('claude-sonnet-4-6');
  });

  it('skips lines with no usage field', async () => {
    const projDir = join(tmpDir, 'projects', 'proj-3');
    await fs.mkdir(projDir, { recursive: true });
    const line = JSON.stringify({ timestamp: '2026-01-01T10:00:00.000Z', model: 'claude-opus-4' });
    await fs.writeFile(join(projDir, 'session.jsonl'), line + '\n');

    const entries = await loadAllEntries();
    expect(entries).toHaveLength(0);
  });

  it('aggregates entries from multiple project directories', async () => {
    for (const proj of ['proj-a', 'proj-b']) {
      const projDir = join(tmpDir, 'projects', proj);
      await fs.mkdir(projDir, { recursive: true });
      await fs.writeFile(join(projDir, 'f.jsonl'), makeUsageLine() + '\n');
    }

    const entries = await loadAllEntries();
    expect(entries).toHaveLength(2);
  });

  it('reads usage from message.usage when top-level usage is absent', async () => {
    const projDir = join(tmpDir, 'projects', 'proj-4');
    await fs.mkdir(projDir, { recursive: true });
    const line = JSON.stringify({
      timestamp: '2026-01-01T10:00:00.000Z',
      message: {
        model: 'claude-opus-4',
        usage: {
          input_tokens: 200,
          output_tokens: 80,
          cache_creation_input_tokens: 0,
          cache_read_input_tokens: 0,
        },
      },
    });
    await fs.writeFile(join(projDir, 'session.jsonl'), line + '\n');

    const entries = await loadAllEntries();
    expect(entries).toHaveLength(1);
    expect(entries[0]!.inputTokens).toBe(200);
  });
});

describe('getLastCacheCreation', () => {
  let tmpDir: string;

  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(join(tmpdir(), 'festatusline-cache-'));
    process.env.CLAUDE_CONFIG_DIR = tmpDir;
  });

  afterEach(async () => {
    delete process.env.CLAUDE_CONFIG_DIR;
    await fs.rm(tmpDir, { recursive: true, force: true });
  });

  it('returns null when no entries have cache creation tokens', async () => {
    const projDir = join(tmpDir, 'projects', 'p');
    await fs.mkdir(projDir, { recursive: true });
    await fs.writeFile(join(projDir, 'f.jsonl'), makeUsageLine() + '\n');

    const result = await getLastCacheCreation();
    expect(result).toBeNull();
  });

  it('returns 5m TTL when only cache_creation_input_tokens are present', async () => {
    const projDir = join(tmpDir, 'projects', 'p');
    await fs.mkdir(projDir, { recursive: true });
    const line = makeUsageLine({
      usage: {
        input_tokens: 10,
        output_tokens: 5,
        cache_creation_input_tokens: 100,
        cache_read_input_tokens: 0,
      },
    });
    await fs.writeFile(join(projDir, 'f.jsonl'), line + '\n');

    const result = await getLastCacheCreation();
    expect(result).not.toBeNull();
    expect(result!.ttlMs).toBe(300_000);
  });

  it('returns 1h TTL when ephemeral_1h tokens are present', async () => {
    const projDir = join(tmpDir, 'projects', 'p');
    await fs.mkdir(projDir, { recursive: true });
    const line = makeUsageLine({
      usage: {
        input_tokens: 10,
        output_tokens: 5,
        cache_creation_input_tokens: 100,
        cache_read_input_tokens: 0,
        cache_creation: { ephemeral_1h_input_tokens: 200 },
      },
    });
    await fs.writeFile(join(projDir, 'f.jsonl'), line + '\n');

    const result = await getLastCacheCreation();
    expect(result).not.toBeNull();
    expect(result!.ttlMs).toBe(3_600_000);
  });
});

describe('getLastModelFromTranscript', () => {
  let tmpDir: string;

  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(join(tmpdir(), 'festatusline-transcript-'));
  });

  afterEach(async () => {
    await fs.rm(tmpDir, { recursive: true, force: true });
  });

  it('returns null when the transcript file does not exist', async () => {
    const result = await getLastModelFromTranscript(join(tmpDir, 'missing.jsonl'));
    expect(result).toBeNull();
  });

  it('returns the most recently timestamped model in the transcript', async () => {
    const filePath = join(tmpDir, 'session.jsonl');
    await fs.writeFile(
      filePath,
      [
        makeUsageLine({ timestamp: '2026-01-01T10:00:00.000Z', model: 'claude-opus-4' }),
        makeUsageLine({ timestamp: '2026-01-01T12:00:00.000Z', model: 'claude-sonnet-4-6' }),
        makeUsageLine({ timestamp: '2026-01-01T11:00:00.000Z', model: 'claude-haiku-4-5' }),
      ].join('\n') + '\n',
    );

    const result = await getLastModelFromTranscript(filePath);
    expect(result).toBe('claude-sonnet-4-6');
  });

  it('never reads other transcripts even when they are more recent', async () => {
    const filePath = join(tmpDir, 'session.jsonl');
    await fs.writeFile(filePath, `${makeUsageLine({ model: 'claude-sonnet-4-6' })}\n`);

    const otherPath = join(tmpDir, 'other-session.jsonl');
    await fs.writeFile(
      otherPath,
      `${makeUsageLine({ timestamp: '2099-01-01T00:00:00.000Z', model: 'claude-fable-5' })}\n`,
    );

    const result = await getLastModelFromTranscript(filePath);
    expect(result).toBe('claude-sonnet-4-6');
  });
});
