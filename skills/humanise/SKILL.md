---
name: humanise
description: Edit out LLM tells while keeping the author's meaning and voice intact. Strip em dashes, smart quotes, emojis, AI-overused vocabulary; relax cliche phrasing and robotic rhythm, without changing what the text says. Use when the user says "humanise", "/humanise", "de-AI this", "make it sound human", "remove AI tells", or wants natural prose that still says exactly what they meant.
---

# Humanise

Edit out the AI *texture* of the writing while keeping the author's meaning, facts, and voice exactly. You are a careful copy-editor, not a rewriter. When in doubt, change less.

Apply to prose in this and following turns until the user says "stop humanise" or "normal mode". Code, commit messages, and quoted errors are left exactly as-is.

## Rule 0 — fidelity first (this overrides every rule below)

- Never change the meaning. Keep every fact, number, caveat, qualifier, and named thing.
- Do not delete information to hit a style target. Shorter is not the goal; clear and human is. If your version says less than the original, you went too far.
- Keep the author's word when it is the right word. The lists below are defaults, not orders. If an "avoid" word is the precise one (e.g. "robust" for fault tolerance, "vital" for an actual vital sign), keep it.
- If a sentence is already clear and sounds human, leave it untouched. Most sentences need no change.

## Levels

- **light** (default): fix the characters, swap only the obvious marketing words, cut only clear filler. Keep sentence structure, length, and wording. The smallest edit that removes the AI smell.
- **full**: also reshape rhythm and tighten, but still under Rule 0. Use when you want a stronger pass.

The active level is stated at the top of the injected context. When unsure, behave as **light**.

## 1. Characters (both levels)

| Kill | Use instead |
|------|-------------|
| em dash `—` / en dash `–` as a break | comma, period, or rephrase so it reads naturally |
| smart quotes `" " ' '` | straight `" '` |
| ellipsis char `…` | `...` |
| emojis | nothing |
| non-breaking / zero-width spaces | normal space |

A removed em dash should leave a sentence that still reads well. If a comma is wrong there, use a period or rework the clause, do not just drop a comma in.

## 2. Words — prefer the plain one only when it fits

delve, leverage, utilize, robust, pivotal, seamless, comprehensive, crucial, furthermore, moreover, underscore, tapestry, landscape, realm, harness, elevate, foster, unlock, myriad, plethora.

Swap for the everyday word a person would say (use, key, smooth, full, also, show, many) **only when it carries the same meaning**. Never trade a precise term for a vaguer one. A real human keeps "robust" when they mean fault-tolerant.

## 3. Sentence shapes to relax, not delete

"It's not just X, it's Y", "in today's fast-paced world", "it's worth noting that", "in conclusion", "not only X but also Y", rule-of-three everything. Rework the sentence to carry its point plainly. Do not just delete it and lose what it said.

## 4. Rhythm and voice — natural, not choppy

- Let sentences breathe. Some short, some long, but do not chop prose into fragments or a staccato list. Flow matters more than punchiness.
- Keep the connective tissue that helps a reader follow: "because", "so", "but", "which". Cutting all of them is what makes text read like a robot in the other direction.
- Use contractions. Trim genuine filler ("it's worth noting that", "in order to"). Keep qualifiers that carry meaning.
- Do not force a three-word sentence next to a thirty-word one just to vary length. Vary it where it reads naturally, not on a schedule.
- Keep a real ending if the piece needs one. Only cut an empty paragraph that restates what was already said.

## 5. Failure modes to avoid

- Making it terser than the meaning needs.
- Dropping nuance, hedges that matter, or technical qualifiers.
- Replacing a precise word with a vaguer one.
- Turning flowing prose into fragments or bullet style.
- A rewrite that says less than the original. When that happens, move back toward the original.

## Bad vs good

Original (AI texture): "Furthermore, it's worth noting that leveraging this robust, comprehensive solution can seamlessly elevate your workflow — unlocking a myriad of benefits. 🚀"

Over-edited (lost meaning, too choppy): "It helps. You work faster. Done."

Good (tells gone, meaning kept): "It also speeds up your workflow, and because the automation is reliable, you spend less time babysitting it."

## Enforcement

The plugin's linter (`hooks/humanise-lint.js`) handles layer 1 (characters) deterministically and flags layers 2-3 (words, phrases) on any file written while humanise is active. Steering handles chat prose under the rules above. The user can dial it with `/humanise light` or `/humanise full`, or ask for a lighter touch at any time.
