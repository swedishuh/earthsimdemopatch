#!/usr/bin/env bash
set -euo pipefail

GAME_DIR="$(cd "$(dirname "${BASH_SOURCE}")" && pwd)"
cd "$GAME_DIR"

echo "Patching Earth Simulator Demo in: $GAME_DIR"

# 1. Trap setInterval/setTimeout at the end of units.js (runs right before demo.bin)
if [ -f "units.js" ]; then
  if ! grep -q "__origSetInterval" units.js; then
    cp units.js "units.js.bak.$(date +%s)"
    cat << 'JSEOF' >> units.js

// Trap demo.bin timers before demo.bin runs
window.__origSetInterval = window.setInterval;
window.__origSetTimeout = window.setTimeout;
window.setInterval = function() { return 0; };
window.setTimeout = function() { return 0; };
JSEOF
    echo "[OK] Patched units.js (timer trap)"
  else
    echo "[SKIP] units.js already patched"
  fi
else
  echo "[ERR] units.js not found!"
  exit 1
fi

# 2. Restore real timers, override demo globals, and hide countdown HUD via pure CSS in modboot.js
if [ -f "modboot.js" ]; then
  if ! grep -q "__demoCleanCss" modboot.js; then
    cp modboot.js "modboot.js.bak.$(date +%s)"
    cat << 'JSEOF' > /tmp/modboot_head.js
if (window.__origSetInterval) { window.setInterval = window.__origSetInterval; delete window.__origSetInterval; }
if (window.__origSetTimeout) { window.setTimeout = window.__origSetTimeout; delete window.__origSetTimeout; }
window.demoOn = function() { return false; };
window.demoOver = function() { return false; };
window.demoLeft = function() { return 999999999; };
window.GAME_DEMO = null;
(function() {
  if (document.getElementById('__demoCleanCss')) return;
  const st = document.createElement('style');
  st.id = '__demoCleanCss';
  st.textContent = '.demo-chip, #demo-end, .mm-demo-left, .demo-buy, .ach-demo { display: none !important; }';
  (document.head || document.documentElement).appendChild(st);
})();
JSEOF
    cat /tmp/modboot_head.js modboot.js > /tmp/modboot_new.js
    mv /tmp/modboot_new.js modboot.js
    rm -f /tmp/modboot_head.js
    echo "[OK] Patched modboot.js (globals + pure CSS hide)"
  else
    echo "[SKIP] modboot.js already patched"
  fi
else
  echo "[ERR] modboot.js not found!"
  exit 1
fi

# 3. Disable demoMenuPatch, demoMenuRefresh, and demoFlush calls in menu.js
if [ -f "menu.js" ]; then
  if grep -qE "typeof demo(MenuPatch|MenuRefresh|Flush)" menu.js && ! grep -qE "false && typeof demo(MenuPatch|MenuRefresh|Flush)" menu.js; then
    cp menu.js "menu.js.bak.$(date +%s)"
    sed -i 's/typeof demoMenuPatch/false \&\& typeof demoMenuPatch/g; s/typeof demoMenuRefresh/false \&\& typeof demoMenuRefresh/g; s/typeof demoFlush/false \&\& typeof demoFlush/g' menu.js
    echo "[OK] Patched menu.js"
  else
    echo "[SKIP] menu.js already patched"
  fi
else
  echo "[ERR] menu.js not found!"
  exit 1
fi

echo "Done! Countdown HUD, demo timers, and menu patches are disabled."
