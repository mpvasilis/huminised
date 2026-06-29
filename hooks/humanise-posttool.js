#!/usr/bin/env node
'use strict';
// PostToolUse hook for Write|Edit|MultiEdit.
// When humanise is "on", deterministically cleans AI char-tells from the file
// that was just written, then reports any AI words/phrases left for review.
// Only touches prose files (.md/.markdown/.mdx/.txt) so code is never mangled.

const fs = require('fs');
const { isActive } = require('./humanise-config');
const { humanise, findWarnings } = require('./humanise-lint');

let input = '';
process.stdin.on('data', d => (input += d));
process.stdin.on('end', () => {
  if (!isActive()) process.exit(0);

  let fp;
  try {
    const j = JSON.parse(input);
    const ti = j.tool_input || {};
    fp = ti.file_path || ti.path;
  } catch (e) { process.exit(0); }

  if (!fp || !/\.(md|markdown|mdx|txt)$/i.test(fp)) process.exit(0);

  let text;
  try { text = fs.readFileSync(fp, 'utf8'); } catch (e) { process.exit(0); }

  const { text: fixed, charChanges } = humanise(text);
  if (charChanges > 0) {
    try { fs.writeFileSync(fp, fixed); } catch (e) { /* best effort */ }
  }

  const warns = findWarnings(fixed).filter(w => w.kind !== 'rhythm');
  if (charChanges > 0 || warns.length) {
    const flags = warns.slice(0, 10).map(w => w.label).join(', ');
    const msg = 'humanise cleaned ' + charChanges + ' AI char-tell(s) in ' + fp +
      (warns.length ? '. Review these AI words/phrases: ' + flags : '') + '.';
    // Feed back to Claude as PostToolUse context.
    process.stdout.write(JSON.stringify({
      hookSpecificOutput: { hookEventName: 'PostToolUse', additionalContext: msg }
    }));
  }
  process.exit(0);
});
