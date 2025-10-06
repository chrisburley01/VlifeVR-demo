#!/usr/bin/env bash
set -e

echo "🚀 Starting VlifeVR deployment..."

# Define variables
REPO_URL="https://github.com/chrisburley01/VlifeVR-demo.git"
BRANCH="main"
BUILD_DIR="."
DEPLOY_BRANCH="gh-pages"

# Confirm current directory
echo "📂 Current directory: $(pwd)"

# Check for git
if ! command -v git &> /dev/null; then
  echo "❌ Git not found. Please install Git first."
  exit 1
fi

# Stage and commit local changes
echo "📝 Adding all changes..."
git add .

# Use a generic commit message if none provided
COMMIT_MSG=${1:-"Auto-deploy: update assets and HTML"}
echo "💬 Commit message: $COMMIT_MSG"

git commit -m "$COMMIT_MSG" || echo "⚠️ Nothing to commit."

# Push to main
echo "⬆️ Pushing to $BRANCH..."
git push origin $BRANCH

# Deploy using GitHub Pages
echo "🌐 Deploying to $DEPLOY_BRANCH..."
if git show-ref --verify --quiet refs/heads/$DEPLOY_BRANCH; then
  git branch -D $DEPLOY_BRANCH
fi
git checkout -b $DEPLOY_BRANCH

# Optional build step (if you use dist)
if [ -d "dist" ]; then
  echo "🏗️ Copying dist folder for deployment..."
  cp -r dist/* .
fi

# Commit and push deployment
git add .
git commit -m "Deploy to GitHub Pages"
git push --force origin $DEPLOY_BRANCH

# Return to main
git checkout $BRANCH

echo "✅ Deployment complete! Check your site at:"
echo "👉 https://chrisburley01.github.io/VlifeVR-demo/"