#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const gameDir = __dirname;
const stamp = Math.floor(Date.now() / 1000);

function backup(filePath) {
  fs.copyFileSync(filePath, `${filePath}.bak.${stamp}`);
}

console.log(`Patching Earth Simulator Demo in: ${gameDir}`);

// 1. Trap setInterval/setTimeout at the end of units.js (runs right before demo.bin)
const unitsPath = path.join(gameDir, 'units.js');
if (!fs.existsSync(unitsPath)) {
  console.error('[ERR] units.js not found!');
  process.exit(1);
}
let unitsCode = fs.readFileSync(unitsPath, 'utf8');
if (!unitsCode.includes('__origSetInterval')) {
  backup(unitsPath);
  const trapSnippet = [
    '',
    '// Trap demo.bin timers before demo.bin runs',
    'window.__origSetInterval = window.setInterval;',
    'window.__origSetTimeout = window.setTimeout;',
    'window.setInterval = function() { return 0; };',
    'window.setTimeout = function() { return 0; };',
    ''
  ].join('\n');
  fs.writeFileSync(unitsPath, unitsCode + trapSnippet, 'utf8');
  console.log('[OK] Patched units.js (timer trap)');
} else {
  console.log('[SKIP] units.js already patched');
}

// 2. Restore real timers, override demo globals, unlock DLCs, and hide countdown HUD via pure CSS in modboot.js
const modbootPath = path.join(gameDir, 'modboot.js');
if (!fs.existsSync(modbootPath)) {
  console.error('[ERR] modboot.js not found!');
  process.exit(1);
}
let modbootCode = fs.readFileSync(modbootPath, 'utf8');
if (!modbootCode.includes('__demoCleanCss')) {
  backup(modbootPath);
  const headSnippet = [
    'if (window.__origSetInterval) { window.setInterval = window.__origSetInterval; delete window.__origSetInterval; }',
    'if (window.__origSetTimeout) { window.setTimeout = window.__origSetTimeout; delete window.__origSetTimeout; }',
    'window.demoOn = function() { return false; };',
    'window.demoOver = function() { return false; };',
    'window.demoLeft = function() { return 999999999; };',
    'window.GAME_DEMO = null;',
    '(function() {',
    '  const unlockDlc = () => {',
    '    if (typeof DLC !== "undefined" && typeof DLC_APPS !== "undefined") {',
    '      DLC.test = DLC.test || {};',
    '      for (const k of Object.keys(DLC_APPS)) DLC.test[k] = true;',
    '      if (typeof dlcRefresh === "function") dlcRefresh();',
    '      return true;',
    '    }',
    '    return false;',
    '  };',
    '  if (!unlockDlc()) {',
    '    const t = setInterval(() => { if (unlockDlc()) clearInterval(t); }, 100);',
    '  }',
    "  if (document.getElementById('__demoCleanCss')) return;",
    "  const st = document.createElement('style');",
    "  st.id = '__demoCleanCss';",
    "  st.textContent = '.demo-chip, #demo-end, .mm-demo-left, .demo-buy, .ach-demo { display: none !important; }';",
    '  (document.head || document.documentElement).appendChild(st);',
    '})();',
    ''
  ].join('\n');
  fs.writeFileSync(modbootPath, headSnippet + modbootCode, 'utf8');
  console.log('[OK] Patched modboot.js (globals + DLC unlock + pure CSS hide)');
} else {
  console.log('[SKIP] modboot.js already patched');
}

// 3. Disable demoMenuPatch, demoMenuRefresh, and demoFlush calls in menu.js
const menuPath = path.join(gameDir, 'menu.js');
if (!fs.existsSync(menuPath)) {
  console.error('[ERR] menu.js not found!');
  process.exit(1);
}
let menuCode = fs.readFileSync(menuPath, 'utf8');
const menuRegex = /(?<!false && )typeof (demoMenuPatch|demoMenuRefresh|demoFlush)/g;
if (menuRegex.test(menuCode)) {
  backup(menuPath);
  menuCode = menuCode.replace(menuRegex, 'false && typeof $1');
  fs.writeFileSync(menuPath, menuCode, 'utf8');
  console.log('[OK] Patched menu.js');
} else {
  console.log('[SKIP] menu.js already patched');
}

console.log('Done! Countdown HUD, demo timers, menu patches, and DLC locks are disabled.');
