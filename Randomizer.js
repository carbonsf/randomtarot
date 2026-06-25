// Minimum time the card stays dimmed, so very-fast fetches still feel like
// a beat of consideration rather than a snap.
const MIN_HOLD_MS = 260;

// Re-entrancy guard: ignore a click while a draw or reset is mid-flight.
let drawing = false;

// Whether the visible image is the card back or a face-up card. A tap on
// the back draws; a tap on a face-up card sets it down.
let showingBack = true;

// --- Deck model -------------------------------------------------------
// The app ships two decks: the default Rider-Waite ("rw") and the Crowley
// Thoth ("thoth"). RW is the canonical experience and behaves exactly as
// before. Thoth is reached by a two-finger zigzag-down gesture (see the
// gesture section below) and adds a three-step zoom (artfill/fullart/big).
//
// Both decks share the SAME internal card keys (maj00..pents14) so the
// draw mechanics, reversal roll, and Major-Arcana signature dispatch are
// deck-agnostic — only image resolution and meaning-text lookup differ.

// Canonical key order, matching the original allCards array order:
// 22 majors, then wands, cups, swords, pents (14 each) = 78.
const CARD_KEYS = [].concat(
  Array.from({ length: 22 }, (_, i) => "maj" + String(i).padStart(2, "0")),
  ["wands", "cups", "swords", "pents"].flatMap((suit) =>
    Array.from({ length: 14 }, (_, i) => suit + String(i + 1).padStart(2, "0"))
  )
);

const DECKS = {
  rw: {
    back: "RoseLilyRed.jpg",
    hasZoom: false,
    // RW art is now SELF-HOSTED: the 78 card faces live in the repo under
    // rw/<key>.jpg (one image per card, no zoom). They were previously
    // hotlinked from learntarot.com — see the note below.
    //
    // NOTE (image hosting): As of this change BOTH decks are served from
    // this repo — RW under rw/, Thoth under thoth/{artfill,fullart,big}/,
    // and both backs at the repo root / thoth/. The RW faces used to load
    // remotely from "https://www.learntarot.com/bigjpgs/<key>.jpg", which
    // meant the RW deck depended on a third-party server (could break,
    // block hotlinking, never work offline). Pulling them local makes both
    // decks consistent and self-contained. If you ever re-source the RW
    // art, this single line is the only place the location is defined.
    cardSrc: (key) => "rw/" + key + ".jpg",
    upright:  () => (typeof CARD_ACTIONS !== "undefined" ? CARD_ACTIONS : null),
    reversed: () => (typeof CARD_ACTIONS_REVERSED !== "undefined" ? CARD_ACTIONS_REVERSED : null),
  },
  thoth: {
    back: "thoth/back.jpg",
    hasZoom: true,
    // Thoth art is local, three crops per card keyed by zoom mode.
    cardSrc: (key, zoom) => "thoth/" + (zoom || "artfill") + "/" + key + ".jpg",
    upright:  () => (typeof CARD_ACTIONS_THOTH !== "undefined" ? CARD_ACTIONS_THOTH : null),
    reversed: () => (typeof CARD_ACTIONS_REVERSED_THOTH !== "undefined" ? CARD_ACTIONS_REVERSED_THOTH : null),
  },
};

let currentDeck = "rw";          // active deck id
const ZOOM_ORDER = ["artfill", "fullart", "big"];  // index 0 = most zoomed-in
let zoomMode = "artfill";        // current Thoth zoom (live; can be any of the three)

// Remembered Thoth zoom for the session. The deck "comes up" at this zoom on
// every new draw and whenever we switch back into Thoth — so the querent's
// in/out preference persists across draws and deck toggles (no localStorage;
// a reload starts fresh at ARTFILL). Only TWO states are remembered: fully
// zoomed IN (artfill) or fully zoomed OUT (big). All three remain reachable
// live by pinching, but the MIDDLE crop (fullart) is deliberately NOT a
// remembered resting state — if the querent leaves the card on fullart we
// fall back to artfill, which sits better with the card mechanics and look.
let thothZoomPref = "artfill";   // "artfill" | "big"
function rememberZoom(mode) { thothZoomPref = (mode === "big") ? "big" : "artfill"; }
// The zoom a fresh draw / deck-switch should land on for the active deck.
function defaultZoomForDraw() { return (currentDeck === "thoth") ? thothZoomPref : "artfill"; }
// Keep the signature module's crop in sync so art-anchored effects (the Sun
// punch-out) use the coordinates matching the crop actually on screen.
function syncSignatureCrop() {
  if (window.MajorArcanaSignature && window.MajorArcanaSignature.setCrop) {
    window.MajorArcanaSignature.setCrop(zoomMode);
  }
}

function deckModel() { return DECKS[currentDeck]; }
function backSrc() { return deckModel().back; }
// Resolve the on-screen image URL for a card key in the current deck/zoom.
function cardSrcFor(key) { return deckModel().cardSrc(key, zoomMode); }

// --- Reversal config --------------------------------------------------
// Percentage chance that any given draw resolves to a reversed card.
// Production setting: 100 / 78 ≈ 1.282% — roughly one card in a full
// deck draw will resolve reversed. Float, accepts any value 0-100. Set
// to 100 for testing every card, 0 to disable reversals entirely.
//
// The reversal roll is INDEPENDENT of the deck pick — it uses its own
// fresh entropy call after the card has been chosen, so changing this
// value cannot perturb which card is drawn. Setting it to 0 disables the
// glitch path entirely (skipped before any roll happens).
const REVERSAL_PERCENT = 100 / 78;

// Time between the card landing face-up and the glitch starting. A beat
// of "...wait, something's wrong" before the visual breakdown.
const REVERSAL_DELAY_MS = 500;

// Glitch cadence is no longer a uniform frame loop — see GLITCH_SCHEDULE
// below for the irregular four-phase pacing.

// --- Deck state: draw-without-replacement -----------------------------
// `deck` is the set of card indices not yet drawn this shuffle. When it
// empties we reshuffle (auto-visualized as a settle), or the querent can
// reshuffle manually via long-press on the back.
//
// TESTING_MAJOR_ONLY: when true, the deck only contains the 22 Major
// Arcana (indices 0-21 of allCards). Set true to restrict the deck
// during signature-effect evaluation. Reversal rate (1/78) is
// unchanged either way — Majors can still reverse and skip their
// signature effect.
const TESTING_MAJOR_ONLY = false;
const DECK_SIZE = TESTING_MAJOR_ONLY ? 22 : 78;
function freshDeck() {
  return Array.from({ length: DECK_SIZE }, (_, i) => i);
}
let deck = freshDeck();

// Filename key (e.g. "maj19") of the currently revealed card, used to
// look up actions in CARD_ACTIONS. Set whenever drawCard completes so
// the info overlay can read it instantly on long-press.
let currentCardName = null;

// Timestamp (performance.now ms) until which click events should be
// ignored. Set by the long-press handlers after a pulse/commit fires so
// the trailing click from finger-release does NOT also draw a card.
// Time-based (not flag-based) so it works regardless of whether the
// click event fires before or after touchend on a given browser.
let suppressClicksUntil = 0;

// Subtle tactile beat at the moment of reveal / set-down. Feature-detected
// because navigator.vibrate is undefined on iOS Safari and many desktops;
// where present-but-no-hardware (most desktops), the call is a silent
// no-op per spec. Already inside a user-gesture handler, so policy gates
// won't block it.
function haptic(ms) {
  if (typeof navigator !== "undefined" && typeof navigator.vibrate === "function") {
    try { navigator.vibrate(ms); } catch (_e) { /* ignore */ }
  }
}

function preloadImage(url) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve();
    img.onerror = () => resolve(); // don't block reveal on a load failure
    img.src = url;
  });
}

// Small promise-based delay used by the zoom crossfade. (Previously this
// was referenced but never defined, so every crossfade threw a
// ReferenceError mid-flight — stranding the ghost and locking the busy
// guard for ~1.5s. Defining it lets the crossfade actually complete.)
function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// --- Entropy sources ----------------------------------------------------
// The draw is composed of (a) a strong cosmic source and (b) the querent's
// gesture — when and where they reached for the card. The two are mixed
// through SHA-256 so the resulting index inherits the entropy of the
// strongest input. This is the digital analogue of cutting the deck:
// the universe offers the cards; your hand chooses the moment.

// NIST's public Randomness Beacon. Each pulse combines two independent
// commercial quantum RNGs (different physical principles, different
// vendors), is cryptographically signed by NIST, and is published every
// 60 seconds. No key, CORS-enabled, free. https://beacon.nist.gov
const NIST_BEACON_URL = "https://beacon.nist.gov/beacon/2.0/pulse/last";

