---
description: Toggle humanise output mode on/off (or show status)
argument-hint: "on | off | status"
allowed-tools: Bash(node:*)
---
Current humanise state after applying your argument:

!`node "${CLAUDE_PLUGIN_ROOT}/hooks/humanise-cli.js" $ARGUMENTS`

Act on the line above:
- If it says **ON**: for the rest of this session, write every prose reply by the rules in this plugin's `skills/humanise/SKILL.md` — no em or en dashes (use a comma or a new sentence), straight quotes only, no emojis, none of the AI-overused words, and vary sentence length. Confirm in one short line.
- If it says **OFF**: stop applying humanise rules and write normally. Confirm in one short line.
- If it only reports status: just relay it.

Do nothing else.
