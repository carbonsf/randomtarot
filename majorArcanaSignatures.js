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
  // Which deck is active ("rw" | "thoth"). A few effects whose geometry
  // depends on where art sits on the card (currently just the Sun) read
  // this to pick per-deck coordinates. Set via the public setDeck().
  let activeDeck = "rw";

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

  // ---- 00 The Fool : skipping star with comet trail -----------------
  // A 4-point star travels across the card on a bouncy curving path —
  // diagonal lower-left to upper-right, with perpendicular sine wobble
  // plus a vertical "skip" bounce so it reads as hopping rather than
  // gliding. Four smaller echo-stars trail behind in time, each with
  // its own staggered start, so the spark leaves a comet-tail of past
  // positions. Every star spins as it moves. The card sways gently
  // side-to-side. Whimsical without exploding.
  async function foolSpark(imgEl) {
    const cr = getContentRect(imgEl);
    const totalMs = 1700;

    // Card sways like it's bobbing along with the spark.
    trackAnim(imgEl.animate([
      { transform: 'rotate(0deg)    translateY(0)' },
      { transform: 'rotate(0.7deg)  translateY(-2px)', offset: 0.30 },
      { transform: 'rotate(-0.5deg) translateY(0)',    offset: 0.65 },
      { transform: 'rotate(0deg)    translateY(0)' }
    ], { duration: totalMs, easing: 'cubic-bezier(0.45, 0, 0.55, 1)', fill: 'none' }));

    // Path: lower-left to upper-right, with perpendicular sine wobble
    // and a vertical skipping bounce. The path is shared across all
    // five stars; echoes simply lag in time so they follow the same
    // curve a beat behind.
    const startX = cr.left + cr.width  * 0.15;
    const startY = cr.top  + cr.height * 0.80;
    const endX   = cr.left + cr.width  * 0.85;
    const endY   = cr.top  + cr.height * 0.18;
    const dx = endX - startX, dy = endY - startY;
    const len = Math.sqrt(dx * dx + dy * dy);
    const ux = dx / len, uy = dy / len;     // path direction unit vector
    const perpX = -uy,  perpY = ux;         // perpendicular to it

    function position(t) {
      // Linear progress along the path.
      const linX = startX + dx * t;
      const linY = startY + dy * t;
      // Sine wobble perpendicular to direction (2 cycles, slight decay
      // so the path tightens toward the destination).
      const wobble = 38 * Math.sin(2 * Math.PI * 2 * t) * (1 - t * 0.3);
      // Skipping bounce: |sin| gives consecutive hops (always upward,
      // never below the path line). Decays toward arrival.
      const bounce = -16 * Math.abs(Math.sin(3 * Math.PI * t)) * (1 - t * 0.3);
      return {
        x: linX + perpX * wobble,
        y: linY + perpY * wobble + bounce
      };
    }

    // Configs: main spark + four progressively-smaller-and-dimmer
    // echoes trailing behind.
    const sparkConfigs = [
      { size: 22, delay:   0, opMul: 1.00 },   // main
      { size: 18, delay:  55, opMul: 0.65 },
      { size: 15, delay: 115, opMul: 0.45 },
      { size: 12, delay: 185, opMul: 0.28 },
      { size:  9, delay: 265, opMul: 0.16 }
    ];

    const N = 48;

    for (const cfg of sparkConfigs) {
      // Build SVG containing one 4-point star.
      const svg = svgEl('svg');
      svg.style.cssText =
        `position:fixed;left:0;top:0;` +
        `width:1px;height:1px;overflow:visible;` +
        `pointer-events:none;z-index:40;opacity:0;`;
      const s = cfg.size;
      const star = svgEl('path', {
        d: `M0 ${-s} L${s * 0.20} ${-s * 0.20} L${s} 0 ` +
           `L${s * 0.20} ${s * 0.20} L0 ${s} L${-s * 0.20} ${s * 0.20} ` +
           `L${-s} 0 L${-s * 0.20} ${-s * 0.20} Z`,
        fill: 'rgba(255,250,220,1)'
      });
      star.style.filter =
        `drop-shadow(0 0 ${10 + s * 0.3}px rgba(255,235,180,${(cfg.opMul * 0.8).toFixed(3)})) ` +
        `drop-shadow(0 0 4px rgba(255,250,220,${(cfg.opMul * 0.5).toFixed(3)}))`;
      svg.appendChild(star);
      trackEl(svg); document.body.appendChild(svg);

      // Pre-compute keyframes for the bouncy path. Echoes follow the
      // same curve and are simply started later via setTimeout below.
      const keys = [];
      for (let j = 0; j <= N; j++) {
        const t = j / N;
        const p = position(t);
        const rot = 360 * t;  // one full rotation over the journey
        let env = 1;
        if      (t < 0.08) env = t / 0.08;
        else if (t > 0.85) env = (1 - t) / 0.15;
        keys.push({
          transform: `translate(${p.x.toFixed(2)}px, ${p.y.toFixed(2)}px) rotate(${rot.toFixed(1)}deg)`,
          opacity:   (cfg.opMul * env).toFixed(4),
          offset:    parseFloat(t.toFixed(6))
        });
      }
      // Each echo starts later than the main, so at any given moment
      // they sit at past positions on the path — visual trail.
      setTimeout(() => {
        if (!svg.parentNode) return;
        trackAnim(svg.animate(keys, { duration: totalMs, fill: 'forwards' }));
      }, cfg.delay);
    }

    // Wait for the last echo to finish.
    await sleep(totalMs + 265);
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

  // ---- 02 The High Priestess : two pillars breathe in the darkness --
  // Boaz and Jachin — the twin pillars that flank the High Priestess.
  // Two thin vertical light bars at the card's edges fade in, pulse
  // with independent sinusoidal oscillations on opacity and height,
  // and fade out. Nothing emerges from the center. The card itself
  // takes on a subtle contrast lift and slight desaturation between
  // them, as if the air between the pillars has become more present.
  async function priestessVeil(imgEl) {
    const cr = getContentRect(imgEl);
    const totalMs = 1900;

    // Atmospheric dimming — light retreats from everything except the
    // pillars themselves and the air between them.
    const dim = newOverlayDiv(
      `left:${cr.left}px;top:${cr.top}px;` +
      `width:${cr.width}px;height:${cr.height}px;` +
      `background:rgba(8,12,28,0.42);`
    );
    trackAnim(dim.animate([
      { opacity: 0 },
      { opacity: 1, offset: 0.22 },
      { opacity: 1, offset: 0.78 },
      { opacity: 0 }
    ], { duration: totalMs, easing: 'cubic-bezier(0.42, 0, 0.58, 1)', fill: 'forwards' }));

    // Card itself: a quiet contrast lift while the pillars are present,
    // with a hint of cool desaturation. Subtle enough that the eye
    // doesn't see it directly — it registers as atmosphere.
    trackAnim(imgEl.animate([
      { filter: 'brightness(1)    saturate(1)    contrast(1)' },
      { filter: 'brightness(0.92) saturate(0.86) contrast(1.08)', offset: 0.32 },
      { filter: 'brightness(0.88) saturate(0.82) contrast(1.1)',  offset: 0.5  },
      { filter: 'brightness(0.92) saturate(0.86) contrast(1.08)', offset: 0.68 },
      { filter: 'brightness(1)    saturate(1)    contrast(1)' }
    ], { duration: totalMs, easing: 'cubic-bezier(0.45, 0, 0.55, 1)', fill: 'none' }));

    // Two pillars. Inset slightly so they sit at the card's edges
    // rather than the viewport's. Each pillar's keyframes are computed
    // from independent sine oscillations on opacity (breathing) and
    // scaleY (the column visibly elongating and contracting), with
    // different phases so the two never reach peak together.
    const xPositions = [0.06, 0.94];      // fractional x within the card
    const N = 40;
    const pillarColor = 'rgba(232,240,255,';

    for (let i = 0; i < 2; i++) {
      const px = cr.left + cr.width * xPositions[i];
      const pillar = newOverlayDiv(
        `left:${px - 1.5}px;top:${cr.top + cr.height * 0.06}px;` +
        `width:3px;height:${cr.height * 0.88}px;` +
        `background:linear-gradient(to bottom,` +
          `transparent 0%,${pillarColor}0.78) 14%,${pillarColor}0.96) 50%,` +
          `${pillarColor}0.78) 86%,transparent 100%);` +
        `box-shadow:0 0 14px 1px rgba(210,225,255,0.82),` +
          `0 0 32px 4px rgba(180,200,250,0.45);` +
        `mix-blend-mode:screen;` +
        `transform-origin:center center;` +
        `opacity:0;`
      );

      // Phase offset between the two pillars so their breathing is
      // out of sync — left peaks while right is dim and vice versa,
      // with intermediate states.
      const oPhase = i * 2.1;
      const sPhase = i * 1.4 + 0.7;
      const oFreq  = 0.95;  // breathing rate in Hz
      const sFreq  = 0.72;  // height oscillation rate

      const keys = [];
      for (let j = 0; j <= N; j++) {
        const t   = j / N;
        const tau = t * totalMs / 1000;
        const oSin = 0.5 + 0.5 * Math.sin(2 * Math.PI * oFreq * tau + oPhase);
        const sSin = 0.5 + 0.5 * Math.sin(2 * Math.PI * sFreq * tau + sPhase);
        const op = 0.55 + 0.45 * oSin;
        const sc = 0.92 + 0.10 * sSin;
        // Outer envelope so the pillars fade in and out gracefully.
        let env;
        if      (t < 0.20) env = t / 0.20;
        else if (t > 0.84) env = (1 - t) / 0.16;
        else               env = 1;
        keys.push({
          opacity:   (op * env).toFixed(4),
          transform: `scaleY(${sc.toFixed(4)})`,
          offset:    parseFloat(t.toFixed(6))
        });
      }
      trackAnim(pillar.animate(keys, { duration: totalMs, fill: 'forwards' }));
    }

    await sleep(totalMs);
  }

  // ---- 03 The Empress : abundance — wildflowers across the field ----
  // A large central warm bloom plus eight smaller blooms scattered
  // across the card in varied warm colors (peaches, roses, golds,
  // corals), opening in staggered sequence — wildflowers blooming
  // in a meadow rather than a single light source. The card itself
  // gets a significant brightness + saturation + warm hue-shift so
  // the abundance is felt as a temperature change, not just an
  // overlay on top.
  async function empressBloom(imgEl) {
    const cr = getContentRect(imgEl);
    const totalMs = 1600;
    const cx = cr.left + cr.width  / 2;
    const cy = cr.top  + cr.height / 2;

    // The card warms up — brightness up, saturation up, hue shifted
    // toward gold/peach. This is the largest single change in the
    // effect; the blooms are accents on this temperature lift.
    trackAnim(imgEl.animate([
      { filter: 'brightness(1)    saturate(1)    hue-rotate(0deg)' },
      { filter: 'brightness(1.18) saturate(1.32) hue-rotate(10deg)', offset: 0.45 },
      { filter: 'brightness(1.10) saturate(1.18) hue-rotate(6deg)',  offset: 0.7  },
      { filter: 'brightness(1)    saturate(1)    hue-rotate(0deg)' }
    ], { duration: totalMs, easing: 'cubic-bezier(0.42, 0, 0.58, 1)', fill: 'none' }));

    // Central warm bloom — bigger than the prior version, with a
    // richer multi-stop gradient (highlight core, warm mid, soft fall-off).
    const mainSize = Math.max(cr.width, cr.height) * 1.45;
    const mainBloom = newOverlayDiv(
      `left:${cx}px;top:${cy}px;` +
      `width:${mainSize}px;height:${mainSize}px;` +
      `margin:${-mainSize / 2}px 0 0 ${-mainSize / 2}px;border-radius:50%;` +
      `background:radial-gradient(circle,` +
        `rgba(255,225,170,0.9) 0%,` +
        `rgba(255,180,110,0.55) 14%,` +
        `rgba(255,150,90,0.32) 32%,` +
        `rgba(255,120,80,0.14) 50%,transparent 70%);` +
      `mix-blend-mode:screen;`
    );
    trackAnim(mainBloom.animate([
      { transform: 'scale(0.12)', opacity: 0   },
      { transform: 'scale(0.75)', opacity: 1,   offset: 0.40 },
      { transform: 'scale(1.05)', opacity: 0.7, offset: 0.65 },
      { transform: 'scale(1.40)', opacity: 0 }
    ], { duration: totalMs, easing: 'cubic-bezier(0.22, 1, 0.36, 1)', fill: 'forwards' }));

    // Eight smaller blooms scattered across the card — wildflowers.
    // Each has its own position, color, size, and timing so the field
    // reads as varied rather than rhythmic.
    const wildflowers = [
      { x: 0.22, y: 0.28, color: '255,180,180', size: 75 },  // rose
      { x: 0.78, y: 0.36, color: '255,200,140', size: 65 },  // peach
      { x: 0.32, y: 0.72, color: '255,220,180', size: 85 },  // cream
      { x: 0.70, y: 0.70, color: '255,170,140', size: 70 },  // coral
      { x: 0.45, y: 0.18, color: '255,190,160', size: 60 },  // dusty rose
      { x: 0.18, y: 0.55, color: '255,210,170', size: 80 },  // apricot
      { x: 0.82, y: 0.62, color: '255,180,150', size: 65 },  // salmon
      { x: 0.55, y: 0.85, color: '255,200,160', size: 75 }   // honey
    ];

    for (let i = 0; i < wildflowers.length; i++) {
      const wf = wildflowers[i];
      const wx = cr.left + cr.width  * wf.x;
      const wy = cr.top  + cr.height * wf.y;
      const petal = newOverlayDiv(
        `left:${wx}px;top:${wy}px;` +
        `width:${wf.size}px;height:${wf.size}px;` +
        `margin:${-wf.size / 2}px 0 0 ${-wf.size / 2}px;border-radius:50%;` +
        `background:radial-gradient(circle,` +
          `rgba(${wf.color},0.72) 0%,` +
          `rgba(${wf.color},0.36) 38%,` +
          `transparent 72%);` +
        `mix-blend-mode:screen;opacity:0;`
      );
      const startAt = 80 + i * 110;
      setTimeout(() => {
        if (!petal.parentNode) return;
        trackAnim(petal.animate([
          { transform: 'scale(0.1)', opacity: 0   },
          { transform: 'scale(0.95)', opacity: 1,  offset: 0.40 },
          { transform: 'scale(1.25)', opacity: 0.5, offset: 0.70 },
          { transform: 'scale(1.55)', opacity: 0 }
        ], { duration: 950, easing: 'cubic-bezier(0.22, 1, 0.36, 1)', fill: 'forwards' }));
      }, startAt);
    }

    await sleep(totalMs);
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

  // ---- 09 The Hermit : the lantern wanders, searching ---------------
  // The lantern follows a Lissajous path with non-commensurate
  // frequencies on x and y (0.38 and 0.53 Hz), so the trajectory
  // never closes — the light visibly searches the card without
  // settling into a recognizable pattern. Three overlapping light
  // sources (two ellipse-shaped radial gradients with different
  // aspect ratios + a brighter core), each pulsing on its own sine
  // with phase offset, give the lantern an irregular, breathing
  // quality rather than a clean gradient circle. Different blend
  // modes (screen, lighten, plus-lighter) layer them into a non-
  // uniform glow that shifts shape as it travels.
  async function hermitLantern(imgEl) {
    const cr = getContentRect(imgEl);
    const cx = cr.left + cr.width  / 2;
    const cy = cr.top  + cr.height / 2;
    const totalMs = 2400;
    const N = 60;

    // Atmospheric dimming over the card.
    const dim = newOverlayDiv(
      `left:${cr.left}px;top:${cr.top}px;` +
      `width:${cr.width}px;height:${cr.height}px;background:rgba(4,7,14,0.68);`
    );
    trackAnim(dim.animate([
      { opacity: 0 },
      { opacity: 1, offset: 0.10 },
      { opacity: 1, offset: 0.90 },
      { opacity: 0 }
    ], { duration: totalMs, fill: 'forwards' }));

    // The three light layers. Each is anchored at (cx, cy) so the
    // transform: translate(...) we apply per-keyframe moves them
    // together. Different ellipse aspect ratios + different gradient
    // colors + different blend modes give visibly distinct shapes
    // that combine into an irregular glow.
    const layers = [
      {
        // Wide soft halo — the bulk of the light volume.
        w: 220, h: 180, ox: 0, oy: 0,
        bg: 'radial-gradient(ellipse 70% 60% at 48% 52%,' +
            'rgba(255,222,150,0.55) 0%,rgba(255,190,100,0.28) 32%,transparent 68%)',
        blend: 'screen',
        sizeFreq: 0.7, sizePhase: 0.0, sizeAmp: 0.12,
        opFreq:   1.1, opPhase:   0.3, opAmp:   0.30, opBase: 0.65,
        wanderAmp: 6, wanderFreq: 0.9, wanderPhase: 0.0
      },
      {
        // Hot core — smaller, brighter, with `lighten` so it always
        // wins over the card's mid-tones, giving a bright punch.
        w: 90,  h: 110, ox: 0, oy: 0,
        bg: 'radial-gradient(ellipse 60% 75% at 50% 48%,' +
            'rgba(255,240,180,0.92) 0%,rgba(255,210,130,0.5) 30%,transparent 68%)',
        blend: 'lighten',
        sizeFreq: 1.4, sizePhase: 1.7, sizeAmp: 0.18,
        opFreq:   1.6, opPhase:   2.0, opAmp:   0.22, opBase: 0.78,
        wanderAmp: 9, wanderFreq: 1.4, wanderPhase: 1.2
      },
      {
        // Asymmetric flare — offset from the others and elongated on
        // a different axis. Its independent wander creates the
        // "lumpy" silhouette as it moves through the dim card.
        w: 130, h: 90,  ox: 12, oy: -8,
        bg: 'radial-gradient(ellipse 55% 70% at 55% 45%,' +
            'rgba(255,230,170,0.5) 0%,rgba(255,200,120,0.22) 38%,transparent 70%)',
        blend: 'screen',
        sizeFreq: 1.0, sizePhase: 3.4, sizeAmp: 0.20,
        opFreq:   0.9, opPhase:   4.1, opAmp:   0.34, opBase: 0.55,
        wanderAmp: 14, wanderFreq: 0.6, wanderPhase: 2.4
      }
    ];

    // Lissajous parameters — non-commensurate frequencies so the
    // search path never closes back on itself.
    const xAmp = cr.width  * 0.34;
    const yAmp = cr.height * 0.30;
    const xFreq = 0.38;  // Hz
    const yFreq = 0.53;  // Hz
    const xPhase = 0;
    const yPhase = Math.PI / 3;

    for (const layer of layers) {
      const el = newOverlayDiv(
        `left:${cx + layer.ox - layer.w / 2}px;` +
        `top:${cy + layer.oy - layer.h / 2}px;` +
        `width:${layer.w}px;height:${layer.h}px;` +
        `background:${layer.bg};` +
        `mix-blend-mode:${layer.blend};` +
        `opacity:0;`
      );
      const keys = [];
      for (let j = 0; j <= N; j++) {
        const t   = j / N;
        const tau = t * totalMs / 1000;

        // Main Lissajous position (shared across layers via the
        // same formula — sub-layer wander is added below).
        const mainX = xAmp * Math.sin(2 * Math.PI * xFreq * tau + xPhase);
        const mainY = yAmp * Math.sin(2 * Math.PI * yFreq * tau + yPhase);
        // Per-layer micro-wander so the layers drift relative to one
        // another, breaking the otherwise-uniform glow into a shape
        // that visibly shifts as it travels.
        const wX = layer.wanderAmp *
                   Math.sin(2 * Math.PI * layer.wanderFreq * tau + layer.wanderPhase);
        const wY = layer.wanderAmp *
                   Math.cos(2 * Math.PI * layer.wanderFreq * tau + layer.wanderPhase);

        const sc = 1 + layer.sizeAmp *
                       Math.sin(2 * Math.PI * layer.sizeFreq * tau + layer.sizePhase);
        const opSin = 0.5 + 0.5 *
                            Math.sin(2 * Math.PI * layer.opFreq * tau + layer.opPhase);
        const op = layer.opBase + layer.opAmp * (opSin - 0.5) * 2;

        // Outer envelope: fade in over first 8%, hold, fade out.
        let env = 1;
        if      (t < 0.08) env = t / 0.08;
        else if (t > 0.92) env = (1 - t) / 0.08;

        keys.push({
          transform: `translate(${(mainX + wX).toFixed(2)}px, ${(mainY + wY).toFixed(2)}px) scale(${sc.toFixed(3)})`,
          opacity:   Math.max(0, op * env).toFixed(4),
          offset:    parseFloat(t.toFixed(6))
        });
      }
      trackAnim(el.animate(keys, { duration: totalMs, fill: 'forwards' }));
    }

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

  // ---- 18 The Moon : four chaotic white tides ------------------------
  // Four SVG path bands sweep across the card. Each band is a tall
  // vertical strip whose left and right edges are sinusoidally
  // warped (path vertices computed from sin(2π·waves·y/h + phase) at
  // 40 samples), so the band's silhouette is a wavy ribbon rather
  // than a rectangle. Each band has its own wave count, amplitude,
  // phase, width, speed, and direction — they overlap in changing
  // ways, never quite aligning, giving the chaotic "tide" feeling.
  // All use mix-blend-mode: screen with pale-white gradients.
  //
  // While the tides traverse the card the card itself dims
  // significantly (brightness 0.55) and wavers — sinusoidal motion in
  // x, y, rotation, and scale, so it looks like an image seen
  // underwater. The dimming + screen-blended tides make the bands
  // read as the only light source: the moonlit areas of the card.
  async function moonShimmer(imgEl) {
    const cr = getContentRect(imgEl);
    const totalMs = 2400;

    // Dim the card and cool the hue while the tides move. Hold the
    // dimmed state through the middle so the tides are the dominant
    // light, then release.
    trackAnim(imgEl.animate([
      { filter: 'brightness(1)    saturate(1)    hue-rotate(0deg)' },
      { filter: 'brightness(0.55) saturate(0.85) hue-rotate(-14deg)', offset: 0.18 },
      { filter: 'brightness(0.55) saturate(0.85) hue-rotate(-14deg)', offset: 0.82 },
      { filter: 'brightness(1)    saturate(1)    hue-rotate(0deg)' }
    ], { duration: totalMs, easing: 'cubic-bezier(0.42, 0, 0.58, 1)', fill: 'none' }));

    // Card waver — subtle sin-driven motion in x, y, rotation, and
    // scale, with a fade-in/out envelope so the waver doesn't snap
    // on or off. Frequencies are non-commensurate (0.45 / 0.65 /
    // 0.55 / 0.7 Hz) so the four axes never align, giving the card
    // a continuously-shifting "underwater" quality through the
    // dimness rather than a regular wobble.
    const waverN = 48;
    const waverKeys = [];
    for (let i = 0; i <= waverN; i++) {
      const t   = i / waverN;
      const tau = t * totalMs / 1000;
      const dx  = 2.6 * Math.sin(2 * Math.PI * 0.45 * tau);
      const dy  = 1.6 * Math.sin(2 * Math.PI * 0.65 * tau + 0.7);
      const rot = 0.42 * Math.sin(2 * Math.PI * 0.55 * tau + 1.2);
      const sc  = 1 + 0.006 * Math.sin(2 * Math.PI * 0.70 * tau + 2.1);
      // Envelope so the waver fades in/out with the dim phase.
      let env = 1;
      if      (t < 0.18) env = t / 0.18;
      else if (t > 0.82) env = (1 - t) / 0.18;
      waverKeys.push({
        transform: `translate(${(dx * env).toFixed(2)}px, ${(dy * env).toFixed(2)}px)` +
                   ` rotate(${(rot * env).toFixed(4)}deg)` +
                   ` scale(${sc.toFixed(4)})`,
        offset: parseFloat(t.toFixed(6))
      });
    }
    trackAnim(imgEl.animate(waverKeys, { duration: totalMs, fill: 'none' }));

    // Band configs — different shapes (waves, amp), different speeds,
    // mixed directions (some LTR, some RTL) for the chaotic feel.
    const bands = [
      { width: cr.width * 0.18, waves: 3.2, amp: 14, dur: 1700, delay:   0, dir:  1, color: '230,240,255' },
      { width: cr.width * 0.12, waves: 4.6, amp: 10, dur: 2000, delay: 260, dir:  1, color: '215,228,250' },
      { width: cr.width * 0.22, waves: 2.7, amp: 16, dur: 1900, delay: 540, dir: -1, color: '225,238,255' },
      { width: cr.width * 0.15, waves: 3.8, amp: 12, dur: 2100, delay: 820, dir: -1, color: '220,234,255' }
    ];

    for (let i = 0; i < bands.length; i++) {
      const cfg = bands[i];
      const phaseL = Math.random() * Math.PI * 2;
      const phaseR = Math.random() * Math.PI * 2;

      // Inset the SVG's bounds so the wave amplitude has room outside
      // the band's nominal width without clipping.
      const A     = cfg.amp + 4;
      const svgW  = cfg.width + 2 * A;

      // The band's starting screen position: just off the leading
      // edge of the card so it can fully enter from one side.
      const enterLeft = cr.left - svgW;
      const enterRight = cr.left + cr.width;
      const startX = (cfg.dir > 0) ? enterLeft  : enterRight;
      const endX   = (cfg.dir > 0) ? enterRight : enterLeft;

      const svg = svgEl('svg');
      svg.setAttribute('viewBox', `0 0 ${svgW} ${cr.height}`);
      svg.style.cssText =
        `position:fixed;left:${startX}px;top:${cr.top}px;` +
        `width:${svgW}px;height:${cr.height}px;` +
        `pointer-events:none;z-index:40;` +
        `mix-blend-mode:screen;` +
        `overflow:visible;opacity:0;`;

      // Build the wavy band path. Center line at x = svgW/2; each
      // edge is offset by ±width/2 then warped by sin(...).
      const N = 40;
      const cxLocal = svgW / 2;
      let d = '';
      for (let j = 0; j <= N; j++) {
        const y = (j / N) * cr.height;
        const wave = Math.sin(2 * Math.PI * cfg.waves * (y / cr.height) + phaseL);
        const x = cxLocal - cfg.width / 2 + cfg.amp * wave;
        d += (j === 0 ? 'M ' : 'L ') + x.toFixed(2) + ' ' + y.toFixed(2) + ' ';
      }
      for (let j = N; j >= 0; j--) {
        const y = (j / N) * cr.height;
        const wave = Math.sin(2 * Math.PI * cfg.waves * (y / cr.height) + phaseR);
        const x = cxLocal + cfg.width / 2 + cfg.amp * wave;
        d += 'L ' + x.toFixed(2) + ' ' + y.toFixed(2) + ' ';
      }
      d += 'Z';

      // Horizontal gradient: transparent → soft white → transparent
      // so the band's edges feather rather than slamming on/off.
      const gradId = `moon-tide-${i}-${(Math.random() * 99999) | 0}`;
      const defs = svgEl('defs');
      const grad = svgEl('linearGradient', {
        id: gradId, x1: '0%', y1: '50%', x2: '100%', y2: '50%'
      });
      grad.appendChild(svgEl('stop', { offset: '0%',   'stop-color': `rgba(${cfg.color},0)` }));
      grad.appendChild(svgEl('stop', { offset: '50%',  'stop-color': `rgba(${cfg.color},0.92)` }));
      grad.appendChild(svgEl('stop', { offset: '100%', 'stop-color': `rgba(${cfg.color},0)` }));
      defs.appendChild(grad);
      svg.appendChild(defs);

      const path = svgEl('path', { d: d, fill: `url(#${gradId})` });
      svg.appendChild(path);
      trackEl(svg); document.body.appendChild(svg);

      const dx = endX - startX;
      setTimeout(() => {
        if (!svg.parentNode) return;
        trackAnim(svg.animate([
          { transform: 'translateX(0)',       opacity: 0 },
          { transform: 'translateX(0)',       opacity: 0.9, offset: 0.07 },
          { transform: `translateX(${dx}px)`, opacity: 0.9, offset: 0.93 },
          { transform: `translateX(${dx}px)`, opacity: 0 }
        ], { duration: cfg.dur, easing: 'cubic-bezier(0.45, 0.05, 0.55, 0.95)', fill: 'forwards' }));
      }, cfg.delay);
    }

    await sleep(totalMs);
  }

  // ---- 19 The Sun : punch out the sun, soft warmth and drifting embers
  // Same structural idea as before — punch out the actual sun region
  // of the Rider-Waite card — but tuned for warmth instead of energy:
  //
  //   - SOFT EDGE via mask-image: the disc fades at its rim (radial
  //     gradient 60% white -> 100% transparent), so it reads as a
  //     glow rather than a cut-out shape.
  //
  //   - BLUR(3px) in the filter chain: softens both the image
  //     content inside the disc and the mask edge, removing any
  //     "this is a clone of the pixels" feel.
  //
  //   - THREE layered drop-shadows in progressively wider, warmer
  //     amber tones (inner 30+px, middle 70+px, outer 130+px). The
  //     halo extends far past the disc.
  //
  //   - SLOW breathing motion at 0.5-0.9 Hz instead of 5-8 Hz jitter.
  //     Single-frequency, low amplitude. The sun gently shifts and
  //     swells rather than vibrating.
  //
  //   - DRIFTING EMBERS: round warm dots (radial gradient + warm
  //     box-shadow) instead of 4-point star sparkles. Longer
  //     lifetimes, slow ease-out drift outward with a slight upward
  //     bias as if warm air were carrying them.
  async function sunBloom(imgEl) {
    const cr = getContentRect(imgEl);
    const src = imgEl.src;
    const totalMs = 1900;

    // Where the sun disc sits on the card, per deck. RW (Rider-Waite)
    // has it upper-centre; the Thoth Sun's disc is larger and a touch
    // lower-centre in the ARTFILL crop. (User will fine-tune Thoth.)
    var coords = (activeDeck === "thoth")
      ? { cx: 0.50, cy: 0.36, r: 0.27 }
      : { cx: 0.50, cy: 0.25, r: 0.24 };
    const sunCxFrac = coords.cx;
    const sunCyFrac = coords.cy;
    const sunRFrac  = coords.r;
    const sunCx = cr.left + cr.width  * sunCxFrac;
    const sunCy = cr.top  + cr.height * sunCyFrac;
    const sunR  = cr.width * sunRFrac;

    // Soft-edged mask: opaque (visible) through 60% of the radius,
    // feathering to transparent (hidden) at 100%. `white` works in
    // both alpha and luminance mask modes — safer cross-browser.
    const sunMask =
      `radial-gradient(circle ${sunR}px at ` +
      `${(sunCxFrac * 100).toFixed(1)}% ${(sunCyFrac * 100).toFixed(1)}%, ` +
      `white 60%, transparent 100%)`;

    const sunClone = document.createElement('img');
    sunClone.src = src;
    sunClone.style.cssText =
      `position:fixed;` +
      `left:${cr.left}px;top:${cr.top}px;` +
      `width:${cr.width}px;height:${cr.height}px;` +
      `object-fit:fill;` +
      `mask-image:${sunMask};` +
      `-webkit-mask-image:${sunMask};` +
      `mix-blend-mode:screen;` +
      `pointer-events:none;` +
      `z-index:40;` +
      `opacity:0;` +
      `will-change:transform,filter,opacity;`;
    trackEl(sunClone);
    document.body.appendChild(sunClone);

    // Gentle breathing + slow warm-glow pulse. Only 48 keyframes
    // because everything is sub-1 Hz; sparser sampling is fine.
    const N = 48;
    const sunKeys = [];
    for (let i = 0; i <= N; i++) {
      const t   = i / N;
      const tau = t * totalMs / 1000;
      // Soft drift on x/y (single frequency each). Same rhythm, bigger
      // amplitude so the sun visibly stirs rather than barely breathing.
      const dx = 3.0 * Math.sin(2 * Math.PI * 0.65 * tau);
      const dy = 2.4 * Math.sin(2 * Math.PI * 0.50 * tau + 0.5);
      // Scale breathing — roughly doubled so the disc clearly swells.
      const sc = 1 + 0.10 * Math.sin(2 * Math.PI * 0.45 * tau);
      // Brightness / saturation pulse — lifted base + wider swing so the
      // sun unmistakably blooms and warms on mobile.
      const brightness = 1.50 + 0.30 *
                                (0.5 + 0.5 * Math.sin(2 * Math.PI * 0.75 * tau + 0.5));
      const saturate   = 1.40 + 0.24 *
                                (0.5 + 0.5 * Math.sin(2 * Math.PI * 0.60 * tau + 1.0));
      // Three layered halos, each on its own slow rhythm so they
      // expand and contract independently — the warmth feels alive,
      // not metronomic. Progressively warmer as the radius grows.
      // Radii enlarged ~1.6x so the bloom reads clearly.
      const innerR  = 48  + 20 * Math.sin(2 * Math.PI * 0.85 * tau);
      const middleR = 116 + 36 * Math.sin(2 * Math.PI * 0.62 * tau + 0.9);
      const outerR  = 210 + 62 * Math.sin(2 * Math.PI * 0.45 * tau + 1.6);
      let env = 1;
      if      (t < 0.14) env = t / 0.14;
      else if (t > 0.82) env = (1 - t) / 0.18;
      sunKeys.push({
        transform: `translate(${(dx * env).toFixed(2)}px, ${(dy * env).toFixed(2)}px) scale(${sc.toFixed(4)})`,
        filter:    `blur(3px) ` +
                   `brightness(${(1 + (brightness - 1) * env).toFixed(3)}) ` +
                   `saturate(${(1 + (saturate - 1) * env).toFixed(3)}) ` +
                   `drop-shadow(0 0 ${innerR.toFixed(1)}px rgba(255,225,140,${(1.00 * env).toFixed(3)})) ` +
                   `drop-shadow(0 0 ${middleR.toFixed(1)}px rgba(255,200,100,${(0.78 * env).toFixed(3)})) ` +
                   `drop-shadow(0 0 ${outerR.toFixed(1)}px rgba(255,175,75,${(0.52 * env).toFixed(3)}))`,
        opacity:   env.toFixed(4),
        offset:    parseFloat(t.toFixed(6))
      });
    }
    trackAnim(sunClone.animate(sunKeys, { duration: totalMs, fill: 'forwards' }));

    // Subtle overall warmth on the card so the whole image feels
    // touched by the sun's intensity, without competing with the
    // punched-out shape.
    trackAnim(imgEl.animate([
      { filter: 'brightness(1)    saturate(1)' },
      { filter: 'brightness(1.20) saturate(1.30)', offset: 0.5 },
      { filter: 'brightness(1)    saturate(1)' }
    ], { duration: totalMs, easing: 'cubic-bezier(0.42, 0, 0.58, 1)', fill: 'none' }));

    // === Drifting warm embers from the sun's edge. ===
    // Round warm dots (no star points), each on a slow outward drift
    // with a slight upward bias as if rising on warm air. Long
    // lifetimes and ease-out so they linger rather than zip.
    const numEmbers = 22;
    for (let i = 0; i < numEmbers; i++) {
      const angle     = Math.random() * Math.PI * 2;
      const startDist = sunR * (0.86 + Math.random() * 0.16);
      const endDist   = sunR * (1.35 + Math.random() * 0.70);
      const sx = sunCx + Math.cos(angle) * startDist;
      const sy = sunCy + Math.sin(angle) * startDist;
      // Outward drift + upward bias (warm air rising).
      const dx = (endDist - startDist) * Math.cos(angle);
      const dy = (endDist - startDist) * Math.sin(angle) - 14;
      const size = 7 + Math.random() * 6;

      const ember = newOverlayDiv(
        `left:${sx}px;top:${sy}px;` +
        `width:${size}px;height:${size}px;` +
        `margin:${-size / 2}px 0 0 ${-size / 2}px;border-radius:50%;` +
        `background:radial-gradient(circle,` +
          `rgba(255,235,170,1) 0%,` +
          `rgba(255,210,120,0.65) 40%,` +
          `transparent 80%);` +
        `box-shadow:0 0 18px 4px rgba(255,215,130,0.9),` +
                  `0 0 36px 9px rgba(255,180,90,0.46);` +
        `opacity:0;`
      );

      const lifeMs  = 1000 + Math.random() * 450;
      const startAt = 220 + Math.random() * (totalMs - 1250);

      setTimeout(() => {
        if (!ember.parentNode) return;
        trackAnim(ember.animate([
          { opacity: 0,    transform: 'translate(0,0) scale(0.3)' },
          { opacity: 1,    transform: `translate(${(dx * 0.26).toFixed(1)}px, ${(dy * 0.26).toFixed(1)}px) scale(1.10)`, offset: 0.28 },
          { opacity: 0.85, transform: `translate(${(dx * 0.65).toFixed(1)}px, ${(dy * 0.65).toFixed(1)}px) scale(1.00)`, offset: 0.62 },
          { opacity: 0,    transform: `translate(${dx.toFixed(1)}px, ${dy.toFixed(1)}px) scale(0.5)` }
        ], { duration: lifeMs, easing: 'cubic-bezier(0.33, 1, 0.55, 1)', fill: 'forwards' }));
      }, startAt);
    }

    await sleep(totalMs + 100);
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

  // =====================================================================
  // THOTH-DECK-ONLY signature effects. Four trumps differ from their
  // Rider-Waite counterparts in name and meaning, so they get their own
  // effects, derived from the Thoth meaning. They fire only when the
  // active deck is Thoth (see THOTH_OVERRIDES + play()), at the same
  // 1200ms-after-reveal timing as every other signature. The RW effects
  // for these keys are untouched.
  // =====================================================================

  // ---- VIII Adjustment (Thoth, vs RW Strength) ----------------------
  // Maat in living equilibrium — poised on a single point, the sword
  // hanging plumb. Not the flat left/right sway of RW Justice: the card
  // balances on its bottom-centre point with a damped poise-settle to
  // perfect vertical, while a plumb sword-line of light descends through
  // the centre — dynamic balance finding its centre.
  async function adjustmentPoise(imgEl) {
    const cr = getContentRect(imgEl);
    const totalMs = 1500;
    imgEl.style.transformOrigin = 'bottom center';
    trackAnim(imgEl.animate([
      { transform: 'rotate(0deg)' },
      { transform: 'rotate(2.7deg)',  offset: 0.20 },
      { transform: 'rotate(-2.0deg)', offset: 0.42 },
      { transform: 'rotate(1.25deg)', offset: 0.62 },
      { transform: 'rotate(-0.65deg)', offset: 0.80 },
      { transform: 'rotate(0deg)' }
    ], { duration: totalMs, easing: 'cubic-bezier(0.36, 0, 0.2, 1)', fill: 'none' }));

    const sword = newOverlayDiv(
      `left:${cr.left + cr.width / 2 - 1.5}px;top:${cr.top}px;` +
      `width:3px;height:${cr.height}px;` +
      `background:linear-gradient(to bottom, rgba(220,230,255,0) 0%,` +
        `rgba(232,240,255,0.92) 34%, rgba(255,255,255,0.96) 60%,` +
        `rgba(220,230,255,0) 100%);` +
      `box-shadow:0 0 11px rgba(200,220,255,0.8);` +
      `transform-origin:top center;transform:scaleY(0);mix-blend-mode:screen;`
    );
    trackAnim(sword.animate([
      { transform: 'scaleY(0)', opacity: 0 },
      { transform: 'scaleY(1)', opacity: 1, offset: 0.40 },
      { transform: 'scaleY(1)', opacity: 1, offset: 0.72 },
      { transform: 'scaleY(1)', opacity: 0 }
    ], { duration: totalMs, easing: 'cubic-bezier(0.3, 0, 0.3, 1)', fill: 'forwards' }));
    await sleep(totalMs);
    imgEl.style.removeProperty('transform-origin');
  }

  // ---- XI Lust (Thoth, vs RW Strength) ------------------------------
  // The rapture of vital life-force — Babalon astride the Beast, the
  // Grail raised. A serpent-flame of light writhes up the centre,
  // undulating with ecstatic energy, while the card surges warm and
  // saturated. Sinuous and rapturous, not the contained ember-halo of
  // RW Strength.
  async function lustFlame(imgEl) {
    const cr = getContentRect(imgEl);
    const totalMs = 1500;

    trackAnim(imgEl.animate([
      { filter: 'brightness(1) saturate(1) hue-rotate(0deg)' },
      { filter: 'brightness(1.16) saturate(1.5) hue-rotate(-8deg)', offset: 0.45 },
      { filter: 'brightness(1.07) saturate(1.24) hue-rotate(-3deg)', offset: 0.7 },
      { filter: 'brightness(1) saturate(1) hue-rotate(0deg)' }
    ], { duration: totalMs, easing: 'cubic-bezier(0.42, 0, 0.58, 1)', fill: 'none' }));

    const svg = svgEl('svg');
    svg.setAttribute('viewBox', `0 0 ${cr.width} ${cr.height}`);
    svg.style.cssText =
      `position:fixed;left:${cr.left}px;top:${cr.top}px;` +
      `width:${cr.width}px;height:${cr.height}px;` +
      `pointer-events:none;z-index:40;overflow:visible;mix-blend-mode:screen;`;
    const defs = svgEl('defs');
    const grad = svgEl('linearGradient', { id: 'lustG', x1: '0', y1: '1', x2: '0', y2: '0' });
    grad.appendChild(svgEl('stop', { offset: '0%',   'stop-color': 'rgba(255,110,40,0)' }));
    grad.appendChild(svgEl('stop', { offset: '28%',  'stop-color': 'rgba(255,140,50,0.9)' }));
    grad.appendChild(svgEl('stop', { offset: '68%',  'stop-color': 'rgba(255,205,90,0.95)' }));
    grad.appendChild(svgEl('stop', { offset: '100%', 'stop-color': 'rgba(255,240,170,0)' }));
    defs.appendChild(grad); svg.appendChild(defs);
    const path = svgEl('path', {
      fill: 'none', stroke: 'url(#lustG)', 'stroke-width': 11, 'stroke-linecap': 'round'
    });
    path.style.filter = 'drop-shadow(0 0 10px rgba(255,150,60,0.85))';
    svg.appendChild(path);
    trackEl(svg); document.body.appendChild(svg);

    const cx = cr.width / 2;
    const startT = performance.now();
    function frame(now) {
      if (!svg.parentNode) return;             // cancelled
      const t = Math.min(1, (now - startT) / totalMs);
      const env = Math.sin(Math.PI * t);
      let d = ''; const N = 26;
      for (let i = 0; i <= N; i++) {
        const yy = cr.height * (1 - i / N);                       // bottom→top
        const amp = cr.width * 0.14 * env * (0.35 + 0.65 * (i / N)); // wider up high
        const xx = cx + amp * Math.sin(i * 0.85 + t * Math.PI * 5);
        d += (i ? 'L' : 'M') + xx.toFixed(1) + ',' + yy.toFixed(1) + ' ';
      }
      path.setAttribute('d', d);
      path.style.opacity = (0.25 + 0.75 * env).toFixed(3);
      if (t < 1) requestAnimationFrame(frame);
      else if (svg.parentNode) svg.parentNode.removeChild(svg);
    }
    requestAnimationFrame(frame);
    await sleep(totalMs);
  }

  // ---- XIV Art (Thoth, vs RW Temperance) ----------------------------
  // The alchemical conjunction — solve et coagula. A fire stream pours
  // in from the upper-left, a water stream from the upper-right; they
  // meet at the centre and a gold transmutation bloom erupts, briefly
  // gilding the card. The mixing-into-gold is the heart of it, where RW
  // Temperance just crosses warm and cool.
  async function artAlchemy(imgEl) {
    const cr = getContentRect(imgEl);
    const totalMs = 1600;
    const cx = cr.left + cr.width / 2, cy = cr.top + cr.height / 2;
    const base = `left:${cr.left}px;top:${cr.top}px;width:${cr.width}px;height:${cr.height}px;mix-blend-mode:screen;opacity:0;`;

    const fire = newOverlayDiv(base +
      'background:linear-gradient(135deg, rgba(232,60,40,0.82) 0%, rgba(232,95,45,0.34) 32%, transparent 62%);');
    const water = newOverlayDiv(base +
      'background:linear-gradient(225deg, rgba(55,130,232,0.82) 0%, rgba(50,155,222,0.34) 32%, transparent 62%);');
    const ease = 'cubic-bezier(0.4, 0, 0.3, 1)';
    trackAnim(fire.animate([
      { opacity: 0,    transform: 'translate(-42px,-42px)' },
      { opacity: 0.95, transform: 'translate(0,0)',          offset: 0.45 },
      { opacity: 0.5,  transform: 'translate(18px,18px)',    offset: 0.7  },
      { opacity: 0,    transform: 'translate(30px,30px)' }
    ], { duration: totalMs, easing: ease, fill: 'forwards' }));
    trackAnim(water.animate([
      { opacity: 0,    transform: 'translate(42px,-42px)' },
      { opacity: 0.95, transform: 'translate(0,0)',           offset: 0.45 },
      { opacity: 0.5,  transform: 'translate(-18px,18px)',    offset: 0.7  },
      { opacity: 0,    transform: 'translate(-30px,30px)' }
    ], { duration: totalMs, easing: ease, fill: 'forwards' }));

    await sleep(totalMs * 0.42);

    const size = Math.max(cr.width, cr.height) * 1.15;
    const gold = newOverlayDiv(
      `left:${cx}px;top:${cy}px;width:${size}px;height:${size}px;` +
      `margin:${-size / 2}px 0 0 ${-size / 2}px;border-radius:50%;` +
      `background:radial-gradient(circle, rgba(255,228,135,0.92) 0%,` +
        `rgba(255,198,82,0.5) 22%, rgba(255,170,50,0.2) 42%, transparent 65%);` +
      `mix-blend-mode:screen;`
    );
    trackAnim(gold.animate([
      { transform: 'scale(0.1)',  opacity: 0 },
      { transform: 'scale(0.72)', opacity: 1, offset: 0.4 },
      { transform: 'scale(1.18)', opacity: 0 }
    ], { duration: 920, easing: 'cubic-bezier(0.22, 1, 0.36, 1)', fill: 'forwards' }));
    trackAnim(imgEl.animate([
      { filter: 'brightness(1) saturate(1) sepia(0)' },
      { filter: 'brightness(1.14) saturate(1.3) sepia(0.22)', offset: 0.4 },
      { filter: 'brightness(1) saturate(1) sepia(0)' }
    ], { duration: 920, easing: 'cubic-bezier(0.42, 0, 0.58, 1)', fill: 'none' }));
    await sleep(920);
  }

  // ---- XX The Aeon (Thoth, vs RW Judgement) -------------------------
  // The dawn of a new age — the arched body of Nuit across the sky, a
  // dawn-wash rising from below, and the child-star of Horus igniting
  // at the centre and lifting with a brief sunburst. A cosmic
  // awakening, not the bell-tone hum of RW Judgement.
  async function aeonDawn(imgEl) {
    const cr = getContentRect(imgEl);
    const totalMs = 1700;
    const cx = cr.left + cr.width / 2, cy = cr.top + cr.height / 2;

    // Dawn wash rising from the bottom.
    const wash = newOverlayDiv(
      `left:${cr.left}px;top:${cr.top}px;width:${cr.width}px;height:${cr.height}px;` +
      `background:linear-gradient(0deg, rgba(255,200,95,0.5) 0%,` +
        `rgba(180,120,205,0.3) 35%, transparent 70%);` +
      `mix-blend-mode:screen;opacity:0;`
    );
    trackAnim(wash.animate([
      { opacity: 0,   transform: 'translateY(38%)' },
      { opacity: 1,   transform: 'translateY(0)',   offset: 0.5 },
      { opacity: 0.6, transform: 'translateY(-6%)', offset: 0.8 },
      { opacity: 0,   transform: 'translateY(-10%)' }
    ], { duration: totalMs, easing: 'cubic-bezier(0.22, 1, 0.36, 1)', fill: 'forwards' }));

    // Arc of Nuit across the top.
    const svg = svgEl('svg');
    svg.setAttribute('viewBox', `0 0 ${cr.width} ${cr.height}`);
    svg.style.cssText =
      `position:fixed;left:${cr.left}px;top:${cr.top}px;` +
      `width:${cr.width}px;height:${cr.height}px;` +
      `pointer-events:none;z-index:40;overflow:visible;`;
    const arc = svgEl('path', {
      d: `M ${cr.width * 0.05} ${cr.height * 0.44} ` +
         `Q ${cr.width * 0.5} ${-cr.height * 0.03} ${cr.width * 0.95} ${cr.height * 0.44}`,
      fill: 'none', stroke: 'rgba(255,235,180,0.95)', 'stroke-width': 3
    });
    arc.style.filter = 'drop-shadow(0 0 8px rgba(255,225,150,0.85))';
    svg.appendChild(arc);
    trackEl(svg); document.body.appendChild(svg);
    const len = arc.getTotalLength();
    arc.style.strokeDasharray = len;
    arc.style.strokeDashoffset = len;
    trackAnim(arc.animate(
      [{ strokeDashoffset: len }, { strokeDashoffset: 0 }],
      { duration: 760, easing: 'cubic-bezier(0.45, 0, 0.3, 1)', fill: 'forwards' }
    ));

    // Child-star ignites at centre and rises, with a brief ray-burst.
    await sleep(520);
    const star = newOverlayDiv(
      `left:${cx}px;top:${cy}px;width:30px;height:30px;margin:-15px 0 0 -15px;border-radius:50%;` +
      `background:radial-gradient(circle, rgba(255,250,220,1) 0%, rgba(255,225,140,0.6) 40%, transparent 75%);` +
      `box-shadow:0 0 26px 8px rgba(255,230,150,0.7);mix-blend-mode:screen;opacity:0;`
    );
    trackAnim(star.animate([
      { opacity: 0, transform: 'translateY(8px) scale(0.2)' },
      { opacity: 1, transform: 'translateY(-4px) scale(1.25)', offset: 0.4 },
      { opacity: 0.85, transform: 'translateY(-' + (cr.height * 0.06).toFixed(0) + 'px) scale(1.05)', offset: 0.7 },
      { opacity: 0, transform: 'translateY(-' + (cr.height * 0.12).toFixed(0) + 'px) scale(0.6)' }
    ], { duration: 900, easing: 'cubic-bezier(0.22, 1, 0.36, 1)', fill: 'forwards' }));
    // Ray-burst from the star.
    const rays = svgEl('svg');
    rays.style.cssText =
      `position:fixed;left:${cx}px;top:${cy}px;width:1px;height:1px;overflow:visible;` +
      `pointer-events:none;z-index:40;`;
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * 360;
      const ray = svgEl('line', {
        x1: 0, y1: -16, x2: 0, y2: -(16 + cr.width * 0.34),
        stroke: 'rgba(255,235,165,0.85)', 'stroke-width': 2, 'stroke-linecap': 'round',
        transform: `rotate(${a})`
      });
      ray.style.filter = 'drop-shadow(0 0 6px rgba(255,220,120,0.85))';
      rays.appendChild(ray);
    }
    trackEl(rays); document.body.appendChild(rays);
    trackAnim(rays.animate([
      { transform: 'scale(0.2) rotate(0deg)', opacity: 0 },
      { transform: 'scale(1) rotate(14deg)',  opacity: 1, offset: 0.4 },
      { transform: 'scale(1.4) rotate(26deg)', opacity: 0 }
    ], { duration: 760, easing: 'cubic-bezier(0.22, 1, 0.36, 1)', fill: 'forwards' }));
    await sleep(900);
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

  // Thoth-deck overrides. Four trumps differ from RW at the same key:
  //   maj08  Adjustment (RW Strength here)
  //   maj11  Lust       (RW Justice here)
  //   maj14  Art        (RW Temperance)
  //   maj20  Aeon       (RW Judgement)
  // When the active deck is Thoth, these keys use the Thoth effect; RW
  // keeps its own. All other keys share the same effect across decks.
  const THOTH_OVERRIDES = {
    maj08: adjustmentPoise,
    maj11: lustFlame,
    maj14: artAlchemy,
    maj20: aeonDawn
  };

  function isMajor(name) { return /^maj\d{2}$/.test(name || ''); }

  function effectFor(cardName) {
    if (activeDeck === "thoth" && THOTH_OVERRIDES[cardName]) return THOTH_OVERRIDES[cardName];
    return EFFECTS[cardName];
  }

  async function play(imgEl, cardName) {
    clearAll();
    const fn = effectFor(cardName);
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

  function setDeck(id) { activeDeck = (id === "thoth") ? "thoth" : "rw"; }

  window.MajorArcanaSignature = {
    isMajor: isMajor,
    play:    reduceMotion ? function () {} : play,
    cancel:  clearAll,
    schedule: reduceMotion ? function () {} : schedule,
    setDeck: setDeck
  };
})();
