#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const gameDir = __dirname;
const stamp = Math.floor(Date.now() / 1000);

function backup(filePath) {
  fs.copyFileSync(filePath, `${filePath}.bak.${stamp}`);
}

console.log(`Patching Earth Simulator DLCs in: ${gameDir}`);

const modbootPath = path.join(gameDir, 'modboot.js');
if (!fs.existsSync(modbootPath)) {
  console.error('[ERR] modboot.js not found!');
  process.exit(1);
}

let modbootCode = fs.readFileSync(modbootPath, 'utf8');
if (!modbootCode.includes('__dlcAutoUnlock')) {
  backup(modbootPath);
  const dlcHook = [
    '',
    '// __dlcAutoUnlock: run DLC.test override on startup + bind F12 DevTools',
    '(function() {',
    '  const payload = `',
    '    if (typeof DLC !== "undefined" && typeof DLC_APPS !== "undefined") {',
    '      DLC.test = Object.fromEntries(Object.keys(DLC_APPS).map(k => [k, true]));',
    '      if (typeof dlcRefresh === "function") dlcRefresh();',
    '    }',
    '  `;',
    '  const applyUnlock = () => {',
    '    try {',
    '      if (typeof nw !== "undefined" && nw.Window) {',
    '        nw.Window.get().eval(null, payload);',
    '      } else {',
    '        (0, eval)(payload);',
    '      }',
    '    } catch (e) {}',
    '  };',
    '  window.addEventListener("load", applyUnlock);',
    '  window.addEventListener("keydown", (e) => {',
    '    if (e.key === "F12" && typeof nw !== "undefined" && nw.Window) {',
    '      nw.Window.get().showDevTools();',
    '    }',
    '  });',
    '})();',
    ''
  ].join('\n');
  fs.writeFileSync(modbootPath, modbootCode + dlcHook, 'utf8');
  console.log('[OK] Patched modboot.js (startup DLC unlock + F12 DevTools)');
} else {
  console.log('[SKIP] modboot.js already has DLC unlock patch');
}

console.log('Done! All DLCs will auto-unlock on launch.');
