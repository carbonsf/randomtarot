#!/usr/bin/env python3
"""
Border-detect and crop the Thoth card sources into the three variants
the app needs:
  BIG     — original card, center-cropped to TARGET_RATIO (some border may
            remain visible at the long axis; mild trim only).
  FULLART — gray border AND decorative title-frame removed, native art
            aspect (whatever it is).
  ARTFILL — FULLART further center-cropped to TARGET_RATIO so it fills
            the same on-screen footprint as the Rider-Waite cards.

Border + frame detection uses per-scanline color variance. Three layers
exist on each Thoth card:
  - outer white margin (very low variance)
  - decorative title frame, including "XVII / The Star / TRUMPS" text
    (low-to-moderate variance — usually one solid color with text)
  - actual artwork (high variance — many colors, gradients, figures)
We scan from each edge inward and find where the variance crosses a
fraction (VAR_FRACTION) of the per-card maximum AND stays above that
level for several consecutive scanlines. That gives a robust transition
even when title text spikes the variance briefly inside the frame.
"""
import os, sys, statistics
from PIL import Image

TARGET_RATIO = 825 / 1427   # ≈ 0.5781 — Rider-Waite aspect

# A scanline qualifies as "in the art" if its variance is at least this
# fraction of the per-card max scanline variance. 0.25 is empirically
# the right point — frame text spikes to ~30% of art variance on busy
# cards, so we need to be just above that.
VAR_FRACTION = 0.30

# Number of consecutive qualifying scanlines required before we accept
# a transition. Filters out single-line spikes (e.g., decorative text
# inside the frame) from triggering a false art-edge.
CONSECUTIVE = 6

# Stride for sampling pixels along a scanline (speed). 4 is plenty.
STRIDE = 4


def line_variance(pixels):
    """Sum of per-channel variances of a list of RGB tuples."""
    n = len(pixels)
    if n < 2:
        return 0.0
    rs = [p[0] for p in pixels]
    gs = [p[1] for p in pixels]
    bs = [p[2] for p in pixels]
    return statistics.pvariance(rs) + statistics.pvariance(gs) + statistics.pvariance(bs)


def h_var(px, w, y):
    return line_variance([px[x, y] for x in range(0, w, STRIDE)])


def v_var(px, h, x):
    return line_variance([px[x, y] for y in range(0, h, STRIDE)])


