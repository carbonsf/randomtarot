// --- Deck grid: all 78 cards, one hold deeper than the meanings ---------
//
// HOLD on the meanings screen (the same hold that opened them) and the
// words sink away; the card you were reading clears and settles into its
// place among all 78, and the rest of the deck surfaces around it, nearest
// first. TAP any card to lift it to full screen, TAP again to set it back.
// HOLD anywhere on the grid to rise back into the meanings. The cards float
// on slow water the whole time — in their movement only, never in graphics.
//
// This file is purely additive. It reads the app's existing globals
// (currentDeck, currentCardName, infoOverlayOpen, openInfoOverlay,
// closeInfoOverlay, cardDisplayName, haptic) and changes none of them;
// Randomizer.js has no knowledge of it. To switch the feature off, set
// DECK_GRID_ENABLED to false below, or delete its <script> line in
// index.html. Nothing else depends on it.
//
// Thumbnails come from thumbs/<deck>/<key>.jpg (see _gen_thumbs.py): the
// grid shows all 78 at once and the full Marseille faces alone are ~220 MB.

(function () {
  "use strict";

  const DECK_GRID_ENABLED = true;
  if (!DECK_GRID_ENABLED) return;
  if (typeof openInfoOverlay !== "function" || typeof closeInfoOverlay !== "function") return;

  // Same rhythm as the card's own long-press: the charge shows at 600 ms,
  // the hold commits at 2.2 s.
  const HOLD_CHARGE_MS = 600;
  const HOLD_COMMIT_MS = 2200;
  const HOLD_SLOP_PX = 9;           // movement that turns a hold into a scroll
  const SINK_MS = 520;              // meanings sink before the grid takes over
  const ARRIVE_LAND_MS = 840;       // the card's flight back into its place
  const LEAVE_MS = 800;             // the deck sinks before the meanings return
  const DEEP = "cubic-bezier(0.16, 1, 0.3, 1)";
  const FIRM = "cubic-bezier(0.4, 0, 0.2, 1)";
  const MUTED = "brightness(0.18) blur(3px) saturate(0.6)";   // = img.muted
  const CLEAR = "brightness(1) blur(0px) saturate(1)";

  const reduceMotion = !!(window.matchMedia &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches);

  // --- Decks ------------------------------------------------------------
  // Each deck's own card shape, names and arrangement. RW and Thoth set the
  // Fool above the three rows of seven (the journey laid out); Marseille's
  // Mat is unnumbered, so it waits apart, below the twenty-one. Each suit is
  // pips one to seven, then eight to ten beside the four courts.
  const GRID_DECKS = {
    rw: {
      aspect: 350 / 600,
      face: (k) => "rw/" + k + ".jpg",
      majorName: "Major Arcana", majorSub: "the Fool’s journey", foolLast: false,
      suits: ["Wands", "Cups", "Swords", "Pentacles"],
    },
    thoth: {
      aspect: 465 / 805,
      face: (k) => "thoth/artfill/" + k + ".jpg",
      majorName: "The Atu", majorSub: "Crowley’s trumps", foolLast: false,
      suits: ["Wands", "Cups", "Swords", "Disks"],
    },
    marseille: {
      aspect: 744 / 1456,
      face: (k) => "marseille/" + k + ".jpg",
      majorName: "Les Atouts", majorSub: "le Mat, sans nombre", foolLast: true,
      suits: ["Bâtons", "Coupes", "Épées", "Deniers"],
    },
  };
  const SUIT_KEYS = ["wands", "cups", "swords", "pents"];
  const ELEMENTS = ["fire", "water", "air", "earth"];
  const thumbSrc = (deck, k) => "thumbs/" + deck + "/" + k + ".jpg";
  const pad2 = (n) => String(n).padStart(2, "0");

  function layoutFor(deckId) {
    const d = GRID_DECKS[deckId] || GRID_DECKS.rw;
    const m = Array.from({ length: 22 }, (_, i) => "maj" + pad2(i));
    const sections = [{
      name: d.majorName, sub: d.majorSub,
      rows: d.foolLast
        ? [m.slice(1, 8), m.slice(8, 15), m.slice(15, 22), [m[0]]]
        : [[m[0]], m.slice(1, 8), m.slice(8, 15), m.slice(15, 22)],
    }];
    SUIT_KEYS.forEach((s, si) => {
      const cs = Array.from({ length: 14 }, (_, i) => s + pad2(i + 1));
      sections.push({ name: d.suits[si], sub: ELEMENTS[si], rows: [cs.slice(0, 7), cs.slice(7, 14)] });
    });
    const pos = {};
    let r = 0;
    sections.forEach((sec) => sec.rows.forEach((row) => {
      row.forEach((k, ci) => { pos[k] = { r, c: row.length === 1 ? 3 : ci }; });
      r++;
    }));
    return { deck: d, sections, pos };
  }

  // --- Styles -----------------------------------------------------------
  // Transform and opacity only on anything that moves every frame (see
  // NOTES.md: filters re-rasterise on iOS). The one filter here is the
  // flying card's single mute/clear, the same transition img.muted makes.
  const css = `
#deck-grid{position:fixed;inset:0;z-index:200;background:#000;overflow:hidden;color:#ececec;
  font-family:-apple-system,BlinkMacSystemFont,"SF Pro Text","Helvetica Neue",system-ui,sans-serif;
  -webkit-touch-callout:none;-webkit-user-select:none;user-select:none;-webkit-tap-highlight-color:transparent}
#deck-grid .dg-scroll{position:absolute;inset:0;overflow-y:auto;overflow-x:hidden;-webkit-overflow-scrolling:touch;
  overscroll-behavior:contain;touch-action:pan-y}
#deck-grid .dg-inner{max-width:600px;margin:0 auto;box-sizing:border-box;padding:52px 16px 72px;
  display:flex;flex-direction:column;gap:36px}
#deck-grid .dg-sec{display:flex;flex-direction:column;gap:14px;opacity:0;transform:translateY(6px);
  transition:opacity 900ms ${DEEP},transform 900ms ${DEEP}}
#deck-grid.dg-in .dg-sec{opacity:1;transform:none}
#deck-grid.dg-out .dg-sec{opacity:0;transition-delay:0ms!important}
#deck-grid .dg-head{display:flex;align-items:baseline;justify-content:space-between;gap:12px;padding:0 2px}
#deck-grid .dg-head h2{margin:0;font-family:"Cormorant Garamond","EB Garamond",Garamond,Georgia,serif;font-style:italic;
  font-weight:500;font-size:24px;line-height:1.18;color:#f4f3ee}
#deck-grid .dg-head p{margin:0;font-family:"Cormorant Garamond","EB Garamond",Garamond,Georgia,serif;font-style:italic;
  font-weight:400;font-size:17px;color:rgba(236,236,236,.62)}
#deck-grid .dg-rows{display:flex;flex-direction:column;gap:7px}
#deck-grid .dg-row{display:grid;grid-template-columns:repeat(7,minmax(0,1fr));gap:6px}
#deck-grid .dg-tile{-webkit-appearance:none;appearance:none;border:0;padding:0;margin:0;background:transparent;cursor:pointer;
  display:block;width:100%;perspective:520px;opacity:0;transform:translateY(10px) scale(.96);
  transition:opacity 700ms ${DEEP},transform 700ms ${DEEP}}
#deck-grid.dg-arrive .dg-tile{transform:translateY(4px) scale(.9)}
#deck-grid.dg-in .dg-tile{opacity:1;transform:none}
#deck-grid.dg-out .dg-tile{opacity:0;transform:translateY(6px) scale(.94)}
#deck-grid .dg-tile.dg-from{transform:none}
#deck-grid .dg-tile.dg-hidden{visibility:hidden}
#deck-grid .dg-float{display:block;width:100%;height:100%;border-radius:3px;will-change:transform}
#deck-grid .dg-from .dg-float{outline:1px solid rgba(244,243,238,.85);outline-offset:2px}
#deck-grid .dg-float img{display:block;width:100%;height:100%;object-fit:cover;border-radius:3px;
  -webkit-user-drag:none;pointer-events:none}
#deck-grid .dg-backdrop{position:absolute;inset:0;background:#000;opacity:0;pointer-events:none;
  transition:opacity 640ms ${DEEP}}
#deck-grid .dg-fly{position:absolute;inset:0;width:100%;height:100%;display:none;object-fit:contain;
  transform-origin:50% 50%;pointer-events:none;will-change:transform}
#deck-grid .dg-fly.dg-live{display:block}
#deck-grid .dg-fly.dg-tappable{pointer-events:auto;cursor:pointer}
#deck-grid .dg-scrim{position:absolute;inset:0;background:rgba(0,0,0,.78);opacity:0;pointer-events:none;
  transition:opacity 520ms ${DEEP}}
#info-overlay.dg-charging .info-stanza{opacity:.55!important;transition:opacity 600ms ${DEEP}!important}
img.muted.dg-charging{animation:dgCharge 900ms ease-in-out infinite}
@keyframes dgCharge{0%,100%{filter:${MUTED}}50%{filter:brightness(.3) blur(3px) saturate(.6)}}
#info-overlay.dg-sink .info-stanza{opacity:0!important;transform:translateY(10px)!important;
  transition:opacity 380ms cubic-bezier(.4,0,.6,1),transform 380ms cubic-bezier(.4,0,.6,1)!important}
#info-overlay.dg-sink .info-stanza:nth-last-child(2){transition-delay:60ms!important}
#info-overlay.dg-sink .info-stanza:nth-last-child(3){transition-delay:120ms!important}
#info-overlay.dg-sink .info-stanza:nth-last-child(n+4){transition-delay:180ms!important}
#info-overlay.dg-hold .info-stanza{opacity:0!important;transform:translateY(14px)!important;transition:none!important}
@media (prefers-reduced-motion: reduce){
  #deck-grid .dg-sec,#deck-grid .dg-tile{transition:opacity 160ms linear!important;transform:none!important}
  img.muted.dg-charging{animation:none}
}`;

  function injectStyle() {
    if (document.getElementById("deck-grid-style")) return;
    const st = document.createElement("style");
    st.id = "deck-grid-style";
    st.textContent = css;
    document.head.appendChild(st);
  }

  // --- Swallow the click that follows a committed hold -------------------
  // The finger that held is still down when the screen changes underneath
  // it; its release must not also count as a tap (which would close the
  // meanings, or open a card in the grid).
  let swallowClick = false, swallowTimer = null, swallowSafety = null;
  function swallowReleaseClick() {
    swallowClick = true;
    clearTimeout(swallowTimer); swallowTimer = null;
    clearTimeout(swallowSafety);
    swallowSafety = setTimeout(() => { swallowClick = false; }, 8000);
  }
  function releaseSeen() {
    if (!swallowClick || swallowTimer) return;
    swallowTimer = setTimeout(() => { swallowClick = false; swallowTimer = null; }, 350);
  }
  ["pointerup", "pointercancel", "touchend", "touchcancel", "mouseup"].forEach((t) =>
    document.addEventListener(t, releaseSeen, { capture: true, passive: true }));
  document.addEventListener("click", (e) => {
    if (!swallowClick) return;
    e.stopPropagation();
    e.preventDefault();
  }, true);

  function cardImg() { return document.querySelector("img"); }
  function overlay() { return document.getElementById("info-overlay"); }
  function buzz(ms) { if (typeof haptic === "function") haptic(ms); }

  // --- Hold on the meanings ---------------------------------------------
  let mHold = null;   // { id, x, y, charge, commit }

  function meaningsHoldCancel() {
    if (!mHold) return;
    clearTimeout(mHold.charge);
    clearTimeout(mHold.commit);
    mHold = null;
    const ov = overlay(), img = cardImg();
    if (ov) ov.classList.remove("dg-charging");
    if (img) img.classList.remove("dg-charging");
  }

  document.addEventListener("pointerdown", (e) => {
    const ov = overlay();
    if (mHold) { meaningsHoldCancel(); return; }          // a second finger: not a hold
    if (grid || !ov || !infoOverlayOpen || !ov.classList.contains("open")) return;
    if (!ov.contains(e.target) || e.button > 0 || !e.isPrimary) return;
    if (typeof currentCardName === "undefined" || !currentCardName) return;
    mHold = {
      id: e.pointerId, x: e.clientX, y: e.clientY,
      charge: setTimeout(() => {
        ov.classList.add("dg-charging");
        const img = cardImg();
        if (img) img.classList.add("dg-charging");
        buzz(4);
      }, HOLD_CHARGE_MS),
      commit: setTimeout(intoDeck, HOLD_COMMIT_MS),
    };
  }, true);
  document.addEventListener("pointermove", (e) => {
    if (!mHold || e.pointerId !== mHold.id) return;
    if (Math.hypot(e.clientX - mHold.x, e.clientY - mHold.y) > HOLD_SLOP_PX) meaningsHoldCancel();
  }, true);
  ["pointerup", "pointercancel"].forEach((t) => document.addEventListener(t, (e) => {
    if (mHold && e.pointerId === mHold.id) meaningsHoldCancel();
  }, true));

  function intoDeck() {
    const ov = overlay(), img = cardImg();
    if (!mHold || !ov || !img || !infoOverlayOpen) { meaningsHoldCancel(); return; }
    clearTimeout(mHold.charge);
    mHold = null;
    buzz(12);
    swallowReleaseClick();
    ov.classList.remove("dg-charging");
    img.classList.remove("dg-charging");
    // The words sink back into the dark, last stanza first. The muted card
    // stays exactly where it is, so the grid can take it over from this frame.
    ov.classList.add("dg-sink");
    setTimeout(() => {
      openGrid(img);
      // Under the (opaque) grid, put the reading screen away as usual.
      closeInfoOverlay();
      ov.classList.remove("dg-sink");
    }, SINK_MS);
  }

  // --- The grid ---------------------------------------------------------
  let grid = null;

  function openGrid(img) {
    if (grid) return;
    injectStyle();
    const deckId = (typeof currentDeck === "string" && GRID_DECKS[currentDeck]) ? currentDeck : "rw";
    const L = layoutFor(deckId);
    const fromKey = currentCardName;
    const g = grid = {
      deckId, L, fromKey,
      reversed: img.classList.contains("reversed"),
      appSrc: img.currentSrc || img.src,
      appAspect: (img.naturalWidth && img.naturalHeight) ? img.naturalWidth / img.naturalHeight : L.deck.aspect,
      tiles: {}, bodies: {}, ripples: [], timers: [],
      mode: "arrive", flyFull: true, settled: false, layoutDirty: true,
      scrollVel: 0, lastScroll: 0, hold: null, openKey: null,
      lastWake: { x: -999, y: -999, at: 0 },
      t0: performance.now(), last: performance.now(),
    };
    const later = (ms, fn) => g.timers.push(setTimeout(fn, ms));
    g.later = later;

    const root = document.createElement("div");
    root.id = "deck-grid";
    root.className = "dg-arrive";
    root.setAttribute("role", "dialog");
    root.setAttribute("aria-label", "All 78 cards");
    const scroller = document.createElement("div");
    scroller.className = "dg-scroll";
    const inner = document.createElement("div");
    inner.className = "dg-inner";
    scroller.appendChild(inner);

    const dist = {};
    const p0 = L.pos[fromKey] || { r: 0, c: 3 };
    for (const k in L.pos) dist[k] = Math.abs(L.pos[k].r - p0.r) + Math.abs(L.pos[k].c - p0.c) * 0.85;
    g.dist = dist;

    L.sections.forEach((sec, si) => {
      const s = document.createElement("section");
      s.className = "dg-sec";
      s.style.transitionDelay = (460 + si * 110) + "ms";
      const head = document.createElement("div");
      head.className = "dg-head";
      const h2 = document.createElement("h2");
      h2.textContent = sec.name;
      const p = document.createElement("p");
      p.textContent = sec.sub;
      head.append(h2, p);
      const rows = document.createElement("div");
      rows.className = "dg-rows";
      sec.rows.forEach((row) => {
        const rowEl = document.createElement("div");
        rowEl.className = "dg-row";
        row.forEach((k) => {
          const b = document.createElement("button");
          b.type = "button";
          b.className = "dg-tile" + (k === fromKey ? " dg-from dg-hidden" : "");
          b.style.aspectRatio = String(L.deck.aspect);
          if (row.length === 1) b.style.gridColumn = "4 / span 1";
          b.style.transitionDelay = Math.round(380 + dist[k] * 46) + "ms";
          b.setAttribute("aria-label", typeof cardDisplayName === "function" ? cardDisplayName(k, deckId) : k);
          const fl = document.createElement("span");
          fl.className = "dg-float";
          const im = document.createElement("img");
          im.alt = "";
          im.decoding = "async";
          im.loading = "lazy";
          im.draggable = false;
          im.src = thumbSrc(deckId, k);
          fl.appendChild(im);
          b.appendChild(fl);
          b.addEventListener("click", () => openTile(k));
          rowEl.appendChild(b);
          g.tiles[k] = { btn: b, float: fl, img: im };
        });
        rows.appendChild(rowEl);
      });
      s.append(head, rows);
      inner.appendChild(s);
    });

    const backdrop = document.createElement("div");
    backdrop.className = "dg-backdrop";
    const fly = document.createElement("img");
    fly.className = "dg-fly";
    fly.alt = "";
    fly.draggable = false;
    fly.addEventListener("click", closeTile);
    const scrim = document.createElement("div");
    scrim.className = "dg-scrim";
    root.append(scroller, backdrop, fly, scrim);
    Object.assign(g, { root, scroller, backdrop, fly, scrim });

    // First frame = the meanings screen minus its words: the same card,
    // muted, under the same scrim, on black. Nothing visibly changes yet.
    backdrop.style.transition = "none";
    backdrop.style.opacity = "1";
    scrim.style.transition = "none";
    scrim.style.opacity = "1";
    setFly(g.appSrc, g.appAspect, null, g.reversed ? 180 : 0, MUTED, "none");
    fly.classList.add("dg-live");

    wireGrid(g);
    document.body.appendChild(root);
    void root.offsetHeight;
    backdrop.style.transition = "";
    scrim.style.transition = "";

    g.raf = requestAnimationFrame(function loop(now) {
      if (grid !== g) return;
      tick(g, now);
      g.raf = requestAnimationFrame(loop);
    });

    requestAnimationFrame(() => requestAnimationFrame(() => {
      if (grid !== g) return;
      const slot = slotRect(g, fromKey, true);
      // The scrim lifts and the card clears as it sinks back to its place,
      // righting itself if it was drawn reversed; the deck surfaces around it.
      scrim.style.opacity = "0";
      fly.style.transition = "filter 700ms " + DEEP;
      fly.style.filter = CLEAR;
      later(140, () => {
        g.flyFull = false;
        backdrop.style.opacity = "0";
        root.classList.add("dg-in");
        if (slot) setFly(null, null, slot, 0, CLEAR, ARRIVE_LAND_MS + "ms " + DEEP);
      });
      later(140 + ARRIVE_LAND_MS, () => {
        fly.classList.remove("dg-live");
        const t = g.tiles[fromKey];
        if (t) t.btn.classList.remove("dg-hidden");
        g.mode = "idle";
        g.layoutDirty = true;
        const b = g.bodies[fromKey];
        if (b) { ripple(g, b.cx, b.cy, 1.0); b.vz -= 36; }
      });
      later(2700, () => {
        g.settled = true;
        g.layoutDirty = true;
        Object.values(g.tiles).forEach((t) => { t.btn.style.transitionDelay = "0ms"; });
        root.querySelectorAll(".dg-sec").forEach((s) => { s.style.transitionDelay = "0ms"; });
      });
    }));
  }

  // Place the flying card: full screen when rect is null, else exactly over
  // a tile. Transform only, so the flight never touches layout.
  function setFly(src, aspect, rect, rot, filter, transition) {
    const g = grid;
    if (!g) return;
    const fly = g.fly;
    if (src) { fly.src = src; g.flyAspect = aspect; }
    let tf = "translate3d(0px,0px,0px) scale(1,1) rotate(" + rot + "deg)";
    if (rect) {
      const W = g.root.clientWidth, H = g.root.clientHeight;
      const a = g.flyAspect || g.L.deck.aspect;
      const cw = Math.min(W, H * a), ch = cw / a;
      const dx = rect.l + rect.w / 2 - W / 2, dy = rect.t + rect.h / 2 - H / 2;
      tf = "translate3d(" + dx + "px," + dy + "px,0px) scale(" + rect.w / cw + "," + rect.h / ch + ") rotate(" + rot + "deg)";
    }
    fly.style.transition = transition === "none" ? "none"
      : "transform " + transition + ", filter 700ms " + DEEP;
    fly.style.transform = tf;
    if (filter) fly.style.filter = filter;
  }

  function slotRect(g, key, reveal) {
    const t = g.tiles[key];
    if (!t) return null;
    const rr = g.root.getBoundingClientRect();
    let r = t.btn.getBoundingClientRect();
    if (reveal) {
      const H = g.root.clientHeight;
      if (r.top - rr.top < 60 || r.bottom - rr.top > H - 60) {
        g.scroller.scrollTop = Math.max(0, g.scroller.scrollTop + (r.top - rr.top) - H / 2 + r.height / 2);
        g.lastScroll = g.scroller.scrollTop;
        r = t.btn.getBoundingClientRect();
      }
    }
    return { l: r.left - rr.left, t: r.top - rr.top, w: r.width, h: r.height };
  }

  // --- Tap a card: lift it to full screen, tap to set it back -----------
  function openTile(key) {
    const g = grid;
    if (!g || g.mode !== "idle" || swallowClick) return;
    gridHoldCancel(g);
    const t = g.tiles[key];
    const r = t.float.getBoundingClientRect(), rr = g.root.getBoundingClientRect();
    const rect = { l: r.left - rr.left, t: r.top - rr.top, w: r.width, h: r.height };
    g.mode = "open";
    g.openKey = key;
    setFly(t.img.currentSrc || t.img.src, g.L.deck.aspect, rect, 0, CLEAR, "none");
    g.fly.classList.add("dg-live", "dg-tappable");
    g.fly.alt = t.btn.getAttribute("aria-label") || "";
    t.btn.classList.add("dg-hidden");
    void g.fly.offsetHeight;
    setFly(null, null, null, 0, CLEAR, "620ms " + DEEP);
    g.backdrop.style.opacity = "1";
    g.later(620, () => { if (g.openKey === key) g.flyFull = true; });
    // Swap the thumbnail for the full face once it has decoded.
    const full = new Image();
    full.src = g.L.deck.face(key);
    (full.decode ? full.decode() : Promise.resolve()).then(() => {
      if (grid === g && g.openKey === key && g.mode === "open") g.fly.src = full.src;
    }).catch(() => {});
  }

  function closeTile() {
    const g = grid;
    if (!g || g.mode !== "open") return;
    const key = g.openKey;
    g.mode = "closing";
    g.flyFull = false;
    g.fly.classList.remove("dg-tappable");
    const rect = slotRect(g, key, false);
    if (rect) setFly(null, null, rect, 0, CLEAR, "460ms " + FIRM);
    g.backdrop.style.opacity = "0";
    g.later(470, () => {
      g.fly.classList.remove("dg-live");
      g.tiles[key].btn.classList.remove("dg-hidden");
      g.mode = "idle";
      g.openKey = null;
      // Set back down: it lands in its place and rings the water.
      const b = g.bodies[key];
      if (b) { ripple(g, b.cx, b.cy, 0.9); b.vz -= 36; }
    });
  }

  // --- Hold on the grid: back to the meanings ---------------------------
  function gridHoldCancel(g) {
    if (!g.hold) return;
    clearTimeout(g.hold.charge);
    clearTimeout(g.hold.commit);
    g.hold = null;
    if (g.mode === "idle") g.backdrop.style.opacity = "0";
  }

  function backToMeanings() {
    const g = grid;
    if (!g || g.mode !== "idle") return;
    g.hold = null;
    buzz(12);
    swallowReleaseClick();
    g.mode = "leave";
    const key = g.fromKey;
    const t = g.tiles[key];
    const rect = slotRect(g, key, false);
    const thumbReady = t && t.img.complete && t.img.naturalWidth;
    // The reverse of arriving: the deck sinks away, nearest first, while the
    // card you came from rises out of its place and dims under the scrim.
    setFly(thumbReady ? t.img.currentSrc || t.img.src : g.appSrc,
      thumbReady ? g.L.deck.aspect : g.appAspect, rect, 0, CLEAR, "none");
    g.fly.classList.add("dg-live");
    if (t) t.btn.classList.add("dg-hidden");
    Object.keys(g.tiles).forEach((k) => {
      g.tiles[k].btn.style.transitionDelay = Math.round(g.dist[k] * 16) + "ms";
    });
    void g.fly.offsetHeight;
    setFly(null, null, null, g.reversed ? 180 : 0, MUTED, LEAVE_MS + "ms " + DEEP);
    g.root.classList.add("dg-out");
    g.backdrop.style.opacity = "1";
    g.scrim.style.opacity = "1";
    g.later(160, () => { g.flyFull = true; });

    // Underneath the grid, reopen the reading with its words held back, so
    // they can rise the moment the grid lifts away.
    const ov = overlay(), img = cardImg();
    if (ov && img) {
      ov.classList.add("dg-hold");
      openInfoOverlay(img);
    }
    g.later(LEAVE_MS, () => {
      destroyGrid();
      if (ov) ov.classList.remove("dg-hold");
    });
  }

  function destroyGrid() {
    const g = grid;
    if (!g) return;
    grid = null;
    cancelAnimationFrame(g.raf);
    g.timers.forEach(clearTimeout);
    gridHoldCancel(g);
    window.removeEventListener("resize", g.onResize);
    window.removeEventListener("keydown", g.onKey, true);
    g.root.remove();
  }

  function wireGrid(g) {
    const sc = g.scroller;
    const point = (e) => {
      const rr = sc.getBoundingClientRect();
      return { x: e.clientX - rr.left, y: e.clientY - rr.top + sc.scrollTop };
    };
    sc.addEventListener("pointerdown", (e) => {
      if (g.mode !== "idle" || e.button > 0) return;
      if (!e.isPrimary) { gridHoldCancel(g); return; }
      const p = point(e);
      ripple(g, p.x, p.y, 1.0);
      gridHoldCancel(g);
      g.hold = {
        id: e.pointerId, x: e.clientX, y: e.clientY,
        charge: setTimeout(() => {
          if (g.mode !== "idle") return;
          g.backdrop.style.opacity = "0.32";     // the deck hushes
          buzz(4);
        }, HOLD_CHARGE_MS),
        commit: setTimeout(backToMeanings, HOLD_COMMIT_MS),
      };
    });
    sc.addEventListener("pointermove", (e) => {
      if (g.hold && e.pointerId === g.hold.id &&
          Math.hypot(e.clientX - g.hold.x, e.clientY - g.hold.y) > HOLD_SLOP_PX) gridHoldCancel(g);
      // A mouse trailing over the cards leaves a faint wake; a finger is scrolling instead.
      if (e.pointerType !== "mouse" || g.mode !== "idle") return;
      const p = point(e), now = performance.now();
      const dx = p.x - g.lastWake.x, dy = p.y - g.lastWake.y;
      if (dx * dx + dy * dy > 484 && now - g.lastWake.at > 80) {
        ripple(g, p.x, p.y, 0.3);
        g.lastWake = { x: p.x, y: p.y, at: now };
      }
    });
    ["pointerup", "pointercancel", "pointerleave"].forEach((t) =>
      sc.addEventListener(t, (e) => { if (g.hold && e.pointerId === g.hold.id) gridHoldCancel(g); }));
    // Keep the desktop deck switching (right-click, arrow keys) out of the
    // grid, so the deck can't change underneath it.
    g.root.addEventListener("contextmenu", (e) => e.preventDefault());
    g.onKey = (e) => {
      if (grid !== g) return;
      if (e.key === "Escape") {
        if (g.mode === "open") closeTile();
        else if (g.mode === "idle") backToMeanings();
      } else if (!["ArrowLeft", "ArrowRight", "d", "D", "1", "2", "3"].includes(e.key)) {
        return;
      }
      e.stopPropagation();
      e.preventDefault();
    };
    window.addEventListener("keydown", g.onKey, true);
    g.onResize = () => { g.layoutDirty = true; };
    window.addEventListener("resize", g.onResize);
  }

  // --- The water --------------------------------------------------------
  // A height field: four long, slow swells whose strengths drift on their
  // own cycles (so the surface never quite repeats), plus rings from
  // touches, landings and arrivals. Each card is a floating body on soft,
  // lightly damped springs chasing what the water under its centre does:
  // height becomes bob and scale, slope becomes drift and tilt. Each card
  // has its own mass and a slow wander, so neighbours drift in and out of
  // step instead of moving as one sheet. Scrolling drags the water.
  const WAVES = [
    [1100, 78, 34, 3.6, 0.061, 0.3],
    [620, 34, 26, 2.8, 0.097, 1.9],
    [380, 128, 21, 1.7, 0.143, 4.1],
    [240, -18, 16, 0.9, 0.211, 2.6],
  ].map(([lambda, deg, speed, a, g, p]) => {
    const k = (2 * Math.PI) / lambda, th = (deg * Math.PI) / 180;
    return { kx: k * Math.cos(th), ky: k * Math.sin(th), w: k * speed, a, g, p, p2: p * 1.7 };
  });
  const RC = 150, RS = 54, RT = 2.2, RK = (2 * Math.PI) / 96;

  function field(g, x, y, t) {
    let h = 0, gx = 0, gy = 0;
    for (const w of WAVES) {
      const a = w.a * (0.65 + 0.35 * Math.sin(t * w.g + w.p2));
      const ph = w.kx * x + w.ky * y - w.w * t + w.p;
      const s = Math.sin(ph), c = Math.cos(ph);
      h += a * s; gx += a * c * w.kx; gy += a * c * w.ky;
    }
    for (const r of g.ripples) {
      const age = t - r.t;
      if (age < 0) continue;
      const dx = x - r.x, dy = y - r.y, d = Math.sqrt(dx * dx + dy * dy) + 0.001;
      const u = d - RC * age;
      const env = r.a * Math.exp(-(u * u) / (2 * RS * RS)) * Math.exp(-age / RT) / (1 + d / 260);
      if (env < 0.0015) continue;
      h += env * Math.cos(RK * u);
      const dh = -env * RK * Math.sin(RK * u);
      gx += (dh * dx) / d; gy += (dh * dy) / d;
    }
    return [h, gx, gy];
  }

  function ripple(g, x, y, a) {
    g.ripples.push({ x, y, a, t: (performance.now() - g.t0) / 1000 });
    if (g.ripples.length > 28) g.ripples.shift();
  }

  function measure(g) {
    const sr = g.scroller.getBoundingClientRect(), st = g.scroller.scrollTop;
    for (const k in g.tiles) {
      const r = g.tiles[k].btn.getBoundingClientRect();
      let b = g.bodies[k];
      if (!b) {
        b = g.bodies[k] = {
          x: 0, y: 0, z: 0, rx: 0, ry: 0, rz: 0, vx: 0, vy: 0, vz: 0, vrx: 0, vry: 0, vrz: 0,
          m: 0.8 + Math.random() * 0.6, ph: Math.random() * Math.PI * 2, f: 0.45 + Math.random() * 0.4,
          dropAt: g.t0 + 140 + 380 + g.dist[k] * 46 + 180, dropped: k === g.fromKey,
        };
      }
      b.cx = r.left - sr.left + r.width / 2;
      b.cy = r.top - sr.top + r.height / 2 + st;
    }
    g.layoutDirty = false;
  }

  function tick(g, now) {
    const dt = Math.min(0.034, Math.max(0.001, (now - g.last) / 1000));
    g.last = now;
    if (reduceMotion || g.flyFull) return;     // nothing to see under a full-screen card
    if (g.layoutDirty) measure(g);
    const t = (now - g.t0) / 1000;
    g.ripples = g.ripples.filter((r) => t - r.t < 9);

    const st = g.scroller.scrollTop;
    g.scrollVel += ((st - g.lastScroll) / dt - g.scrollVel) * Math.min(1, dt * 7);
    g.lastScroll = st;
    const clamp = (v, lo, hi) => (v < lo ? lo : v > hi ? hi : v);
    const sDrag = clamp(-g.scrollVel * 0.016, -14, 14);
    const sTilt = clamp(g.scrollVel * 0.012, -11, 11);

    for (const k in g.bodies) {
      const b = g.bodies[k];
      if (!b.dropped && now >= b.dropAt) {
        b.dropped = true;
        b.vz -= 26; b.vrx += 22 * (Math.random() - 0.5); b.vry += 14 * (Math.random() - 0.5);
      }
      const f = field(g, b.cx, b.cy, t);
      const wt = t * b.f;
      const tz = f[0] + Math.sin(wt + b.ph) * 0.9;
      const tx = -f[1] * 105 + Math.sin(wt * 0.43 + b.ph) * 1.6;
      const ty = -f[2] * 105 + Math.cos(wt * 0.37 + b.ph * 1.3) * 1.4 + sDrag * b.m;
      const trx = clamp(f[2] * 210 + sTilt * b.m + Math.sin(wt * 0.8 + b.ph) * 1.2, -20, 20);
      const tryy = clamp(-f[1] * 210 + Math.cos(wt * 0.7 + b.ph * 0.6) * 1.2, -20, 20);
      const trz = clamp((f[1] - f[2]) * 34 + Math.sin(wt * 0.5 + b.ph * 2) * 0.7, -6, 6);
      // Soft, lightly damped: the cards lag the water and overshoot a little.
      const kk = 7 / b.m, c = 2 * Math.sqrt(kk) * 0.3;
      b.vx += (kk * (tx - b.x) - c * b.vx) * dt; b.x += b.vx * dt;
      b.vy += (kk * (ty - b.y) - c * b.vy) * dt; b.y += b.vy * dt;
      b.vz += (kk * (tz - b.z) - c * b.vz) * dt; b.z += b.vz * dt;
      b.vrx += (kk * (trx - b.rx) - c * b.vrx) * dt; b.rx += b.vrx * dt;
      b.vry += (kk * (tryy - b.ry) - c * b.vry) * dt; b.ry += b.vry * dt;
      b.vrz += (kk * (trz - b.rz) - c * b.vrz) * dt; b.rz += b.vrz * dt;
      g.tiles[k].float.style.transform =
        "translate3d(" + b.x.toFixed(2) + "px," + (b.y - b.z * 0.5).toFixed(2) + "px,0) " +
        "rotateX(" + b.rx.toFixed(2) + "deg) rotateY(" + b.ry.toFixed(2) + "deg) rotateZ(" + b.rz.toFixed(2) + "deg) " +
        "scale(" + (1 + b.z * 0.006).toFixed(4) + ")";
    }
  }
})();