function hexToBytes(hex, count) {
  const out = new Uint8Array(count);
  for (let i = 0; i < count; i++) {
    out[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  }
  return out;
}

async function fetchNISTBeacon() {
  const res = await fetch(NIST_BEACON_URL, { cache: "no-store" });
  if (!res.ok) throw new Error("NIST HTTP " + res.status);
  const json = await res.json();
  const pulse = json && json.pulse;
  if (!pulse || typeof pulse.outputValue !== "string") {
    throw new Error("NIST returned no pulse");
  }
  // outputValue is a 512-bit (128 hex-char) value — the canonical pulse
  // output, already mixed inside NIST via SHA-512 of independent quantum
  // sources. We take the first 8 bytes.
  return hexToBytes(pulse.outputValue, 8);
}

async function fetchRandomOrgBytes() {
  const url = "https://www.random.org/integers/?num=8&min=0&max=255&col=1&base=10&format=plain&rnd=new";
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error("random.org HTTP " + res.status);
  const nums = (await res.text()).trim().split(/\s+/).map((s) => parseInt(s, 10));
  if (nums.length !== 8 || nums.some((n) => !Number.isInteger(n) || n < 0 || n > 255)) {
    throw new Error("bad bytes from random.org");
  }
  return new Uint8Array(nums);
}

async function getCosmicBytes() {
  try {
    return await fetchNISTBeacon();
  } catch (_e1) {
    try {
      return await fetchRandomOrgBytes();
    } catch (_e2) {
      const bytes = new Uint8Array(8);
      crypto.getRandomValues(bytes);
      return bytes;
    }
  }
}

// Pack the gesture (when + where + the event's high-resolution timestamp)
// into bytes. Float64 of performance.now() preserves sub-millisecond bits;
// clientX/Y are screen-position entropy.
function encodeGesture(event) {
  const buf = new ArrayBuffer(8 + 8 + 4 + 4);
  const view = new DataView(buf);
  view.setFloat64(0, performance.now(), true);
  view.setFloat64(8, event && event.timeStamp != null ? event.timeStamp : 0, true);
  view.setInt32(16, event && event.clientX != null ? event.clientX : 0, true);
  view.setInt32(20, event && event.clientY != null ? event.clientY : 0, true);
  return new Uint8Array(buf);
}

function concatBytes(a, b) {
  const out = new Uint8Array(a.length + b.length);
  out.set(a, 0);
  out.set(b, a.length);
  return out;
}

// Reject any candidate that would bias the mod operation, so every card
// has exactly equal probability. With 78 outcomes and a 32-bit candidate
// the rejection rate is ~10⁻⁹ — effectively never — but doing this right
// is cheap and removes a footgun.
function unbiasedIndex(uint32, max) {
  const limit = Math.floor(0x100000000 / max) * max;
  return uint32 < limit ? uint32 % max : null;
}

async function pickRandomIndex(max, event) {
  const cosmicBytes = await getCosmicBytes();
  const gestureBytes = encodeGesture(event);

  let counter = 0;
  while (true) {
    const counterByte = new Uint8Array([counter]);
    const material = concatBytes(concatBytes(cosmicBytes, gestureBytes), counterByte);
    const digest = await crypto.subtle.digest("SHA-256", material);
    const uint32 = new DataView(digest).getUint32(0, false);
    const idx = unbiasedIndex(uint32, max);
    if (idx !== null) return idx;
    counter++;
    if (counter > 16) return uint32 % max;
  }
}

async function newPage(event) {
  // If the long-press just fired a reshuffle (or aborted past the pulse
  // threshold), the trailing click should NOT draw a card. We gate on a
  // timestamp set by the long-press handlers, robust to whether `click`
  // fires before or after `touchend` on a given browser.
  if (performance.now() < suppressClicksUntil) return;

  const imgEl = document.querySelector("img");

  // Ignore a click while a draw or reset is mid-flight.
  if (drawing) return;
  drawing = true;

  if (showingBack) {
    await drawCard(imgEl, event);
  } else {
    await setDownToBack(imgEl);
  }
}

// "Breath": dim + recede, fetch entropy, swap to the chosen card, fade up.
async function drawCard(imgEl, event) {
  // If the deck is exhausted, honor the moment with a settle animation
  // before drawing the first card of the new shuffle.
  if (deck.length === 0) {
    await playSettle(imgEl);
    deck = freshDeck();
  }

  imgEl.classList.add("dimmed");
  const holdUntil = performance.now() + MIN_HOLD_MS;

  // Pick from the remaining deck (without replacement) — splice removes
  // the chosen index so it can't repeat until the next reshuffle.
  const pickAt = await pickRandomIndex(deck.length, event);
  const cardIdx = deck.splice(pickAt, 1)[0];
  const chosenKey = CARD_KEYS[cardIdx];

  // The card "comes up" at the remembered zoom for this deck: fully in
  // (artfill) or fully out (big) for Thoth, always artfill for RW (which
  // has no zoom). This persists the querent's in/out preference across
  // draws within the session.
  zoomMode = defaultZoomForDraw();
  syncSignatureCrop();   // so a Major's signature uses the matching crop
  const chosenUrl = cardSrcFor(chosenKey);

  // For Thoth, warm the zoom assets (FULLART = the continuous-zoom medium,
  // BIG = the crossfade target) and capture the FULLART file's aspect so
  // the artfill-fill scale is exact for this card the moment a pinch
  // starts. Default aspect (0.644) holds until the file reports its size.
  if (currentDeck === "thoth") preloadThothZoomAssets(chosenKey);

  // INDEPENDENT reversal roll — fresh entropy fetch, own hashing stream,
  // can't perturb the deck pick (which already happened). See rollReversal.
  const reversal = await rollReversal(event);

  await preloadImage(chosenUrl);

  // Honor a minimum hold so the transition has rhythm even on cache hits.
  const remaining = holdUntil - performance.now();
  if (remaining > 0) {
    await new Promise((r) => setTimeout(r, remaining));
  }

  // Swap the source while still dimmed (any flash is masked by low opacity),
  // then on the next frame release the dim — the card fades up into focus.
  imgEl.src = chosenUrl;
  // Stash the card key so the info overlay can look it up on long-press.
  currentCardName = chosenKey;
  requestAnimationFrame(() => {
    imgEl.classList.remove("dimmed");
    haptic(10); // a contemplative beat — the card has arrived
    showingBack = false;

    if (!reversal) {
      // Normal upright draw — release the input gate after the reveal.
      setTimeout(() => { drawing = false; }, 260);
      // If this is a Major Arcana card (and not reversed), schedule the
      // card's signature effect: a polished, themed moment that plays
      // 1200ms after the reveal. Start/end states are the normal card.
      // Any tap or long-press before/during the effect cancels it via
      // setDownToBack / openInfoOverlay calling MajorArcanaSignature.cancel().
      if (window.MajorArcanaSignature && window.MajorArcanaSignature.isMajor(currentCardName)) {
        window.MajorArcanaSignature.schedule(imgEl, currentCardName, 1200);
      }
    } else {
      // Reversal: hold the input gate through the 500ms beat and the
      // full glitch sequence so taps during the breakdown are ignored.
      setTimeout(async () => {
        await playGlitchSequence(imgEl);
        drawing = false;
      }, REVERSAL_DELAY_MS);
    }
  });
}

// "Set down": face-up card drifts down + fades out, then is replaced by
// the back, which fades in crisply. Qualitatively different from the draw
// (vertical, not depth; firmer easing; no scale).
async function setDownToBack(imgEl) {
  // Cancel any pending or in-flight Major Arcana signature effect so it
  // can't keep painting over a card that's no longer on screen.
  if (window.MajorArcanaSignature) window.MajorArcanaSignature.cancel();

  // Clear any Thoth zoom transform left on the card before setting it
  // down. The set-down can begin from BIG or FULLART directly (no need
  // to bounce through ARTFILL first) — the existing translate/fade
  // "drop" carries it to the back regardless of which crop was showing.
  clearZoomTransform(imgEl);

  // Make sure the back is in cache before we start the motion, so the
  // swap is instant and the fade-in is smooth.
  await preloadImage(backSrc());

  // Add .resetting WITHOUT pre-clearing .reversed. The combo CSS rule
  // (img.reversed.resetting) keeps the rotation pinned at 180° while
  // tweening translateY and opacity — so a reversed card fades out
  // staying upside-down, exactly like an upright card fades out staying
  // upright. No visible orientation flicker before the fade.
  imgEl.classList.add("resetting");
  await new Promise((r) => setTimeout(r, 300));

  // Card is now invisible (opacity 0). Snap the rotation off while
  // invisible — borrow .glitching's transition:none so the un-rotation
  // happens in one frame, not as an animated tween. Then swap src.
  if (imgEl.classList.contains("reversed")) {
    imgEl.classList.add("glitching");
    imgEl.classList.remove("reversed");
    void imgEl.offsetHeight;
    imgEl.classList.remove("glitching");
  }
  imgEl.src = backSrc();

  // Next frame: drop the .resetting class, letting the back fade back in
  // from opacity 0 / translateY(6px) → 1 / 0 via the same transition.
  requestAnimationFrame(() => {
    imgEl.classList.remove("resetting");
    haptic(4); // a quieter beat — the card is placed
    showingBack = true;
    currentCardName = null;
    setTimeout(() => { drawing = false; }, 300);
  });
}

// Play the settle animation once. 520ms matches the deckSettle keyframe.
function playSettle(imgEl) {
  return new Promise((resolve) => {
    imgEl.classList.add("settling");
    setTimeout(() => {
      imgEl.classList.remove("settling");
      resolve();
    }, 520);
  });
}

// --- Long-press reshuffle ---------------------------------------------
// Critical design: the existing onclick="newPage(event)" on the <img>
// stays UNTOUCHED — it's the only thing that draws a card. The long-press
// logic below only (a) plays the charge/commit animations and (b) sets
// `suppressClicksUntil` so the trailing click from finger-release does
// not also draw.
//
// We register THREE event families: touch, pointer, AND mouse. iOS Chrome
// in particular has been observed not to deliver touchstart reliably to
// the page even when iOS Safari does — pointerdown often fires where
// touchstart doesn't. Handlers are idempotent (guarded by the existing
// timers/flags), so whichever family fires first wins and the others are
// no-ops for that gesture.
//
// We never preventDefault on the start events — the inline onclick must
// remain reachable so a quick tap always draws.

const PRESS_PULSE_MS = 600;     // when the charge-up pulse begins
const PRESS_COMMIT_MS = 2200;   // when the reshuffle commits (≈ one extra pulse)
const POST_PRESS_SUPPRESS_MS = 500; // click-suppression window after a pulse

let pulseTimer = null;
let commitTimer = null;
let pulseStarted = false;
let pressCommitted = false;

function clearPressTimers() {
  if (pulseTimer)  { clearTimeout(pulseTimer);  pulseTimer  = null; }
  if (commitTimer) { clearTimeout(commitTimer); commitTimer = null; }
}

// Fully abort an in-flight long-press (used when a second finger lands,
// turning the interaction into a two-finger gesture instead).
function cancelPress() {
  clearPressTimers();
  if (pulseStarted) {
    const imgEl = document.querySelector("img");
    if (imgEl) imgEl.classList.remove("charging");
  }
  pulseStarted = false;
  pressCommitted = false;
}

function pressStart(event) {
  // Multi-touch is reserved for the two-finger gestures (deck zigzag,
  // zoom pinch/spread). If a second finger is already down, abort any
  // single-finger long-press so the gestures don't collide.
  if (event && event.touches && event.touches.length >= 2) {
    cancelPress();
    return;
  }
  // Idempotent: if any timer/flag is already active for this gesture,
  // a duplicate start event (e.g. pointerdown after touchstart) is a no-op.
  if (pulseTimer || commitTimer || pulseStarted || pressCommitted) return;
  // The long-press is active on EITHER side of the card — back triggers a
  // reshuffle, front opens the info overlay. Ignore while a draw/reset is
  // in flight, or while the overlay is already open.
  if (drawing || infoOverlayOpen) return;

  // Record which face was up when the press began. The commit acts on
  // that, even if state somehow changes by the time the timer fires.
  const onBackAtStart = showingBack;

  const imgEl = document.querySelector("img");
  if (!imgEl) return;

  pulseTimer = setTimeout(() => {
    pulseTimer = null;
    if (drawing || infoOverlayOpen) return;
    pulseStarted = true;
    imgEl.classList.add("charging");
    // Force a style/layout flush so the animation definitely starts on
    // browsers (iOS Chrome) that otherwise sometimes batch the class
    // change with an immediately-following one.
    void imgEl.offsetHeight;
    haptic(4);

    commitTimer = setTimeout(() => {
      commitTimer = null;
      if (drawing || infoOverlayOpen) return;
      pressCommitted = true;
      imgEl.classList.remove("charging");
      haptic(12);

      // Suppress the click that may follow finger-release so the gesture
      // isn't chased by an unwanted draw / set-down.
      suppressClicksUntil = performance.now() + POST_PRESS_SUPPRESS_MS;

      if (onBackAtStart) {
        // Back commit: reshuffle. Play the flare, then reset the deck.
        drawing = true;
        playSettle(imgEl).then(() => {
          deck = freshDeck();
          drawing = false;
          pulseStarted = false;
          pressCommitted = false;
        });
      } else {
        // Front commit: open the info overlay over the dimmed card.
        openInfoOverlay(imgEl);
        // Reset state — the overlay's own dismissal handles the rest.
        pulseStarted = false;
        pressCommitted = false;
      }
    }, PRESS_COMMIT_MS - PRESS_PULSE_MS);
  }, PRESS_PULSE_MS);
}

function pressEnd() {
  clearPressTimers();

  if (pressCommitted) {
    // Commit already handled the suppress window; nothing to do here.
    // (pressCommitted is cleared inside the commit's playSettle promise.)
    return;
  }

  if (pulseStarted) {
    // Released during the pulse — abort. Stop the animation and suppress
    // any imminent click so the gesture doesn't accidentally draw.
    const imgEl = document.querySelector("img");
    if (imgEl) imgEl.classList.remove("charging");
    suppressClicksUntil = performance.now() + POST_PRESS_SUPPRESS_MS;
    pulseStarted = false;
    return;
  }

  // Pulse never started (a normal tap). Do nothing — let the onclick
  // fire `newPage` and draw a card as usual.
}

// --- Two-finger gestures: deck zigzag + zoom pinch/spread -------------
// Both are tracked from the same touch stream. We watch the two-touch
// midpoint path and the inter-finger distance/angle:
//   - ZIGZAG (midpoint oscillates left/right while travelling down, with
//     the fingers staying roughly the same distance/angle apart) toggles
//     the deck. The zigzag is mandatory — a straight two-finger drag does
//     nothing. "If you know, you know."
//   - PINCH / SPREAD (inter-finger distance shrinks/grows, few midpoint
//     reversals) steps the Thoth zoom (artfill ⇄ fullart ⇄ big). Pinch =
//     zoom out toward BIG, spread = zoom in toward ARTFILL.
// These are mutually exclusive per gesture: on release we classify which
// one happened and act on exactly one.

let tfActive = false;       // a two-finger gesture is in progress
let tfStart = null;         // {dist, angle, midX, midY, time}
let tfMidPath = [];         // sampled midpoints for zigzag analysis
let tfZoomLive = false;     // whether we're showing a live zoom preview

const ZIGZAG_MIN_REVERSALS = 3;     // X-direction reversals required
const ZIGZAG_MIN_DOWN = 60;         // px of net downward midpoint travel
const ZIGZAG_MIN_AMP = 26;          // px lateral amplitude
const ZOOM_STEP_RATIO = 0.16;       // |ratio-1| past this commits a zoom step

// Spatial separation between the two two-finger gestures, so they never
// clash and each stays true to itself:
//   - The TOP band of the screen is the DECK zone: a two-finger zigzag
//     STARTING here switches decks. Zoom is disabled up here (you'd never
//     pinch the card from its top edge anyway). "If you know, you know."
//   - Everywhere below is the ZOOM zone: pinch/spread zooms; zigzag is
//     ignored there.
// Deterministic by where the gesture begins — no fuzzy motion guessing.
const DECK_ZONE_FRAC = 0.25;        // top quarter of the viewport
function startedInDeckZone() {
  return !!tfStart && tfStart.midY < window.innerHeight * DECK_ZONE_FRAC;
}

function tfDist(a, b) { return Math.hypot(b.clientX - a.clientX, b.clientY - a.clientY); }
function tfAngle(a, b) { return Math.atan2(b.clientY - a.clientY, b.clientX - a.clientX); }
function tfMid(a, b) { return { x: (a.clientX + b.clientX) / 2, y: (a.clientY + b.clientY) / 2 }; }

function twoFingerStart(e) {
  if (!e.touches || e.touches.length !== 2) return;
  cancelPress(); // a long-press can't coexist with a two-finger gesture
  const [t0, t1] = e.touches;
  tfActive = true;
  tfStart = {
    dist: tfDist(t0, t1),
    angle: tfAngle(t0, t1),
    midX: (t0.clientX + t1.clientX) / 2,
    midY: (t0.clientY + t1.clientY) / 2,
    time: e.timeStamp
  };
  tfMidPath = [{ x: tfStart.midX, y: tfStart.midY }];
  tfZoomLive = false;
  if (e.cancelable) e.preventDefault(); // suppress native page pinch-zoom
}

function twoFingerMove(e) {
  if (!tfActive || !e.touches || e.touches.length !== 2) return;
  if (e.cancelable) e.preventDefault();
  const [t0, t1] = e.touches;
  tfMidPath.push(tfMid(t0, t1));

  // Live zoom: only on a face-up Thoth card, and only once the pinch has
  // clearly diverged from a zigzag (distance changing more than the
  // midpoint wanders laterally). The first qualifying frame opens a zoom
  // session; subsequent frames drive it continuously with the fingers.
  // Zoom only in the ZOOM zone (gesture started below the top deck band),
  // on a face-up Thoth card.
  if (currentDeck === "thoth" && !showingBack && !drawing && !startedInDeckZone()) {
    const ratio = tfDist(t0, t1) / tfStart.dist;
    const lateral = Math.abs(tfMid(t0, t1).x - tfStart.midX);
    if (Math.abs(ratio - 1) > 0.06 && Math.abs(ratio - 1) * 240 > lateral) {
      tfZoomLive = true;
      if (!zoom) beginZoom(ratio);
      updateZoom(ratio);
    }
  }
}

function twoFingerEnd(e) {
  if (!tfActive) return;
  // Wait until fewer than two fingers remain.
  if (e.touches && e.touches.length >= 2) return;
  tfActive = false;

  // Suppress the trailing synthetic click finger-release can fire, so a
  // gesture is never chased by an unwanted draw / set-down.
  suppressClicksUntil = performance.now() + POST_PRESS_SUPPRESS_MS;

  if (isZigzag()) {
    cancelZoom();          // a zigzag wins over any stray zoom preview
    toggleDeck();
  } else if (zoom) {
    endZoom();             // a zoom session is open — land it
  } else {
    cancelZoom();
  }
  tfStart = null;
  tfMidPath = [];
  tfZoomLive = false;
}

// --- Three-finger swipe-up: native share of the current card ----------
// A three-finger swipe from bottom to top while on a face-up card hands
// the displayed image to the device's native share sheet (Web Share API).
// Works for BOTH decks, EVERY zoom crop, and reversed cards (the rotated
// view is rendered to a canvas so the shared image matches the screen).
//
// This is engineered hard for iOS Safari, where naive implementations
// fire only "sometimes" and never twice. The defenses, and the iOS quirk
// each one answers:
//
//   1. EAGER FILE CACHE. The shareable File for whatever card is on screen
//      is built ahead of time (a MutationObserver rebuilds it whenever the
//      <img> src/orientation changes — draw, zoom, deck toggle, reversal).
//      So at gesture time we NEVER await — navigator.share() is called
//      synchronously inside the touch handler. iOS requires transient user
//      activation for share(), and ANY await before it consumes that
//      activation; the old "prepare on touchstart" race is gone.
//
//   2. FIRE FROM touchend OR touchcancel. touchmove carries no activation;
//      and iOS commonly sends touchcancel (not touchend) when a multi-touch
//      drifts near a system gesture / the home-indicator edge. We fire on
//      whichever terminator arrives once the swipe is armed.
//
//   3. shareInFlight CAN'T STICK. The iOS share promise frequently never
//      settles (canceling the sheet, and in standalone PWAs), which would
//      leave a naive in-flight flag true forever and block every later
//      share — the classic "works once, never again". We reset the flag at
//      the start of every gesture, on visibilitychange (returning from the
//      sheet), AND via a watchdog timeout. It can never permanently latch.
//
//   4. Only the image file is shared — no title/text.
let threeFingerActive = false;
let threeFingerStartY = 0;
let threeFingerPeakUp = 0;      // largest upward travel seen this gesture
let threeFingerArmed  = false;
let threeFingerFired  = false;  // already fired this gesture (anti-double)
let currentShareFile  = null;   // eagerly-built File for the on-screen card
let currentShareKey   = "";     // the src(+orientation) currentShareFile was built from
let shareFileToken    = 0;      // guards against stale async builds
function shareKeyFor(imgEl) {
  return imgEl.src + (imgEl.classList.contains("reversed") ? "|r" : "");
}
let shareInFlight     = false;  // a share sheet is (believed) open
let shareWatchdog     = null;

function avgY(touches) {
  let s = 0;
  for (let i = 0; i < touches.length; i++) s += touches[i].clientY;
  return s / touches.length;
}

// Rebuild the cached share File for whatever card is currently displayed.
// Debounced + token-guarded so the frequent class flips during the glitch
// animation don't thrash, and a stale build can't overwrite a newer one.
let shareRefreshTimer = null;
function scheduleShareRefresh() {
  if (shareRefreshTimer) clearTimeout(shareRefreshTimer);
  shareRefreshTimer = setTimeout(refreshShareFile, 120);
}
function refreshShareFile() {
  const imgEl = document.querySelector("img");
  const token = ++shareFileToken;
  // Nothing shareable while the back is up or a draw is mid-flight.
  if (!imgEl || showingBack || drawing) { currentShareFile = null; currentShareKey = ""; return; }
  const url = imgEl.src;
  const reversed = imgEl.classList.contains("reversed");
  const key = shareKeyFor(imgEl);
  buildShareFile(url, reversed)
    .then((f) => { if (token === shareFileToken) { currentShareFile = f; currentShareKey = key; } })
    .catch(() => { if (token === shareFileToken) { currentShareFile = null; currentShareKey = ""; } });
}

// --- TEMP on-screen share diagnostics (remove once iOS share is solved) -
// Shows where the three-finger share path gets to on each gesture, so a
// device that misbehaves can be read directly. Toggle with a 4-finger tap.
let _shareDbgEl = null;
let _shareDbgOn = true;
let _shareFireCount = 0;
function shareDbg(stage, extra) {
  if (!_shareDbgOn) return;
  if (!_shareDbgEl) {
    _shareDbgEl = document.createElement("div");
    _shareDbgEl.style.cssText =
      "position:fixed;top:0;left:0;right:0;z-index:99999;" +
      "padding:calc(env(safe-area-inset-top,0px) + 4px) 6px 4px;" +
      "font:11px/1.4 ui-monospace,Menlo,monospace;color:#8f8;" +
      "background:rgba(0,0,0,0.6);white-space:pre-wrap;pointer-events:none;";
    document.body.appendChild(_shareDbgEl);
  }
  const imgEl = document.querySelector("img");
  _shareDbgEl.textContent =
    "SHARE " + stage + (extra ? " " + extra : "") +
    "\nfires=" + _shareFireCount +
    " share=" + (!!navigator.share) + " canShare=" + (!!navigator.canShare) +
    " file=" + (currentShareFile ? Math.round(currentShareFile.size / 1024) + "k" : "null") +
    "\ninFlight=" + shareInFlight + " back=" + showingBack +
    " drawing=" + drawing + " overlay=" + infoOverlayOpen +
    "\ntfActive=" + threeFingerActive + " armed=" + threeFingerArmed +
    " fired=" + threeFingerFired + " vis=" + document.visibilityState +
    " src=" + (imgEl ? imgEl.src.split("/").slice(-2).join("/") : "?");
}

function threeFingerStart(e) {
  if (!e.touches || e.touches.length !== 3) return;
  // Reset gesture + share state FIRST, before any guard, so nothing can be
  // left stuck from a prior gesture / share. (A stuck flag was a suspect in
  // the "works once then never" iOS report.)
  clearShareInFlight();
  threeFingerActive = true;
  threeFingerArmed  = false;
  threeFingerFired  = false;
  threeFingerStartY = avgY(e.touches);
  threeFingerPeakUp = 0;
  // Only the face-up card is shareable. We deliberately DON'T gate on
  // drawing/infoOverlayOpen here: when the overlay is genuinely open it
  // sits above the <img> and eats the touches anyway, so gating on a flag
  // that could desync only risks wedging the gesture.
  if (showingBack) { threeFingerActive = false; shareDbg("start-back"); return; }
  // Always rebuild a fresh File for this gesture (the previous one may be a
  // spent/stale object). The swipe gives the async build time to finish.
  refreshShareFile();
  shareDbg("start");
  if (e.cancelable) e.preventDefault();
}

function threeFingerMove(e) {
  if (!threeFingerActive || threeFingerFired) return;
  if (!e.touches || e.touches.length !== 3) return;
  if (e.cancelable) e.preventDefault();
  // Track the largest upward travel; arm once it passes a modest threshold
  // (~12% of viewport, min 80px) so a real swipe-up qualifies even if iOS
  // is about to cancel the touch.
  const up = threeFingerStartY - avgY(e.touches);
  if (up > threeFingerPeakUp) threeFingerPeakUp = up;
  if (!threeFingerArmed && threeFingerPeakUp >= Math.max(80, window.innerHeight * 0.12)) {
    threeFingerArmed = true;
    shareDbg("armed", "up=" + Math.round(threeFingerPeakUp));
  }
}

// Terminator for the gesture — bound to BOTH touchend and touchcancel.
function threeFingerEnd(e) {
  if (!threeFingerActive) return;
  // On touchend, wait until fewer than three remain so a brief lift mid-
  // swipe doesn't end it early. touchcancel always terminates immediately.
  if (e && e.type === "touchend" && e.touches && e.touches.length >= 3) return;
  threeFingerActive = false;
  suppressClicksUntil = performance.now() + POST_PRESS_SUPPRESS_MS;
  shareDbg("end", e ? e.type : "?");
  if (threeFingerArmed && !threeFingerFired) {
    threeFingerFired = true;
    haptic(12);
    fireShare();   // synchronous within this terminator → activation intact
  }
}

async function buildShareFile(url, reversed) {
  const resp = await fetch(url);
  let blob = await resp.blob();
  let type = blob.type || "image/jpeg";
  if (reversed) {
    // Reversal is CSS-only (transform: rotate(180deg)); render the rotated
    // view so the shared image matches what's on screen.
    const r = await renderReversedBlob(url, type);
    blob = r.blob; type = r.type;
  }
  const ext  = type === "image/png" ? "png" : "jpg";
  const name = (currentCardName || "card") + (reversed ? "-reversed" : "") + "." + ext;
  return new File([blob], name, { type });
}

function clearShareInFlight() {
  shareInFlight = false;
  if (shareWatchdog) { clearTimeout(shareWatchdog); shareWatchdog = null; }
}

// A File handed to navigator.share is SINGLE-USE on iOS: a successful share
// consumes its underlying blob, so the same File object can't be shared a
// second time (it silently fails — the "works once, then never until I open
// the meaning and come back" bug; reopening the overlay only "fixed" it
// because closeInfoOverlay toggles an <img> class, tripping the observer
// rebuild). So after every share we drop the spent File and immediately
// build a fresh one for the next swipe.
function invalidateShareFile() {
  currentShareFile = null;
  currentShareKey = "";
  refreshShareFile();
}

// Fire the native share sheet. Must be called synchronously from a touch
// terminator so iOS still sees transient activation. Shares ONLY the
// eagerly-cached image File.
function fireShare() {
  // NOTE: deliberately NOT gating on shareInFlight here. iOS serializes the
  // share sheet itself, and a never-settling promise used to leave that flag
  // stuck → every later swipe blocked ("works once, then never"). Intra-
  // gesture double-fire is already prevented by threeFingerFired.
  if (!navigator.share) { shareDbg("no-share-api"); return; }
  const file = currentShareFile;
  if (!file) { shareDbg("blocked-no-file"); return; }
  // canShare, when present, is authoritative; when absent (older iOS),
  // attempt the file share anyway rather than refusing.
  if (navigator.canShare && !navigator.canShare({ files: [file] })) {
    shareDbg("blocked-canShare-false");
    return;
  }
  shareInFlight = true;
  shareWatchdog = setTimeout(clearShareInFlight, 8000);
  _shareFireCount++;
  shareDbg("share-called");
  let p;
  try {
    p = navigator.share({ files: [file] });
  } catch (err) { shareDbg("share-threw", String(err)); clearShareInFlight(); invalidateShareFile(); return; }
  // The File is now spent (iOS consumes it on a successful share). Drop it
  // and rebuild a fresh one so the very next swipe can share again.
  invalidateShareFile();
  if (p && typeof p.then === "function") {
    p.then(() => shareDbg("share-resolved"))
     .catch((err) => shareDbg("share-rejected", String(err)))
     .finally(clearShareInFlight);
  } else {
    shareDbg("share-no-promise");
    clearShareInFlight();
  }
}

// Draw the card image rotated 180° onto a canvas and return a blob, so the
// share sheet receives the same orientation the querent sees on screen.
// Both decks are same-origin now, so the canvas isn't tainted by CORS.
function renderReversedBlob(url, sourceType) {
  return new Promise((resolve, reject) => {
    const im = new Image();
    im.onload = () => {
      const c = document.createElement("canvas");
      c.width = im.naturalWidth;
      c.height = im.naturalHeight;
      const ctx = c.getContext("2d");
      ctx.translate(c.width / 2, c.height / 2);
      ctx.rotate(Math.PI);
      ctx.drawImage(im, -c.width / 2, -c.height / 2);
      // Preserve PNG if the source was PNG; otherwise emit JPEG to keep
      // share payloads small (these are photos of paintings, not line art).
      const outType = sourceType === "image/png" ? "image/png" : "image/jpeg";
      c.toBlob(
        (b) => b ? resolve({ blob: b, type: outType }) : reject(new Error("toBlob failed")),
        outType, 0.92
      );
    };
    im.onerror = () => reject(new Error("image load failed"));
    im.src = url;
  });
}

// Is the just-finished two-finger gesture the (gated, deliberate) zigzag?
// Must START in the top deck zone — that's what keeps it from clashing
// with a pinch/zoom done on the card body.
function isZigzag() {
  if (!tfStart || tfMidPath.length < 6) return false;
  if (!startedInDeckZone()) return false;
  const first = tfMidPath[0];
  const last = tfMidPath[tfMidPath.length - 1];
  const netDown = last.y - first.y;
  let reversals = 0, lastSign = 0, minX = Infinity, maxX = -Infinity;
  for (let i = 1; i < tfMidPath.length; i++) {
    const dx = tfMidPath[i].x - tfMidPath[i - 1].x;
    if (tfMidPath[i].x < minX) minX = tfMidPath[i].x;
    if (tfMidPath[i].x > maxX) maxX = tfMidPath[i].x;
    if (Math.abs(dx) < 2) continue;
    const sign = Math.sign(dx);
    if (lastSign !== 0 && sign !== lastSign) reversals++;
    lastSign = sign;
  }
  const amp = maxX - minX;
  return reversals >= ZIGZAG_MIN_REVERSALS &&
         netDown >= ZIGZAG_MIN_DOWN &&
         amp >= ZIGZAG_MIN_AMP;
}

// --- Zoom system ------------------------------------------------------
// Three Thoth zoom states share the same art, so most of the zoom is a
// TRUE continuous scale rather than a crossfade:
//
//   ARTFILL  — the FULLART file scaled up (scale = aspect / 0.578) so the
//              art fills the frame; the cropped sides sit just off-screen.
//   FULLART  — the FULLART file at scale 1, object-fit:contain → the whole
//              art with black letterbox (free, because the file has no
//              border around the art).
//   BIG      — the BIG file (whole card incl. border) at scale 1.
//
// ARTFILL <-> FULLART is therefore one image at two scales: interpolating
// the scale with the fingers is a real zoom, no crossfade, no flash.
// FULLART <-> BIG is a genuine content reveal (the border appears), so it
// uses an opaque-base crossfade with a brief blur. Everything runs on an
// overlay ghost so the underlying <img> (and the Major effects, the draw
// path, and the untouched RW deck) never sees a transform.

const TARGET_ASPECT = 825 / 1427;        // 0.5781 — the artfill/display aspect
let currentFullAspect = 0.644;           // FULLART file aspect for the current card
let zoom = null;                         // active zoom session, or null
let zoomBusy = false;                    // a crossfade is animating (no overlap)

// Scale that makes the FULLART-file ghost fill the frame like ARTFILL.
function artfillScale() {
  return Math.max(1, currentFullAspect / TARGET_ASPECT);
}

// Preload the Thoth zoom assets for a card and capture the FULLART file's
// true aspect (so artfillScale() is exact). Called when a Thoth card is
// drawn; the BIG file is warmed too for the FULLART->BIG crossfade.
function preloadThothZoomAssets(key) {
  const fullUrl = DECKS.thoth.cardSrc(key, "fullart");
  const fa = new Image();
  fa.onload = function () {
    if (fa.naturalWidth && fa.naturalHeight) {
      currentFullAspect = fa.naturalWidth / fa.naturalHeight;
    }
  };
  fa.src = fullUrl;
  new Image().src = DECKS.thoth.cardSrc(key, "big");
}

function makeZoomGhost(url, scale, z) {
  const g = document.createElement("img");
  g.src = url;
  g.className = "zoom-ghost";
  g.style.cssText =
    "position:fixed;inset:0;width:100vw;height:100vh;height:100dvh;" +
    "object-fit:contain;pointer-events:none;z-index:" + (z || 30) + ";" +
    "transform:scale(" + scale.toFixed(4) + ");will-change:transform,opacity,filter;";
  document.body.appendChild(g);
  return g;
}

// Remove any zoom ghost immediately and clear the session (used by state
// changes — set-down, deck toggle, new draw).
function teardownZoom() {
  zoom = null;
  zoomBusy = false;
  // Remove any ghost (including one orphaned by a mid-crossfade state change).
  document.querySelectorAll(".zoom-ghost").forEach((g) => g.remove());
}

function clearZoomTransform(imgEl) {
  teardownZoom();
  if (imgEl) { imgEl.style.transition = ""; imgEl.style.transform = ""; imgEl.style.opacity = ""; }
}

// --- Discrete crossfade zoom (artfill <-> fullart <-> big) -------------
// Each zoom state is its OWN file: artfill fills the frame, fullart is the
// letterboxed art, big is the whole bordered card. During the pinch we give
// light live feedback by scaling the visible card with the fingers; on
// release we commit ONE step in the pinch DIRECTION (not by how hard you
// pinched) and crossfade to that state's file. Committing by direction —
// rather than by a steep magnitude threshold on the near-invisible ~12%
// artfill/fullart scale — is what makes every step, including leaving
// FULLART, reliably transition.
const ZOOM_LIVE_MIN = 0.6, ZOOM_LIVE_MAX = 1.7;   // clamp the live-preview scale
const ZOOM_COMMIT_DEADZONE = 0.10;                // |ratio-1| past this = a step

// Open a live-zoom session: record it; the visible <img> is scaled directly
// for tactile feedback while the fingers move.
function beginZoom(ratio) {
  if (zoomBusy) return;                    // a crossfade is mid-flight; ignore
  const imgEl = document.querySelector("img");
  if (!imgEl || !currentCardName) return;
  // A deliberate zoom means the user has engaged — cancel any pending
  // Major-Arcana signature so it can never fire onto a mid-zoom card.
  if (window.MajorArcanaSignature) window.MajorArcanaSignature.cancel();
  imgEl.style.transition = "none";
  zoom = { imgEl, ratio: 1 };
}

// Drive the live preview with the finger ratio.
function updateZoom(ratio) {
  if (!zoom) return;
  zoom.ratio = ratio;
  const s = Math.max(ZOOM_LIVE_MIN, Math.min(ZOOM_LIVE_MAX, ratio));
  zoom.imgEl.style.transform = "scale(" + s.toFixed(4) + ")";
}

// Land the session: step one zoom state in the pinch direction (if past the
// deadzone and not already at an end), else ease the preview back.
function endZoom() {
  if (!zoom) return;
  const z = zoom; zoom = null;
  const imgEl = z.imgEl;
  const out = z.ratio < 1;                            // fingers together = zoom OUT
  const idx = ZOOM_ORDER.indexOf(zoomMode);
  const nextIdx = out ? Math.min(ZOOM_ORDER.length - 1, idx + 1)
                      : Math.max(0, idx - 1);
  if (Math.abs(z.ratio - 1) < ZOOM_COMMIT_DEADZONE || nextIdx === idx) {
    easeBackZoom(imgEl);                              // below deadzone or at an end
    return;
  }
  zoomMode = ZOOM_ORDER[nextIdx];
  // Update the remembered in/out preference. Landing on the middle crop
  // (fullart) collapses to artfill, so only the two end states persist.
  rememberZoom(zoomMode);
  syncSignatureCrop();
  crossfadeZoom(imgEl, zoomMode, z.ratio);
  haptic(4);
}

// Flash-free crossfade from the live-scaled current image to `mode`'s file:
// decode the target first, fade a ghost of it in over the live image (both
// easing to scale 1), then swap the real <img> underneath and drop the ghost
// only once it has decoded the same file — an invisible handoff.
async function crossfadeZoom(imgEl, mode, startScale) {
  zoomBusy = true;
  // Safety net: whatever happens in the async body below — a rejected
  // decode, a suspended tab on iOS standalone, an unexpected throw — this
  // guarantees the ghost is swept, the img is left visible, and the busy
  // flag is released. A stranded ghost or a stuck flag is exactly what
  // produced the "pile of ghosts" + "have to retry several times" bug.
  let settled = false;
  const finish = () => {
    if (settled) return;
    settled = true;
    document.querySelectorAll(".zoom-ghost").forEach((g) => g.remove());
    imgEl.style.transition = "";
    imgEl.style.transform = "";
    imgEl.style.opacity = "";
    zoomBusy = false;
  };
  const safety = setTimeout(finish, 1200);

  try {
    const targetUrl = deckModel().cardSrc(currentCardName, mode);
    const s0 = Math.max(ZOOM_LIVE_MIN, Math.min(ZOOM_LIVE_MAX, startScale || 1));

    const pre = new Image();
    pre.src = targetUrl;
    try { await pre.decode(); } catch (_e) { /* cached / paints below */ }

    const ghost = makeZoomGhost(targetUrl, s0, 30);
    ghost.style.opacity = "0";
    ghost.style.transition = "opacity 200ms ease, transform 220ms cubic-bezier(0.2,0,0,1)";
    imgEl.style.transition = "opacity 180ms ease, transform 220ms cubic-bezier(0.2,0,0,1)";
    void ghost.offsetHeight;
    requestAnimationFrame(() => {
      ghost.style.opacity = "1";
      ghost.style.transform = "scale(1)";
      imgEl.style.opacity = "0";
      imgEl.style.transform = "scale(1)";
    });

    await sleep(230);
    imgEl.style.transition = "none";
    imgEl.src = targetUrl;
    try { await imgEl.decode(); } catch (_e) { /* ignore */ }
    imgEl.style.transform = ""; imgEl.style.opacity = "";
    void imgEl.offsetHeight;
    // One painted frame with the real img up, then sweep EVERY ghost (this
    // one plus any orphaned by a fast back-and-forth) so none can stack in
    // the letterbox bars.
    await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
  } catch (_e) {
    /* fall through to finish() — never leave the zoom half-applied */
  } finally {
    clearTimeout(safety);
    finish();
  }
}

// Ease the live preview back to neutral (no state change).
function easeBackZoom(imgEl) {
  imgEl.style.transition = "transform 200ms cubic-bezier(0.2,0,0,1)";
  imgEl.style.transform = "scale(1)";
  setTimeout(() => { imgEl.style.transition = ""; imgEl.style.transform = ""; }, 210);
}

// Abort an open session (e.g. the gesture turned out to be a zigzag).
function cancelZoom() {
  if (!zoom) return;
  const z = zoom; zoom = null;
  easeBackZoom(z.imgEl);
}

// --- Deck toggle + Scooby-Doo alternate-reality transition ------------
// Switching decks warps the current card (back OR face-up) through a
// brief "other reality" distortion, swaps to the equivalent card in the
// other deck at the apex, then resolves. The warp is built from several
// time-offset ghost copies of the current image, each riding its own
// vertical sine displacement and horizontal jitter, with a chromatic
// red/cyan split — pure CSS transforms + opacity, so it runs on every
// browser. The swap happens immediately (even mid-reading): a face-up
// RW Three of Cups becomes the Thoth Three of Cups, in ARTFILL.

let deckSwitching = false;

function toggleDeck() {
  if (deckSwitching) return;
  deckSwitching = true;

  const imgEl = document.querySelector("img");
  if (!imgEl) { deckSwitching = false; return; }

  // Cancel any in-flight signature/zoom so they don't fight the warp.
  if (window.MajorArcanaSignature) window.MajorArcanaSignature.cancel();
  clearZoomTransform(imgEl);

  const wasBack = showingBack;
  const fromUrl = imgEl.src;

  // Flip the active deck. The new deck "arrives" at its remembered zoom:
  // the querent's in/out Thoth preference (artfill always for RW).
  currentDeck = (currentDeck === "rw") ? "thoth" : "rw";
  zoomMode = defaultZoomForDraw();
  // Tell the signature module which deck + crop is active so art-location-
  // dependent effects (the Sun) use the matching coordinates.
  if (window.MajorArcanaSignature && window.MajorArcanaSignature.setDeck) {
    window.MajorArcanaSignature.setDeck(currentDeck);
  }
  syncSignatureCrop();

  // Determine the target image: the equivalent card at the remembered zoom
  // (or the new back).
  const toUrl = wasBack
    ? backSrc()
    : (currentCardName ? deckModel().cardSrc(currentCardName, zoomMode) : backSrc());

  haptic(14);
  playRealityWarp(imgEl, fromUrl, toUrl).then(() => {
    deckSwitching = false;
    // Kick off background preload of the now-inactive deck's assets so a
    // toggle back is instant.
    preloadDeckInBackground();
  });
}

// The warp itself. ~900ms. Returns a promise that resolves when the new
// card has settled and the overlays are cleaned up.
function playRealityWarp(imgEl, fromUrl, toUrl) {
  return new Promise((resolve) => {
    const reduce = window.matchMedia &&
                   window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    // Preload the target so the mid-warp swap is instant.
    const pre = new Image();
    pre.src = toUrl;

    if (reduce) {
      // Reduced motion: a quick crossfade, no distortion.
      imgEl.style.transition = "opacity 200ms ease";
      imgEl.style.opacity = "0";
      setTimeout(() => {
        imgEl.src = toUrl;
        requestAnimationFrame(() => {
          imgEl.style.opacity = "1";
          setTimeout(() => { imgEl.style.transition = ""; resolve(); }, 220);
        });
      }, 210);
      return;
    }

    // Two stacked ghost sets: the reality we're LEAVING (copies of the
    // current card) and the reality we're ENTERING (copies of the target).
    // Both ride the same wobble so they overlay coherently. Near the apex
    // the "from" set dissolves out (chromatically tinted) while the "to"
    // set dissolves IN with a screen blend + blur — so the two realities
    // melt into one another, ethereal and hazy, instead of hard-cutting.
    const N = 4;
    const fromGhosts = [];
    const toGhosts = [];
    function buildGhost(src, z, blend) {
      const g = document.createElement("img");
      g.src = src;
      g.className = "warp-ghost";
      g.style.cssText =
        "position:fixed;inset:0;width:100vw;height:100vh;height:100dvh;" +
        "object-fit:contain;pointer-events:none;z-index:" + z + ";" +
        "will-change:transform,opacity,filter;opacity:0;" +
        (blend ? "mix-blend-mode:screen;" : "");
      document.body.appendChild(g);
      return g;
    }
    for (let i = 0; i < N; i++) {
      fromGhosts.push(buildGhost(fromUrl, 45 + i, false));
      toGhosts.push(buildGhost(toUrl, 45 + N + i, true)); // 'to' set on top
    }

    // Paint the leaving reality as a SOLID, undistorted stand-in for the
    // current card right now — before the real <img> is hidden — so there
    // is never a frame where neither the card nor the ghosts are visible
    // (that gap was the "flash"/"sudden dim" at the start). The fromUrl is
    // the on-screen image, already decoded, so these paint immediately.
    for (let i = 0; i < N; i++) {
      const central0 = 1 - Math.abs(i - (N - 1) / 2) / ((N - 1) / 2 || 1);
      fromGhosts[i].style.transform = "none";
      fromGhosts[i].style.filter = "none";
      fromGhosts[i].style.opacity = (0.4 + 0.6 * central0).toFixed(3);
    }
    imgEl.style.transition = "none";

    const DUR = 950;
    let start = 0;            // set on the first animation frame
    let swapped = false;

    function smoothstep(a, b, x) {
      const u = Math.max(0, Math.min(1, (x - a) / (b - a)));
      return u * u * (3 - 2 * u);
    }

    function frame(now) {
      if (!start) start = now;
      const t = Math.min(1, (now - start) / DUR);
      const env = Math.sin(Math.PI * t);              // distortion amplitude 0→1→0
      const xfade = smoothstep(0.30, 0.70, t);        // from→to crossover
      const realRamp = smoothstep(0.52, 0.90, t);     // clean image rising, back half

      for (let i = 0; i < N; i++) {
        const phase = (i / N) * Math.PI * 2;
        const wobble = Math.sin(t * Math.PI * 6 + phase);
        const tx = wobble * 26 * env * (i - (N - 1) / 2) * 0.7;
        const sy = 1 + 0.045 * Math.sin(t * Math.PI * 8 + phase) * env;
        const skew = wobble * 6 * env;
        const xform = "translateX(" + tx.toFixed(1) + "px) scaleY(" + sy.toFixed(3) +
                      ") skewX(" + skew.toFixed(2) + "deg)";
        const central = 1 - Math.abs(i - (N - 1) / 2) / ((N - 1) / 2 || 1);

        // Leaving reality: starts fully solid (so the warp grows OUT of the
        // current card, no flash), wobbles via `env`, and dissolves only as
        // the crossover (`xfade`) rises through the apex. The chromatic hue
        // split + saturation are ramped by `env` so they fade IN from
        // neutral instead of popping on at the first frame.
        const fg = fromGhosts[i];
        fg.style.transform = xform;
        fg.style.opacity = ((0.4 + 0.6 * central) * (1 - xfade)).toFixed(3);
        fg.style.filter = "hue-rotate(" + ((i - (N - 1) / 2) * 14 * env).toFixed(1) +
                          "deg) saturate(" + (1 + 0.5 * env).toFixed(3) + ")";

        // Arriving reality: blooms in around the apex (screen blend), most
        // blurred at the crossover and sharpening as it settles, then
        // yields to the real clean image as that rises underneath.
        const tg = toGhosts[i];
        tg.style.transform = xform;
        tg.style.opacity = (env * (0.4 + 0.6 * central) * xfade * (1 - realRamp)).toFixed(3);
        const blur = 9 * (1 - Math.abs(2 * xfade - 1)) + 3 * (1 - realRamp);
        tg.style.filter = "blur(" + blur.toFixed(1) + "px) saturate(1.4)";
      }

      // Swap the real img to the target at the apex (hidden under ghosts).
      if (!swapped && t >= 0.5) { swapped = true; imgEl.src = toUrl; }

      // Back half: the clean target rises underneath, easing from a slight
      // scale so it "resolves into focus" — a smooth punctuation, not a pop.
      if (swapped) {
        imgEl.style.opacity = realRamp.toFixed(3);
        imgEl.style.transform = "scale(" + (1.035 - 0.035 * realRamp).toFixed(4) + ")";
      }

      if (t < 1) {
        requestAnimationFrame(frame);
      } else {
        imgEl.style.opacity = "1";
        imgEl.style.transform = "";
        imgEl.style.transition = "";
        for (const g of fromGhosts) if (g.parentNode) g.remove();
        for (const g of toGhosts) if (g.parentNode) g.remove();
        resolve();
      }
    }
    // Let the solid leaving-reality ghosts paint for one frame, THEN hide
    // the real image (seamless handoff — no blank gap) and begin the warp.
    requestAnimationFrame(() => {
      imgEl.style.opacity = "0";
      requestAnimationFrame(frame);
    });
  });
}

// --- Background preload of the inactive deck --------------------------
// After the active card has loaded, quietly fetch the OTHER deck's back
// and (for Thoth) the artfill crops, so the first toggle is instant.
let preloadStarted = false;
function preloadDeckInBackground() {
  if (preloadStarted) return;
  preloadStarted = true;
  const run = () => {
    // The back of whichever deck isn't active right now.
    const other = (currentDeck === "rw") ? "thoth" : "rw";
    new Image().src = DECKS[other].back;
    // Both decks are now self-hosted and small (RW faces ~100KB each under
    // rw/, Thoth artfill crops likewise under thoth/artfill/), so warm the
    // whole inactive deck's faces — a toggle in either direction is then
    // instant. cardSrc() resolves rw/<key>.jpg or thoth/artfill/<key>.jpg.
    for (const key of CARD_KEYS) new Image().src = DECKS[other].cardSrc(key);
  };
  if ("requestIdleCallback" in window) requestIdleCallback(run, { timeout: 4000 });
  else setTimeout(run, 1500);
}

function wireLongPress() {
  const imgEl = document.querySelector("img");
  if (!imgEl) return;

  // Two-finger gesture listeners. Non-passive so we can preventDefault
  // the browser's native pinch-zoom while a gesture is in progress.
  imgEl.addEventListener("touchstart",  twoFingerStart, { passive: false });
  imgEl.addEventListener("touchmove",   twoFingerMove,  { passive: false });
  imgEl.addEventListener("touchend",    twoFingerEnd,   { passive: false });
  imgEl.addEventListener("touchcancel", twoFingerEnd,   { passive: false });

  // Three-finger swipe-up: hand the current card to the native share sheet.
  // Each handler is no-op unless exactly three touches are present, so it
  // never collides with the one- or two-finger gestures above. Bound to
  // BOTH touchend and touchcancel because iOS often terminates a multi-
  // touch with cancel rather than end (see threeFingerEnd).
  imgEl.addEventListener("touchstart",  threeFingerStart, { passive: false });
  imgEl.addEventListener("touchmove",   threeFingerMove,  { passive: false });
  imgEl.addEventListener("touchend",    threeFingerEnd,   { passive: false });
  imgEl.addEventListener("touchcancel", threeFingerEnd,   { passive: false });

  // TEMP: 4-finger tap toggles the share-diagnostics readout.
  imgEl.addEventListener("touchstart", (e) => {
    if (e.touches && e.touches.length === 4) {
      _shareDbgOn = !_shareDbgOn;
      if (_shareDbgEl) _shareDbgEl.style.display = _shareDbgOn ? "block" : "none";
      if (_shareDbgOn) shareDbg("hud-on");
    }
  }, { passive: true });

  // Keep the eager share-File cache in sync with whatever card is on screen:
  // every draw, zoom crossfade, deck toggle, or reversal changes the <img>
  // src and/or class, so the share fire path is always synchronous.
  if ("MutationObserver" in window) {
    const mo = new MutationObserver(scheduleShareRefresh);
    mo.observe(imgEl, { attributes: true, attributeFilter: ["src", "class"] });
  }
  refreshShareFile();   // build for the initial state (no-op while on the back)

  // Returning from the native share sheet fires visibilitychange/pageshow;
  // clear any in-flight flag then so a never-settling iOS share promise can
  // never block the next swipe. Also refresh the cached file.
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") {
      clearShareInFlight();
      scheduleShareRefresh();
    }
  });
  window.addEventListener("pageshow", clearShareInFlight);

  // Touch (most native on mobile WebKit, including iOS Safari).
  imgEl.addEventListener("touchstart",  pressStart, { passive: true });
  imgEl.addEventListener("touchend",    pressEnd,   { passive: true });
  imgEl.addEventListener("touchcancel", pressEnd,   { passive: true });

  // Pointer (fallback for browsers/wrappers where touchstart doesn't
  // reach the page reliably — observed in iOS Chrome).
  imgEl.addEventListener("pointerdown", pressStart);
  imgEl.addEventListener("pointerup",   pressEnd);
  imgEl.addEventListener("pointercancel", pressEnd);

  // Mouse (desktop).
  imgEl.addEventListener("mousedown",  pressStart);
  imgEl.addEventListener("mouseup",    pressEnd);
  imgEl.addEventListener("mouseleave", pressEnd);

  // Belt-and-suspenders next to the CSS callout suppression.
  imgEl.addEventListener("contextmenu", (e) => e.preventDefault());
}

