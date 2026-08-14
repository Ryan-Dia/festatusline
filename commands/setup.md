---
description: Configure festatusline status line settings
argument-hint: "[preset] [locale] [codex]"
allowed-tools: Read, Write, Bash(jq:*), Bash(cat:*), Bash(mkdir:*), Bash(ls:*), Bash(sort:*), Bash(tail:*), Bash(mv:*), AskUserQuestion
---

# festatusline Setup

Configure the festatusline status line plugin.

## Arguments

- **No arguments**: Interactive mode (asks questions)
- `$1`: Preset name — `basic`, `pro` (default), `max`
- `$2`: Locale — `ko`, `en` (default), `zh`
- `$3`: Add Codex CLI usage row — `yes`, `no` (default). Independent of preset: any tier
  can carry the Codex row or not.

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
| `cacheHit` | Prompt cache hit rate |
| `cacheTtl` | Cache TTL remaining time |
| `sessionCost` | Estimated session cost |
| `gitRepo` | Current git repository name |
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
   - `basic` (2 lines): daily row + weekly row only
     preview (use actual newlines \n between lines):
     ```
     Daily   │ Ctx ■■■□□□□□□□  38% (75K/200K)  │ Session ■■■□□□□□□□  30% (3h 0m)
     Weekly  │ all ■■□□□□□□□□  25% (4d 0h)
     ```
   - `pro` (4 lines, recommended): basic + spacer + model/repo line
     preview:
     ```
     Daily   │ Ctx ■■■□□□□□□□  38% (75K/200K)  │ Session ■■■□□□□□□□  30% (3h 0m)
     Weekly  │ all ■■□□□□□□□□  25% (4d 0h)

     Opus 5 [high] │ 📁 my-repo(main)
     ```
   - `max` (5 lines): pro + cache/cost row
     preview:
     ```
     Daily   │ Ctx ■■■□□□□□□□  38% (75K/200K)  │ Session ■■■□□□□□□□  30% (3h 0m)
     Weekly  │ all ■■□□□□□□□□  25% (4d 0h)

     ⚡70% │ ⏱ 30m │ $0.420
     Opus 5 [high] │ 📁 my-repo(main)
     ```
2. Theme — `default` (recommended), `dracula`, `nord`, `gruvbox`, `tokyo-night`
3. Locale — `ko` (recommended), `en`, `zh`
4. Codex — add the Codex CLI usage row? This is independent of preset: `basic`, `pro`,
   and `max` can each carry it or not.
   - `No` (default)
   - `Yes` — inserts a Codex row directly below the weekly row, before whatever the
     chosen preset already has there (spacer, cache/cost, model/repo). Preview for
     `pro` + Codex:
     ```
     Daily   │ Ctx ■■■□□□□□□□  38% (75K/200K)  │ Session ■■■□□□□□□□  30% (3h 0m)
     Weekly  │ all ■■□□□□□□□□  25% (4d 0h)
     Codex   │ 7d  ■□□□□□□□□□  10% (1d 0h)

     Opus 5 [high] │ 📁 my-repo(main)
     ```

**If arguments provided:**
Use `$1` as preset (default: `pro`), `$2` as locale (default: `en`), and `$3` as the Codex
choice (default: `no`).

### 2. Build settings JSON

Map the chosen preset to the `lines` array:

**basic:**
```json
{
  "lines": [
    [{"id":"dailyUsage"},{"id":"context"},{"id":"sessionRateLimit"}],
    [{"id":"weeklyUsage"},{"id":"weeklyRateLimit"}]
  ]
}
```

**pro:**
```json
{
  "lines": [
    [{"id":"dailyUsage"},{"id":"context"},{"id":"sessionRateLimit"}],
    [{"id":"weeklyUsage"},{"id":"weeklyRateLimit"}],
    [{"id":"spacer"}],
    [{"id":"model"},{"id":"gitRepo"}]
  ]
}
```

**max:**
```json
{
  "lines": [
    [{"id":"dailyUsage"},{"id":"context"},{"id":"sessionRateLimit"}],
    [{"id":"weeklyUsage"},{"id":"weeklyRateLimit"}],
    [{"id":"spacer"}],
    [{"id":"cacheHit"},{"id":"cacheTtl"},{"id":"sessionCost"}],
    [{"id":"model"},{"id":"gitRepo"}]
  ]
}
```

> The daily and weekly rows are identical across all three presets and are padded so the
> `all` bar sits directly under the `Ctx` column.

**If Codex was requested (`$3` is `yes`, or the interactive question was answered `Yes`):**
Insert `[{"id":"codexModel"},{"id":"codexWeeklyRateLimit"}]` as a new row right after the
weekly row (index 2, i.e. the 3rd entry in `lines`) — regardless of which preset was
picked. For example, `pro` + Codex becomes:
```json
{
  "lines": [
    [{"id":"dailyUsage"},{"id":"context"},{"id":"sessionRateLimit"}],
    [{"id":"weeklyUsage"},{"id":"weeklyRateLimit"}],
    [{"id":"codexModel"},{"id":"codexWeeklyRateLimit"}],
    [{"id":"spacer"}],
    [{"id":"model"},{"id":"gitRepo"}]
  ]
}
```

### 3. Write settings file

Create `~/.config/festatusline/settings.json`:
```bash
mkdir -p ~/.config/festatusline
```

Write the complete settings object with `lines`, `theme`, `locale`, `separator` (` │ `), and `weeklyAnchorDay` (null).

### 4. Update statusLine in Claude settings

Find the latest plugin path and register it:
```bash
jq --arg path "$(ls -d ~/.claude/plugins/cache/festatusline/festatusline/*/dist/cli.js 2>/dev/null | sort -V | tail -1)" '.statusLine = {"type": "command", "command": ("node " + $path), "refreshIntervalMs": 60000}' ~/.claude/settings.json > ~/.claude/settings.json.tmp && mv ~/.claude/settings.json.tmp ~/.claude/settings.json
```

### 5. Confirm to user

Show what was configured:
- Preset and locale selected
- Theme applied
- Settings file path: `~/.config/festatusline/settings.json`
- Note: restart Claude Code (or the terminal session) to activate the statusline — it's
  resolved once at session start, not on the next message
