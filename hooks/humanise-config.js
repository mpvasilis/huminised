'use strict';
// Reads the humanise level flag. Mirrors the caveman flag-file pattern.
// Flag lives at ~/.claude/.humanise-active and contains "off", "light", or "full".
// Default is "off" so the plugin is inert until the user opts in.
//
// Back-compat: an old flag value of "on" is read as "full".

const fs = require('fs');
const path = require('path');
const os = require('os');

const flagPath = path.join(os.homedir(), '.claude', '.humanise-active');

function normalize(v) {
  v = (v || '').toString().trim().toLowerCase();
  if (v === '' || v === 'off' || v === 'false' || v === '0' || v === 'none') return 'off';
  if (v === 'light') return 'light';
  // "full", "on", "true", or anything else truthy -> full
  return 'full';
}

// Returns 'off' | 'light' | 'full'
function getMode() {
  try {
    return normalize(fs.readFileSync(flagPath, 'utf8'));
  } catch (e) {
    return 'off';
  }
}

function isActive() {
  return getMode() !== 'off';
}

function setMode(mode) {
  const v = normalize(mode);
  fs.mkdirSync(path.dirname(flagPath), { recursive: true });
  fs.writeFileSync(flagPath, v);
  return v;
}

module.exports = { getMode, isActive, setMode, flagPath };
