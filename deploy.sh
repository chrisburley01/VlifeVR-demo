#!/usr/bin/env bash
# =========================================
# 🚀 VLifeVR Deployment Script (Full)
# =========================================
# Auto-commits changes and publishes them
# to GitHub Pages for instant viewing.
#
# Repo: chrisburley01/VlifeVR-demo
# Live URL:
#   https://chrisburley01.github.io/VlifeVR-demo/
# =========================================

set -e  # stop if any error occurs

# 1️⃣ Confirm repo setup
if ! git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  echo "❌ Not a Git repo. Run: git init && git remote add origin <url>"
  exit 1
fi

# 2️⃣ Branch info
BRANCH=$(git branch --show-current)
echo "📦 Deploying branch: $BRANCH"

# 3️⃣ Validate key files exist
echo "🧩 Checking files..."
REQUIRED=("index.html" "assets/media.json")
for FILE in "${REQUIRED[@]}"; do
  if [[ ! -f "$FILE" ]]; then
    echo "❌ Missing: $FILE"
    exit 1
  fi
done
echo "✅ Required files found."

# 4️⃣ Stage changes (HTML + JSON + images)
echo "📝 Staging changes..."
git add *.html *.json assets/*.jpg assets/*.png 2>/dev/null || true

# 5️⃣ Commit with timestamp
COMMIT_MSG="Auto-deploy $(date '+%Y-%m-%d %H:%M:%S')"
git commit -m "$COMMIT_MSG" || echo "⚠️ No new changes."

# 6️⃣ Push latest updates
echo "🚀 Pushing to $BRANCH..."
git push origin "$BRANCH"

# 7️⃣ Publish to GitHub Pages
echo "🌐 Deploying to GitHub Pages..."
if git rev-parse --verify gh-pages >/dev/null 2>&1; then
  git subtree push --prefix . origin gh-pages
else
  echo "⚙️ Creating gh-pages branch..."
  git push origin "$(git subtree split --prefix . "$BRANCH")":gh-pages --force
fi

# 8️⃣ Confirm success
URL="https://chrisburley01.github.io/VlifeVR-demo/"
echo ""
echo "✅ Deployment complete!"
echo "🌍 Live at: $URL"

# 9️⃣ Optional: Auto-open in browser (Mac/Linux)
if command -v open >/dev/null 2>&1; then
  open "$URL"
elif command -v xdg-open >/dev/null 2>&1; then
  xdg-open "$URL"
fi

echo "🎉 All done!"