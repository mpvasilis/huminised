#!/usr/bin/env node
'use strict';
// Tiny CLI used by the /humanise slash command to set the level.
//   node humanise-cli.js light    -> light touch (default if no arg)
//   node humanise-cli.js full     -> stronger pass
//   node humanise-cli.js off      -> turn off
//   node humanise-cli.js on       -> alias for full (back-compat)
//   node humanise-cli.js status   -> report current level

const { getMode, setMode } = require('./humanise-config');

const arg = (process.argv[2] || 'light').toLowerCase();

if (arg === 'status') {
  process.stdout.write('humanise is ' + getMode().toUpperCase());
} else if (['off', 'light', 'full', 'on'].includes(arg)) {
  const v = setMode(arg);
  if (v === 'off') {
    process.stdout.write('humanise is OFF (write normally)');
  } else if (v === 'light') {
    process.stdout.write('humanise is LIGHT (active now; fix tells but keep wording, structure, and meaning)');
  } else {
    process.stdout.write('humanise is FULL (active now; stronger pass, still keep all meaning)');
  }
} else {
  process.stdout.write('humanise: unknown arg "' + arg + '". Use: light | full | off | status');
}
