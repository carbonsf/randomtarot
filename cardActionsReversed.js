// Hand-written reversed-meaning data for all 78 cards. Used by the info
// overlay when a card has resolved to a reversed state at the end of
// the glitch sequence.
//
// Structure: each card has 4 stanzas — Weakened / Inverted / Negative /
// Delayed — with 4 sub-meanings each. The four angles, per the user's
// brief:
//
//   Weakened: the card's core meaning is dimmed, drained, or overpowered
//             by external forces.
//   Inverted: the card expresses the opposite, inverse, or "unfinished
//             business" of its upright meaning.
//   Negative: the seeker is experiencing a negative influence or is
//             subconsciously hijacking their own progress.
//   Delayed : the events or lessons haven't fully materialized yet.
//
// The "lead" word stays constant across cards (so the section reads as
// four labeled angles), and the "key" word is card-specific so the
// rendered headline ("Weakened innocence", "Inverted skill", etc.)
// names what's affected in this particular card. Subs are written in
// the same lowercase, verb-first / observation-style voice as the
// upright cardActions.js.
const CARD_ACTIONS_REVERSED = {
  "maj00": [
    {"lead": "Weakened", "key": "innocence", "subs": ["leap that hesitates at the edge", "the new beginning that doesn't quite begin", "trust flinching at the last moment", "wonder dulled by yesterday's caution"]},
    {"lead": "Inverted", "key": "spontaneity", "subs": ["calculation where there was abandon", "the careful step replacing the leap", "weight where there was lightness", "rehearsing the journey until you don't take it"]},
    {"lead": "Negative", "key": "impulse", "subs": ["leaping for the rush, not the call", "mistaking carelessness for courage", "fool's errand made literal", "running from rather than toward"]},
    {"lead": "Delayed", "key": "beginning", "subs": ["the day before you go", "still packing what you don't need", "almost ready to be ready", "the gathering before the first true step"]}
  ],
  "maj01": [
    {"lead": "Weakened", "key": "will", "subs": ["power without traction", "skill that won't quite catch", "tools that don't speak to one another", "the gesture without the spark"]},
    {"lead": "Inverted", "key": "skill", "subs": ["skill turned to sleight", "speaking to convince rather than to mean", "polished surface, hollow center", "showing all sleeve, no card in hand"]},
    {"lead": "Negative", "key": "power", "subs": ["using the tools to deceive", "tricking yourself you've already done it", "performance instead of practice", "claiming the title before earning the craft"]},
    {"lead": "Delayed", "key": "manifestation", "subs": ["the act before the doing", "preparation that postpones", "knowing how, not yet how-now", "magic still waking up under the table"]}
  ],
  "maj02": [
    {"lead": "Weakened", "key": "intuition", "subs": ["intuition that flickers and goes quiet", "the inner voice on a frequency you can't tune", "knowing dulled by needing proof", "stillness disturbed before it deepens"]},
    {"lead": "Inverted", "key": "mystery", "subs": ["secrets that leak before their time", "mystery turned into mere withholding", "the surface where there used to be depth", "intuition mistrusted into noise"]},
    {"lead": "Negative", "key": "knowing", "subs": ["performing wisdom you don't yet have", "hiding from what you already know", "using mystery to manipulate", "claiming insight you haven't earned"]},
    {"lead": "Delayed", "key": "revelation", "subs": ["the answer still forming", "patience the only doorway", "wait, still, until the voice returns", "truth on slow approach"]}
  ],
  "maj03": [
    {"lead": "Weakened", "key": "abundance", "subs": ["fullness that won't quite spill", "nurturing exhausted from the giving", "earth that's tired this season", "creativity blocked at the root"]},
    {"lead": "Inverted", "key": "nurture", "subs": ["smothering where there was support", "giving that asks for itself back", "fertility turned to overgrowth", "care that subsumes rather than holds"]},
    {"lead": "Negative", "key": "comfort", "subs": ["hiding in comfort", "over-mothering the work", "luxury as anesthetic", "abundance that smothers the call to grow"]},
    {"lead": "Delayed", "key": "bloom", "subs": ["the gestation still gestating", "soil still warming for the seed", "fullness on its way but not yet arrived", "nature taking longer than you'd like"]}
  ],
  "maj04": [
    {"lead": "Weakened", "key": "authority", "subs": ["command without the room behind it", "structure that won't hold its corners", "stability you can't quite stand on", "boundaries softer than they should be"]},
    {"lead": "Inverted", "key": "structure", "subs": ["control turned to rigidity", "law without mercy", "order calcified into stuckness", "fatherhood as dominion rather than guardianship"]},
    {"lead": "Negative", "key": "control", "subs": ["tyranny dressed as protection", "claiming authority you haven't earned", "squeezing what should breathe", "leadership that punishes the soft"]},
    {"lead": "Delayed", "key": "sovereignty", "subs": ["the throne still being built", "authority still arriving in you", "structure mid-construction", "a kingdom not yet recognized"]}
  ],
  "maj05": [
    {"lead": "Weakened", "key": "tradition", "subs": ["rites that no longer reach", "teaching mouthed without meaning", "institution lost in its own corridors", "the lineage frayed at the edge"]},
    {"lead": "Inverted", "key": "teaching", "subs": ["dogma where there was wisdom", "instruction that won't hear the student", "the form without the spirit", "convention strangling its own meaning"]},
    {"lead": "Negative", "key": "orthodoxy", "subs": ["hiding in rules", "using tradition to shame", "belonging only by belief", "spirituality as social proof"]},
    {"lead": "Delayed", "key": "initiation", "subs": ["the rite still ahead", "teacher not yet appearing", "the door before the door", "belonging still unfolding"]}
  ],
  "maj06": [
    {"lead": "Weakened", "key": "bond", "subs": ["connection that won't hold its current", "union missing one of its yeses", "alignment off by a quiet degree", "partnership tired before it's begun"]},
    {"lead": "Inverted", "key": "choice", "subs": ["choosing without conviction", "the decision that picks itself", "a union of avoidance rather than embrace", "values negotiated until they vanish"]},
    {"lead": "Negative", "key": "attraction", "subs": ["drawn to what undoes you", "partnership as escape from yourself", "commitment by compulsion", "choosing the easier wrong"]},
    {"lead": "Delayed", "key": "union", "subs": ["the meeting deferred", "hearts on slow approach", "alignment forming but not yet sealed", "the choice still ripening"]}
  ],
  "maj07": [
    {"lead": "Weakened", "key": "will", "subs": ["drive without traction", "direction unclear under the harness", "momentum that stalls at the gate", "two horses pulling against each other"]},
    {"lead": "Inverted", "key": "direction", "subs": ["motion in circles", "victory aimed at the wrong target", "control given to whatever's loudest", "drive without the destination"]},
    {"lead": "Negative", "key": "drive", "subs": ["pushing past every signal to stop", "mistaking force for progress", "steamrolling the people you brought along", "momentum as identity"]},
    {"lead": "Delayed", "key": "arrival", "subs": ["the journey longer than the map", "the finish line moves as you near", "the road still ahead even after years", "victory not yet at hand"]}
  ],
  "maj08": [
    {"lead": "Weakened", "key": "courage", "subs": ["gentleness eroded by exhaustion", "inner fire turned down to embers", "patience that finally runs out", "softness that can no longer hold the lion"]},
    {"lead": "Inverted", "key": "gentleness", "subs": ["force where there should be touch", "handling the lion roughly", "power without kindness", "strength mistaking itself for the only answer"]},
    {"lead": "Negative", "key": "power", "subs": ["bullying disguised as confidence", "suppressing rather than befriending the animal", "using your strength on those weaker", "fierceness directed inward as self-cruelty"]},
    {"lead": "Delayed", "key": "mastery", "subs": ["the lion still being learned", "the soft hand still being trained", "courage not yet rooted", "strength still in the apprenticeship"]}
  ],
  "maj09": [
    {"lead": "Weakened", "key": "wisdom", "subs": ["insight you can't quite reach", "solitude that becomes mere isolation", "the lantern dim against the cave", "inner guidance audible but unspecific"]},
    {"lead": "Inverted", "key": "introspection", "subs": ["hiding instead of contemplating", "withdrawal that calcifies", "examining without conclusion", "inward gaze turned into mirror obsession"]},
    {"lead": "Negative", "key": "isolation", "subs": ["cutting yourself off and calling it wisdom", "using solitude to avoid", "loneliness misnamed depth", "hoarding insight you won't share"]},
    {"lead": "Delayed", "key": "insight", "subs": ["the lesson still gathering in the dark", "the answer in a chamber you haven't entered", "wisdom on its long approach", "the mountain still being climbed"]}
  ],
  "maj10": [
    {"lead": "Weakened", "key": "fortune", "subs": ["turning that won't quite turn", "luck on a delay", "the moment of change muffled", "momentum stalled at the apex"]},
    {"lead": "Inverted", "key": "cycle", "subs": ["the same season again", "progress that loops without advancing", "fate misread as choice", "change cosmetic only"]},
    {"lead": "Negative", "key": "fate", "subs": ["blaming the wheel for what you steer", "waiting for luck instead of acting", "surrender that's really resignation", "superstition replacing agency"]},
    {"lead": "Delayed", "key": "turn", "subs": ["the wheel paused at the worst notch", "the shift you're expecting still ahead", "fortune slow this round", "the turning point not yet here"]}
  ],
  "maj11": [
    {"lead": "Weakened", "key": "justice", "subs": ["truth muddied by the telling", "the balance leaning unseen", "accountability deferred to no one", "fairness contested where it should be plain"]},
    {"lead": "Inverted", "key": "fairness", "subs": ["truth weaponized", "justice as revenge wearing robes", "scales tipped by who's measuring", "accounting that punishes the wrong column"]},
    {"lead": "Negative", "key": "judgment", "subs": ["judging others to escape yourself", "weaponizing principle", "claiming the moral high without doing the work", "using the scales as a cudgel"]},
    {"lead": "Delayed", "key": "verdict", "subs": ["the case still open", "the reckoning postponed", "accountability arriving in its own time", "truth still being told"]}
  ],
  "maj12": [
    {"lead": "Weakened", "key": "surrender", "subs": ["letting go that won't quite release", "new perspective half-seen", "the pause uncomfortable rather than fertile", "suspension without insight"]},
    {"lead": "Inverted", "key": "perspective", "subs": ["martyrdom for show", "sacrifice that resents itself", "surrender mistaken for victimhood", "hanging without learning"]},
    {"lead": "Negative", "key": "suspension", "subs": ["hiding upside-down to avoid choosing", "waiting as a way of refusing", "using stillness as protest", "spiritual bypass dressed as pause"]},
    {"lead": "Delayed", "key": "insight", "subs": ["the new view still forming", "the lesson of the pause still unspoken", "the inversion not yet revealing its gift", "wisdom in slow arrival"]}
  ],
  "maj13": [
    {"lead": "Weakened", "key": "transformation", "subs": ["ending that won't quite end", "death that hovers without completing", "the page turning halfway", "release stalling on the threshold"]},
    {"lead": "Inverted", "key": "release", "subs": ["clinging where life is asking you to let go", "holding the husk and calling it the seed", "fighting the death of a self already gone", "refusing the new because the old still has shape"]},
    {"lead": "Negative", "key": "ending", "subs": ["forcing endings to feel powerful", "using endings as escape", "the abrupt cut where care was needed", "killing what could have changed"]},
    {"lead": "Delayed", "key": "rebirth", "subs": ["the new self still in the chrysalis", "what's dying still has weeks", "rebirth requires more time than you'd like", "the next form not yet ready"]}
  ],
  "maj14": [
    {"lead": "Weakened", "key": "balance", "subs": ["the blend that won't quite mix", "patience worn thin", "moderation as compromise nobody likes", "the alchemy off by a degree"]},
    {"lead": "Inverted", "key": "moderation", "subs": ["tepid where there should be heat", "equilibrium that resists all motion", "balance as refusal to choose", "dilution mistaken for harmony"]},
    {"lead": "Negative", "key": "restraint", "subs": ["holding back what should be expressed", "using moderation to avoid feeling fully", "the middle as a hiding place", "patience that calcifies into never"]},
    {"lead": "Delayed", "key": "harmony", "subs": ["ingredients still combining", "the alchemy taking longer than expected", "patience the price of the gold", "equilibrium still settling"]}
  ],
  "maj15": [
    {"lead": "Weakened", "key": "grip", "subs": ["the chains looser than they look but heavy enough", "the appetite louder than the body", "shadow leaking through control", "temptation half-resisted, half-indulged"]},
    {"lead": "Inverted", "key": "bondage", "subs": ["choosing the chain because the freedom would terrify", "pretending the chain is the relationship", "convincing yourself wanting equals having", "bondage worn as identity"]},
    {"lead": "Negative", "key": "shadow", "subs": ["feeding what feeds on you", "dressing addiction in choice", "using craving to avoid the deeper hunger", "mistaking compulsion for desire"]},
    {"lead": "Delayed", "key": "liberation", "subs": ["the chain still rusting", "the moment of release not yet at hand", "the keys you have, not yet turned", "freedom on slow approach"]}
  ],
  "maj16": [
    {"lead": "Weakened", "key": "collapse", "subs": ["the structure cracking but still standing", "revelation arriving in pieces", "the awakening half-asleep", "crisis postponed by sheer will"]},
    {"lead": "Inverted", "key": "destruction", "subs": ["the demolition that should have happened, didn't", "clinging to the tower as it tilts", "revelation refused", "the lightning bolt absorbed and re-routed"]},
    {"lead": "Negative", "key": "crisis", "subs": ["courting catastrophe for the drama", "lighting your own tower", "blaming the storm you summoned", "mistaking destruction for change"]},
    {"lead": "Delayed", "key": "revelation", "subs": ["the truth still working its way through the walls", "the collapse you can feel but haven't seen", "the moment of awakening on its slow arrival", "lightning gathering above without striking"]}
  ],
  "maj17": [
    {"lead": "Weakened", "key": "hope", "subs": ["faith dimmed by the long night", "inspiration arriving in trickles", "serenity that won't quite settle", "the star visible but distant"]},
    {"lead": "Inverted", "key": "faith", "subs": ["hope as denial of the present", "inspiration without practice to receive it", "spiritual bypass dressed as calm", "serenity that refuses grief"]},
    {"lead": "Negative", "key": "wishfulness", "subs": ["waiting on the star instead of walking under it", "hope used to avoid effort", "serenity claimed before earned", "inspiration borrowed but not lived"]},
    {"lead": "Delayed", "key": "renewal", "subs": ["the well still filling", "the long night not yet over", "the star still rising", "renewal asking for more patience"]}
  ],
  "maj18": [
    {"lead": "Weakened", "key": "sight", "subs": ["clarity fogged by what you fear", "the dream half-remembered, half-distorted", "intuition speaking through static", "shadows that won't resolve"]},
    {"lead": "Inverted", "key": "illusion", "subs": ["the fear that turns out to be only fear", "monsters made larger by the looking", "certainty conjured from shadows", "the moon mistaken for the sun"]},
    {"lead": "Negative", "key": "dread", "subs": ["feeding the fears for the company of them", "using the dream as alibi", "lost in shadow you actively walk into", "mistaking anxiety for insight"]},
    {"lead": "Delayed", "key": "clarity", "subs": ["dawn still hours off", "the dream still encoding itself", "what the moon will show, not yet shown", "waiting on the tide"]}
  ],
  "maj19": [
    {"lead": "Weakened", "key": "radiance", "subs": ["joy that can't quite catch", "warmth that doesn't reach the corners", "vitality asking for rest", "a sun behind the long cloud"]},
    {"lead": "Inverted", "key": "clarity", "subs": ["brightness used to flatten", "clarity that erases nuance", "the sun overexposing what should stay shaded", "naivete where there was wisdom"]},
    {"lead": "Negative", "key": "performance", "subs": ["broadcasting wellness you don't feel", "rejecting shadow", "demanding others share your sun", "blinded by your own light"]},
    {"lead": "Delayed", "key": "breakthrough", "subs": ["the morning before the sunrise", "joy that's almost-here", "the bloom still gathering", "breakthrough patiently arriving"]}
  ],
  "maj20": [
    {"lead": "Weakened", "key": "call", "subs": ["the summons heard but not answered", "reckoning that doesn't quite close", "rebirth interrupted", "the trumpet quiet at the moment you needed it"]},
    {"lead": "Inverted", "key": "reckoning", "subs": ["judgment turned on the wrong person", "awakening into more sleep", "atonement performed without change", "answering a call that wasn't yours"]},
    {"lead": "Negative", "key": "judgment", "subs": ["judging others' awakenings", "using spiritual growth as a hierarchy", "the reckoning weaponized", "hearing the call and using it to shame"]},
    {"lead": "Delayed", "key": "awakening", "subs": ["the trumpet still warming up", "the call to come still arriving", "rebirth on its own clock", "the reckoning postponed but pending"]}
  ],
  "maj21": [
    {"lead": "Weakened", "key": "completion", "subs": ["closure that won't quite close", "integration almost complete", "the journey nearly arrived", "wholeness with one piece missing"]},
    {"lead": "Inverted", "key": "fulfillment", "subs": ["arrival that feels like another departure", "completion shadowed by what was paid", "the world held but distant", "accomplishment empty in the hand"]},
    {"lead": "Negative", "key": "attainment", "subs": ["claiming wholeness before earning it", "using completion to refuse new growth", "resting in arrival as escape", "declaring done before doing"]},
    {"lead": "Delayed", "key": "culmination", "subs": ["the final step still ahead", "the synthesis still happening", "the world coming into shape", "wholeness on its long approach"]}
  ],
  "wands01": [
    {"lead": "Weakened", "key": "spark", "subs": ["the flame that won't quite catch", "inspiration arriving without traction", "new fire under wet wood", "impulse stalled at the threshold"]},
    {"lead": "Inverted", "key": "ignition", "subs": ["starting too many fires to commit to one", "the spark misread as the whole", "motion mistaken for direction", "new beginnings that mask old patterns"]},
    {"lead": "Negative", "key": "impulse", "subs": ["lighting fires to feel something", "chasing the rush of starting", "using novelty as escape", "claiming creativity without practice"]},
    {"lead": "Delayed", "key": "beginning", "subs": ["the match struck but not yet flaring", "the spark waiting for its tinder", "the impulse gathering", "fire on its slow arrival"]}
  ],
  "wands02": [
    {"lead": "Weakened", "key": "vision", "subs": ["the future seen but indistinct", "plans that won't quite shape", "the next move muffled", "horizon hazed"]},
    {"lead": "Inverted", "key": "planning", "subs": ["overthinking into paralysis", "vision narrowed to one outcome", "the map mistaken for the territory", "planning as a way to avoid moving"]},
    {"lead": "Negative", "key": "ambition", "subs": ["choosing the route that flatters you", "planning around fear", "vision driven by what others will see", "strategy as compensation"]},
    {"lead": "Delayed", "key": "move", "subs": ["the decision deferred", "the leap still being measured", "the future not yet ready to receive you", "planning ongoing"]}
  ],
  "wands03": [
    {"lead": "Weakened", "key": "expansion", "subs": ["ships sent but slow", "foresight clouded", "the wider horizon dimmed", "momentum stretched too thin"]},
    {"lead": "Inverted", "key": "foresight", "subs": ["looking far while missing the near", "vision used to escape the present", "waiting passed off as patience", "scope without depth"]},
    {"lead": "Negative", "key": "ambition", "subs": ["overreaching for the sake of the reach", "claiming territory you can't tend", "expansion driven by ego", "ships sent to prove something"]},
    {"lead": "Delayed", "key": "return", "subs": ["the ships still on the horizon", "what you sent out, not yet back", "momentum on a longer arc than expected", "expansion in slow tide"]}
  ],
  "wands04": [
    {"lead": "Weakened", "key": "harmony", "subs": ["home that won't quite feel home", "celebration performed more than felt", "foundation cracked at the corner", "milestone reached without the joy"]},
    {"lead": "Inverted", "key": "belonging", "subs": ["belonging by performance", "community without intimacy", "the threshold crossed too fast", "arrival hollowed by hurry"]},
    {"lead": "Negative", "key": "comfort", "subs": ["hiding in the celebration", "using home as escape from growth", "nostalgia weaponized", "declaring done to avoid the next room"]},
    {"lead": "Delayed", "key": "homecoming", "subs": ["the welcome still being prepared", "the milestone in sight but not at hand", "the foundation still curing", "harmony still settling"]}
  ],
  "wands05": [
    {"lead": "Weakened", "key": "struggle", "subs": ["conflict without resolution", "competition that doesn't sharpen", "friction that just exhausts", "growing pains that won't yield growth"]},
    {"lead": "Inverted", "key": "competition", "subs": ["rivalry where there should be collaboration", "scrappiness mistaken for effort", "picking fights to feel alive", "conflict as identity"]},
    {"lead": "Negative", "key": "discord", "subs": ["starting fights you can't finish", "using conflict to avoid intimacy", "hostility dressed as honesty", "friction sought for its own sake"]},
    {"lead": "Delayed", "key": "integration", "subs": ["the synthesis still ahead", "the conflict still unresolved", "the lesson still gathering from the scuffle", "growth on its way through the friction"]}
  ],
  "wands06": [
    {"lead": "Weakened", "key": "triumph", "subs": ["victory acknowledged but unfelt", "recognition arriving thin", "the parade quieter than expected", "success that doesn't quite stick"]},
    {"lead": "Inverted", "key": "recognition", "subs": ["applause for the wrong reason", "fame outpacing substance", "success that demands constant maintenance", "public acclaim hollowing private peace"]},
    {"lead": "Negative", "key": "pride", "subs": ["needing the parade to feel real", "using recognition as identity", "claiming victory still in progress", "boasting that exhausts the win"]},
    {"lead": "Delayed", "key": "acclaim", "subs": ["the recognition still arriving", "the parade not yet assembled", "acclaim on a longer schedule", "the win not yet fully visible"]}
  ],
  "wands07": [
    {"lead": "Weakened", "key": "defense", "subs": ["position you can't quite hold", "courage worn down by repeated attack", "standing ground that's slipping", "the defense thinning"]},
    {"lead": "Inverted", "key": "defensiveness", "subs": ["defending what no longer needs defending", "fortress where openness would serve", "standing ground as identity", "fighting battles already won"]},
    {"lead": "Negative", "key": "aggression", "subs": ["defensiveness disguised as principle", "picking the high ground as a weapon", "refusing input as protection", "hostility called integrity"]},
    {"lead": "Delayed", "key": "resolution", "subs": ["the attack still coming in waves", "the moment of standing still ongoing", "the courage to release still gathering", "the threshold not yet crossed"]}
  ],
  "wands08": [
    {"lead": "Weakened", "key": "speed", "subs": ["motion that won't quite arrive", "messages sent but unreceived", "momentum bleeding off in the air", "urgency without direction"]},
    {"lead": "Inverted", "key": "swiftness", "subs": ["rushing into the wrong door", "speed as avoidance of decision", "news arriving distorted by the haste", "movement that scatters"]},
    {"lead": "Negative", "key": "haste", "subs": ["outrunning the consequence", "using speed to bypass care", "impulsivity branded as decisiveness", "movement to avoid stillness"]},
    {"lead": "Delayed", "key": "message", "subs": ["the news still in transit", "the arrow loosed but slow", "the message you're expecting on its own schedule", "momentum still gathering"]}
  ],
  "wands09": [
    {"lead": "Weakened", "key": "resilience", "subs": ["the wall thinning at the watchpost", "weariness eating perseverance", "one more battle than your shoulders", "the last stand with not enough left"]},
    {"lead": "Inverted", "key": "defense", "subs": ["defending out of habit, not necessity", "standing guard at an empty gate", "perseverance hardened into paranoia", "resilience curdled into bitterness"]},
    {"lead": "Negative", "key": "vigilance", "subs": ["suspicion misnamed wisdom", "watching for enemies you've invented", "using your scars to refuse softness", "fortifying past what's healthy"]},
    {"lead": "Delayed", "key": "relief", "subs": ["the rest still ahead", "the final stand still happening", "the next phase not yet here", "the watch still required"]}
  ],
  "wands10": [
    {"lead": "Weakened", "key": "back", "subs": ["load you can't quite shed", "responsibility crushing the joy of the work", "burden carried because no one else will", "capacity exceeded weeks ago"]},
    {"lead": "Inverted", "key": "burden", "subs": ["carrying what's not yours", "making yourself indispensable to feel necessary", "refusing help as identity", "weight as proof of worth"]},
    {"lead": "Negative", "key": "responsibility", "subs": ["martyrdom dressed as duty", "refusing delegation to control", "using burden to avoid intimacy", "weight chosen for the credit"]},
    {"lead": "Delayed", "key": "release", "subs": ["the load not yet put down", "the help not yet arriving", "the relief on a longer schedule", "the door to set it down still ahead"]}
  ],
  "wands11": [
    {"lead": "Weakened", "key": "spark", "subs": ["curiosity dimmed by self-doubt", "the new interest losing its glow", "passion that won't quite ignite", "discovery muted before it begins"]},
    {"lead": "Inverted", "key": "curiosity", "subs": ["dabbling without ever going deep", "chasing novelty as escape", "starting to avoid finishing", "discovery for its own image"]},
    {"lead": "Negative", "key": "immaturity", "subs": ["passion used to avoid commitment", "curiosity weaponized as scattered focus", "discovery announced before earned", "the page playing knight"]},
    {"lead": "Delayed", "key": "discovery", "subs": ["the call not yet answered", "the spark still warming", "what you'll learn, not yet revealed", "curiosity on its slow approach"]}
  ],
  "wands12": [
    {"lead": "Weakened", "key": "drive", "subs": ["pursuit without traction", "the chase tired before arrival", "passion losing its accelerant", "motion stalling on the ridge"]},
    {"lead": "Inverted", "key": "pursuit", "subs": ["charging at the wrong target", "the chase becoming the addiction", "passion misdirected", "motion to avoid being caught"]},
    {"lead": "Negative", "key": "recklessness", "subs": ["passion that burns down what it loved", "chasing as escape from sitting", "overshoot mistaken for boldness", "leaving wreckage in the wake"]},
    {"lead": "Delayed", "key": "arrival", "subs": ["the destination further than the map", "the horse still being saddled", "momentum still building", "the gallop not yet at full"]}
  ],
  "wands13": [
    {"lead": "Weakened", "key": "radiance", "subs": ["confidence flickering when it should hold steady", "magnetism that won't quite draw", "authority self-questioned", "fire turned down by criticism"]},
    {"lead": "Inverted", "key": "magnetism", "subs": ["confidence as performance", "magnetism turned to manipulation", "warmth weaponized", "radiance that demands an audience"]},
    {"lead": "Negative", "key": "pride", "subs": ["vanity costumed as confidence", "using charisma to dominate", "authority that punishes the cool", "fire that consumes rather than warms"]},
    {"lead": "Delayed", "key": "sovereignty", "subs": ["the throne still being grown into", "the queen's voice still arriving in you", "confidence on its long ripening", "authority still settling"]}
  ],
  "wands14": [
    {"lead": "Weakened", "key": "command", "subs": ["leadership without the conviction behind it", "vision smudged at the edges", "authority hesitating", "charisma intermittent"]},
    {"lead": "Inverted", "key": "vision", "subs": ["visionary turned dictator", "big picture used to ignore the small", "charisma as a hammer", "leadership that won't share the fire"]},
    {"lead": "Negative", "key": "authority", "subs": ["ego mistaken for vision", "using charisma to override", "commanding what should be invited", "claiming throne before being asked"]},
    {"lead": "Delayed", "key": "legacy", "subs": ["the kingdom still being built", "the vision still ahead", "the leader you're becoming, not yet arrived", "command still ripening in you"]}
  ],
  "cups01": [
    {"lead": "Weakened", "key": "feeling", "subs": ["the heart half-open", "love that won't quite arrive", "emotional opening met with weather", "the cup with a small crack"]},
    {"lead": "Inverted", "key": "overflow", "subs": ["feelings hoarded rather than poured", "sealing the cup against further hurt", "new feeling refused entry", "the heart closed in the moment it should open"]},
    {"lead": "Negative", "key": "emotion", "subs": ["drama dressed as deep feeling", "using love as escape", "weaponizing vulnerability", "overflowing onto people who didn't ask"]},
    {"lead": "Delayed", "key": "arrival", "subs": ["the love still gathering", "the new feeling not yet here", "the cup still being filled", "what you're about to feel, not yet here"]}
  ],
  "cups02": [
    {"lead": "Weakened", "key": "bond", "subs": ["partnership missing one of its yeses", "exchange uneven by a small degree", "the meeting tentative", "connection that won't quite click"]},
    {"lead": "Inverted", "key": "union", "subs": ["connection misread as more than it is", "exchange becoming transaction", "partnership of convenience", "the meeting that fades"]},
    {"lead": "Negative", "key": "dependency", "subs": ["needing the other to feel whole", "using partnership to avoid self", "connection as merger that erases", "love by trade"]},
    {"lead": "Delayed", "key": "meeting", "subs": ["the meeting still ahead", "the recognition still forming", "partnership ripening over more time than hoped", "the moment of yes on its own clock"]}
  ],
  "cups03": [
    {"lead": "Weakened", "key": "joy", "subs": ["gathering that doesn't quite gather", "celebration thinned by absence", "friendship strained at the edges", "community fraying"]},
    {"lead": "Inverted", "key": "gathering", "subs": ["celebration as performance for outsiders", "friendship that excludes", "community as identity rather than care", "joy on display only"]},
    {"lead": "Negative", "key": "excess", "subs": ["indulgence as escape", "celebration to avoid the work", "friendship that flatters but doesn't tell", "community as echo chamber"]},
    {"lead": "Delayed", "key": "reunion", "subs": ["the gathering still to come", "the friends not yet arrived", "the celebration on a slower timeline", "the toast still ahead"]}
  ],
  "cups04": [
    {"lead": "Weakened", "key": "attention", "subs": ["focus that won't quite settle", "contemplation curdled into apathy", "the offered cup unseen", "interest at half mast"]},
    {"lead": "Inverted", "key": "contemplation", "subs": ["brooding rather than reflecting", "withdrawal that hardens", "contemplation as refusal of the new", "the apple in front of you, unbitten"]},
    {"lead": "Negative", "key": "apathy", "subs": ["numbness chosen", "using boredom as superiority", "refusing the offered as principle", "withdrawal weaponized"]},
    {"lead": "Delayed", "key": "awakening", "subs": ["the new cup not yet visible", "the moment of yes still gathering", "the offer still pending", "interest still warming"]}
  ],
  "cups05": [
    {"lead": "Weakened", "key": "grief", "subs": ["sorrow that won't quite name itself", "mourning that hasn't begun", "loss carried but unprocessed", "sadness held without permission"]},
    {"lead": "Inverted", "key": "mourning", "subs": ["ruminating on the spilled cups while ignoring the standing two", "loss made identity", "grief frozen rather than moving", "regret as orientation"]},
    {"lead": "Negative", "key": "dwelling", "subs": ["refusing to lift the eyes", "using sorrow as alibi", "wearing the grief to avoid the next step", "making sorrow into proof of love"]},
    {"lead": "Delayed", "key": "healing", "subs": ["the mourning not yet begun", "the loss still arriving in waves", "acceptance on a much longer timeline", "the cups still being lifted"]}
  ],
  "cups06": [
    {"lead": "Weakened", "key": "nostalgia", "subs": ["memory dimming at the edges", "the childhood scene losing color", "the return home that doesn't feel like home", "kindness recalled but not received"]},
    {"lead": "Inverted", "key": "memory", "subs": ["idealizing what was hard", "the past polished into a weapon", "regression dressed as innocence", "nostalgia as refusal of the present"]},
    {"lead": "Negative", "key": "escape", "subs": ["hiding in the past", "using memory to avoid the now", "childhood replayed to refuse adulthood", "sweetness as anesthetic"]},
    {"lead": "Delayed", "key": "reunion", "subs": ["the return not yet possible", "the innocence reclaimable, not yet reclaimed", "the moment of kindness still ahead", "childhood reckoning still pending"]}
  ],
  "cups07": [
    {"lead": "Weakened", "key": "focus", "subs": ["choices fogged by want", "fantasy thinner than usual", "possibility multiplying into nothing", "desire scattered"]},
    {"lead": "Inverted", "key": "possibility", "subs": ["fantasy mistaken for plan", "choosing the dream over the work", "illusion confused for guidance", "wishing as method"]},
    {"lead": "Negative", "key": "fantasy", "subs": ["using daydream as escape from action", "hoarding options to avoid commitment", "fantasy that prevents the real", "desire weaponized into delay"]},
    {"lead": "Delayed", "key": "clarity", "subs": ["the cups still in the cloud", "discernment still arriving", "the right one not yet visible", "the path not yet through"]}
  ],
  "cups08": [
    {"lead": "Weakened", "key": "departure", "subs": ["leaving you can't quite leave", "the call to go heard but not heeded", "the journey hesitating at the gate", "the walk away with one foot still on the threshold"]},
    {"lead": "Inverted", "key": "leaving", "subs": ["leaving the same situation again", "mistaking departure for change", "running from rather than toward", "the journey as escape, not pilgrimage"]},
    {"lead": "Negative", "key": "flight", "subs": ["leaving the work for someone else", "departure as avoidance", "using 'I need more' to never settle", "walking away as identity"]},
    {"lead": "Delayed", "key": "pilgrimage", "subs": ["the leaving still being prepared", "the call to go still forming", "the journey not yet beginning", "what's calling, not yet clear"]}
  ],
  "cups09": [
    {"lead": "Weakened", "key": "satisfaction", "subs": ["the wish granted but flat", "contentment that doesn't quite settle", "comfort with a draft", "the cups full but somehow not enough"]},
    {"lead": "Inverted", "key": "contentment", "subs": ["comfort as stagnation", "satisfaction that excludes others", "the wish granted at the wrong cost", "the smile that doesn't reach"]},
    {"lead": "Negative", "key": "complacency", "subs": ["smugness dressed as gratitude", "using comfort to avoid growth", "satisfaction broadcast for the approval", "the wish that traps you"]},
    {"lead": "Delayed", "key": "arrival", "subs": ["the satisfaction still arriving", "the wish in transit", "fulfillment on its own schedule", "the moment of 'enough' still ahead"]}
  ],
  "cups10": [
    {"lead": "Weakened", "key": "happiness", "subs": ["harmony with hairline cracks", "the family painting beautiful from far away", "lasting joy beginning to weather", "fulfillment that flickers"]},
    {"lead": "Inverted", "key": "family", "subs": ["the picture you posted instead of the room you live in", "harmony enforced rather than felt", "fulfillment that depends on the others performing", "lasting happiness held against itself"]},
    {"lead": "Negative", "key": "idealization", "subs": ["posting the photo to convince yourself", "using 'family' to bypass conflict", "lasting happiness as a brand", "harmony as a cage"]},
    {"lead": "Delayed", "key": "homecoming", "subs": ["the family still being built", "the lasting peace still becoming", "the harmony in slow weave", "the picture still being painted"]}
  ],
  "cups11": [
    {"lead": "Weakened", "key": "sensitivity", "subs": ["feeling muted at the source", "the gentle message half-sent", "dream half-remembered", "sweetness that won't quite arrive"]},
    {"lead": "Inverted", "key": "innocence", "subs": ["feelings performed for sympathy", "sensitivity weaponized", "sweetness as manipulation", "the page playing wounded"]},
    {"lead": "Negative", "key": "idealism", "subs": ["refusing maturity in the name of feeling", "using emotional language as shield", "sweet performance hiding self-absorption", "dreams that demand others tend them"]},
    {"lead": "Delayed", "key": "feeling", "subs": ["the message still composing", "the dream still forming", "first feelings still being met", "the kindness still on its way"]}
  ],
  "cups12": [
    {"lead": "Weakened", "key": "ardor", "subs": ["charm with the volume turned down", "romance that won't quite arrive", "idealism flickering", "the gesture half-made"]},
    {"lead": "Inverted", "key": "romance", "subs": ["charm without depth", "pursuit that's really performance", "idealism that won't survive contact", "the courtship as ego"]},
    {"lead": "Negative", "key": "seduction", "subs": ["charm to manipulate", "romance as conquest", "love-bombing then withdrawal", "pursuing the dream of them, not them"]},
    {"lead": "Delayed", "key": "proposal", "subs": ["the offer still being shaped", "the courtship in slow approach", "the gesture not yet made", "the heart still gathering its words"]}
  ],
  "cups13": [
    {"lead": "Weakened", "key": "holding", "subs": ["capacity to hold worn thin", "intuition flickering", "nurture exhausted", "the cup that's run dry from giving"]},
    {"lead": "Inverted", "key": "nurture", "subs": ["nurture that absorbs others' feelings as its own", "intuition mistrusted into manipulation", "holding becomes harboring", "care as control"]},
    {"lead": "Negative", "key": "codependence", "subs": ["feeling other people's feelings instead of your own", "using intuition as identity", "nurture that smothers", "the holding that won't release"]},
    {"lead": "Delayed", "key": "wisdom", "subs": ["emotional mastery still maturing", "intuition trustworthy but not yet trusted", "the nurturer still becoming", "holding capacity still expanding"]}
  ],
  "cups14": [
    {"lead": "Weakened", "key": "steadiness", "subs": ["composure that won't quite hold", "calm cracking under longer pressure", "mature feeling tested past its training", "the mentor uncertain"]},
    {"lead": "Inverted", "key": "calm", "subs": ["surface composure over inner turmoil", "suppression dressed as maturity", "equanimity weaponized", "steadiness used to dismiss others' feeling"]},
    {"lead": "Negative", "key": "coldness", "subs": ["calm that refuses to feel", "using 'maturity' to control others' emotion", "equanimity as bypass", "the mentor who won't be moved"]},
    {"lead": "Delayed", "key": "mastery", "subs": ["the inner steadiness still developing", "the calm still being earned", "wisdom in feelings still arriving", "the king still being grown into"]}
  ],
  "swords01": [
    {"lead": "Weakened", "key": "clarity", "subs": ["insight that won't quite crystallize", "truth glimpsed and lost", "the sword half-drawn", "breakthrough on the threshold"]},
    {"lead": "Inverted", "key": "truth", "subs": ["clarity weaponized", "honesty wielded without care", "truth-telling as power play", "cutting before understanding"]},
    {"lead": "Negative", "key": "thought", "subs": ["using insight to wound", "clarity claimed before earned", "the sword swung at the wrong target", "certainty as performance"]},
    {"lead": "Delayed", "key": "realization", "subs": ["the truth still coming together", "the breakthrough still building", "clarity on slow arrival", "the moment of cutting through, not yet"]}
  ],
  "swords02": [
    {"lead": "Weakened", "key": "decision", "subs": ["choice you can't quite make", "standoff that won't break", "the blindfold half-on", "equilibrium freezing motion"]},
    {"lead": "Inverted", "key": "balance", "subs": ["refusing to choose as if it were neutrality", "stalemate prolonged for safety", "the blocked feeling pretending it's peace", "decision avoided forever"]},
    {"lead": "Negative", "key": "avoidance", "subs": ["blindfold worn to refuse what you already know", "using uncertainty as escape", "stalemate weaponized", "balance as a cage"]},
    {"lead": "Delayed", "key": "choice", "subs": ["the decision still forming", "the blindfold lifting in its own time", "clarity on its way through the standoff", "the seas not yet calmed"]}
  ],
  "swords03": [
    {"lead": "Weakened", "key": "heartbreak", "subs": ["grief that won't quite land", "the cut still happening", "pain held without naming", "the wound discovered late"]},
    {"lead": "Inverted", "key": "grief", "subs": ["clinging to the heartbreak as identity", "using the wound as alibi", "refusing to remove the swords", "the betrayal nursed"]},
    {"lead": "Negative", "key": "wallowing", "subs": ["using pain to manipulate", "making the cut into a story", "weaponizing your wound", "heartbreak as moral high ground"]},
    {"lead": "Delayed", "key": "healing", "subs": ["the swords being removed slowly", "the wound still in early days", "mourning on its long timeline", "the heart not yet ready to mend"]}
  ],
  "swords04": [
    {"lead": "Weakened", "key": "rest", "subs": ["sleep that won't quite restore", "sanctuary with a crack in the wall", "recovery interrupted", "the pause too short for the depletion"]},
    {"lead": "Inverted", "key": "retreat", "subs": ["rest that becomes hiding", "recuperation calcified into avoidance", "sanctuary as cage", "the lying-down that won't get up"]},
    {"lead": "Negative", "key": "withdrawal", "subs": ["using recovery as escape from responsibility", "sanctuary weaponized", "'self-care' as refusal of the world", "rest as a bypass"]},
    {"lead": "Delayed", "key": "recovery", "subs": ["the healing still happening", "strength still returning", "the next move not yet possible", "the rest required longer than expected"]}
  ],
  "swords05": [
    {"lead": "Weakened", "key": "victory", "subs": ["the win that costs the war", "the field held but emptied", "conflict resolved with debris", "defeat dressed as resolve"]},
    {"lead": "Inverted", "key": "defeat", "subs": ["refusing to acknowledge what you lost", "pyrrhic win narrated as triumph", "picking up the dropped swords", "the hollow victory rehearsed"]},
    {"lead": "Negative", "key": "vengeance", "subs": ["winning to humiliate", "cruelty mistaken for strength", "scorched earth as principle", "fighting battles you've already won"]},
    {"lead": "Delayed", "key": "reconciliation", "subs": ["the field still littered", "the apology still unsaid", "the bridges not yet rebuilt", "amends on a longer timeline"]}
  ],
  "swords06": [
    {"lead": "Weakened", "key": "passage", "subs": ["the journey across water that won't quite begin", "moving forward with one foot still back", "transition that drags", "passage interrupted by what's still ahead"]},
    {"lead": "Inverted", "key": "transition", "subs": ["leaving without changing", "the same shore with new scenery", "motion that loops", "the passage refused"]},
    {"lead": "Negative", "key": "escape", "subs": ["running rather than processing", "transition as avoidance", "the boat full of things you should have left", "passage as denial"]},
    {"lead": "Delayed", "key": "arrival", "subs": ["the further shore still distant", "the journey longer than expected", "the calmer waters not yet reached", "transition still in motion"]}
  ],
  "swords07": [
    {"lead": "Weakened", "key": "deception", "subs": ["the lie that won't quite hold", "stealth half-discovered", "the half-truth straining", "the secret about to slip"]},
    {"lead": "Inverted", "key": "stealth", "subs": ["hiding even from yourself", "strategy as substitute for honesty", "cleverness used to avoid integrity", "sneaking through your own life"]},
    {"lead": "Negative", "key": "manipulation", "subs": ["deceiving for advantage", "using cleverness to wound", "claiming strategy where there's only avoidance", "theft dressed as savvy"]},
    {"lead": "Delayed", "key": "reveal", "subs": ["the lie still working", "the truth about to surface", "the consequence still arriving", "what's hidden, not yet exposed"]}
  ],
  "swords08": [
    {"lead": "Weakened", "key": "bond", "subs": ["the rope looser than it feels", "the trap half of your making", "restriction sustained by belief", "the blindfold you could lift"]},
    {"lead": "Inverted", "key": "victimhood", "subs": ["identifying with the cage", "restrictions defended even as you complain about them", "the trap kept for the comfort of it", "the keys ignored"]},
    {"lead": "Negative", "key": "entrapment", "subs": ["keeping the bind to be tended to", "using restriction as alibi", "refusing the freedom because it would mean responsibility", "the cage as identity"]},
    {"lead": "Delayed", "key": "liberation", "subs": ["the realization still arriving", "the swords still being seen as not solid", "freedom on slow approach", "the rope still being noticed"]}
  ],
  "swords09": [
    {"lead": "Weakened", "key": "sleep", "subs": ["rest that won't quite arrive", "mind louder than the night", "anxiety on a low boil", "dread carried into morning"]},
    {"lead": "Inverted", "key": "dread", "subs": ["nightmares mistaken for prophecy", "anxiety used as preparation that prepares nothing", "midnight despair clung to", "amplified fear given the credibility of insight"]},
    {"lead": "Negative", "key": "rumination", "subs": ["feeding the fear because the silence feels worse", "using dread to feel alive", "midnight catastrophizing as identity", "anxiety as ritual"]},
    {"lead": "Delayed", "key": "dawn", "subs": ["the morning still hours off", "the worst hour still passing", "what feels permanent, in fact temporary", "sleep returning, slowly"]}
  ],
  "swords10": [
    {"lead": "Weakened", "key": "bottom", "subs": ["the floor not quite reached", "the betrayal still being processed", "defeat with the body still believing", "the cycle dying in slow motion"]},
    {"lead": "Inverted", "key": "defeat", "subs": ["refusing to admit it ended", "clinging to the dead form", "the betrayal denied", "rock bottom rehearsed but not landed"]},
    {"lead": "Negative", "key": "martyrdom", "subs": ["dramatizing your defeat", "using the betrayal as identity", "staying down for the sympathy", "rock bottom as performance"]},
    {"lead": "Delayed", "key": "renewal", "subs": ["the dawn after the worst, still coming", "the cycle ended but new not yet begun", "rising on a slower timeline", "what comes next, not yet here"]}
  ],
  "swords11": [
    {"lead": "Weakened", "key": "curiosity", "subs": ["the mind that won't quite focus", "vigilance bleeding into anxiety", "the sharp question dulled by self-doubt", "learning interrupted"]},
    {"lead": "Inverted", "key": "observation", "subs": ["noticing without compassion", "sharpness used to wound", "curiosity weaponized", "the page playing critic"]},
    {"lead": "Negative", "key": "cynicism", "subs": ["cleverness as protection", "dismantling everything to feel powerful", "questioning to refuse rather than to learn", "sharpness aimed at the soft"]},
    {"lead": "Delayed", "key": "insight", "subs": ["the question still forming", "the answer still being approached", "what you're about to see, not yet visible", "sharpness still developing"]}
  ],
  "swords12": [
    {"lead": "Weakened", "key": "drive", "subs": ["intellect without traction", "pursuit losing its edge", "the charge slowing on the field", "argument running out of steam"]},
    {"lead": "Inverted", "key": "swiftness", "subs": ["rushing past the nuance", "sharpness used to dominate", "the gallop that scatters", "pursuit as recklessness"]},
    {"lead": "Negative", "key": "aggression", "subs": ["cutting first, thinking later", "arguments as warfare", "using intellect to harm", "charging the wrong opponent"]},
    {"lead": "Delayed", "key": "arrival", "subs": ["the answer still being argued for", "the breakthrough on a longer timeline", "the charge still gathering", "the field not yet crossed"]}
  ],
  "swords13": [
    {"lead": "Weakened", "key": "discernment", "subs": ["clarity blurred at the edges", "honesty muffled by self-doubt", "discernment hesitating", "independent mind questioning itself"]},
    {"lead": "Inverted", "key": "honesty", "subs": ["clear sight used to wound", "discernment turned to coldness", "honesty as cruelty", "clarity wielded without care"]},
    {"lead": "Negative", "key": "coldness", "subs": ["independence as walls", "discernment that excludes", "the clear eye that refuses warmth", "honesty weaponized against others"]},
    {"lead": "Delayed", "key": "clarity", "subs": ["discernment still maturing", "the clear sight still developing", "the honest voice still being found", "wisdom still arriving"]}
  ],
  "swords14": [
    {"lead": "Weakened", "key": "authority", "subs": ["command without the conviction", "leadership uncertain in the moment that needs certainty", "principle held but not embodied", "the ethical voice quieter than the room"]},
    {"lead": "Inverted", "key": "command", "subs": ["principle as cudgel", "authority that refuses input", "ethical certainty rigidified into dogma", "leadership that punishes the soft"]},
    {"lead": "Negative", "key": "tyranny", "subs": ["weaponizing your intellect", "using principle to crush", "authority as superiority", "mind as throne for the ego"]},
    {"lead": "Delayed", "key": "leadership", "subs": ["the leader still becoming", "principle still being earned", "the king's voice still arriving", "the ethical command on slow ripening"]}
  ],
  "pents01": [
    {"lead": "Weakened", "key": "seed", "subs": ["the coin received but heavy in the hand", "opportunity arriving with strings", "the seed in soil that's slow", "the beginning that hasn't quite taken"]},
    {"lead": "Inverted", "key": "opportunity", "subs": ["the gift refused", "chasing the wrong tangible", "the seed planted in the wrong season", "opportunity misread for distraction"]},
    {"lead": "Negative", "key": "grasping", "subs": ["clutching the seed too hard to plant it", "using opportunity to refuse the work", "the coin worshipped rather than worked", "the start without the soil"]},
    {"lead": "Delayed", "key": "prosperity", "subs": ["the harvest still seasons off", "the seed still germinating", "the offer still being made", "what's coming, still arriving"]}
  ],
  "pents02": [
    {"lead": "Weakened", "key": "balance", "subs": ["the juggle missing a beat", "flexibility wearing thin", "one coin dropping", "the dance off-tempo"]},
    {"lead": "Inverted", "key": "juggling", "subs": ["balance as performance", "taking on more to feel competent", "flexibility as inability to commit", "juggling that prevents settling"]},
    {"lead": "Negative", "key": "overload", "subs": ["hiding in the busyness", "using the juggle as escape from one thing", "scattered to avoid focus", "the dance to avoid the room"]},
    {"lead": "Delayed", "key": "steadiness", "subs": ["the balance still being found", "the dance still being learned", "the rhythm not yet stable", "juggling becoming juggling well"]}
  ],
  "pents03": [
    {"lead": "Weakened", "key": "craft", "subs": ["skill that won't quite show", "collaboration off by a degree", "the work needing more than your hand can give", "recognition still distant"]},
    {"lead": "Inverted", "key": "collaboration", "subs": ["working alongside without truly working together", "craft that refuses peer input", "recognition sought rather than earned", "collaboration as theater"]},
    {"lead": "Negative", "key": "ego", "subs": ["claiming the team's work", "refusing to share the chisel", "craft as identity over substance", "using collaboration to extract"]},
    {"lead": "Delayed", "key": "mastery", "subs": ["the apprenticeship still ongoing", "craft still being shaped", "the recognition still coming", "collaboration still finding its rhythm"]}
  ],
  "pents04": [
    {"lead": "Weakened", "key": "grip", "subs": ["hold loosening", "security less stable than appeared", "possessions weighty in the hand", "the saving running shallow"]},
    {"lead": "Inverted", "key": "security", "subs": ["clutching what no longer serves", "scarcity belief outliving the scarcity", "possession as identity", "hoarding what could be passed"]},
    {"lead": "Negative", "key": "miserliness", "subs": ["refusing to share what's abundant", "holding so tight you can't move", "security as cage", "using money to control"]},
    {"lead": "Delayed", "key": "release", "subs": ["the loosening still ahead", "what's held, still being learned to release", "generosity becoming possible", "the open hand not yet practiced"]}
  ],
  "pents05": [
    {"lead": "Weakened", "key": "struggle", "subs": ["hardship that won't quite resolve", "poverty wearing on the spirit", "the exclusion ongoing", "loneliness deepening in the cold"]},
    {"lead": "Inverted", "key": "exclusion", "subs": ["refusing the open door", "poverty consciousness outlasting the actual poverty", "pride that won't ask for help", "the church windows lit but not entered"]},
    {"lead": "Negative", "key": "martyrdom", "subs": ["making hardship into identity", "refusing help to keep the story", "using the struggle as proof", "scarcity as virtue"]},
    {"lead": "Delayed", "key": "shelter", "subs": ["the warmth still ahead", "help arriving but slowly", "the threshold to cross still in sight", "the long winter still passing"]}
  ],
  "pents06": [
    {"lead": "Weakened", "key": "giving", "subs": ["generosity that drains", "charity that doesn't quite arrive", "fair exchange off by a thumb on the scale", "the help with conditions"]},
    {"lead": "Inverted", "key": "exchange", "subs": ["giving for power", "charity that reminds the receiver they received", "generosity as performance", "exchange disguised as gift"]},
    {"lead": "Negative", "key": "power", "subs": ["using money to dominate", "generosity weaponized", "giving to avoid intimacy", "charity as superiority"]},
    {"lead": "Delayed", "key": "reciprocity", "subs": ["the giving still unbalanced", "the return still arriving", "what was given coming back in its own time", "the scales still finding level"]}
  ],
  "pents07": [
    {"lead": "Weakened", "key": "patience", "subs": ["evaluation that won't quite resolve", "the long view obscured", "assessment that doubts itself", "patience worn thin by the wait"]},
    {"lead": "Inverted", "key": "assessment", "subs": ["judging the harvest before it's grown", "impatience disguised as evaluation", "the long view used to avoid action", "assessment as paralysis"]},
    {"lead": "Negative", "key": "impatience", "subs": ["ripping up the seedling to check it", "using 'I'm just being thoughtful' to never act", "evaluation that refuses to harvest", "patience pretending while resenting"]},
    {"lead": "Delayed", "key": "harvest", "subs": ["the fruit still ripening", "the assessment still gathering data", "the long view still revealing", "the harvest not yet ready"]}
  ],
  "pents08": [
    {"lead": "Weakened", "key": "practice", "subs": ["devotion wavering", "the apprenticeship interrupted", "refinement off by a tool", "mastery questioned at the wrong moment"]},
    {"lead": "Inverted", "key": "craft", "subs": ["practicing the wrong thing well", "mastery sought through shortcut", "apprenticeship without humility", "devotion as performance"]},
    {"lead": "Negative", "key": "perfectionism", "subs": ["refining past the point of usefulness", "apprenticeship as avoidance of release", "practice as identity rather than path", "refining to delay shipping"]},
    {"lead": "Delayed", "key": "mastery", "subs": ["the skill still developing", "craft still being earned", "the eye still being trained", "mastery on its long timeline"]}
  ],
  "pents09": [
    {"lead": "Weakened", "key": "ease", "subs": ["abundance that doesn't quite settle", "the garden enjoyed less than expected", "self-sufficiency exhausted from being only self", "luxury with a draft"]},
    {"lead": "Inverted", "key": "abundance", "subs": ["refinement as isolation", "self-sufficiency as walls", "enjoyment performed for the photo", "abundance that demands solitude"]},
    {"lead": "Negative", "key": "pride", "subs": ["using independence to refuse intimacy", "luxury as superiority", "self-sufficiency weaponized", "the garden curated to exclude"]},
    {"lead": "Delayed", "key": "enjoyment", "subs": ["the fruits still ripening on the vine", "the garden still being grown", "abundance arriving but not yet here", "the ease still being earned"]}
  ],
  "pents10": [
    {"lead": "Weakened", "key": "legacy", "subs": ["the inheritance with strings", "family wealth that strains the family", "prosperity that doesn't span the generations", "stability with hairline cracks"]},
    {"lead": "Inverted", "key": "inheritance", "subs": ["legacy as cage", "wealth that obligates without nourishing", "stability bought at a hidden cost", "family prosperity that's secretly fragile"]},
    {"lead": "Negative", "key": "dynasty", "subs": ["wealth as identity", "using legacy to control descendants", "generational stability that suppresses individual growth", "prosperity as performance"]},
    {"lead": "Delayed", "key": "lineage", "subs": ["the inheritance still arriving", "the family wealth still being built", "lasting prosperity still maturing", "the long arc still unfolding"]}
  ],
  "pents11": [
    {"lead": "Weakened", "key": "study", "subs": ["focus that won't quite hold", "the new opportunity met with hesitation", "careful starts that don't quite start", "practical learning losing its grip"]},
    {"lead": "Inverted", "key": "practicality", "subs": ["dabbling without committing", "careful starts that postpone forever", "studious mode as protection from doing", "opportunity studied past its window"]},
    {"lead": "Negative", "key": "caution", "subs": ["using 'I'm just being careful' to never start", "the page that refuses to become the apprentice", "opportunity declined for the safety", "practicality as fear"]},
    {"lead": "Delayed", "key": "start", "subs": ["the apprenticeship still ahead", "the opportunity still being prepared for", "the page on its long approach to the work", "the first day not yet here"]}
  ],
  "pents12": [
    {"lead": "Weakened", "key": "diligence", "subs": ["persistence that loses traction", "method that won't quite work", "the steady plow stalling", "diligence dulled by repetition"]},
    {"lead": "Inverted", "key": "methodicalness", "subs": ["rigidity dressed as discipline", "persistence in the wrong direction", "diligence that refuses to adapt", "plodding past the moment to pivot"]},
    {"lead": "Negative", "key": "stubbornness", "subs": ["holding the course because it's the course", "using 'diligence' to avoid change", "discipline as identity rather than tool", "method ossified"]},
    {"lead": "Delayed", "key": "completion", "subs": ["the work taking longer than expected", "the field longer than the season", "diligence still required", "the harvest in slow approach"]}
  ],
  "pents13": [
    {"lead": "Weakened", "key": "nurture", "subs": ["care that drains rather than fills", "abundance that doesn't quite radiate", "the garden tended past exhaustion", "fertility pressed against the body"]},
    {"lead": "Inverted", "key": "abundance", "subs": ["prosperity hoarded under the appearance of giving", "nurture that controls", "embodied care turned to perfectionism", "the garden as identity"]},
    {"lead": "Negative", "key": "comfort", "subs": ["using comfort as currency", "nurture withheld as power", "abundance leveraged to oblige", "the queen who only nurtures those who please her"]},
    {"lead": "Delayed", "key": "flowering", "subs": ["the garden still growing", "nurture still being learned", "abundance still being grown into", "the embodied queen still arriving"]}
  ],
  "pents14": [
    {"lead": "Weakened", "key": "authority", "subs": ["command in the material world hesitating", "business steady but uncertain at the wheel", "mastery off by a degree", "prosperity questioning itself"]},
    {"lead": "Inverted", "key": "prosperity", "subs": ["wealth as identity", "business authority that refuses generosity", "mastery used to dominate", "leadership that hoards the gold"]},
    {"lead": "Negative", "key": "materialism", "subs": ["status as substance", "using wealth to control", "the king who measures everything in coin", "mastery without mentorship"]},
    {"lead": "Delayed", "key": "legacy", "subs": ["the kingdom still being built", "mastery still being earned", "business authority still arriving in you", "the prosperity not yet fully realized"]}
  ]
};
