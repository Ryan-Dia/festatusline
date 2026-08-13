import { z } from 'zod';

const ModelSchema = z.object({
  id: z.string(),
  display_name: z.string().optional(),
  max_output_tokens: z.number().optional(),
});

const ContextWindowCurrentUsageSchema = z.object({
  input_tokens: z.number().optional(),
  output_tokens: z.number().optional(),
  cache_creation_input_tokens: z.number().optional(),
  cache_read_input_tokens: z.number().optional(),
});

const ContextWindowSchema = z.object({
  total_input_tokens: z.number().optional(),
  total_output_tokens: z.number().optional(),
  context_window_size: z.number().optional(),
  current_usage: ContextWindowCurrentUsageSchema.optional(),
  used_percentage: z.number().optional(),
  remaining_percentage: z.number().optional(),
});

const RateLimitPeriodSchema = z.object({
  used_percentage: z.number().optional(),
  resets_at: z.number().optional(),
});

// Claude Code only emits five_hour / seven_day on the statusline payload. Per-model
// buckets (Opus, Sonnet, Fable) are tracked internally but never handed to statuslines.
const RateLimitsSchema = z.object({
  five_hour: RateLimitPeriodSchema.optional(),
  seven_day: RateLimitPeriodSchema.optional(),
});

const CostSchema = z.object({
  total_cost_usd: z.number().optional(),
  total_duration_ms: z.number().optional(),
  total_api_duration_ms: z.number().optional(),
});

const WorkspaceSchema = z.object({
  current_dir: z.string().optional(),
  project_dir: z.string().optional(),
});

const OutputStyleSchema = z.object({
  name: z.string().optional(),
});

// Claude Code emits this only for effort-capable models, and the level is already
// resolved: env override > launch-effort pin > session choice > model default.
// Always prefer it over the raw effortLevel in ~/.claude/settings.json, which never
// records the session-only levels (max, ultracode) and ignores env overrides.
const EffortSchema = z.object({
  level: z.string().optional(),
});

const ClaudeStdinSchema = z.object({
  type: z.string().optional(),
  model: ModelSchema.optional(),
  session_id: z.string().optional(),
  session_name: z.string().optional(),
  transcript_path: z.string().optional(),
  cwd: z.string().optional(),
  cost: CostSchema.optional(),
  context_window: ContextWindowSchema.optional(),
  workspace: WorkspaceSchema.optional(),
  hook_event_name: z.string().optional(),
  version: z.string().optional(),
  output_style: OutputStyleSchema.optional(),
  rate_limits: RateLimitsSchema.optional(),
  exceeds_200k_tokens: z.boolean().optional(),
  effort: EffortSchema.optional(),
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
