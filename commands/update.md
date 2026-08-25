---
description: Refresh, update, and point statusLine at the latest festatusline release
allowed-tools: Read, Bash(claude plugin marketplace update:*), Bash(claude plugin update:*), Bash(jq:*), Bash(ls:*), Bash(sort:*), Bash(tail:*), Bash(mv:*), Bash(basename:*)
---

# festatusline Update

Refresh the marketplace, update the plugin, and point `statusLine` at the newest cached
version — this command does the whole thing, no `/plugin` commands needed first.

## Task

1. Capture the currently configured `statusLine` command, to compare against later:
```bash
jq -r '.statusLine.command // ""' ~/.claude/settings.json
```

2. Refresh the marketplace. This must run first — otherwise the update check in the next
   step reports "already at the latest version" even when a newer release exists on GitHub:
```bash
claude plugin marketplace update festatusline
```

3. Update the plugin to the latest release. `-y` accepts the marketplace-declared install
   command without a confirmation prompt, which is required since this runs non-interactively:
```bash
claude plugin update festatusline@festatusline -y
```

4. Point `statusLine` at whatever is now the latest version in the plugin cache:
```bash
LATEST_VERSION=$(ls -d ~/.claude/plugins/cache/festatusline/festatusline/*/ 2>/dev/null | grep -E '/[0-9]+\.[0-9]+\.[0-9]+/$' | sort -V | tail -1 | xargs basename)
if [ -z "$LATEST_VERSION" ]; then
  echo "No cached festatusline version found — is the plugin installed?" >&2
else
  jq --arg path "node ~/.claude/plugins/cache/festatusline/festatusline/${LATEST_VERSION}/dist/cli.js" '.statusLine.command = $path' ~/.claude/settings.json > ~/.claude/settings.json.tmp && mv ~/.claude/settings.json.tmp ~/.claude/settings.json
fi
```

5. Report to the user:
   - The version now configured, and whether it changed from what step 1 captured
   - If it did not change, say plainly that festatusline was already up to date — don't imply
     an update happened when the path is identical
   - If it did change, remind them to restart Claude Code (or the terminal session) —
     `statusLine` is resolved once at session start, so it won't pick up the new path
     mid-session
