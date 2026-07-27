---
description: Update statusLine path to latest plugin version
allowed-tools: Read, Bash(jq:*), Bash(ls:*), Bash(sort:*), Bash(tail:*), Bash(mv:*), Bash(basename:*)
---

# festatusline Update

Update the statusLine path in settings.json to point to the latest cached plugin version.

Run this after refreshing and updating the plugin:
```
/plugin marketplace update festatusline
/plugin update festatusline@festatusline
```
(The marketplace refresh is required first — otherwise `/plugin update` reports "already at
the latest version" even when a newer commit is available.)

## Task

1. Find the latest version in the plugin cache:
```bash
ls -d ~/.claude/plugins/cache/festatusline/festatusline/*/ 2>/dev/null | grep -E '/[0-9]+\.[0-9]+\.[0-9]+/$' | sort -V | tail -1
```

2. Update settings.json with the latest version path:
```bash
LATEST_VERSION=$(ls -d ~/.claude/plugins/cache/festatusline/festatusline/*/ 2>/dev/null | grep -E '/[0-9]+\.[0-9]+\.[0-9]+/$' | sort -V | tail -1 | xargs basename)
jq --arg path "node ~/.claude/plugins/cache/festatusline/festatusline/${LATEST_VERSION}/dist/cli.js" '.statusLine.command = $path' ~/.claude/settings.json > ~/.claude/settings.json.tmp && mv ~/.claude/settings.json.tmp ~/.claude/settings.json
```

3. Show the user what was updated:
   - New version and path
   - Reminder to restart Claude Code (or the terminal session) — the statusLine command is
     resolved once at session start, so it won't pick up the new path mid-session
