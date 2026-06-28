#!/usr/bin/env node
'use strict';
// Tiny CLI used by the /humanise slash command to flip the on/off flag.
//   node humanise-cli.js on       -> turn on
//   node humanise-cli.js off      -> turn off
//   node humanise-cli.js status   -> report current state
//   node humanise-cli.js          -> defaults to "on"

const { getMode, setMode } = require('./humanise-config');

const arg = (process.argv[2] || 'on').toLowerCase();

if (arg === 'status') {
  process.stdout.write('humanise is ' + getMode().toUpperCase());
} else if (arg === 'on') {
  setMode('on');
  process.stdout.write('humanise is ON (file auto-clean active now; apply the writing rules to prose this session)');
} else if (arg === 'off') {
  setMode('off');
  process.stdout.write('humanise is OFF (write normally)');
} else {
  process.stdout.write('humanise: unknown arg "' + arg + '". Use: on | off | status');
}
