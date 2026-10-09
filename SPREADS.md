# Building a spread app on this engine

Notes for a *separate* app that lays out several cards at once, reusing this
one's decks, effects, and interaction feel. Written from the code as it
stands, not from memory. Companion to `NOTES.md`, which records the
platform traps; this file records the architecture.

---

## 1. What the existing app actually is

One card, one screen, no chrome. The entire interface is a single
full-viewport `<img>` on black. There is no header, no button, no text
label, no visible affordance of any kind. Everything is either a tap, a
hold, or a multi-finger gesture on that one image.

The verb set:

| Input | Result |
|---|---|
| tap the back | draw a card (dim → fetch entropy → swap → fade up) |
| tap a face-up card | set it down, back to the deck back |
| hold ~0.6 s | charge pulse (advertises that something bigger is coming) |
| hold ~2.2 s | commit: reshuffle |
| hold, then release on a face-up card | open the meanings overlay |
| two-finger pinch/spread (Thoth only, lower ¾ of screen) | step the zoom crop |
| two-finger zigzag-down starting in the **top quarter** | toggle RW ↔ Thoth |
| two-finger circle (stir) anywhere | summon / dismiss Marseille |
| three fingers up | share the card image |
| three fingers down | share card + meanings (torn-paper composite) |
| right-click (desktop only) | cycle deck |
| right-click held ≥ 500 ms (desktop) | share |
| ←/→, D, 1/2/3 (desktop) | switch decks |

Three decks — Rider-Waite, Thoth, Tarot de Marseille (Besançon variant) —
78 cards each, all self-hosted. One-in-78 draws resolve **reversed**, which
triggers a ~3.6 s glitch breakdown rather than a rotation tween. Each of the
22 Major Arcana has its own bespoke animation that plays 1200 ms after it
lands. The card index comes from the NIST randomness beacon mixed with the
timing and position of the querent's touch.

That is the whole app. Its character comes from restraint: nothing on
screen but the card, and every behaviour discovered rather than labelled.

---

## 2. Shape of the code

No build step, no bundler, no framework, no service worker. Seven `<script>`
tags in `index.html`, loaded in order, communicating through globals. It
deploys by `git push` to GitHub Pages and runs as an iOS home-screen PWA.

```
index.html                      shell, all CSS, PWA meta, ?v= cache-buster
cardActions.js                  RW upright meanings      (78 cards)
cardActionsReversed.js          RW reversed
cardActionsThoth.js/…Reversed   Thoth
cardActionsMarseille.js/…Rev    Marseille
majorArcanaSignatures.js        22 + 8 override animations; window.MajorArcanaSignature
Randomizer.js                   everything else (~3200 lines)
```

Load order matters: the data files must be parsed before `Randomizer.js`
runs, so the meanings overlay can open instantly on long-press with no
fetch. `majorArcanaSignatures.js` is the only real module — an IIFE with a
six-function public API. Everything else is one flat file.

For a spread app this flat structure will not hold — but the *load-order
determinism* and *no-build* property are worth keeping if you also want the
GitHub Pages + PWA deployment story. Ten cards on screen means ten times
the DOM and ten times the animation concurrency; that's the pressure that
forces modules, not a preference for them.

---

## 3. What ports unchanged

**The card key scheme.** 78 canonical keys shared by every deck:

```js
maj00 … maj21, wands01 … wands14, cups01 … cups14, swords01 … swords14, pents01 … pents14
```

Courts are 11–14 (Page/Knight/Queen/King → Princess/Prince/Queen/Knight in
Thoth → Valet/Cavalier/Reyne/Roy in Marseille). Because all three decks
share keys, every mechanic downstream — draw, reversal, signature dispatch,
meaning lookup — is deck-agnostic. **Keep this. It is the single best
decision in the codebase.**

**The deck registry.** `DECKS` in `Randomizer.js:31` is already the right
abstraction and is four lines per deck:

```js
rw: {
  back:     "RoseLilyRed.jpg",
  hasZoom:  false,
  cardSrc:  (key) => "rw/" + key + ".jpg",
  upright:  () => CARD_ACTIONS,
  reversed: () => CARD_ACTIONS_REVERSED,
}
```

