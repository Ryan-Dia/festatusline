---
description: Configure festatusline status line settings
argument-hint: "[preset] [locale]"
allowed-tools: Read, Write, Bash(jq:*), Bash(cat:*), Bash(mkdir:*), Bash(ls:*), Bash(sort:*), Bash(tail:*), Bash(mv:*), AskUserQuestion
---

# festatusline Setup

Configure the festatusline status line plugin.

## Arguments

- **No arguments**: Interactive mode (asks questions)
- `$1`: Preset name — `lite` (default), `plus`, `pro`
- `$2`: Locale — `ko`, `en` (default), `zh`

## Available Widgets

| id | Description |
|---|---|
| `model` | Current model name |
| `context` | Context usage bar + % |
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
   - `lite` (3 lines): Daily/context + weekly rate limit + model line
     preview (use actual newlines \n between lines):
     ```
     Daily  │ Ctx ████  31% (63K/200K)
     Weekly │ 7d ████  6% (6d 21h)
     Sonnet 4.6 [high] │ 📁 my-repo (main)
     ```
   - `plus` (5 lines, recommended): lite + spacer + cache/cost line
     preview:
     ```
     Daily  │ Ctx ████  31% (63K/200K)
     Weekly │ 7d ████  6% (6d 21h)

     ⚡100% │ ⏰ 1h 0m │ $1.56
     Sonnet 4.6 [high] │ 📁 my-repo (main)
     ```
   - `pro` (6 lines): plus + Codex CLI line
     preview:
     ```
     Daily  │ Ctx ████  31% (63K/200K)
     Weekly │ 7d ████  6% (6d 21h)
     Codex  │ 7d ████   0% (reset)

     ⚡100% │ ⏰ 1h 0m │ $1.56
     Sonnet 4.6 [high] │ 📁 my-repo (main)
     ```
2. Theme — `default` (recommended), `dracula`, `nord`, `gruvbox`, `tokyo-night`
3. Locale — `ko` (recommended), `en`, `zh`

**If arguments provided:**
Use `$1` as preset (default: `lite`) and `$2` as locale (default: `en`).

### 2. Build settings JSON

Map the chosen preset to the `lines` array:

**lite:**
```json
{
  "lines": [
    [{"id":"dailyUsage"},{"id":"context"}],
    [{"id":"weeklyUsage"},{"id":"weeklyRateLimit"}],
    [{"id":"model"},{"id":"gitRepo"}]
  ]
}
```

**plus:**
```json
{
  "lines": [
    [{"id":"dailyUsage"},{"id":"context"}],
    [{"id":"weeklyUsage"},{"id":"weeklyRateLimit"}],
    [{"id":"spacer"}],
    [{"id":"cacheHit"},{"id":"cacheTtl"},{"id":"sessionCost"}],
    [{"id":"model"},{"id":"gitRepo"}]
  ]
}
```

**pro:**
```json
{
  "lines": [
    [{"id":"dailyUsage"},{"id":"context"}],
    [{"id":"weeklyUsage"},{"id":"weeklyRateLimit"}],
    [{"id":"codexModel"},{"id":"codexWeeklyRateLimit"}],
    [{"id":"spacer"}],
    [{"id":"cacheHit"},{"id":"cacheTtl"},{"id":"sessionCost"}],
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
- Note: status line updates on the next message