def detect_inner_bbox(im):
    """Find (left, top, right, bottom) of the *art* region — past both
    the outer margin and the decorative title frame."""
    im_rgb = im.convert("RGB")
    w, h = im_rgb.size
    px = im_rgb.load()

    # Per-card max variance reference: take the max across a sparse
    # sample of horizontal + vertical scanlines. This lets a single
    # threshold work across all 78 cards regardless of palette.
    h_vars = [h_var(px, w, y) for y in range(0, h, max(1, h // 40))]
    v_vars = [v_var(px, h, x) for x in range(0, w, max(1, w // 40))]
    max_var = max(max(h_vars), max(v_vars), 1.0)
    threshold = max_var * VAR_FRACTION

    # Scan from top: first y where CONSECUTIVE rows in a row all
    # exceed threshold. That's the inner edge of the top frame.
    top = 0
    run = 0
    for y in range(h):
        if h_var(px, w, y) > threshold:
            run += 1
            if run >= CONSECUTIVE:
                top = y - CONSECUTIVE + 1
                break
        else:
            run = 0

    # Scan from bottom symmetrically.
    bottom = h
    run = 0
    for y in range(h - 1, -1, -1):
        if h_var(px, w, y) > threshold:
            run += 1
            if run >= CONSECUTIVE:
                bottom = y + CONSECUTIVE
                break
        else:
            run = 0

    # Left.
    left = 0
    run = 0
    for x in range(w):
        if v_var(px, h, x) > threshold:
            run += 1
            if run >= CONSECUTIVE:
                left = x - CONSECUTIVE + 1
                break
        else:
            run = 0

    # Right.
    right = w
    run = 0
    for x in range(w - 1, -1, -1):
        if v_var(px, h, x) > threshold:
            run += 1
            if run >= CONSECUTIVE:
                right = x + CONSECUTIVE
                break
        else:
            run = 0

    # Sanity check: if the detected box is implausibly small, fall back
    # to a conservative inset rather than mangling the card.
    if right - left < w * 0.4 or bottom - top < h * 0.4:
        ix = int(w * 0.08)
        iy = int(h * 0.08)
        return (ix, iy, w - ix, h - iy)
    return (max(0, left), max(0, top), min(w, right), min(h, bottom))


def center_crop_to_ratio(im, ratio):
    """Center-crop the image to a target width/height ratio."""
    w, h = im.size
    cur = w / h
    if abs(cur - ratio) < 1e-3:
        return im
    if cur > ratio:
        # too wide — trim sides
        new_w = int(round(h * ratio))
        x0 = (w - new_w) // 2
        return im.crop((x0, 0, x0 + new_w, h))
    else:
        # too tall — trim top/bottom
        new_h = int(round(w / ratio))
        y0 = (h - new_h) // 2
        return im.crop((0, y0, w, y0 + new_h))


# Reference art window, taken from the cards that detected cleanly
# (Three of Disks pents03 / Death maj13): box ~ (77, 94, 600, 901) on a
# 684x1024 source. The Thoth deck is uniformly framed, so this is very
# close on every card — but it can be a few px off in any direction. So
# we use it only as an ANCHOR and refine each edge per-card.
REF_L = 77 / 684
REF_T = 94 / 1024
REF_R = 600 / 684
REF_B = 901 / 1024

# Center-out detection tuning. We flood OUTWARD from the card centre
# (which is always art) until the per-line variance drops and stays low —
# that's the art's own edge. Because we stop at the first low-variance gap,
# we never reach the title bands beyond it (they're separated from the art
# by that gap), and we correctly skip light inner-margin bands that sit
# between the frame and the art on some cards (e.g. the Queen of Wands).
ART_LEVEL_FRACTION = 0.20   # a line is "still art" if its variance >= this * central level
ART_LEVEL_FLOOR = 240       # absolute floor so flat-ish art doesn't end early
EDGE_CONSEC = 6             # consecutive low lines required to call the edge


def _central_level(px, w, h):
    """Median per-line variance across the central art region — the
    reference for 'this is definitely art'."""
    rows = [line_variance([px[x, y] for x in range(0, w, STRIDE)])
            for y in range(int(h * 0.40), int(h * 0.60), 6)]
    cols = [line_variance([px[x, y] for y in range(0, h, STRIDE)])
            for x in range(int(w * 0.40), int(w * 0.60), 6)]
    vals = sorted(rows + cols)
    return vals[len(vals) // 2] if vals else 1.0


def refined_art_box(im):
    """Find the art's bounding box by scanning outward from the centre
    until the variance drops below a threshold (entering the gap/margin),
    requiring a sustained low run so brief flat patches inside the art
    don't end the scan early. Falls back to the reference window if the
    result is degenerate."""
    im_rgb = im.convert("RGB")
    w, h = im_rgb.size
    px = im_rgb.load()
    cx, cy = w // 2, h // 2

    level = _central_level(px, w, h)
    threshold = max(level * ART_LEVEL_FRACTION, ART_LEVEL_FLOOR)

    def hv(y):
        return line_variance([px[x, y] for x in range(0, w, STRIDE)])

    def vv(x):
        return line_variance([px[x, y] for y in range(0, h, STRIDE)])

    # Scan a 1-D variance profile outward from `start` in `direction`.
    # Returns the last index that was "art" before EDGE_CONSEC sustained
    # low lines (the art edge).
    def scan(f, start, direction, lo, hi):
        last_art = start
        low_run = 0
        i = start
        while lo <= i <= hi:
            if f(i) >= threshold:
                last_art = i
                low_run = 0
            else:
                low_run += 1
                if low_run >= EDGE_CONSEC:
                    break
            i += direction
        return last_art

    top    = scan(hv, cy, -1, 0, h - 1)
    bottom = scan(hv, cy, +1, 0, h - 1) + 1
    left   = scan(vv, cx, -1, 0, w - 1)
    right  = scan(vv, cx, +1, 0, w - 1) + 1

    # Sanity: degenerate result -> reference window.
    ref = (round(w * REF_L), round(h * REF_T), round(w * REF_R), round(h * REF_B))
    if right - left < w * 0.4 or bottom - top < h * 0.4:
        return ref
    return (left, top, right, bottom)


def process(src_path, key, out_dir):
    """Generate the three crops for one card."""
    im = Image.open(src_path).convert("RGB")

    # BIG: original, center-cropped (mild) to TARGET_RATIO.
    big = center_crop_to_ratio(im, TARGET_RATIO)
    big.save(os.path.join(out_dir, "big", f"{key}.jpg"), "JPEG", quality=86, optimize=True)

    # FULLART: per-card refined art window, border + both title bands removed.
    box = refined_art_box(im)
    fullart = im.crop(box)
    fullart.save(os.path.join(out_dir, "fullart", f"{key}.jpg"), "JPEG", quality=86, optimize=True)

    # ARTFILL: FULLART further center-cropped to TARGET_RATIO.
    artfill = center_crop_to_ratio(fullart, TARGET_RATIO)
    artfill.save(os.path.join(out_dir, "artfill", f"{key}.jpg"), "JPEG", quality=86, optimize=True)

    return {
        "src": im.size,
        "big": big.size,
        "fullart": fullart.size,
        "fullart_box": box,
        "artfill": artfill.size,
    }


if __name__ == "__main__":
    base = os.path.dirname(os.path.abspath(__file__))
    if len(sys.argv) < 3:
        print("usage: _crop.py <src.jpg> <key>")
        sys.exit(1)
    src = sys.argv[1]
    key = sys.argv[2]
    info = process(src, key, base)
    for k, v in info.items():
        print(f"  {k}: {v}")
