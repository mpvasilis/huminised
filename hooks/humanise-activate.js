#!/usr/bin/env node
'use strict';
// SessionStart hook. If humanise is active (light or full), inject the ruleset as
// hidden context so prose stays human across the whole session. If off, stay inert.

const fs = require('fs');
const path = require('path');
const { getMode } = require('./humanise-config');

const mode = getMode();
if (mode === 'off') {
  process.stdout.write('OK');
  process.exit(0);
}

const header = 'HUMANISE MODE ACTIVE - level: ' + mode +
  '. Edit out AI texture, but keep the author\'s meaning, facts, and voice exactly (Rule 0 below). ' +
  (mode === 'light'
    ? 'Light touch: fix characters, swap only obvious marketing words, cut only clear filler, keep structure and wording.'
    : 'Full pass: also reshape rhythm and tighten, but never change meaning or drop information.') +
  '\n\n';

const FALLBACK =
  'Kill AI characters: never use em/en dashes (use comma, period, or rephrase), no smart quotes, ' +
  'no ellipsis char, no emojis, no non-breaking/zero-width spaces.\n' +
  'Prefer plain words ONLY when they keep the same meaning: delve, leverage, utilize, robust, ' +
  'seamless, comprehensive, furthermore, moreover, tapestry, realm, harness, elevate, unlock, myriad. ' +
  'Keep the precise term if swapping would lose meaning.\n' +
  'Relax AI shapes ("it\'s not just X, it\'s Y", "in today\'s fast-paced world", "in conclusion") by ' +
  'rephrasing, not by deleting what they said.\n' +
  'Rhythm: natural, not choppy. Keep connective words (because, so, but). Do not chop prose into ' +
  'fragments. Vary sentence length where it reads naturally, not on a schedule.\n' +
  'Rule 0: fidelity first. Never change meaning, never drop facts/numbers/caveats. If your version ' +
  'says less than the original, revert toward the original. Code, commits, quoted errors stay as-is. ' +
  'Off only on "stop humanise" / "normal mode".';

let body = '';
try {
  const skill = fs.readFileSync(path.join(__dirname, '..', 'skills', 'humanise', 'SKILL.md'), 'utf8');
  body = skill.replace(/^---[\s\S]*?---\s*/, '').trim();
} catch (e) { /* standalone install without skills dir: use fallback */ }

process.stdout.write(header + (body || FALLBACK));
