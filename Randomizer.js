// Minimum time the card stays dimmed, so very-fast fetches still feel like
// a beat of consideration rather than a snap.
const MIN_HOLD_MS = 260;

// Re-entrancy guard: ignore a click while a draw or reset is mid-flight.
let drawing = false;

// Whether the visible image is the card back (RoseLilyRed.jpg) or a face-up
// card. A tap on the back draws; a tap on a face-up card sets it down.
let showingBack = true;

const BACK_SRC = "RoseLilyRed.jpg";

// --- Reversal config --------------------------------------------------
// Percentage chance that any given draw resolves to a reversed card.
// TESTING: 100 = every card reverses, so the glitch sequence is exercised
// on every draw. Back this off to e.g. 5 (a sober 1-in-20) or 10 (one in
// ten) for real use. Float, accepts e.g. 0.1 for 1-in-1000.
//
// The reversal roll is INDEPENDENT of the deck pick — it uses its own
// fresh entropy call after the card has been chosen, so changing this
// value cannot perturb which card is drawn. Setting it to 0 disables the
// glitch path entirely (skipped before any roll happens).
const REVERSAL_PERCENT = 100;

// Time between the card landing face-up and the glitch starting. A beat
// of "...wait, something's wrong" before the visual breakdown.
const REVERSAL_DELAY_MS = 500;

// Glitch cadence is no longer a uniform frame loop — see GLITCH_SCHEDULE
// below for the irregular four-phase pacing.

