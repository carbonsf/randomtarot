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
  // A mouse gets a far wider margin. The slop exists to tell a hold from a
  // scroll, and nothing competes with a held mouse button the way a scroll
  // competes with a held finger — while 2.2 s is a long time for a hand
  // resting on a mouse or trackpad to stay inside nine pixels. At the tight
  // threshold the hold simply never committed on a desktop.
  const HOLD_SLOP_MOUSE_PX = 48;
  const slopFor = (type) => (type === "mouse" ? HOLD_SLOP_MOUSE_PX : HOLD_SLOP_PX);
  const SINK_MS = 520;              // meanings sink before the grid takes over
  const ARRIVE_LAND_MS = 840;       // the card's flight back into its place
  const LEAVE_MS = 800;             // the deck sinks before the meanings return
  const DEEP = "cubic-bezier(0.16, 1, 0.3, 1)";
  const FIRM = "cubic-bezier(0.4, 0, 0.2, 1)";
  // DEEP spends most of its change in its first quarter, which is right for
  // something arriving in space and wrong for something changing in
  // brightness: the card clearing from brightness .18 to 1 is a 5.5x jump,
  // and front-loading it reads as a flash. Light changes ride this instead.
  const SOFT = "cubic-bezier(0.45, 0, 0.35, 1)";
  // A beat where the card simply sits where the reading was, before it
  // starts back to its place. Without it the card moves the instant the
  // words have gone and there is nothing to register.
  const GRID_HOLD_MS = 260;
  const MUTED = "brightness(0.18) blur(3px) saturate(0.6)";   // = img.muted
  const CLEAR = "brightness(1) blur(0px) saturate(1)";

  const reduceMotion = !!(window.matchMedia &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches);

  // --- The sweep --------------------------------------------------------
  // Changing decks here is one gesture-agnostic move: a hand smushes the
  // whole tableau off the table while the other hand pushes the next deck
  // on behind it, and the new cards coast into their places and take a beat
  // to stop ringing. Everything below is a window; the actual numbers are
  // drawn fresh on every switch (see sweepParams) so no two look alike.
  const SWEEP_FRONT_MS  = 300;   // the hand crossing the whole tableau
  const SWEEP_HOLD_MS   = 110;   // a struck card's grace before it fades
  const SWEEP_FADE_MS   = 210;   // and how long the fade takes
  const SWEEP_GAP_MS    = 470;   // a slot emptying -> its new card arriving
  const SWEEP_RISE_MS   = 170;   // the new card's fade-up as it flies in
  // When a card stops being "arriving" and is simply floating again. This
  // is bookkeeping, NOT an end to its motion: by now the extra authority
  // below has decayed to nothing, so letting go of the record changes
  // nothing on screen. Nothing in the sweep ever cuts a card's movement
  // short — a card is only ever put in its place if the frame loop has
  // died and there is no spring left to carry it (see finishSweep).
  const SWEEP_RELEASE_MS = 1500;
  const SWEEP_CAP_MS     = 12000; // absolute sim-time backstop
  const SWEEP_DRAG      = 1.15;  // air on a card sliding off the table (1/s)
  const SWEEP_GRAVITY   = 150;   // pulls the lifted card back down (z/s²)

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
/* touch-action:none, for the reason the meanings overlay carries it
   (NOTES.md): with a scrollable touch-action, iOS hands a two-finger stir
   to its own scroller and terminates the gesture with touchcancel, so the
   circle could never be read. Dragging the deck is preserved by the
   one-finger handler in wireGrid(), with the throw carried by tick(). */
#deck-grid .dg-scroll{position:absolute;inset:0;overflow-y:auto;overflow-x:hidden;
  overscroll-behavior:contain;touch-action:none}
#deck-grid .dg-inner{max-width:600px;margin:0 auto;box-sizing:border-box;padding:52px 16px 72px;
  display:flex;flex-direction:column;gap:36px}
#deck-grid .dg-sec{display:flex;flex-direction:column;gap:14px;opacity:0;transform:translateY(6px);
  transition:opacity 900ms ${DEEP},transform 900ms ${DEEP}}
#deck-grid.dg-in .dg-sec{opacity:1;transform:none}
#deck-grid.dg-out .dg-sec{opacity:0;transition-delay:0ms!important}
#deck-grid .dg-head{display:flex;align-items:baseline;justify-content:space-between;gap:12px;padding:0 2px;
  transition:opacity 260ms ${DEEP}}
/* The headings can't ride the sweep (they aren't cards), so they simply
   stand aside while the table is cleared and are back, renamed, by the
   time the new deck has anything to sit under. */
