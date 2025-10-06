#!/bin/bash
# =====================================================
# VlifeVR Quick Deploy Script (jq-free version)
# Author: Chris Burley
# =====================================================

set -e
echo "🚀 Starting VlifeVR auto-deploy..."

# Pull latest repo updates
echo "🔄 Pulling latest repo updates..."
git pull origin main

IMG="assets/neon_metropolis_360_equirectangular.jpg"
JSON="assets/media.json"

# Check that the image exists
if [ ! -f "$IMG" ]; then
  echo "⚠️  Missing $IMG"
  exit 1
fi

# Ensure JSON exists
if [ ! -f "$JSON" ]; then
  echo "⚠️  media.json not found — creating new..."
  echo '{ "skins": [] }' > "$JSON"
fi

# Add the Neon Metropolis 360 entry if not already present
if ! grep -q "Neon Metropolis 360" "$JSON"; then
  echo "✨ Adding Neon Metropolis 360 entry to media.json..."
  TMP=$(mktemp)
  cat > "$TMP" <<'EOF'
{
  "skins": [
    {
      "name": "Neon Metropolis 360",
      "img": "assets/neon_metropolis_360_equirectangular.jpg",
      "fallback": "#0a0d14",
      "ambient": "#aaccff",
      "ambInt": 0.45,
      "keyInt": 0.9,
      "audio": { "src": "assets/city.mp3", "volume": 0.5 }
    }
  ]
}
EOF

  # merge by simple concatenation
  sed -i 's/]}$//' "$TMP"
  sed -i '1s/^{\s*"skins":\s*\[//' "$JSON"
  echo "," >> "$TMP"
  cat "$JSON" >> "$TMP"
  echo "]}" >> "$TMP"
  mv "$TMP" "$JSON"
else
  echo "✅ Neon Metropolis 360 already exists in media.json"
fi

# Commit and push
echo "📦 Committing and pushing changes..."
git add "$JSON" "$IMG"
git commit -m "Add Neon Metropolis 360 background"
git push origin main

echo "✅ Deployment complete!"
echo "🌐 Check your live site:"
echo "https://chrisburley01.github.io/VlifeVR-demo/"