Lift this file-for-file. `cardSrc(key, zoom)` is the only place image
locations are defined, which is what made self-hosting the RW art a
one-line change.

**The meaning data.** Six files, ~340 KB total, shape:

```js
CARD_ACTIONS["maj00"] = [
  { lead: "being", key: "spontaneous", subs: ["living in the moment", …] },
  …3-4 stanzas per card
]
```

`lead + key` is the headline; `subs` are the sub-meanings. Reversed data
uses four fixed stanza angles (Weakened / Inverted / Negative / Delayed).
Marseille's pips read by number-meets-suit because Marseille pips are
non-scenic. All 468 card-states are authored. Take them as-is.

**Display names.** `cardDisplayName(key, deckId)` handles the three naming
systems including Marseille's French, the VIII/XI Justice-Force swap, and
the Besançon substitutions (II = Junon, V = Jupiter — the Lequart deck
prints Roman deities, not the Papess and Pope).

**The entropy module.** `getCosmicBytes` → `encodeGesture` → SHA-256 →
`unbiasedIndex`. See §7 for the one change a spread forces.

**The CSS motion vocabulary.** The `deckSettle`, `chargePulse`, `dimmed`,
`resetting` keyframes and their easings (`cubic-bezier(0.2,0,0,1)` for
arrivals, `cubic-bezier(0.16,1,0.3,1)` for the deep contemplative reveals)
are the app's whole physical personality. Port the curves even if you
rewrite the rules.

---

## 4. What needs one refactor each

### The signature effects — better shape than you'd expect

`majorArcanaSignatures.js` is 2150 lines of hand-written animation: 22 RW
effects, 4 Thoth overrides (Adjustment / Lust / Art / Aeon), 4 Marseille
overrides (Justice ↔ Force traded, plus Junon's phyllotaxis peacock and
Jupiter's recursive-midpoint lightning bolt).

The good news: **they are already anchored to a measured rectangle, not to
the viewport.** `getContentRect(imgEl)` (line 46) computes where the picture
actually sits inside its letterboxed `<img>`, and 24 of the effects build
their geometry from that rect. Overlays are `position: fixed` with
coordinates taken from the rect, so an effect will land correctly on a card
anywhere on screen the moment you hand it a different element. Only three
places assume the full viewport: the Tower's white flash (`:983`) and the
Junon and Jupiter SVG canvases (`:1805`, `:1961`) — all three paint inside
the rect but stretch their canvas to `100vw/100vh`.

The bad news: **the module can only play one effect at a time.**
`activeOverlays`, `activeAnims`, `activeTimer` are module-level singletons,
and `play()` opens with `clearAll()`. A ten-card spread that reveals cards
in sequence will have each new Major cancel the previous one mid-flight.

The refactor is mechanical and contained:

1. Make the module a factory — `MajorArcanaSignature.forTarget(el)` returns
   an instance owning its own overlay/animation/timer arrays.
2. Give each instance its own `z-index` band so overlapping cards' effects
   stack in the tableau's paint order rather than fighting over `z-index: 40`.
3. Replace `document.querySelector('img')` (one use, in `clearAll`) with the
   instance's element.
4. Scale-aware sizing: every effect sizes strokes, blurs, and particles from
   `cr.width`. On a spread each card is a fraction of the size it is now, so
   effects will read as scaled-down versions of themselves — correct, but
   worth an explicit `minimum` clamp so hairlines don't vanish at 120 px wide.

Budget: a couple of hours, no redesign. This is the highest-value port in
the whole codebase — 30 bespoke animations for the cost of a plumbing pass.

### The zoom system

Thoth ships three crops per card (`artfill` fills the frame, `fullart` is
the letterboxed art, `big` is the whole bordered card). Pinch commits **one
step in the pinch direction**, not by magnitude — that's what made every
step reliable, including leaving the near-invisible 12% gap between artfill
and fullart. The transition is a crossfade through a decoded ghost `<img>`,
never a scale.

Only two of three states are remembered across draws (`thothZoomPref`:
fully in or fully out; landing on the middle crop collapses to artfill).

In a spread, pinch means *zoom the tableau*, not *zoom a card*. Keep the
three-crop asset tier — but drive it from a **focus mode** (§8) rather than
from the pinch.

### The meanings overlay

Data → density tier (`sparse`/`normal`/`dense`/`overflow` by sub-count and
char-count) → flow mode (`flow` = middots on one line for short verb
phrases; `list` = one per line for the compound court-card sentences) →
staggered per-stanza and per-sub reveal.

One trap carried over from `NOTES.md`: the overlay has `touch-action: none`
so iOS can't claim its touches for a native scroller (which would kill the
share gesture), and therefore it has **hand-rolled one-finger scrolling with
velocity inertia** (`overlayScrollStart/Move/End`, 0.94 decay). If you keep
multi-finger gestures over scrollable text, you inherit this requirement.

