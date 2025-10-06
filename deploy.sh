#!/bin/bash
# =====================================================
# VlifeVR Quick Deploy Script
# Author: Chris Burley (Vlife VR)
# Purpose: Automate asset and JSON updates for GitHub
# =====================================================

echo "🚀 Starting VlifeVR auto-deploy..."

# Stop if something fails
set -e

# Pull latest repo changes
echo "🔄 Pulling latest repo updates..."
git pull origin main

# Check for new assets
if [ ! -f "assets/neon_metropolis_360_equirectangular.jpg" ]; then
  echo "⚠️  Neon image not found in /assets/. Please upload it first."
  exit 1
fi

# Ensure JSON file exists
if [ ! -f "assets/media.json" ]; then
  echo "⚠️  media.json not found. Creating a new one..."
  echo '{
  "skins": []
}' > assets/media.json
fi

# Inject new skin entry (only if not already there)
if ! grep -q "Neon Metropolis 360" assets/media.json; then
  echo "✨ Adding Neon Metropolis 360 entry to media.json..."
  tmp=$(mktemp)
  jq '.skins += [{
    "name": "Neon Metropolis 360",
    "img": "assets/neon_metropolis_360_equirectangular.jpg",
    "fallback": "#0a0d14",
    "ambient": "#aaccff",
    "ambInt": 0.45,
    "keyInt": 0.9,
    "audio": { "src": "assets/city.mp3", "volume": 0.5 }
  }]' assets/media.json > "$tmp" && mv "$tmp" assets/media.json
else
  echo "✅ Neon Metropolis 360 already listed in media.json."
fi

# Commit and push
echo "📦 Committing and pushing changes..."
git add assets/media.json assets/neon_metropolis_360_equirectangular.jpg
git commit -m 'Add Neon Metropolis 360 VR background skin'
git push origin main

echo "✅ Deploy complete! Check your site at:"
echo "🌐 https://chrisburley01.github.io/VlifeVR-demo/"
