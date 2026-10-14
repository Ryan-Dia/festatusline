---
description: Configure festatusline status line settings
argument-hint: "[preset] [locale] [codex] [pathDepth]"
allowed-tools: Read, Write, Bash(jq:*), Bash(cat:*), Bash(mkdir:*), Bash(ls:*), Bash(sort:*), Bash(tail:*), Bash(mv:*), Bash(node:*), AskUserQuestion
---

# festatusline Setup

Configure the festatusline status line plugin.

## Arguments

- **No arguments**: Interactive mode (asks questions)
- `$1`: Preset name — `basic`, `pro` (default), `max`
- `$2`: Locale — `ko`, `en` (default), `zh`
- `$3`: Add Codex CLI usage row — `yes`, `no` (default). Independent of preset: any tier
  can carry the Codex row or not.
- `$4`: Folder path depth — `0` (default, current folder only), `1`, `2`, `3` parent folders.

## Available Widgets

| id | Description |
|---|---|
| `model` | Current model name |
| `context` | Context usage bar + % |
| `sessionRateLimit` | Current session (rolling ~5h) usage bar + reset time |
| `dailyUsage` | Today's total tokens |
| `dailyReset` | Time until daily reset |
| `weeklyUsage` | Last 7 days total tokens |
| `weeklyReset` | Time until weekly reset |
| `sonnetWeeklyUsage` | Last 7 days Sonnet model tokens |
| `sonnetWeeklyReset` | Time until Sonnet weekly reset |
| `gptUsage` | Today's Codex CLI request count |
| `weeklyRateLimit` | Weekly rate limit status |
| `fableWeeklyRateLimit` | Fable's own weekly quota (hidden when unavailable) |
| `resetPass` | Limit resets held + time to the earliest expiry (in every preset) |
| `cacheHit` | Prompt cache hit rate |
| `cacheTtl` | Cache TTL remaining time |
| `sessionCost` | Estimated session cost |
| `gitRepo` | Current folder (+ parents per `pathDepth`) and git branch |
| `gitBranch` | Current git branch name |
| `codexModel` | Codex CLI model name |
| `codexWeeklyRateLimit` | Codex weekly rate limit status |
| `spacer` | Empty separator line |

## Available Themes

`default`, `dracula`, `nord`, `gruvbox`, `tokyo-night`

## Tasks

### 1. Determine configuration

**If no arguments provided (interactive mode):**

Ask all questions in a single AskUserQuestion call:
1. Preset — options with descriptions and multi-line previews showing the exact layout:
   - `basic` (2 lines): daily row + weekly row, reset pass at the end of the weekly row
     preview (use actual newlines \n between lines):
     ```
     Daily   │ Ctx ■■■□□□□□□□  38% (75K/200K)  │ Session ■■■□□□□□□□  30% (3h 0m)
     Weekly  │ all ■■□□□□□□□□  25% (4d 0h)     │ Fable   ■■■■■■■■□□  89% (4d 0h) │ 🎟 Reset 1 · D-15
     ```
   - `pro` (4 lines, recommended): daily + weekly rows + spacer + model/repo/reset pass line
     preview:
     ```
     Daily   │ Ctx ■■■□□□□□□□  38% (75K/200K)  │ Session ■■■□□□□□□□  30% (3h 0m)
     Weekly  │ all ■■□□□□□□□□  25% (4d 0h)     │ Fable   ■■■■■■■■□□  89% (4d 0h)

     Opus 5 [high] │ 📁 festatusline(main) │ 🎟 Reset 1 · D-15
     ```
   - `max` (5 lines): pro + cache/cost row
     preview:
     ```
     Daily   │ Ctx ■■■□□□□□□□  38% (75K/200K)  │ Session ■■■□□□□□□□  30% (3h 0m)
     Weekly  │ all ■■□□□□□□□□  25% (4d 0h)     │ Fable   ■■■■■■■■□□  89% (4d 0h)

     ⚡70% │ ⏱ 30m │ $0.420
     Opus 5 [high] │ 📁 festatusline(main) │ 🎟 Reset 1 · D-15
     ```
2. Theme — `default` (recommended), `dracula`, `nord`, `gruvbox`, `tokyo-night`
3. Locale — `en` (recommended, default), `ko`, `zh`. List `en` first so it is the
   preselected answer.