For spreads the overlay needs a new axis: position meaning × card meaning.
That's authored content you don't have (§11).

---

## 5. What has to be rebuilt

**The reversal glitch.** ~3.6 s across four phases — sparse opening with a
deliberately ambiguous first hit (`shutter`/`chroma`/`shakecam`, so the
viewer can talk themselves out of it), a 2.18 s pause running a slow
saturation crawl, an irregular middle where `rotflip` peaks, a frenetic
burst, then two forced-reversed frames so it lands upside-down. The
orientation flip is *statistical per frame*, not a tween — that's the whole
trick. 13 side effects (`hyperwarp`, `pixelcrush`, `vhstear`, `crtroll`,
`deadsignal`, `phantom`, …), all painting full-viewport overlay clones of
the card.

Full-viewport is the problem. On a spread this must either (a) confine
itself to one card's rect — losing the "the screen itself is breaking"
effect that makes it land, or (b) stay full-screen but fire only when a
single card is focused. **Recommendation: (b).** Reserve the glitch for
focus mode. A spread where one card in ten quietly detonates the whole
screen mid-deal is chaos, not atmosphere.

**The deck-switch warps.** Two of them: `playRealityWarp` (the zigzag's
Scooby-Doo dissolve) and `playWhirlpoolWarp` (the circle's vortex —
gravity-fed power curve in, exponential angular decay out, damped-spring
landing, exactly 720° of spin so clearing the transform is a no-op). Both
are full-viewport, single-element, and take `(imgEl, fromUrl, toUrl)`.

For a spread you want the tableau to turn over as one object, not ten
independent whirlpools. Rebuild as one warp on a container, with the cards
as children — the vortex maths transfers directly; the DOM target changes.

**The draw choreography.** `drawCard` is a linear async function: dim →
pick → roll reversal → preload → hold ≥ 260 ms → swap → fade up →
schedule signature. A spread needs a **dealer**: N positions, sequenced
reveals with an inter-card cadence, and a per-position state machine. This
is the single biggest piece of genuinely new code.

---

## 6. Asset facts you need before you design layout

Served weight and true pixel dimensions, measured:

| Deck | Dimensions | Aspect | Per card | Deck total |
|---|---|---|---|---|
| RW | 350 × 600 | 0.583 | ~96 KB | 7.5 MB |
| Thoth artfill | 465 × 805 | 0.578 | ~168 KB | |
| Thoth fullart | 522 × 805 | **0.648** | ~188 KB | 42 MB (3 crops) |
| Thoth big | 592 × 1024 | 0.578 | ~220 KB | |
| Marseille | 744 × 1456 | **0.511** | ~272 KB | 21 MB |
| RW / Thoth back | 825 × 1427 | 0.578 | | |
| Marseille back | 744 × 1456 | 0.511 | | |

**Three things bite here.**

1. **The aspects are not the same.** Marseille is markedly narrower (0.511)
   than RW and Thoth (~0.58). The current app never notices because one
   centred card just letterboxes into the viewport. A grid of ten slots
   will visibly reflow when you stir into Marseille unless you fix the slot
   aspect and letterbox each card inside it. Decide this on day one — the
   whirlpool warp already exploits it (the deck swaps at the bottom of the
   vortex at ~6% scale, so the new proportions unwind out of the spin).

