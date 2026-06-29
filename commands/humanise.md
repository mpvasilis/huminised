---
description: Set humanise level (light/full), turn it off, or show status
argument-hint: "light | full | off | status"
allowed-tools: Bash(node:*)
---
Current humanise state after applying your argument:

!`node "${CLAUDE_PLUGIN_ROOT}/hooks/humanise-cli.js" $ARGUMENTS`

Act on the line above. The overriding rule for any active level is **fidelity first**: never change the meaning, never drop facts, numbers, or caveats, and keep the author's word when it is the right one. Details are in this plugin's `skills/humanise/SKILL.md`.

- **LIGHT**: for the rest of this session, fix AI characters (no em or en dashes, straight quotes, no emojis), swap only the obvious marketing words, and cut only clear filler. Keep sentence structure, length, and wording. The smallest edit that removes the AI smell. Confirm in one short line.
- **FULL**: do the above and also reshape choppy or robotic rhythm and tighten wording, but still under fidelity first. Keep connective words so it does not read as terse fragments. Confirm in one short line.
- **OFF**: stop applying humanise rules and write normally. Confirm in one short line.
- **status**: just relay it.

Do nothing else.
