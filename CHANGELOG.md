# Changelog

All notable changes to festatusline are recorded here.

The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and this project
adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

Entries for `0.2.3` through `0.3.4` were reconstructed from the git tags and commit messages
after the fact, so they cover what each release changed but are less detailed than entries
written alongside the work. `0.2.3` is the earliest tagged release; everything before it is
summarised under [Earlier](#earlier).

## [Unreleased]

## [0.4.0] - 2026-08-25

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

## [0.3.4] - 2026-08-14

### Fixed

- The `model` widget could show an unrelated session's model. When the payload carried no
  model it fell back to the most recently used model across every project on the machine, so
  right after `/clear` it could name a model the session was not running. The fallback is now
  scoped to the current session's own transcript via `stdin.transcript_path`.

## [0.3.3] - 2026-08-14

### Fixed

- Codex usage read only `CODEX_CONFIG_DIR`, an environment variable the real Codex CLI never
  sets, so accounts using `CODEX_HOME` always looked unavailable. The rate-limit schema also
  required a non-null secondary window that single-window plans never send, and daily history
  counting looked for a `timestamp` field where `history.jsonl` actually writes `ts` in epoch
  seconds. Each of those silently zeroed the Codex widgets even with data present.
- The Codex session file was picked by filename, which encodes when a session *started*, not
  when it was last written. A long-running session kept receiving fresh rate-limit events
  while a later-started, abandoned session sorted ahead of it, so the widget showed a stale
  snapshot. Selection is now by mtime.

## [0.3.2] - 2026-08-14

### Changed

- The Codex row is a per-setup opt-in instead of being bundled into the `max` preset. Only
  `max` carried it before, leaving `basic` and `pro` users no way to show Codex status at all.
  It is now offered as its own step in the setup wizard, so any tier can carry it, and still
  lands directly below the weekly row. `max` is 5 lines rather than 6.

## [0.3.1] - 2026-08-13

### Fixed

- The effort label read `~/.claude/settings.json`, which never records session-only levels, so
  `/effort max` kept rendering the stale saved value. Claude Code 2.1.119 and later send the
  resolved level on the payload, which is now preferred, with the file used only for older
  versions that do not send it.

### Added

- An `ultracode` label for xhigh sessions pinned through the settings file, which the payload
  alone cannot distinguish.

## [0.3.0] - 2026-08-06

### Changed

- The weekly rate limit prefix is `all` rather than `7d`, padded to sit under the daily row's
  `Ctx` column.
- The `lite` and `plus` presets are replaced by a `basic` / `pro` / `max` ladder sharing the
  same daily and weekly rows.

### Added

- A live preview of the highlighted preset in both the setup wizard and the preset menu.

### Fixed

- The README widget tables listed `peakTime` and `claudePeak`, neither of which is registered
  in `ALL_WIDGETS`, and the per-section widget counts were wrong. Both READMEs now also state
  that per-model weekly limits cannot be shown: Claude Code tracks Opus, Sonnet and Fable
  buckets internally and displays them in `/usage`, but never sends them to status lines.

## [0.2.5] - 2026-07-27

### Fixed

- Every `/plugin update` silently broke the status line. `dist/cli.js` imported chalk, zod,
  react and ink from `node_modules`, which the plugin cache only populated on first install,
  so an update fetched fresh source with nothing to import from. chalk and zod are now bundled
  into `dist/cli.js` and the ink/react TUI is lazy-loaded through a dynamic import, so the
  render path — the part the `statusLine` hook invokes on every message — never needs
  `node_modules` at all.
- The Quick Start docs never mentioned adding the custom marketplace first, so
  `/plugin install festatusline` always failed, and the `/plugin marketplace update` step was
  missing.

## [0.2.3] - 2026-07-27

### Added

- `sessionRateLimit` widget. Anthropic's usage dialog still shows a rolling current-session
  limit — the same `used_percentage` / `resets_at` shape as the removed five-hour field, just
  relabelled — so it fills the slot the old `rateLimit` widget left empty on the daily row.

### Removed

- The `rateLimit` and `codexRateLimit` widgets, which showed 5-hour bars. Anthropic and OpenAI
  both dropped 5-hour rate limiting, leaving only weekly quotas.

### Changed

- The weekly bars share a `7d` prefix (Claude's was `All`), and the Codex model widget is
  prefixed `Codex` so the Codex/GPT line reads clearly next to the Claude lines. The Claude
  weekly row's static label went from `7days` to `Weekly`.
- The `Codex` row label always renders instead of hiding until Codex CLI has been used once,
  so the row layout is visible from the start.

## Earlier

`0.2.3` is the earliest tagged release. Development before it (2026-04-17 through 2026-05-12)
built the project up to roughly its current shape and is not itemised here — see the git
history for detail. In outline: the JSONL data layer and usage aggregation, the widget
registry, ko/en/zh localisation, the five themes, the config system with presets and the
install helper, the stdin render pipeline, the Ink TUI, Claude Code plugin support, the Codex
CLI widgets, `cacheHit` / `cacheTtl` / `sessionCost`, and the git widgets.
