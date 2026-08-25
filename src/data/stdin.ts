import { z } from 'zod';

// Claude Code documents several payload fields as nullable rather than merely absent:
// `context_window.current_usage` is null before the first API call and again after
// /compact, and used/remaining_percentage are null early in a session. `.nullish()`
// everywhere keeps one null from failing the whole parse — see salvageStdin below for
// the second line of defence.
const nullableNumber = () => z.number().nullish();
const nullableString = () => z.string().nullish();

// Only `id` and `display_name` are emitted; the payload carries no max_output_tokens.
const ModelSchema = z.object({
  id: nullableString(),
  display_name: nullableString(),
});

const ContextWindowCurrentUsageSchema = z.object({
  input_tokens: nullableNumber(),
  output_tokens: nullableNumber(),
  cache_creation_input_tokens: nullableNumber(),
  cache_read_input_tokens: nullableNumber(),
});

const ContextWindowSchema = z.object({
  total_input_tokens: nullableNumber(),
  total_output_tokens: nullableNumber(),
  context_window_size: nullableNumber(),
  current_usage: ContextWindowCurrentUsageSchema.nullish(),
  used_percentage: nullableNumber(),
  remaining_percentage: nullableNumber(),
});

const RateLimitPeriodSchema = z.object({
  used_percentage: nullableNumber(),
  resets_at: nullableNumber(),
});

// Claude Code only emits five_hour / seven_day on the statusline payload. Per-model
// buckets (Opus, Sonnet, Fable) are tracked internally but never handed to statuslines.
export const RateLimitsSchema = z.object({
  five_hour: RateLimitPeriodSchema.nullish(),
  seven_day: RateLimitPeriodSchema.nullish(),
});

export type RateLimits = z.infer<typeof RateLimitsSchema>;

const CostSchema = z.object({
  total_cost_usd: nullableNumber(),
  total_duration_ms: nullableNumber(),
  total_api_duration_ms: nullableNumber(),
  total_lines_added: nullableNumber(),
  total_lines_removed: nullableNumber(),
});

// Repository identity parsed from the `origin` remote. Absent outside a git repo or when
// no origin is configured, which is why the gitRepo widget still keeps its git fallback.
const RepoSchema = z.object({
  host: nullableString(),
  owner: nullableString(),
  name: nullableString(),
});

const WorkspaceSchema = z.object({
  current_dir: nullableString(),
  project_dir: nullableString(),
  added_dirs: z.array(z.string()).nullish(),
  // Set for any linked worktree created with `git worktree add`, unlike the top-level
  // `worktree` object which only appears for --worktree sessions.
  git_worktree: nullableString(),
  repo: RepoSchema.nullish(),
});

const OutputStyleSchema = z.object({
  name: nullableString(),
});

// Claude Code emits this only for effort-capable models, and the level is already
// resolved: env override > launch-effort pin > session choice > model default.
// Always prefer it over the raw effortLevel in ~/.claude/settings.json, which never
// records the session-only levels (max, ultracode) and ignores env overrides.
const EffortSchema = z.object({
  level: nullableString(),
});

const ThinkingSchema = z.object({
  enabled: z.boolean().nullish(),
});

const VimSchema = z.object({
  mode: nullableString(),
});

const AgentSchema = z.object({
  name: nullableString(),
});

// Filled from the branch's open GitLab merge request when the remote is GitLab, in which
// case `kind` is 'mr' and `number` is the merge request number.
const PrSchema = z.object({
  number: nullableNumber(),
  url: nullableString(),
  review_state: nullableString(),
  kind: nullableString(),
});

const WorktreeSchema = z.object({
  name: nullableString(),
  path: nullableString(),
  branch: nullableString(),
  original_cwd: nullableString(),
  original_branch: nullableString(),
});

const stdinShape = {
  type: nullableString(),
  model: ModelSchema.nullish(),
  session_id: nullableString(),
  session_name: nullableString(),
  prompt_id: nullableString(),
  transcript_path: nullableString(),
  cwd: nullableString(),
  cost: CostSchema.nullish(),
  context_window: ContextWindowSchema.nullish(),
  workspace: WorkspaceSchema.nullish(),
  hook_event_name: nullableString(),
  version: nullableString(),
  output_style: OutputStyleSchema.nullish(),
  rate_limits: RateLimitsSchema.nullish(),
  exceeds_200k_tokens: z.boolean().nullish(),
  fast_mode: z.boolean().nullish(),
  effort: EffortSchema.nullish(),
  thinking: ThinkingSchema.nullish(),
  vim: VimSchema.nullish(),
  agent: AgentSchema.nullish(),
  pr: PrSchema.nullish(),
  worktree: WorktreeSchema.nullish(),
};

const ClaudeStdinSchema = z.object(stdinShape);

export type ClaudeStdin = z.infer<typeof ClaudeStdinSchema>;

/**
 * Per-key fallback parse. A single field whose type we guessed wrong — a future Claude
 * Code release turning a number into a string, say — would otherwise fail the whole
 * object and blank the entire status line. Salvaging key by key costs us only the one
 * bad field.
 */
export function salvageStdin(raw: unknown): ClaudeStdin {
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) return {};
  const source = raw as Record<string, unknown>;
  const salvaged: Record<string, unknown> = {};
  for (const [key, schema] of Object.entries(stdinShape)) {
    const result = schema.safeParse(source[key]);
    if (result.success && result.data != null) salvaged[key] = result.data;
  }
  return salvaged as ClaudeStdin;
}

export function parseStdin(raw: string): ClaudeStdin {
  const trimmed = raw.trim();
  if (!trimmed) return {};
  let json: unknown;
  try {
    json = JSON.parse(trimmed);
  } catch {
    return {};
  }
  const result = ClaudeStdinSchema.safeParse(json);
  return result.success ? result.data : salvageStdin(json);
}

export async function readStdin(): Promise<ClaudeStdin> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    process.stdin.on('data', (chunk: Buffer) => chunks.push(chunk));
    process.stdin.on('end', () => {
      resolve(parseStdin(Buffer.concat(chunks).toString('utf8')));
    });
    process.stdin.on('error', reject);
  });
}
