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
