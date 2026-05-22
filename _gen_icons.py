#!/usr/bin/env python3
"""Generate the PWA / favicon icon set from the Rider-Waite Fool.

The Fool illustration (white frame + title band trimmed) is framed as an
ivory-bordered rounded card, centered on black with a soft warm glow, and
exported at every size the manifest / apple / favicon links reference.
"""
import os
from PIL import Image, ImageDraw, ImageFilter

HERE = os.path.dirname(os.path.abspath(__file__))
SRC = "/tmp/fool.jpg"          # RW Fool, downloaded from learntarot.com
ILL_BOX = (7, 7, 334, 501)     # illustration bounds inside the card frame

BLACK = (0, 0, 0)
IVORY = (244, 239, 228)
KEYLINE = (28, 24, 20)
GLOW = (120, 96, 48)           # warm, very subtle

SS = 4                         # supersample factor for crisp downscale


def rounded_mask(size, radius):
    m = Image.new("L", size, 0)
    ImageDraw.Draw(m).rounded_rectangle([0, 0, size[0] - 1, size[1] - 1],
                                        radius=radius, fill=255)
    return m


def build_card(card_h):
    """Ivory-bordered rounded card holding the Fool illustration. Returns RGBA."""
    ill = Image.open(SRC).convert("RGB").crop(ILL_BOX)
    border = max(2, int(card_h * 0.033))
    inner_h = card_h - 2 * border
    inner_w = int(inner_h * ill.width / ill.height)
    ill = ill.resize((inner_w, inner_h), Image.LANCZOS)
    card_w = inner_w + 2 * border
    radius = int(card_w * 0.06)

    card = Image.new("RGBA", (card_w, card_h), IVORY + (255,))
    card.paste(ill, (border, border))
    # thin keyline just inside the ivory edge
    ImageDraw.Draw(card).rounded_rectangle(
        [1, 1, card_w - 2, card_h - 2], radius=radius, outline=KEYLINE, width=2)
    card.putalpha(rounded_mask((card_w, card_h), radius))
    return card


def compose(px, card_frac, glow=True):
    """Render one square icon at `px` pixels. card_frac = card height / canvas."""
    C = px * SS
    canvas = Image.new("RGBA", (C, C), BLACK + (255,))
    card = build_card(int(C * card_frac))

    if glow:
        g = Image.new("RGBA", (C, C), (0, 0, 0, 0))
        gx = (C - card.width) // 2
        gy = (C - card.height) // 2
        halo = Image.new("RGBA", card.size, (0, 0, 0, 0))
        ImageDraw.Draw(halo).rounded_rectangle(
            [0, 0, card.width - 1, card.height - 1],
            radius=int(card.width * 0.06), fill=GLOW + (160,))
        g.paste(halo, (gx, gy), halo)
        g = g.filter(ImageFilter.GaussianBlur(C * 0.04))
        canvas = Image.alpha_composite(canvas, g)

    x = (C - card.width) // 2
    y = (C - card.height) // 2
    canvas.alpha_composite(card, (x, y))
    return canvas.resize((px, px), Image.LANCZOS).convert("RGB")


def save(img, name):
    img.save(os.path.join(HERE, name))
    print("wrote", name, img.size)


# Standard icons: card fills ~78% of the height, with glow.
for px, name in [(180, "apple-touch-icon.png"),
                 (192, "icon-192.png"),
                 (512, "icon-512.png")]:
    save(compose(px, 0.80), name)

# Maskable: extra padding so the card stays inside the Android safe zone.
save(compose(512, 0.62), "icon-512-maskable.png")

# Favicons (browser tab / bookmarks).
master = compose(512, 0.84, glow=False)
for px in (16, 32, 48):
    save(master.resize((px, px), Image.LANCZOS), "favicon-%d.png" % px)
ico = master.resize((48, 48), Image.LANCZOS)
ico.save(os.path.join(HERE, "favicon.ico"),
         sizes=[(16, 16), (32, 32), (48, 48)])
print("wrote favicon.ico")