function init() {
  wireLongPress();
  // Quietly warm the alternate deck's assets so the first zigzag toggle
  // is instant. Runs on idle so it never competes with the first paint.
  preloadDeckInBackground();
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init);
} else {
  init();
}

// --- Info overlay -----------------------------------------------------
// Long-press on a face-up card reveals a small grid of the card's
// "actions" (scraped from learntarot.com, bundled in cardActions.js).
// The data is in memory at page load, so on long-press the overlay
// opens instantly. A skeleton-shimmer fallback exists if data somehow
// isn't present (e.g. cardActions.js failed to load) — graceful degrade.

let infoOverlayOpen = false;

function openInfoOverlay(imgEl) {
  const overlay = document.getElementById("info-overlay");
  if (!overlay) return;

  // Cancel any Major Arcana signature in flight — the .muted filter
  // we're about to apply would otherwise fight whatever filter the
  // effect is animating.
  if (window.MajorArcanaSignature) window.MajorArcanaSignature.cancel();

  infoOverlayOpen = true;

  // Mute the card behind the overlay so it recedes without disappearing.
  imgEl.classList.add("muted");

  // Look up the card's actions. If the card has resolved to a reversed
  // state, prefer the reversed-meaning data (4 stanzas: Weakened /
  // Inverted / Negative / Delayed, holistic takes from those angles on
  // the card's classic meaning). Falls back to upright data if the
  // reversed file failed to load. Skeleton placeholder if neither.
  // Pull from the ACTIVE deck's data (RW or Thoth), upright or reversed.
  const isReversed = imgEl.classList.contains("reversed");
  const reversedData = deckModel().reversed();
  const uprightData  = deckModel().upright();
  const dataSource = (isReversed && reversedData) ? reversedData : uprightData;
  const actions = (dataSource && currentCardName)
    ? dataSource[currentCardName]
    : null;

  renderInfoOverlay(overlay, actions);

  // Force the cell DOM to commit, then add .open on the next frame so the
  // staggered transitions actually animate (not just snap to final state).
  void overlay.offsetHeight;
  requestAnimationFrame(() => overlay.classList.add("open"));
}

