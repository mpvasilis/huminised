#!/usr/bin/env node
'use strict';
/*
 humanise-lint — strip AI "tells" from text.

 Two layers:
   1. Deterministic char fixes (--fix): em/en dashes, smart quotes, ellipsis,
      emojis, non-breaking / zero-width spaces. Safe to auto-apply.
   2. Report-only flags: AI-overused words + cliche sentence patterns + robotic
      rhythm. Surfaced for a human to decide, never auto-rewritten.

 Usage:
   node humanise-lint.js <file>               report only
   node humanise-lint.js --fix <file>         fix file in place + report
   node humanise-lint.js --fix --stdout <f>   print fixed text to stdout, don't write
   cat x.md | node humanise-lint.js [--fix]   read stdin, print to stdout
*/

const fs = require('fs');

// ---- Layer 1: deterministic character fixes -------------------------------

// Broad emoji / pictograph / dingbat / flag / variation-selector coverage.
const EMOJI_RE = /[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{2B00}-\u{2BFF}\u{1F1E6}-\u{1F1FF}\u{FE00}-\u{FE0F}\u{2190}-\u{21FF}\u{2300}-\u{23FF}\u{200D}]/gu;

function countTells(text) {
  let c = 0;
  c += (text.match(/[–—]/g) || []).length;                                   // en/em dash
  c += (text.match(/[‘’‚‛“”„‟]/g) || []).length; // smart quotes
  c += (text.match(/…/g) || []).length;                                           // ellipsis
  c += (text.match(/[    ​‌‍﻿⁠]/g) || []).length; // spaces
  c += (text.match(EMOJI_RE) || []).length;                                            // emoji
  return c;
}

function applyReplacements(text) {

  // numeric ranges first: 10–20 / 10—20 → 10-20 (keep a hyphen, not a comma)
  text = text.replace(/(\d)\s*[–—]\s*(\d)/g, '$1-$2');
  // em/en dash used as a break between words → comma. Markdown bullets and "---"
  // rules use ASCII hyphens, so they are untouched.
  text = text.replace(/\s*[–—]\s*/g, ', ');

  text = text.replace(/[‘’‚‛]/g, "'");   // single smart quotes
  text = text.replace(/[“”„‟]/g, '"');   // double smart quotes
  text = text.replace(/…/g, '...');                     // ellipsis

  text = text.replace(/[    ]/g, ' ');   // nbsp / thin / narrow → space
  text = text.replace(/[​‌‍﻿⁠]/g, ''); // zero-width junk → gone

  text = text.replace(EMOJI_RE, '');                         // emoji → gone

  // tidy artifacts the replacements can leave behind
  text = text.replace(/,\s*,/g, ',');
  text = text.replace(/ +([,.;:!?])/g, '$1');
  text = text.replace(/[ \t]{2,}/g, ' ');
  text = text.replace(/ +$/gm, '');

  return text;
}

