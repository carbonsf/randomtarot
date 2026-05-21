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

# How far (fraction of the dimension) to search outward from just-inside
# the art for the true frame edge, and the minimum color-gradient that
# counts as the boundary. Scanning OUTWARD FROM INSIDE the art means we
# stop at the art's own edge before we could ever reach the title band
# (which sits ~35px below the bottom edge / ~4px above the top edge).
EDGE_WIN_FRAC = 0.022
GRAD_MIN = 13
INSET = 5   # start the scan this many px inside the reference edge


def _row_mean(px, w, y):
    n = r = g = b = 0
    for x in range(0, w, 4):
        p = px[x, y]; r += p[0]; g += p[1]; b += p[2]; n += 1
    return (r / n, g / n, b / n)


def _col_mean(px, h, x):
    n = r = g = b = 0
    for y in range(0, h, 4):
        p = px[x, y]; r += p[0]; g += p[1]; b += p[2]; n += 1
    return (r / n, g / n, b / n)


def _grad(a, b):
    return abs(a[0] - b[0]) + abs(a[1] - b[1]) + abs(a[2] - b[2])


def refined_art_box(im):
    """Anchor on the reference window, then refine each edge to the first
    strong color-gradient found scanning outward from just inside the art.
    Falls back to the reference edge if no clear boundary is nearby."""
    im_rgb = im.convert("RGB")
    w, h = im_rgb.size
    px = im_rgb.load()
    ref_l = round(w * REF_L); ref_t = round(h * REF_T)
    ref_r = round(w * REF_R); ref_b = round(h * REF_B)
    wx = max(8, round(w * EDGE_WIN_FRAC))
    wy = max(8, round(h * EDGE_WIN_FRAC))

    # Scan rows outward from `start` in `direction` (+1 down, -1 up) for up
    # to `reach` steps; return the first row whose local gradient >= GRAD_MIN.
    def scan_row(start, direction, reach):
        for step in range(reach):
            y = start + step * direction
            if y < 3 or y > h - 3:
                break
            if _grad(_row_mean(px, w, y - 2), _row_mean(px, w, y + 2)) >= GRAD_MIN:
                return y
        return None

    def scan_col(start, direction, reach):
        for step in range(reach):
            x = start + step * direction
            if x < 3 or x > w - 3:
                break
            if _grad(_col_mean(px, h, x - 2), _col_mean(px, h, x + 2)) >= GRAD_MIN:
                return x
        return None

    reach_y = wy + INSET + 4
    reach_x = wx + INSET + 4
    top    = scan_row(ref_t + INSET, -1, reach_y)
    bottom = scan_row(ref_b - INSET, +1, reach_y)
    left   = scan_col(ref_l + INSET, -1, reach_x)
    right  = scan_col(ref_r - INSET, +1, reach_x)

    # Fall back to the reference for any edge that didn't find a boundary.
    top    = ref_t if top    is None else top
    bottom = (ref_b if bottom is None else bottom) + 1
    left   = ref_l if left   is None else left
    right  = (ref_r if right  is None else right) + 1

    # Sanity: a degenerate box means detection went wrong — use reference.
    if right - left < w * 0.4 or bottom - top < h * 0.4:
        return (ref_l, ref_t, ref_r, ref_b)
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
