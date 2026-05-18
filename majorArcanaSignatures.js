// Major Arcana signature effects: one unique polished moment per card.
// Each plays AFTER a hold of MAJOR_HOLD_MS once the card has revealed
// normally, and the start/end states are the plain card — the effect
// lives only in the middle. Reversals are unrelated; this code only
// fires when a Major Arcana card resolves UPRIGHT.
//
// All effects use the Web Animations API so they composite smoothly
// and revert cleanly when canceled (no inline-style residue). Easings
// are nonlinear bezier curves; SVG is used where a traced shape reads
// better than a translated overlay.
//
// Module is wrapped in an IIFE; exposes window.MajorArcanaSignature
// with isMajor / schedule / play / cancel. Randomizer.js consumes that
// API and never touches internals.

(function () {
  'use strict';

  // ---- internal state -----------------------------------------------
  let activeOverlays = [];
  let activeAnims = [];
  let activeTimer = null;

  // ---- helpers ------------------------------------------------------
  const SVG_NS = 'http://www.w3.org/2000/svg';

  function svgEl(tag, attrs) {
    const el = document.createElementNS(SVG_NS, tag);
    if (attrs) for (const k in attrs) el.setAttribute(k, attrs[k]);
    return el;
  }

  // Compute the actual rendered content box of the <img> given its
  // object-fit: contain. The img element fills the viewport but the
  // picture is letterboxed inside it according to natural aspect ratio.
  // Effects anchored to this rect land on the visible card edges, not
  // on the letterbox background.
  function getContentRect(imgEl) {
    const r = imgEl.getBoundingClientRect();
    const nw = imgEl.naturalWidth  || 825;
    const nh = imgEl.naturalHeight || 1427;
    const containerAspect = r.width / r.height;
    const naturalAspect   = nw / nh;
    let cw, ch;
    if (naturalAspect > containerAspect) { cw = r.width;  ch = r.width  / naturalAspect; }
    else                                  { ch = r.height; cw = r.height * naturalAspect; }
    return {
      left:   r.left + (r.width  - cw) / 2,
      top:    r.top  + (r.height - ch) / 2,
      width:  cw,
      height: ch
    };
  }

  function newOverlayDiv(styleStr) {
    const el = document.createElement('div');
    el.style.cssText = 'position:fixed;pointer-events:none;z-index:40;' + (styleStr || '');
    activeOverlays.push(el);
    document.body.appendChild(el);
    return el;
  }

  function trackEl(el) { activeOverlays.push(el); return el; }
  function trackAnim(a) { activeAnims.push(a); return a; }

  function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

  function clearAll() {
    if (activeTimer) { clearTimeout(activeTimer); activeTimer = null; }
    for (const el of activeOverlays) {
      if (el && el.parentNode) el.parentNode.removeChild(el);
    }
    activeOverlays = [];
    for (const a of activeAnims) {
      try { a.cancel(); } catch (_e) { /* already done */ }
    }
    activeAnims = [];
    // Any inline styles we set explicitly that aren't covered by WAAPI's
    // revert behavior live here. transform-origin is the only one used.
    const imgEl = document.querySelector('img');
    if (imgEl) imgEl.style.removeProperty('transform-origin');
  }

  // ---- 00 The Fool : spark drift toward the cliff edge --------------
  async function foolSpark(imgEl) {
    const cr = getContentRect(imgEl);
    // Starts in the lower-left interior, drifts diagonally up to the
    // upper-right (the direction the Fool's gaze suggests) before
    // dissolving. Ease-out so the spark releases like a sigh.
    const sx = cr.left + cr.width * 0.18;
    const sy = cr.top  + cr.height * 0.82;
    const dx =  cr.width  * 0.64;
    const dy = -cr.height * 0.64;
    const spark = newOverlayDiv(
      `left:${sx}px;top:${sy}px;width:18px;height:18px;margin:-9px 0 0 -9px;` +
      `border-radius:50%;` +
      `background:radial-gradient(circle,rgba(255,250,220,0.95) 0%,rgba(255,240,180,0.6) 30%,rgba(255,220,140,0) 70%);` +
      `box-shadow:0 0 24px 4px rgba(255,240,180,0.45);`
    );
    trackAnim(spark.animate([
      { transform: 'translate(0,0) scale(0.4)',                            opacity: 0    },
      { transform: 'translate(0,0) scale(1.05)',                           opacity: 0.95, offset: 0.14 },
      { transform: `translate(${dx * 0.86}px, ${dy * 0.86}px) scale(0.9)`, opacity: 0.7,  offset: 0.78 },
      { transform: `translate(${dx}px, ${dy}px) scale(0.3)`,               opacity: 0    }
    ], { duration: 950, easing: 'cubic-bezier(0.16, 1, 0.3, 1)', fill: 'forwards' }));
    await sleep(950);
  }

  // ---- 01 The Magician : lemniscate traces over the card ------------
  async function magicianLemniscate(imgEl) {
    const cr = getContentRect(imgEl);
    const svg = svgEl('svg');
    svg.style.cssText =
      `position:fixed;left:${cr.left}px;top:${cr.top + cr.height * 0.38}px;` +
      `width:${cr.width}px;height:${cr.height * 0.24}px;` +
      `pointer-events:none;z-index:40;overflow:visible;` +
      `filter:drop-shadow(0 0 5px rgba(255,240,210,0.7));`;
    // Bernoulli lemniscate sampled finely so the path is smooth.
    let d = ''; const N = 96;
    for (let i = 0; i <= N; i++) {
      const t = (i / N) * Math.PI * 2;
      const k = 1 + Math.sin(t) * Math.sin(t);
      const x = 100 + 72 * Math.cos(t) / k;
      const y =  50 + 72 * Math.cos(t) * Math.sin(t) / k;
      d += (i ? 'L' : 'M') + x.toFixed(2) + ',' + y.toFixed(2) + ' ';
    }
    svg.setAttribute('viewBox', '0 0 200 100');
    svg.setAttribute('preserveAspectRatio', 'none');
    const path = svgEl('path', {
      d: d, fill: 'none',
      stroke: 'rgba(255,245,215,0.95)',
      'stroke-width': '0.7', 'stroke-linecap': 'round'
    });
    svg.appendChild(path);
    trackEl(svg); document.body.appendChild(svg);
    const len = path.getTotalLength();
    path.style.strokeDasharray  = len;
    path.style.strokeDashoffset = len;
    trackAnim(path.animate(
      [{ strokeDashoffset: len }, { strokeDashoffset: 0 }],
      { duration: 820, easing: 'cubic-bezier(0.65, 0, 0.35, 1)', fill: 'forwards' }
    ));
    await sleep(820);
    trackAnim(path.animate(
      [{ opacity: 1 }, { opacity: 0 }],
      { duration: 260, easing: 'cubic-bezier(0.4, 0, 1, 1)', fill: 'forwards' }
    ));
    await sleep(260);
  }

  // ---- 02 The High Priestess : the veil parts -----------------------
  async function priestessVeil(imgEl) {
    const cr = getContentRect(imgEl);
    const veil = newOverlayDiv(
      `left:${cr.left}px;top:${cr.top}px;` +
      `width:${cr.width * 0.45}px;height:${cr.height}px;` +
      `background:linear-gradient(90deg,transparent 0%,rgba(0,0,0,0.6) 50%,transparent 100%);`
    );
    trackAnim(veil.animate([
      { transform: `translateX(${-cr.width * 0.5}px)`, opacity: 0   },
      { transform: `translateX(${-cr.width * 0.05}px)`, opacity: 0.85, offset: 0.22 },
      { transform: `translateX(${ cr.width * 0.65}px)`, opacity: 0.85, offset: 0.78 },
      { transform: `translateX(${ cr.width * 1.05}px)`, opacity: 0   }
    ], { duration: 1050, easing: 'cubic-bezier(0.45, 0.05, 0.55, 0.95)', fill: 'forwards' }));
    await sleep(1050);
  }

  // ---- 03 The Empress : warm bloom outward --------------------------
  async function empressBloom(imgEl) {
    const cr = getContentRect(imgEl);
    const size = Math.max(cr.width, cr.height) * 1.2;
    const bloom = newOverlayDiv(
      `left:${cr.left + cr.width / 2}px;top:${cr.top + cr.height / 2}px;` +
      `width:${size}px;height:${size}px;` +
      `margin:${-size / 2}px 0 0 ${-size / 2}px;border-radius:50%;` +
      `background:radial-gradient(circle,rgba(255,200,130,0.55) 0%,rgba(255,170,90,0.3) 25%,rgba(255,140,50,0) 60%);` +
      `mix-blend-mode:screen;`
    );
    trackAnim(bloom.animate([
      { transform: 'scale(0.2)',  opacity: 0   },
      { transform: 'scale(0.9)',  opacity: 0.95, offset: 0.45 },
      { transform: 'scale(1.18)', opacity: 0   }
    ], { duration: 1000, easing: 'cubic-bezier(0.22, 1, 0.36, 1)', fill: 'forwards' }));
    await sleep(1000);
  }

  // ---- 04 The Emperor : crisp frame traces the border ---------------
  async function emperorFrame(imgEl) {
    const cr = getContentRect(imgEl);
    const inset = 7;
    const w = cr.width - 2 * inset, h = cr.height - 2 * inset;
    const svg = svgEl('svg');
    svg.style.cssText =
      `position:fixed;left:${cr.left + inset}px;top:${cr.top + inset}px;` +
      `width:${w}px;height:${h}px;pointer-events:none;z-index:40;overflow:visible;`;
    const rect = svgEl('rect', {
      x: 0, y: 0, width: w, height: h, fill: 'none',
      stroke: 'rgba(255,250,235,0.92)', 'stroke-width': 1.6
    });
    rect.style.filter = 'drop-shadow(0 0 4px rgba(255,240,210,0.6))';
    svg.appendChild(rect);
    trackEl(svg); document.body.appendChild(svg);
    const p = 2 * w + 2 * h;
    rect.style.strokeDasharray  = p;
    rect.style.strokeDashoffset = p;
    trackAnim(rect.animate(
      [{ strokeDashoffset: p }, { strokeDashoffset: 0 }],
      { duration: 740, easing: 'cubic-bezier(0.65, 0, 0.35, 1)', fill: 'forwards' }
    ));
    await sleep(740);
    trackAnim(rect.animate(
      [{ opacity: 1 }, { opacity: 0 }],
      { duration: 260, easing: 'cubic-bezier(0.4, 0, 1, 1)', fill: 'forwards' }
    ));
    await sleep(260);
  }

  // ---- 05 The Hierophant : transmission cross descends --------------
  async function hierophantTransmission(imgEl) {
    const cr = getContentRect(imgEl);
    const col = newOverlayDiv(
      `left:${cr.left + cr.width / 2 - 1}px;top:${cr.top}px;width:2px;height:${cr.height / 2}px;` +
      `background:linear-gradient(to bottom,rgba(255,250,220,0) 0%,rgba(255,245,210,0.9) 80%,rgba(255,245,210,0.95) 100%);` +
      `box-shadow:0 0 8px rgba(255,240,200,0.6);transform-origin:top center;transform:scaleY(0);`
    );
    trackAnim(col.animate(
      [{ transform: 'scaleY(0)' }, { transform: 'scaleY(1)' }],
      { duration: 380, easing: 'cubic-bezier(0.65, 0, 0.35, 1)', fill: 'forwards' }
    ));
    await sleep(380);

    const armW = cr.width * 0.34;
    const armL = newOverlayDiv(
      `left:${cr.left + cr.width / 2 - armW}px;top:${cr.top + cr.height / 2 - 1}px;` +
      `width:${armW}px;height:2px;` +
      `background:linear-gradient(to left,rgba(255,250,220,0.95),rgba(255,245,210,0));` +
      `box-shadow:0 0 8px rgba(255,240,200,0.6);transform-origin:right center;transform:scaleX(0);`
    );
    const armR = newOverlayDiv(
      `left:${cr.left + cr.width / 2}px;top:${cr.top + cr.height / 2 - 1}px;` +
      `width:${armW}px;height:2px;` +
      `background:linear-gradient(to right,rgba(255,250,220,0.95),rgba(255,245,210,0));` +
      `box-shadow:0 0 8px rgba(255,240,200,0.6);transform-origin:left center;transform:scaleX(0);`
    );
    const armOpts = { duration: 320, easing: 'cubic-bezier(0.16, 1, 0.3, 1)', fill: 'forwards' };
    trackAnim(armL.animate([{ transform: 'scaleX(0)' }, { transform: 'scaleX(1)' }], armOpts));
    trackAnim(armR.animate([{ transform: 'scaleX(0)' }, { transform: 'scaleX(1)' }], armOpts));
    await sleep(320);

    const fadeOpts = { duration: 280, easing: 'cubic-bezier(0.4, 0, 1, 1)', fill: 'forwards' };
    trackAnim(col.animate ([{ opacity: 1 }, { opacity: 0 }], fadeOpts));
    trackAnim(armL.animate([{ opacity: 1 }, { opacity: 0 }], fadeOpts));
    trackAnim(armR.animate([{ opacity: 1 }, { opacity: 0 }], fadeOpts));
    await sleep(280);
  }

  // ---- 06 The Lovers : two halves part and rejoin -------------------
  async function loversSplit(imgEl) {
    const cr = getContentRect(imgEl);
    const src = imgEl.src;
    const base =
      `position:fixed;left:${cr.left}px;top:${cr.top}px;` +
      `width:${cr.width}px;height:${cr.height}px;` +
      `object-fit:fill;pointer-events:none;z-index:40;`;
    const half1 = document.createElement('img');
    half1.src = src;
    half1.style.cssText = base + 'clip-path:inset(0 50% 0 0);';
    trackEl(half1); document.body.appendChild(half1);
    const half2 = document.createElement('img');
    half2.src = src;
    half2.style.cssText = base + 'clip-path:inset(0 0 0 50%);';
    trackEl(half2); document.body.appendChild(half2);

    // Hide the original briefly so the halves are what's visible.
    trackAnim(imgEl.animate([
      { opacity: 1 },
      { opacity: 0, offset: 0.06 },
      { opacity: 0, offset: 0.94 },
      { opacity: 1 }
    ], { duration: 1050, fill: 'none' }));

    const easing = 'cubic-bezier(0.34, 1.56, 0.64, 1)'; // tiny overshoot on rejoin
    trackAnim(half1.animate([
      { transform: 'translateX(0)' },
      { transform: 'translateX(-12px)', offset: 0.32 },
      { transform: 'translateX(-12px)', offset: 0.68 },
      { transform: 'translateX(0)' }
    ], { duration: 1050, easing: easing, fill: 'forwards' }));
    trackAnim(half2.animate([
      { transform: 'translateX(0)' },
      { transform: 'translateX(12px)', offset: 0.32 },
      { transform: 'translateX(12px)', offset: 0.68 },
      { transform: 'translateX(0)' }
    ], { duration: 1050, easing: easing, fill: 'forwards' }));
    await sleep(1050);
  }

  // ---- 07 The Chariot : motion-blur sweep via ghost trails ----------
  async function chariotMotionBlur(imgEl) {
    const cr = getContentRect(imgEl);
    const src = imgEl.src;
    const base =
      `position:fixed;left:${cr.left}px;top:${cr.top}px;` +
      `width:${cr.width}px;height:${cr.height}px;` +
      `object-fit:fill;pointer-events:none;z-index:39;opacity:0;`;
    const g1 = document.createElement('img'); g1.src = src; g1.style.cssText = base;
    const g2 = document.createElement('img'); g2.src = src; g2.style.cssText = base;
    trackEl(g1); trackEl(g2);
    document.body.appendChild(g1); document.body.appendChild(g2);

    const ease = 'cubic-bezier(0.55, 0, 0.4, 1)';
    trackAnim(g1.animate([
      { opacity: 0,    transform: 'translateX(0)' },
      { opacity: 0.4,  transform: 'translateX(-14px)', offset: 0.4 },
      { opacity: 0.3,  transform: 'translateX(-9px)',  offset: 0.6 },
      { opacity: 0,    transform: 'translateX(0)' }
    ], { duration: 820, easing: ease, fill: 'forwards' }));
    trackAnim(g2.animate([
      { opacity: 0,    transform: 'translateX(0)' },
      { opacity: 0.24, transform: 'translateX(-28px)', offset: 0.4 },
      { opacity: 0.18, transform: 'translateX(-18px)', offset: 0.6 },
      { opacity: 0,    transform: 'translateX(0)' }
    ], { duration: 820, easing: ease, fill: 'forwards' }));
    trackAnim(imgEl.animate([
      { transform: 'translateX(0) scale(1)' },
      { transform: 'translateX(10px) scale(1.006)', offset: 0.5 },
      { transform: 'translateX(0) scale(1)' }
    ], { duration: 820, easing: ease, fill: 'none' }));
    await sleep(820);
  }

  // ---- 08 Strength : ember glow + inset halo ------------------------
  async function strengthEmber(imgEl) {
    const cr = getContentRect(imgEl);
    trackAnim(imgEl.animate([
      { filter: 'brightness(1) saturate(1) contrast(1)' },
      { filter: 'brightness(1.13) saturate(1.22) contrast(1.04)', offset: 0.5 },
      { filter: 'brightness(1) saturate(1) contrast(1)' }
    ], { duration: 950, easing: 'cubic-bezier(0.42, 0, 0.58, 1)', fill: 'none' }));
    const halo = newOverlayDiv(
      `left:${cr.left}px;top:${cr.top}px;width:${cr.width}px;height:${cr.height}px;` +
      `box-shadow:inset 0 0 80px 12px rgba(255,180,90,0);`
    );
    trackAnim(halo.animate([
      { boxShadow: 'inset 0 0 80px 12px rgba(255,180,90,0)' },
      { boxShadow: 'inset 0 0 90px 14px rgba(255,180,90,0.5)', offset: 0.5 },
      { boxShadow: 'inset 0 0 80px 12px rgba(255,180,90,0)' }
    ], { duration: 950, easing: 'cubic-bezier(0.42, 0, 0.58, 1)', fill: 'forwards' }));
    await sleep(950);
  }

  // ---- 09 The Hermit : lantern light sweeps a dimmed card -----------
  async function hermitLantern(imgEl) {
    const cr = getContentRect(imgEl);
    const dim = newOverlayDiv(
      `left:${cr.left}px;top:${cr.top}px;width:${cr.width}px;height:${cr.height}px;` +
      `background:rgba(0,0,0,0.55);`
    );
    const ringSize = cr.width * 0.36;
    const spot = newOverlayDiv(
      `left:${cr.left - ringSize / 2}px;top:${cr.top + cr.height / 2 - ringSize / 2}px;` +
      `width:${ringSize}px;height:${ringSize}px;border-radius:50%;` +
      `background:radial-gradient(circle,rgba(255,235,180,0.85) 0%,rgba(255,210,130,0.35) 30%,rgba(255,180,80,0) 70%);` +
      `mix-blend-mode:screen;`
    );
    const span = cr.width;
    trackAnim(dim.animate([
      { opacity: 0 }, { opacity: 1, offset: 0.15 }, { opacity: 1, offset: 0.85 }, { opacity: 0 }
    ], { duration: 1200, fill: 'forwards' }));
    trackAnim(spot.animate([
      { transform: `translateX(${span * 0.2}px)`, opacity: 0 },
      { transform: `translateX(${span * 0.2}px)`, opacity: 1, offset: 0.15 },
      { transform: `translateX(${span * 0.9}px)`, opacity: 1, offset: 0.85 },
      { transform: `translateX(${span * 0.9}px)`, opacity: 0 }
    ], { duration: 1200, easing: 'cubic-bezier(0.45, 0, 0.55, 1)', fill: 'forwards' }));
    await sleep(1200);
  }

  // ---- 10 The Wheel of Fortune : full rotation with depth dip -------
  async function wheelTurn(imgEl) {
    trackAnim(imgEl.animate([
      { transform: 'rotate(0deg) scale(1)' },
      { transform: 'rotate(180deg) scale(0.955)', offset: 0.5 },
      { transform: 'rotate(360deg) scale(1)' }
    ], { duration: 1050, easing: 'cubic-bezier(0.65, 0, 0.35, 1)', fill: 'none' }));
    await sleep(1050);
  }

  // ---- 11 Justice : the scales balance, then settle -----------------
  async function justiceBalance(imgEl) {
    trackAnim(imgEl.animate([
      { transform: 'rotate(0deg)' },
      { transform: 'rotate(-3.2deg)', offset: 0.22 },
      { transform: 'rotate(2.6deg)',  offset: 0.50 },
      { transform: 'rotate(-1.6deg)', offset: 0.72 },
      { transform: 'rotate(0.8deg)',  offset: 0.88 },
      { transform: 'rotate(0deg)' }
    ], { duration: 1100, easing: 'cubic-bezier(0.34, 1.56, 0.64, 1)', fill: 'none' }));
    await sleep(1100);
  }

  // ---- 12 The Hanged Man : pendulum swing from the top --------------
  async function hangedManSwing(imgEl) {
    imgEl.style.transformOrigin = 'top center';
    trackAnim(imgEl.animate([
      { transform: 'rotate(0deg)' },
      { transform: 'rotate(4deg)',   offset: 0.25 },
      { transform: 'rotate(-3.5deg)', offset: 0.55 },
      { transform: 'rotate(2deg)',   offset: 0.78 },
      { transform: 'rotate(0deg)' }
    ], { duration: 1100, easing: 'cubic-bezier(0.45, 0, 0.55, 1)', fill: 'none' }));
    await sleep(1100);
    imgEl.style.removeProperty('transform-origin');
  }

  // ---- 13 Death : desaturate to monochrome, then return -------------
  async function deathDesaturate(imgEl) {
    trackAnim(imgEl.animate([
      { filter: 'saturate(1) brightness(1)' },
      { filter: 'saturate(0) brightness(0.86)', offset: 0.35 },
      { filter: 'saturate(0) brightness(0.86)', offset: 0.6  },
      { filter: 'saturate(1) brightness(1)' }
    ], { duration: 1050, easing: 'cubic-bezier(0.65, 0, 0.35, 1)', fill: 'none' }));
    await sleep(1050);
  }

  // ---- 14 Temperance : warm and cool cross and blend ----------------
  async function temperanceBlend(imgEl) {
    const cr = getContentRect(imgEl);
    const baseStyle =
      `left:${cr.left}px;top:${cr.top}px;width:${cr.width}px;height:${cr.height}px;` +
      `mix-blend-mode:screen;`;
    const warm = newOverlayDiv(
      baseStyle +
      `background:linear-gradient(135deg,rgba(255,170,80,0.7) 0%,rgba(255,140,50,0.32) 40%,transparent 70%);`
    );
    const cool = newOverlayDiv(
      baseStyle +
      `background:linear-gradient(315deg,rgba(100,170,230,0.7) 0%,rgba(70,140,210,0.32) 40%,transparent 70%);`
    );
    const ease = 'cubic-bezier(0.22, 1, 0.36, 1)';
    trackAnim(warm.animate([
      { opacity: 0,    transform: 'translate(-30px,-30px)' },
      { opacity: 0.95, transform: 'translate(0,0)',         offset: 0.45 },
      { opacity: 0.6,  transform: 'translate(22px,22px)',   offset: 0.7  },
      { opacity: 0,    transform: 'translate(42px,42px)' }
    ], { duration: 1050, easing: ease, fill: 'forwards' }));
    trackAnim(cool.animate([
      { opacity: 0,    transform: 'translate(30px,30px)' },
      { opacity: 0.95, transform: 'translate(0,0)',         offset: 0.45 },
      { opacity: 0.6,  transform: 'translate(-22px,-22px)', offset: 0.7  },
      { opacity: 0,    transform: 'translate(-42px,-42px)' }
    ], { duration: 1050, easing: ease, fill: 'forwards' }));
    await sleep(1050);
  }

  // ---- 15 The Devil : vignette closes in, red shift -----------------
  async function devilVignette(imgEl) {
    const cr = getContentRect(imgEl);
    const v = newOverlayDiv(
      `left:${cr.left}px;top:${cr.top}px;width:${cr.width}px;height:${cr.height}px;` +
      `background:radial-gradient(ellipse at center,transparent 28%,rgba(18,0,0,0.86) 100%);`
    );
    trackAnim(v.animate([
      { opacity: 0,    transform: 'scale(1.35)' },
      { opacity: 0.95, transform: 'scale(0.82)', offset: 0.5 },
      { opacity: 0,    transform: 'scale(1.25)' }
    ], { duration: 880, easing: 'cubic-bezier(0.22, 1, 0.36, 1)', fill: 'forwards' }));
    trackAnim(imgEl.animate([
      { filter: 'hue-rotate(0deg) brightness(1)' },
      { filter: 'hue-rotate(-14deg) brightness(0.88)', offset: 0.5 },
      { filter: 'hue-rotate(0deg) brightness(1)' }
    ], { duration: 880, easing: 'cubic-bezier(0.42, 0, 0.58, 1)', fill: 'none' }));
    await sleep(880);
  }

  // ---- 16 The Tower : lightning flash + aftermath flicker -----------
  async function towerLightning(imgEl) {
    const cr = getContentRect(imgEl);
    const streak = newOverlayDiv(
      `left:${cr.left}px;top:${cr.top}px;width:${cr.width}px;height:${cr.height}px;` +
      `background:linear-gradient(115deg,transparent 38%,rgba(255,255,255,0.95) 49%,rgba(255,250,220,1) 50%,rgba(255,255,255,0.95) 51%,transparent 62%);` +
      `mix-blend-mode:screen;opacity:0;`
    );
    trackAnim(streak.animate([
      { opacity: 0, transform: 'translateX(-32%)' },
      { opacity: 1, transform: 'translateX(0)',    offset: 0.18 },
      { opacity: 1, transform: 'translateX(0)',    offset: 0.34 },
      { opacity: 0, transform: 'translateX(22%)' }
    ], { duration: 720, easing: 'cubic-bezier(0.7, 0, 0.3, 1)', fill: 'forwards' }));
    trackAnim(imgEl.animate([
      { filter: 'brightness(1)' },
      { filter: 'brightness(1.42)', offset: 0.18 },
      { filter: 'brightness(0.78)', offset: 0.36 },
      { filter: 'brightness(0.96)', offset: 0.58 },
      { filter: 'brightness(1)' }
    ], { duration: 720, easing: 'cubic-bezier(0.4, 0, 0.2, 1)', fill: 'none' }));
    await sleep(720);
  }

  // ---- 17 The Star : sparkles twinkle in sequence -------------------
  async function starTwinkle(imgEl) {
    const cr = getContentRect(imgEl);
    // Slightly randomized positions each play, but stay within the card.
    const positions = [
      [0.22, 0.32], [0.78, 0.46], [0.36, 0.7], [0.62, 0.22]
    ];
    const stagger = 170;
    for (let i = 0; i < positions.length; i++) {
      const [px, py] = positions[i];
      const sparkle = newOverlayDiv(
        `left:${cr.left + cr.width * px}px;top:${cr.top + cr.height * py}px;` +
        `width:14px;height:14px;margin:-7px 0 0 -7px;border-radius:50%;` +
        `background:radial-gradient(circle,rgba(255,255,250,1) 0%,rgba(255,240,200,0.6) 30%,transparent 65%);` +
        `box-shadow:0 0 16px 3px rgba(255,240,210,0.55);opacity:0;`
      );
      const startAt = i * stagger;
      setTimeout(() => {
        if (!sparkle.parentNode) return;
        trackAnim(sparkle.animate([
          { opacity: 0, transform: 'scale(0.3)' },
          { opacity: 1, transform: 'scale(1.35)', offset: 0.3 },
          { opacity: 0, transform: 'scale(0.65)' }
        ], { duration: 400, easing: 'cubic-bezier(0.22, 1, 0.36, 1)', fill: 'forwards' }));
      }, startAt);
    }
    await sleep((positions.length - 1) * stagger + 400);
  }

  // ---- 18 The Moon : blue-tinted shimmer wave -----------------------
  async function moonShimmer(imgEl) {
    const cr = getContentRect(imgEl);
    const wave = newOverlayDiv(
      `left:${cr.left}px;top:${cr.top}px;width:${cr.width}px;height:${cr.height}px;` +
      `background:linear-gradient(90deg,transparent 0%,rgba(120,160,210,0.36) 45%,rgba(140,180,230,0.52) 50%,rgba(120,160,210,0.36) 55%,transparent 100%);` +
      `mix-blend-mode:screen;`
    );
    trackAnim(wave.animate([
      { transform: 'translateX(-100%)', opacity: 0 },
      { transform: 'translateX(-25%)',  opacity: 1, offset: 0.22 },
      { transform: 'translateX(55%)',   opacity: 1, offset: 0.75 },
      { transform: 'translateX(100%)',  opacity: 0 }
    ], { duration: 1100, easing: 'cubic-bezier(0.45, 0.05, 0.55, 0.95)', fill: 'forwards' }));
    trackAnim(imgEl.animate([
      { filter: 'hue-rotate(0deg) saturate(1)' },
      { filter: 'hue-rotate(-10deg) saturate(0.88)', offset: 0.5 },
      { filter: 'hue-rotate(0deg) saturate(1)' }
    ], { duration: 1100, easing: 'cubic-bezier(0.42, 0, 0.58, 1)', fill: 'none' }));
    await sleep(1100);
  }

  // ---- 19 The Sun : radial bloom from the center --------------------
  async function sunBloom(imgEl) {
    const cr = getContentRect(imgEl);
    const size = Math.max(cr.width, cr.height) * 1.3;
    const bloom = newOverlayDiv(
      `left:${cr.left + cr.width / 2}px;top:${cr.top + cr.height / 2}px;` +
      `width:${size}px;height:${size}px;` +
      `margin:${-size / 2}px 0 0 ${-size / 2}px;border-radius:50%;` +
      `background:radial-gradient(circle,rgba(255,235,150,0.92) 0%,rgba(255,200,90,0.5) 15%,rgba(255,170,50,0.25) 35%,transparent 60%);` +
      `mix-blend-mode:screen;`
    );
    trackAnim(bloom.animate([
      { transform: 'scale(0.08)', opacity: 0 },
      { transform: 'scale(0.55)', opacity: 1, offset: 0.35 },
      { transform: 'scale(1.18)', opacity: 0 }
    ], { duration: 880, easing: 'cubic-bezier(0.22, 1, 0.36, 1)', fill: 'forwards' }));
    trackAnim(imgEl.animate([
      { filter: 'brightness(1) saturate(1)' },
      { filter: 'brightness(1.18) saturate(1.22)', offset: 0.4 },
      { filter: 'brightness(1) saturate(1)' }
    ], { duration: 880, easing: 'cubic-bezier(0.42, 0, 0.58, 1)', fill: 'none' }));
    await sleep(880);
  }

  // ---- 20 Judgement : bell-tone hum (vertical scale ringing) --------
  async function judgementHum(imgEl) {
    trackAnim(imgEl.animate([
      { transform: 'scaleY(1) scaleX(1)',         filter: 'brightness(1)'    },
      { transform: 'scaleY(1.014) scaleX(0.997)', filter: 'brightness(1.07)', offset: 0.22 },
      { transform: 'scaleY(0.991) scaleX(1.003)', filter: 'brightness(0.96)', offset: 0.42 },
      { transform: 'scaleY(1.006) scaleX(0.999)', filter: 'brightness(1.02)', offset: 0.62 },
      { transform: 'scaleY(0.998) scaleX(1.001)', filter: 'brightness(0.99)', offset: 0.82 },
      { transform: 'scaleY(1) scaleX(1)',         filter: 'brightness(1)'    }
    ], { duration: 1050, easing: 'cubic-bezier(0.42, 0, 0.58, 1)', fill: 'none' }));
    await sleep(1050);
  }

  // ---- 21 The World : luminous ring traces the card boundary --------
  async function worldRing(imgEl) {
    const cr = getContentRect(imgEl);
    const inset = 8;
    const w = cr.width - 2 * inset, h = cr.height - 2 * inset;
    const svg = svgEl('svg');
    svg.style.cssText =
      `position:fixed;left:${cr.left + inset}px;top:${cr.top + inset}px;` +
      `width:${w}px;height:${h}px;pointer-events:none;z-index:40;overflow:visible;`;
    const rect = svgEl('rect', {
      x: 0, y: 0, width: w, height: h, rx: 10, ry: 10, fill: 'none',
      stroke: 'rgba(255,240,200,0.95)', 'stroke-width': 1.8
    });
    rect.style.filter = 'drop-shadow(0 0 6px rgba(255,235,180,0.65))';
    svg.appendChild(rect);
    trackEl(svg); document.body.appendChild(svg);
    const p = 2 * w + 2 * h;
    rect.style.strokeDasharray  = p;
    rect.style.strokeDashoffset = p;
    trackAnim(rect.animate(
      [{ strokeDashoffset: p }, { strokeDashoffset: 0 }],
      { duration: 900, easing: 'cubic-bezier(0.45, 0.05, 0.55, 0.95)', fill: 'forwards' }
    ));
    await sleep(900);
    trackAnim(rect.animate(
      [{ opacity: 1 }, { opacity: 0 }],
      { duration: 320, easing: 'cubic-bezier(0.4, 0, 1, 1)', fill: 'forwards' }
    ));
    await sleep(320);
  }

  // ---- dispatch -----------------------------------------------------
  const EFFECTS = {
    maj00: foolSpark,            maj01: magicianLemniscate,
    maj02: priestessVeil,        maj03: empressBloom,
    maj04: emperorFrame,         maj05: hierophantTransmission,
    maj06: loversSplit,          maj07: chariotMotionBlur,
    maj08: strengthEmber,        maj09: hermitLantern,
    maj10: wheelTurn,            maj11: justiceBalance,
    maj12: hangedManSwing,       maj13: deathDesaturate,
    maj14: temperanceBlend,      maj15: devilVignette,
    maj16: towerLightning,       maj17: starTwinkle,
    maj18: moonShimmer,          maj19: sunBloom,
    maj20: judgementHum,         maj21: worldRing
  };

  function isMajor(name) { return /^maj\d{2}$/.test(name || ''); }

  async function play(imgEl, cardName) {
    clearAll();
    const fn = EFFECTS[cardName];
    if (!fn || !imgEl) return;
    try { await fn(imgEl); }
    catch (_e) { /* never let an effect crash the card flow */ }
    finally { clearAll(); }
  }

  function schedule(imgEl, cardName, delayMs) {
    clearAll();
    if (!isMajor(cardName)) return;
    activeTimer = setTimeout(function () {
      activeTimer = null;
      play(imgEl, cardName);
    }, delayMs);
  }

  // Honor prefers-reduced-motion: short-circuit to no effect. Card just
  // sits there normally, no signature plays. (Reversal logic, which uses
  // its own reduced-motion handling, is unaffected.)
  const reduceMotion =
    window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  window.MajorArcanaSignature = {
    isMajor: isMajor,
    play:    reduceMotion ? function () {} : play,
    cancel:  clearAll,
    schedule: reduceMotion ? function () {} : schedule
  };
})();
