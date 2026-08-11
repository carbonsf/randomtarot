#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Marseille trumps — upright and reversed.

Read from the Tarot de Marseille tradition rather than the Golden Dawn
narrative the Rider-Waite carries: plainer, more medieval, closer to the
woodcut. Note VIII is LA JUSTICE and XI is LA FORCE — the reverse of
Rider-Waite — and XIII is unnamed on the card.

The Lequart deck is a BESANÇON-type Marseille: trumps II and V are JUNON
(with her peacocks) and JUPITER (thunderbolts, borne on the eagle), the
Roman-deity replacements for the Papesse and Pape used in
mixed-confession regions. The II and V texts below are written for what
these cards actually depict — the station in the sequence keeps its
function (the inward keeper; the sky-authority), but the imagery is
Junon's and Jupiter's, not the papal pair's.
"""

# key -> [(lead, key, [subs]), ...]
UP = {
"maj00": [
    ("walking", "unnumbered", [
        "outside the sequence entirely",
        "the only trump without a number",
        "free because nothing counts him",
        "belonging to no place, so to all"]),
    ("carrying", "everything he owns", [
        "a bundle on a stick, nothing more",
        "travelling light by necessity",
        "the world reduced to what you hold",
        "poverty that reads as freedom"]),
    ("moving", "on", [
        "the dog at his heel, urging him",
        "leaving before the story finishes",
        "the road as the only home",
        "wandering with intent, not lost"])],
"maj01": [
    ("laying out", "the table", [
        "cups, coins, blade, all to hand",
        "the four suits as working tools",
        "everything needed, nothing yet made",
        "beginning with what is in front of you"]),
    ("holding", "the wand", [
        "one hand up, one hand down",
        "channel between above and below",
        "skill that has not chosen its use",
        "the gesture that starts the work"]),
    ("practising", "the craft", [
        "the juggler, the trickster, the maker",
        "sleight of hand or true art",
        "talent still deciding what it is",
        "opening the shop for the day"])],
"maj02": [
    ("pointing", "skyward", [
        "one finger raised to the clouds",
        "attention drawn above the visible",
        "the queen of heaven at her station",
        "what she knows, she indicates"]),
    ("keeping", "her own counsel", [
        "sovereign without a throne",
        "majesty carried, not seated",
        "guardian of thresholds and vows",
        "dignity that needs no book"]),
    ("walking", "with peacocks", [
        "the hundred-eyed watch at her feet",
        "beauty that is also vigilance",
        "seen more than she is seeing",
        "splendour as a way of knowing"])],
"maj03": [
    ("holding", "the shield", [
        "the eagle resting on her arm",
        "authority that shelters rather than rules",
        "power turned toward tending",
        "protection offered, not imposed"]),
    ("bringing", "into form", [
        "thought made into something living",
        "the fertile turn of an idea",
        "what was imagined now growing",
        "creation as ordinary labour"]),
    ("presiding", "over increase", [
        "abundance that arrives quietly",
        "the sceptre held lightly",
        "governing by nourishing",
        "worldly things flourishing"])],
"maj04": [
    ("sitting", "in profile", [
        "legs crossed in the figure four",
        "settled, weighty, hard to move",
        "the body itself as a structure",
        "stability you can lean against"]),
    ("holding", "the ground", [
        "what is established stays established",
        "order maintained by presence alone",
        "the rule that needs no argument",
        "solidity as the whole argument"]),
    ("ruling", "the visible world", [
        "matter, borders, law, the built",
        "authority that answers to no mood",
        "the father as fact, not feeling",
        "power that has stopped moving"])],
"maj05": [
    ("holding", "the thunderbolt", [
        "power in either hand",
        "authority that needs no chair",
        "command carried openly",
        "the sky's weight, hand-held"]),
    ("riding", "the eagle", [
        "borne up by what he rules",
        "standing on wings in the clouds",
        "sovereignty above the weather",
        "the height that sees whole"]),
    ("granting", "and withholding", [
        "the father who says yes and no",
        "law spoken from the sky",
        "favour that must be asked",
        "judgement above appeal"])],
"maj06": [
    ("standing", "at the crossing", [
        "three figures and an archer above",
        "the choice made under a loosed arrow",
        "not romance so much as decision",
        "one path taken, the rest closed"]),
    ("being", "pulled two ways", [
        "the familiar against the new",
        "two claims, both legitimate",
        "affection as a form of gravity",
        "the difficulty of wanting both"]),
    ("choosing", "with the whole self", [
        "a decision the body makes too",
        "commitment that costs something",
        "love as an act of election",
        "the moment the fork is passed"])],
"maj07": [
    ("standing", "in the car", [
        "upright, crowned, already moving",
        "carried rather than walking",
        "a young power going forward",
        "the vehicle built to be seen"]),
    ("driving", "two horses", [
        "one facing out, one facing across",
        "held together by will alone",
        "no reins visible on the card",
        "steering by intent, not equipment"]),
    ("arriving", "somewhere", [
        "the campaign that has begun",
        "momentum that must be aimed",
        "conquest, or simply travel",
        "victory before it has been tested"])],
"maj08": [
    ("holding", "the scales", [
        "the eighth trump in this deck",
        "measure applied without apology",
        "weighing that does not hurry",
        "the balance held level and still"]),
    ("raising", "the sword", [
        "blade upright, edge unturned",
        "discernment that cuts cleanly",
        "the decision that follows the weighing",
        "justice as an act, not an idea"]),
    ("facing", "straight ahead", [
        "the only fully frontal figure",
        "meeting the matter without evasion",
        "no profile, no angle, no dodge",
        "seeing exactly what is the case"])],
"maj09": [
    ("carrying", "the lantern", [
        "a small light held out at arm's length",
        "illuminating only the next step",
        "what he can see, he can share",
        "the lamp shielded by his cloak"]),
    ("walking", "slowly", [
        "the staff taking his weight",
        "age as accumulated pace",
        "going alone because it is quicker",
        "no destination named on the card"]),
    ("withdrawing", "to see", [
        "solitude chosen, not suffered",
        "stepping out of the noise",
        "the long look that needs quiet",
        "prudence as a way of living"])],
"maj10": [
    ("turning", "without a handle", [
        "no one is cranking this wheel",
        "motion with no visible cause",
        "the turn that happens to you",
        "chance running on its own"]),
    ("riding", "up or down", [
        "creatures rising and falling together",
        "the one climbing, the one descending",
        "position as a temporary condition",
        "whoever is up is on their way down"]),
    ("watching", "fortune move", [
        "cycles indifferent to merit",
        "the sphinx crowned on top, for now",
        "timing that owes you nothing",
        "what turns will turn again"])],
"maj11": [
    ("opening", "the lion's mouth", [
        "the eleventh trump in this deck",
        "hands calm on the jaws",
        "no strain visible anywhere",
        "the beast neither killed nor fled"]),
    ("applying", "quiet force", [
        "strength that does not look like effort",
        "mastery without domination",
        "the wide hat, the untroubled face",
        "power exercised gently"]),
    ("holding", "the animal", [
        "instinct handled, not suppressed",
        "the wild kept close and known",
        "courage that stays soft",
        "living alongside your own appetite"])],
"maj12": [
    ("hanging", "by one foot", [
        "suspended from a living frame",
        "the free leg crossed behind",
        "upside down and untroubled",
        "held rather than falling"]),
    ("waiting", "inverted", [
        "the world seen the other way up",
        "a pause that cannot be hurried",
        "stillness imposed from outside",
        "hands hidden behind his back"]),
    ("giving", "something up", [
        "the coins spilling from his pockets",
        "surrender that buys a new view",
        "sacrifice with no audience",
        "letting the reversal teach"])],
"maj13": [
    ("holding", "the scythe", [
        "the trump with no name printed",
        "the blade already in motion",
        "what is cut is cut without malice",
        "the nameless arcanum, XIII"]),
    ("clearing", "the field", [
        "hands and heads still in the soil",
        "the ground made ready by stripping",
        "harvest and end as one act",
        "removal that precedes growth"]),
    ("ending", "without ceremony", [
        "transformation that does not ask",
        "the door closing on its own",
        "impersonal, thorough, complete",
        "an ending that will not be argued"])],
"maj14": [
    ("pouring", "between vessels", [
        "liquid passing from urn to urn",
        "nothing spilled, nothing lost",
        "the flow continuous in both directions",
        "an exchange with no container empty"]),
    ("standing", "winged", [
        "an angel, but plainly at work",
        "the miraculous doing something ordinary",
        "poise held while pouring",
        "grace as a practical activity"]),
    ("tempering", "the mixture", [
        "two things becoming one thing",
        "the right proportion found slowly",
        "moderation as active craft",
        "healing by combination"])],
"maj15": [
    ("standing", "on the pedestal", [
        "raised above two small figures",
        "the horned one, torch in hand",
        "power that requires an audience",
        "elevation as the whole trick"]),
    ("holding", "the tethers", [
        "loose ropes around willing necks",
        "bonds that could be slipped",
        "the captivity you cooperate with",
        "chains kept comfortable on purpose"]),
    ("wanting", "badly", [
        "appetite that has taken the throne",
        "what you cannot put down",
        "the material grip, fully felt",
        "compulsion mistaken for choice"])],
"maj16": [
    ("splitting", "the crown", [
        "the tower's top blown clean off",
        "lightning arriving without warning",
        "the structure opened at its head",
        "what was highest goes first"]),
    ("falling", "out", [
        "two figures thrown into the air",
        "coloured drops scattered all round",
        "no ground shown to land on",
        "descent still in progress"]),
    ("losing", "the shelter", [
        "the built thing proved provisional",
        "sudden clearance of a false safety",
        "release that arrives as damage",
        "correction from outside the plan"])],
"maj17": [
    ("kneeling", "at the water", [
        "one knee down, one foot in the stream",
        "naked without embarrassment",
        "attending to the source directly",
        "the posture of pouring, not asking"]),
    ("emptying", "two jugs", [
        "one onto the earth, one into the river",
        "giving back without measuring",
        "replenishment that costs nothing",
        "flow restored to where it came from"]),
    ("standing", "under stars", [
        "one great star and seven around it",
        "guidance that is simply there",
        "hope as an ambient condition",
        "the bird watching from the tree"])],
"maj18": [
    ("shining", "on the ambiguous", [
        "light that does not clarify",
        "the face in the moon looking aside",
        "drops falling upward toward it",
        "illumination without definition"]),
    ("standing", "at the water's edge", [
        "two towers, two dogs, one crayfish",
        "the thing crawling up out of the pool",
        "the threshold between kinds",
        "what surfaces at night"]),
    ("going", "by feel", [
        "the path that cannot be seen whole",
        "instinct where sight fails",
        "dreams, tides, and the unsaid",
        "trusting what you cannot verify"])],
"maj19": [
    ("shining", "plainly", [
        "a face in the disc, looking out",
        "rays straight and wavy together",
        "warmth without mystery",
        "light that explains itself"]),
    ("standing", "together", [
        "two children before a low wall",
        "one hand on the other's shoulder",
        "company as the whole point",
        "being seen and not minding"]),
    ("receiving", "the day", [
        "drops of colour falling like grace",
        "clarity after the moon's night",
        "the simple good, uncomplicated",
        "gladness that needs no reason"])],
"maj20": [
    ("sounding", "the trumpet", [
        "the angel leaning from the cloud",
        "a call that reaches underground",
        "summons rather than sentence",
        "the note that cannot be unheard"]),
    ("rising", "from the tomb", [
        "three figures, one just standing up",
        "the lid pushed off from inside",
        "return to a life thought finished",
        "waking as a communal event"]),
    ("answering", "for it", [
        "the account finally rendered",
        "what was buried brought into day",
        "reckoning that also restores",
        "being called by your own name"])],
"maj21": [
    ("dancing", "in the wreath", [
        "a figure held inside an oval",
        "the garland closed all the way round",
        "movement inside completion",
        "framed rather than confined"]),
    ("gathering", "the four", [
        "angel, eagle, lion, bull at the corners",
        "the whole compass accounted for",
        "everything present at once",
        "the four fixed and the one moving"]),
    ("completing", "the round", [
        "the last trump, the closed circle",
        "arrival that includes the journey",
        "the world entered, not conquered",
        "wholeness that keeps dancing"])],
}

# key -> [("Weakened"/"Inverted"/"Negative"/"Delayed", key, [4 subs]), ...]
REV = {
"maj00": [
    ("Weakened", "wandering", ["the road losing its pull", "freedom that feels like drift", "lightness thinning into vacancy", "movement without appetite"]),
    ("Inverted", "freedom", ["rootlessness dressed as liberty", "leaving before anything can hold", "the escape that repeats itself", "no place refused, none entered"]),
    ("Negative", "evasion", ["using the road to dodge the work", "irresponsibility called openness", "the bundle never unpacked", "never staying to be known"]),
    ("Delayed", "departure", ["the setting-out still ahead", "the dog still nipping unheeded", "readiness not yet turned to leaving", "the road waiting to be taken"])],
"maj01": [
    ("Weakened", "skill", ["the hands less sure than they look", "craft that will not quite land", "tools laid out but not used", "the opening act faltering"]),
    ("Inverted", "beginning", ["the shop open with nothing to sell", "gesture standing in for work", "starting again to avoid finishing", "showmanship over substance"]),
    ("Negative", "trickery", ["sleight of hand used to deceive", "talent spent on the con", "the table set to distract", "cleverness without conscience"]),
    ("Delayed", "the work", ["the craft still being learned", "tools present, mastery pending", "the first move not yet made", "readiness arriving slowly"])],
"maj02": [
    ("Weakened", "the watch", ["the hundred eyes drooping shut", "vigilance thinning to habit", "the vow kept in name only", "majesty losing its bearing"]),
    ("Inverted", "vigilance", ["watching instead of living", "the guard kept on the wrong door", "suspicion dressed as care", "seeing everything, trusting nothing"]),
    ("Negative", "jealousy", ["the watch turned to possession", "punishing what cannot be held", "the peacock's eyes as evidence", "love enforced like a law"]),
    ("Delayed", "the vow", ["the promise not yet kept", "the threshold not yet crossed", "recognition still to come", "her moment waiting on the sky"])],
"maj03": [
    ("Weakened", "increase", ["growth that will not quite take", "abundance short of arriving", "fertility running thin", "the shield heavy on the arm"]),
    ("Inverted", "nurture", ["tending that smothers", "care given to be needed", "protection that prevents growing", "the shelter become an enclosure"]),
    ("Negative", "possession", ["nurture as a claim of ownership", "creating in order to control", "generosity with strings", "abundance used as leverage"]),
    ("Delayed", "flourishing", ["the season not yet turned", "what is planted still underground", "fruit forming out of sight", "increase on its own timetable"])],
"maj04": [
    ("Weakened", "structure", ["the order beginning to give", "authority that no longer convinces", "solidity with a hairline crack", "the seat less firm than it looks"]),
    ("Inverted", "stability", ["rigidity passed off as strength", "immovability as the only answer", "order preserved past its use", "structure serving only itself"]),
    ("Negative", "domination", ["rule enforced because it can be", "control mistaken for care", "power that permits no question", "the father as a closed door"]),
    ("Delayed", "order", ["the ground still settling", "authority not yet earned", "structure being built slowly", "the seat waiting to be taken"])],
"maj05": [
    ("Weakened", "command", ["thunder held without the charge", "authority that must repeat itself", "the eagle flying lower", "law announced, not felt"]),
    ("Inverted", "authority", ["rule from too far above to see", "the sky talking over the ground", "power that answers no questions", "grandeur standing in for judgement"]),
    ("Negative", "the bolt", ["the strike before the hearing", "punishment as first resort", "favour sold, wrath free", "the father who only says no"]),
    ("Delayed", "the answer", ["the petition still ascending", "the sky quiet for now", "judgement gathering like weather", "the yes not yet spoken"])],
"maj06": [
    ("Weakened", "choosing", ["the decision losing its edge", "both paths dimming at once", "the arrow loosed but unaimed", "commitment that will not set"]),
    ("Inverted", "love", ["choice deferred to keep both", "attachment mistaken for decision", "wanting the fork, not the road", "loving in order not to choose"]),
    ("Negative", "indecision", ["refusing to elect anything", "keeping options as a strategy", "the cost passed to other people", "paralysis dressed as openness"]),
    ("Delayed", "the decision", ["the crossing still ahead", "the arrow still in flight", "clarity about to arrive", "the choice ripening"])],
"maj07": [
    ("Weakened", "momentum", ["the horses pulling unevenly", "drive that will not quite gather", "the car moving without aim", "advance losing its force"]),
    ("Inverted", "victory", ["the vehicle mistaken for the journey", "conquest sought for the look of it", "arriving nowhere, splendidly", "motion as its own excuse"]),
    ("Negative", "conquest", ["driving over rather than through", "will that flattens what it meets", "triumph that costs the country", "steering by ego alone"]),
    ("Delayed", "arrival", ["the campaign still under way", "the destination not yet in view", "progress real but unfinished", "the road longer than expected"])],
"maj08": [
    ("Weakened", "balance", ["the scales trembling, not settling", "judgement that will not resolve", "the sword lowered a little", "measure losing its nerve"]),
    ("Inverted", "justice", ["the rule applied to the wrong case", "fairness used as a weapon", "the letter honoured, the spirit lost", "weighing rigged before it starts"]),
    ("Negative", "judgement", ["condemnation enjoying itself", "severity mistaken for principle", "the blade before the balance", "verdict without hearing"]),
    ("Delayed", "the verdict", ["the weighing still in progress", "the case not yet complete", "fairness arriving slowly", "the sword still held level"])],
"maj09": [
    ("Weakened", "the light", ["the lantern guttering low", "prudence thinning into doubt", "the next step barely lit", "the staff taking too much weight"]),
    ("Inverted", "solitude", ["withdrawal that became a habit", "the lamp turned inward only", "distance kept past its purpose", "quiet hardened into refusal"]),
    ("Negative", "isolation", ["solitude used to avoid people", "wisdom hoarded, never offered", "the cloak hiding the light entirely", "alone as an identity"]),
    ("Delayed", "the answer", ["the search still under way", "the light not yet reaching it", "understanding a few steps off", "patience still being asked"])],
"maj10": [
    ("Weakened", "the turn", ["the wheel barely moving", "luck that will not commit", "change stalled mid-rotation", "momentum leaking away"]),
    ("Inverted", "fortune", ["chance read as personal desert", "credit taken for the upswing", "the fall treated as injustice", "the wheel mistaken for a throne"]),
    ("Negative", "fatalism", ["surrendering agency to the turn", "using luck to excuse everything", "waiting where you could act", "the wheel as an alibi"]),
    ("Delayed", "the change", ["the turn beginning but not landed", "the cycle still coming round", "timing not yet yours", "what rises still rising"])],
"maj11": [
    ("Weakened", "strength", ["the hands unsure on the jaws", "calm that costs visible effort", "gentleness thinning to nerve", "the grip loosening"]),
    ("Inverted", "gentleness", ["softness used to avoid the beast", "patience that never acts", "the mouth held shut, not opened", "control mistaken for peace"]),
    ("Negative", "force", ["mastery slipping into domination", "the animal beaten, not held", "appetite ruling the hands", "strength that needs to prove itself"]),
    ("Delayed", "mastery", ["the beast not yet befriended", "steadiness still being learned", "courage arriving in stages", "the quiet hand still forming"])],
"maj12": [
    ("Weakened", "suspension", ["the pause losing its meaning", "waiting that has gone numb", "stillness without insight", "hanging with nothing gained"]),
    ("Inverted", "surrender", ["sacrifice performed for witnesses", "the pose held to avoid deciding", "martyrdom mistaken for patience", "letting go of the wrong thing"]),
    ("Negative", "stagnation", ["suspension chosen as a hiding place", "inversion that refuses to right", "waiting used to avoid the cost", "the coins spilled and unmissed"]),
    ("Delayed", "the release", ["the rope not yet cut", "the new view still forming", "the pause not finished with you", "descent still to come"])],
"maj13": [
    ("Weakened", "the ending", ["the cut that will not complete", "clearance stalled halfway", "the blade slowed in the soil", "an end that keeps not ending"]),
    ("Inverted", "change", ["holding what is already gone", "tending a field long since cut", "refusing the harvest", "the nameless thing given a name"]),
    ("Negative", "clinging", ["preserving a corpse of a situation", "fear of ending running the choice", "the scythe resisted at any cost", "life spent guarding an ending"]),
    ("Delayed", "the clearing", ["the ground not yet turned", "what must go still going", "the field mid-harvest", "renewal waiting on the cut"])],
"maj14": [
    ("Weakened", "the flow", ["the pour thinning to a trickle", "proportion slightly off", "the exchange losing its rhythm", "balance kept with effort"]),
    ("Inverted", "moderation", ["temperance as refusal to feel", "mixing to avoid choosing", "the middle taken from fear", "blandness called balance"]),
    ("Negative", "excess", ["the vessels emptied carelessly", "proportion abandoned entirely", "combining what should stay apart", "the cure taken past its dose"]),
    ("Delayed", "the blend", ["the mixture still finding itself", "healing on a slow schedule", "the right measure not yet found", "the pouring still under way"])],
"maj15": [
    ("Weakened", "the grip", ["the compulsion losing its hold", "appetite quieter than it was", "the tethers gone slack", "the torch burning lower"]),
    ("Inverted", "bondage", ["the chain admired as jewellery", "captivity called preference", "the pedestal defended by the bound", "wanting the bond to remain"]),
    ("Negative", "compulsion", ["appetite fully in the throne", "using others as instruments", "the ropes tightened deliberately", "power built on someone's need"]),
    ("Delayed", "release", ["the rope loosening slowly", "the grip not yet broken", "freedom recognised, not taken", "the step off the pedestal pending"])],
"maj16": [
    ("Weakened", "the strike", ["the shock partly absorbed", "the crack held, for now", "collapse arrested midway", "the tower swaying, standing"]),
    ("Inverted", "collapse", ["dismantling the tower yourself", "courting the strike to feel alive", "ruin sought as a shortcut", "breaking to avoid rebuilding"]),
    ("Negative", "destruction", ["tearing down what could be repaired", "the fall taken out on others", "crisis manufactured, then blamed", "wreckage kept as an excuse"]),
    ("Delayed", "the fall", ["the lightning already on its way", "the crack widening unseen", "what must break not yet broken", "the shelter on borrowed time"])],
"maj17": [
    ("Weakened", "hope", ["the star faint behind cloud", "the jugs pouring slowly", "encouragement barely reaching", "replenishment slowed to a drip"]),
    ("Inverted", "renewal", ["hope used to postpone action", "waiting on the star to do it", "optimism as an anaesthetic", "the stream admired, not entered"]),
    ("Negative", "despair", ["refusing the water outright", "the sky read as empty", "cynicism dressed as realism", "the jugs set down for good"]),
    ("Delayed", "restoration", ["the pool refilling slowly", "hope arriving out of season", "the star still coming clear", "the healing not yet felt"])],
"maj18": [
    ("Weakened", "the light", ["the moon behind thickening cloud", "instinct that will not settle", "the path fading at the edges", "guidance intermittent"]),
    ("Inverted", "illusion", ["the dream taken as instruction", "reading omens into everything", "feeling promoted to fact", "the tide mistaken for direction"]),
    ("Negative", "deception", ["preferring the fog to the fact", "using the night to hide in", "self-deceit maintained on purpose", "what surfaces pushed back down"]),
    ("Delayed", "clarity", ["the crayfish still climbing", "the night not finished yet", "dawn a long way off but coming", "the path revealing itself slowly"])],
"maj19": [
    ("Weakened", "the day", ["light present but not warming", "gladness that will not quite come", "the wall throwing a small shadow", "brightness held at a distance"]),
    ("Inverted", "clarity", ["cheerfulness worn as armour", "simplicity performed for company", "the plain good made a duty", "shining to be seen shining"]),
    ("Negative", "glare", ["exposure with nowhere to stand", "optimism that flattens the real", "warmth demanded of everyone", "light that refuses any shade"]),
    ("Delayed", "the warmth", ["the sun still climbing", "the good day not yet here", "clarity arriving after the night", "the drops still falling"])],
"maj20": [
    ("Weakened", "the call", ["the trumpet heard faintly", "the summons not quite landing", "rising begun and abandoned", "the lid pushed but not moved"]),
    ("Inverted", "reckoning", ["answering a charge no one made", "self-judgement mistaken for the call", "rising for the wrong summons", "the account rendered to yourself"]),
    ("Negative", "condemnation", ["the call used to accuse", "judgement without the restoration", "the past held over the living", "waking others only to blame"]),
    ("Delayed", "the waking", ["the note still travelling", "the tomb still shut", "the reckoning ahead, not now", "return being prepared"])],
"maj21": [
    ("Weakened", "completion", ["the wreath not quite closed", "wholeness missing one quarter", "the dance slowing near the end", "arrival that will not settle"]),
    ("Inverted", "wholeness", ["the garland worn as a boundary", "completion used to stop moving", "the world held rather than entered", "finishing to avoid beginning"]),
    ("Negative", "closure", ["sealing the circle against entry", "wholeness that excludes", "the frame mistaken for the world", "completion defended, not lived"]),
    ("Delayed", "arrival", ["the round still being danced", "the fourth corner not yet present", "the wreath still being woven", "completion on its long approach"])],
}