// --- Deck state: draw-without-replacement -----------------------------
// `deck` is the set of card indices not yet drawn this shuffle. When it
// empties we reshuffle (auto-visualized as a settle), or the querent can
// reshuffle manually via long-press on the back.
const DECK_SIZE = 78;
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

  // 78 external card images from learntarot.com:
  const allCards = [
    "https://www.learntarot.com/bigjpgs/maj00.jpg",
    "https://www.learntarot.com/bigjpgs/maj01.jpg",
    "https://www.learntarot.com/bigjpgs/maj02.jpg",
    "https://www.learntarot.com/bigjpgs/maj03.jpg",
    "https://www.learntarot.com/bigjpgs/maj04.jpg",
    "https://www.learntarot.com/bigjpgs/maj05.jpg",
    "https://www.learntarot.com/bigjpgs/maj06.jpg",
    "https://www.learntarot.com/bigjpgs/maj07.jpg",
    "https://www.learntarot.com/bigjpgs/maj08.jpg",
    "https://www.learntarot.com/bigjpgs/maj09.jpg",
    "https://www.learntarot.com/bigjpgs/maj10.jpg",
    "https://www.learntarot.com/bigjpgs/maj11.jpg",
    "https://www.learntarot.com/bigjpgs/maj12.jpg",
    "https://www.learntarot.com/bigjpgs/maj13.jpg",
    "https://www.learntarot.com/bigjpgs/maj14.jpg",
    "https://www.learntarot.com/bigjpgs/maj15.jpg",
    "https://www.learntarot.com/bigjpgs/maj16.jpg",
    "https://www.learntarot.com/bigjpgs/maj17.jpg",
    "https://www.learntarot.com/bigjpgs/maj18.jpg",
    "https://www.learntarot.com/bigjpgs/maj19.jpg",
    "https://www.learntarot.com/bigjpgs/maj20.jpg",
    "https://www.learntarot.com/bigjpgs/maj21.jpg",
    "https://www.learntarot.com/bigjpgs/wands01.jpg",
    "https://www.learntarot.com/bigjpgs/wands02.jpg",
    "https://www.learntarot.com/bigjpgs/wands03.jpg",
    "https://www.learntarot.com/bigjpgs/wands04.jpg",
    "https://www.learntarot.com/bigjpgs/wands05.jpg",
    "https://www.learntarot.com/bigjpgs/wands06.jpg",
    "https://www.learntarot.com/bigjpgs/wands07.jpg",
    "https://www.learntarot.com/bigjpgs/wands08.jpg",
    "https://www.learntarot.com/bigjpgs/wands09.jpg",
    "https://www.learntarot.com/bigjpgs/wands10.jpg",
    "https://www.learntarot.com/bigjpgs/wands11.jpg",
    "https://www.learntarot.com/bigjpgs/wands12.jpg",
    "https://www.learntarot.com/bigjpgs/wands13.jpg",
    "https://www.learntarot.com/bigjpgs/wands14.jpg",
    "https://www.learntarot.com/bigjpgs/cups01.jpg",
    "https://www.learntarot.com/bigjpgs/cups02.jpg",
    "https://www.learntarot.com/bigjpgs/cups03.jpg",
    "https://www.learntarot.com/bigjpgs/cups04.jpg",
    "https://www.learntarot.com/bigjpgs/cups05.jpg",
    "https://www.learntarot.com/bigjpgs/cups06.jpg",
    "https://www.learntarot.com/bigjpgs/cups07.jpg",
    "https://www.learntarot.com/bigjpgs/cups08.jpg",
    "https://www.learntarot.com/bigjpgs/cups09.jpg",
    "https://www.learntarot.com/bigjpgs/cups10.jpg",
    "https://www.learntarot.com/bigjpgs/cups11.jpg",
    "https://www.learntarot.com/bigjpgs/cups12.jpg",
    "https://www.learntarot.com/bigjpgs/cups13.jpg",
    "https://www.learntarot.com/bigjpgs/cups14.jpg",
    "https://www.learntarot.com/bigjpgs/swords01.jpg",
    "https://www.learntarot.com/bigjpgs/swords02.jpg",
    "https://www.learntarot.com/bigjpgs/swords03.jpg",
    "https://www.learntarot.com/bigjpgs/swords04.jpg",
    "https://www.learntarot.com/bigjpgs/swords05.jpg",
    "https://www.learntarot.com/bigjpgs/swords06.jpg",
    "https://www.learntarot.com/bigjpgs/swords07.jpg",
    "https://www.learntarot.com/bigjpgs/swords08.jpg",
    "https://www.learntarot.com/bigjpgs/swords09.jpg",
    "https://www.learntarot.com/bigjpgs/swords10.jpg",
    "https://www.learntarot.com/bigjpgs/swords11.jpg",
    "https://www.learntarot.com/bigjpgs/swords12.jpg",
    "https://www.learntarot.com/bigjpgs/swords13.jpg",
    "https://www.learntarot.com/bigjpgs/swords14.jpg",
    "https://www.learntarot.com/bigjpgs/pents01.jpg",
    "https://www.learntarot.com/bigjpgs/pents02.jpg",
    "https://www.learntarot.com/bigjpgs/pents03.jpg",
    "https://www.learntarot.com/bigjpgs/pents04.jpg",
    "https://www.learntarot.com/bigjpgs/pents05.jpg",
    "https://www.learntarot.com/bigjpgs/pents06.jpg",
    "https://www.learntarot.com/bigjpgs/pents07.jpg",
    "https://www.learntarot.com/bigjpgs/pents08.jpg",
    "https://www.learntarot.com/bigjpgs/pents09.jpg",
    "https://www.learntarot.com/bigjpgs/pents10.jpg",
    "https://www.learntarot.com/bigjpgs/pents11.jpg",
    "https://www.learntarot.com/bigjpgs/pents12.jpg",
    "https://www.learntarot.com/bigjpgs/pents13.jpg",
    "https://www.learntarot.com/bigjpgs/pents14.jpg"
  ];

  const imgEl = document.querySelector("img");

  // Ignore a click while a draw or reset is mid-flight.
  if (drawing) return;
  drawing = true;

  if (showingBack) {
    await drawCard(imgEl, event, allCards);
  } else {
    await setDownToBack(imgEl);
  }
}