#deck-grid.dg-sweep .dg-head{opacity:0;transition-duration:200ms}
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
      id: e.pointerId, x: e.clientX, y: e.clientY, type: e.pointerType,
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
    if (Math.hypot(e.clientX - mHold.x, e.clientY - mHold.y) > slopFor(mHold.type)) meaningsHoldCancel();
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
    // Have the card decoded before the grid takes it over. The grid's first
    // frame is meant to be this screen minus its words, which only holds if
    // its copy of the card can paint immediately; one that is still
    // decoding turns the handover into a black blink. The source is already
    // on screen, so this normally resolves at once — capped either way,
    // since the sink must not be left hanging on it.
    const warm = new Image();
    warm.src = img.currentSrc || img.src;
    const decoded = (warm.decode ? warm.decode() : Promise.resolve()).catch(() => {});
    Promise.all([
      Promise.race([decoded, new Promise((r) => setTimeout(r, 220))]),
      new Promise((r) => setTimeout(r, SINK_MS)),
    ]).then(() => {
      if (!grid && infoOverlayOpen) {
        openGrid(img);
        // Under the (opaque) grid, put the reading screen away as usual.
        closeInfoOverlay();
      }
      ov.classList.remove("dg-sink");
    });
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
      // Simulated milliseconds: the sum of the frame steps actually taken.
      // The sweep runs on this rather than on the wall clock so its phases
      // can never outrun the motion when frames are scarce.
      sim: 0, sweepTo: null, swapAt: 0, sweepCap: 0, swapped: false,
      scGlide: 0, scMoved: false,
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
      // Nothing changes for a beat: the card is simply there, where the
      // words were. Then everything moves together — it sinks back to its
      // place, righting itself if it was drawn reversed, and comes into
      // ordinary light ON THE WAY rather than before it leaves. The light
      // rides SOFT so the clearing tracks the shrinking instead of
      // arriving ahead of it in a flash.
      later(GRID_HOLD_MS, () => {
        g.flyFull = false;
        scrim.style.transition = "opacity 640ms " + SOFT;
        scrim.style.opacity = "0";
        backdrop.style.transition = "opacity 700ms " + SOFT;
        backdrop.style.opacity = "0";
        root.classList.add("dg-in");
        if (slot) {
          setFly(null, null, slot, 0, CLEAR, ARRIVE_LAND_MS + "ms " + DEEP,
                 "filter 820ms " + SOFT);
        } else {
          fly.style.transition = "filter 820ms " + SOFT;
          fly.style.filter = CLEAR;
        }
      });
      later(GRID_HOLD_MS + ARRIVE_LAND_MS, () => {
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
        warmThumbs(g);
      });
    }));
  }

  // Place the flying card: full screen when rect is null, else exactly over
  // a tile. Transform only, so the flight never touches layout.
  function setFly(src, aspect, rect, rot, filter, transition, filterTr) {
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
      : "transform " + transition + ", " + (filterTr || "filter 700ms " + DEEP);
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
        id: e.pointerId, x: e.clientX, y: e.clientY, type: e.pointerType,
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
          Math.hypot(e.clientX - g.hold.x, e.clientY - g.hold.y) > slopFor(g.hold.type)) gridHoldCancel(g);
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
    // Dragging the deck by hand, because the scroller carries
    // touch-action:none (see the stylesheet). One finger only — the moment
    // a second lands this stands down, so a stir is never also a scroll.
    // Mouse wheel, trackpad and keyboard still scroll the container
    // natively; touch-action has no say over those.
    let scId = null, scStartY = 0, scStartTop = 0, scLastY = 0, scLastT = 0;
    sc.addEventListener("touchstart", (e) => {
      g.scGlide = 0;                       // a finger down stops the throw
      g.scMoved = false;
      if (!e.touches || e.touches.length !== 1 || g.mode === "open") { scId = null; return; }
      const t = e.touches[0];
      scId = t.identifier;
      scStartY = scLastY = t.clientY;
      scStartTop = sc.scrollTop;
      scLastT = e.timeStamp || performance.now();
    }, { passive: true });
    sc.addEventListener("touchmove", (e) => {
      if (scId === null || !e.touches || e.touches.length !== 1) { scId = null; return; }
      const t = e.touches[0];
      if (t.identifier !== scId) return;
      const at = e.timeStamp || performance.now();
      const dy = t.clientY - scLastY, span = Math.max(1, at - scLastT);
      sc.scrollTop = scStartTop - (t.clientY - scStartY);
      // px/s, smoothed so one jittery last frame can't decide the throw.
      const v = (-dy / span) * 1000;
      g.scGlide = g.scGlide ? g.scGlide * 0.6 + v * 0.4 : v;
      scLastY = t.clientY;
      scLastT = at;
      if (Math.abs(t.clientY - scStartY) > 8) g.scMoved = true;
    }, { passive: true });
    sc.addEventListener("touchend", () => {
      scId = null;
      if (performance.now() - scLastT > 120) g.scGlide = 0;   // held still: no throw
    }, { passive: true });
    sc.addEventListener("touchcancel", () => { scId = null; g.scGlide = 0; }, { passive: true });
    // A drag must not also count as a tap on whatever it ended over. Native
    // scrolling suppressed that click for us; now we do it ourselves.
    sc.addEventListener("click", (e) => {
      if (!g.scMoved) return;
      e.stopPropagation();
      e.preventDefault();
    }, true);

    // Two-finger gestures. Each handler no-ops unless exactly two fingers
    // are down, so one-finger scrolling is untouched and the three-finger
    // share — which Randomizer.js binds on document, in capture, ahead of
    // these — still reaches its own handlers first.
    g.root.addEventListener("touchstart", (e) => {
      if (!e.touches || e.touches.length !== 2 || g.mode !== "idle") { tfPath = null; return; }
      gridHoldCancel(g);
      tfPath = [tfMidOf(e.touches[0], e.touches[1])];
      if (e.cancelable) e.preventDefault();     // not a scroll, and not a pinch
    }, { passive: false });
    g.root.addEventListener("touchmove", (e) => {
      if (!tfPath || !e.touches || e.touches.length !== 2) return;
      if (e.cancelable) e.preventDefault();
      tfPath.push(tfMidOf(e.touches[0], e.touches[1]));
    }, { passive: false });
    const tfEnd = (e) => {
      if (!tfPath) return;
      if (e.touches && e.touches.length >= 2) return;   // a finger still down
      const p = tfPath;
      tfPath = null;
      if (g.mode !== "idle") return;
      // The circle is tested first, exactly as on the card screen: a sloppy
      // multi-loop stir can drift downward far enough to read as a zigzag,
      // and the circle is the more deliberate gesture.
      const target = pathIsCircle(p) ? circleTarget()
                   : pathIsZigzag(p) ? zigzagTarget() : null;
      if (target && target !== g.deckId) sweepToDeck(g, target);
    };
    g.root.addEventListener("touchend", tfEnd, { passive: false });
    g.root.addEventListener("touchcancel", tfEnd, { passive: false });

    // Desktop deck switching. These used to be swallowed here so the deck
    // could not change underneath the grid — but changing deck is now what
    // this screen does, so they drive the sweep instead. They are still
    // stopped from reaching Randomizer.js's own handlers, which would warp
    // the card lying underneath as well.
    //
    // Right-click cycles, as it does on the card. Unlike the card there is
    // no held-to-share here: with 78 cards on screen there is no one card
    // the gesture obviously means. Fine pointers only, so a long press on
    // iOS — which fires contextmenu in WebKit — can never switch decks.
    g.root.addEventListener("contextmenu", (e) => e.preventDefault());
    g.root.addEventListener("mouseup", (e) => {
      if (e.button !== 2 || !isFine() || g.mode !== "idle") return;
      e.stopPropagation();
      sweepToDeck(g, cycleTarget(1));
    }, true);
    g.onKey = (e) => {
      if (grid !== g) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;   // leave shortcuts alone
      let target = null;
      switch (e.key) {
        case "Escape":
          if (g.mode === "open") closeTile();
          else if (g.mode === "idle") backToMeanings();
          break;
        case "ArrowRight": case "d": case "D": target = cycleTarget(1); break;
        case "ArrowLeft":  target = cycleTarget(-1); break;
        case "1": target = "rw"; break;
        case "2": target = "thoth"; break;
        case "3": target = "marseille"; break;
        default: return;
      }
      e.stopPropagation();
      e.preventDefault();
      if (target && g.mode === "idle" && target !== g.deckId) sweepToDeck(g, target);
    };
    window.addEventListener("keydown", g.onKey, true);
    g.onResize = () => { g.layoutDirty = true; };
    window.addEventListener("resize", g.onResize);
  }

  // --- Two-finger gestures on the grid ----------------------------------
  // The card screen's recognisers live on the <img> in Randomizer.js and
  // cannot see this screen, which sits above it. These are a separate,
  // read-only copy: same shapes, same thresholds, so a gesture means here
  // exactly what it means there.
  //
  //   ZIGZAG down  ->  RW <-> Thoth  (from Marseille, straight to Thoth)
  //   CIRCLE       ->  Marseille, or back to the deck it was summoned from
  //
  // The card screen gates the zigzag to the top quarter so it can't be
  // confused with the Thoth pinch-zoom. There is no pinch here, so the
  // gate is waived — the same waiver the Marseille deck already gets.
  // Both gestures land the same way: one sweep, see sweepToDeck().
  const TF_TURN = (280 * Math.PI) / 180;   // most of a loop
  const TF_RADIUS = 26;                    // px, so a wobble can't wind up
  const TF_SAMPLES = 12;
  const TF_REVERSALS = 3, TF_DOWN = 60, TF_AMP = 26;
  let tfPath = null;

  const tfMidOf = (a, b) => ({ x: (a.clientX + b.clientX) / 2, y: (a.clientY + b.clientY) / 2 });
  const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);

  // Signed turning of the midpoint path: a loop accumulates ±360°, a
  // zigzag's turns cancel toward zero, a pinch barely moves the midpoint.
  function pathIsCircle(p) {
    if (p.length < TF_SAMPLES) return false;
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    for (const q of p) {
      if (q.x < minX) minX = q.x;
      if (q.x > maxX) maxX = q.x;
      if (q.y < minY) minY = q.y;
      if (q.y > maxY) maxY = q.y;
    }
    if (Math.max(maxX - minX, maxY - minY) / 2 < TF_RADIUS) return false;
    let turn = 0;
    for (let i = 2; i < p.length; i++) {
      const a = p[i - 2], b = p[i - 1], c = p[i];
      const v1x = b.x - a.x, v1y = b.y - a.y, v2x = c.x - b.x, v2y = c.y - b.y;
      if (Math.hypot(v1x, v1y) < 2 || Math.hypot(v2x, v2y) < 2) continue;
      turn += Math.atan2(v1x * v2y - v1y * v2x, v1x * v2x + v1y * v2y);
    }
    return Math.abs(turn) >= TF_TURN;
  }

  function pathIsZigzag(p) {
    if (p.length < 6) return false;
    const netDown = p[p.length - 1].y - p[0].y;
    let reversals = 0, lastSign = 0, minX = Infinity, maxX = -Infinity;
    for (let i = 1; i < p.length; i++) {
      const dx = p[i].x - p[i - 1].x;
      if (p[i].x < minX) minX = p[i].x;
      if (p[i].x > maxX) maxX = p[i].x;
      if (Math.abs(dx) < 2) continue;
      const sign = Math.sign(dx);
      if (lastSign !== 0 && sign !== lastSign) reversals++;
      lastSign = sign;
    }
    return reversals >= TF_REVERSALS && netDown >= TF_DOWN && maxX - minX >= TF_AMP;
  }

  // Desktop only, exactly as Randomizer.js gates its own mouse handling.
  function isFine() {
    return !!(window.matchMedia &&
              window.matchMedia("(hover: hover) and (pointer: fine)").matches);
  }

  // The card screen's right-click/key cycle, in its order.
  const GRID_CYCLE = ["rw", "thoth", "marseille"];
  function cycleTarget(dir) {
    const i = GRID_CYCLE.indexOf(currentDeck);
    if (i < 0) return "rw";
    return GRID_CYCLE[(i + dir + GRID_CYCLE.length) % GRID_CYCLE.length];
  }

  // The same destinations the card screen's toggleDeck / toggleMarseille
  // choose, so the gestures stay honest across the two screens.
  function zigzagTarget() {
    return currentDeck === "rw" ? "thoth" : currentDeck === "marseille" ? "thoth" : "rw";
  }
  function circleTarget() {
    if (currentDeck === "marseille") {
      return (typeof marseilleOrigin !== "undefined" && marseilleOrigin === "thoth") ? "thoth" : "rw";
    }
    try { marseilleOrigin = currentDeck; } catch (_e) { /* older build */ }
    return "marseille";
  }

  // --- Changing deck underneath the grid --------------------------------
  // This mirrors the STATE half of Randomizer.js's switchToDeck(): the deck,
  // the zoom it comes up at, the signature module's deck and crop, and the
  // card itself. It deliberately skips that function's warp, which animates
  // the <img> lying under this screen — invisible here, and competing with
  // the sweep for the GPU on a phone. If switchToDeck ever grows new state,
  // it needs the same line here.
  function applyDeckState(target) {
    currentDeck = target;
    if (typeof defaultZoomForDraw === "function") zoomMode = defaultZoomForDraw();
    const sig = window.MajorArcanaSignature;
    if (sig) {
      if (sig.cancel) sig.cancel();
      if (sig.setDeck) sig.setDeck(target);
      if (sig.setCrop) sig.setCrop(zoomMode);
    }
    const img = cardImg();
    if (!img) return;
    const onBack = (typeof showingBack !== "undefined") && showingBack;
    try {
      img.src = onBack ? backSrc() : deckModel().cardSrc(currentCardName, zoomMode);
    } catch (_e) { /* leave the card as it is rather than break the screen */ }
    if (typeof updateCardAlt === "function") {
      updateCardAlt(img, onBack ? null : currentCardName, img.classList.contains("reversed"));
    }
  }

  // Re-point the existing 78 tiles at another deck: new headings, new card
  // shape, and the Mat moved (Marseille lays it below the twenty-one, the
  // others lead with the Fool). The tiles are MOVED, never rebuilt, so every
  // card keeps the body that is carrying it through the air.
  function relayoutGrid(g, deckId) {
    const before = {};
    for (const k in g.tiles) {
      const r = g.tiles[k].btn.getBoundingClientRect();
      before[k] = { x: r.left + r.width / 2, y: r.top + r.height / 2 };
    }
    const sTop = g.scroller.scrollTop;
    const L = layoutFor(deckId);
    g.deckId = deckId;
    g.L = L;

    const secs = g.root.querySelectorAll(".dg-sec");
    L.sections.forEach((sec, si) => {
      const s = secs[si];
      if (!s) return;
      const h2 = s.querySelector("h2"), p = s.querySelector("p");
      if (h2) h2.textContent = sec.name;
      if (p) p.textContent = sec.sub;
      const rowEls = s.querySelectorAll(".dg-row");
      sec.rows.forEach((row, ri) => {
        const rowEl = rowEls[ri];
        if (!rowEl) return;
        row.forEach((k) => {
          const t = g.tiles[k];
          if (!t) return;
          t.btn.style.gridColumn = row.length === 1 ? "4 / span 1" : "";
          // The same card answers to a different name in each deck.
          if (typeof cardDisplayName === "function") {
            t.btn.setAttribute("aria-label", cardDisplayName(k, deckId));
          }
          rowEl.appendChild(t.btn);     // a move, so order follows the layout
        });
      });
    });
    for (const k in g.tiles) g.tiles[k].btn.style.aspectRatio = String(L.deck.aspect);

    // Hold the reading position; a taller card shape may have shortened the
    // scrollable run underneath it.
    g.scroller.scrollTop = Math.min(sTop,
      Math.max(0, g.scroller.scrollHeight - g.scroller.clientHeight));
    g.lastScroll = g.scroller.scrollTop;

    // Every slot just moved. Push the difference into the bodies so each
    // card stays exactly where the eye last saw it and simply carries on
    // toward its new home — no card jumps, mid-flight or mid-float.
    for (const k in g.tiles) {
      const b = g.bodies[k];
      if (!b) continue;
      const r = g.tiles[k].btn.getBoundingClientRect();
      b.x += before[k].x - (r.left + r.width / 2);
      b.y += before[k].y - (r.top + r.height / 2);
    }
    const p0 = L.pos[g.fromKey] || { r: 0, c: 3 };
    for (const k in L.pos) {
      g.dist[k] = Math.abs(L.pos[k].r - p0.r) + Math.abs(L.pos[k].c - p0.c) * 0.85;
    }
    g.layoutDirty = true;
  }

  // Once the grid has settled, fetch the other decks' thumbnails one at a
  // time on idle, so the first sweep has its cards in hand. Three decks of
  // 78 at ~28 KB is a few MB — enough to ask first on a metered connection.
  function warmThumbs(g) {
    const c = navigator.connection;
    if (c && (c.saveData || /(^|-)2g$/.test(c.effectiveType || ""))) return;
    const queue = [];
    Object.keys(GRID_DECKS).forEach((d) => {
      if (d === g.deckId) return;
      for (const k in g.L.pos) queue.push(thumbSrc(d, k));
    });
    let i = 0;
    const idle = (fn, timeout) => (window.requestIdleCallback
      ? requestIdleCallback(fn, { timeout }) : setTimeout(fn, 80));
    const step = () => {
      if (grid !== g || i >= queue.length) return;
      const im = new Image();
      im.onload = im.onerror = () => idle(step, 500);
      im.src = queue[i++];
    };
    idle(step, 1500);
  }

  function swapAllThumbs(g, deckId) {
    for (const k in g.tiles) {
      const t = g.tiles[k];
      t.img.loading = "eager";
      t.img.src = thumbSrc(deckId, k);
    }
  }

  // --- The sweep --------------------------------------------------------
  // One hand clears the table; the other lays the next deck down behind it,
  // moving the same way, so a slot empties and refills in one continuous
  // stroke. Every quantity below is drawn fresh: which way the hands travel,
  // where the stroke is strongest, how straight it is, and how hard each
  // individual card is hit. Both gestures arrive here — one move serves.
  function sweepToDeck(g, target) {
    if (g.mode !== "idle" || !GRID_DECKS[target]) return;
    buzz(14);
    applyDeckState(target);

    if (reduceMotion) {
      relayoutGrid(g, target);
      swapAllThumbs(g, target);
      return;
    }

    if (g.layoutDirty) measure(g);
    const keys = Object.keys(g.bodies);
    if (!keys.length) { relayoutGrid(g, target); swapAllThumbs(g, target); return; }

    g.mode = "sweep";
    g.sweepTo = target;
    gridHoldCancel(g);
    g.scGlide = 0;                      // no leftover throw under the sweep
    g.root.classList.add("dg-sweep");

    const rnd = (a, b) => a + Math.random() * (b - a);
    const now = g.sim;                      // simulated ms, not the wall clock
    // The clearing stroke: broadly sideways, either way, never square on.
    const ang = (Math.random() < 0.5 ? 0 : Math.PI) + rnd(-0.40, 0.40);
    const inAng = ang + rnd(-0.30, 0.30);   // the second hand, not a mirror
    const ca = Math.cos(ang), sa = Math.sin(ang);

    // Project the viewport onto the stroke so the hand crosses what is
    // actually on screen; cards scrolled out of sight clamp to the ends.
    const W = g.root.clientWidth, H = g.root.clientHeight, st = g.scroller.scrollTop;
    const us = [], vs = [];
    [[0, 0], [W, 0], [0, H], [W, H]].forEach(([x, y]) => {
      us.push(x * ca + y * sa);
      vs.push(-x * sa + y * ca);
    });
    const uLo = Math.min.apply(null, us), uSpan = Math.max(1, Math.max.apply(null, us) - uLo);
    const vLo = Math.min.apply(null, vs), vSpan = Math.max(1, Math.max.apply(null, vs) - vLo);

    // Where the hand bears down, and how wide its sweep is. Cards in the
    // path are flung; the ones at the fringe get a glancing shove and spin
    // more for it.
    const vc = vLo + vSpan * rnd(0.22, 0.78);
    const vw = vSpan * rnd(0.45, 0.85);
    const waves = rnd(1.1, 2.3), wph = rnd(0, Math.PI * 2);
    const frontMs = SWEEP_FRONT_MS * rnd(0.85, 1.25);
    const gapMs = SWEEP_GAP_MS * rnd(0.85, 1.2);

    let lastArrive = now;
    for (const k of keys) {
      const b = g.bodies[k];
      const x = b.cx, y = b.cy - st;                 // viewport, not content
      const s = clamp01((x * ca + y * sa - uLo) / uSpan);
      const prox = Math.exp(-Math.pow((-x * sa + y * ca - vc) / vw, 2));
      // Not a ruler: the stroke eases, bows, and frays a little per card.
      const wob = 0.07 * Math.sin(s * Math.PI * 2 * waves + wph);
      const depart = now + Math.max(0, Math.pow(s, 0.82) + wob + rnd(-0.035, 0.035)) * frontMs;
      b.sw = {
        state: 0, ang, inAng,
        departAt: depart,
        arriveAt: depart + gapMs,
        speed: rnd(1500, 2400) * (0.55 + 0.45 * prox),
        perp: rnd(-1, 1) * 300 * (1 - 0.45 * prox),
        spin: rnd(-1, 1) * 460 * (1.25 - 0.5 * prox),
        lift: rnd(26, 86),
      };
      if (b.sw.arriveAt > lastArrive) lastArrive = b.sw.arriveAt;
    }

    // The headings can't ride the stroke, so they step aside and come back
    // renamed once the hand has passed. The tiles are re-pointed in the same
    // breath; the bodies absorb the slot shift, so nothing on screen jumps.
    // Both moments are read off sim time by tick().
    g.swapped = false;
    g.swapAt = now + frontMs + 40;
    g.sweepCap = now + SWEEP_CAP_MS;

    // Backstop. Every phase above advances only while frames do, so a loop
    // that stops — a backgrounded tab, a suspended PWA — would strand the
    // sweep half-finished. Rather than guess a duration, watch sim time
    // itself. It must be stopped for two full checks running: this is the
    // one path that puts cards down by force, and a phone decoding 78 new
    // thumbnails can lose a second of frames without being dead at all.
    // Intervening there would produce the very lock this must prevent.
    const watch = (prev, strikes) => g.later(1000, () => {
      if (grid !== g || g.mode !== "sweep") return;
      if (g.sim !== prev) watch(g.sim, 0);
      else if (strikes >= 1) finishSweep(g, target);
      else watch(prev, strikes + 1);
    });
    watch(-1, 0);
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

  function writeBody(g, k, b, op) {
    const s = g.tiles[k].float.style;
    s.transform =
      "translate3d(" + b.x.toFixed(2) + "px," + (b.y - b.z * 0.5).toFixed(2) + "px,0) " +
      "rotateX(" + b.rx.toFixed(2) + "deg) rotateY(" + b.ry.toFixed(2) + "deg) rotateZ(" + b.rz.toFixed(2) + "deg) " +
      "scale(" + (1 + b.z * 0.006).toFixed(4) + ")";
    // Only when it changes: outside a sweep this is 78 identical writes a
    // frame, and every one of them dirties style.
    const want = op >= 1 ? "" : op.toFixed(3);
    if (s.opacity !== want) s.opacity = want;
  }

  // The ordinary end of a sweep: the last card has stopped being an
  // arriving card and is floating with the rest. Nothing is moved here —
  // the springs are still running and will keep running.
  function endSweep(g) {
    g.root.classList.remove("dg-sweep");
    g.sweepTo = null;
    g.mode = "idle";
    g.layoutDirty = true;
  }

  // Guarantee the outcome, not the path. Every phase of the sweep advances
  // only while frames do, and a frame loop can simply stop — a backgrounded
  // tab, an iOS PWA suspended mid-stroke. THIS IS THE DEAD-LOOP PATH ONLY.
  // It puts stranded cards in their places because there is no spring left
  // to carry them; calling it on a living animation would cut 78 cards off
  // mid-flight, which is exactly the jarring lock it must never cause.
  // (Same discipline as the share heartbeat; see NOTES.md.)
  function finishSweep(g, deckId) {
    if (g.deckId !== deckId) relayoutGrid(g, deckId);
    swapAllThumbs(g, deckId);
    for (const k in g.bodies) {
      const b = g.bodies[k];
      b.sw = null;
      if (Math.hypot(b.x, b.y) < 24 && Math.abs(b.rz) < 6) continue;
      b.x = b.y = b.z = b.rx = b.ry = b.rz = 0;
      b.vx = b.vy = b.vz = b.vrx = b.vry = b.vrz = 0;
      writeBody(g, k, b, 1);
    }
    for (const k in g.tiles) g.tiles[k].float.style.opacity = "";
    endSweep(g);
  }

  // The hand reaches this card: a shove along the stroke, a slew across it,
  // a spin, and enough lift to come off the table rather than slide on it.
  function strike(b, sw) {
    sw.state = 1;
    const ca = Math.cos(sw.ang), sa = Math.sin(sw.ang);
    b.vx += ca * sw.speed - sa * sw.perp;
    b.vy += sa * sw.speed + ca * sw.perp;
    b.vz += sw.lift;
    b.vrz += sw.spin;
    b.vrx += (Math.random() - 0.5) * 220;
    b.vry += (Math.random() - 0.5) * 220;
  }

  // Off the edge: air, a little weight, and gone. No spring — nothing is
  // holding it to its slot any more.
  function slideOff(g, k, b, sw, now, dt) {
    const d = Math.exp(-SWEEP_DRAG * dt);
    b.vx *= d; b.vy *= d;
    b.vz = (b.vz - SWEEP_GRAVITY * dt) * d;
    b.vrx *= d; b.vry *= d; b.vrz *= d;
    b.x += b.vx * dt; b.y += b.vy * dt; b.z += b.vz * dt;
    b.rx += b.vrx * dt; b.ry += b.vry * dt; b.rz += b.vrz * dt;
    const op = 1 - clamp01((now - sw.departAt - SWEEP_HOLD_MS) / SWEEP_FADE_MS);
    writeBody(g, k, b, op);
    if (op > 0) return;
    // Out of sight is the only safe moment to become another deck's card.
    sw.state = 2;
    const t = g.tiles[k];
    t.img.loading = "eager";
    t.img.src = thumbSrc(g.sweepTo || g.deckId, k);
  }

  // The second hand puts it back on: out of the dark on the far side, in a
  // loose pile, already moving. The springs in tick() do the rest.
  function landIncoming(g, b, sw) {
    sw.state = 3;
    const rnd = (a, c) => a + Math.random() * (c - a);
    const ci = Math.cos(sw.inAng), si = Math.sin(sw.inAng);
    const d0 = rnd(560, 980), off = rnd(-170, 170);
    b.x = -ci * d0 - si * off;
    b.y = -si * d0 + ci * off;
    b.z = rnd(8, 28);
    b.rx = rnd(-16, 16); b.ry = rnd(-16, 16); b.rz = rnd(-26, 26);
    b.vx = ci * rnd(300, 720); b.vy = si * rnd(300, 720);
    b.vz = 0; b.vrx = 0; b.vry = 0; b.vrz = rnd(-120, 120);
    // Every few cards rings the surface as the deck comes down.
    if (Math.random() < 0.22) ripple(g, b.cx, b.cy, 0.34);
  }

  function tick(g, now) {
    const dt = Math.min(0.034, Math.max(0.001, (now - g.last) / 1000));
    g.last = now;
    if (reduceMotion || g.flyFull) return;     // nothing to see under a full-screen card
    g.sim += dt * 1000;
    if (g.mode === "sweep") {
      if (!g.swapped && g.sim >= g.swapAt) {
        g.swapped = true;
        relayoutGrid(g, g.sweepTo);          // the hand has crossed; rename
        g.root.classList.remove("dg-sweep");
        measure(g);
      }
      if (g.sim >= g.sweepCap) finishSweep(g, g.sweepTo);
    }
    if (g.layoutDirty) measure(g);
    const t = (now - g.t0) / 1000;
    g.ripples = g.ripples.filter((r) => t - r.t < 9);

    // Carry the throw from a released drag. Decays like the overlay's, and
    // stops dead at either end of the run.
    if (g.scGlide) {
      const was = g.scroller.scrollTop;
      g.scroller.scrollTop = was + g.scGlide * dt;
      if (g.scroller.scrollTop === was || Math.abs(g.scGlide) < 20) g.scGlide = 0;
      else g.scGlide *= Math.pow(0.94, dt * 60);
    }

    const st = g.scroller.scrollTop;
    g.scrollVel += ((st - g.lastScroll) / dt - g.scrollVel) * Math.min(1, dt * 7);
    g.lastScroll = st;
    const clamp = (v, lo, hi) => (v < lo ? lo : v > hi ? hi : v);
    let live = 0;                 // cards still mid-sweep
    const sDrag = clamp(-g.scrollVel * 0.016, -14, 14);
    const sTilt = clamp(g.scrollVel * 0.012, -11, 11);

    for (const k in g.bodies) {
      const b = g.bodies[k];
      if (!b.dropped && now >= b.dropAt) {
        b.dropped = true;
        b.vz -= 26; b.vrx += 22 * (Math.random() - 0.5); b.vry += 14 * (Math.random() - 0.5);
      }

      // A card being swept off the table has left the water: it is struck,
      // it slides, and it is gone. Only when it comes back down on the far
      // side (state 3) does the surface get hold of it again.
      const sw = b.sw;
      if (sw) {
        if (sw.state === 3 && g.sim - sw.arriveAt > SWEEP_RELEASE_MS) {
          b.sw = null;            // floating again; its motion carries on
        } else {
          live++;
          if (sw.state === 0 && g.sim >= sw.departAt) strike(b, sw);
          if (sw.state === 1) { slideOff(g, k, b, sw, g.sim, dt); continue; }
          if (sw.state === 2) {
            if (g.sim < sw.arriveAt) { writeBody(g, k, b, 0); continue; }
            landIncoming(g, b, sw);
          }
        }
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
      // A card still flying home gets extra authority and a firmer hand, so
      // it arrives rather than wanders — both relax away over the next beat
      // and leave it floating like everything else.
      let kk = 7 / b.m, zeta = 0.3;
      if (b.sw && b.sw.state === 3) {
        // Decays over most of a second, so the firm hand that catches the
        // card hands it to the water gradually. Nothing steps in at the end
        // — this IS the end, and it arrives by getting weaker.
        const a = Math.exp(-(g.sim - b.sw.arriveAt) / 700);
        kk *= 1 + 2.4 * a;
        zeta += 0.34 * a;
      }
      const c = 2 * Math.sqrt(kk) * zeta;
      b.vx += (kk * (tx - b.x) - c * b.vx) * dt; b.x += b.vx * dt;
      b.vy += (kk * (ty - b.y) - c * b.vy) * dt; b.y += b.vy * dt;
      b.vz += (kk * (tz - b.z) - c * b.vz) * dt; b.z += b.vz * dt;
      b.vrx += (kk * (trx - b.rx) - c * b.vrx) * dt; b.rx += b.vrx * dt;
      b.vry += (kk * (tryy - b.ry) - c * b.vry) * dt; b.ry += b.vry * dt;
      b.vrz += (kk * (trz - b.rz) - c * b.vrz) * dt; b.rz += b.vrz * dt;
      writeBody(g, k, b, b.sw && b.sw.state === 3
        ? clamp01((g.sim - b.sw.arriveAt) / SWEEP_RISE_MS) : 1);
    }
    // Every card is floating again. Only the bookkeeping ends here.
    if (g.mode === "sweep" && !live) endSweep(g);
  }
})();
