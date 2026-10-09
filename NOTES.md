# Hard-won notes

Things that cost real debugging time. Read before touching the share
pipeline or anything touch-related on iOS.

---

## The share pipeline, in one paragraph

`navigator.share()` needs a `File` **synchronously**, inside the event
handler — any `await` before the call throws away the user activation it
requires. So the app can't build the image when you swipe; it keeps one
eagerly built ahead of time in `currentShareFile` (plus `meaningShareFile`
for the down-swipe composite and `fallbackShareFile` as a guaranteed
plain-card backstop). `refreshShareFile()` rebuilds them; the gesture only
ever hands over what is already sitting there.

---

## The bug that took four attempts: "first swipe after a draw does nothing"

**Symptom.** On a freshly drawn card, neither three-finger swipe did
anything. Long-press into the meanings and back out, and both worked.

**Why that workaround worked** — this was the whole clue, and it was
missed three times. `openInfoOverlay`/`closeInfoOverlay` toggle a `muted`
class on the `<img>`. The MutationObserver watches that element, so the
toggle simply caused *another* `refreshShareFile()`. The build was never
broken. **Only the trigger was.**

**The actual mechanism.** A draw fires two mutations in quick succession
(`src` changes, then `dimmed` drops), each restarting a 120 ms debounce.
`showingBack` clears in that frame — but `drawing` does not clear for
another 260 ms (or until the whole glitch finishes on a reversal). So the
debounced rebuild landed while `drawing` was still true, hit the guard,
**nulled the file and returned** — and no further mutation ever came.

**What did NOT fix it** (all three were reasonable, all three failed):

1. Correcting the observer phase.
2. Correcting the debounce timing.
3. Retrying on a timer once `drawing` clears.

Each repaired *when* the rebuild fires. The chain still had a way to miss
on the device, in a way not reproducible in any desktop browser.

**What fixed it.** Stop repairing the chain; guarantee the outcome. A
500 ms heartbeat (`shareHeartbeat`) notices a face-up card with no matching
share file and rebuilds it. The share no longer depends on
MutationObserver delivery, debounce timing, or `drawing` clearing on cue.

It exits in two comparisons when there is nothing to do, and never runs
while hidden, mid-draw, on the card back, or while a build is in flight.
Measured: 0 rebuilds in steady state, 0 on the back, 0 mid-draw.

**The rule worth keeping:** when a cache is only refreshed by events, a
single missed event strands it forever. If correctness depends on an event
chain you cannot observe on the failing device, add a cheap idempotent
check that repairs the state instead of adding a fourth fix to the chain.

**How to verify a fix like this properly:** disable the trigger chain
outright (stub `scheduleShareRefresh` to a no-op) and confirm the file
still appears. If it only works with the chain intact, the chain is still
load-bearing and the bug can come back.

---

## iOS / WebKit gotchas already paid for

- **Transient activation for touch comes only from `touchend`** — never
  `touchstart`. If iOS hands a gesture to a native scroller it ends with
  `touchcancel`, which grants nothing, so `share()` can never fire. This is
  why the meanings overlay needed `touch-action: none` (and hand-rolled
  one-finger scrolling) exactly like the card has.

- **Right-click DOES grant activation in Chrome/macOS.** Verified on the
  real browser: `userActivation.isActive` is true on the secondary button's
  mousedown, contextmenu, mouseup and auxclick. An earlier note here
  claimed Chrome/macOS had no `navigator.share` at all — that was measured
  in an embedded Chromium preview shell, not Chrome, and was wrong.

- **A `File` handed to `share()` is single-use on iOS**; rebuild after every
  share or the next one silently fails.

- **CSS `transform` on an SVG element overrides its `transform` attribute**
  (same property, CSS wins). Animating a group that carries `translate()`
  collapses it to the origin — put placement on an outer `<g>`, animation on
  an inner one.

