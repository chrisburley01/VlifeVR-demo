#!/usr/bin/env bash
# VlifeVR quick deploy (jq-free)
set -e

echo "🚀 VlifeVR deploy starting…"

# 1) Sanity checks
[ -f "index.html" ] || { echo "❌ Run from the repo root (index.html not found)."; exit 1; }
[ -f "assets/media.json" ] || { echo "❌ assets/media.json missing."; exit 1; }

# 2) Normalize media.json key for current HTML
#    (If media.json uses "backgrounds", convert to "skins" so existing HTML reads it.)
if grep -q '"backgrounds"' assets/media.json; then
  echo "🛠  Converting media.json key: backgrounds → skins"
  # only replace the top-level key occurrence
  sed -i '0,/"backgrounds"[[:space:]]*:/s//"skins":/' assets/media.json
fi

# 3) Helpful warnings about referenced files
if grep -q 'neon_metropolis_360_equirectangular.jpg' assets/media.json && [ ! -f "assets/neon_metropolis_360_equirectangular.jpg" ]; then
  echo "⚠️  neon_metropolis_360_equirectangular.jpg referenced but not found in /assets/"
fi
if grep -q 'subway_entrance_4k.exr' assets/media.json && [ ! -f "assets/subway_entrance_4k.exr" ]; then
  echo "⚠️  subway_entrance_4k.exr referenced but not found in /assets/"
fi

# 4) Optional cache-bust the neon JPG reference (append ?v=timestamp if not present)
TS=$(date +%s)
if grep -q 'neon_metropolis_360_equirectangular.jpg' assets/media.json && ! grep -q 'neon_metropolis_360_equirectangular.jpg?v=' assets/media.json; then
  echo "🔁 Appending cache-buster to neon image reference"
  sed -i "s#neon_metropolis_360_equirectangular.jpg#neon_metropolis_360_equirectangular.jpg?v=${TS}#g" assets/media.json
fi

# 5) Pull latest, commit, push
echo "🔄 git pull"
git pull origin main

echo "📦 Staging files…"
git add index.html assets/media.json assets/* || true

echo "📝 Commit…"
git commit -m "Deploy: update media.json / assets (EXR + 360 skins)" || echo "ℹ️ Nothing to commit."

echo "⬆️  Push…"
git push origin main

echo "✅ Done. Pages will redeploy automatically."
echo "🌐 https://chrisburley01.github.io/VlifeVR-demo/"
