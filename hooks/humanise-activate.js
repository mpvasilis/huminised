#!/usr/bin/env node
'use strict';
// SessionStart hook. If humanise is "on", inject the ruleset as hidden context
// so prose stays human across the whole session (survives compaction better than
// a one-line summary). If "off", emit nothing meaningful and stay inert.

const fs = require('fs');
const path = require('path');
const { getMode } = require('./humanise-config');

if (getMode() !== 'on') {
  process.stdout.write('OK');
  process.exit(0);
}

const FALLBACK =
  'HUMANISE MODE ACTIVE - write so output reads human-authored.\n\n' +
  'Kill AI characters: never use em/en dashes (use comma or a new sentence), no smart quotes, ' +
  'no ellipsis char, no emojis, no non-breaking/zero-width spaces.\n' +
  'Kill AI words: delve, leverage, utilize, robust, pivotal, seamless, comprehensive, crucial, ' +
  'furthermore, moreover, additionally, underscore, testament, tapestry, landscape, realm, harness, ' +
  'elevate, foster, unlock, myriad, plethora. Use plain words: use, key, smooth, full, also, show.\n' +
  'Kill AI shapes: "not just X, it\'s Y", "in today\'s fast-paced world", "it\'s worth noting", ' +
  '"in conclusion", rule-of-three everything.\n' +
  'Vary sentence length hard. Use contractions. Cut hedging. Do not over-format. ' +
  'Code, commits, and quoted errors stay exactly as-is. Off only on "stop humanise" / "normal mode".';

let body = '';
try {
  const skill = fs.readFileSync(path.join(__dirname, '..', 'skills', 'humanise', 'SKILL.md'), 'utf8');
  body = skill.replace(/^---[\s\S]*?---\s*/, '').trim();
} catch (e) { /* standalone install without skills dir: use fallback */ }

process.stdout.write(body
  ? 'HUMANISE MODE ACTIVE - write so output reads human-authored.\n\n' + body
  : FALLBACK);
