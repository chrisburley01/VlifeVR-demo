#!/usr/bin/env bash
# =========================================
# VLifeVR Demo Deployment Script
# =========================================
# Automates commits + GitHub Pages publish
# Live URL:
#   https://chrisburley01.github.io/VlifeVR-demo/
# =========================================

set -e  # stop if any command fails

# 1️⃣ Check current branch
BRANCH=$(git branch --show-current)
echo "📦 Deploying branch: $BRANCH"

# 2️⃣ Verify required files
echo "🧩 Checking for core files..."
for f in index.html assets/media.json; do
  if [[ ! -f "$f" ]]; then
    echo "❌ Missing: $f"
    exit 1
  fi
done
echo "✅ Files found."

# 3️⃣ Stage changes (only key file types)
echo "📝 Adding HTML, JSON, and JPG/PNG files..."
git add *.html *.json assets/*.jpg assets/*.png || true

# 4️⃣ Commit with timestamp
COMMIT_MSG="Auto-deploy $(date '+%Y-%m-%d %H:%M:%S')"
git commit -m "$COMMIT_MSG" || echo "⚠️ No new changes to commit."

# 5️⃣ Push to main branch
echo "🚀 Pushing to main..."
git push origin "$BRANCH"

# 6️⃣ Deploy to GitHub Pages
echo "🌐 Publishing to GitHub Pages..."
if git rev-parse --verify gh-pages >/dev/null 2>&1; then
  git subtree push --prefix . origin gh-pages
else
  echo "⚙️ Creating gh-pages branch for first deployment..."
  git push origin `git subtree split --prefix . "$BRANCH"`:gh-pages --force
fi

# 7️⃣ Done!
echo "✅ Deployment complete!"
echo "🌍 Live at: https://chrisburley01.github.io/VlifeVR-demo/"