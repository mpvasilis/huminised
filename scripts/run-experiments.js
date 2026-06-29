#!/usr/bin/env node
'use strict';
/*
 Runs the humanise experiments and writes a self-contained HTML report.

   node scripts/run-experiments.js

 Outputs:
   report/index.html    visual report
   report/results.json   raw numbers

 Two experiment groups:
   1. Prose genres: raw (LLM-style) vs steered (human rewrite). Measures char-tells,
      AI words, cliche phrases, word count, sentence-length variance.
   2. Code safety: runs the actual PostToolUse hook over code files and a markdown
      doc with code, asserting code bytes are never altered.
*/

const fs = require('fs');
const path = require('path');
const os = require('os');
const { execFileSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const lint = require(path.join(ROOT, 'hooks', 'humanise-lint'));
const cfg = require(path.join(ROOT, 'hooks', 'humanise-config'));
const NODE = process.execPath;
const EXP = path.join(ROOT, 'experiments');

// ---- metrics ---------------------------------------------------------------

const EMOJI_RE = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{2B00}-\u{2BFF}\u{FE00}-\u{FE0F}]/gu;

function charTells(t) {
  return (t.match(/[–—‘’“”…]/g) || []).length
    + (t.match(EMOJI_RE) || []).length;
}
function sentenceSd(t) {
  const sents = t.replace(/\n+/g, ' ').split(/(?<=[.!?])\s+/)
    .map(s => s.trim()).filter(s => s.split(/\s+/).length > 2);
  if (sents.length < 2) return 0;
  const lens = sents.map(s => s.split(/\s+/).length);
  const mean = lens.reduce((a, b) => a + b, 0) / lens.length;
  return Math.sqrt(lens.reduce((a, b) => a + (b - mean) ** 2, 0) / lens.length);
}
function wordCount(t) {
  return (t.trim().match(/\S+/g) || []).length;
}
function stats(t) {
  const w = lint.findWarnings(t);
  return {
    chars: charTells(t),
    words: w.filter(x => x.kind === 'word').length,
    cliches: w.filter(x => x.kind === 'phrase').length,
    wc: wordCount(t),
    sd: +sentenceSd(t).toFixed(1),
  };
}

// ---- group 1: prose genres -------------------------------------------------

const GENRES = [
  ['marketing', 'Marketing landing copy'],
  ['techblog', 'Technical blog intro'],
  ['coldemail', 'Cold outreach email'],
  ['changelog', 'Product changelog'],
];

const prose = GENRES.map(([key, title]) => {
  const raw = fs.readFileSync(path.join(EXP, key + '.raw.md'), 'utf8');
  const human = fs.readFileSync(path.join(EXP, key + '.human.md'), 'utf8');
  const layer1 = lint.fixChars(raw).text; // deterministic auto-fix (chars only)
  return {
    key, title,
    raw: { text: raw, ...stats(raw) },
    layer1Chars: charTells(layer1), // proves chars go to 0 automatically
    steered: { text: human, ...stats(human) },
  };
});

// ---- group 2: code safety (runs the real hook) -----------------------------

const CODE_FILES = ['code/snippet.js', 'code/snippet.py', 'code/config.ts', 'code/doc-with-code.md'];
// substrings that must survive byte-for-byte (they live inside code)
const MUST_SURVIVE = {
  'code/snippet.js': ['Pricing tiers — this', '5 seats — billed monthly', '“priority support” 🚀', '${a}–${b}'],
  'code/snippet.py': ['short…', '✅ done', '10–20 items', 'f"“{name}”"'],
  'code/config.ts': ['"—"', '“rounded”', '"…"', '🚀'],
  'code/doc-with-code.md': ['10–20 — keep this exactly', 'don’t break — me', '`a—b "c"`'],
};

const tmp = path.join(os.tmpdir(), 'humanise-exp');
fs.mkdirSync(tmp, { recursive: true });

