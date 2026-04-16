import { z } from 'zod';

const ModelSchema = z.object({
  id: z.string(),
  display_name: z.string().optional(),
  max_output_tokens: z.number().optional(),
  context_window: z.number().optional(),
});

const UsageSchema = z.object({
  input_tokens: z.number().optional(),
  output_tokens: z.number().optional(),
  cache_creation_input_tokens: z.number().optional(),
  cache_read_input_tokens: z.number().optional(),
});

const CostSchema = z.object({
  total_cost_usd: z.number().optional(),
});

const WorkspaceSchema = z.object({
  current_dir: z.string().optional(),
});

const ClaudeStdinSchema = z.object({
  type: z.string().optional(),
  model: ModelSchema.optional(),
  session_id: z.string().optional(),
  transcript_path: z.string().optional(),
  cost: CostSchema.optional(),
  usage: UsageSchema.optional(),
  workspace: WorkspaceSchema.optional(),
  hook_event_name: z.string().optional(),
});

export type ClaudeStdin = z.infer<typeof ClaudeStdinSchema>;

export async function readStdin(): Promise<ClaudeStdin> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    process.stdin.on('data', (chunk: Buffer) => chunks.push(chunk));
    process.stdin.on('end', () => {
      const raw = Buffer.concat(chunks).toString('utf8').trim();
      if (!raw) {
        resolve({});
        return;
      }
      try {
        const parsed = ClaudeStdinSchema.parse(JSON.parse(raw));
        resolve(parsed);
      } catch {
        resolve({});
      }
    });
    process.stdin.on('error', reject);
  });
}
