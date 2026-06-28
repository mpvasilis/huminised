'use strict';
// Reads the humanise on/off flag. Mirrors the caveman flag-file pattern.
// Flag lives at ~/.claude/.humanise-active and contains "on" or "off".
// Default is "off" so the plugin is inert until the user opts in with /humanise on.

const fs = require('fs');
const path = require('path');
const os = require('os');

const flagPath = path.join(os.homedir(), '.claude', '.humanise-active');

function getMode() {
  try {
    const v = fs.readFileSync(flagPath, 'utf8').trim().toLowerCase();
    return v === 'on' ? 'on' : 'off';
  } catch (e) {
    return 'off';
  }
}

function setMode(mode) {
  const v = mode === 'on' ? 'on' : 'off';
  fs.mkdirSync(path.dirname(flagPath), { recursive: true });
  fs.writeFileSync(flagPath, v);
  return v;
}

module.exports = { getMode, setMode, flagPath };
