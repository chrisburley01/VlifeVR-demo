# From your VlifeVR-demo repo root
git pull origin main

# Sanity: show changed files (optional)
git status

# Make sure JSON is valid (optional, requires Python)
python3 - <<'PY'
import json, sys
p="assets/media.json"
try:
    d=json.load(open(p,"r",encoding="utf-8"))
    skins=d.get("backgrounds") or d.get("skins") or []
    print(f"✅ media.json OK · {len(skins)} backgrounds")
    print("   →", ", ".join(s.get("name","") for s in skins[:6]))
except Exception as e:
    print("❌ media.json invalid:", e); sys.exit(1)
PY

# Stage, commit, push (deploy)
git add -A
git commit -m "Deploy: Park Steps 360 background + panel fixes"
git push origin main