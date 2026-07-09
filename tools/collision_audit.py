#!/usr/bin/env python3
"""collision_audit.py — render each map's art with its collision grid on top.

Red tint  = solid tile
Green dot = walkable tile
Yellow box = interact entity   Cyan box = touch entity
Run `node tools/collision_audit.mjs` first to produce tools/_maps.json.
Output: tools/_audit/<map>.png
"""
import json
from pathlib import Path
from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "tools" / "_audit"
OUT.mkdir(parents=True, exist_ok=True)
TILE = 48

maps = json.load(open(ROOT / "tools" / "_maps.json"))

for name, d in maps.items():
    bgp = ROOT / "assets" / "img" / f"{d['bg']}.jpg"
    if not bgp.exists():
        print(f"skip {name}: no {bgp.name}")
        continue
    im = Image.open(bgp).convert("RGBA")
    ov = Image.new("RGBA", im.size, (0, 0, 0, 0))
    dr = ImageDraw.Draw(ov)

    for y, row in enumerate(d["grid"]):
        for x, ch in enumerate(row):
            px, py = x * TILE, y * TILE
            if ch == "#":
                dr.rectangle([px, py, px + TILE - 1, py + TILE - 1], fill=(255, 0, 0, 90))
            else:
                cx, cy = px + TILE // 2, py + TILE // 2
                dr.ellipse([cx - 3, cy - 3, cx + 3, cy + 3], fill=(0, 255, 0, 200))
            dr.rectangle([px, py, px + TILE - 1, py + TILE - 1], outline=(0, 0, 0, 60))

    for e in d["entities"]:
        x, y = e["x"] * TILE, e["y"] * TILE
        w, h = e.get("w", 1) * TILE, e.get("h", 1) * TILE
        col = (255, 220, 0, 255) if e.get("interact") else (0, 220, 255, 255)
        dr.rectangle([x, y, x + w - 1, y + h - 1], outline=col, width=3)
        dr.text((x + 4, y + 4), e["id"], fill=col)

    im = Image.alpha_composite(im, ov).convert("RGB")
    dr2 = ImageDraw.Draw(im)
    for x in range(0, 20, 2):
        for y in range(0, 15, 2):
            dr2.text((x * TILE + 2, y * TILE + 2), f"{x},{y}", fill=(255, 255, 255))
    im.save(OUT / f"{name}.png")
    print(f"audit {name}")
print("done →", OUT)
