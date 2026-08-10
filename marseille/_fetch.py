#!/usr/bin/env python3
"""Fetch the 78 Tarot de Marseille card scans (Lequart, Paris — public
domain) from Wikimedia Commons into _src/, using this project's canonical
card keys.

Commons naming for this set:
  trumps  TT (Le Mat / Fool), T1..T21
  minors  {1..10,J,H,Q,K}{B,C,P,S}
            B=Batons  C=Coupes  P=Deniers(coins)  S=Epees
            J=Valet   H=Cavalier  Q=Reyne  K=Roy

Our keys: maj00..maj21, then wands/cups/swords/pents 01..14, where
11=Page/Valet 12=Knight/Cavalier 13=Queen 14=King — the same rank order
the Rider-Waite and Thoth decks already use, so the deck model needs no
special-casing.
"""
import json
import os
import time
import urllib.parse
import urllib.request

HERE = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.join(HERE, "_src")
# Wikimedia's UA policy wants a descriptive agent with a contact URL;
# a vague one gets rate-limited far more aggressively.
UA = {"User-Agent": "randomtarot-asset-fetch/1.0 "
                    "(https://github.com/carbonsf/randomtarot; one-time deck fetch)"}

# Commons title -> our canonical key.
MAP = {}
MAP["TT"] = "maj00"                      # Le Mat — the Fool, unnumbered
for i in range(1, 22):
    MAP["T%d" % i] = "maj%02d" % i       # T1 Bateleur .. T21 Le Monde

SUIT = {"B": "wands", "C": "cups", "S": "swords", "P": "pents"}
RANK = {**{str(n): n for n in range(1, 11)}, "J": 11, "H": 12, "Q": 13, "K": 14}
for s_code, suit in SUIT.items():
    for r_code, rank in RANK.items():
        MAP[r_code + s_code] = "%s%02d" % (suit, rank)

assert len(MAP) == 78, len(MAP)


def image_urls():
    """Resolve every Commons title to its original file URL."""
    titles = ["File:%s Tarot.png" % t for t in MAP]
    out = {}
    for i in range(0, len(titles), 40):
        chunk = titles[i:i + 40]
        url = ("https://commons.wikimedia.org/w/api.php?action=query&titles="
               + urllib.parse.quote("|".join(chunk))
               + "&prop=imageinfo&iiprop=url&format=json")
        req = urllib.request.Request(url, headers=UA)
        data = json.load(urllib.request.urlopen(req, timeout=60))
        for page in data["query"]["pages"].values():
            title = page["title"].replace("File:", "").replace(" Tarot.png", "")
            out[title] = page["imageinfo"][0]["url"].split("?")[0]
    return out


def main():
    os.makedirs(SRC, exist_ok=True)
    urls = image_urls()
    missing = [t for t in MAP if t not in urls]
    if missing:
        raise SystemExit("could not resolve: %s" % missing)

    for n, (title, key) in enumerate(sorted(MAP.items(), key=lambda kv: kv[1]), 1):
        dest = os.path.join(SRC, key + ".png")
        if os.path.exists(dest) and os.path.getsize(dest) > 100_000:
            print("%2d/78 %-6s %-9s cached" % (n, title, key))
            continue
        # Commons rate-limits (HTTP 429) on bulk pulls; back off and retry
        # rather than hammering. Downloads are resumable — already-fetched
        # files are skipped by the cache check above.
        data = None
        for attempt in range(9):
            try:
                req = urllib.request.Request(urls[title], headers=UA)
                data = urllib.request.urlopen(req, timeout=120).read()
                break
            except urllib.error.HTTPError as err:
                if err.code != 429 or attempt == 8:
                    raise
                wait = min(300, 30 * (2 ** attempt))   # 30s, 60s, 120s, 240s, 300s...
                print("      429 rate-limited, waiting %ds ..." % wait, flush=True)
                time.sleep(wait)
        with open(dest, "wb") as fh:
            fh.write(data)
        print("%2d/78 %-6s -> %-9s %.1f MB" % (n, title, key, len(data) / 1e6), flush=True)
        time.sleep(3)   # be polite to Commons

    print("done:", len(os.listdir(SRC)), "files in", SRC)


if __name__ == "__main__":
    main()
