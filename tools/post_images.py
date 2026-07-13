#!/usr/bin/env python3
"""post_images.py — bake raw AI renders (tools/_raw) into game assets (assets/img).

- map backgrounds / CGs / title: center-crop to 4:3 and scale to 960x720
- portraits: center-crop square, scale to 256x256
- enemies & standing sprites: chroma-key #00FF00 -> alpha (with despill), crop
  to content, scale to fit 512 (bosses) / 384 (regular)
- sp_mira_sheet: chroma-key, slice a 2x4 grid into 8 direction/step frames
Re-runnable; overwrites outputs.
"""
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
RAW = ROOT / "tools" / "_raw"
OUT = ROOT / "assets" / "img"
OUT.mkdir(parents=True, exist_ok=True)

BGS = ["bg_real_bedroom", "bg_real_hall", "bg_real_street", "bg_hospital_room",
       "bg_blank_page", "bg_meadow_1", "bg_meadow_2", "bg_woods_1", "bg_woods_2",
       "bg_bay_1", "bg_bay_2", "bg_depths_1", "bg_depths_2", "bg_woods_2_risen",
       "cg_title", "cg_memory_1", "cg_memory_2", "cg_memory_3", "cg_memory_4",
       "cg_ending_true", "cg_ending_page"]
PORTRAITS = ["pt_mira_neutral", "pt_mira_giggly", "pt_mira_gloomy", "pt_mira_grumpy",
             "pt_biscuit", "pt_wisp", "pt_ren"]
CHROMA = {"en_sniffle": 384, "en_scribble": 384, "en_thornbud": 384,
          "en_buttoncrab": 384, "en_inklet": 384,
          "boss_tangle": 512, "boss_swan": 512, "boss_keeper": 512, "boss_smudge": 512,
          "sp_biscuit": 192, "sp_wisp": 192, "sp_guidebook": 192, "sp_swan_fly": 256,
          "sp_mom_sleep": 256, "sp_letter": 128}


def crop_43(img):
    w, h = img.size
    tw, th = (w, int(w * 3 / 4)) if w * 3 <= h * 4 else (int(h * 4 / 3), h)
    x = (w - tw) // 2
    y = (h - th) // 2
    return img.crop((x, y, x + tw, y + th))


def chroma_to_alpha(img):
    """Remove flat #00FF00 background with distance-based alpha + despill."""
    img = img.convert("RGBA")
    px = img.load()
    w, h = img.size
    for y in range(h):
        for x in range(w):
            r, g, b, a = px[x, y]
            # greenness: how much g dominates r/b
            green_excess = g - max(r, b)
            if green_excess > 90 and g > 130:
                px[x, y] = (r, g, b, 0)
            elif green_excess > 40 and g > 110:
                # soft edge: fade + despill
                alpha = max(0, 255 - int((green_excess - 40) * 255 / 50))
                px[x, y] = (r, max(r, b), b, alpha)
            elif green_excess > 12 and g > 100:
                px[x, y] = (r, max(r, b), b, a)  # despill only
    return img


def crop_content(img, pad=8):
    bbox = img.getbbox()
    if not bbox:
        return img
    l, t, r, b = bbox
    return img.crop((max(0, l - pad), max(0, t - pad),
                     min(img.width, r + pad), min(img.height, b + pad)))


def fit(img, size):
    scale = min(size / img.width, size / img.height)
    return img.resize((max(1, int(img.width * scale)), max(1, int(img.height * scale))),
                      Image.LANCZOS)


def bake_bg(key):
    src = RAW / f"{key}.png"
    if not src.exists():
        print(f"skip (missing raw): {key}")
        return
    img = Image.open(src).convert("RGB")
    img = crop_43(img).resize((960, 720), Image.LANCZOS)
    # subsampling=0 (4:4:4) matters more than the quality number here: the art is
    # dark, smooth coloured-pencil wash, and 4:2:2 chroma blotches it visibly.
    img.save(OUT / f"{key}.jpg", "JPEG", quality=90, optimize=True, subsampling=0)
    print(f"bg   {key}")


def bake_portrait(key):
    src = RAW / f"{key}.png"
    if not src.exists():
        print(f"skip (missing raw): {key}")
        return
    img = Image.open(src).convert("RGB")
    s = min(img.size)
    x = (img.width - s) // 2
    y = (img.height - s) // 2
    img = img.crop((x, y, x + s, y + s)).resize((256, 256), Image.LANCZOS)
    img.save(OUT / f"{key}.jpg", "JPEG", quality=90, optimize=True, subsampling=0)
    print(f"pt   {key}")


def bake_chroma(key, size):
    src = RAW / f"{key}.png"
    if not src.exists():
        print(f"skip (missing raw): {key}")
        return
    img = chroma_to_alpha(Image.open(src))
    img = crop_content(img)
    img = fit(img, size)
    img.save(OUT / f"{key}.png", optimize=True)
    print(f"chr  {key} {img.size}")


def bake_mira_sheet():
    src = RAW / "sp_mira_sheet.png"
    if not src.exists():
        print("skip (missing raw): sp_mira_sheet")
        return
    sheet = chroma_to_alpha(Image.open(src))
    w, h = sheet.size
    cw, ch = w // 2, h // 4
    rows = ["d", "l", "r", "u"]
    for ry, rname in enumerate(rows):
        for cx in range(2):
            cell = sheet.crop((cx * cw, ry * ch, (cx + 1) * cw, (ry + 1) * ch))
            cell = crop_content(cell, pad=4)
            if cell.getbbox() is None:
                print(f"WARN empty cell {rname}{cx}")
                continue
            cell = fit(cell, 128)
            cell.save(OUT / f"sp_mira_{rname}{cx}.png", optimize=True)
            print(f"mira sp_mira_{rname}{cx} {cell.size}")


if __name__ == "__main__":
    import sys
    keys = sys.argv[1:]
    for k in BGS:
        if not keys or k in keys:
            bake_bg(k)
    for k in PORTRAITS:
        if not keys or k in keys:
            bake_portrait(k)
    for k, size in CHROMA.items():
        if not keys or k in keys:
            bake_chroma(k, size)
    if not keys or "sp_mira_sheet" in keys:
        bake_mira_sheet()
    print("done")
