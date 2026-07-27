# festatusline

**English** | [한국어](./README.ko.md)

[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](./LICENSE)
[![Node ≥18](https://img.shields.io/badge/node-%3E%3D18-brightgreen)](https://nodejs.org)
[![i18n](https://img.shields.io/badge/i18n-ko%20%7C%20en%20%7C%20zh-orange)](./README.ko.md)

> Customizable [Claude Code](https://claude.ai/code) statusline with multilingual support (ko/en/zh), 5 themes, 7 presets, and 22 widgets including Codex CLI integration.

Inspired by [ccstatusline](https://github.com/sirmalloc/ccstatusline).

---

## ✨ Features

- **Multilingual** — Korean, English, Chinese auto-detected from `FESTATUSLINE_LOCALE` or `$LANG`
- **5 Built-in themes** — default, dracula, nord, gruvbox, tokyo-night
- **22 widgets** — Claude usage, Codex CLI, Git info, peak-time, session cost, cache stats
- **Codex CLI integration** — reads `~/.codex` for GPT request counts, rate limits, and model
- **7 Presets + interactive setup** — zero-config via `/festatusline:setup`
- **Node ≥18 only** — no Bun dependency

---

## 🚀 Quick Start

**Install as a Claude Code plugin:**

```
/plugin install festatusline
```

**Run interactive setup** (pick preset, theme, locale — registers the statusline automatically):

```
/festatusline:setup
```

**After upgrading the plugin**, update the registered path:

```
/plugin update festatusline
/festatusline:update
```

The setup command writes the following into `~/.claude/settings.json`:

```json
{
  "statusLine": {
    "type": "command",
    "command": "node ~/.claude/plugins/cache/festatusline/festatusline/<version>/dist/cli.js",
    "refreshIntervalMs": 60000
  }
}
```

---

## 🎨 Demo

```
Daily   │ Ctx ■■■■■■■■■■  23% (47K/200K)  │ Session ■■■■■■■■■■  30% (3h 41m)
Weekly  │ 7d ■■■■■■■■■■  25% (4d 0h)
Codex   │ 7d ■■■■■■■■■■  10% (1d 1h)

⚡74% │ ⏱ 1h 0m │ $0.0042
Sonnet 4.6 [high] │ 📁 festatusline(main)
```

Colors are rendered with truecolor ANSI — dim/bright bars, accent text. Output varies by preset and locale.

---

## ⚙️ Configuration

Settings are stored at `~/.config/festatusline/settings.json` (respects `$XDG_CONFIG_HOME`).

```jsonc
{
  "lines": [
    [{ "id": "dailyUsage" }, { "id": "context" }],
    [{ "id": "weeklyUsage" }, { "id": "weeklyRateLimit" }],
    [{ "id": "model" }, { "id": "claudePeak" }, { "id": "gitRepo" }]
  ],
  "theme": "default",
  "locale": "ko",
  "weeklyAnchorDay": null,
  "separator": " │ "
}
```

`lines` is an array of rows — each row is rendered as a separate output line.  
Each widget entry can include an optional `"color": "#hexcode"` override.

Edit manually or use `/festatusline:setup` in Claude Code to reconfigure.

---

## 🧩 Widgets

### Claude (15)

| id | Example output | Description |
|---|---|---|
| `model` | `Sonnet 4.6` / `Sonnet 4.6 [high]` | Current model name, shortened. Appends effort level if non-normal. |
| `context` | `Ctx ■■□□□□□□□□  23% (47K/200K)` | Context window bar + percentage + token counts |
| `sessionRateLimit` | `Now ■■■□□□□□□□  30% (3h 41m)` | Current session (rolling ~5h) usage bar + reset time |
| `weeklyRateLimit` | `7d ■■□□□□□□□□  25% (6d 10h)` | 7-day all-model rate limit + reset time |
| `peakTime` | `22:00–05:00` | Peak usage hour range (last 14 days, from jsonl history) |
| `dailyUsage` | `Daily  ` | Static label for today's usage (pairs with other widgets) |
| `dailyReset` | `↺ 04:32` | Countdown to local-midnight daily reset |
| `weeklyUsage` | `Weekly ` | Static label for weekly usage |
| `weeklyReset` | `↺ 2d 3h` | Countdown to weekly reset anchor |
| `sonnetWeeklyUsage` | `S:42K` / `S:1.3M` | Sonnet model tokens consumed this week |
| `sonnetWeeklyReset` | `S↺ 2d 3h` | Countdown to Sonnet weekly reset |
| `claudePeak` | `🔴 Peak (1h 30m)` / `🟢 Off-Peak (8h 6m)` | KST peak window 22:00–04:00 (UTC 13:00–19:00) |
| `sessionCost` | `$0.0042` / `$1.23` | Session cost in USD |
| `cacheHit` | `⚡74%` | Cache hit ratio (cache_read / total input tokens) |
| `cacheTtl` | `⏱ 1h 0m` | Remaining cache TTL (1h for ephemeral, 5m otherwise) |

### Codex (4)

| id | Example output | Description |
|---|---|---|
| `gptUsage` | `GPT:12req` | Today's Codex CLI request count (from `~/.codex/history.jsonl`) |
| `codexModel` | `Codex  ` | Static "Codex" label marking the Codex/GPT row |
| `codexWeeklyRateLimit` | `7d ■□□□□□□□□□  10% (1d 1h)` | Codex 7-day rate limit |

> `gptUsage` is hidden until Codex CLI has been used at least once. `codexModel` is a static
> label shown regardless, so the Codex row is visible even before first use.

### Git (2)

| id | Example output | Description |
|---|---|---|
| `gitBranch` | `main` | Current branch of the workspace directory |
| `gitRepo` | `📁 festatusline(main)` | Repo name + branch combined |

### Layout (1)

| id | Example output | Description |
|---|---|---|
| `spacer` | ` ` | Single space — use in `lines` for visual separation between rows |

---

## 🎨 Themes

| Theme | Accent | Notes |
|---|---|---|
| `default` | `#89b4fa` | Catppuccin-inspired, separator `│` |
| `dracula` | `#bd93f9` | Classic Dracula palette |
| `nord` | `#88c0d0` | Arctic Nord colors |
| `gruvbox` | `#83a598` | Gruvbox warm tones |
| `tokyo-night` | `#7aa2f7` | Tokyo Night dark theme |

Select a theme in the TUI or set `"theme"` in settings.json.

---

## 📦 Presets

| Preset | Lines | Highlights |
|---|---|---|
| `lite` | 3 | `dailyUsage` + `context` / `weeklyUsage` + `weeklyRateLimit` / `model` + `claudePeak` + `gitRepo` |
| `plus` | 5 | lite + spacer + `cacheHit`, `cacheTtl`, `sessionCost` row |
| `pro` | 6 | plus + Codex row (`codexModel`, `codexWeeklyRateLimit`) |

Apply a preset via `/festatusline:setup` in Claude Code.

---

## 🌏 Localization

Three locale bundles are included: `ko` (Korean), `en` (English), `zh` (Chinese).

**Detection priority:**

1. `FESTATUSLINE_LOCALE` environment variable (`ko` | `en` | `zh`)
2. `$LANG` prefix — `ko*` → Korean, `zh*` → Chinese
3. Settings file `locale` field
4. Fallback: `en`

`FESTATUSLINE_LOCALE` takes precedence over the settings file value.

---

## 🔧 Environment Variables

| Variable | Default | Description |
|---|---|---|
| `FESTATUSLINE_LOCALE` | — | Force locale (`ko` / `en` / `zh`) |
| `CLAUDE_CONFIG_DIR` | `~/.claude` | Override Claude data directory |
| `CODEX_CONFIG_DIR` | `~/.codex` | Override Codex data directory |
| `XDG_CONFIG_HOME` | `~/.config` | Settings file base path |
| `XDG_CACHE_HOME` | `~/.cache` | Cache file base path |
| `LANG` | — | System locale — used for auto-detection fallback |

---

## License

MIT © 2026 [Cheol Won](https://github.com/ryan-dia)

Inspired by [ccstatusline](https://github.com/sirmalloc/ccstatusline) by sirmalloc.