4. Codex — add the Codex CLI usage row? This is independent of preset: `basic`, `pro`,
   and `max` can each carry it or not.
   - `No` (default)
   - `Yes` — inserts a Codex row directly below the weekly row, before whatever the
     chosen preset already has there (spacer, cache/cost, model/repo). Preview for
     `pro` + Codex:
     ```
     Daily   │ Ctx ■■■□□□□□□□  38% (75K/200K)  │ Session ■■■□□□□□□□  30% (3h 0m)
     Weekly  │ all ■■□□□□□□□□  25% (4d 0h)     │ Fable   ■■■■■■■■□□  89% (4d 0h)
     Codex   │ 7d  ■□□□□□□□□□  10% (1d 0h)

     Opus 5 [high] │ 📁 festatusline(main) │ 🎟 Reset 1 · D-15
     ```

Then, **only if the chosen preset is `pro` or `max`** (`basic` has no folder widget), ask one
more question in a second AskUserQuestion call — the first call is already at the four-question
limit:

5. Path depth — how much of the folder path the `📁` widget shows. Use these previews
   verbatim. They are drawn from the fixed example folder `~/dev/company/orca/festatusline`,
   not the user's own folder: that one is often right under home, where depths 1–3 would
   all look the same. Depth N adds N parent folders, starting with `~/` once they reach
   home and with `…/` while some are cut off.
   - `0` — Current folder only (Recommended), preview:
     `Opus 5 [high] │ 📁 festatusline(main) │ 🎟 Reset 1 · D-15`
   - `1` — 1 parent folder, preview:
     `Opus 5 [high] │ 📁 …/orca/festatusline(main) │ 🎟 Reset 1 · D-15`
   - `2` — 2 parent folders, preview:
     `Opus 5 [high] │ 📁 …/company/orca/festatusline(main) │ 🎟 Reset 1 · D-15`
   - `3` — 3 parent folders, preview:
     `Opus 5 [high] │ 📁 ~/dev/company/orca/festatusline(main) │ 🎟 Reset 1 · D-15`

**If arguments provided:**
Use `$1` as preset (default: `pro`), `$2` as locale (default: `en`), `$3` as the Codex
choice (default: `no`), and `$4` as the path depth (default: `0`).

### 2. Build settings JSON

Record the chosen preset **by name** — do not expand it into a `lines` array. The renderer
expands `preset` at render time, so a later release that adds a widget to that preset (e.g.
the `Fable` bar in the weekly row) reaches this user on `/plugin update` without re-running
setup. A written-out `lines` array is treated as a hand-edited layout and freezes it.

```json
{
  "preset": "pro",
  "codexRow": false,
  "pathDepth": 0
}
```

- `preset`: `basic`, `pro`, or `max`
- `pathDepth`: `0`–`3` from the path-depth answer or `$4`; `0` when the question was skipped
- `codexRow`: `true` if Codex was requested (`$3` is `yes`, or the interactive question was
  answered `Yes`), otherwise `false`. The renderer inserts the Codex row right below the
  weekly row on any tier.

The daily and weekly rows are identical across all three presets and are padded so the
columns line up. The `Fable` bar hides itself when Fable quota data can't be fetched, leaving
the weekly row two columns wide.

### 3. Write settings file

Create `~/.config/festatusline/settings.json`:
```bash
mkdir -p ~/.config/festatusline
```

Write the complete settings object with `preset`, `codexRow`, `pathDepth`, `theme`, `locale`, `separator`
(` │ `), and `weeklyAnchorDay` (null). **Do not include `lines`** — if an existing
settings file has one, drop it, otherwise it overrides the preset.

### 4. Update statusLine in Claude settings

Let festatusline register itself. `install --force` writes a launcher to
`~/.config/festatusline/statusline.mjs` and points `statusLine` at it. The launcher finds the
installed plugin version on every run, so later plugin updates never need `statusLine`
edited again:
```bash
node "$(ls -d ~/.claude/plugins/cache/festatusline/festatusline/*/dist/cli.js 2>/dev/null | sort -V | tail -1)" install --force
```

### 5. Confirm to user

Show what was configured:
- Preset and locale selected
- Path depth (when asked)
- Theme applied
- Settings file path: `~/.config/festatusline/settings.json`
- Note: restart Claude Code (or the terminal session) to activate the statusline — it's
  resolved once at session start, not on the next message