// Measure the content and pick a density tier. The tiers cascade through
// CSS custom properties (--head-size, --sub-size, --stanza-gap, --columns,
// --measure) — so a sparse card breathes large and a dense card tightens
// to stay comfortably on one screen. Tuned empirically against the actual
// data: most cards have 3–4 actions × 4–6 subs ≈ ~16–24 subs total.
function pickDensity(actions) {
  if (!actions || actions.length === 0) return "normal";
  let subCount = 0;
  let charCount = 0;
  for (const a of actions) {
    if (a.lead) charCount += a.lead.length + 1;
    if (a.key)  charCount += a.key.length;
    if (Array.isArray(a.subs)) {
      subCount += a.subs.length;
      for (const s of a.subs) charCount += (s || "").length;
    }
  }
  // Thresholds: char-count matters more than sub-count because some
  // cards have few but very long subs (and vice versa).
  if (subCount <= 14 && charCount <=  380) return "sparse";
  if (subCount <= 22 && charCount <=  640) return "normal";
  if (subCount <= 32 && charCount <=  980) return "dense";
  return "overflow";
}

// Cards in the data fall into two regimes:
//  - Short verb phrases (most cards) — render as a single flowing line
//    of subs separated by hairline middots. Reads like a definition.
//  - Compound sentences (Knight / court cards) — long subs containing
//    an "upright .......... reversed" pair. These need block layout,
//    one sub per line, with the dotted separator replaced by an em-dash.
// Per-card decision based on max sub length.
function pickFlowMode(actions) {
  let maxLen = 0;
  for (const a of (actions || [])) {
    for (const s of (a.subs || [])) {
      if (s && s.length > maxLen) maxLen = s.length;
    }
  }
  return maxLen > 42 ? "list" : "flow";
}