2. **RW art is small.** 350 × 600 is fine full-screen on a phone and fine at
   spread scale, but it is the ceiling — do not design a focus mode that
   blows an RW card past ~2× without re-sourcing the art.

3. **Marseille is heavy for multi-card.** A ten-card Marseille spread is
   ~2.7 MB of images. Generate a `thumb/` tier (say 260 px wide, ~30 KB) for
   tableau display and load the full file only on focus. The build scripts
   to do it already exist and are the same pattern as `marseille/_crop.py`.

The pipelines are in-repo and re-runnable: `marseille/_fetch.py` (Wikimedia
Commons, rate-limited, compliant UA), `_crop.py` (border-detect + trim +
normalise), `_gen_back.py` (period-correct card back with real card edges),
`_gen_meanings.py`. Thoth has the equivalent under `thoth/`. Source
originals (`marseille/_src`, 200 MB; `thoth/_src`, 18 MB) are untracked.

---

## 7. Entropy: drawing N cards honestly

Current pipeline, per draw:

```
NIST beacon (512-bit pulse, two independent quantum RNGs, signed, 60 s cadence)
  ↓ fallback: random.org  ↓ fallback: crypto.getRandomValues
8 cosmic bytes ‖ gesture bytes (performance.now float64, event.timeStamp
                               float64, clientX, clientY) ‖ counter
  ↓ SHA-256
first uint32 → rejection-sampled to [0, deck.length) → splice from the deck
```

Then an **independent second fetch** for the reversal roll, so changing the
reversal rate cannot perturb which card was drawn. Draws are without
replacement until the deck empties, at which point it reshuffles with a
settle animation.

**The constraint you must respect:** the network calls are the point. This
is deliberate — the beacon is the "cosmic" half of the metaphor and both
round-trips stay in per draw, by explicit decision, even though it makes a
draw slower.

**The problem a spread creates:** ten cards × two fetches = twenty
round-trips. At ~200–400 ms each that's 4–8 seconds of dealing, and the
beacon only *changes* every 60 seconds anyway — so nineteen of those calls
return correlated material for no benefit.

**The fix that keeps the meaning intact:** fetch the beacon **once per
spread**, at the moment the querent commits to the deal. That single pulse
is the spread's cosmic seed. Then per position:

```
material = cosmicBytes ‖ gestureBytes(that position's touch) ‖ positionIndex ‖ counter
```

Every card still gets an independent uniform draw (SHA-256 over distinct
material), the querent's hand still enters each one, and the spread as a
whole is anchored to one moment of the universe — which is arguably a
*better* fit for a spread than ten unrelated moments. One fetch, one deal.

Keep `unbiasedIndex` and the without-replacement splice exactly as they are.

---

## 8. Gesture budget

What the single-card app already spent, and why the gestures don't collide:

- **Spatial separation.** The top quarter of the screen (`DECK_ZONE_FRAC =
  0.25`) is the deck zone: a two-finger zigzag starting there switches
  decks, and zoom is disabled up there. Everywhere below, pinch zooms and
  zigzag is ignored. Deterministic by where the gesture *begins* — no fuzzy
  motion classification.
- **Shape separation.** The circle is classified by summing signed turning
  of the two-finger midpoint (`≥ 280°`, bounding radius `≥ 26 px`, `≥ 12`
  samples). A zigzag's turns alternate and cancel toward zero; a pinch
  barely moves the midpoint; a straight drag accumulates no turning. The
  circle is tested *before* the zigzag because a sloppy multi-loop stir
  that drifts downward could satisfy both, and the circle is the more
  deliberate gesture.
- **Finger-count separation.** Three-finger handlers no-op unless exactly
  three touches are present, so they can never collide with one- or
  two-finger work.

**A spread invalidates the spatial half of that.** "Top quarter of the
screen" is meaningful when the screen *is* the card; it's arbitrary when the
screen is a tableau. And pinch has to mean pan/zoom the tableau, because
every user will try it.

