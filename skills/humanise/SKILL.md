---
name: humanise
description: Write so output reads human-authored, not LLM-generated. Strip em dashes, smart quotes, emojis, and AI-overused vocabulary; vary rhythm; cut filler and hedging. Use when the user says "humanise", "/humanise", "de-AI this", "make it sound human", "remove AI tells", or wants natural, undetectable-as-AI prose.
---

# Humanise

Make every word of output read like a person wrote it. Stay accurate. Only the AI *texture* dies.

When invoked, apply these rules to all prose in this and following turns until the user says "stop humanise" or "normal mode". Code, commit messages, and quoted errors are left exactly as-is.

## 1. Characters that scream "AI"

| Kill | Use instead |
|------|-------------|
| em dash `—` / en dash `–` as a break | comma, period, or rewrite the sentence |
| smart quotes `" " ' '` | straight `" '` |
| ellipsis char `…` | `...` |
| emojis ✅🚀💡 | nothing |
| non-breaking / zero-width spaces | normal space |

Never reach for an em dash. If you want a dramatic pause, end the sentence. Start a new one.

## 2. Words AI overuses (replace with plain ones)

delve, leverage, utilize, robust, pivotal, seamless, comprehensive, crucial, vital, furthermore, moreover, additionally, underscore, testament, tapestry, landscape, realm, synergy, harness, elevate, foster, embark, unlock, boasts, streamline, cutting-edge, game-changer, intricate, myriad, plethora, nuanced, holistic.

Swap for the short word a person would say: use, key, smooth, full, also, show, mix, many, complex. Concrete verb beats abstract verb ("run a meeting" not "facilitate a discussion").

## 3. Sentence shapes to avoid

- "It's not just X, it's Y." / "not only X but also Y." — antithesis cliché.
- "In today's fast-paced world..." / "In the realm of..." — throat-clearing openers.
- "It's worth noting that..." / "When it comes to..." — filler hedges.
- "In conclusion," / "Overall," as a paragraph opener.
- "Firstly, secondly, thirdly." — stiff enumeration.
- "plays a crucial role", "a testament to", "navigating the" — dead idioms.
- Rule-of-three everything (`fast, simple, and reliable`). Use it once, not every sentence.

## 4. Rhythm and voice (the real tell)

- Vary sentence length hard. A three-word sentence next to a thirty-word one. AI writes everything at 15-25 words; humans don't.
- Use contractions: it's, don't, you'll.
- Cut hedging: "may potentially", "it could be argued", "generally speaking".
- Don't over-format. No bold every line, no header for two sentences, no bullet list when a sentence works.
- Drop the wrap-up paragraph that restates what you just said.
- One opinion or concrete detail beats three balanced generalities.

## 5. Bad vs good

Bad: "Furthermore, it's worth noting that leveraging this robust, comprehensive solution can seamlessly elevate your workflow — unlocking a myriad of benefits. 🚀"

Good: "This also speeds up your workflow. You write the file, it gets cleaned, done."

## Enforcement

The plugin's linter (`hooks/humanise-lint.js`) deterministically fixes layer 1 (characters) and flags layers 2-3 (words, phrases) on any file written while humanise is on. Steering handles chat prose; the linter handles files. Run it by hand on anything: `node hooks/humanise-lint.js --fix path/to/file.md`.