// "Breath": dim + recede, fetch entropy, swap to the chosen card, fade up.
async function drawCard(imgEl, event, allCards) {
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
  const chosenUrl = allCards[cardIdx];

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
  // Stash the filename key so the info overlay can look it up on long-press.
  currentCardName = cardNameFromUrl(chosenUrl);
  requestAnimationFrame(() => {
    imgEl.classList.remove("dimmed");
    haptic(10); // a contemplative beat — the card has arrived
    showingBack = false;

    if (!reversal) {
      // Normal upright draw — release the input gate after the reveal.
      setTimeout(() => { drawing = false; }, 260);
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

// Extract the filename key (e.g. "maj19", "swords10") from a card URL,
// matching the keys in CARD_ACTIONS.
function cardNameFromUrl(url) {
  const m = url.match(/\/([a-z]+\d+)\.jpg$/i);
  return m ? m[1].toLowerCase() : null;
}

// "Set down": face-up card drifts down + fades out, then is replaced by
// the back, which fades in crisply. Qualitatively different from the draw
// (vertical, not depth; firmer easing; no scale).
async function setDownToBack(imgEl) {
  // Make sure the back is in cache before we start the motion, so the
  // swap is instant and the fade-in is smooth.
  await preloadImage(BACK_SRC);

  imgEl.classList.add("resetting");
  await new Promise((r) => setTimeout(r, 300));

  // Now invisible — swap to the back without a visible flash.
  imgEl.src = BACK_SRC;
  // The back is always upright; clear any reversal carryover from the
  // face-up state at the same time so the back fades in unrotated.
  imgEl.classList.remove("reversed");

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

function pressStart() {
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

function wireLongPress() {
  const imgEl = document.querySelector("img");
  if (!imgEl) return;

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

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", wireLongPress);
} else {
  wireLongPress();
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

  infoOverlayOpen = true;

  // Mute the card behind the overlay so it recedes without disappearing.
  imgEl.classList.add("muted");

  // Look up the card's actions. With cardActions.js loaded this is always
  // an array; if missing we render a placeholder skeleton.
  const actions = (typeof CARD_ACTIONS !== "undefined" && currentCardName)
    ? CARD_ACTIONS[currentCardName]
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
// a steady stream. The schedule has four phases:
//   1. Sparse opening — one effect, a breath, another effect. Establishes
//      "something is wrong" without yet committing to chaos.
//   2. Irregular middle — effects of varying lengths interleaved with
//      shorter pauses, so the rhythm never settles into a beat.
//   3. Frenetic burst — quick effects back-to-back, no pauses.
//   4. Deliberate settle — overlays cleared, host image locked at 165°
//      with no other distortion, so the brain has a moment of "wait,
//      it's resolving" before the final 15° smooth tween to 180°. That
//      last tween is the only intentional, eased motion in the whole
//      sequence — distinct from the chaos because it IS deliberate.
//
// Each effect frame picks one of 5 effects at random and applies it
// with randomized parameters. The host <img> is mutated directly for
// single-layer effects (chroma, rotflip, shutter) and additional
// overlay clones are spawned per-frame for layered effects (hbars,
// rgbsplit). Overlays and inline styles are discarded between frames.
//
// During the glitch the host img carries .glitching, which suppresses
// the smooth transform/filter transitions so per-frame jumps stay crisp.
// Removing .glitching at the very end re-enables the transition for the
// final 15° tween to .reversed.

// Schedule entries: {t:"effect"|"pause"|"settle", ms}. Total ≈ 1685ms
// of scheduled steps + ~280ms final smooth tween = ~1965ms.
const GLITCH_SCHEDULE = [
  // Phase 1: sparse opening — one hit, breath, another hit.
  { t: "effect", ms: 110 },
  { t: "pause",  ms: 170 },
  { t: "effect", ms: 130 },
  // Phase 2: irregular middle — varied lengths, short pauses for syncopation.
  { t: "effect", ms:  80 },
  { t: "effect", ms:  90 },
  { t: "pause",  ms: 120 },
  { t: "effect", ms: 100 },
  { t: "effect", ms:  70 },
  { t: "pause",  ms:  90 },
  { t: "effect", ms:  90 },
  { t: "effect", ms: 100 },
  // Phase 3: frenetic burst — no pauses, short frames.
  { t: "effect", ms:  55 },
  { t: "effect", ms:  50 },
  { t: "effect", ms:  65 },
  { t: "effect", ms:  55 },
  { t: "effect", ms:  70 },
  { t: "effect", ms:  60 },
  // Phase 4: deliberate settle — lock at 165°, then the smooth tween.
  { t: "settle", ms: 180 },
];

// Where the deliberate settle lands. The remaining 15° is tweened smoothly
// by the standard transition after .glitching is removed.
const PRE_SETTLE_DEG = 165;
const FINAL_DEG = 180;

const GLITCH_EFFECTS = ["shutter", "hbars", "rgbsplit", "chroma", "rotflip"];

function gRand(min, max) { return min + Math.random() * (max - min); }
function gPick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

// Track overlay <img>s created this frame so we can clear them next frame.
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

// Reset all inline styles we touch on the host img between frames.
function clearHostInline(imgEl) {
  imgEl.style.filter = "";
  imgEl.style.transform = "";
  imgEl.style.clipPath = "";
  imgEl.style.opacity = "";
  imgEl.style.visibility = "";
}

function applyGlitchFrame(imgEl, src) {
  clearGlitchOverlays();
  clearHostInline(imgEl);

  const effect = gPick(GLITCH_EFFECTS);

  if (effect === "shutter") {
    // 3 rapid blackouts inside this 100ms frame — visibility toggles so the
    // image truly vanishes rather than just dimming. The asymmetric timing
    // keeps it feeling broken, not metronomic.
    imgEl.style.visibility = "hidden";
    setTimeout(() => { imgEl.style.visibility = ""; },        14);
    setTimeout(() => { imgEl.style.visibility = "hidden"; },  30);
    setTimeout(() => { imgEl.style.visibility = ""; },        46);
    setTimeout(() => { imgEl.style.visibility = "hidden"; },  62);
    setTimeout(() => { imgEl.style.visibility = ""; },        80);
    return;
  }

  if (effect === "hbars") {
    // Jittered horizontal bars: 6–10 clip-path slices of the same image,
    // each translated horizontally by a random amount and sometimes
    // inverted or hue-shifted. The host img itself goes invisible so the
    // overlays read as the "real" image breaking apart.
    imgEl.style.opacity = "0";
    const n = 6 + Math.floor(Math.random() * 5);
    for (let i = 0; i < n; i++) {
      const layer = makeGlitchOverlay(src);
      const top    = (i       * 100 / n).toFixed(2);
      const bottom = ((n - i - 1) * 100 / n).toFixed(2);
      const tx = (Math.random() - 0.5) * 80;     // ±40px lateral jitter
      layer.style.clipPath  = `inset(${top}% 0 ${bottom}% 0)`;
      layer.style.transform = `translateX(${tx.toFixed(1)}px)`;
      const r = Math.random();
      if (r < 0.4) layer.style.filter = "invert(1)";
      else if (r < 0.65) layer.style.filter = `hue-rotate(${Math.floor(gRand(40, 320))}deg) saturate(2.2)`;
      else if (r < 0.8)  layer.style.filter = "brightness(1.6) contrast(1.4)";
    }
    return;
  }

  if (effect === "rgbsplit") {
    // Chromatic-aberration breakdown: red-saturated copy left, cyan-saturated
    // copy right, dimmed base under. mix-blend-mode: screen lets the colored
    // ghosts add up to near-full-color where they overlap, so the split
    // reads as a real channel separation rather than two tinted overlays.
    imgEl.style.opacity = "0";
    const split = gRand(6, 22);
    const yJit  = gRand(-6, 6);
    const base = makeGlitchOverlay(src);
    base.style.opacity = "0.55";
    base.style.filter  = "brightness(0.8) contrast(1.1)";
    const red = makeGlitchOverlay(src);
    red.style.transform = `translate(${(-split).toFixed(1)}px, ${yJit.toFixed(1)}px)`;
    red.style.filter    = "hue-rotate(0deg) saturate(3) brightness(1.1)";
    red.style.mixBlendMode = "screen";
    const cyan = makeGlitchOverlay(src);
    cyan.style.transform = `translate(${split.toFixed(1)}px, ${(-yJit).toFixed(1)}px)`;
    cyan.style.filter    = "hue-rotate(180deg) saturate(3) brightness(1.1)";
    cyan.style.mixBlendMode = "screen";
    return;
  }

  if (effect === "chroma") {
    // Filter slam on the host img — extreme hue/sat/contrast plus a small
    // translate/scale shudder. The whole card stays in one piece; the
    // damage is "to the signal" rather than "to the geometry".
    const hue = Math.floor(gRand(0, 360));
    const sat = gRand(2, 4).toFixed(2);
    const con = gRand(1.2, 2.2).toFixed(2);
    const bri = gRand(0.9, 1.6).toFixed(2);
    const tx  = gRand(-10, 10).toFixed(1);
    const ty  = gRand(-7, 7).toFixed(1);
    const sc  = gRand(0.97, 1.04).toFixed(3);
    const inv = Math.random() < 0.3 ? " invert(1)" : "";
    imgEl.style.filter    = `hue-rotate(${hue}deg) saturate(${sat}) contrast(${con}) brightness(${bri})${inv}`;
    imgEl.style.transform = `translate(${tx}px, ${ty}px) scale(${sc})`;
    return;
  }

  if (effect === "rotflip") {
    // Geometry breakdown: pick a wild rotation, randomly flip on each
    // axis, jitter the position. Half the frames also push extreme
    // contrast through the filter so the flipped pose reads as a strobe.
    const rot = gPick([0, 45, -45, 90, -90, 180, 270]);
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
}

async function playGlitchSequence(imgEl) {
  const src = imgEl.src;
  imgEl.classList.add("glitching"); // suppresses smooth transitions

  haptic(6); // opening tick — the breakdown begins

  for (const step of GLITCH_SCHEDULE) {
    if (step.t === "effect") {
      applyGlitchFrame(imgEl, src);
    } else if (step.t === "pause") {
      // Brief moment of relative calm — clean image, no distortion. Makes
      // the next burst feel like a burst, not a continuation.
      clearGlitchOverlays();
      clearHostInline(imgEl);
    } else if (step.t === "settle") {
      // Deliberate pre-rotation: chaos resolves, the card holds at 165°.
      // The eye registers "ok, this is where it's landing" before the
      // smooth final tween.
      clearGlitchOverlays();
      imgEl.style.filter = "";
      imgEl.style.clipPath = "";
      imgEl.style.opacity = "";
      imgEl.style.visibility = "";
      imgEl.style.transform = "rotate(" + PRE_SETTLE_DEG + "deg)";
    }
    await new Promise(r => setTimeout(r, step.ms));
  }

  // Final 15° smooth tween. Removing .glitching re-enables the
  // transform transition (240ms ease-out from the base img rule), then
  // setting inline transform to rotate(180deg) animates from 165 → 180.
  // This is the ONLY eased motion in the whole sequence — by being the
  // only deliberate thing in a stream of chaos, it reads as deliberate.
  imgEl.classList.remove("glitching");
  void imgEl.offsetHeight;
  imgEl.style.transform = "rotate(" + FINAL_DEG + "deg)";
  haptic(8); // resolution tick — the card has settled

  // Wait out the tween, then hand state to the .reversed class so that
  // future state classes (.dimmed, .resetting) can compose with their
  // combo rules — they can't override an inline transform.
  await new Promise(r => setTimeout(r, 260));
  imgEl.classList.add("reversed");
  imgEl.style.transform = ""; // class takes over (rotate(180deg))
}