**Recommended model: two modes.**

*Tableau mode* — the spread laid out.
- one-finger drag: pan
- pinch: zoom the tableau
- tap a card: focus it
- three fingers up/down: share the whole spread (image / image + reading)
- two-finger circle: still Marseille — it survives because it's shape-based
  and needs no zone
- deck switch: move the zigzag off the top-edge zone; a two-finger
  **horizontal** zigzag is free, or bind it to a long-press on the deck
  itself before the deal

*Focus mode* — one card, full screen. This is the existing app, verbatim.
Everything currently built works here unchanged: hold for meanings, pinch
for Thoth crops, the reversal glitch full-screen, per-card share, and the
signature animation at full size.

That split gets you the whole existing interaction vocabulary for free while
leaving tableau gestures uncontested — and it gives the glitch and the warps
a place where full-viewport is still correct.

**One rule to carry over verbatim:** every gesture terminator sets
`suppressClicksUntil = performance.now() + 500`, so the synthetic click from
finger-release never also draws a card. Time-based, not flag-based, because
some browsers fire `click` before `touchend` and some after.

---

## 9. State: the singletons that must become per-card

The current app has exactly one card, so its state is module-level. Every
one of these becomes per-position, and this list *is* your data model:

| Global | Becomes |
|---|---|
| `showingBack` | per-position face-up/face-down |
| `currentCardName` | per-position key |
| `drawing` | per-position (plus one deal-level lock) |
| `zoomMode`, `currentFullAspect` | per-position (only meaningful in focus) |
| `zoom`, `zoomBusy` | focus-mode only — stays singleton |
| `currentShareFile`, `fallbackShareFile`, `meaningShareFile`, `currentShareKey` | one set for the spread composite, plus per-card in focus |
| `glitchOverlays`, `glitchTimers` | per-effect instance |
| `MajorArcanaSignature`'s `activeOverlays/activeAnims/activeTimer` | per-instance (§4) |

These stay global and should: `currentDeck`, `deck` (the undrawn indices —
one shuffle serves the whole spread), `thothZoomPref`, `marseilleOrigin`,
`deckSwitching`, `suppressClicksUntil`, `infoOverlayOpen`, and all the
`tf*` / `threeFinger*` gesture accumulators.

There are **13** uses of `document.querySelector("img")` in `Randomizer.js`
and one in the signatures module. Each is a place that assumes the single
card. Making the element a parameter is the mechanical first step of the
whole port.

---

## 10. Meaning content

You have 468 authored card-states (78 × 3 decks × upright/reversed). You do
**not** have position meanings, and they don't exist anywhere in this repo.

A spread reading needs a second axis:

```
reading(position, card) = f(position semantics, card meaning, orientation)
```

Three ways to get there, cheapest first:

1. **Positional framing only.** Author ~10 position texts per spread
   ("What crosses you", "Beneath", "Outcome") and render them alongside the
   existing card meaning. No new per-card content. This is the honest
   minimum and reads well with the existing typography.
2. **Position-weighted stanza selection.** Each card already carries 3–4
   stanzas with distinct angles. Pick *which* stanza to lead with based on
   the position's nature (outcome positions favour the forward-looking
   stanza, obstacle positions the shadow one). Cheap, and feels authored.
3. **Full cross-product.** 78 × 10 positions × 3 decks. Don't.

Option 2 is the interesting one and needs only a small tag per stanza.

---

## 11. Share

The rule that governs everything: **`navigator.share()` needs the `File`
synchronously inside the event handler.** Any `await` before the call throws
away the transient user activation. So the app never builds on demand — it
keeps eagerly-built Files (`currentShareFile`, `meaningShareFile`,
`fallbackShareFile`), rebuilt by a MutationObserver on the `<img>` and, more
importantly, guaranteed by a 500 ms **heartbeat** that repairs the cache
whenever a face-up card has no matching file. That heartbeat is the fix for
a bug that survived three cleverer attempts; read `NOTES.md` before touching
any of it.

Two composites exist and both transfer:

