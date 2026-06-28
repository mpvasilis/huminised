# humanise

A Claude Code plugin that makes output read human-authored, not LLM-generated. It removes the em dashes, smart quotes, emojis, and AI-overused words that mark text as machine-written.

## Why a plugin, and what it can't do

No Claude Code hook can rewrite the assistant's chat prose after the model generates it. Hooks inject context or act on tool calls; they don't post-edit the reply you see. So humanising works on two layers:

1. **Steering** (a skill + a SessionStart hook). Injects writing rules so prose comes out human in the first place. Covers chat. Soft: the model can still drift, which is why the full ruleset is re-injected each session.
2. **Deterministic linting** (a PostToolUse hook + a CLI script). Hard-cleans any file Claude writes, and runs standalone on any text. This is the part you can actually verify and test.

## What it fixes

**Auto-fixed (deterministic):** em/en dashes, smart quotes, ellipsis character, emojis, non-breaking and zero-width spaces.

**Flagged for review (never auto-rewritten):** AI-overused words (delve, leverage, robust, seamless, furthermore, tapestry, myriad...), cliche phrases ("it's worth noting", "in today's fast-paced world", "not only X but also Y"), and low sentence-length variance.

## Results

Measured across four writing genres (marketing, technical blog, cold email, changelog). All numbers come from `hooks/humanise-lint.js`. Full visual report: [`report/index.html`](report/index.html). Reproduce with `node scripts/run-experiments.js`.

| Tell (totalled over 4 genres) | Plugin OFF (raw LLM) | Plugin ON (steered) |
|---|---:|---:|
| char-tells (em dashes, smart quotes, ellipses, emojis) | 7 | **0** |
| AI-overused words | 55 | **0** |
| cliche phrases | 10 | **0** |

Example, one paragraph:

> **OFF:** In today's fast-paced digital landscape, productivity isn't just about working harder — it's about working smarter. Our cutting-edge platform empowers teams to seamlessly streamline their workflows and unlock their full potential. 🚀
>
> **ON:** Most productivity tools just add more buttons. Ours cuts steps instead. You write a task once. It routes itself, pulls in the right people, and gets out of your way.

### Code safety: 4/4 pass

The plugin must never corrupt generated code. The PostToolUse hook was run for real over code files and a markdown doc with embedded code, each seeded with em dashes, smart quotes, ellipses and emojis inside the code:

| File | Result |
|---|---|
| `experiments/code/snippet.js` | code untouched (skipped by extension) |
| `experiments/code/snippet.py` | code untouched (skipped by extension) |
| `experiments/code/config.ts` | code untouched (skipped by extension) |
| `experiments/code/doc-with-code.md` | code blocks + inline code preserved byte-for-byte, prose cleaned |

Pure code files (`.js`, `.py`, `.ts`, ...) are never touched. Markdown is cleaned, but fenced and inline code is masked first, so code samples in docs survive intact.

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
- `commands/humanise.md` — the `/humanise on|off|status` slash command.
- `scripts/run-experiments.js` — runs the experiments and regenerates the report.
- `experiments/` — raw vs human sample pairs and the code-safety fixtures.
- `report/index.html` — the generated visual report (`report/results.json` has the raw numbers).