function fixChars(text) {
  // Mask code so we never rewrite characters inside fenced blocks or inline `code`.
  // A doc's prose gets cleaned; its code samples stay byte-for-byte intact.
  // NUL-delimited placeholders are safe: no replacement rule targets \x00, and \x00
  // is not whitespace, so a masked digit can't bridge into the numeric-range rule.
  const blocks = [];
  const stash = m => { blocks.push(m); return '\x00' + (blocks.length - 1) + '\x00'; };
  let masked = text.replace(/```[\s\S]*?```|~~~[\s\S]*?~~~/g, stash); // fenced blocks
  masked = masked.replace(/`[^`\n]*`/g, stash);                        // inline code

  const changes = countTells(masked); // count tells outside code only
  const out = applyReplacements(masked).replace(/\x00(\d+)\x00/g, (_, i) => blocks[+i]);
  return { text: out, changes };
}

// ---- Layer 2: AI-overused words (flag, with a plain-word suggestion) -------

const BANNED = [
  // verbs / actions
  ['delve', 'dig into'], ['delving', 'digging into'],
  ['leverage', 'use'], ['leveraging', 'using'], ['leverages', 'uses'],
  ['utilize', 'use'], ['utilise', 'use'], ['utilizing', 'using'], ['utilising', 'using'], ['utilization', 'use'],
  ['facilitate', 'help'], ['facilitates', 'helps'], ['facilitating', 'helping'],
  ['harness', 'use'], ['harnessing', 'using'],
  ['streamline', 'simplify'], ['streamlined', 'simplified'], ['streamlining', 'simplifying'],
  ['optimize', 'improve'], ['optimise', 'improve'], ['optimizing', 'improving'], ['optimising', 'improving'],
  ['elevate', 'improve'], ['elevates', 'improves'], ['elevating', 'improving'],
  ['empower', 'let'], ['empowers', 'lets'], ['empowering', 'helping'],
  ['foster', 'build'], ['fosters', 'builds'], ['fostering', 'building'],
  ['embark', 'start'], ['unlock', 'open up'], ['unlocks', 'opens up'], ['unlocking', 'opening up'],
  ['spearhead', 'lead'], ['spearheaded', 'led'],
  ['supercharge', 'speed up'], ['supercharged', 'sped up'],
  ['revolutionize', 'change'], ['revolutionise', 'change'], ['revolutionizing', 'changing'],
  ['endeavor', 'try'], ['endeavour', 'try'], ['endeavors', 'efforts'],
  ['cater', 'serve'], ['caters', 'serves'], ['catering', 'serving'],
  ['garner', 'get'], ['garnered', 'got'], ['garners', 'gets'],
  ['resonate', 'connect'], ['resonates', 'connects'], ['resonating', 'connecting'],
  ['captivate', 'grip'], ['captivating', 'gripping'],
  ['underscore', 'show'], ['underscores', 'shows'], ['underscoring', 'showing'],
  ['boast', 'have'], ['boasts', 'has'], ['boasting', 'having'],
  // adjectives
  ['robust', 'solid'], ['pivotal', 'key'], ['seamless', 'smooth'], ['seamlessly', 'smoothly'],
  ['comprehensive', 'full'], ['crucial', 'key'], ['vital', 'key'], ['paramount', 'key'],
  ['transformative', 'big'], ['revolutionary', 'new'], ['groundbreaking', 'new'],
  ['cutting-edge', 'new'], ['state-of-the-art', 'modern'], ['next-generation', 'new'], ['next-gen', 'new'],
  ['bespoke', 'custom'], ['tailored', 'fitted'], ['curated', 'chosen'],
  ['meticulous', 'careful'], ['meticulously', 'carefully'],
  ['profound', 'deep'], ['profoundly', 'deeply'],
  ['unparalleled', 'unmatched'], ['unprecedented', 'new'],
  ['world-class', 'top'], ['top-notch', 'great'], ['best-in-class', 'top'],
  ['indispensable', 'needed'], ['invaluable', 'very useful'], ['sought-after', 'popular'],
  ['intricate', 'complex'], ['multifaceted', 'complex'], ['nuanced', 'subtle'],
  ['holistic', 'whole'], ['myriad', 'many'], ['plethora', 'lots'], ['ample', 'plenty'],
  ['vibrant', 'lively'], ['bustling', 'busy'],
  // nouns / filler
  ['tapestry', 'mix'], ['landscape', 'field'], ['realm', 'area'], ['synergy', 'fit'],
  ['testament', 'proof'], ['ecosystem', 'system'], ['journey', 'path'],
  ['treasure trove', 'lots'], ['game-changer', 'big deal'], ['paradigm', 'model'],
  ['takeaway', 'point'], ['takeaways', 'points'],
  // connectives / adverbs (often cut entirely)
  ['furthermore', 'also'], ['moreover', 'also'], ['additionally', 'also'],
  ['notably', 'cut it'], ['importantly', 'cut it'], ['ultimately', 'cut it'],
  ['essentially', 'cut it'], ['fundamentally', 'cut it'], ['arguably', 'cut it'],
  ['aforementioned', 'earlier'], ['amidst', 'amid'], ['whilst', 'while'], ['nestled', 'set'],
];

// ---- Layer 3: cliche sentence patterns (flag) -----------------------------

const PHRASES = [
  [/\bnot only\b[^.?!]*\bbut also\b/i, "antithesis cliche ('not only X but also Y')"],
  [/\bit'?s not just\b[^.?!]*,\s*it'?s\b/i, "'it's not just X, it's Y' construction"],
  [/\bit'?s worth noting\b/i, "filler hedge ('it's worth noting')"],
  [/\bwhen it comes to\b/i, "filler ('when it comes to')"],
  [/\bin (?:today'?s|the) (?:fast-paced|digital|modern|ever-changing)\b/i, "cliche opener ('in today's ... world')"],
  [/\bin the world of\b/i, "cliche ('in the world of')"],
  [/\bever-(?:evolving|changing|growing|expanding)\b/i, "cliche ('ever-evolving')"],
  [/^\s*(?:in conclusion|in summary|to sum up|to conclude|overall|in essence|all in all)\b/im, "formulaic conclusion opener"],
  [/\bat the end of the day\b/i, "cliche ('at the end of the day')"],
  [/\bthe bottom line\b/i, "cliche ('the bottom line')"],
  [/\b(?:firstly|secondly|thirdly)\b/i, "stiff enumerator ('firstly/secondly')"],
  [/\blet'?s (?:dive|delve)\b/i, "cliche ('let's dive in')"],
  [/\bdeep[- ]dive\b/i, "cliche ('deep dive')"],
  [/\ba testament to\b/i, "cliche ('a testament to')"],
  [/\bplays? a (?:crucial|vital|pivotal|key|significant) role\b/i, "cliche ('plays a key role')"],
  [/\bnavigat(?:e|ing) the\b/i, "cliche ('navigating the ...')"],
  [/\b(?:harness|unlock)(?:ing)? the (?:power|potential|secrets)\b/i, "cliche ('unlock the power')"],
  [/\btake(?:s|n)? it to the next level\b/i, "cliche ('to the next level')"],
  [/\bbest of both worlds\b/i, "cliche ('best of both worlds')"],
  [/\bneedle in a haystack\b/i, "cliche ('needle in a haystack')"],
  [/\bgone are the days\b/i, "cliche ('gone are the days')"],
  [/\brest assured\b/i, "cliche ('rest assured')"],
  [/\blook no further\b/i, "cliche ('look no further')"],
  [/\bwithout further ado\b/i, "cliche ('without further ado')"],
  [/\bsay goodbye to\b/i, "cliche ('say goodbye to')"],
  [/\bwhether you'?re an?\b[^.?!]*\bor an?\b/i, "cliche ('whether you're a X or a Y')"],
  [/\bthat being said\b/i, "filler ('that being said')"],
];

function lineOf(text, idx) {
  return text.slice(0, idx).split('\n').length;
}

function findWarnings(text) {
  const out = [];
  const lines = text.split('\n');

  for (const [w, sug] of BANNED) {
    const esc = w.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&');
    const re = new RegExp('\\b' + esc + '\\b', 'i');
    lines.forEach((ln, i) => {
      if (re.test(ln)) out.push({ line: i + 1, label: w, kind: 'word', suggest: sug });
    });
  }

  for (const [re, label] of PHRASES) {
    const m = text.match(re);
    if (m) out.push({ line: lineOf(text, m.index || 0), label, kind: 'phrase' });
  }

  // robotic rhythm: low variance in sentence length is a strong human-vs-AI signal
  const sents = text.replace(/\n+/g, ' ').split(/(?<=[.!?])\s+/)
    .map(s => s.trim()).filter(s => s.split(/\s+/).length > 2);
  if (sents.length >= 6) {
    const lens = sents.map(s => s.split(/\s+/).length);
    const mean = lens.reduce((a, b) => a + b, 0) / lens.length;
    const sd = Math.sqrt(lens.reduce((a, b) => a + (b - mean) ** 2, 0) / lens.length);
    if (sd < 3.5) {
      out.push({ line: 0, kind: 'rhythm',
        label: 'low sentence-length variance (robotic rhythm, sd=' + sd.toFixed(1) + '); vary sentence length' });
    }
  }

  return out;
}

// Public API used by the PostToolUse hook.
function humanise(text) {
  const r = fixChars(text);
  return { text: r.text, charChanges: r.changes };
}

module.exports = { fixChars, findWarnings, humanise, BANNED, PHRASES };

// ---- CLI ------------------------------------------------------------------

function readInput(file) {
  if (file) return Promise.resolve(fs.readFileSync(file, 'utf8'));
  return new Promise(res => {
    let d = '';
    process.stdin.on('data', c => (d += c));
    process.stdin.on('end', () => res(d));
  });
}

function report(changes, warns, tag, stream) {
  stream.write('\nhumanise: ' + tag + '\n');
  stream.write('  char-tells fixed: ' + changes + '\n');
  const words = warns.filter(w => w.kind === 'word');
  const phrases = warns.filter(w => w.kind === 'phrase');
  const rhythm = warns.filter(w => w.kind === 'rhythm');
  if (words.length) {
    stream.write('  AI words to review (' + words.length + '):\n');
    for (const w of words) stream.write('    L' + w.line + '  ' + w.label + '  ->  ' + w.suggest + '\n');
  }
  if (phrases.length) {
    stream.write('  cliche patterns (' + phrases.length + '):\n');
    for (const p of phrases) stream.write('    L' + p.line + '  ' + p.label + '\n');
  }
  for (const r of rhythm) stream.write('  rhythm: ' + r.label + '\n');
  if (!warns.length && changes === 0) stream.write('  clean - no AI tells found.\n');
}

function run() {
  const args = process.argv.slice(2);
  const fix = args.includes('--fix');
  const toStdout = args.includes('--stdout');
  const file = args.find(a => !a.startsWith('--'));

  readInput(file).then(text => {
    const res = fix ? fixChars(text) : { text, changes: 0 };
    const warns = findWarnings(res.text);

    if (!file) {
      // stdin mode: fixed text to stdout, report to stderr
      process.stdout.write(res.text);
      report(res.changes, warns, '(stdin)', process.stderr);
      return;
    }
    if (fix && toStdout) {
      process.stdout.write(res.text);
      report(res.changes, warns, file, process.stderr);
      return;
    }
    if (fix && res.changes > 0) fs.writeFileSync(file, res.text);
    report(res.changes, warns, file, process.stdout);
  }).catch(err => {
    process.stderr.write('humanise-lint error: ' + err.message + '\n');
    process.exit(1);
  });
}

if (require.main === module) run();
