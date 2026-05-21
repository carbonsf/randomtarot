#!/usr/bin/env python3
"""
One-shot pipeline: download every Thoth card from its Flickr URL,
border-detect, and emit big/fullart/artfill crops. Run from this dir.
"""
import os, sys, urllib.request, urllib.error
from _crop import process

# Mapping from internal card key -> Flickr URL. Internal keys mirror
# the Rider-Waite scheme already used by cardActions.js (maj00-maj21,
# wands01-14, cups01-14, swords01-14, pents01-14). Thoth "Disks" map
# to pents, since they're the same suit. For maj01 the user listed
# three variants (a/b/c); we use the first (Magus, 01a) as canonical.
CARDS = {
    "maj00": "https://live.staticflickr.com/6153/6242948151_5eeb25a49d_b.jpg",  # The Fool
    "maj01": "https://live.staticflickr.com/6042/6242951139_648e4e0e79_b.jpg",  # The Magus (01a)
    "maj02": "https://live.staticflickr.com/6168/6243477936_580e7f0bcc_b.jpg",  # The Priestess
    "maj03": "https://live.staticflickr.com/6214/6242964111_303d502e54_b.jpg",  # The Empress
    "maj04": "https://live.staticflickr.com/6102/6242967627_1a2a035a4a_b.jpg",  # The Emperor
    "maj05": "https://live.staticflickr.com/6060/6242971545_f4d1576080_b.jpg",  # The Hierophant
    "maj06": "https://live.staticflickr.com/6051/6242975111_0e6dc40542_b.jpg",  # The Lovers
    "maj07": "https://live.staticflickr.com/6219/6242978247_4a5a8fa28f_b.jpg",  # The Chariot
    "maj08": "https://live.staticflickr.com/6158/6242981713_6a15f39c5e_b.jpg",  # Adjustment (Justice)
    "maj09": "https://live.staticflickr.com/6151/6242984839_1de5bdf4c6_b.jpg",  # The Hermit
    "maj10": "https://live.staticflickr.com/6093/6242988207_26872197ca_b.jpg",  # Fortune (Wheel)
    "maj11": "https://live.staticflickr.com/6178/6243508938_251c9f1bf9_b.jpg",  # Lust (Strength)
    "maj12": "https://live.staticflickr.com/6157/6243511850_e3982f31a2_b.jpg",  # The Hanged Man
    "maj13": "https://live.staticflickr.com/6101/6242997227_f76efb5967_b.jpg",  # Death
    "maj14": "https://live.staticflickr.com/6180/6243517528_b4c1d4f756_b.jpg",  # Art (Temperance)
    "maj15": "https://live.staticflickr.com/6036/6243003301_dbfe40026a_b.jpg",  # The Devil
    "maj16": "https://live.staticflickr.com/6176/6243006077_fb020dc8b4_b.jpg",  # The Tower
    "maj17": "https://live.staticflickr.com/6211/6243526484_16a8cf98ec_b.jpg",  # The Star
    "maj18": "https://live.staticflickr.com/6035/6243011861_98ea57c6de_b.jpg",  # The Moon
    "maj19": "https://live.staticflickr.com/6226/6243532642_2e8818ddfe_b.jpg",  # The Sun
    "maj20": "https://live.staticflickr.com/6046/6243018665_e72d516776_b.jpg",  # The Aeon (Judgement)
    "maj21": "https://live.staticflickr.com/6031/6243021703_c9ddbf279d_b.jpg",  # The Universe (World)

    "wands01": "https://live.staticflickr.com/6179/6243024841_7974a3b179_b.jpg",  # Ace
    "wands02": "https://live.staticflickr.com/6113/6243028207_65dbf12507_b.jpg",  # Dominion
    "wands03": "https://live.staticflickr.com/6032/6243031433_c19df9cfe3_b.jpg",  # Virtue
    "wands04": "https://live.staticflickr.com/6236/6243552684_5077946ae3_b.jpg",  # Completion
    "wands05": "https://live.staticflickr.com/6214/6243038307_5638bfc215_b.jpg",  # Strife
    "wands06": "https://live.staticflickr.com/6153/6243560100_b3d9830b72_b.jpg",  # Victory
    "wands07": "https://live.staticflickr.com/6112/6243046231_791344a883_b.jpg",  # Valour
    "wands08": "https://live.staticflickr.com/6055/6243049869_5d41245518_b.jpg",  # Swiftness
    "wands09": "https://live.staticflickr.com/6155/6243570604_f216ee832e_b.jpg",  # Strength
    "wands10": "https://live.staticflickr.com/6097/6243056435_219f51cea2_b.jpg",  # Oppression
    "wands11": "https://live.staticflickr.com/6215/6243059637_4d779caf69_b.jpg",  # Princess (Page)
    "wands12": "https://live.staticflickr.com/6218/6243580006_979475cb76_b.jpg",  # Prince (Knight)
    "wands13": "https://live.staticflickr.com/6223/6243065609_245f596965_b.jpg",  # Queen
    "wands14": "https://live.staticflickr.com/6214/6243585618_44d1bdb3ca_b.jpg",  # Knight (King)

    "pents01": "https://live.staticflickr.com/6116/6243588832_aedc3080af_b.jpg",  # Disks Ace
    "pents02": "https://live.staticflickr.com/6228/6243591978_b1b577b2b6_b.jpg",  # Change
    "pents03": "https://live.staticflickr.com/6052/6243595360_69d8fb41be_b.jpg",  # Works
    "pents04": "https://live.staticflickr.com/6054/6243598712_900cfe3bb7_b.jpg",  # Power
    "pents05": "https://live.staticflickr.com/6168/6243602064_96c9d7b067_b.jpg",  # Worry
    "pents06": "https://live.staticflickr.com/6039/6243088205_9b7a694624_b.jpg",  # Success
    "pents07": "https://live.staticflickr.com/6115/6243091133_5ea4acb6d0_b.jpg",  # Failure
    "pents08": "https://live.staticflickr.com/6228/6243611828_ca68a9780c_b.jpg",  # Prudence
    "pents09": "https://live.staticflickr.com/6173/6243098627_c780257728_b.jpg",  # Gain
    "pents10": "https://live.staticflickr.com/6108/6243102541_ae45145dd4_b.jpg",  # Wealth
    "pents11": "https://live.staticflickr.com/6161/6243623226_ab77a6211e_b.jpg",  # Princess
    "pents12": "https://live.staticflickr.com/6060/6243109515_2cf3517c0a_b.jpg",  # Prince
    "pents13": "https://live.staticflickr.com/6091/6243112753_662dc3f4b6_b.jpg",  # Queen
    "pents14": "https://live.staticflickr.com/6233/6243633252_f5376538b3_b.jpg",  # Knight

    "swords01": "https://live.staticflickr.com/6049/6243119861_8f8c0779f3_b.jpg",  # Ace
    "swords02": "https://live.staticflickr.com/6167/6243640604_a901d20044_b.jpg",  # Peace
    "swords03": "https://live.staticflickr.com/6109/6243127065_e2a59dae8e_b.jpg",  # Sorrow
    "swords04": "https://live.staticflickr.com/6220/6243648646_f5c5df4b02_b.jpg",  # Truce
    "swords05": "https://live.staticflickr.com/6097/6243653174_6d218ebd27_b.jpg",  # Defeat
    "swords06": "https://live.staticflickr.com/6037/6243140105_4a2cf38568_b.jpg",  # Science
    "swords07": "https://live.staticflickr.com/6164/6243661116_0c7499a60b_b.jpg",  # Futility
    "swords08": "https://live.staticflickr.com/6040/6243147975_243b38e4bb_b.jpg",  # Interference
    "swords09": "https://live.staticflickr.com/6158/6243152607_d0172d9d7a_b.jpg",  # Cruelty
    "swords10": "https://live.staticflickr.com/6180/6243673476_a4bce7d938_b.jpg",  # Ruin
    "swords11": "https://live.staticflickr.com/6217/6243677676_8fd9257459_b.jpg",  # Princess
    "swords12": "https://live.staticflickr.com/6174/6243164463_7172568929_b.jpg",  # Prince
    "swords13": "https://live.staticflickr.com/6051/6243168663_f5bd1a658b_b.jpg",  # Queen
    "swords14": "https://live.staticflickr.com/6171/6243172617_f33835f719_b.jpg",  # Knight

    "cups01": "https://live.staticflickr.com/6223/6243176509_c3ecb79a02_b.jpg",  # Ace
    "cups02": "https://live.staticflickr.com/6180/6243699186_4fb7f1b212_b.jpg",  # Love
    "cups03": "https://live.staticflickr.com/6163/6243703544_f743d32620_b.jpg",  # Abundance
    "cups04": "https://live.staticflickr.com/6048/6243190683_35916c1d6a_b.jpg",  # Luxury
    "cups05": "https://live.staticflickr.com/6230/6243712810_fa39ff7591_b.jpg",  # Disappointment
    "cups06": "https://live.staticflickr.com/6110/6243717776_2454cb03f7_b.jpg",  # Pleasure
    "cups07": "https://live.staticflickr.com/6164/6243205467_b0876e793e_b.jpg",  # Debauch
    "cups08": "https://live.staticflickr.com/6093/6243726692_94e858e885_b.jpg",  # Indolence
    "cups09": "https://live.staticflickr.com/6219/6243731676_5b0223545c_b.jpg",  # Happiness
    "cups10": "https://live.staticflickr.com/6226/6243219077_a9b4d08d3d_b.jpg",  # Satiety
    "cups11": "https://live.staticflickr.com/6097/6243223747_d1938088a8_b.jpg",  # Princess
    "cups12": "https://live.staticflickr.com/6215/6243745720_891a78e87f_b.jpg",  # Prince
    "cups13": "https://live.staticflickr.com/6238/6243750344_ae7ece9621_b.jpg",  # Queen
    "cups14": "https://live.staticflickr.com/6167/6243238063_f75dc11af7_b.jpg",  # Knight
}

BASE = os.path.dirname(os.path.abspath(__file__))


def fetch(url, dst):
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
    with urllib.request.urlopen(req, timeout=30) as r, open(dst, "wb") as f:
        f.write(r.read())


if __name__ == "__main__":
    print(f"Processing {len(CARDS)} cards...")
    for i, (key, url) in enumerate(CARDS.items(), 1):
        src_path = os.path.join(BASE, "_src", f"{key}.jpg")
        if not os.path.exists(src_path):
            try:
                fetch(url, src_path)
            except Exception as e:
                print(f"  [{i:2d}/{len(CARDS)}] {key}: FETCH FAILED: {e}")
                continue
        try:
            info = process(src_path, key, BASE)
            print(f"  [{i:2d}/{len(CARDS)}] {key}: src{info['src']} -> fullart{info['fullart']} (box {info['fullart_box']})")
        except Exception as e:
            print(f"  [{i:2d}/{len(CARDS)}] {key}: CROP FAILED: {e}")
    print("Done.")
