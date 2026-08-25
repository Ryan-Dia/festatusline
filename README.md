# festatusline

**English** | [한국어](./README.ko.md)

[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](./LICENSE)
[![Node ≥18](https://img.shields.io/badge/node-%3E%3D18-brightgreen)](https://nodejs.org)
[![i18n](https://img.shields.io/badge/i18n-ko%20%7C%20en%20%7C%20zh-orange)](./README.ko.md)

> Customizable [Claude Code](https://claude.ai/code) statusline with multilingual support (ko/en/zh), 5 themes, 7 presets, and 23 widgets including Codex CLI integration.

Inspired by [ccstatusline](https://github.com/sirmalloc/ccstatusline).

---

## ✨ Features

- **Multilingual** — Korean, English, Chinese auto-detected from `FESTATUSLINE_LOCALE` or `$LANG`
- **5 Built-in themes** — default, dracula, nord, gruvbox, tokyo-night
- **23 widgets** — Claude usage, Codex CLI, Git info, session cost, cache stats
- **Codex CLI integration** — reads `~/.codex` for GPT request counts, rate limits, and model
- **7 Presets + interactive setup** — zero-config via `/festatusline:setup`
- **Node ≥18 only** — no Bun dependency

---

## 🚀 Quick Start

**1. Add the marketplace** (one-time — festatusline isn't in Claude's official plugin catalog):

```
/plugin marketplace add Ryan-Dia/festatusline
```

**2. Install the plugin:**

```
/plugin install festatusline@festatusline
```

**3. Run interactive setup** (pick preset, theme, locale — registers the statusline automatically):

```
/festatusline:setup
```

**After upgrading the plugin**, run:

```
/festatusline:update
```

It refreshes the marketplace, updates the plugin, and repoints `statusLine` at the newest
cached version in one step — no `/plugin` commands needed first.

Restart Claude Code (or your terminal session) afterward — the statusline command is
resolved once at session start.

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
Daily   │ Ctx ■■■■■■■■■■  38% (75K/200K)  │ Session ■■■■■■■■■■  30% (3h 0m)
Weekly  │ all ■■■■■■■■■■  25% (4d 0h)
Codex   │ 7d  ■■■■■■■■■■  10% (1d 0h)

⚡70% │ ⏱ 30m │ $0.420
Opus 5 [high] │ 📁 festatusline(main)
```

That is the `max` preset with the optional Codex row added. Colors are rendered with truecolor
ANSI — filled and empty bar cells use the same `■` glyph at different brightness, so the bars
look solid once color is stripped. Output varies by preset, Codex opt-in, and locale.

---

## ⚙️ Configuration

Settings are stored at `~/.config/festatusline/settings.json` (respects `$XDG_CONFIG_HOME`).

```jsonc
{
  "lines": [
    [{ "id": "dailyUsage" }, { "id": "context" }],
    [{ "id": "weeklyUsage" }, { "id": "weeklyRateLimit" }],
    [{ "id": "model" }, { "id": "gitRepo" }]
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

### Claude (16)

| id | Example output | Description |
|---|---|---|
| `model` | `Sonnet 4.6` / `Opus 5 [xhigh, fast]` | Current model name, shortened. Appends session flags: effort level, `fast` while fast mode is on, `no-think` when thinking is explicitly disabled. |
| `context` | `Ctx ■■□□□□□□□□  23% (47K/200K)` | Context window bar + percentage + token counts |
| `sessionRateLimit` | `Session ■■■□□□□□□□  30% (3h 41m)` | Current session (rolling ~5h) usage bar + reset time |
| `weeklyRateLimit` | `all ■■□□□□□□□□  25% (6d 10h)` | 7-day all-model rate limit + reset time |
| `dailyUsage` | `Daily  ` | Static label for today's usage (pairs with other widgets) |
| `dailyReset` | `↺ 04:32` | Countdown to local-midnight daily reset |
| `weeklyUsage` | `Weekly ` | Static label for weekly usage |
| `weeklyReset` | `↺ 2d 3h` | Countdown to weekly reset anchor |
| `sonnetWeeklyUsage` | `S:42K` / `S:1.3M` | Sonnet model tokens consumed this week |
| `sonnetWeeklyReset` | `S↺ 2d 3h` | Countdown to Sonnet weekly reset |
| `sessionCost` | `$0.0042` / `$1.23` | Session cost in USD |
| `cacheHit` | `⚡74%` | Cache hit ratio (cache_read / total input tokens) |
| `cacheTtl` | `⏱ 1h 0m` | Remaining cache TTL (1h for ephemeral, 5m otherwise) |
| `modelMix` | `Opus 78% · Sonnet 22%` | This week's spend split by model family, weighted the way `/usage` weights it |
| `fastMode` | `»fast` | Shown only while fast mode is on (standalone form of the `model` flag) |
| `linesChanged` | `+156/-23` | Lines added / removed this session |

> **Per-model weekly limits are not available.** The statusline stdin payload only carries
> `rate_limits.five_hour` and `rate_limits.seven_day`. Claude Code tracks per-model buckets
> (Opus, Sonnet, Fable) internally and shows them in `/usage`, but never hands them to
> statuslines nor caches them on disk — so `weeklyRateLimit` is the all-model figure only.

> `modelMix` weights tokens the way Claude Code's own `/usage` does — a cache read is the
> unit, uncached input 10x, a cache write 12.5x, output 50x, all scaled by model family
> (Fable 10, Opus 5, Sonnet 3, Haiku 1). It is reported as a share because the weighted
> unit only means something next to another weighted unit. Raw-token widgets such as
> `sonnetWeeklyUsage` stay unweighted.


> The `model` widget's effort label comes from the payload's `effort.level`, falling back to
> the `CLAUDE_EFFORT` environment variable Claude Code exports to the status line spawn (the
> same value, so it only matters for a payload that failed to parse). `effortLevel` in
> `~/.claude/settings.json` is deliberately *not* consulted — it misses mid-session `/effort`
> changes and the per-model `modelSettings` override, so it reports a level the session is not
> running at. Ultracode cannot be detected at all: Claude Code reports it as `xhigh` on every
> channel, so only a settings file that pins `ultracode: true` distinguishes it.

### Codex (3)

| id | Example output | Description |
|---|---|---|
| `gptUsage` | `GPT:12req` | Today's Codex CLI request count (from `~/.codex/history.jsonl`) |
| `codexModel` | `Codex  ` | Static "Codex" label marking the Codex/GPT row |
| `codexWeeklyRateLimit` | `7d  ■□□□□□□□□□  10% (1d 1h)` | Codex 7-day rate limit |

> `gptUsage` is hidden until Codex CLI has been used at least once. `codexModel` is a static
> label shown regardless, so the Codex row is visible even before first use.

### Git (3)

| id | Example output | Description |
|---|---|---|
| `gitBranch` | `main` | Current branch of the workspace directory |
| `gitRepo` | `📁 festatusline(main)` | Repo name + branch combined. Takes the name from `workspace.repo` when Claude Code supplies it, falling back to `git rev-parse`. |
| `pr` | `PR #1234 ✓` / `MR !77 ✗` | Open pull request for the branch; GitLab merge requests render as `MR !n` |

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
| `basic` | 2 | daily row / weekly row |
| `pro` | 4 | basic + spacer + `model` + `gitRepo` |
| `max` | 5 | pro + `cacheHit` + `cacheTtl` + `sessionCost` row |

The daily row is `dailyUsage` + `context` + `sessionRateLimit`, and the weekly row is
`weeklyUsage` + `weeklyRateLimit` — the `all` bar is padded to sit under the `Ctx` column.

Apply a preset via `/festatusline:setup` in Claude Code. The setup wizard and the preset menu both
render a live preview of the highlighted preset — sample usage numbers, your current theme and
locale — so you can see the layout before committing to it.

Any preset can also carry a Codex row (`codexModel` + `codexWeeklyRateLimit`), inserted directly
below the weekly row. The setup wizard asks about it as a separate step after the preset choice —
it is not tied to any one tier.

`minimal`, `full`, `korean-dev` and `multi-cli` remain available in the preset menu but are not
offered by the setup wizard.

---

## 🌏 Localization

Three locale bundles are included: `ko` (Korean), `en` (English), `zh` (Chinese).

**Detection priority:**

1. `FESTATUSLINE_LOCALE` environment variable (`ko` | `en` | `zh`)
2. `$LANG` prefix — `ko*` → Korean, `zh*` → Chinese
3. Settings file `locale` field
4. Fallback: `en`

`FESTATUSLINE_LOCALE` takes precedence over the settings file value.

Locale applies to the interactive TUI — setup wizard labels, menus, preset names. The rendered
statusline carries no translated strings, so widget output is identical in every locale.

---

## 🔧 Environment Variables

| Variable | Default | Description |
|---|---|---|
| `FESTATUSLINE_LOCALE` | — | Force locale (`ko` / `en` / `zh`) |
| `CLAUDE_EFFORT` | — | Set by Claude Code, not by you. Effort level for the current session; read only as a fallback when the payload has no `effort.level` |
| `CLAUDE_CONFIG_DIR` | `~/.claude` | Override Claude data directory |
| `CODEX_CONFIG_DIR` | `~/.codex` | Override Codex data directory |
| `XDG_CONFIG_HOME` | `~/.config` | Settings file base path |
| `XDG_CACHE_HOME` | `~/.cache` | Cache file base path |
| `LANG` | — | System locale — used for auto-detection fallback |

---

## License

MIT © 2026 [Cheol Won](https://github.com/ryan-dia)

Inspired by [ccstatusline](https://github.com/sirmalloc/ccstatusline) by sirmalloc.
