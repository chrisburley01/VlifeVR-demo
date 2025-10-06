#!/bin/bash
# VlifeVR quick deploy (jq-free)
set -e

echo "🔄 Pulling latest..."
git pull origin main

# sanity checks
[ -f "index.html" ] || { echo "❌ Run from repo root."; exit 1; }
[ -f "assets/media.json" ] || { echo "❌ assets/media.json missing."; exit 1; }

# optional: warn if neon JPG is missing
if grep -q "neon_metropolis_360_equirectangular.jpg" assets/media.json && [ ! -f "assets/neon_metropolis_360_equirectangular.jpg" ]; then
  echo "⚠️  Note: neon_metropolis_360_equirectangular.jpg referenced but not found in /assets/"
fi

# optional: warn if EXR missing
if grep -q "subway_entrance_4k.exr" assets/media.json && [ ! -f "subway_entrance_4k.exr" ]; then
  echo "⚠️  Note: subway_entrance_4k.exr referenced but not found at repo root"
fi

echo "📦 Committing changes..."
git add index.html assets/media.json assets/* *.exr || true
git commit -m "Update VlifeVR: skins & HDR support" || echo "ℹ️ Nothing to commit."
git push origin main
echo "✅ Done. Visit: https://chrisburley01.github.io/VlifeVR-demo/"
