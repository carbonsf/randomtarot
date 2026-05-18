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

  // ---- 02 The High Priestess : the all-seeing eye --------------------
  // Vignette closes in around the card; a vertical dark pupil emerges
  // at center, dilates, then expands outward and dissolves — the gaze
  // through the veil, rather than the veil sliding past. The SVG group
  // is scaled via CSS transforms so the pupil grows organically.
  async function priestessVeil(imgEl) {
    const cr = getContentRect(imgEl);

    // Slow vignette closing in: edges darken so the eye reads as
    // emerging from the card's depths, not painted over its surface.
    const vignette = newOverlayDiv(
      `left:${cr.left}px;top:${cr.top}px;width:${cr.width}px;height:${cr.height}px;` +
      `background:radial-gradient(ellipse 82% 72% at center, transparent 28%, rgba(4,6,14,0.9) 96%);`
    );
    trackAnim(vignette.animate([
      { opacity: 0, transform: 'scale(1.25)' },
      { opacity: 1, transform: 'scale(1)',    offset: 0.22 },
      { opacity: 1, transform: 'scale(1)',    offset: 0.74 },
      { opacity: 0, transform: 'scale(1.18)' }
    ], { duration: 1300, easing: 'cubic-bezier(0.42, 0, 0.58, 1)', fill: 'forwards' }));

    // SVG containing iris + pupil. Both are vertical ellipses (taller
    // than wide) — the elongation reads as something other than a
    // simple human eye, leaning toward the uncanny.
    const svg = svgEl('svg');
    svg.setAttribute('viewBox', `0 0 ${cr.width} ${cr.height}`);
    svg.style.cssText =
      `position:fixed;left:${cr.left}px;top:${cr.top}px;` +
      `width:${cr.width}px;height:${cr.height}px;` +
      `pointer-events:none;z-index:41;overflow:visible;`;

    const minDim = Math.min(cr.width, cr.height);
    const baseR  = minDim * 0.045;

    const g = svgEl('g');
    g.style.transformOrigin = `${cr.width / 2}px ${cr.height / 2}px`;
    g.style.transform = `translate(${cr.width / 2}px, ${cr.height / 2}px) scale(0)`;

    // Faint iris ring around the pupil — implies an eye without
    // drawing a full eyeball outline.
    const iris = svgEl('ellipse', {
      cx: 0, cy: 0,
      rx: baseR * 1.6, ry: baseR * 2.4,
      fill: 'none', stroke: 'rgba(190,200,225,0.62)', 'stroke-width': 1.6
    });
    iris.style.filter = 'drop-shadow(0 0 6px rgba(180,200,230,0.65))';
    g.appendChild(iris);

    // Pupil — dark elongated ellipse, slightly taller than the iris's
    // ratio so it reads as a vertical slit rather than a round dot.
    const pupil = svgEl('ellipse', {
      cx: 0, cy: 0,
      rx: baseR, ry: baseR * 1.6,
      fill: 'rgba(0,0,0,0.96)'
    });
    pupil.style.filter = 'drop-shadow(0 0 7px rgba(0,0,0,0.85))';
    g.appendChild(pupil);

    svg.appendChild(g);
    trackEl(svg); document.body.appendChild(svg);

    // Let the vignette close in before the pupil emerges.
    await sleep(290);

    // Emerge, dilate, then expand outward as it dissolves. The end
    // state's scale(2.3) carries the gaze beyond the card before it
    // vanishes — that final expansion is what makes the moment land
    // as "the eye opens" rather than "a dot appeared."
    trackAnim(g.animate([
      { transform: `translate(${cr.width / 2}px, ${cr.height / 2}px) scale(0)`,    opacity: 0 },
      { transform: `translate(${cr.width / 2}px, ${cr.height / 2}px) scale(0.9)`,  opacity: 1, offset: 0.30 },
      { transform: `translate(${cr.width / 2}px, ${cr.height / 2}px) scale(1.45)`, opacity: 1, offset: 0.62 },
      { transform: `translate(${cr.width / 2}px, ${cr.height / 2}px) scale(1.55)`, opacity: 0.85, offset: 0.78 },
      { transform: `translate(${cr.width / 2}px, ${cr.height / 2}px) scale(2.3)`,  opacity: 0 }
    ], { duration: 870, easing: 'cubic-bezier(0.22, 1, 0.36, 1)', fill: 'forwards' }));
    await sleep(870);

    // Let the vignette finish releasing.
    await sleep(160);
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

  // ---- 04 The Emperor : the seal stamps, four corners snap in -------
  // Four L-shaped corner brackets snap inward from outside the card
  // with overshoot bezier. When they settle, a brief impact pulse
  // lifts both the brackets' brightness and the card itself — the
  // authority lands, the structure is asserted. Then everything fades.
  async function emperorFrame(imgEl) {
    const cr = getContentRect(imgEl);
    const armLen = Math.min(cr.width, cr.height) * 0.21;
    const thick = 3;

    // Where the L-arms attach (h_top / v_left position the bars within
    // the wrap so the inner angle of the L points toward the card).
    const cornerDefs = [
      { lx: 0,                   ly: 0,                   h_top: 0,            v_left: 0,            ox: -1, oy: -1 },
      { lx: cr.width  - armLen,  ly: 0,                   h_top: 0,            v_left: armLen-thick, ox:  1, oy: -1 },
      { lx: 0,                   ly: cr.height - armLen,  h_top: armLen-thick, v_left: 0,            ox: -1, oy:  1 },
      { lx: cr.width  - armLen,  ly: cr.height - armLen,  h_top: armLen-thick, v_left: armLen-thick, ox:  1, oy:  1 }
    ];
    const barCss =
      'background:rgba(255,250,235,0.97);' +
      'box-shadow:0 0 12px 1px rgba(255,240,200,0.78);';
    const brackets = [];
    for (const c of cornerDefs) {
      const wrap = newOverlayDiv(
        `left:${cr.left + c.lx}px;top:${cr.top + c.ly}px;` +
        `width:${armLen}px;height:${armLen}px;opacity:0;`
      );
      const h = document.createElement('div');
      h.style.cssText =
        `position:absolute;left:0;top:${c.h_top}px;` +
        `width:${armLen}px;height:${thick}px;` + barCss;
      const v = document.createElement('div');
      v.style.cssText =
        `position:absolute;top:0;left:${c.v_left}px;` +
        `width:${thick}px;height:${armLen}px;` + barCss;
      wrap.appendChild(h); wrap.appendChild(v);
      brackets.push({ wrap, ox: c.ox, oy: c.oy });
    }

    // Snap-in: each bracket flies from ~1.4 arm-lengths outside the
    // card, then settles into the corner with overshoot.
    const snap = 380;
    for (const b of brackets) {
      const sx = b.ox * armLen * 1.4;
      const sy = b.oy * armLen * 1.4;
      trackAnim(b.wrap.animate(
        [{ transform: `translate(${sx}px,${sy}px)`, opacity: 0 },
         { transform: 'translate(0,0)',              opacity: 1 }],
        { duration: snap, easing: 'cubic-bezier(0.34, 1.5, 0.64, 1)', fill: 'forwards' }
      ));
    }
    await sleep(snap);

    // Impact: brightness/scale pulse on the card, brightness pulse on
    // the brackets. Lands as a "stamp" rather than a "fade."
    trackAnim(imgEl.animate([
      { transform: 'scale(1)',     filter: 'brightness(1)'    },
      { transform: 'scale(1.014)', filter: 'brightness(1.13)', offset: 0.32 },
      { transform: 'scale(1)',     filter: 'brightness(1)'    }
    ], { duration: 320, easing: 'cubic-bezier(0.34, 1.4, 0.64, 1)', fill: 'none' }));
    for (const b of brackets) {
      trackAnim(b.wrap.animate(
        [{ filter: 'brightness(1)' },
         { filter: 'brightness(1.55)', offset: 0.32 },
         { filter: 'brightness(1)' }],
        { duration: 320, fill: 'none' }
      ));
    }
    await sleep(320);
    await sleep(140); // a beat of held authority before fading

    for (const b of brackets) {
      trackAnim(b.wrap.animate(
        [{ opacity: 1 }, { opacity: 0 }],
        { duration: 340, easing: 'cubic-bezier(0.4, 0, 1, 1)', fill: 'forwards' }
      ));
    }
    await sleep(340);
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

  // ---- 09 The Hermit : the lantern swings on a damped pendulum ------
  // The lantern follows a parabolic arc, swinging back and forth with
  // pendulum-like motion. Position is governed by cos(omega*t) *
  // exp(-decay*t), naturally producing the pendulum's signature speed
  // profile — fast through the bottom of the swing, slow at the
  // extremes where it briefly hangs before reversing. Three visible
  // swings of decreasing amplitude, ending near rest.
  //
  // Forty pre-computed keyframes give the curve enough resolution
  // that linear interpolation between them reads as smooth motion.
  async function hermitLantern(imgEl) {
    const cr = getContentRect(imgEl);
    const cx = cr.left + cr.width / 2;
    const yRest = cr.top + cr.height * 0.72;  // bottom of swing arc
    const yHigh = cr.top + cr.height * 0.22;  // top of swing at extremes
    const rx    = cr.width * 0.38;            // horizontal swing amplitude
    const lanternSize = cr.width * 0.42;

    const dim = newOverlayDiv(
      `left:${cr.left}px;top:${cr.top}px;` +
      `width:${cr.width}px;height:${cr.height}px;background:rgba(6,8,16,0.58);`
    );
    const lantern = newOverlayDiv(
      `left:${cx - lanternSize / 2}px;top:${yRest - lanternSize / 2}px;` +
      `width:${lanternSize}px;height:${lanternSize}px;border-radius:50%;` +
      `background:radial-gradient(circle,rgba(255,235,180,0.92) 0%,rgba(255,210,130,0.45) 25%,rgba(255,180,80,0) 65%);` +
      `mix-blend-mode:screen;opacity:0;`
    );

    const totalMs = 1500;
    const N = 40;
    const omega = 2 * Math.PI * 1.05; // ~1.05 oscillation cycles per second
    const decay = 0.85;               // amplitude e-folds in ~1.18s

    const lanternKeys = [];
    const dimKeys     = [];
    for (let i = 0; i <= N; i++) {
      const t  = i / N;
      const ts = t * totalMs / 1000;
      const theta = Math.cos(omega * ts) * Math.exp(-decay * ts);
      const dx = rx * theta;
      const dy = (yHigh - yRest) * (theta * theta);
      // Opacity envelope: fade in over first 8%, fade out over last 8%.
      let op = 1;
      if      (t < 0.08) op = t / 0.08;
      else if (t > 0.92) op = (1 - t) / 0.08;
      // Slight scale lift near the apex of each swing so the lantern
      // feels brighter when held high.
      const sc = 0.92 + 0.10 * Math.abs(theta);
      lanternKeys.push({
        transform: `translate(${dx.toFixed(2)}px, ${dy.toFixed(2)}px) scale(${sc.toFixed(4)})`,
        opacity: op.toFixed(4),
        offset: parseFloat(t.toFixed(6))
      });
      dimKeys.push({ opacity: op.toFixed(4), offset: parseFloat(t.toFixed(6)) });
    }

    trackAnim(lantern.animate(lanternKeys, { duration: totalMs, fill: 'forwards' }));
    trackAnim(dim.animate(    dimKeys,     { duration: totalMs, fill: 'forwards' }));
    await sleep(totalMs);
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

  // ---- 13 Death : sudden inversion, then a long classy return -------
  // The hit is fast and ugly: in ~180ms the card slams to nearly
  // inverted, fully desaturated, dimmed, and lifted in contrast — a
  // flinch-response moment. The return takes the rest of the time
  // and uses a deep ease-out so color, light, and orientation drift
  // back gracefully rather than being released all at once.
  async function deathDesaturate(imgEl) {
    trackAnim(imgEl.animate([
      { filter: 'brightness(1)    saturate(1) invert(0)    contrast(1)' },
      { filter: 'brightness(0.38) saturate(0) invert(0.92) contrast(1.3)',
        offset: 0.09,
        easing: 'cubic-bezier(0.72, 0, 0.28, 1)' },
      { filter: 'brightness(0.4)  saturate(0) invert(0.9)  contrast(1.3)',
        offset: 0.22,
        easing: 'linear' },
      { filter: 'brightness(1)    saturate(1) invert(0)    contrast(1)',
        offset: 1,
        easing: 'cubic-bezier(0.16, 1, 0.3, 1)' }
    ], { duration: 2000, fill: 'none' }));
    await sleep(2000);
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

  // ---- 15 The Devil : dark tendrils creep inward from the edges -----
  // Eight organic curving paths grow inward from the card's edges,
  // like infection spreading along veins. Each is an SVG path with
  // its stroke "drawn on" via animated stroke-dashoffset, so the
  // tendril visibly creeps along its curve rather than appearing all
  // at once. The card itself takes on a brief crimson hue-shift as
  // the infection spreads, then both release.
  //
  // The path control points are chosen to be visibly different from
  // each other (different starting edges, different curvatures, some
  // doubling back) — no two tendrils share an obvious symmetry.
  async function devilVignette(imgEl) {
    const cr = getContentRect(imgEl);
    const w = cr.width, h = cr.height;

    const svg = svgEl('svg');
    svg.setAttribute('viewBox', `0 0 ${w} ${h}`);
    svg.style.cssText =
      `position:fixed;left:${cr.left}px;top:${cr.top}px;` +
      `width:${w}px;height:${h}px;` +
      `pointer-events:none;z-index:40;overflow:visible;`;

    // Tendril path definitions. Each starts outside the card (negative
    // coord or > size) and curves to an interior endpoint via 2-3
    // quadratic segments — chained with T commands for smooth flow.
    const tendrils = [
      // from top edge
      { d: `M ${w*0.15} ${-15} Q ${w*0.21} ${h*0.18}, ${w*0.32} ${h*0.42} T ${w*0.28} ${h*0.72}`, sw: 5 },
      { d: `M ${w*0.58} ${-15} Q ${w*0.54} ${h*0.14}, ${w*0.68} ${h*0.38} T ${w*0.63} ${h*0.62}`, sw: 4 },
      // from bottom edge
      { d: `M ${w*0.24} ${h+15} Q ${w*0.36} ${h*0.7}, ${w*0.41} ${h*0.44} T ${w*0.5}  ${h*0.22}`, sw: 4 },
      { d: `M ${w*0.76} ${h+15} Q ${w*0.66} ${h*0.66}, ${w*0.55} ${h*0.4}  T ${w*0.6}  ${h*0.16}`, sw: 5 },
      // from left edge
      { d: `M ${-15}    ${h*0.3}  Q ${w*0.22} ${h*0.4}, ${w*0.38} ${h*0.36} T ${w*0.52} ${h*0.56}`, sw: 4 },
      { d: `M ${-15}    ${h*0.72} Q ${w*0.16} ${h*0.6}, ${w*0.34} ${h*0.7}  T ${w*0.48} ${h*0.84}`, sw: 3 },
      // from right edge
      { d: `M ${w+15}   ${h*0.26} Q ${w*0.76} ${h*0.36}, ${w*0.6}  ${h*0.46} T ${w*0.5}  ${h*0.62}`, sw: 4 },
      { d: `M ${w+15}   ${h*0.78} Q ${w*0.82} ${h*0.7},  ${w*0.66} ${h*0.62} T ${w*0.56} ${h*0.42}`, sw: 3 }
    ];

    const pathEls = [];
    for (const t of tendrils) {
      const path = svgEl('path', {
        d: t.d, fill: 'none',
        stroke: 'rgba(38,4,8,0.92)',
        'stroke-width': t.sw,
        'stroke-linecap': 'round'
      });
      path.style.filter = 'drop-shadow(0 0 5px rgba(82,12,18,0.78))';
      svg.appendChild(path);
      const len = path.getTotalLength();
      path.style.strokeDasharray  = len;
      path.style.strokeDashoffset = len;
      pathEls.push({ path, len, growMs: 620 + Math.random() * 260 });
    }
    trackEl(svg); document.body.appendChild(svg);

    // The card slowly becomes feverish — slight crimson hue-shift,
    // reduced brightness — while the tendrils are spreading.
    trackAnim(imgEl.animate([
      { filter: 'hue-rotate(0deg)   saturate(1)    brightness(1)'    },
      { filter: 'hue-rotate(-16deg) saturate(1.18) brightness(0.86)', offset: 0.42 },
      { filter: 'hue-rotate(-16deg) saturate(1.18) brightness(0.86)', offset: 0.62 },
      { filter: 'hue-rotate(0deg)   saturate(1)    brightness(1)'    }
    ], { duration: 1700, easing: 'cubic-bezier(0.42, 0, 0.58, 1)', fill: 'none' }));

    // Each tendril starts growing a moment after the previous one —
    // not synchronized — so it reads as creeping, not appearing.
    for (let i = 0; i < pathEls.length; i++) {
      const { path, len, growMs } = pathEls[i];
      const startDelay = i * 65 + Math.random() * 20;
      setTimeout(() => {
        if (!path.parentNode) return;
        trackAnim(path.animate(
          [{ strokeDashoffset: len }, { strokeDashoffset: 0 }],
          { duration: growMs, easing: 'cubic-bezier(0.34, 0.88, 0.46, 1)', fill: 'forwards' }
        ));
      }, startDelay);
    }
    // Last tendril starts at ~520ms in, grows for ~750ms ≈ done by 1270ms
    await sleep(1280);

    // Brief hold at full infection
    await sleep(200);

    // Fade out the tendrils — each fades independently for a slightly
    // staggered withdrawal, like the infection retreating.
    for (let i = 0; i < pathEls.length; i++) {
      const { path } = pathEls[i];
      setTimeout(() => {
        if (!path.parentNode) return;
        trackAnim(path.animate(
          [{ opacity: 1 }, { opacity: 0 }],
          { duration: 380, easing: 'cubic-bezier(0.4, 0, 1, 1)', fill: 'forwards' }
        ));
      }, i * 22);
    }
    await sleep(380 + (pathEls.length - 1) * 22);
  }

  // ---- 16 The Tower : flash, crumble with gravity, ominous return ---
  // Full-screen lightning flash, then the card shatters into a 4x4
  // grid of fragments that fall under gravity (with horizontal drift
  // and angular tumble), exiting the bottom of the viewport. After a
  // dark beat, the card fades back in slowly and dimly — survivor
  // light returning. Long-form, gravitas.
  //
  // Each chunk is a clone <img> with clip-path: inset() restricting
  // it to one cell of the grid. Position-keyframes are computed from
  // ballistic equations: y = vy0*t + 0.5*g*t^2, plus random vx and
  // angular velocity per chunk. Lower-row chunks get a small lead so
  // the structure collapses from the bottom up.
  async function towerLightning(imgEl) {
    const cr = getContentRect(imgEl);
    const src = imgEl.src;

    // --- Phase 1: full-screen flash ---
    const flash = newOverlayDiv(
      `inset:0;width:100vw;height:100vh;background:rgb(255,255,250);z-index:50;opacity:0;`
    );
    trackAnim(flash.animate([
      { opacity: 0 },
      { opacity: 1,    offset: 0.42, easing: 'cubic-bezier(0.7, 0, 1, 1)' },
      { opacity: 0.95, offset: 0.55 },
      { opacity: 0,                  easing: 'cubic-bezier(0.4, 0, 0.6, 1)' }
    ], { duration: 240, fill: 'forwards' }));

    // Card brightens during the strike.
    trackAnim(imgEl.animate([
      { filter: 'brightness(1)' },
      { filter: 'brightness(1.7) contrast(1.18)', offset: 0.42 },
      { filter: 'brightness(1)' }
    ], { duration: 240, fill: 'none' }));

    // Wait until the flash peak, then build the chunks. They appear
    // hidden by the flash's brightness, so the transition from "whole
    // card" to "16 chunks" is masked.
    await sleep(110);

    // --- Phase 2: build the chunk grid ---
    const rows = 4, cols = 4;
    const chunks = [];
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const ch = document.createElement('img');
        ch.src = src;
        ch.style.cssText =
          `position:fixed;left:${cr.left}px;top:${cr.top}px;` +
          `width:${cr.width}px;height:${cr.height}px;object-fit:fill;` +
          `pointer-events:none;z-index:39;` +
          `clip-path:inset(${(r*100/rows).toFixed(3)}% ${((cols-c-1)*100/cols).toFixed(3)}% ${((rows-r-1)*100/rows).toFixed(3)}% ${(c*100/cols).toFixed(3)}%);`;
        trackEl(ch);
        document.body.appendChild(ch);
        chunks.push({ el: ch, r: r, c: c });
      }
    }

    // Hide the original. The chunks now visually represent the card.
    trackAnim(imgEl.animate([
      { opacity: 1 }, { opacity: 0 }
    ], { duration: 60, fill: 'forwards' }));

    // --- Phase 3: chunks fall ---
    // Ballistic motion: dy = vy0*t + 0.5*g*t^2.  Lower rows go first
    // (the foundation gives way), upper rows hang an extra moment.
    const fallMs = 1400;
    const g = 1800; // px / s^2
    const fallPromises = [];
    for (const { el, r, c } of chunks) {
      const vy0 = 20 + r * 26 + Math.random() * 45;        // px/s downward
      const vx0 = (Math.random() - 0.5) * 140;             // px/s lateral
      const omega = (Math.random() - 0.5) * 420;           // deg/s rotation
      const startDelay = (rows - 1 - r) * 40 + Math.random() * 30;

      const N = 18;
      const keys = [];
      for (let i = 0; i <= N; i++) {
        const t = i / N;
        const tau = t * fallMs / 1000;
        const dy = vy0 * tau + 0.5 * g * tau * tau;
        const dx = vx0 * tau;
        const rot = omega * tau;
        const op = (t > 0.86) ? Math.max(0, 1 - (t - 0.86) / 0.14) : 1;
        keys.push({
          transform: `translate(${dx.toFixed(1)}px, ${dy.toFixed(1)}px) rotate(${rot.toFixed(1)}deg)`,
          opacity: op.toFixed(3),
          offset: parseFloat(t.toFixed(5))
        });
      }
      setTimeout(() => {
        if (!el.parentNode) return;
        trackAnim(el.animate(keys, { duration: fallMs, fill: 'forwards' }));
      }, startDelay);
      fallPromises.push(startDelay + fallMs);
    }
    // Wait until the longest-delayed chunk finishes its fall.
    const longestFall = Math.max(...fallPromises);
    await sleep(longestFall + 60);

    // --- Phase 4: dark beat, the world holds its breath ---
    await sleep(360);

    // --- Phase 5: card fades back in, dimly and ominously ---
    // Starts very dark and desaturated, drifts up to full only at the
    // tail of the bezier — the recovery feels reluctant rather than
    // grateful.
    trackAnim(imgEl.animate([
      { opacity: 0, filter: 'brightness(0.18) saturate(0.35)' },
      { opacity: 1, filter: 'brightness(1)    saturate(1)' }
    ], { duration: 1200, easing: 'cubic-bezier(0.16, 1, 0.3, 1)', fill: 'forwards' }));
    await sleep(1200);
  }

  // ---- 17 The Star : eight 4-point sparkles in a constellation ------
  // Each sparkle is a 4-point SVG star (cross-shaped with a bright
  // core), drop-shadowed for halo, rotating slightly as it brightens
  // and fades. Eight sparkles in sequence across ~2.3 seconds — long
  // enough to feel like a constellation forming, not a single twinkle.
  async function starTwinkle(imgEl) {
    const cr = getContentRect(imgEl);
    const positions = [
      [0.18, 0.28], [0.78, 0.42], [0.36, 0.72], [0.62, 0.20],
      [0.50, 0.50], [0.24, 0.56], [0.72, 0.70], [0.42, 0.14]
    ];
    const stagger = 240;
    const lifeMs  = 620;

    for (let i = 0; i < positions.length; i++) {
      const [px, py] = positions[i];
      const cx = cr.left + cr.width  * px;
      const cy = cr.top  + cr.height * py;
      const size = 18;

      const svg = svgEl('svg');
      svg.style.cssText =
        `position:fixed;left:${cx}px;top:${cy}px;` +
        `width:1px;height:1px;overflow:visible;` +
        `pointer-events:none;z-index:40;opacity:0;`;
      // 4-point star: long arms on cardinal directions, thin waist.
      const star = svgEl('path', {
        d: `M0 ${-size} L${size*0.18} ${-size*0.18} L${size} 0 ` +
           `L${size*0.18} ${size*0.18} L0 ${size} L${-size*0.18} ${size*0.18} ` +
           `L${-size} 0 L${-size*0.18} ${-size*0.18} Z`,
        fill: 'rgba(255,250,230,0.97)'
      });
      star.style.filter =
        'drop-shadow(0 0 11px rgba(255,235,180,0.88)) ' +
        'drop-shadow(0 0 4px  rgba(255,250,220,1))';
      svg.appendChild(star);
      trackEl(svg); document.body.appendChild(svg);

      const startAt = i * stagger;
      setTimeout(() => {
        if (!svg.parentNode) return;
        trackAnim(svg.animate([
          { opacity: 0,    transform: 'scale(0.2) rotate(0deg)' },
          { opacity: 1,    transform: 'scale(1.55) rotate(18deg)', offset: 0.32 },
          { opacity: 0.85, transform: 'scale(1.25) rotate(34deg)', offset: 0.58 },
          { opacity: 0,    transform: 'scale(0.6)  rotate(52deg)' }
        ], { duration: lifeMs, easing: 'cubic-bezier(0.22, 1, 0.36, 1)', fill: 'forwards' }));
      }, startAt);
    }
    await sleep((positions.length - 1) * stagger + lifeMs + 140);
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

  // ---- 19 The Sun : starburst bloom with radial rays ----------------
  // The central bloom is bigger and bolder than the original; on top
  // of it, sixteen radial rays project outward from the card center
  // (an SVG starburst), rotating slightly as they extend. The card
  // brightens and saturates significantly at the peak. Longer than
  // before for full sunrise gravitas.
  async function sunBloom(imgEl) {
    const cr = getContentRect(imgEl);
    const cx = cr.left + cr.width / 2;
    const cy = cr.top  + cr.height / 2;
    const maxDim = Math.max(cr.width, cr.height);

    // Inner bloom — bigger and more saturated than the prior version.
    const bloomSize = maxDim * 1.6;
    const bloom = newOverlayDiv(
      `left:${cx}px;top:${cy}px;` +
      `width:${bloomSize}px;height:${bloomSize}px;` +
      `margin:${-bloomSize / 2}px 0 0 ${-bloomSize / 2}px;border-radius:50%;` +
      `background:radial-gradient(circle,rgba(255,240,170,0.95) 0%,rgba(255,210,100,0.55) 14%,rgba(255,170,50,0.28) 32%,transparent 58%);` +
      `mix-blend-mode:screen;`
    );
    trackAnim(bloom.animate([
      { transform: 'scale(0.05)', opacity: 0 },
      { transform: 'scale(0.40)', opacity: 1,   offset: 0.22 },
      { transform: 'scale(0.85)', opacity: 1,   offset: 0.50 },
      { transform: 'scale(1.10)', opacity: 0.5, offset: 0.78 },
      { transform: 'scale(1.40)', opacity: 0 }
    ], { duration: 1500, easing: 'cubic-bezier(0.22, 1, 0.36, 1)', fill: 'forwards' }));

    // Card itself: stronger brightness/saturation lift at the peak.
    trackAnim(imgEl.animate([
      { filter: 'brightness(1)    saturate(1)' },
      { filter: 'brightness(1.30) saturate(1.34)', offset: 0.40 },
      { filter: 'brightness(1.12) saturate(1.18)', offset: 0.70 },
      { filter: 'brightness(1)    saturate(1)' }
    ], { duration: 1500, easing: 'cubic-bezier(0.42, 0, 0.58, 1)', fill: 'none' }));

    // Wait briefly for the bloom to begin, then launch the rays so
    // they appear to emanate FROM the bloom rather than alongside it.
    await sleep(280);

    // Sixteen radial rays as SVG <line> elements rotated around the
    // card center. The whole assembly scales and rotates slightly so
    // the rays read as alive, not static.
    const raySvg = svgEl('svg');
    raySvg.style.cssText =
      `position:fixed;left:${cx}px;top:${cy}px;` +
      `width:1px;height:1px;overflow:visible;` +
      `pointer-events:none;z-index:40;`;
    const numRays = 16;
    const rayLen   = maxDim * 0.95;
    const rayInner = maxDim * 0.16;
    for (let i = 0; i < numRays; i++) {
      const angle = (i / numRays) * 360;
      const ray = svgEl('line', {
        x1: 0, y1: -rayInner,
        x2: 0, y2: -(rayInner + rayLen),
        stroke: 'rgba(255,235,170,0.85)',
        'stroke-width': 2.5,
        'stroke-linecap': 'round',
        transform: `rotate(${angle})`
      });
      ray.style.filter = 'drop-shadow(0 0 8px rgba(255,220,120,0.9))';
      raySvg.appendChild(ray);
    }
    trackEl(raySvg); document.body.appendChild(raySvg);
    trackAnim(raySvg.animate([
      { transform: 'scale(0.25) rotate(0deg)',  opacity: 0   },
      { transform: 'scale(1.00) rotate(16deg)', opacity: 1,   offset: 0.32 },
      { transform: 'scale(1.18) rotate(30deg)', opacity: 0.7, offset: 0.66 },
      { transform: 'scale(1.45) rotate(46deg)', opacity: 0 }
    ], { duration: 1180, easing: 'cubic-bezier(0.22, 1, 0.36, 1)', fill: 'forwards' }));

    await sleep(1220);
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

  // ---- 21 The World : double-ring wreath + halo pulse outward -------
  // Two concentric rounded-rect rings trace around the card together:
  // an outer thick blurred glow and a crisp inner stroke. They're
  // bolder and brighter than a single thin ring would be. Once
  // traced, the whole assembly scales outward and dissolves as a halo
  // — completion expanding into the world beyond the card.
  async function worldRing(imgEl) {
    const cr = getContentRect(imgEl);
    const inset = 12;
    const w = cr.width - 2 * inset, h = cr.height - 2 * inset;
    const r = 18;
    const svg = svgEl('svg');
    svg.style.cssText =
      `position:fixed;left:${cr.left + inset}px;top:${cr.top + inset}px;` +
      `width:${w}px;height:${h}px;` +
      `pointer-events:none;z-index:40;overflow:visible;`;
    // Scale the halo around its own center, not the viewport origin.
    svg.style.transformOrigin = 'center center';

    // Outer halo: thick, blurred, warm. Provides the glow.
    const outer = svgEl('rect', {
      x: 0, y: 0, width: w, height: h, rx: r, ry: r, fill: 'none',
      stroke: 'rgba(255,225,150,0.62)', 'stroke-width': 8
    });
    outer.style.filter = 'drop-shadow(0 0 14px rgba(255,225,150,0.9)) blur(2px)';
    svg.appendChild(outer);

    // Inner ring: crisp, almost-white, defines the boundary.
    const inner = svgEl('rect', {
      x: 0, y: 0, width: w, height: h, rx: r, ry: r, fill: 'none',
      stroke: 'rgba(255,250,220,0.98)', 'stroke-width': 2.5
    });
    inner.style.filter = 'drop-shadow(0 0 8px rgba(255,240,200,0.8))';
    svg.appendChild(inner);

    trackEl(svg); document.body.appendChild(svg);

    // Approximate perimeter for stroke-dasharray; close enough for
    // visual purposes that the two rings start and end together.
    const p = 2 * (w + h) - 8 * r + 2 * Math.PI * r;
    outer.style.strokeDasharray  = p;
    outer.style.strokeDashoffset = p;
    inner.style.strokeDasharray  = p;
    inner.style.strokeDashoffset = p;

    const traceMs = 950;
    trackAnim(outer.animate(
      [{ strokeDashoffset: p }, { strokeDashoffset: 0 }],
      { duration: traceMs, easing: 'cubic-bezier(0.45, 0.05, 0.55, 0.95)', fill: 'forwards' }
    ));
    trackAnim(inner.animate(
      [{ strokeDashoffset: p }, { strokeDashoffset: 0 }],
      { duration: traceMs, easing: 'cubic-bezier(0.45, 0.05, 0.55, 0.95)', fill: 'forwards' }
    ));
    await sleep(traceMs);

    // Halo pulse outward: the completed ring scales beyond the card
    // and dissolves. Easing peaks early so the expansion feels like
    // release rather than effort.
    trackAnim(svg.animate([
      { transform: 'scale(1)',    opacity: 1   },
      { transform: 'scale(1.06)', opacity: 0.85, offset: 0.45 },
      { transform: 'scale(1.16)', opacity: 0 }
    ], { duration: 520, easing: 'cubic-bezier(0.22, 1, 0.36, 1)', fill: 'forwards' }));
    await sleep(520);
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