- **Plain card** — fetch, and for reversed cards render the rotated view to
  canvas so the shared image matches the screen.
- **Torn paper** (`buildMeaningCompositeFile`) — the card with a
  procedurally torn right edge (fractal-noise displacement baked into a
  rasterised SVG data-URL, unique seed per share) and the meaning headlines
  spilling off through the tear onto transparent ground. Every line is
  drawn three times — wide soft dark glow, dark stroke, warm-white fill —
  so it reads on white, black, or a photo.

For a spread, the composite is the obvious hero artifact: the full tableau
with position labels, torn-paper treatment, transparent PNG. The canvas
code generalises directly; only the layout maths is new. Pre-build it on a
debounce after the deal settles and keep the heartbeat pattern — with ten
cards the build is slower, which makes the "never build inside the handler"
rule *more* important, not less.

---

## 12. Platform rules that carry over

All hard-won; all in `NOTES.md` with the debugging history:

- Transient activation for touch comes **only from `touchend`**, never
  `touchstart` and never `touchcancel`. If iOS hands your gesture to a
  native scroller it terminates with `touchcancel` and the share can never
  fire — hence `touch-action: none` on anything that hosts a multi-finger
  gesture, and hand-rolled scrolling where you need it.
- A `File` handed to `share()` is single-use on iOS. Rebuild after every
  share.
- **Never animate CSS filters per frame.** `feTurbulence`/
  `feDisplacementMap` render in software on iOS and re-rasterise the whole
  layer. The whirlpool was rewritten to a transform shear + opacity dip for
  exactly this reason, and it's the difference between 60 fps and
  single digits on a phone. Transform and opacity composite free; treat
  everything else as a budget decision. **This matters far more at ten
  cards than at one.**
- CSS `transform` on an SVG element overrides its `transform` attribute.
  Put placement on an outer `<g>`, animation on an inner one.
- Ending a transform animation: clear the inline transform *while
  transitions are still disabled*, force a reflow, *then* restore
  transition control. Doing both in one batch lets the base transition
  interpolate `rotate(720deg) → none` and whip the card backwards.
- No service worker, but `?v=<date>-<n>` on every script tag — bump on every
  deploy or installed PWAs run stale code. GitHub Pages lags a commit by
  40–80 s; check the build before debugging.
- `viewport-fit=cover` is deliberately **absent**. With it, `100dvh` becomes
  the full screen rather than the safe area, which grew the card and pushed
  it under the status bar. A spread app with its own layout container may
  well want cover — but know that this is a decision, not an oversight.

---

## 13. Suggested architecture

```
core/
  keys.js          CARD_KEYS, cardDisplayName          ← lift verbatim
  decks.js         DECKS registry                      ← lift verbatim
  entropy.js       beacon + hash + unbiasedIndex       ← lift, seed once per spread (§7)
  shuffle.js       without-replacement deck state      ← lift

card/
  Card.js          one instance per position: element, key, orientation,
                   face-up state, its own signature instance
  reveal.js        the dim → swap → fade choreography, per card
  signatures.js    factory refactor of majorArcanaSignatures (§4)

spread/
  layouts.js       position geometry (Celtic Cross, three-card, horseshoe)
  dealer.js        sequences N reveals with cadence — the genuinely new code
  tableau.js       pan/zoom container, focus transitions

focus/
  (the current single-card app, near-verbatim: glitch, zoom, meanings overlay)

share/
  composite.js     torn-paper renderer, generalised to N cards
  cache.js         eager File cache + heartbeat                ← lift verbatim
```

**Build order that de-risks it:** layouts and dealer against plain
`<img>` elements first (no effects, no entropy — just proving the
choreography reads). Then wire the real entropy. Then focus mode, which is
the existing app dropped in. Then the signature refactor. Then share last,
because it depends on final layout and is the fiddliest.

**The thing to protect:** the current app's whole character is that there is
nothing on screen but cards, and every capability is discovered. A spread
app will feel pressure to add position labels, a spread picker, a reset
button. Resist per-element chrome; put the affordances in gestures and
motion, exactly as here. The restraint *is* the product.
