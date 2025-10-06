#!/usr/bin/env bash
# ==========================================================
# VLifeVR Demo - GitHub Pages Deployment Script
# ==========================================================
# This script commits local changes and triggers a rebuild
# of your site on GitHub Pages.
# ==========================================================

set -e

echo "🔍 Checking current branch..."
branch=$(git rev-parse --abbrev-ref HEAD)
if [ "$branch" != "main" ]; then
  echo "⚠️  You're on branch '$branch'. Switching to 'main'..."
  git checkout main
fi

echo "📦 Pulling latest changes..."
git pull origin main

echo "🧹 Cleaning untracked files..."
git clean -fd

echo "✅ Staging all changes..."
git add -A

# Prompt user for commit message if none passed
if [ -z "$1" ]; then
  read -p "Enter commit message: " commitMsg
else
  commitMsg=$1
fi

# If no message given, use a default
commitMsg=${commitMsg:-"Auto deploy to GitHub Pages"}

echo "💬 Committing changes..."
git commit -m "$commitMsg" || echo "No new changes to commit."

echo "🚀 Pushing to GitHub..."
git push origin main

echo "🌐 Deploying to GitHub Pages..."
# GitHub Actions will automatically rebuild via pages.yml
# No manual gh-pages branch needed.

echo "✅ Deployment complete!"
echo "🔗 View site: https://chrisburley01.github.io/VlifeVR-demo/"