# Changelog

All notable changes to festatusline are recorded here.

The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and this project
adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html). Releases before this
file existed are recorded only as git tags (`v0.2.3` through `v0.3.4`).

## [Unreleased]

The `v0.3.4` tag was cut before these changes landed, so they stay here until a version is
assigned.

### Fixed

- The status line no longer blanks out when the payload carries `null`. Claude Code documents
  `context_window.current_usage` as `null` before the first API call and again after
  `/compact`, and `used_percentage` / `remaining_percentage` as `null` early in a session. The
  strict schema rejected those, the whole parse threw, and the model name, context bar, and
  cost all disappeared at once.
- A single field whose type we guessed wrong no longer costs the whole payload. `parseStdin`
  now falls back to a per-key salvage parse, so one unexpected field type loses only that
  field.
- Token counts no longer print `1000K` or a trailing `.0`. `formatTokens` now renders
  `999_500` as `1M` and `2_000_000` as `2M`, rounds the 995 boundary up to `1K`, and returns
  `0` for negative or non-finite input.
- The `context` widget no longer gives up and shows `(-/-)` when the payload omits
  `context_window_size`. It falls back to 200K (1M when `exceeds_200k_tokens` is set) and
  derives the used figure from `used_percentage` or the total input/output counts.
- `shortName` now formats current-generation model IDs that carry no minor version.
  `claude-opus-5` rendered as `opus-5`, which is what the `model` widget showed whenever
  `display_name` was absent — for example right after `/clear`.

### Added

- `pr` widget — the open pull request for the current branch, with a review-state glyph.
  GitLab merge requests render as `MR !77`.
- `linesChanged` widget — lines added and removed this session, from
  `cost.total_lines_added` / `total_lines_removed`.
- `fastMode` widget — shown only while fast mode is on.
- `modelMix` widget — this week's spend split by model family, weighted the way Claude Code's
  own `/usage` weights it, so the shares match what `/usage` reports.
- The `model` widget appends session flags beside the effort level: `fast` while fast mode is
  on, `no-think` when thinking is explicitly disabled. `Opus 5 [xhigh, fast]`.
- `src/data/modelTier.ts` — model family classification and the relative spend weights
  `/usage` applies (cache read 1, uncached input 10, cache write 12.5, output 50, scaled by
  Fable 10 / Opus 5 / Sonnet 3 / Haiku 1). `UsageSnapshot` gained `weightedDaily`,
  `weightedWeekly`, and `weightedWeeklyByFamily`.
- The stdin schema now covers the fields recent Claude Code releases added: `prompt_id`,
  `workspace.added_dirs`, `workspace.git_worktree`, `workspace.repo`, `cost.total_lines_*`,
  `fast_mode`, `thinking`, `vim`, `agent`, `pr`, and `worktree`.

### Changed

- `gitRepo` reads the repository name from `workspace.repo` when Claude Code supplies it,
  falling back to `git rev-parse --show-toplevel`. That removes one git subprocess per render.
  `gitBranch` uses `worktree.branch` directly during `--worktree` sessions.
- The TUI names `dailyUsage` and `weeklyUsage` "Daily Label" / "Weekly Label" instead of
  "Daily Usage" / "Weekly Usage". Both widgets render a fixed-width label, never a figure, and
  the old names implied otherwise.
- The effort label no longer reads `effortLevel` from `~/.claude/settings.json`. That value
  lags the live session — it misses mid-session `/effort` changes and the per-model
  `modelSettings` override — so it printed a level the session was not running at. The label
  now comes from the payload's `effort.level`, falling back to the `CLAUDE_EFFORT` environment
  variable Claude Code exports to the status line spawn. The Claude Code version gate this
  replaces (`EFFORT_IN_STDIN_SINCE`) is gone.

### Removed

- `model.max_output_tokens` from the stdin schema. Claude Code never sends it.

### Notes

- Ultracode cannot be detected. Claude Code reports it as `xhigh` on every channel it exposes
  — the payload, `CLAUDE_EFFORT`, and the transcript's own `effort` field — so only a settings
  file that pins `ultracode: true` distinguishes it from plain `xhigh`.
