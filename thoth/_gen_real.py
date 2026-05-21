#!/usr/bin/env python3
"""
Generate REAL Thoth meaning text for cardActionsThoth.js (upright) and
cardActionsThothReversed.js (reversed), replacing the lorem stubs.

Content is hand-authored per card from the Thoth/Crowley consensus
(Book of Thoth titles + standard Thoth interpretations), with Jungian
angles folded into the sub-bullets. Structure exactly matches the RW
data so the info overlay renders identically:

  Upright : 3-4 stanzas, each {lead, key, subs[]}; headline reads
            "lead key" (lead may be ""). Subs <=42 chars => "flow" mode.
  Reversed: 4 stanzas Weakened / Inverted / Negative / Delayed, each
            with 4 subs; "key" names what's affected in this card.

Court paradigm follows the Thoth elemental ranks (not RW):
  11 Princess (Earth of element), 12 Prince (Air), 13 Queen (Water),
  14 Knight (Fire).
"""
import os

KEYS = (
    [f"maj{i:02d}" for i in range(22)] +
    [f"{suit}{i:02d}" for suit in ("wands", "cups", "swords", "pents") for i in range(1, 15)]
)


def emit(varname, data, header):
    lines = [header, f"const {varname} = {{"]
    for ki, key in enumerate(KEYS):
        stanzas = data[key]
        lines.append(f'  "{key}": [')
        for si, (lead, k2, subs) in enumerate(stanzas):
            subs_js = ", ".join(f'"{s}"' for s in subs)
            comma = "," if si < len(stanzas) - 1 else ""
            lines.append(f'    {{"lead": "{lead}", "key": "{k2}", "subs": [{subs_js}]}}{comma}')
        close = "]" if ki == len(KEYS) - 1 else "],"
        lines.append(f'  {close}')
    lines.append("};")
    lines.append("")
    return "\n".join(lines)


# Validate no sub exceeds the flow-mode threshold (42 chars).
def check(data, label):
    bad = []
    for key, stanzas in data.items():
        for (lead, k2, subs) in stanzas:
            for s in subs:
                if len(s) > 42:
                    bad.append((key, s, len(s)))
    if bad:
        print(f"WARNING ({label}): {len(bad)} subs over 42 chars:")
        for key, s, n in bad[:40]:
            print(f"  {key} [{n}]: {s}")
    return not bad


if __name__ == "__main__":
    import sys
    here = os.path.dirname(os.path.abspath(__file__))
    sys.path.insert(0, here)
    from _content_up_major import UP_MAJOR
    from _content_up_minor1 import UP_WANDS, UP_CUPS
    from _content_up_minor2 import UP_SWORDS, UP_PENTS
    from _content_rev_major import REV_MAJOR
    from _content_rev_minor1 import REV_WANDS, REV_CUPS
    from _content_rev_minor2 import REV_SWORDS, REV_PENTS

    UP = {**UP_MAJOR, **UP_WANDS, **UP_CUPS, **UP_SWORDS, **UP_PENTS}
    REV = {**REV_MAJOR, **REV_WANDS, **REV_CUPS, **REV_SWORDS, **REV_PENTS}

    # Completeness + structure checks before writing.
    missing_up = [k for k in KEYS if k not in UP]
    missing_rev = [k for k in KEYS if k not in REV]
    if missing_up:
        print("MISSING upright:", missing_up); sys.exit(1)
    if missing_rev:
        print("MISSING reversed:", missing_rev); sys.exit(1)
    for k in KEYS:
        for (lead, k2, subs) in REV[k]:
            if not subs:
                print("EMPTY reversed subs:", k); sys.exit(1)
        if len(REV[k]) != 4:
            print(f"BAD reversed stanza count {k}: {len(REV[k])}"); sys.exit(1)
    ok = check(UP, "upright") and check(REV, "reversed")
    if not ok:
        sys.exit(1)

    base = os.path.dirname(here)
    up_header = ("// Real Thoth-deck meanings (upright), authored from the Book of\n"
                 "// Thoth / Crowley consensus with Jungian angles in the subs.\n"
                 "// Same structure as cardActions.js. Used by the info overlay\n"
                 "// when the active deck is Thoth and the card is upright.")
    with open(os.path.join(base, "cardActionsThoth.js"), "w") as f:
        f.write(emit("CARD_ACTIONS_THOTH", UP, up_header))

    rev_header = ("// Real Thoth-deck meanings (reversed). Four angles —\n"
                  "// Weakened / Inverted / Negative / Delayed — authored from the\n"
                  "// Thoth consensus with Jungian shadow framings in the subs.")
    with open(os.path.join(base, "cardActionsThothReversed.js"), "w") as f:
        f.write(emit("CARD_ACTIONS_REVERSED_THOTH", REV, rev_header))

    print(f"Wrote cardActionsThoth.js ({len(UP)} cards) and "
          f"cardActionsThothReversed.js ({len(REV)} cards)")
