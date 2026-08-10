#!/usr/bin/env python3
"""Generate the Marseille card back: back.jpg.

The Lequart deck's own reverse was not photographed alongside the faces,
and no public-domain scan of a Marseille back exists at a usable size (the
one on Commons is 214x385). Rather than borrow a back from a different
deck at the wrong proportions, we print a period-correct one.

Historic French cards of this era were backed with *papier dominoté* —
block-printed decorative paper, most commonly a diamond lattice seeded
with small florets. That is what this draws, in the deck's own measured
paper and ink colours (sampled from the scans), at exactly the same
dimensions as the trimmed faces so the flip never shifts.
"""
import math
import os
from PIL import Image, ImageDraw, ImageFilter

HERE = os.path.dirname(os.path.abspath(__file__))

# Match _crop.py's canonical face size exactly.
W, H = 744, 1456
SS = 3                                   # supersample for clean diagonals

# Sampled from the scans, then taken a few steps darker. The faces are
# bright cream; a back at that value glares against the app's black field
# and reads louder than the card it's hiding. This is the same stock seen
# in shadow — still unmistakably the deck's paper, but it sits down.
PAPER = (128, 112, 99)
INK = (54, 40, 36)
RED = (126, 51, 49)                      # the deck's madder red
BLUE = (66, 80, 103)                     # the deck's muted indigo

LATTICE = 118                            # diamond pitch, in output px
BORDER = 30                              # plain paper margin, in output px


def floret(draw, cx, cy, r, color):
    """A small four-petal block-printed flower."""
    for k in range(4):
        a = math.pi / 2 * k
        px = cx + math.cos(a) * r * 0.62
        py = cy + math.sin(a) * r * 0.62
        draw.ellipse([px - r * 0.48, py - r * 0.48, px + r * 0.48, py + r * 0.48],
                     fill=color)
    draw.ellipse([cx - r * 0.30, cy - r * 0.30, cx + r * 0.30, cy + r * 0.30],
                 fill=INK)


def main():
    w, h = W * SS, H * SS
    pitch = LATTICE * SS
    border = BORDER * SS

    im = Image.new("RGB", (w, h), PAPER)
    d = ImageDraw.Draw(im)

    # Diagonal lattice across the whole sheet, both directions.
    line_w = max(1, int(2.2 * SS))
    span = w + h
    for i in range(-span, span, pitch):
        d.line([(i, 0), (i + h, h)], fill=INK, width=line_w)
        d.line([(i, h), (i + h, 0)], fill=INK, width=line_w)

    # A floret in the centre of every diamond, alternating red / blue the
    # way two-block printing would have alternated colours.
    r = pitch * 0.20
    row = 0
    y = 0
    while y < h + pitch:
        offset = 0 if row % 2 == 0 else pitch // 2
        x = offset
        col = 0
        while x < w + pitch:
            floret(d, x, y, r, RED if (row + col) % 2 == 0 else BLUE)
            x += pitch
            col += 1
        y += pitch // 2
        row += 1

    # Plain paper border with a keyline, echoing the faces' framing rule.
    d.rectangle([0, 0, w - 1, border], fill=PAPER)
    d.rectangle([0, h - border, w - 1, h - 1], fill=PAPER)
    d.rectangle([0, 0, border, h - 1], fill=PAPER)
    d.rectangle([w - border, 0, w - 1, h - 1], fill=PAPER)
    d.rectangle([border, border, w - border - 1, h - border - 1],
                outline=INK, width=max(1, int(3 * SS)))

    # Down-sample for antialiasing, then a whisper of blur so it reads as
    # ink pressed into paper rather than vector art.
    im = im.resize((W, H), Image.LANCZOS).filter(ImageFilter.GaussianBlur(0.4))
    out = os.path.join(HERE, "back.jpg")
    im.save(out, "JPEG", quality=90, optimize=True, progressive=True)
    print("wrote", out, im.size)


if __name__ == "__main__":
    main()