// Build the inline content for one sub. The source data sometimes joins
// an upright/reversed pair with a run of periods ("..........") — we
// replace that with a typographic em-dash so it reads cleanly.
function buildSubContent(span, text) {
  const SEP = /\.{4,}/;
  if (!SEP.test(text)) {
    span.textContent = text;
    return;
  }
  const parts = text.split(SEP);
  parts.forEach((part, i) => {
    if (i > 0) {
      const sep = document.createElement("span");
      sep.className = "pair-sep";
      sep.setAttribute("aria-hidden", "true");
      sep.textContent = " — ";
      span.appendChild(sep);
    }
    span.appendChild(document.createTextNode(part.trim()));
  });
}

function renderInfoOverlay(overlay, actions) {
  // Clear and rebuild. Building from scratch each open keeps the
  // staggered-fade animation predictable (no leftover transition states).
  overlay.innerHTML = "";

  // Reset density classes from a prior open.
  overlay.classList.remove(
    "density-sparse", "density-normal", "density-dense", "density-overflow",
    "animating"
  );

  // The animating flag opts every sub into the per-word fade-in. Always
  // on for the live design; CSS handles prefers-reduced-motion.
  overlay.classList.add("animating");

  if (!actions || actions.length === 0) {
    overlay.classList.add("density-normal");
    const stage = document.createElement("div");
    stage.className = "info-stage";
    // Three quiet shimmer stanzas as a degrade path.
    for (let i = 0; i < 3; i++) {
      const stanza = document.createElement("div");
      stanza.className = "info-stanza pending";
      stanza.innerHTML =
        '<div class="info-head">&nbsp;</div>' +
        '<p class="info-flow">&nbsp;</p>';
      stage.appendChild(stanza);
    }
    overlay.appendChild(stage);
    return;
  }

  overlay.classList.add("density-" + pickDensity(actions));
  const mode = pickFlowMode(actions); // "flow" | "list"

  // Reveal cadence — tuned for a contemplative beat. After the flash
  // commits, the card mutes (700ms) while the scrim arrives (520ms);
  // then a brief silence, then stanzas settle in one by one, and the
  // subs of each stanza follow a beat behind their headline.
  const INITIAL_DELAY     = 360;  // ms before the first stanza begins
  const STANZA_STEP       = 220;  // ms between successive stanzas
  const HEAD_HOLD         = 220;  // ms each headline gets before its subs start
  const SUB_STEP          =  55;  // ms between subs within a stanza
  const SUB_STEP_CAP      =  10;  // dense stanzas: cap the per-sub cascade so it
                                  // doesn't crawl. Subs beyond this index share
                                  // the final delay.

  const stage = document.createElement("div");
  stage.className = "info-stage";

  actions.forEach((action, stanzaIdx) => {
    const stanza = document.createElement("div");
    stanza.className = "info-stanza";
    const stanzaDelay = INITIAL_DELAY + stanzaIdx * STANZA_STEP;
    stanza.style.transitionDelay = stanzaDelay + "ms";

    // Headline: lead + key as one italic phrase. The key carries a hair
    // of weight to anchor the eye, but stays in the same color/style as
    // the lead — no two-tone treatment. For court 12 cards the key
    // itself is an upright/reversed pair joined by "..........", which
    // we route through the same em-dash cleanup as the subs.
    const head = document.createElement("div");
    head.className = "info-head";
    if (action.lead) {
      const lead = document.createElement("span");
      lead.className = "lead";
      lead.textContent = action.lead + " ";
      head.appendChild(lead);
    }
    const key = document.createElement("span");
    key.className = "key";
    buildSubContent(key, action.key || "");
    head.appendChild(key);
    stanza.appendChild(head);

    // Sub-meanings: either a flowing line with middots (short subs) or
    // a block list (long compound subs). Each sub is its own span so
    // we can stagger per-sub fade-in without rebuilding the text.
    const flow = document.createElement("p");
    flow.className = "info-flow " + mode;
    const subs = Array.isArray(action.subs) ? action.subs : [];
    subs.forEach((sub, i) => {
      if (mode === "flow" && i > 0) {
        const dot = document.createElement("span");
        dot.className = "dot";
        dot.setAttribute("aria-hidden", "true");
        dot.textContent = "·";
        flow.appendChild(dot);
      }
      const span = document.createElement("span");
      span.className = "sub";
      buildSubContent(span, sub);
      // Sub delay = stanza arrival + a beat for the headline + per-sub
      // cascade. Cap the per-sub portion so a 26-sub stanza (pents12)
      // doesn't take 1.4s just to finish its own cascade.
      const subDelay = stanzaDelay + HEAD_HOLD + Math.min(i, SUB_STEP_CAP) * SUB_STEP;
      span.style.transitionDelay = subDelay + "ms";
      flow.appendChild(span);
    });
    stanza.appendChild(flow);

    stage.appendChild(stanza);
  });

  overlay.appendChild(stage);
}

