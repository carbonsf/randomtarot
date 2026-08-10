#!/usr/bin/env python3
"""Trim the Marseille scans in _src/ down to the card itself and normalise
them into ../marseille/<key>.jpg.

Each source is a photograph of a physical antique card sitting on a pale
grey backdrop, so every scan carries ~25-40px of surround and the card is
cut slightly differently on each. We:

  1. Detect the card's dark printed keyline (every Marseille card has a
     black rule framing the design) and trim to it plus a thin paper
     margin, so the result is the card and nothing else.
  2. Resize every card to ONE canonical size, because the physical cards
     really are identical in size — the per-scan variation is a cutting
     and photography artifact, not the deck. A uniform size keeps the
     draw / set-down / deck-switch animations from shifting between
     cards.

Output is JPEG (quality 88) to match the weight of the other two decks.
"""
import os
import statistics
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.join(HERE, "_src")
OUT = HERE

# Canonical output size. The trimmed cards measure ~744x1456 (aspect
# ~0.511); we keep that aspect and land on a round, retina-friendly size.
TARGET_W, TARGET_H = 744, 1456

# A pixel counts as "ink" if it is clearly darker than the pale scan
# backdrop and the card's cream paper.
INK_SUM = 330          # r+g+b below this is ink
EDGE_FRACTION = 0.025  # fraction of a scanline that must be ink to count
PAPER_PAD = 0.012      # keep this much paper outside the keyline (of width)


def ink_bounds(im):
    """Bounding box of the card's printed keyline."""
    g = im.convert("RGB")
    w, h = g.size
    px = g.load()

    def row_ink(y):
        return sum(1 for x in range(0, w, 3) if sum(px[x, y]) < INK_SUM)

    def col_ink(x):
        return sum(1 for y in range(0, h, 3) if sum(px[x, y]) < INK_SUM)

    row_need = (w / 3) * EDGE_FRACTION
    col_need = (h / 3) * EDGE_FRACTION

    top = next((y for y in range(h) if row_ink(y) > row_need), 0)
    bottom = next((y for y in range(h - 1, -1, -1) if row_ink(y) > row_need), h - 1)
    left = next((x for x in range(w) if col_ink(x) > col_need), 0)
    right = next((x for x in range(w - 1, -1, -1) if col_ink(x) > col_need), w - 1)
    return left, top, right + 1, bottom + 1


def process(path):
    im = Image.open(path).convert("RGB")
    w, h = im.size
    left, top, right, bottom = ink_bounds(im)

    # Degenerate detection -> fall back to a conservative inset.
    if right - left < w * 0.5 or bottom - top < h * 0.5:
        inset_x, inset_y = int(w * 0.04), int(h * 0.03)
        left, top, right, bottom = inset_x, inset_y, w - inset_x, h - inset_y

    # Keep a sliver of paper outside the keyline so the card reads as a
    # card rather than a design bled to the edge.
    pad = int(w * PAPER_PAD)
    box = (max(0, left - pad), max(0, top - pad),
           min(w, right + pad), min(h, bottom + pad))
    card = im.crop(box)
    return card.resize((TARGET_W, TARGET_H), Image.LANCZOS), box, card.size


def main():
    files = sorted(f for f in os.listdir(SRC) if f.endswith(".png"))
    if not files:
        raise SystemExit("no sources in %s — run _fetch.py first" % SRC)
    aspects = []
    for f in files:
        key = os.path.splitext(f)[0]
        out, box, pre = process(os.path.join(SRC, f))
        out.save(os.path.join(OUT, key + ".jpg"), "JPEG",
                 quality=88, optimize=True, progressive=True)
        aspects.append(pre[0] / pre[1])
        print("%-9s trimmed %-18s -> %dx%d" % (key, "%dx%d" % pre, TARGET_W, TARGET_H))
    print("\n%d cards written to %s" % (len(files), OUT))
    print("pre-normalise aspect  min %.4f  max %.4f  median %.4f"
          % (min(aspects), max(aspects), statistics.median(aspects)))


if __name__ == "__main__":
    main()
