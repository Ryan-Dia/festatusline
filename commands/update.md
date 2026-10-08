---
description: Refresh and update festatusline, keeping statusLine on its version-independent launcher
allowed-tools: Read, Bash(claude plugin marketplace update:*), Bash(claude plugin update:*), Bash(jq:*), Bash(node:*)
---

# festatusline Update

Refresh the marketplace, update the plugin, and make sure `statusLine` runs the
festatusline launcher — this command does the whole thing, no `/plugin` commands needed first.

## Task

1. Capture the installed version, to compare against later:
```bash
jq -r '.plugins["festatusline@festatusline"][0].version // "none"' ~/.claude/plugins/installed_plugins.json
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

4. Re-register through the installed version. This points `statusLine` at the launcher
   (`~/.config/festatusline/statusline.mjs`) and rewrites the launcher itself. Setups from
   before 0.11.0 pointed `statusLine` straight at one version's cache folder; this moves them
   over once:
```bash
node "$(jq -r '.plugins["festatusline@festatusline"][0].installPath' ~/.claude/plugins/installed_plugins.json)/dist/cli.js" install --force
```

5. Report to the user:
   - The version now installed (step 1's command again), and whether it changed from step 1
   - If it did not change, say plainly that festatusline was already up to date — don't imply
     an update happened when the version is identical
   - The launcher picks the new version up on the statusline's next refresh, no restart
     needed. The one exception is a setup this step just moved onto the launcher (its
     `statusLine` command changed): Claude Code reads that command once at session start, so
     that one time it needs a restart
