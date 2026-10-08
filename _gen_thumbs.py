#!/usr/bin/env python3
"""Generate the small card images the deck grid (deckGrid.js) shows.

The grid lays all 78 cards out at once, so it cannot use the full-size
faces (Marseille alone is ~220 MB). One 240px-wide JPEG per card per deck,
written to thumbs/<deck>/<key>.jpg. Thoth thumbs come from the ARTFILL
crop, the deck's default resting view. Re-run after re-sourcing any art.
"""
import os
import re
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
SOURCES = {
    "rw": "rw",
    "thoth": os.path.join("thoth", "artfill"),
    "marseille": "marseille",
}
WIDTH = 240
CARD = re.compile(r"^(maj|wands|cups|swords|pents)\d\d\.jpg$")

for deck, src in SOURCES.items():
    out_dir = os.path.join(HERE, "thumbs", deck)
    os.makedirs(out_dir, exist_ok=True)
    src_dir = os.path.join(HERE, src)
    for name in sorted(os.listdir(src_dir)):
        if not CARD.match(name):
            continue
        im = Image.open(os.path.join(src_dir, name)).convert("RGB")
        h = round(im.height * WIDTH / im.width)
        im = im.resize((WIDTH, h), Image.LANCZOS)
        im.save(os.path.join(out_dir, name), "JPEG", quality=78, optimize=True, progressive=True)
