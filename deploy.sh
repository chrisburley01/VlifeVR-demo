#!/usr/bin/env bash
# =========================================
# 🚀 VLifeVR Deployment Script
# =========================================
# Pushes the latest local version of your
# VR demo (HTML, JSON, assets) to GitHub
# Pages for instant publishing.
#
# Repo: chrisburley01/VlifeVR-demo
# Live URL:
#   https://chrisburley01.github.io/VlifeVR-demo/
# =========================================

set -e  # Exit immediately if a command fails

# 1️⃣ Verify Git setup
if ! git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  echo "❌ This folder is not a Git repository."
  echo "Please run: git init && git remote add origin <repo-url>"
  exit 1
fi

# 2️⃣ Identify current branch
BRANCH=$(git branch --show-current)
echo "📦 Deploying branch: $BRANCH"

# 3️⃣ Check essential files exist
echo "🧩 Checking project structure..."
REQUIRED=("index.html" "assets/media.json")
for FILE in "${REQUIRED[@]}"; do
  if [[ ! -f "$FILE" ]]; then
    echo "❌ Missing required file: $FILE"
    exit 1
  fi
done
echo "✅ Core files found."

# 4️⃣ Stage only relevant changes
echo "📝 Adding updates..."
git add *.html *.json assets/*.jpg assets/*.png assets/*.jpeg 2>/dev/null || true

# 5️⃣ Commit with timestamp
COMMIT_MSG="Auto-deploy: $(date '+%Y-%m-%d %H:%M:%S')"
git commit -m "$COMMIT_MSG" || echo "⚠️ No new changes to commit."

# 6️⃣ Push to your main branch
echo "🚀 Pushing to $BRANCH..."
git push origin "$BRANCH"

# 7️⃣ Publish to GitHub Pages
echo "🌐 Publishing to GitHub Pages..."
if git rev-parse --verify gh-pages >/dev/null 2>&1; then
  git subtree push --prefix . origin gh-pages
else
  echo "⚙️ Creating gh-pages branch..."
  git push origin `git subtree split --prefix . "$BRANCH"`:gh-pages --force
fi

# 8️⃣ Post-deploy feedback
URL="https://chrisburley01.github.io/VlifeVR-demo/"
echo ""
echo "✅ Deployment complete!"
echo "🌍 Live at: $URL"

# 9️⃣ Optional: auto-open browser (Mac/Linux)
if command -v open >/dev/null 2>&1; then
  open "$URL"
elif command -v xdg-open >/dev/null 2>&1; then
  xdg-open "$URL"
fi

echo "🎉 All done!"