function closeInfoOverlay() {
  if (!infoOverlayOpen) return;
  const overlay = document.getElementById("info-overlay");
  const imgEl = document.querySelector("img");
  if (overlay) overlay.classList.remove("open");
  if (imgEl) imgEl.classList.remove("muted");
  // Hold the suppress-clicks window briefly so the dismissing tap doesn't
  // also flip the card to back.
  suppressClicksUntil = performance.now() + POST_PRESS_SUPPRESS_MS;
  // Defer flag reset slightly so a new press doesn't start mid-fade.
  setTimeout(() => { infoOverlayOpen = false; }, 320);
}

// --- Reversal: independent roll + glitch sequence ---------------------
//
// Design constraints:
// 1. Cannot perturb the deck draw in any way. The deck pick happens
//    first; THIS function runs after the card is already chosen.
// 2. Uses the same entropy pipeline (NIST beacon + gesture + SHA-256)
//    but with a fresh cosmic-bytes fetch — different bytes go into the
//    hash, so the streams are independent.
// 3. Works at any threshold from 0% through 100% without bias.
//
// Implementation: pickRandomIndex(10000) is an unbiased uniform integer
// in [0, 10000). We compare against REVERSAL_PERCENT * 100, which gives
// us 0.01% granularity — enough for any threshold we'd realistically
// configure. The "100%" and "0%" cases short-circuit so we don't burn a
// beacon fetch when the answer is deterministic.
async function rollReversal(event) {
  if (REVERSAL_PERCENT <= 0)   return false;
  if (REVERSAL_PERCENT >= 100) return true;
  const roll = await pickRandomIndex(10000, event);
  return roll < Math.round(REVERSAL_PERCENT * 100);
}

// --- Glitch sequence --------------------------------------------------
// Roughly two seconds of visual breakdown, paced as bursts rather than
// a steady stream. The orientation transition (upright → reversed) is
// integral to the glitch itself rather than a separate post-glitch tween:
//
// - Each non-rotation effect frame independently flips a coin (weighted
//   by progress through the schedule) to decide whether to render the
//   reversed orientation this frame. So the start is mostly upright, the
//   middle is mixed, the end is mostly reversed — the orientation flicker
//   IS the chaos.
//
// - The rotflip effect (90/180/270/45° geometry breakdown) is
//   center-loaded: very rare at the start and end of the schedule, peaks
//   in the middle. This makes the rotational pivot feel like the heart
//   of the transition — the moment where geometry breaks down before
//   resolving to the new orientation.
//
// - The last two frames are forced-reversed so the sequence reliably
//   lands on a reversed view. The final cleanup snaps any remaining
//   overlay/filter state away while keeping the rotation, hands off to
//   the .reversed class, all with transitions suppressed. No smooth
//   tween at the end — the orientation change has already happened
//   inside the chaos.
//
// Schedule phases:
//   1. Sparse opening — one hit, breath, another hit.
//   2. Irregular middle — varied lengths with short pauses for
//      syncopation. rotflip peaks here.
//   3. Frenetic burst — short effects back-to-back, no pauses. Reversed
//      bias is now strong.
//   4. Final reversed-locked bursts — two more effects, forceReversed,
//      so the card definitively lands rotated.
//
// During the glitch the host img carries .glitching, which suppresses
// the smooth transform/filter transitions so per-frame jumps stay crisp.
// Schedule below totals ≈ 3545ms of scheduled steps + ~80ms post-hold,
// roughly 2× the prior duration. The doubling lives almost entirely in
// the lead-in: Phase 1 and Phase 2 are slowed and have additional
// breaths between effects, so the breakdown feels prolonged before
// committing to the rotation. Phase 3 and Phase 4 are unchanged in
// pacing — the resolution should still feel snappy.
//
// Progress at key boundaries (for tuning):
//   end of P1 → ~37%   (well below the reversal threshold, pure upright)
//   reversal threshold (50%) → midway through P2
//   end of P2 → ~83%   (reversal bias strong but still statistical)
//   end of P3 → ~94%   (final stretch, near-guaranteed reversed)
//   P4         → forced-reversed in any case
const GLITCH_SCHEDULE = [
  // Phase 1: slow sparse opening — single hits with long breaths.
  // First glitch is intentionally subtle — picked from FIRST_HIT_POOL
  // (shutter/chroma/shake-cam) so the hit could plausibly be "did I
  // imagine that?". A short haptic tick fires alongside it to give
  // the viewer's body a quiet confirmation channel.
  //
  // The first pause is extra-long (380 + 1800ms hesitation) and runs
  // a slow saturation/contrast crawl in the background, so the wait
  // isn't quite still — the universe is subtly draining color while
  // the viewer tries to convince themselves nothing happened.
  { t: "effect", ms: 240, firstHit: true },
  { t: "pause",  ms: 2180, crawl: true },
  { t: "effect", ms: 280 },
  { t: "pause",  ms: 220 },
  { t: "effect", ms: 200 },
  // Phase 2: irregular middle — varied lengths with syncopated pauses.
  // rotflip peaks in this zone, pulling geometry into the transition.
  { t: "effect", ms: 180 },
  { t: "effect", ms: 200 },
  { t: "pause",  ms: 240 },
  { t: "effect", ms: 220 },
  { t: "effect", ms: 160 },
  { t: "pause",  ms: 220 },
  { t: "effect", ms: 200 },
  { t: "effect", ms: 220 },
  // Phase 3: frenetic burst — short snappy frames, no pauses.
  { t: "effect", ms:  60 },
  { t: "effect", ms:  55 },
  { t: "effect", ms:  70 },
  { t: "effect", ms:  60 },
  { t: "effect", ms:  75 },
  { t: "effect", ms:  65 },
  // Phase 4: locked-reversed final bursts — guaranteed reversed landing.
  { t: "effect", ms:  90, forceReversed: true },
  { t: "effect", ms: 110, forceReversed: true },
];

