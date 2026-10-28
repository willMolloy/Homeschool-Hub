#!/usr/bin/env bash
# Regenerate public/icons/*.png from public/icon.svg using headless Chrome.
#   CHROME=/path/to/chrome apps/web/scripts/make-icons.sh
# "any" icons are the SVG as-is. Maskable + apple-touch put the artwork in the
# central 80% on a full-bleed brand background (Android crops to a circle/squircle,
# iOS fills transparency with black and rounds corners itself).
set -euo pipefail
cd "$(dirname "$0")/.."
CHROME="${CHROME:-$(command -v google-chrome || command -v chromium || command -v chromium-browser)}"
SVG="$(cat public/icon.svg)"
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT

render() { # name size mode(any|full)
  local name=$1 size=$2 mode=$3 inner
  if [ "$mode" = full ]; then inner=$((size * 80 / 100)); else inner=$size; fi
  cat > "$TMP/$name.html" <<HTML
<!doctype html><html><head><style>
html,body{margin:0;width:${size}px;height:${size}px;overflow:hidden;background:$([ "$mode" = full ] && echo '#1f3a5f' || echo transparent)}
body{display:flex;align-items:center;justify-content:center}
svg{width:${inner}px;height:${inner}px;display:block}
</style></head><body>${SVG}</body></html>
HTML
  "$CHROME" --headless=new --no-sandbox --disable-gpu --hide-scrollbars --default-background-color=00000000 \
    --window-size="${size},${size}" --screenshot="public/icons/$name.png" "file://$TMP/$name.html" >/dev/null 2>&1
  echo "public/icons/$name.png"
}

render icon-192 192 any
render icon-512 512 any
render icon-maskable-512 512 full
render apple-touch-icon 180 full
