#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Build the Marseille card back: back.jpg.

Source: the reverse of a Grimaud aluette deck (c.1858-1890), from the
house that later published the Ancien Tarot de Marseille — so the right
period and the right lineage. Public domain; kept in-repo as _back_src.jpg
so this is reproducible.

The source card is photographed at aspect ~0.65 and ours is 0.511, so we
cannot simply resize it — that would squash the pattern. Instead we take
the pattern INTERIOR, crop it to the proportions our card needs, and then
rebuild the card around it: the same ~10px paper margin the faces carry,
and the same softly-cut corners, so the back reads as the same physical
object as the fronts rather than as a texture bled to the edge.
"""
import os
from PIL import Image, ImageDraw, ImageFilter

HERE = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.join(HERE, "_back_src.jpg")

# Must match _crop.py exactly.
W, H = 744, 1456

# Measured off the faces: paper between the card edge and the printed
# design runs 9-12px, and the cut corner shows a sliver of the pale
# backdrop the cards were photographed against.
MARGIN = 10
CORNER_R = 16
BACKDROP = (219, 214, 210)     # what the faces show at their extreme corners

SS = 2                          # supersample, for clean corner arcs


def pattern_box(im):
    """Bounds of the printed pattern inside the source card's own margin."""
    w, h = im.size
    px = im.load()

    def var_row(y):
        vals = [px[x, y] for x in range(0, w, 4)]
        m = sum(sum(v) for v in vals) / len(vals)
        return sum((sum(v) - m) ** 2 for v in vals) / len(vals)

    def var_col(x):
        vals = [px[x, y] for y in range(0, h, 4)]
        m = sum(sum(v) for v in vals) / len(vals)
        return sum((sum(v) - m) ** 2 for v in vals) / len(vals)

    rv = [var_row(y) for y in range(h)]
    cv = [var_col(x) for x in range(w)]
    tr, tc = max(rv) * 0.15, max(cv) * 0.15
    top = next(y for y in range(h) if rv[y] > tr)
    bot = next(y for y in range(h - 1, -1, -1) if rv[y] > tr)
    left = next(x for x in range(w) if cv[x] > tc)
    right = next(x for x in range(w - 1, -1, -1) if cv[x] > tc)
    return left, top, right, bot


def main():
    src = Image.open(SRC).convert("RGB")
    left, top, right, bot = pattern_box(src)

    inner_w, inner_h = W - 2 * MARGIN, H - 2 * MARGIN
    want = inner_w / inner_h

    # Take the largest centred piece of the pattern at our proportions.
    pw, ph = right - left, bot - top
    if pw / ph > want:
        nw = int(round(ph * want))
        box = (left + (pw - nw) // 2, top, left + (pw - nw) // 2 + nw, bot)
    else:
        nh = int(round(pw / want))
        box = (left, top + (ph - nh) // 2, right, top + (ph - nh) // 2 + nh)
    pattern = src.crop(box)
    scale = inner_w / pattern.width
    pattern = pattern.resize((inner_w, inner_h), Image.LANCZOS)

    # Paper colour taken from the source's own margin, so the border is the
    # stock this pattern was actually printed on.
    paper = src.getpixel((max(0, left - 6), (top + bot) // 2))

    card = Image.new("RGB", (W, H), paper)
    card.paste(pattern, (MARGIN, MARGIN))

    # Cut the corners the way a real card is cut, letting the same pale
    # backdrop the faces show peek through at the extreme corners.
    big = (W * SS, H * SS)
    mask = Image.new("L", big, 0)
    ImageDraw.Draw(mask).rounded_rectangle(
        [0, 0, big[0] - 1, big[1] - 1], radius=CORNER_R * SS, fill=255)
    mask = mask.resize((W, H), Image.LANCZOS)
    out = Image.new("RGB", (W, H), BACKDROP)
    out.paste(card, (0, 0), mask)

    out = out.filter(ImageFilter.GaussianBlur(0.25))
    dest = os.path.join(HERE, "back.jpg")
    out.save(dest, "JPEG", quality=90, optimize=True, progressive=True)
    print("wrote %s  %dx%d" % (dest, W, H))
    print("pattern crop %dx%d -> %dx%d (scale x%.2f)"
          % (box[2] - box[0], box[3] - box[1], inner_w, inner_h, scale))
    print("paper %s  margin %dpx  corner r%d" % (paper, MARGIN, CORNER_R))


if __name__ == "__main__":
    main()