- **Don't animate CSS filters per frame.** `feTurbulence`/
  `feDisplacementMap` render in software on iOS and re-rasterise the whole
  viewport every frame; even stepped `blur()` writes cost a full-layer
  re-render. Transform + opacity composite for free — everything else is a
  budget decision.

- **Ending a transform animation:** clear the inline transform *while
  transitions are still disabled*, force a reflow, then restore transition
  control. Clearing both in one batch lets the base 240 ms transition
  interpolate `rotate(720deg) → none` and whip the card backwards.

---

## Testing limits in this repo's preview pane

The pane frequently reports `document.hidden === true`, which:

- pauses `requestAnimationFrame` (so a real draw never completes, and
  animations can't be screenshotted mid-flight),
- clamps `setTimeout` to ~1 s (so timing measurements read far too slow),
- suppresses the share heartbeat (by design).

Force it with `Object.defineProperty(document, 'hidden', {get:()=>false})`
before trusting any timing or visibility-dependent result. Several
"regressions" during development were this, not the code.

---

## Deployment

GitHub Pages lags a commit by ~40–80 s. Twice, "the fix didn't work" was
simply the old build still being served. Check before debugging:

```bash
gh api repos/carbonsf/randomtarot/pages/builds/latest --jq '{status,commit}'
```

Every script tag carries `?v=<date>-<n>`; **bump it on every deploy** or
installed PWAs keep running stale code. An iOS home-screen app caches far
harder than Safari — delete and re-add it to be certain. One session was
spent chasing a bug on a device that turned out to be running a build from
months earlier (identified by a green debug HUD that had long since been
deleted from the source).

---

## The deck grid (deckGrid.js)

Hold the meanings (same 600 ms charge / 2.2 s commit as the card's own
long-press) to sink into a grid of all 78 cards; tap a card to lift it full
screen; hold the grid to rise back into the meanings. Escape does the same
on desktop.

It is deliberately **bolted on, not woven in**: one file plus `thumbs/`,
reading Randomizer.js's globals without changing any of them. To switch it
off, set `DECK_GRID_ENABLED = false` at the top of deckGrid.js, or delete its
`<script>` line in index.html. Re-run `_gen_thumbs.py` after re-sourcing any
deck art.

Two things it has to get right, both learned from the share bug above:

- **The release after a committed hold is not a tap.** The finger is still
  down when the screen changes underneath it, so its `click` would close the
  meanings (or open a card). A capture-phase click swallower covers the
  release, and only that release.
- **The grid moves with transforms only.** The water writes one transform
  per card per frame; the single filter is the flying card's mute/clear,
  the same one `img.muted` already transitions.

---

## Animation phases belong on the frame clock, not the wall clock

The deck-grid sweep (`deckGrid.js`) moves 78 cards through phases — struck,
sliding off, waiting, flying back. The first version read `performance.now()`
to decide when each phase began, while the motion integrated `dt`, which
`tick` clamps to 34 ms so the water stays stable.

Those are two different clocks, and they diverge the moment frames get
scarce. Below ~29 fps the clamp bites: wall time runs on while motion
advances in slow steps, so a card's fade "completes" before it has gone
anywhere. It vanishes in place instead of being swept off.

The fix is one accumulator. `g.sim` sums the frame steps actually taken, and
every phase boundary is read off that, so motion and timing cannot drift
apart. On a slow device the whole flourish plays in slow motion, which is
coherent; the alternative is cards teleporting, which is not.

What still needs the wall clock is the watchdog. Phases that advance only
with frames stop dead if the loop does — a backgrounded tab, a suspended
PWA — so a timer watches `g.sim` itself and, if it has stopped moving,
calls `finishSweep` to put the new deck on the table. Same discipline as the
share heartbeat: when the frame loop is load-bearing for correctness,
something off that loop has to guarantee the outcome.

Note for testing: the preview pane never fires `requestAnimationFrame` at
all (0 fps, even with `document.hidden` forced false). Shim it —
`window.requestAnimationFrame = (cb) => setTimeout(() => cb(performance.now()), 16)`
— *before* the grid opens, since its loop re-registers through whatever
`requestAnimationFrame` is at the time. Expect it to run several times
slower than real, and measure convergence rather than wall-clock durations.

### A safety net must never fire on a living animation

The first version of the sweep ended on a fixed timer: 1700 ms after the
last card was due to arrive, `finishSweep` put everything in its place. But
the arrival spring is soft — from ~760 px out it needs three or four
seconds to look at rest — so when the timer fired most cards were still
well short of home and got snapped there in one frame. The handful already
within the 24 px threshold drifted in normally. What that looks like is
about 80% of the deck locking rigidly while the rest settles, which is
exactly how it was reported.

Two mistakes, and the second is the general one.

A fixed duration was deciding when motion was finished, instead of the
motion deciding. The sweep now simply stops being a sweep: the extra spring
authority decays to nothing over ~700 ms, after which an arriving card is
by definition an ordinary floating card, and dropping its record changes
not one pixel. There is no end moment to get wrong.

And a mechanism built for a dead frame loop was running on a live one.
`finishSweep` exists only for the case where there is no spring left to
carry a card — a suspended PWA, a backgrounded tab. On a running loop it
can only do harm. It now has exactly two callers, both genuine
catastrophes, and the watchdog that detects a stalled loop requires sim
time to be frozen across two full checks before acting, because a phone
decoding 78 fresh thumbnails can lose a second of frames without being
dead at all — and intervening there would cause the very lock it exists to
prevent.

Worth generalising: a guarantee-the-outcome backstop needs a trigger that
fires *only* in the failure it was written for. A heartbeat that repairs a
missing file is safe to run always, because repairing an already-correct
state is a no-op. Forcing 78 cards into position is not a no-op, so that
one has to be sure.

### A hold threshold is a property of the input, not of the gesture

The grid's holds cancelled if the pointer moved more than 9 px. That
number exists to tell a hold from a *scroll*, which is a finger problem: a
held mouse button has nothing competing with it. But 2.2 s is a long time
for a hand resting on a mouse or trackpad to stay inside nine pixels, so
on a desktop the hold essentially never committed — measured, 6 px of
drift survived and 12 px did not. The slop is now chosen by
`e.pointerType`: 9 px for a finger, 48 px for a mouse.

Worth remembering whenever a threshold is tuned on one input and then
shared by another. The same applies to timing: the card opens its meanings
at ~600 ms, the grid commits at 2200 ms, and the longer a hold must be
held the more the input's own noise floor matters.

### Ease curves are not interchangeable between motion and light

`cubic-bezier(0.16, 1, 0.3, 1)` is the app's signature arrival curve and it
is right for things moving through space: it covers most of its distance
immediately and lands softly, which reads as momentum. Applied to
*brightness* it reads as a flash, because the eye has no expectation of
momentum in light — it just sees the change, and that curve puts about 60%
of it in the first quarter of the duration.

Opening the deck grid did exactly this. The card cleared from
`brightness(.18)` to `brightness(1)` — a 5.5x jump — on that curve, while
the scrim lifted on it too, both starting the instant the grid appeared and
140 ms *before* the card began to recede. Two stacked brightenings,
front-loaded, ahead of any motion.

The fix is not a longer duration, it is a different curve and a different
order. Light changes now ride a symmetric `cubic-bezier(0.45, 0, 0.35, 1)`
and start *with* the movement, so the card comes into ordinary light on its
way home rather than before it sets off. Measured: at the halfway point of
the journey the card has shrunk to 41% but is only at brightness .24, and
reaches full brightness as it lands. Motion keeps DEEP; only light changed.

There is also a held beat (260 ms) before anything moves. The handover from
the reading used to begin the moment the words had gone, leaving nothing to
register the card by.

And the grid's first frame is meant to be the reading screen minus its
words, which only holds if its copy of the card can paint immediately — so
the card is decoded (capped, since it is already on screen) before the
handover, or the seam becomes a black blink.