function gRand(min, max) { return min + Math.random() * (max - min); }
function gPick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

// Track overlay elements created this frame so we can clear them next frame.
let glitchOverlays = [];
function clearGlitchOverlays() {
  for (const el of glitchOverlays) {
    if (el && el.parentNode) el.parentNode.removeChild(el);
  }
  glitchOverlays = [];
}
function makeGlitchOverlay(src) {
  const el = document.createElement("img");
  el.className = "glitch-overlay";
  el.src = src;
  document.body.appendChild(el);
  glitchOverlays.push(el);
  return el;
}
// Some effects (DEAD-SIGNAL, STATIC-SNOW, STROBE, CRT-ROLL, VOID-RIFT,
// VHS-TEAR seam) want a non-image full-viewport overlay element with a
// CSS background or solid fill rather than an image source.
function makeGlitchOverlayDiv() {
  const el = document.createElement("div");
  el.className = "glitch-overlay";
  document.body.appendChild(el);
  glitchOverlays.push(el);
  return el;
}

// Some effects (shutter, shake-cam) schedule sub-frame timeouts inside a
// single glitch frame — e.g. "blackout for 16ms, visible for 16ms" five
// times within a 70ms frame. If those timeouts fire AFTER the next frame
// starts, they'd clobber the next effect's inline state. Track them so
// we can cancel any pending ones at frame boundaries.
let glitchTimers = [];
function clearGlitchTimers() {
  for (const t of glitchTimers) clearTimeout(t);
  glitchTimers = [];
}
function gTimeout(fn, ms) {
  glitchTimers.push(setTimeout(fn, ms));
}

// STATIC-SNOW uses 4 pre-rendered noise tiles cycled at random per frame.
// Generating them lazily on the first reversal keeps the page-load cost
// at zero for users who never trigger a reversal. 128px tiles repeat
// across the viewport — small enough to be cheap, large enough that the
// pattern doesn't read as a regular grid. Drawing math, not an external
// image, so there's no CORS issue (unlike trying to canvas the card jpg).
let STATIC_NOISE_URLS = null;
function ensureNoise() {
  if (STATIC_NOISE_URLS) return;
  STATIC_NOISE_URLS = [];
  for (let n = 0; n < 4; n++) {
    const c = document.createElement("canvas");
    c.width = 128; c.height = 128;
    const ctx = c.getContext("2d");
    const img = ctx.createImageData(128, 128);
    for (let i = 0; i < img.data.length; i += 4) {
      const v = (Math.random() * 256) | 0;
      img.data[i] = v; img.data[i+1] = v; img.data[i+2] = v; img.data[i+3] = 255;
    }
    ctx.putImageData(img, 0, 0);
    STATIC_NOISE_URLS.push(c.toDataURL());
  }
}

// DEAD-SIGNAL uses the classic 8-bar SMPTE-ish color stripe as a base.
// 8px wide × 1px tall, stretched to fill the viewport — pure vertical
// bars without anti-aliasing, exactly the TV-test-pattern feel.
let COLOR_BAR_URL = null;
function ensureColorBars() {
  if (COLOR_BAR_URL) return;
  const c = document.createElement("canvas");
  c.width = 8; c.height = 1;
  const ctx = c.getContext("2d");
  const bars = ["#c0c0c0", "#c0c000", "#00c0c0", "#00c000",
                "#c000c0", "#c00000", "#0000c0", "#1a1a1a"];
  for (let i = 0; i < bars.length; i++) {
    ctx.fillStyle = bars[i];
    ctx.fillRect(i, 0, 1, 1);
  }
  COLOR_BAR_URL = c.toDataURL();
}

// Reset all inline styles we touch on the host img between frames.
function clearHostInline(imgEl) {
  imgEl.style.filter = "";
  imgEl.style.transform = "";
  imgEl.style.clipPath = "";
  imgEl.style.opacity = "";
  imgEl.style.visibility = "";
}

// The full pool of non-rotational glitch effects. rotflip is special-
// cased (center-loaded around progress=0.5) so it's not in this pool.
//
// Catalog (15 total with rotflip):
//   SHUTTER       - rapid blackout flicker
//   HBARS         - jittered horizontal bands of clipped image
//   RGBSPLIT      - red/cyan channel separation
//   CHROMA        - extreme hue/sat/contrast filter slam
//   ROTFLIP       - random rotation + per-axis flip (center-loaded)
//   HYPERWARP     - card flung to extreme x/y offsets, partly offscreen
//   PIXEL-CRUSH   - chunky 8-bit posterize via SVG filter
//   STATIC-SNOW   - white-noise tile overlay
//   DEAD-SIGNAL   - SMPTE color-bar test pattern + noise
//   VHS-TEAR      - top/bottom halves offset, bright seam
//   CRT-ROLL      - rolling bright horizontal scanband
//   PHANTOM       - 3-4 layered ghost copies, mixed blend modes
//   SHAKE-CAM     - rapid sub-frame translate jitter
//   STROBE        - solid color difference flash
const SIDE_EFFECTS = [
  "shutter", "hbars", "rgbsplit", "chroma",
  "hyperwarp", "pixelcrush", "staticsnow", "deadsignal", "vhstear",
  "crtroll", "phantom", "shakecam", "strobe"
];

// The first hit of the sequence is restricted to the genuinely subtle
// effects — the ones that flicker the card rather than transform or
// replace it. If the very first hit were HYPERWARP or DEAD-SIGNAL, the
// viewer would know unambiguously that something happened, killing the
// "did I imagine that?" ambiguity that the long pause is designed to
// exploit. Shutter / chroma / shake-cam all read as plausible eye
// twitches or screen artifacts.
const FIRST_HIT_POOL = ["shutter", "chroma", "shakecam"];

// Pick an effect for this frame, with rotflip center-loaded around
// progress=0.5 so the rotational chaos clusters in the middle of the
// sequence (where the upright→reversed transition is most ambiguous).
// firstHit overrides everything else with a narrow subtle pool.
// forceReversed excludes rotflip (its own random rotation would fight
// the "this frame shows reversed" invariant).
function pickGlitchEffect(progress, forceReversed, firstHit) {
  if (firstHit)     return gPick(FIRST_HIT_POOL);
  if (forceReversed) return gPick(SIDE_EFFECTS);
  const peak = 1 - Math.abs((progress - 0.5) * 2);
  const rotProb = 0.10 + 0.34 * Math.max(0, peak);
  if (Math.random() < rotProb) return "rotflip";
  return gPick(SIDE_EFFECTS);
}