const prevMode = cfg.getMode();
const code = [];
try {
  cfg.setMode('full'); // hook only acts when active
  for (const rel of CODE_FILES) {
    const src = path.join(EXP, rel);
    const dst = path.join(tmp, path.basename(rel));
    fs.copyFileSync(src, dst);
    const before = fs.readFileSync(dst, 'utf8');
    execFileSync(NODE, [path.join(ROOT, 'hooks', 'humanise-posttool.js')],
      { input: JSON.stringify({ tool_name: 'Write', tool_input: { file_path: dst } }) });
    const after = fs.readFileSync(dst, 'utf8');

    const isProseDoc = rel.endsWith('doc-with-code.md');
    const codeIntact = MUST_SURVIVE[rel].every(s => after.includes(s));
    // for pure code files the whole file must be unchanged; for the doc, only code parts
    const fileUnchanged = after === before;
    const proseCleaned = isProseDoc && /prose sentence, with its em dash, should/.test(after);

    code.push({
      file: rel,
      kind: isProseDoc ? 'markdown w/ code' : 'code file',
      codeIntact,
      fileUnchanged,
      proseCleaned: isProseDoc ? proseCleaned : null,
      pass: isProseDoc ? (codeIntact && proseCleaned) : (fileUnchanged && codeIntact),
    });
  }
} finally {
  cfg.setMode(prevMode); // restore caller's flag (off | light | full)
}

// ---- totals ----------------------------------------------------------------

const sum = (arr, sel) => arr.reduce((a, x) => a + sel(x), 0);
const totals = {
  rawChars: sum(prose, p => p.raw.chars),
  rawWords: sum(prose, p => p.raw.words),
  rawCliches: sum(prose, p => p.raw.cliches),
  steeredChars: sum(prose, p => p.steered.chars),
  steeredWords: sum(prose, p => p.steered.words),
  steeredCliches: sum(prose, p => p.steered.cliches),
  codePass: code.filter(c => c.pass).length,
  codeTotal: code.length,
};

const results = { generatedAt: new Date().toISOString().slice(0, 10), prose, code, totals };
fs.mkdirSync(path.join(ROOT, 'report'), { recursive: true });
fs.writeFileSync(path.join(ROOT, 'report', 'results.json'), JSON.stringify(results, null, 2));

// ---- HTML rendering --------------------------------------------------------

const esc = s => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

const BANNED_WORDS = lint.BANNED.map(b => b[0]);
function annotate(text) {
  let h = esc(text);
  // highlight char-tells
  h = h.replace(/[–—‘’“”…]/g, m => '<mark class="c">' + m + '</mark>');
  h = h.replace(EMOJI_RE, m => '<mark class="c">' + m + '</mark>');
  // highlight AI words
  for (const w of BANNED_WORDS) {
    const esc2 = w.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&');
    h = h.replace(new RegExp('\\b' + esc2 + '\\b', 'gi'), m => '<mark class="w">' + m + '</mark>');
  }
  return h;
}

function bar(val, max, cls) {
  const pct = max ? Math.round((val / max) * 100) : 0;
  return '<div class="bar"><span class="' + cls + '" style="width:' + pct + '%"></span></div>';
}

const maxChars = Math.max(...prose.map(p => p.raw.chars), 1);
const maxWords = Math.max(...prose.map(p => p.raw.words), 1);

const genreCards = prose.map(p => `
  <section class="card">
    <h3>${esc(p.title)} <span class="key">${p.key}</span></h3>
    <table class="mini">
      <tr><th></th><th>char-tells</th><th>AI words</th><th>clichés</th><th>words</th><th>rhythm (sd)</th></tr>
      <tr class="off"><td>plugin OFF</td><td>${p.raw.chars}</td><td>${p.raw.words}</td><td>${p.raw.cliches}</td><td>${p.raw.wc}</td><td>${p.raw.sd}</td></tr>
      <tr class="mid"><td>layer 1 auto-fix</td><td>${p.layer1Chars}</td><td>${p.raw.words}</td><td>${p.raw.cliches}</td><td>${p.raw.wc}</td><td>${p.raw.sd}</td></tr>
      <tr class="on"><td>plugin ON (steered)</td><td>${p.steered.chars}</td><td>${p.steered.words}</td><td>${p.steered.cliches}</td><td>${p.steered.wc}</td><td>${p.steered.sd}</td></tr>
    </table>
    <div class="cols">
      <div><div class="lbl off">RAW (tells highlighted)</div><pre class="prose">${annotate(p.raw.text)}</pre></div>
      <div><div class="lbl on">STEERED (clean)</div><pre class="prose">${esc(p.steered.text)}</pre></div>
    </div>
  </section>`).join('');

