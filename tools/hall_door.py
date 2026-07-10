#!/usr/bin/env python3
"""hall_door.py — splice the edited door into the hall background, losslessly.

GPT Image 2 "edit" mode re-renders the whole frame rather than inpainting, so we
never ship its output directly: we paste back ONLY the alcove rectangle, through
a feathered mask, onto the untouched original. Everything outside the feather is
then bit-identical to the art we already shipped.

    tools/_raw/bg_real_hall.png   original (lossless)
    tools/_raw/_edit_hall.png     Codex edit, door in the upper-left alcove
    -> tools/_raw/bg_real_hall.png (overwritten, still lossless PNG)

Run once; a backup of the original is kept as _raw/bg_real_hall.orig.png.
"""
import shutil
from pathlib import Path
from PIL import Image, ImageChops, ImageDraw, ImageFilter

RAW = Path(__file__).resolve().parent / "_raw"
ORIG, EDIT = RAW / "bg_real_hall.png", RAW / "_edit_hall.png"
BACKUP = RAW / "bg_real_hall.orig.png"

# The alcove, in raw-image pixels. The hall raw is 1448x1086 = exactly 4:3, so
# crop_43() in post_images.py is a no-op and raw = game_px * 1448/960 (x1.50833).
# Mom's alcove is map columns 4-5, rows 0-2 -> game (192,0)-(288,144).
# The door Codex drew measures (280,16)-(443,271); this box clears it by ~8px.
BOX = (272, 0, 451, 279)
FEATHER = 7


def main():
    if not BACKUP.exists():
        shutil.copy2(ORIG, BACKUP)
    base = Image.open(BACKUP).convert("RGB")
    edit = Image.open(EDIT).convert("RGB")
    if base.size != edit.size:
        edit = edit.resize(base.size, Image.LANCZOS)

    mask = Image.new("L", base.size, 0)
    ImageDraw.Draw(mask).rectangle(
        (BOX[0] + FEATHER, BOX[1], BOX[2] - FEATHER, BOX[3] - FEATHER), fill=255
    )
    mask = mask.filter(ImageFilter.GaussianBlur(FEATHER))

    out = Image.composite(edit, base, mask)
    out.save(ORIG, "PNG", optimize=True)

    # prove the splice: outside the feathered box nothing moved at all
    pad = FEATHER * 2
    outside = ImageChops.difference(out, base).convert("L")
    outside.paste(0, (BOX[0] - pad, BOX[1], BOX[2] + pad, BOX[3] + pad))
    bbox = outside.getbbox()
    print(f"pasted {BOX} feather={FEATHER}")
    print("outside the box, changed pixels:", "none" if bbox is None else bbox)


if __name__ == "__main__":
    main()
