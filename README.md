# humanise

A Claude Code plugin that makes output read human-authored, not LLM-generated. It removes the em dashes, smart quotes, emojis, and AI-overused words that mark text as machine-written.

## Why a plugin, and what it can't do

No Claude Code hook can rewrite the assistant's chat prose after the model generates it. Hooks inject context or act on tool calls; they don't post-edit the reply you see. So humanising works on two layers:

1. **Steering** (a skill + a SessionStart hook). Injects writing rules so prose comes out human in the first place. Covers chat. Soft: the model can still drift, which is why the full ruleset is re-injected each session.
2. **Deterministic linting** (a PostToolUse hook + a CLI script). Hard-cleans any file Claude writes, and runs standalone on any text. This is the part you can actually verify and test.

## What it fixes

**Auto-fixed (deterministic):** em/en dashes, smart quotes, ellipsis character, emojis, non-breaking and zero-width spaces.

**Flagged for review (never auto-rewritten):** AI-overused words (delve, leverage, robust, seamless, furthermore, tapestry, myriad...), cliche phrases ("it's worth noting", "in today's fast-paced world", "not only X but also Y"), and low sentence-length variance.

## Install

Local, for development:

```bash
/plugin marketplace add C:\Users\vasilis\Documents\GitHub\huminised
/plugin install humanise
```

Or wire the hooks directly in `~/.claude/settings.json` without the marketplace (use absolute paths to the two hook scripts).

## Turn it on

Default is off, so it never fights another style mode until you ask for it.

- Slash command: `/humanise on`, `/humanise off`, `/humanise status`. Plain `/humanise` turns it on.
- Or set the flag directly:

```bash
node -e "require('./hooks/humanise-config').setMode('on')"   # on
node -e "require('./hooks/humanise-config').setMode('off')"  # off
```

When on, the SessionStart hook steers chat prose and the PostToolUse hook cleans every `.md`/`.txt`/`.mdx` file Claude writes. Turning on mid-session activates file cleaning immediately; the slash command also tells the model to apply the prose rules right away (the SessionStart steering only injects at the next session start).

## Test it

Run the linter on the bundled sample:

```bash
node hooks/humanise-lint.js test/sample-llm.md            # report only
node hooks/humanise-lint.js --fix --stdout test/sample-llm.md   # show cleaned text
node hooks/humanise-lint.js --fix test/sample-llm.md      # clean in place
echo "This is robust and seamless — really." | node hooks/humanise-lint.js --fix
```

The report lists char-tells fixed, AI words with plain-word suggestions and line numbers, cliche patterns, and a rhythm warning.

## Files

- `skills/humanise/SKILL.md` — the ruleset, also the `/humanise` skill.
- `hooks/humanise-lint.js` — the linter (CLI + library).
- `hooks/humanise-activate.js` — SessionStart steering.
- `hooks/humanise-posttool.js` — PostToolUse file cleaner.
- `hooks/humanise-config.js` — on/off flag.
