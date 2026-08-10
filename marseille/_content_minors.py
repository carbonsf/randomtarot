#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Marseille minors — upright and reversed.

The Marseille pips are NON-SCENIC: five coupes are five ornamental cups,
not a figure grieving over spilled ones. So they are read the way the
tradition reads them — the quality of the number meeting the element of
the suit — rather than by describing a scene that isn't on the card.

Each pip gets three stanzas: the number's quality (shared across the four
suits, because in this system the number genuinely does mean the same
thing), then two stanzas authored for that specific number-and-suit.

Courts run Valet / Cavalier / Reyne / Roy — apprentice, quest, inward
mastery, outward authority — crossed with the four elements.
"""

SUITS = ["wands", "cups", "swords", "pents"]

# Lead verb for the number stanza. Chosen per number, and checked against
# every authored pip lead in that column so no card ever opens two stanzas
# with the same word ("holding the trial / holding the ground").
NUMBER_UP_LEAD = {
 1: "seeding", 2: "pairing", 3: "issuing", 4: "enclosing", 5: "pivoting",
 6: "settling", 7: "testing", 8: "arranging", 9: "brimming", 10: "exceeding",
}

# ---- the ten numbers, read as pure quality -----------------------------
NUMBER_UP = {
 1: ("the seed", ["the whole suit held in one", "potential before it divides", "the gift offered, not yet used", "a beginning with nothing spent"]),
 2: ("the pair", ["one becoming two", "relation, and therefore tension", "the first exchange", "what needs another to exist"]),
 3: ("the issue", ["two producing a third", "the first result of a relation", "growth that shows itself", "expression breaking out"]),
 4: ("the square", ["four corners, one enclosure", "the pause that holds its shape", "stability, and its walls", "consolidation before the next move"]),
 5: ("the break", ["the still point disturbed", "four disrupted by a fifth", "the pivot at the deck's centre", "movement forced on stillness"]),
 6: ("the balance", ["two threes, evenly met", "harmony after the disruption", "exchange that works", "the settled middle"]),
 7: ("the trial", ["balance tested by one more", "the uneven number that strains", "effort against resistance", "what must be won, not given"]),
 8: ("the order", ["structure regained, more complex", "arrangement that holds under load", "the pattern proved workable", "organisation as achievement"]),
 9: ("the fullness", ["the last single figure", "the suit at its greatest extent", "solitude at the top", "as far as this can go alone"]),
 10: ("the overflow", ["completion tipping into surplus", "the suit exceeding its container", "an end that is also a return", "ten becoming one again"]),
}

# ---- per-(number, suit) — two authored stanzas -------------------------
# (lead, key, [subs]) x2
PIP = {
("wands",1): [("taking up","the staff",["raw force offered to the hand","the will before it has a task","fire at its first ignition","energy with nowhere yet to go"]),
              ("beginning","the work",["the project that wants doing","impulse worth acting on","a start with real heat in it"])],
("wands",2): [("crossing","the batons",["two forces meeting at an angle","will against will, productively","the tension that makes a frame"]),
              ("holding","a partnership",["shared work, divided labour","the argument that sharpens both","an alliance under some strain"])],
("wands",3): [("branching","outward",["three staves opening a space","effort producing its first result","the work throwing out shoots"]),
              ("extending","the reach",["ambition finding room to grow","enterprise widening","what began small taking ground"])],
("wands",4): [("framing","the enclosure",["four staves making a stable square","the work given a structure","effort with walls around it"]),
              ("resting","in the built",["a pause that has been earned","the workshop finally in order","stability before the next push"])],
("wands",5): [("clashing","the staves",["batons crossed without agreement","competing energies in one room","friction with no clear winner"]),
              ("contending","openly",["rivalry that is at least honest","struggle that sharpens the work","conflict as a sign of life"])],
("wands",6): [("aligning","the forces",["staves finding a common angle","effort and reward in proportion","the team pulling together"]),
              ("carrying","the day",["work that is going well","momentum that others notice","recognition that fits the effort"])],
("wands",7): [("holding","the ground",["six against one, and one holds","defending what you built","effort under sustained pressure"]),
              ("persisting","anyway",["the will tested and still standing","stamina as the deciding factor","refusing to be pushed off"])],
("wands",8): [("ordering","the energy",["force finally organised","the work moving fast and straight","direction found for the heat"]),
              ("moving","quickly",["events accelerating","the arrow already loosed","progress that outruns planning"])],
("wands",9): [("guarding","alone",["the last stave held by one hand","strength that has been spent and stayed","vigilance after the battle"]),
              ("bearing","the cost",["scarred but still standing","reserves nearly gone, still holding","the tiredness of nearly finishing"])],
("wands",10): [("shouldering","the bundle",["more staves than two arms want","the work grown past its owner","success measured in weight"]),
               ("carrying","too much",["burden taken on willingly","the load that blocks the view","finishing under strain"])],

("cups",1): [("receiving","the vessel",["the cup offered, not taken","feeling before it has an object","the source, still undivided"]),
             ("opening","to it",["the heart made available","affection at its first stirring","willingness to be moved"])],
("cups",2): [("meeting","across",["two cups facing each other","the exchange that makes a bond","feeling that requires a second"]),
             ("joining","freely",["attraction acknowledged","the pledge between two people","affinity finding its match"])],
("cups",3): [("spilling","over",["three cups, more than enough","feeling that becomes company","joy that has to be shared"]),
             ("celebrating","together",["the gathering, the toast","gladness with witnesses","friendship at its easiest"])],
("cups",4): [("holding","steady",["four cups, evenly placed","feeling settled into a shape","emotion at rest, or at a stop"]),
             ("sitting","with enough",["contentment, or its cousin boredom","the heart no longer reaching","satisfaction that has stopped moving"])],
("cups",5): [("disturbing","the water",["the fifth cup breaking the square","feeling knocked out of its settlement","loss entering a stable thing"]),
             ("feeling","the lack",["what is missing, plainly felt","grief that has not been arranged","the ache that moves you again"])],
("cups",6): [("flowing","evenly",["six cups in easy proportion","feeling given and returned","emotional exchange that balances"]),
             ("remembering","kindly",["the past softened by affection","sweetness without demand","tenderness that costs nothing"])],
("cups",7): [("multiplying","the wants",["seven cups, too many to choose","desire outrunning judgement","feeling scattered across options"]),
             ("wanting","everything",["appetite that will not settle","imagination mistaken for intention","the trial of too much choice"])],
("cups",8): [("ordering","the feeling",["emotion given a workable shape","the heart arranged, not denied","structure that lets feeling last"]),
             ("moving","on purpose",["leaving what no longer holds water","choosing depth over quantity","turning away with reason"])],
("cups",9): [("filling","completely",["nine cups, the suit at its widest","satisfaction reached and held","feeling at its greatest extent"]),
             ("enjoying","fully",["the wish granted, plainly","pleasure without apology","abundance you can actually feel"])],
("cups",10): [("overflowing","the measure",["ten cups, more than can be held","feeling beyond private capacity","the heart's account in surplus"]),
              ("belonging","together",["joy that includes other people","the household, not the self","completion shared out"])],

("swords",1): [("drawing","the blade",["one sword, edge upright","mind before it has an object","clarity at its first arrival"]),
               ("seeing","plainly",["the thought that cuts through","truth arriving without padding","the decision becoming possible"])],
("swords",2): [("crossing","the blades",["two swords held against each other","thought divided against itself","the standoff inside one head"]),
               ("weighing","both",["two accounts, equally armed","suspension between two truths","the choice not yet made"])],
("swords",3): [("piercing","through",["a third blade between two","thought that wounds as it clarifies","the cut that cannot be unseen"]),
               ("knowing","the hurt",["understanding that costs something","grief arriving as a fact","the truth that hurts and holds"])],
("swords",4): [("laying","the blades down",["four swords at rest","the mind stood down","thought given a quiet room"]),
               ("resting","the mind",["the pause that prevents error","withdrawal to think properly","silence as a working method"])],
("swords",5): [("breaking","the order",["the fifth blade unsettles four","argument entering a settled room","conflict that cannot be tidied"]),
               ("cutting","too far",["the point won at some cost","words that went past their purpose","victory that damages the ground"])],
("swords",6): [("balancing","the blades",["six swords in workable order","thought and feeling in proportion","the mind steadied again"]),
               ("crossing","over",["passage to calmer water","the move that improves the terms","leaving trouble deliberately"])],
("swords",7): [("straining","the pattern",["seven blades, one out of true","cleverness against the odds","thought working around the rule"]),
               ("managing","alone",["the plan kept to yourself","tactics rather than force","getting through by wits"])],
("swords",8): [("ordering","the thought",["eight blades in strict arrangement","the mind's structure, tight","logic that admits no gap"]),
               ("binding","yourself",["restriction largely self-made","the argument that traps its author","limits that are mostly mental"])],
("swords",9): [("reaching","the limit",["nine blades, the mind at full extent","thought alone with itself at night","the furthest worry can go"]),
               ("suffering","the mind",["anxiety at its loudest","the wound rehearsed in the dark","fear outrunning any fact"])],
("swords",10): [("finishing","the argument",["ten blades and nothing left to cut","the thought carried to its end","conclusion that empties the field"]),
                ("ending","it",["the worst of it now behind","collapse that at least completes","the bottom, and therefore the turn"])],

("pents",1): [("holding","the coin",["one denier, whole and heavy","matter offered to the hand","substance before it is spent"]),
              ("receiving","the means",["the resource that makes it possible","health, money, ground, a start","something real to build on"])],
("pents",2): [("turning","the two",["two coins kept in motion","resources juggled, not settled","the balance that requires attention"]),
              ("managing","both",["making the ends meet","flexibility under real constraint","keeping two things going at once"])],
("pents",3): [("setting","the stone",["three coins forming a base","skill applied to material","the first solid result"]),
              ("working","the craft",["competence recognised by others","the trade being learned properly","labour that shows in the object"])],
("pents",4): [("squaring","the holding",["four coins, one at each corner","possession given a firm shape","matter locked into place"]),
              ("keeping","it",["security tightly held","saving, or hoarding, depending","the grip that steadies and stiffens"])],
("pents",5): [("unsettling","the ground",["the fifth coin breaks the square","material security disturbed","the floor moving underfoot"]),
              ("going","without",["want that is plainly physical","the cold outside the wall","need that cannot be argued with"])],
("pents",6): [("evening","the shares",["six coins in fair proportion","giving and receiving in balance","material exchange that works"]),
              ("sharing","out",["generosity with the accounts open","help given without a hook","fairness made practical"])],
("pents",7): [("waiting","on growth",["seven coins, the count not final","the crop still in the ground","patience with something material"]),
              ("assessing","the return",["was the effort worth the yield","the long look at slow progress","judgement held until harvest"])],
("pents",8): [("ordering","the work",["eight coins in steady arrangement","the same task done well repeatedly","structure that produces reliably"]),
              ("practising","daily",["craft built by repetition","the unglamorous middle of mastery","skill compounding quietly"])],
("pents",9): [("gathering","the yield",["nine coins, the suit at full extent","material sufficiency reached","the garden grown and enjoyed alone"]),
              ("standing","secure",["independence actually achieved","comfort earned rather than given","enough, and knowing it"])],
("pents",10): [("completing","the estate",["ten coins, more than one life needs","wealth passing beyond the owner","the account that outlives you"]),
               ("providing","onward",["family, legacy, the long term","stability built for other people","what remains after you"])],
}

# ---- courts ------------------------------------------------------------
# (rank, suit) -> [(lead, key, [subs]) x3]
RANKS = {11: "valet", 12: "cavalier", 13: "reyne", 14: "roy"}

COURT = {
("wands",11): [("learning","the fire",["apprenticed to your own energy","enthusiasm without technique yet","the messenger carrying good news"]),
               ("starting","eagerly",["willing before being able","the first job taken seriously","keenness that will need shaping"]),
               ("bringing","word",["news that starts something","the spark handed to someone else","an opening announced"])],
("wands",12): [("riding","out",["the quest taken up at speed","energy given a direction","movement as the whole answer"]),
               ("charging","forward",["commitment made at a gallop","boldness ahead of planning","the departure that will not wait"]),
               ("pressing","on",["momentum that carries others","haste that mostly works","adventure entered willingly"])],
("wands",13): [("holding","the flame inward",["fire mastered by being felt","warmth that draws people in","authority held without display"]),
               ("knowing","your own heat",["desire understood, not obeyed","confidence rooted in self-knowledge","magnetism that is simply presence"]),
               ("sustaining","others",["the fire that lights other fires","encouragement given generously","warmth as a form of rule"])],
("wands",14): [("ruling","by will",["fire turned into command","vision that others follow","authority with heat behind it"]),
               ("directing","the work",["the enterprise led from the front","decisions made and owned","leadership as applied energy"]),
               ("burning","steadily",["force that has learned its pace","power that no longer proves itself","the fire kept usefully banked"])],

("cups",11): [("learning","the water",["apprenticed to your own feeling","tenderness without defences","the messenger bringing affection"]),
              ("opening","first",["offering the heart before it is safe","sincerity ahead of experience","willingness to be affected"]),
              ("bringing","an offer",["the invitation extended","feeling put into words","a gesture made without cover"])],
("cups",12): [("riding","toward",["the quest undertaken for love","feeling given a destination","approach made in good faith"]),
              ("courting","openly",["the proposal carried in person","romance as a journey outward","devotion that travels"]),
              ("following","the heart",["direction chosen by feeling","the pursuit of what moves you","commitment on the move"])],
("cups",13): [("holding","the deep",["feeling mastered by being felt through","emotion held without spilling","the still water that goes down far"]),
              ("knowing","the currents",["empathy that reads accurately","understanding without needing told","intuition as practised skill"]),
              ("containing","others",["the vessel people can pour into","compassion with real capacity","care that does not drown"])],
("cups",14): [("ruling","by feeling",["water turned into authority","governing with the heart involved","power exercised kindly"]),
              ("holding","the cup steady",["emotion mastered under pressure","calm that steadies a room","maturity in the feeling life"]),
              ("presiding","warmly",["leadership people trust","the diplomat's instinct","authority that stays humane"])],

("swords",11): [("learning","the blade",["apprenticed to your own mind","sharpness without judgement yet","the messenger carrying hard news"]),
                ("watching","closely",["curiosity that misses nothing","vigilance ahead of wisdom","the questions asked too directly"]),
                ("bringing","word",["the fact delivered plainly","information that changes things","truth handed over unsoftened"])],
("swords",12): [("riding","in",["the argument entered at speed","intellect on the attack","decisiveness that does not pause"]),
                ("cutting","through",["complications solved by force of mind","directness as a method","the charge that clears the ground"]),
                ("acting","at once",["thought converted straight to action","haste that is sometimes right","conviction moving fast"])],
("swords",13): [("holding","the edge inward",["mind mastered by being examined","clarity earned through experience","perception that has cost something"]),
                ("seeing","exactly",["the eye that is not fooled","honesty with herself first","judgement refined by loss"]),
                ("speaking","cleanly",["truth said without cruelty","precision as a kindness","the word that ends the confusion"])],
("swords",14): [("ruling","by law",["mind turned into authority","principle applied consistently","power that answers to reason"]),
                ("deciding","finally",["the judgement that settles it","clarity brought to bear","the buck stopping properly"]),
                ("holding","the standard",["integrity as an office","fairness maintained under pressure","law above preference"])],

("pents",11): [("learning","the ground",["apprenticed to something practical","study with a real object","the messenger with an opportunity"]),
               ("beginning","carefully",["the first honest work","patience unusual in a beginner","willingness to start small"]),
               ("bringing","the offer",["the opening that has substance","news of something solid","a chance worth examining"])],
("pents",12): [("riding","steadily",["the quest undertaken at a walk",  "progress that will not be hurried","reliability as the whole method"]),
               ("labouring","on",["the long haul accepted","persistence without drama","the field ploughed to the end"]),
               ("carrying","through",["what is started gets finished","dependability as a virtue","slow motion that arrives"])],
("pents",13): [("holding","the earth inward",["matter mastered by being tended","practical wisdom worn lightly","the hand that knows the soil"]),
               ("keeping","the household",["resources managed without fuss","comfort made for other people","abundance quietly maintained"]),
               ("growing","things",["care that makes things thrive","fertility in the ordinary sense","the garden as a way of thinking"])],
("pents",14): [("ruling","by substance",["earth turned into authority","wealth that carries obligation","power grounded in real things"]),
               ("providing","reliably",["the estate kept in good order","security extended to others","stewardship as leadership"]),
               ("building","to last",["what is made outlasts the maker","patience at the scale of decades","solidity as a legacy"])],
}

# ---- reversed: the four angles for numbers, ranks, and suits ----------
# The reversed reading is composed: the number (or rank) supplies the
# shape of the failure, the suit supplies what is failing.
NUMBER_REV = {
 1: ("the seed", ["potential that will not germinate", "the gift declined", "a beginning that keeps not starting", "the offer left on the table"],
     ["potential hoarded as identity", "the start endlessly rehearsed", "possibility preferred to actuality", "keeping the gift unopened"],
     ["squandering what was given freely", "the seed spent on nothing", "beginning in order never to finish", "wasting a genuine opening"],
     ["the seed still under the soil", "germination on its own schedule", "the beginning not yet due", "potential waiting for its season"]),
 2: ("the pair", ["the bond thinning", "exchange that has gone one-way", "relation losing its charge", "two drifting out of contact"],
     ["union sought to avoid being one", "pairing as a hiding place", "the other used as a mirror", "relation that erases both"],
     ["the bond kept for leverage", "dependency dressed as devotion", "tying another to your lack", "partnership as quiet control"],
     ["the meeting not yet made", "the pair still forming", "connection arriving late", "the second half still on its way"]),
 3: ("the issue", ["growth that stalls early", "the result thinner than hoped", "expression losing its nerve", "the third not quite arriving"],
     ["output produced for the look of it", "growth pursued past its use", "expression as performance", "fruit forced before ripening"],
     ["creating in order to be admired", "the work exploiting its makers", "growth that consumes its ground", "fertility turned to excess"],
     ["the result still forming", "expression finding its shape", "growth on a slow schedule", "the third not yet born"]),
 4: ("the square", ["the structure loosening", "stability with a crack in it", "the enclosure less firm than it looks", "order beginning to slip"],
     ["walls kept after the need has passed", "stability defended as an identity", "the pause become permanent", "structure serving only itself"],
     ["the enclosure used to shut others out", "security bought with rigidity", "hoarding disguised as prudence", "order enforced without reason"],
     ["the structure still being built", "stability not yet reached", "the square not yet closed", "consolidation still under way"]),
 5: ("the break", ["disruption that will not resolve", "the disturbance dragging on", "instability become the norm", "the pivot stuck mid-turn"],
     ["conflict maintained on purpose", "crisis preferred to settlement", "the break made into a home", "disruption as an identity"],
     ["breaking things to feel the movement", "the wound kept deliberately open", "crisis manufactured for advantage", "harm passed on down the line"],
     ["the disruption still working through", "the break not yet healed", "movement that has further to go", "resolution some way off"]),
 6: ("the balance", ["harmony that will not quite hold", "exchange slightly off true", "the middle wobbling", "proportion drifting"],
     ["balance kept by suppressing one side", "harmony that forbids disagreement", "the peace of not speaking", "evenness enforced, not found"],
     ["fairness used to avoid generosity", "the exchange rigged and called even", "harmony demanded of others only", "balance as a way to withhold"],
     ["the balance still being found", "the exchange not yet even", "harmony arriving gradually", "the middle still being located"]),
 7: ("the trial", ["effort losing its edge", "resistance wearing you down", "the test dragging past its point", "strain without progress"],
     ["difficulty sought to prove something", "the trial extended on purpose", "struggle as a badge", "hardship mistaken for merit"],
     ["making it hard for everyone else", "the fight picked for its own sake", "effort that damages the effort", "grinding past all usefulness"],
     ["the trial not yet finished", "the test still being sat", "resolution the far side of effort", "the strain still to be borne"]),
 8: ("the order", ["the arrangement slipping", "structure under more load than it takes", "pattern beginning to fray", "organisation losing its grip"],
     ["order kept past its usefulness", "structure that has forgotten its purpose", "arrangement as a form of control", "the system serving itself"],
     ["order imposed regardless of cost", "efficiency above every other thing", "the pattern enforced on people", "structure used to exclude"],
     ["the order still being assembled", "structure not yet holding", "arrangement still being tested", "the pattern still emerging"]),
 9: ("the fullness", ["the height not quite reached", "sufficiency that does not satisfy", "fullness with something missing", "the summit thinning out"],
     ["completeness defended in solitude", "self-sufficiency as a wall", "fullness that refuses company", "having, and hiding it"],
     ["abundance used to keep others out", "solitude at the top made a virtue", "hoarding the view", "sufficiency that excludes"],
     ["the fullness still filling", "the height still being climbed", "sufficiency near but not here", "the last stretch remaining"]),
 10: ("the overflow", ["completion tipping into too much", "the container failing", "surplus becoming burden", "the end that will not end"],
      ["completion refused so it can continue", "the surplus kept from circulating", "ending avoided by adding more", "excess mistaken for success"],
      ["overflow dumped onto other people", "hoarding at the point of plenty", "the weight passed down the line", "surplus that crushes its holder"],
      ["the cycle still closing", "the return to one still coming", "completion on its final approach", "the overflow not yet released"]),
}

RANK_REV = {
 11: ("the apprentice", ["eagerness without follow-through", "study that will not settle", "the message half-delivered", "keenness thinning quickly"],
      ["beginning endlessly to avoid mastering", "the student role kept too long", "curiosity as a way of not committing", "learning performed, not done"],
      ["the messenger who distorts the message", "immaturity used as an excuse", "talent squandered on distraction", "promise traded on indefinitely"],
      ["the apprenticeship still running", "skill still being gathered", "the message still on its way", "readiness not yet arrived"]),
 12: ("the quest", ["momentum draining", "the ride losing its direction", "commitment that will not hold pace", "the journey stalling"],
      ["movement chosen to avoid arriving", "the quest as a way of leaving", "speed mistaken for progress", "riding past what you wanted"],
      ["charging over other people", "recklessness with someone else's ground", "the journey that ruins what it crosses", "haste made into a virtue"],
      ["the ride still under way", "arrival further off than it looked", "the quest mid-course", "the destination still ahead"]),
 13: ("the inward hold", ["mastery that is costing effort", "depth harder to reach than usual", "the inner grip loosening", "composure thinning"],
      ["interiority used to stay unreachable", "depth as a way of withholding", "understanding kept private on principle", "the vessel that never pours"],
      ["reading others in order to manage them", "empathy turned to advantage", "inwardness that swallows other people", "depth used to dominate quietly"],
      ["the mastery still forming", "depth still being earned", "the inward work unfinished", "understanding still gathering"]),
 14: ("the rule", ["authority losing its weight", "command that no longer carries", "the office held loosely", "power thinning at the edges"],
      ["rule maintained for its own sake", "authority that has stopped serving", "the office mistaken for the person", "governing to remain governor"],
      ["power used because it is available", "the rule enforced without care", "authority that permits no successor", "command as appetite"],
      ["the authority still being earned", "the office not yet fully held", "rule arriving with experience", "power still consolidating"]),
}

# What each suit is made of — supplies the noun for the Negative stanza,
# so the shadow is named in the suit's own material.
SUIT_REV_WORD = {
 "wands":  "the fire",
 "cups":   "the water",
 "swords": "the blade",
 "pents":  "the ground",
}

# Each of the four reversed angles gets its OWN key, the way the trumps do
# — repeating one key down all four stanzas reads as a template.
# (Weakened, Inverted, Delayed); Negative takes the suit word above.
NUMBER_REV_KEYS = {
 1:  ("the seed", "beginning", "germination"),
 2:  ("the pair", "union", "the meeting"),
 3:  ("the issue", "growth", "the result"),
 4:  ("the square", "stability", "consolidation"),
 5:  ("the break", "disruption", "resolution"),
 6:  ("the balance", "harmony", "the exchange"),
 7:  ("the trial", "the struggle", "the outcome"),
 8:  ("the order", "structure", "the pattern"),
 9:  ("the fullness", "sufficiency", "the summit"),
 10: ("the overflow", "completion", "the return"),
}
RANK_REV_KEYS = {
 11: ("the apprentice", "learning", "readiness"),
 12: ("the quest", "the ride", "arrival"),
 13: ("the inward hold", "depth", "mastery"),
 14: ("the rule", "authority", "the office"),
}
