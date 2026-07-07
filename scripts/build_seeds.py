#!/usr/bin/env python3
"""Build final seeds.js from existing seeds + seed-extra + TMDB posters."""
import json, re, os

ROOT = "C:\\Users\\xnovu\\OneDrive\\Desktop\\personal_web"

with open(os.path.join(ROOT, "data", "seeds.js"), "r", encoding="utf-8") as f:
    seeds_text = f.read()

with open(os.path.join(ROOT, "data", "tmdb-posters.json"), "r", encoding="utf-8") as f:
    posters = json.load(f)

# Parse SEED_EXTRA if exists
extra_path = os.path.join(ROOT, "data", "seed-extra.js")
extra_items = []
if os.path.exists(extra_path):
    with open(extra_path, "r", encoding="utf-8") as f:
        text = f.read()
    # Expect window.SEED_EXTRA = [ ... ]
    m = re.search(r"window\.SEED_EXTRA\s*=\s*(\[.*?\]);", text, re.DOTALL)
    if m:
        extra_items = json.loads(m.group(1))

# Update posters where we have TMDB paths
POSTER_BASE = "https://image.tmdb.org/t/p/w500"
updated = 0
for item in extra_items:
    if item.get("poster"):
        continue
    key = item["id"]
    if key in posters:
        item["poster"] = POSTER_BASE + posters[key]
        updated += 1
        print(f"[update] {key}: {item['poster']}")

# Build final merged array
# Parse existing seeds array
seeds_m = re.search(r"window\.SEEDS\s*=\s*(\[.*?\]);", seeds_text, re.DOTALL)
seeds = []
if seeds_m:
    arr_text = seeds_m.group(1)
    arr_text = re.sub(r'(\n\s*)([A-Za-z_][A-Za-z0-9_-]*)\s*:', r'\1"\2":', arr_text)
    try:
        seeds = json.loads(arr_text)
    except Exception as e:
        print(f"[error] seeds.js parse failed: {e}")
        seeds = []

# Merge without duplicates by id
existing_ids = {s["id"] for s in seeds}
merged = list(seeds)
added = 0
for item in extra_items:
    if item["id"] not in existing_ids:
        merged.append(item)
        added += 1

print(f"[merge] updated {updated} items, added {added} new items")

# Write new seeds.js
seeds_text = re.sub(
    r"window\.SEEDS\s*=\s*\[.*?\];",
    "window.SEEDS = " + json.dumps(merged, ensure_ascii=False, indent=2) + ";",
    seeds_text,
    flags=re.DOTALL,
)

out_path = os.path.join(ROOT, "data", "seeds.js")
with open(out_path, "w", encoding="utf-8") as f:
    f.write(seeds_text)
print(f"[write] -> {out_path} ({len(merged)} entries)")
