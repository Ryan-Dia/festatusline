---
description: Update statusLine path to latest plugin version
allowed-tools: Read, Bash(jq:*), Bash(ls:*), Bash(sort:*), Bash(tail:*), Bash(mv:*), Bash(basename:*)
---

# festatusline Update

Update the statusLine path in settings.json to point to the latest cached plugin version.

Run this command after updating the plugin via `/plugin update festatusline`.

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
   - Reminder that the status line updates on the next message
