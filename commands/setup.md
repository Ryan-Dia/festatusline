---
description: Configure festatusline status line settings
argument-hint: "[preset] [locale]"
allowed-tools: Read, Write, Bash(jq:*), Bash(cat:*), Bash(mkdir:*), Bash(ls:*), Bash(sort:*), Bash(tail:*), Bash(mv:*), AskUserQuestion
---

# festatusline Setup

Configure the festatusline status line plugin.

## Arguments

- **No arguments**: Interactive mode (asks questions)
- `$1`: Preset name — `minimal` (default), `full`, `korean-dev`, `multi-cli`
- `$2`: Locale — `ko`, `en` (default), `zh`

## Available Widgets

| id | Description |
|---|---|
| `model` | Current model name |
| `context` | Context usage bar + % |
| `peakTime` | Peak usage hours (last 14 days) |
| `dailyUsage` | Today's total tokens |
| `dailyReset` | Time until daily reset |
| `weeklyUsage` | Last 7 days total tokens |
| `weeklyReset` | Time until weekly reset |
| `sonnetWeeklyUsage` | Last 7 days Sonnet model tokens |
| `sonnetWeeklyReset` | Time until Sonnet weekly reset |
| `gptUsage` | Today's Codex CLI request count |
| `rateLimit` | Current rate limit status |
| `claudePeak` | Claude usage peak indicator |
| `weeklyRateLimit` | Weekly rate limit status |

## Available Themes

`default`, `dracula`, `nord`, `gruvbox`, `tokyo-night`

## Tasks

### 1. Determine configuration

**If no arguments provided (interactive mode):**

Ask all questions in a single AskUserQuestion call:
1. Preset — options with descriptions:
   - `minimal` (recommended): 3-line layout with daily/weekly usage, context, rate limits, model
   - `full`: All widgets in one line
   - `korean-dev`: Korean locale + all widgets
   - `multi-cli`: Model + daily usage + Codex CLI usage
2. Theme — `default` (recommended), `dracula`, `nord`, `gruvbox`, `tokyo-night`
3. Locale — `en` (default), `ko`, `zh`

**If arguments provided:**
Use `$1` as preset (default: `minimal`) and `$2` as locale (default: `en`).

### 2. Build settings JSON

Map the chosen preset to the `lines` array:

**minimal:**
```json
{
  "lines": [
    [{"id":"dailyUsage"},{"id":"context"},{"id":"rateLimit"}],
    [{"id":"weeklyUsage"},{"id":"weeklyRateLimit"}],
    [{"id":"model"},{"id":"claudePeak"}]
  ]
}
```

**full:**
```json
{
  "lines": [
    [{"id":"model"},{"id":"claudePeak"},{"id":"context"},{"id":"rateLimit"},{"id":"peakTime"},{"id":"dailyUsage"},{"id":"dailyReset"},{"id":"weeklyUsage"},{"id":"weeklyReset"},{"id":"sonnetWeeklyUsage"},{"id":"sonnetWeeklyReset"},{"id":"gptUsage"}]
  ]
}
```

**korean-dev:**
```json
{
  "lines": [
    [{"id":"model"},{"id":"claudePeak"},{"id":"context"},{"id":"rateLimit"},{"id":"peakTime"},{"id":"dailyUsage"},{"id":"dailyReset"},{"id":"weeklyUsage"},{"id":"weeklyReset"},{"id":"sonnetWeeklyUsage"},{"id":"sonnetWeeklyReset"},{"id":"gptUsage"}]
  ],
  "locale": "ko"
}
```

**multi-cli:**
```json
{
  "lines": [
    [{"id":"model"},{"id":"dailyUsage"},{"id":"gptUsage"}]
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
jq --arg path "$(ls -d ~/.claude/plugins/cache/festatusline/festatusline/*/dist/cli.js 2>/dev/null | sort -V | tail -1)" '.statusLine = {"type": "command", "command": ("node " + $path)}' ~/.claude/settings.json > ~/.claude/settings.json.tmp && mv ~/.claude/settings.json.tmp ~/.claude/settings.json
```

### 5. Confirm to user

Show what was configured:
- Preset and locale selected
- Theme applied
- Settings file path: `~/.config/festatusline/settings.json`
- Note: status line updates on the next message