const codeRows = code.map(c => `
    <tr class="${c.pass ? 'pass' : 'fail'}">
      <td><code>${esc(c.file)}</code></td>
      <td>${c.kind}</td>
      <td>${c.codeIntact ? '✔ intact' : '✘ altered'}</td>
      <td>${c.proseCleaned === null ? (c.fileUnchanged ? 'n/a (not touched)' : 'CHANGED') : (c.proseCleaned ? '✔ cleaned' : '✘ missed')}</td>
      <td class="verdict">${c.pass ? 'PASS' : 'FAIL'}</td>
    </tr>`).join('');

const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>humanise — experiment report</title>
<style>
  :root {
    --bg:#0d1117; --panel:#161b22; --line:#30363d; --ink:#e6edf3; --dim:#8b949e;
    --off:#f85149; --on:#3fb950; --mid:#d29922; --accent:#58a6ff;
    --markc:#f8514933; --markw:#d2992233;
  }
  * { box-sizing:border-box; }
  body { margin:0; background:var(--bg); color:var(--ink);
    font:15px/1.6 -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif; }
  .wrap { max-width:1040px; margin:0 auto; padding:40px 24px 80px; }
  h1 { font-size:30px; margin:0 0 4px; }
  h2 { font-size:20px; margin:48px 0 16px; padding-bottom:8px; border-bottom:1px solid var(--line); }
  h3 { font-size:17px; margin:0 0 12px; }
  .sub { color:var(--dim); margin:0 0 8px; }
  .meta { color:var(--dim); font-size:13px; }
  code { font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace; font-size:.9em; }
  .scoreboard { display:grid; grid-template-columns:repeat(3,1fr); gap:16px; margin-top:24px; }
  .stat { background:var(--panel); border:1px solid var(--line); border-radius:10px; padding:18px; }
  .stat .big { font-size:34px; font-weight:700; }
  .stat .big .arrow { color:var(--dim); font-weight:400; font-size:22px; }
  .stat .big .z { color:var(--on); }
  .stat .lab { color:var(--dim); font-size:13px; margin-top:4px; }
  .card { background:var(--panel); border:1px solid var(--line); border-radius:10px; padding:20px; margin:16px 0; }
  .key { color:var(--dim); font-size:12px; font-weight:400; font-family:ui-monospace,monospace; }
  table.mini { width:100%; border-collapse:collapse; font-size:13px; margin-bottom:16px; }
  table.mini th, table.mini td { text-align:center; padding:6px 8px; border-bottom:1px solid var(--line); }
  table.mini td:first-child, table.mini th:first-child { text-align:left; color:var(--dim); }
  tr.off td:first-child { color:var(--off); } tr.on td:first-child { color:var(--on); } tr.mid td:first-child { color:var(--mid); }
  .cols { display:grid; grid-template-columns:1fr 1fr; gap:14px; }
  .lbl { font-size:11px; letter-spacing:.08em; font-weight:700; margin-bottom:6px; }
  .lbl.off { color:var(--off); } .lbl.on { color:var(--on); }
  pre.prose { white-space:pre-wrap; word-wrap:break-word; background:var(--bg); border:1px solid var(--line);
    border-radius:8px; padding:12px; font-size:12.5px; line-height:1.55; margin:0;
    font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace; max-height:340px; overflow:auto; }
  mark.c { background:var(--markc); color:#ffa198; border-radius:3px; padding:0 1px; }
  mark.w { background:var(--markw); color:#e3b341; border-radius:3px; padding:0 1px; }
  table.code { width:100%; border-collapse:collapse; font-size:13px; margin-top:12px; }
  table.code th, table.code td { text-align:left; padding:9px 10px; border-bottom:1px solid var(--line); }
  table.code .verdict { font-weight:700; text-align:center; }
  tr.pass .verdict { color:var(--on); } tr.fail .verdict { color:var(--off); }
  .bar { background:var(--bg); border-radius:4px; height:6px; overflow:hidden; }
  .legend { font-size:12px; color:var(--dim); margin-top:8px; }
  .legend mark { font-size:11px; }
  .foot { margin-top:48px; color:var(--dim); font-size:13px; border-top:1px solid var(--line); padding-top:16px; }
  .pill { display:inline-block; background:var(--on); color:#04260f; font-weight:700; font-size:12px;
    padding:2px 10px; border-radius:20px; }
</style>
</head>
<body>
<div class="wrap">
  <h1>humanise &mdash; experiment report</h1>
  <p class="sub">Measuring LLM &ldquo;tells&rdquo; before and after the plugin, across four writing genres, plus a code-safety audit.</p>
  <p class="meta">Generated ${results.generatedAt} &middot; ${prose.length} prose genres &middot; ${code.length} code fixtures &middot; numbers produced by <code>hooks/humanise-lint.js</code></p>

  <div class="scoreboard">
    <div class="stat"><div class="big">${totals.rawChars}<span class="arrow"> &rarr; </span><span class="z">${totals.steeredChars}</span></div><div class="lab">char-tells (em dashes, smart quotes, ellipses, emojis)</div></div>
    <div class="stat"><div class="big">${totals.rawWords}<span class="arrow"> &rarr; </span><span class="z">${totals.steeredWords}</span></div><div class="lab">AI-overused words flagged</div></div>
    <div class="stat"><div class="big">${totals.rawCliches}<span class="arrow"> &rarr; </span><span class="z">${totals.steeredCliches}</span></div><div class="lab">cliché phrases flagged</div></div>
  </div>
  <p class="legend">Totals across all four genres &middot; left = plugin OFF (raw LLM), right = plugin ON (steered rewrite).</p>

  <h2>1. Prose: raw vs humanised</h2>
  <p class="sub">Each genre starts as typical LLM output, then is rewritten under the humanise rules. Layer 1 (the file hook) zeroes char-tells automatically; Layer 2 (steering) also removes the words and varies the rhythm.</p>
  <p class="legend"><mark class="c">red</mark> = invisible character tell &nbsp; <mark class="w">amber</mark> = AI-overused word</p>
  ${genreCards}

  <h2>2. Code safety <span class="pill">${totals.codePass}/${totals.codeTotal} PASS</span></h2>
  <p class="sub">The PostToolUse hook ran for real over each file. Code files are skipped by extension; markdown keeps its code blocks masked so only prose is cleaned. Em dashes, smart quotes, ellipses and emojis placed inside code must survive byte-for-byte.</p>
  <table class="code">
    <tr><th>file</th><th>type</th><th>code intact?</th><th>prose cleaned?</th><th>verdict</th></tr>
    ${codeRows}
  </table>

  <div class="foot">
    Reproduce: <code>node scripts/run-experiments.js</code> &middot; raw numbers in <code>report/results.json</code><br>
    Honest limits: Layer 1 (characters) is deterministic and guaranteed. Layer 2 (words + rhythm) is steering &mdash; strong, not bulletproof. AI detectors are noisy; the goal is &ldquo;reads human&rdquo;, not &ldquo;beats a detector&rdquo;.
  </div>
</div>
</body>
</html>`;

fs.writeFileSync(path.join(ROOT, 'report', 'index.html'), html);

// ---- console summary -------------------------------------------------------

console.log('Prose totals (OFF -> ON):');
console.log('  char-tells: ' + totals.rawChars + ' -> ' + totals.steeredChars);
console.log('  AI words:   ' + totals.rawWords + ' -> ' + totals.steeredWords);
console.log('  cliches:    ' + totals.rawCliches + ' -> ' + totals.steeredCliches);
console.log('Code safety:  ' + totals.codePass + '/' + totals.codeTotal + ' passed');
for (const c of code) console.log('  ' + (c.pass ? 'PASS' : 'FAIL') + '  ' + c.file);
console.log('\nWrote report/index.html and report/results.json');
if (totals.codePass !== totals.codeTotal) process.exit(1);
