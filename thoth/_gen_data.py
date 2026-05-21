#!/usr/bin/env python3
"""
Generate lorem-ipsum data stubs for the Thoth deck, matching the exact
shape of cardActions.js (upright) and cardActionsReversed.js (reversed).
Real meaning text will be swapped in later; for now every card gets
placeholder filler with the correct structure so the info overlay
renders identically to the RW deck.

Upright  (CARD_ACTIONS_THOTH):          4 stanzas, each {lead, key, subs[5]}
Reversed (CARD_ACTIONS_REVERSED_THOTH): Weakened/Inverted/Negative/Delayed,
                                        each {lead, key, subs[4]}
"""
import os, random

random.seed(93)  # deterministic output

KEYS = (
    [f"maj{i:02d}" for i in range(22)] +
    [f"{suit}{i:02d}" for suit in ("wands", "cups", "swords", "pents") for i in range(1, 15)]
)

LOREM = ("lorem ipsum dolor sit amet consectetur adipiscing elit sed do "
         "eiusmod tempor incididunt ut labore et dolore magna aliqua enim "
         "ad minim veniam quis nostrud exercitation ullamco laboris nisi "
         "aliquip ex ea commodo consequat duis aute irure in reprehenderit "
         "voluptate velit esse cillum eu fugiat nulla pariatur excepteur "
         "sint occaecat cupidatat non proident sunt culpa qui officia "
         "deserunt mollit anim id est laborum").split()


def phrase(nwords):
    start = random.randint(0, len(LOREM) - nwords)
    return " ".join(LOREM[start:start + nwords])


def word():
    return random.choice(LOREM)


def js_array(items, indent):
    pad = " " * indent
    inner = ",\n".join(f'{pad}  "{s}"' for s in items)
    return "[\n" + inner + "\n" + pad + "]"


def upright_card():
    stanzas = []
    for _ in range(4):
        subs = [phrase(random.randint(3, 6)) for _ in range(5)]
        stanzas.append((word(), word(), subs))
    return stanzas


REV_LEADS = ["Weakened", "Inverted", "Negative", "Delayed"]


def reversed_card():
    stanzas = []
    for lead in REV_LEADS:
        subs = [phrase(random.randint(3, 6)) for _ in range(4)]
        stanzas.append((lead, word(), subs))
    return stanzas


def emit(varname, builder, header):
    lines = [header, f"const {varname} = {{"]
    for ki, key in enumerate(KEYS):
        stanzas = builder()
        lines.append(f'  "{key}": [')
        for si, (lead, key2, subs) in enumerate(stanzas):
            subs_js = ", ".join(f'"{s}"' for s in subs)
            comma = "," if si < len(stanzas) - 1 else ""
            lines.append(f'    {{"lead": "{lead}", "key": "{key2}", "subs": [{subs_js}]}}{comma}')
        close = "]" if ki == len(KEYS) - 1 else "],"
        lines.append(f'  {close}')
    lines.append("};")
    lines.append("")
    return "\n".join(lines)


if __name__ == "__main__":
    base = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

    up_header = ("// PLACEHOLDER lorem-ipsum data for the Thoth deck (upright).\n"
                 "// Same structure as cardActions.js; real meanings to be\n"
                 "// swapped in later. Used by the info overlay when the active\n"
                 "// deck is Thoth and the card is upright.")
    with open(os.path.join(base, "cardActionsThoth.js"), "w") as f:
        f.write(emit("CARD_ACTIONS_THOTH", upright_card, up_header))

    rev_header = ("// PLACEHOLDER lorem-ipsum data for the Thoth deck (reversed).\n"
                  "// Same structure as cardActionsReversed.js (Weakened /\n"
                  "// Inverted / Negative / Delayed). Real meanings later.")
    with open(os.path.join(base, "cardActionsThothReversed.js"), "w") as f:
        f.write(emit("CARD_ACTIONS_REVERSED_THOTH", reversed_card, rev_header))

    print("Wrote cardActionsThoth.js and cardActionsThothReversed.js")
