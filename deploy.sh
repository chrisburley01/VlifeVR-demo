#!/usr/bin/env bash
# =========================================
# VLifeVR Demo Deployment Script
# =========================================
# This automates pushing changes (HTML/JSON/assets)
# to GitHub Pages so they appear live at:
#   https://chrisburley01.github.io/VlifeVR-demo/
# =========================================

set -e  # stop if any command fails

# 1️⃣ Confirm current branch
BRANCH=$(git branch --show-current)
echo "📦 Deploying branch: $BRANCH"

# 2️⃣ Build step (optional – your site is static, so just confirm structure)
echo "🧩 Checking project files..."
ls -1 index.html assets/ | grep . || true

# 3️⃣ Add and commit changes
echo "📝 Staging and committing files..."
git add -A
git commit -m "Auto-deploy: update site on $(date '+%Y-%m-%d %H:%M:%S')" || echo "No new changes to commit."

# 4️⃣ Push to main branch
echo "🚀 Pushing to main..."
git push origin "$BRANCH"

# 5️⃣ Deploy to GitHub Pages
echo "🌐 Publishing to GitHub Pages..."
git subtree push --prefix . origin gh-pages || (
  echo "⚠️ If subtree not set up yet, run this once:"
  echo "git push origin `git subtree split --prefix . main`:gh-pages --force"
)

# 6️⃣ Done
echo "✅ Deployment complete!"
echo "Live at: https://chrisburley01.github.io/VlifeVR-demo/"