// Render one glitch frame. `progress` is 0..1 through the schedule.
// `useReversed` (for non-rotflip effects) means the visible imagery
// should be drawn in the 180° orientation — that's how the upright→
// reversed transition unfolds, frame by frame, without a smooth tween.
function applyGlitchFrame(imgEl, src, progress, useReversed, firstHit) {
  clearGlitchOverlays();
  clearGlitchTimers();   // cancel pending sub-frame timeouts from prior frame
  clearHostInline(imgEl);
  // Make sure the saturation-crawl class from the long pause doesn't
  // still be running while an effect frame paints. Effects set their own
  // filter inline so the class would be overridden anyway, but clearing
  // it cleanly also stops the animation timer.
  imgEl.classList.remove("crawling");

  const effect = pickGlitchEffect(progress, useReversed, firstHit);
  const rotSuffix = useReversed ? " rotate(180deg)" : "";

  if (effect === "shutter") {
    // 3 rapid blackouts inside the frame. Orientation, if reversed,
    // applies between blackouts so the brief flashes show the rotated
    // card briefly visible in upside-down form.
    if (useReversed) imgEl.style.transform = "rotate(180deg)";
    imgEl.style.visibility = "hidden";
    gTimeout(() => { imgEl.style.visibility = ""; },        14);
    gTimeout(() => { imgEl.style.visibility = "hidden"; },  30);
    gTimeout(() => { imgEl.style.visibility = ""; },        46);
    gTimeout(() => { imgEl.style.visibility = "hidden"; },  62);
    gTimeout(() => { imgEl.style.visibility = ""; },        80);
    return;
  }

  if (effect === "hbars") {
    // Jittered horizontal bars. When reversed, each band is also rotated
    // 180° around its own center — the arrangement reads as a fractured
    // upside-down card rather than a fractured upright one.
    imgEl.style.opacity = "0";
    const n = 6 + Math.floor(Math.random() * 5);
    for (let i = 0; i < n; i++) {
      const layer = makeGlitchOverlay(src);
      const top    = (i       * 100 / n).toFixed(2);
      const bottom = ((n - i - 1) * 100 / n).toFixed(2);
      const tx = (Math.random() - 0.5) * 80;     // ±40px lateral jitter
      layer.style.clipPath  = `inset(${top}% 0 ${bottom}% 0)`;
      layer.style.transform = `translateX(${tx.toFixed(1)}px)${rotSuffix}`;
      const r = Math.random();
      if (r < 0.4) layer.style.filter = "invert(1)";
      else if (r < 0.65) layer.style.filter = `hue-rotate(${Math.floor(gRand(40, 320))}deg) saturate(2.2)`;
      else if (r < 0.8)  layer.style.filter = "brightness(1.6) contrast(1.4)";
    }
    return;
  }

  if (effect === "rgbsplit") {
    // Chromatic-aberration breakdown. All three layers (base, red, cyan)
    // share the frame's orientation, so the split reads as a coherent
    // rotated image breaking into channels.
    imgEl.style.opacity = "0";
    const split = gRand(6, 22);
    const yJit  = gRand(-6, 6);
    const base = makeGlitchOverlay(src);
    base.style.opacity = "0.55";
    base.style.filter  = "brightness(0.8) contrast(1.1)";
    if (useReversed) base.style.transform = "rotate(180deg)";
    const red = makeGlitchOverlay(src);
    red.style.transform = `translate(${(-split).toFixed(1)}px, ${yJit.toFixed(1)}px)${rotSuffix}`;
    red.style.filter    = "hue-rotate(0deg) saturate(3) brightness(1.1)";
    red.style.mixBlendMode = "screen";
    const cyan = makeGlitchOverlay(src);
    cyan.style.transform = `translate(${split.toFixed(1)}px, ${(-yJit).toFixed(1)}px)${rotSuffix}`;
    cyan.style.filter    = "hue-rotate(180deg) saturate(3) brightness(1.1)";
    cyan.style.mixBlendMode = "screen";
    return;
  }

  if (effect === "chroma") {
    // Filter slam plus translate/scale shudder, on the host img directly.
    // Orientation is appended to the transform so the slam happens to a
    // rotated card when this frame is reversed.
    const hue = Math.floor(gRand(0, 360));
    const sat = gRand(2, 4).toFixed(2);
    const con = gRand(1.2, 2.2).toFixed(2);
    const bri = gRand(0.9, 1.6).toFixed(2);
    const tx  = gRand(-10, 10).toFixed(1);
    const ty  = gRand(-7, 7).toFixed(1);
    const sc  = gRand(0.97, 1.04).toFixed(3);
    const inv = Math.random() < 0.3 ? " invert(1)" : "";
    imgEl.style.filter    = `hue-rotate(${hue}deg) saturate(${sat}) contrast(${con}) brightness(${bri})${inv}`;
    imgEl.style.transform = `translate(${tx}px, ${ty}px) scale(${sc})${rotSuffix}`;
    return;
  }

  if (effect === "rotflip") {
    // Geometry breakdown — picks its own random rotation. Weight the
    // pool toward 180° as the schedule progresses, so this effect
    // actively pulls the orientation toward reversed during the
    // center-loaded zone where it's most likely to fire.
    const pool = [0, 45, -45, 90, -90, 270];
    const w180 = 1 + Math.round(progress * 6);
    const weighted = pool.slice();
    for (let k = 0; k < w180; k++) weighted.push(180);
    const rot = gPick(weighted);
    const sx  = Math.random() < 0.45 ? -1 : 1;
    const sy  = Math.random() < 0.3  ? -1 : 1;
    const tx  = gRand(-14, 14).toFixed(1);
    const ty  = gRand(-10, 10).toFixed(1);
    imgEl.style.transform = `translate(${tx}px, ${ty}px) rotate(${rot}deg) scale(${sx}, ${sy})`;
    imgEl.style.filter    = Math.random() < 0.5
      ? "invert(1) brightness(1.2) contrast(1.5)"
      : "brightness(1.4) contrast(1.6) saturate(1.6)";
    return;
  }

  if (effect === "hyperwarp") {
    // HYPERWARP: the card is yanked across the viewport — up to ±50vw and
    // ±45vh, so half the image is reliably offscreen. Adds a stark
    // brightness/invert filter for added "signal-flung-across-the-void"
    // energy. The remaining visible chunk reads as the card being
    // physically thrown by the glitch rather than just distorted.
    const tx = (Math.random() - 0.5) * window.innerWidth  * 1.0;
    const ty = (Math.random() - 0.5) * window.innerHeight * 0.9;
    const sc = gRand(0.5, 1.25).toFixed(3);
    imgEl.style.transform = `translate(${tx.toFixed(0)}px, ${ty.toFixed(0)}px) scale(${sc})${rotSuffix}`;
    imgEl.style.filter = Math.random() < 0.5
      ? "brightness(1.5) contrast(1.6)"
      : "invert(1) saturate(2.2) brightness(1.1)";
    return;
  }

  if (effect === "pixelcrush") {
    // PIXEL-CRUSH: SVG filter blurs slightly and quantizes each channel
    // to 5 levels, producing chunky color blobs that read as severe
    // 8-bit-era pixelation/banding. Note: SVG filters can't fully
    // replicate true nearest-neighbor pixelation without canvas (which
    // CORS blocks for the source jpgs) — this is the most "chunky retro"
    // we can get with pure CSS+SVG.
    imgEl.style.filter = "url(#glitch-pixelcrush)";
    const sc = gRand(0.95, 1.05).toFixed(3);
    imgEl.style.transform = `scale(${sc})${rotSuffix}`;
    imgEl.style.imageRendering = "pixelated";
    return;
  }

  if (effect === "staticsnow") {
    // STATIC-SNOW: white noise overlay tiled across the viewport, blended
    // SCREEN over a dimmed card so the original imagery is buried under
    // analog snow. Four pre-rendered noise tiles cycle randomly per
    // frame for animated grain. Pure static / off-air look.
    ensureNoise();
    imgEl.style.opacity = "0.35";
    if (useReversed) imgEl.style.transform = "rotate(180deg)";
    const noise = makeGlitchOverlayDiv();
    const url = STATIC_NOISE_URLS[(Math.random() * STATIC_NOISE_URLS.length) | 0];
    noise.style.backgroundImage = `url(${url})`;
    noise.style.backgroundRepeat = "repeat";
    const tile = 64 + ((Math.random() * 96) | 0);
    noise.style.backgroundSize = `${tile}px ${tile}px`;
    noise.style.mixBlendMode = "screen";
    noise.style.opacity = "0.92";
    return;
  }

  if (effect === "deadsignal") {
    // DEAD-SIGNAL: SMPTE-ish vertical color bars covering the entire
    // viewport, with a noise overlay above them for chunky retro
    // transmission feel. The card itself is fully hidden — the
    // "signal" has been lost and replaced by test-pattern static.
    ensureColorBars();
    ensureNoise();
    imgEl.style.opacity = "0";
    const bars = makeGlitchOverlayDiv();
    bars.style.backgroundImage = `url(${COLOR_BAR_URL})`;
    bars.style.backgroundSize = "100% 100%";
    bars.style.backgroundRepeat = "no-repeat";
    bars.style.imageRendering = "pixelated";
    bars.style.filter = "saturate(1.6) brightness(1.1) contrast(1.1)";
    const noise = makeGlitchOverlayDiv();
    const url = STATIC_NOISE_URLS[(Math.random() * STATIC_NOISE_URLS.length) | 0];
    noise.style.backgroundImage = `url(${url})`;
    noise.style.backgroundRepeat = "repeat";
    noise.style.backgroundSize = "96px 96px";
    noise.style.mixBlendMode = "overlay";
    noise.style.opacity = "0.55";
    return;
  }

  if (effect === "vhstear") {
    // VHS-TEAR: the card is split at its horizontal midline and the two
    // halves are offset by different amounts. A bright white seam runs
    // across the cut — the kind of artifact a damaged tape head produces
    // on an analog VHS replay.
    imgEl.style.opacity = "0";
    const top = makeGlitchOverlay(src);
    top.style.clipPath  = "inset(0 0 50% 0)";
    top.style.transform = `translateX(${((Math.random() - 0.5) * 140).toFixed(1)}px)${rotSuffix}`;
    const bot = makeGlitchOverlay(src);
    bot.style.clipPath  = "inset(50% 0 0 0)";
    bot.style.transform = `translateX(${((Math.random() - 0.5) * 140).toFixed(1)}px)${rotSuffix}`;
    const seam = makeGlitchOverlayDiv();
    seam.style.inset      = "auto 0 auto 0"; // overrides class' inset:0
    seam.style.top        = "calc(50% - 3px)";
    seam.style.height     = "6px";
    seam.style.background = "rgba(255,255,255,0.85)";
    seam.style.boxShadow  = "0 0 18px 4px rgba(255,255,255,0.6)";
    return;
  }

  if (effect === "crtroll") {
    // CRT-ROLL: a bright horizontal scanband sits at a random vertical
    // position, mimicking a CRT that's lost its vertical hold and is
    // rolling. The card is dimmed and slightly de-saturated beneath so
    // the scanband reads as the dominant element. One band per frame —
    // chunky, not subtle.
    imgEl.style.opacity = "0.6";
    if (useReversed) imgEl.style.transform = "rotate(180deg)";
    imgEl.style.filter = "contrast(1.4) brightness(0.85) saturate(0.7)";
    const band = makeGlitchOverlayDiv();
    band.style.inset = "auto 0 auto 0";
    band.style.top   = `${(Math.random() * 88).toFixed(1)}%`;
    band.style.height = `${(6 + Math.random() * 10).toFixed(1)}%`;
    band.style.background =
      "linear-gradient(to bottom, rgba(255,255,255,0) 0%, " +
      "rgba(255,255,255,0.7) 40%, rgba(255,255,255,0.85) 50%, " +
      "rgba(255,255,255,0.7) 60%, rgba(255,255,255,0) 100%)";
    band.style.mixBlendMode = "screen";
    return;
  }

  if (effect === "phantom") {
    // PHANTOM: 3-4 ghost copies of the card stacked with different
    // offsets, slight rotations, and hue-shifts. Lighten/screen blend
    // modes let them sum to a blown-out apparition of the card. The
    // base img is dimmed underneath so it reads as the haunted source
    // for the ghosts rather than a separate layer.
    imgEl.style.opacity = "0.32";
    if (useReversed) imgEl.style.transform = "rotate(180deg)";
    const count = 3 + ((Math.random() * 2) | 0);
    for (let i = 0; i < count; i++) {
      const layer = makeGlitchOverlay(src);
      const tx = (Math.random() - 0.5) * 70;
      const ty = (Math.random() - 0.5) * 50;
      const r  = (Math.random() - 0.5) * 16;
      layer.style.transform = `translate(${tx.toFixed(1)}px, ${ty.toFixed(1)}px) rotate(${r.toFixed(1)}deg)${rotSuffix}`;
      layer.style.opacity = (0.40 + Math.random() * 0.25).toFixed(2);
      layer.style.mixBlendMode = (i % 2) ? "screen" : "lighten";
      layer.style.filter = `hue-rotate(${((Math.random() * 360) | 0)}deg) saturate(1.6)`;
    }
    return;
  }

  if (effect === "shakecam") {
    // SHAKE-CAM: rapid translate jitter within this single frame. 5
    // re-jitters via gTimeout — short of vibration, but the eye
    // registers it as a frame of physical violence. Filter adds the
    // hard contrast pop that comes with a shaken-cam moment.
    const baseRot = useReversed ? " rotate(180deg)" : "";
    const jitter = () => {
      const tx = (Math.random() - 0.5) * 24;
      const ty = (Math.random() - 0.5) * 20;
      imgEl.style.transform = `translate(${tx.toFixed(1)}px, ${ty.toFixed(1)}px)${baseRot}`;
    };
    jitter();
    gTimeout(jitter, 14);
    gTimeout(jitter, 28);
    gTimeout(jitter, 42);
    gTimeout(jitter, 56);
    imgEl.style.filter = "contrast(1.55) brightness(1.18) saturate(1.2)";
    return;
  }

  if (effect === "strobe") {
    // STROBE: a single solid-color rectangle covers the entire viewport
    // in DIFFERENCE blend mode, inverting every pixel underneath toward
    // its complement of the chosen color. Lands as a hard frame-flash in
    // a startling color. Drawn from a pure primary/secondary palette so
    // it reads as old-display-strobing rather than a tasteful tint.
    const palette = ["#ff0033", "#33ff00", "#0033ff", "#ffffff",
                     "#ffff00", "#ff00ff", "#00ffff"];
    if (useReversed) imgEl.style.transform = "rotate(180deg)";
    const flash = makeGlitchOverlayDiv();
    flash.style.background = palette[(Math.random() * palette.length) | 0];
    flash.style.mixBlendMode = "difference";
    flash.style.opacity = "0.92";
    return;
  }

}

async function playGlitchSequence(imgEl) {
  const src = imgEl.src;
  imgEl.classList.add("glitching"); // suppresses smooth transitions

  const totalMs = GLITCH_SCHEDULE.reduce((s, e) => s + e.ms, 0);
  let elapsed = 0;
  // Tracks orientation of the previous effect frame so pauses can hold
  // the same orientation (rather than blinking back to upright between
  // bursts). rotflip frames don't update this — they introduce their
  // own random rotation that isn't a clean upright/reversed state.
  let lastReversed = false;

  for (const step of GLITCH_SCHEDULE) {
    const progress = totalMs > 0 ? elapsed / totalMs : 0;

    if (step.t === "effect") {
      // Reversal probability: exactly 0 before progress=0.5, then linear
      // ramp to ~0.9 by progress=1.0. So the first half is pure upright
      // glitch chaos, reversals appear statistically in the second half,
      // and even the very last unforced frame is only ~90% likely to be
      // reversed — the forceReversed flag on the final two scheduled
      // entries is what guarantees the rotated landing.
      const halfwayBias = Math.max(0, (progress - 0.5) * 1.8);
      const useReversed = step.forceReversed || (Math.random() < halfwayBias);
      applyGlitchFrame(imgEl, src, progress, useReversed, !!step.firstHit);
      // Quiet haptic tick exactly when the first visual hit lands — a
      // body-level confirmation. No further haptic until the resolution
      // at the very end of the sequence, so this tick (and the silence
      // that follows it) is what amplifies the "did something happen?"
      // sensation during the long pause.
      if (step.firstHit) haptic(4);
      lastReversed = useReversed;
    } else if (step.t === "pause") {
      // Brief moment of relative calm — clean image, no distortion. The
      // orientation matches whatever the last effect frame established,
      // so the orientation doesn't yo-yo between bursts.
      clearGlitchOverlays();
      clearHostInline(imgEl);
      if (lastReversed) imgEl.style.transform = "rotate(180deg)";
      // Optionally start the saturation crawl over this pause's duration.
      // CSS animation runs in parallel with the wait below; the next
      // effect frame's clearHostInline + class removal stops it cleanly.
      if (step.crawl) {
        imgEl.style.setProperty("--crawl-ms", step.ms + "ms");
        imgEl.classList.add("crawling");
      }
    }

    await new Promise(r => setTimeout(r, step.ms));
    elapsed += step.ms;
  }

  // Final cleanup: no smooth tween, no pre-settle hold. The last two
  // forceReversed frames have already established the reversed view —
  // we just clear residual filters/overlays/translates while keeping
  // the rotation. Because .glitching is still active, this is one
  // instant snap rather than an animated state change. Also cancel any
  // pending sub-frame timeouts (shutter/shake-cam) so they can't fire
  // after the sequence ends and clobber the .reversed state.
  clearGlitchOverlays();
  clearGlitchTimers();
  clearHostInline(imgEl);
  imgEl.classList.remove("crawling");
  imgEl.style.transform = "rotate(180deg)";

  haptic(8); // resolution tick — the card has landed

  // A short beat to let the eye register the clean reversed pose before
  // we hand state to the .reversed class. (Still inside .glitching, so
  // it's just a hold — no animation.)
  await new Promise(r => setTimeout(r, 80));

  // Hand off: remove .glitching first so future state changes (next
  // tap → setDownToBack) can tween normally. .reversed and the inline
  // transform agree (both rotate(180deg)), so removing inline after
  // adding the class is a no-op visually.
  imgEl.classList.remove("glitching");
  imgEl.classList.add("reversed");
  imgEl.style.transform = "";
}
