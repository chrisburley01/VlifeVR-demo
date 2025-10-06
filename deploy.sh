#!/usr/bin/env bash
set -e

echo "🚀 VlifeVR: Deploying to main (with sanity checks)"

# 1️⃣ Validate media.json if Python is available
if command -v python3 >/dev/null 2>&1; then
  echo "🧪 Checking assets/media.json..."
  python3 - <<'PY'
import json,sys
p="assets/media.json"
try:
    data=json.load(open(p,"r",encoding="utf-8"))
    skins=data.get("backgrounds") or data.get("skins") or []
    print(f"✅ JSON OK · {len(skins)} backgrounds found")
    if len(skins)<1: print("⚠️ No backgrounds defined")
    for s in skins[:8]:
        print("   →", s.get("name"))
except Exception as e:
    print("❌ media.json is invalid:", e); sys.exit(1)
PY
else
  echo "ℹ️ Skipping JSON validation (Python not installed)"
fi

# 2️⃣ Check critical files exist
[ -f "index.html" ] || { echo "❌ Missing index.html — run from repo root"; exit 1; }

if grep -q 'subway_entrance_4k.exr' assets/media.json; then
  if [ -f "assets/subway_entrance_4k.exr" ]; then
    echo "✅ Found assets/subway_entrance_4k.exr"
  else
    echo "⚠️ media.json references subway_entrance_4k.exr but file not found"
  fi
fi

# 3️⃣ Commit and push to GitHub
echo "📝 Staging all changes..."
git add -A

msg=${1:-"Deploy: update HTML/EXR support"}
echo "💬 Commit message: $msg"
git commit -m "$msg" || echo "ℹ️ Nothing to commit"

echo "⬆️ Pushing to main..."
git push origin main

echo "✅ Done! GitHub Pages will rebuild automatically."
echo "🌐 View your site: https://chrisburley01.github.io/VlifeVR-demo/"