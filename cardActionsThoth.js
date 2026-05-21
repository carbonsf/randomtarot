// Real Thoth-deck meanings (upright), authored from the Book of
// Thoth / Crowley consensus with Jungian angles in the subs.
// Same structure as cardActions.js. Used by the info overlay
// when the active deck is Thoth and the card is upright.
const CARD_ACTIONS_THOTH = {
  "maj00": [
    {"lead": "embodying", "key": "zero", "subs": ["the point before all points", "spirit not yet condensed", "pure potential, no form yet", "the green man dancing", "everything held in nothing"]},
    {"lead": "leaping", "key": "into being", "subs": ["stepping off the known edge", "trusting the air to hold", "movement before meaning", "the divine fool's abandon", "saying yes to incarnation"]},
    {"lead": "", "key": "innocence", "subs": ["the puer, eternally young", "ego before it divides the world", "wholeness not yet split", "wonder uncalculated", "the unfallen self"]},
    {"lead": "carrying", "key": "all elements", "subs": ["the wallet of unspent gifts", "every suit folded in one", "tiger and crocodile both", "spirit ungoverned by sense"]}
  ],
  "maj01": [
    {"lead": "wielding", "key": "the word", "subs": ["speaking reality into form", "will made articulate", "the message becomes the medium", "thought tipped with intent", "naming the thing to call it"]},
    {"lead": "juggling", "key": "forces", "subs": ["all four tools in play", "keeping every element aloft", "directing energy through skill", "the magician's swift hands"]},
    {"lead": "", "key": "mercury", "subs": ["quicksilver intelligence", "the trickster who reveals", "logos shaping matter", "wit as a working tool"]},
    {"lead": "channeling", "key": "will", "subs": ["becoming conduit, not source", "aligning desire with act", "the true will moving through you"]}
  ],
  "maj02": [
    {"lead": "keeping", "key": "the veil", "subs": ["guarding what can't be spoken", "the threshold between worlds", "mystery that resists capture", "silence as a kind of speech"]},
    {"lead": "", "key": "intuition", "subs": ["knowing without evidence", "the lunar tide in you", "trusting the inner water", "the anima's quiet counsel"]},
    {"lead": "reflecting", "key": "light", "subs": ["the moon borrowing the sun", "receiving before acting", "stillness that mirrors truth", "becoming a clear pool"]},
    {"lead": "holding", "key": "the secret", "subs": ["wisdom not yet ready to speak", "the unconscious holding its cards", "potential coiled in the dark"]}
  ],
  "maj03": [
    {"lead": "", "key": "abundance", "subs": ["fertility overflowing", "nature giving freely", "beauty as a force of growth", "the green world ripening"]},
    {"lead": "loving", "key": "openly", "subs": ["venusian warmth", "desire that creates", "tenderness with power", "eros as life force"]},
    {"lead": "mothering", "key": "creation", "subs": ["the great mother's embrace", "nourishing what you've made", "holding the growing thing", "love that builds bodies"]},
    {"lead": "", "key": "beauty", "subs": ["harmony made visible", "pleasure without apology", "the senses honored", "grace in the material"]}
  ],
  "maj04": [
    {"lead": "", "key": "authority", "subs": ["the will that organizes", "sovereignty earned, not seized", "standing as the fixed point", "command that protects"]},
    {"lead": "building", "key": "structure", "subs": ["giving chaos a frame", "laws that let things grow", "the architecture of order", "boundaries as kindness"]},
    {"lead": "fathering", "key": "the realm", "subs": ["the senex's steady hand", "providing the container", "leadership as responsibility"]},
    {"lead": "", "key": "fire", "subs": ["aries energy directed", "drive shaped into rule", "ambition with a throne"]}
  ],
  "maj05": [
    {"lead": "", "key": "teaching", "subs": ["the bridge to the sacred", "wisdom handed down", "the outer form of inner truth", "ritual that opens a door"]},
    {"lead": "keeping", "key": "tradition", "subs": ["the lineage carried forward", "the vessel of the mysteries", "belonging through shared rite"]},
    {"lead": "blessing", "key": "the seeker", "subs": ["the wise old man's counsel", "initiation offered", "sanction from above"]},
    {"lead": "", "key": "the word", "subs": ["the new aeon spoken", "doctrine made living", "meaning behind the form"]}
  ],
  "maj06": [
    {"lead": "", "key": "union", "subs": ["opposites married", "the alchemical wedding", "two becoming a third thing", "the coniunctio achieved"]},
    {"lead": "choosing", "key": "rightly", "subs": ["the oracle over the impulse", "discrimination then union", "the vow made conscious", "love as a decision"]},
    {"lead": "joining", "key": "opposites", "subs": ["king and queen wedded", "sun and moon reconciled", "the syzygy within you", "analysis then synthesis"]},
    {"lead": "", "key": "the child", "subs": ["what the union creates", "innocence reborn from two", "the third that heals the split"]}
  ],
  "maj07": [
    {"lead": "", "key": "triumph", "subs": ["victory by holding the reins", "forces yoked, not fought", "momentum under control", "the still center moving fast"]},
    {"lead": "carrying", "key": "the grail", "subs": ["the vessel held steady", "bearing something sacred", "the cup amid the speed"]},
    {"lead": "directing", "key": "opposites", "subs": ["black and white sphinxes pull", "ego steering its drives", "willpower as armor"]},
    {"lead": "", "key": "control", "subs": ["stillness inside motion", "mastery that needn't strain", "command of the inner team"]}
  ],
  "maj08": [
    {"lead": "", "key": "balance", "subs": ["the scales finding true", "every act answered exactly", "equilibrium as the law", "the dancer poised on a point"]},
    {"lead": "weighing", "key": "truth", "subs": ["the feather against the heart", "seeing without distortion", "maat's impartial gaze", "fact severed from wish"]},
    {"lead": "adjusting", "key": "the self", "subs": ["the transcendent function at work", "correcting the inner imbalance", "tuning toward fairness"]},
    {"lead": "", "key": "karma", "subs": ["cause and effect made visible", "the debt settled precisely", "consequence without cruelty"]}
  ],
  "maj09": [
    {"lead": "", "key": "solitude", "subs": ["withdrawing to find the light", "the cave as a workshop", "quiet that ripens insight", "being alone, not lonely"]},
    {"lead": "carrying", "key": "the lamp", "subs": ["the inner light shown outward", "wisdom lighting one step", "the secret flame guarded"]},
    {"lead": "", "key": "the seed", "subs": ["growth hidden in the dark", "virgo's fertile patience", "what germinates unseen"]},
    {"lead": "seeking", "key": "the self", "subs": ["the wise old man within", "introversion as a path", "meeting yourself in the still"]}
  ],
  "maj10": [
    {"lead": "", "key": "the turn", "subs": ["the wheel always moving", "change as the only constant", "fortune favoring motion", "what's down will rise"]},
    {"lead": "riding", "key": "cycles", "subs": ["jupiter's expansion", "the gunas spinning", "accepting the rhythm", "luck meeting readiness"]},
    {"lead": "", "key": "synchronicity", "subs": ["meaningful coincidence", "fate winking through chance", "the pattern beneath events"]},
    {"lead": "trusting", "key": "flux", "subs": ["letting the wheel carry you", "change without grasping", "the long view of fate"]}
  ],
  "maj11": [
    {"lead": "", "key": "lust for life", "subs": ["strength felt as joy", "appetite for existence", "riding the beast, not caging it", "courage that laughs"]},
    {"lead": "", "key": "ecstasy", "subs": ["passion as a sacred force", "the holy whore's abandon", "desire fully owned", "union with the wild"]},
    {"lead": "riding", "key": "the beast", "subs": ["the instincts ridden well", "libido affirmed, not feared", "the shadow made an ally"]},
    {"lead": "", "key": "vitality", "subs": ["the lion's solar heat", "power that delights", "raw life saying yes"]}
  ],
  "maj12": [
    {"lead": "", "key": "surrender", "subs": ["letting go of the struggle", "sacrifice made willingly", "release as a doorway", "hanging between worlds"]},
    {"lead": "reversing", "key": "the view", "subs": ["the world seen upside down", "new sight from suspension", "what inversion reveals", "perspective bought by pause"]},
    {"lead": "", "key": "the sacrifice", "subs": ["the dying god's gift", "ego offered up", "losing to gain", "drowning the old self"]},
    {"lead": "waiting", "key": "in water", "subs": ["stillness before rebirth", "suspended, not stuck", "trusting the long pause"]}
  ],
  "maj13": [
    {"lead": "", "key": "transformation", "subs": ["the old form dissolving", "death as a passage, not an end", "clearing for the new", "scorpio's deep change"]},
    {"lead": "harvesting", "key": "the dead", "subs": ["the scythe cutting clean", "what's finished, finishing", "necessary endings", "reaping the spent"]},
    {"lead": "", "key": "putrefaction", "subs": ["the nigredo, blackening", "rot that feeds the next life", "decay as alchemy"]},
    {"lead": "releasing", "key": "the form", "subs": ["shedding the outworn skin", "letting the husk fall", "change you can't reverse"]}
  ],
  "maj14": [
    {"lead": "", "key": "the great work", "subs": ["opposites fused in the cauldron", "fire and water made one", "alchemy of the self", "gold from contraries"]},
    {"lead": "tempering", "key": "extremes", "subs": ["blending what fought", "the middle way forged", "moderation as a craft", "two streams, one vessel"]},
    {"lead": "", "key": "synthesis", "subs": ["the transcendent function", "integration into wholeness", "the rainbow over the brew"]},
    {"lead": "transmuting", "key": "the base", "subs": ["lead toward gold", "raw matter refined", "the slow patient cooking"]}
  ],
  "maj15": [
    {"lead": "", "key": "matter", "subs": ["the goat dancing in flesh", "creative force in the dense", "desire rooted in earth", "the body's blunt joy"]},
    {"lead": "", "key": "bondage", "subs": ["chains loose enough to drop", "what you cling to clings back", "the shadow you won't own", "appetite running the house"]},
    {"lead": "laughing", "key": "in the dark", "subs": ["the god of mirth", "ecstasy without apology", "capricorn's earthy humor"]},
    {"lead": "facing", "key": "the shadow", "subs": ["meeting the disowned", "the devil as your own mask", "integrating the instinct"]}
  ],
  "maj16": [
    {"lead": "", "key": "the lightning", "subs": ["the false struck down", "sudden necessary collapse", "mars breaking the prison", "truth that arrives as shock"]},
    {"lead": "burning", "key": "the tower", "subs": ["the structure that must fall", "ego's fortress shattered", "clearing by fire"]},
    {"lead": "", "key": "revelation", "subs": ["the eye of shiva opens", "what the ruin uncovers", "liberation through breakdown"]},
    {"lead": "falling", "key": "free", "subs": ["thrown from the false safety", "the persona cracking off", "release in the rubble"]}
  ],
  "maj17": [
    {"lead": "", "key": "hope", "subs": ["light after the tower's fall", "the star that steadies you", "quiet faith renewed", "calm pouring in"]},
    {"lead": "pouring", "key": "the water", "subs": ["nuit's endless giving", "feeding earth and stream both", "generosity from the source"]},
    {"lead": "", "key": "guidance", "subs": ["the star to steer by", "the anima leading on", "the transpersonal touch"]},
    {"lead": "", "key": "renewal", "subs": ["washed clean and open", "meditation's clear pool", "trust restored gently"]}
  ],
  "maj18": [
    {"lead": "", "key": "illusion", "subs": ["light that deceives", "the path through the fog", "what the moon distorts", "fear dressed as fact"]},
    {"lead": "crossing", "key": "the dark", "subs": ["the gateway between towers", "walking through the test", "the descent you must make"]},
    {"lead": "", "key": "the unconscious", "subs": ["the deep waters stirring", "old fears surfacing", "projection mistaken for world"]},
    {"lead": "trusting", "key": "the path", "subs": ["moving though you can't see", "the dog and wolf both howling", "faith in the unseen road"]}
  ],
  "maj19": [
    {"lead": "", "key": "joy", "subs": ["the sun's unguarded light", "clarity that warms", "life affirmed simply", "the dancing children"]},
    {"lead": "", "key": "clarity", "subs": ["everything seen plainly", "no shadow left to hide", "consciousness at noon"]},
    {"lead": "shining", "key": "freely", "subs": ["the regenerated self", "light given without fear", "the lord of life awake"]},
    {"lead": "", "key": "wholeness", "subs": ["the self made radiant", "integration shining out", "the green earth blessed"]}
  ],
  "maj20": [
    {"lead": "", "key": "the new aeon", "subs": ["horus crowned and conquering", "the old law ending", "awakening to a new age", "the child of the future"]},
    {"lead": "answering", "key": "the call", "subs": ["rising to the summons", "the deep voice heard", "stepping into rebirth"]},
    {"lead": "", "key": "awakening", "subs": ["consciousness reborn", "the self called higher", "the stele revealing"]},
    {"lead": "judging", "key": "nothing", "subs": ["beyond reward and blame", "the new law of freedom", "accounting transcended"]}
  ],
  "maj21": [
    {"lead": "", "key": "completion", "subs": ["the great work fulfilled", "the circle closed", "all parts in their place", "the dance finished and begun"]},
    {"lead": "dancing", "key": "the whole", "subs": ["matter celebrating itself", "the maiden in the wreath", "saturn's structure made joy"]},
    {"lead": "", "key": "the mandala", "subs": ["the self made whole", "individuation complete", "the four held in one"]},
    {"lead": "", "key": "synthesis", "subs": ["every element woven in", "the body of the universe", "the end that is a return"]}
  ],
  "wands01": [
    {"lead": "", "key": "the spark", "subs": ["fire in its pure state", "the first flame of will", "raw creative force", "the root of all fire"]},
    {"lead": "igniting", "key": "will", "subs": ["desire before its object", "the impulse to act", "energy seeking a form", "libido as pure heat"]},
    {"lead": "", "key": "potential", "subs": ["power not yet aimed", "the match before the fire", "a start that could be anything"]}
  ],
  "wands02": [
    {"lead": "", "key": "dominion", "subs": ["will that has chosen", "bold command of the field", "power decisively held", "the realm laid out before you"]},
    {"lead": "claiming", "key": "the field", "subs": ["marking what is yours", "aries certainty", "first move made with force"]},
    {"lead": "", "key": "resolve", "subs": ["doubt burned off", "the decision that energizes", "will fused to a goal"]}
  ],
  "wands03": [
    {"lead": "", "key": "established strength", "subs": ["the spark now rooted", "power that holds its ground", "virtue as steady fire", "strength you can rely on"]},
    {"lead": "", "key": "virtue", "subs": ["strength turned to good use", "the will made trustworthy", "fire that warms, not burns"]},
    {"lead": "trusting", "key": "the work", "subs": ["ships sent out with faith", "strength that can wait", "confidence well-earned"]}
  ],
  "wands04": [
    {"lead": "", "key": "completion", "subs": ["the work brought to rest", "fire harmonized", "a cycle satisfyingly closed", "the foundation finished"]},
    {"lead": "celebrating", "key": "the made", "subs": ["venusian joy in the result", "harmony after effort", "the threshold reached"]},
    {"lead": "", "key": "stability", "subs": ["energy settled into form", "a structure that holds", "peace earned by fire"]}
  ],
  "wands05": [
    {"lead": "", "key": "strife", "subs": ["fires clashing without aim", "competition for its own sake", "friction that wastes heat", "everyone's torch raised"]},
    {"lead": "wrestling", "key": "the same fire", "subs": ["rivals who are really kin", "conflict that could be play", "heat with no target"]},
    {"lead": "", "key": "tension", "subs": ["saturn cooling the lion", "struggle before order", "the chaos that precedes form"]}
  ],
  "wands06": [
    {"lead": "", "key": "victory", "subs": ["the strife resolved in triumph", "leadership recognized", "jupiter's expansive win", "the laurel earned"]},
    {"lead": "leading", "key": "openly", "subs": ["stepping up to be seen", "authority by merit", "the front of the line"]},
    {"lead": "", "key": "confidence", "subs": ["success that steadies you", "fire that has proven itself", "pride without arrogance"]}
  ],
  "wands07": [
    {"lead": "", "key": "valour", "subs": ["courage against the many", "holding the high ground", "standing when outnumbered", "the brave refusal to yield"]},
    {"lead": "defending", "key": "the position", "subs": ["fighting from advantage", "nerve under pressure", "mars in the lion's heat"]},
    {"lead": "", "key": "resolve", "subs": ["courage as a choice", "the will to keep the ground", "fear used as fuel"]}
  ],
  "wands08": [
    {"lead": "", "key": "swiftness", "subs": ["energy moving fast", "arrows already loosed", "momentum you can't recall", "the message racing ahead"]},
    {"lead": "moving", "key": "fast", "subs": ["events accelerating", "mercury's quick fire", "action outpacing thought"]},
    {"lead": "", "key": "directness", "subs": ["the straight line to the target", "force aimed and released", "no hesitation in flight"]}
  ],
  "wands09": [
    {"lead": "", "key": "strength in reserve", "subs": ["power held back for need", "resilience after the fight", "the last stand prepared", "wary, watchful force"]},
    {"lead": "guarding", "key": "the gain", "subs": ["defending what fire built", "strength tempered by caution", "ready though weary"]},
    {"lead": "", "key": "endurance", "subs": ["the will to hold on", "recovery between rounds", "fire banked, not spent"]}
  ],
  "wands10": [
    {"lead": "", "key": "oppression", "subs": ["fire turned to a burden", "force without wisdom", "power that crushes its bearer", "too much will, too little aim"]},
    {"lead": "carrying", "key": "the weight", "subs": ["the load you took on alone", "saturn weighing the flame", "strength become a cage"]},
    {"lead": "", "key": "burnout", "subs": ["drive that consumes itself", "the cost of relentless force", "fire that forgot to rest"]}
  ],
  "wands11": [
    {"lead": "", "key": "fierce earth", "subs": ["fire grounded in the body", "the flame made flesh", "raw vitality, no polish", "the tiger as a companion"]},
    {"lead": "leaping", "key": "into life", "subs": ["energy seeking expression", "the dancer's bold step", "instinct trusted fully"]},
    {"lead": "", "key": "individuality", "subs": ["the self that won't conform", "beauty that's untamed", "passion without permission"]},
    {"lead": "kindling", "key": "the new", "subs": ["starting from pure spirit", "the spark before the plan", "creation by impulse"]}
  ],
  "wands12": [
    {"lead": "", "key": "decisive will", "subs": ["thought set instantly alight", "action through clear intent", "the chariot of the lion", "ideas that move at once"]},
    {"lead": "driving", "key": "forward", "subs": ["swift, purposeful motion", "mind and fire aligned", "cutting through delay"]},
    {"lead": "", "key": "vision", "subs": ["seeing the goal and going", "the airy spark directed", "strategy fused with daring"]},
    {"lead": "risking", "key": "the leap", "subs": ["boldness backed by thought", "commitment without dithering", "fire steered by reason"]}
  ],
  "wands13": [
    {"lead": "", "key": "magnetic warmth", "subs": ["fire held with grace", "passion that draws others in", "steady inner flame", "warmth that doesn't demand"]},
    {"lead": "holding", "key": "the flame", "subs": ["tending fire without burning", "calm command of energy", "the leopard at her feet"]},
    {"lead": "", "key": "adaptability", "subs": ["fire that flows like water", "strength that bends", "poise within intensity"]},
    {"lead": "radiating", "key": "presence", "subs": ["being fully, warmly yourself", "charisma rooted in calm", "the anima's bright heat"]}
  ],
  "wands14": [
    {"lead": "", "key": "fire of fire", "subs": ["the swiftest, fiercest force", "flame fully in motion", "power that overwhelms", "the charge that can't be stopped"]},
    {"lead": "charging", "key": "ahead", "subs": ["headlong into the work", "force at full draw", "the warrior's hot resolve"]},
    {"lead": "", "key": "intensity", "subs": ["burning bright and brief", "passion at its peak", "the leap before the look"]},
    {"lead": "blazing", "key": "through", "subs": ["obstacles met with fire", "momentum as identity", "the flame that lights or scorches"]}
  ],
  "cups01": [
    {"lead": "", "key": "the grail", "subs": ["water in its pure state", "the cup overflowing", "love before its object", "the spring of all feeling"]},
    {"lead": "opening", "key": "the heart", "subs": ["feeling without defense", "the first welling of love", "emotion as pure source"]},
    {"lead": "", "key": "potential", "subs": ["love not yet given", "the still pool before the ripple", "openness itself"]}
  ],
  "cups02": [
    {"lead": "", "key": "love", "subs": ["two cups joined", "feeling answered in kind", "the heart's perfect mirror", "union without loss of self"]},
    {"lead": "joining", "key": "hearts", "subs": ["venusian harmony", "the dolphins entwined", "reciprocity of feeling"]},
    {"lead": "", "key": "harmony", "subs": ["emotions in tune", "attraction that nourishes", "love as a shared spring"]}
  ],
  "cups03": [
    {"lead": "", "key": "abundance", "subs": ["feeling overflowing", "joy that spills to others", "plenty of the heart", "the cups brimming together"]},
    {"lead": "sharing", "key": "the joy", "subs": ["celebration with others", "gratitude made social", "the harvest of feeling"]},
    {"lead": "", "key": "generosity", "subs": ["love freely poured", "emotional plenty", "abundance that multiplies"]}
  ],
  "cups04": [
    {"lead": "", "key": "luxury", "subs": ["comfort grown heavy", "pleasure that dulls", "ease tipping toward excess", "feeling settling into stupor"]},
    {"lead": "", "key": "indulgence", "subs": ["too much of a good thing", "the moon's languid pull", "emotion grown stagnant"]},
    {"lead": "noticing", "key": "the surfeit", "subs": ["the offered cup unseen", "comfort that closes you off", "satiety before it sours"]}
  ],
  "cups05": [
    {"lead": "", "key": "disappointment", "subs": ["the pleasure gone flat", "what spilled despite fullness", "feeling let down by hope", "the cups dimmed"]},
    {"lead": "grieving", "key": "the loss", "subs": ["mars stirring the dark water", "mourning what didn't last", "the ache after expectation"]},
    {"lead": "", "key": "letdown", "subs": ["joy that curdled", "the gap between want and gain", "sorrow inside abundance"]}
  ],
  "cups06": [
    {"lead": "", "key": "pleasure", "subs": ["feeling at its sweetest", "well-being freely felt", "the sun on still water", "joy in the simple"]},
    {"lead": "", "key": "nostalgia", "subs": ["the warmth of memory", "childhood's bright cup", "innocence recalled"]},
    {"lead": "savoring", "key": "the moment", "subs": ["pleasure without guilt", "the gift of the present", "emotion at ease"]}
  ],
  "cups07": [
    {"lead": "", "key": "debauch", "subs": ["pleasure turned poison", "fantasy mistaken for feeling", "the cups gone rotten", "desire feeding on itself"]},
    {"lead": "", "key": "illusion", "subs": ["wish dressed as reality", "the lotus-dream's lure", "emotion divorced from truth"]},
    {"lead": "drifting", "key": "in fantasy", "subs": ["scorpio's seductive fog", "feeling that won't act", "the seductive false image"]}
  ],
  "cups08": [
    {"lead": "", "key": "indolence", "subs": ["feeling abandoned mid-stream", "walking away from the full cup", "emotional withdrawal", "the spark gone out of joy"]},
    {"lead": "leaving", "key": "the cups", "subs": ["turning from what's hollow", "the search beyond comfort", "saturn dimming the water"]},
    {"lead": "", "key": "weariness", "subs": ["joy that no longer satisfies", "the quiet exit from pleasure", "seeking a deeper draught"]}
  ],
  "cups09": [
    {"lead": "", "key": "happiness", "subs": ["the wish granted", "contentment fully felt", "jupiter's abundant cup", "emotion satisfied"]},
    {"lead": "", "key": "contentment", "subs": ["enough, and knowing it", "well-being that holds", "the heart at rest"]},
    {"lead": "savoring", "key": "fullness", "subs": ["joy without anxiety", "gratitude made whole", "the good held lightly"]}
  ],
  "cups10": [
    {"lead": "", "key": "satiety", "subs": ["feeling at its peak", "the rainbow of fulfilled love", "joy complete, soon to turn", "the heart utterly full"]},
    {"lead": "", "key": "fulfillment", "subs": ["the family of cups arrayed", "peace after the long feeling", "emotion brought home"]},
    {"lead": "holding", "key": "the peak", "subs": ["knowing the tide will turn", "fullness honored before it fades", "the perfect, fragile moment"]}
  ],
  "cups11": [
    {"lead": "", "key": "tender earth", "subs": ["feeling made gentle and real", "love grounded in the body", "softness with substance", "the heart that nurtures quietly"]},
    {"lead": "opening", "key": "to wonder", "subs": ["receiving the new feeling", "the dreamer awake to beauty", "trust that risks tenderness"]},
    {"lead": "", "key": "imagination", "subs": ["creativity rising from water", "the dream taking form", "intuition made visible"]},
    {"lead": "reflecting", "key": "calm", "subs": ["the still pool of the young soul", "feeling without agenda", "grace in the small gesture"]}
  ],
  "cups12": [
    {"lead": "", "key": "feeling thought", "subs": ["emotion guided by mind", "depth that knows itself", "the artist's calculated heart", "intensity held in form"]},
    {"lead": "moving", "key": "with intent", "subs": ["desire steered by purpose", "the eagle over the water", "calm hiding deep currents"]},
    {"lead": "", "key": "subtlety", "subs": ["feeling that plans its course", "charm with hidden depth", "the diplomat of the heart"]},
    {"lead": "creating", "key": "from depth", "subs": ["art born of inner water", "imagination given direction", "the dream made deliberate"]}
  ],
  "cups13": [
    {"lead": "", "key": "pure feeling", "subs": ["emotion in its deepest form", "the mirror of the soul", "love without condition", "the watery depths held still"]},
    {"lead": "reflecting", "key": "the divine", "subs": ["the surface that shows all", "receptivity made holy", "the dreaming oracle"]},
    {"lead": "", "key": "empathy", "subs": ["feeling with another fully", "the anima's deep compassion", "intuition trusted completely"]},
    {"lead": "holding", "key": "the depths", "subs": ["calm over the unconscious sea", "tenderness as a power", "the still water that knows"]}
  ],
  "cups14": [
    {"lead": "", "key": "passionate feeling", "subs": ["fire and water at once", "love pursued with fervor", "the romantic at full charge", "emotion in swift motion"]},
    {"lead": "riding", "key": "the wave", "subs": ["chasing the beautiful thing", "feeling that won't sit still", "the quest of the heart"]},
    {"lead": "", "key": "fervor", "subs": ["intensity that may flood", "passion outrunning sense", "the grail sought headlong"]},
    {"lead": "offering", "key": "the cup", "subs": ["love proffered boldly", "the gesture of devotion", "feeling made an act"]}
  ],
  "swords01": [
    {"lead": "", "key": "the sword", "subs": ["mind in its pure state", "truth that cuts clean", "the first clear thought", "the root of all intellect"]},
    {"lead": "cutting", "key": "to truth", "subs": ["clarity without mercy", "the blade through confusion", "thought as a sharp edge"]},
    {"lead": "", "key": "potential", "subs": ["the idea not yet wielded", "reason before its use", "clarity itself"]}
  ],
  "swords02": [
    {"lead": "", "key": "peace", "subs": ["a balance of opposing thoughts", "quiet held by tension", "the swords crossed, not clashing", "stillness between forces"]},
    {"lead": "balancing", "key": "the mind", "subs": ["two truths held at once", "libra's poised blades", "conflict suspended"]},
    {"lead": "", "key": "stalemate", "subs": ["rest that could tip", "the calm of held breath", "peace that needs guarding"]}
  ],
  "swords03": [
    {"lead": "", "key": "sorrow", "subs": ["the heart pierced by thought", "grief seen clearly", "the cut that tells the truth", "pain that clarifies"]},
    {"lead": "", "key": "grief", "subs": ["saturn's heavy clarity", "mourning that must be felt", "the storm behind the blades"]},
    {"lead": "facing", "key": "the pain", "subs": ["looking at what hurts", "sorrow as honest sight", "the wound acknowledged"]}
  ],
  "swords04": [
    {"lead": "", "key": "truce", "subs": ["the mind given rest", "conflict set down for now", "recovery between battles", "thought allowed to settle"]},
    {"lead": "resting", "key": "the blade", "subs": ["stepping back to recover", "jupiter's restorative pause", "peace by agreement"]},
    {"lead": "", "key": "recovery", "subs": ["the quiet that heals", "strategy in stillness", "retreat that isn't defeat"]}
  ],
  "swords05": [
    {"lead": "", "key": "defeat", "subs": ["the mind outmaneuvered", "a win not worth the cost", "losing the higher ground", "leverage turned to loss"]},
    {"lead": "", "key": "loss", "subs": ["the shameful retreat", "cunning that backfires", "being undone by your own edge"]},
    {"lead": "counting", "key": "the cost", "subs": ["what cleverness cost you", "the empty triumph", "aquarian detachment gone cold"]}
  ],
  "swords06": [
    {"lead": "", "key": "science", "subs": ["the mind finding the way", "method over emotion", "clear passage through trouble", "reason restoring order"]},
    {"lead": "crossing", "key": "to clarity", "subs": ["the journey to calmer water", "problems solved, not fled", "mercury's clean technique"]},
    {"lead": "", "key": "understanding", "subs": ["the structure made visible", "intellect at its best", "the path reasoned out"]}
  ],
  "swords07": [
    {"lead": "", "key": "futility", "subs": ["effort that won't suffice", "the plan that undercuts itself", "trying by halves", "cleverness without commitment"]},
    {"lead": "", "key": "self-defeat", "subs": ["the mind at odds with itself", "stealing your own swords", "cunning that fails the test"]},
    {"lead": "second-guessing", "key": "the move", "subs": ["doubt eroding the act", "strategy gone slippery", "the unstable middle"]}
  ],
  "swords08": [
    {"lead": "", "key": "interference", "subs": ["the mind hemmed in", "thought blocked by detail", "too many swords, no room", "analysis as a trap"]},
    {"lead": "", "key": "restriction", "subs": ["the cage of overthinking", "options that paralyze", "gemini's scattered blades"]},
    {"lead": "freeing", "key": "the mind", "subs": ["one clean cut through the tangle", "stepping past the static", "seeing the way out"]}
  ],
  "swords09": [
    {"lead": "", "key": "cruelty", "subs": ["the mind turned against itself", "anguish bred by thought", "nightmare logic", "the blades drawing blood"]},
    {"lead": "", "key": "anguish", "subs": ["worry sharpened to torment", "mars cutting in the dark", "despair that feeds on itself"]},
    {"lead": "naming", "key": "the wound", "subs": ["seeing the cruelty plainly", "what the mind does at night", "the first step out of dread"]}
  ],
  "swords10": [
    {"lead": "", "key": "ruin", "subs": ["the thought taken to its end", "collapse of a mental structure", "the blades all fallen", "the worst, now finished"]},
    {"lead": "", "key": "the bottom", "subs": ["where overthinking lands", "the idea spent entirely", "ruin that clears the ground"]},
    {"lead": "rising", "key": "after", "subs": ["nowhere left but up", "the dawn after the ruin", "the mind free to rebuild"]}
  ],
  "swords11": [
    {"lead": "", "key": "grounded thought", "subs": ["mind put to practical use", "ideas brought to earth", "sharp wit, real footing", "truth defended on the ground"]},
    {"lead": "cutting", "key": "the false", "subs": ["clearing illusion decisively", "the avenger of wrongs", "fearless honesty"]},
    {"lead": "", "key": "vigilance", "subs": ["watching for the lie", "thought that protects", "cleverness with a spine"]},
    {"lead": "acting", "key": "on truth", "subs": ["the idea made concrete", "resolve behind the blade", "mind that won't just theorize"]}
  ],
  "swords12": [
    {"lead": "", "key": "pure intellect", "subs": ["mind at its most abstract", "brilliance unmoored from ground", "ideas spinning ideas", "the airy thinker"]},
    {"lead": "analyzing", "key": "everything", "subs": ["dissecting to understand", "logic chasing logic", "the chariot of thought"]},
    {"lead": "", "key": "abstraction", "subs": ["clarity that risks coldness", "plans that outrun reality", "intellect for its own sake"]},
    {"lead": "deciding", "key": "swiftly", "subs": ["thought cutting to action", "the quick incisive call", "reason given a blade"]}
  ],
  "swords13": [
    {"lead": "", "key": "clear perception", "subs": ["feeling clarified by thought", "honest, unflinching insight", "the keen and fair mind", "truth softened by understanding"]},
    {"lead": "seeing", "key": "through", "subs": ["perceiving the real motive", "fairness with an edge", "the severed head of illusion"]},
    {"lead": "", "key": "discernment", "subs": ["judgment born of experience", "sorrow turned to wisdom", "clarity that has grieved"]},
    {"lead": "speaking", "key": "plainly", "subs": ["truth said without cruelty", "the honest word", "insight others can use"]}
  ],
  "swords14": [
    {"lead": "", "key": "fierce intellect", "subs": ["thought charging into action", "the storming mind", "ideas wielded like weapons", "the warrior of reason"]},
    {"lead": "charging", "key": "in", "subs": ["the swift decisive strike", "mind and force fused", "cutting through all at once"]},
    {"lead": "", "key": "drive", "subs": ["intellect at full gallop", "conviction backed by speed", "the relentless argument"]},
    {"lead": "risking", "key": "the strike", "subs": ["boldness that may overshoot", "force ahead of caution", "the blade that doesn't pause"]}
  ],
  "pents01": [
    {"lead": "", "key": "the seed", "subs": ["earth in its pure state", "matter as pure potential", "the root of all substance", "wealth before its form"]},
    {"lead": "grounding", "key": "spirit", "subs": ["the divine made physical", "value taking shape", "the first solid thing"]},
    {"lead": "", "key": "potential", "subs": ["the coin not yet spent", "abundance latent in soil", "substance itself"]}
  ],
  "pents02": [
    {"lead": "", "key": "change", "subs": ["matter in constant flux", "balance kept while moving", "the serpent of cycles", "stability through motion"]},
    {"lead": "juggling", "key": "the cycle", "subs": ["managing the ups and downs", "flow over fixed ground", "keeping the two coins spinning"]},
    {"lead": "", "key": "flexibility", "subs": ["earth that adapts", "the dance of give and take", "change as the only stability"]}
  ],
  "pents03": [
    {"lead": "", "key": "works", "subs": ["skill applied to matter", "the great work taking form", "craft made manifest", "building with intent"]},
    {"lead": "", "key": "craft", "subs": ["mastery of the material", "mars shaping the earth", "labor that means something"]},
    {"lead": "constructing", "key": "the form", "subs": ["the pyramid rising", "skill recognized", "the foundation laid well"]}
  ],
  "pents04": [
    {"lead": "", "key": "earthly power", "subs": ["matter held firmly", "the law made solid", "structure that endures", "the fortress of the realized"]},
    {"lead": "holding", "key": "the gain", "subs": ["consolidating what's built", "the grip that secures", "capricorn's steady command"]},
    {"lead": "", "key": "stability", "subs": ["order locked in place", "the risk of holding too tight", "power that can stagnate"]}
  ],
  "pents05": [
    {"lead": "", "key": "worry", "subs": ["the fear of not enough", "material anxiety", "the mind gnawing at lack", "scarcity felt in the body"]},
    {"lead": "", "key": "lack", "subs": ["the cold outside the window", "value seemingly withdrawn", "poverty of spirit or coin"]},
    {"lead": "noticing", "key": "the door", "subs": ["help nearer than it seems", "worry that blinds to aid", "the way out unseen"]}
  ],
  "pents06": [
    {"lead": "", "key": "success", "subs": ["matter rewarding effort", "the balanced exchange", "gain fairly given and got", "earth yielding its fruit"]},
    {"lead": "", "key": "generosity", "subs": ["giving from real plenty", "the scales of fair trade", "wealth that circulates"]},
    {"lead": "receiving", "key": "the due", "subs": ["effort meeting reward", "the harvest measured out", "success that's shared"]}
  ],
  "pents07": [
    {"lead": "", "key": "failure", "subs": ["labor without harvest", "the work that doesn't pay", "effort poured into barren ground", "gain that won't ripen"]},
    {"lead": "", "key": "frustration", "subs": ["saturn blighting the field", "watching the crop fail", "the pause to reckon loss"]},
    {"lead": "reassessing", "key": "the field", "subs": ["knowing when to stop", "redirecting wasted effort", "learning from the empty yield"]}
  ],
  "pents08": [
    {"lead": "", "key": "prudence", "subs": ["careful, patient work", "skill honed by repetition", "diligence as a virtue", "attention to the small"]},
    {"lead": "", "key": "diligence", "subs": ["the craft practiced daily", "virgo's precise hand", "mastery built coin by coin"]},
    {"lead": "tending", "key": "the detail", "subs": ["the long apprenticeship", "quality over haste", "earth rewarding patience"]}
  ],
  "pents09": [
    {"lead": "", "key": "gain", "subs": ["matter bearing real fruit", "reward refined and earned", "plenty enjoyed with grace", "the garden in full coin"]},
    {"lead": "", "key": "self-sufficiency", "subs": ["enough by your own hand", "independence in the material", "venusian comfort earned"]},
    {"lead": "savoring", "key": "the harvest", "subs": ["pleasure in what you built", "abundance held with ease", "the discipline that paid"]}
  ],
  "pents10": [
    {"lead": "", "key": "wealth", "subs": ["matter at its fullest", "the great work made gold", "legacy and inheritance", "abundance settled into roots"]},
    {"lead": "", "key": "legacy", "subs": ["what outlasts you", "the family wealth secured", "value passed down"]},
    {"lead": "completing", "key": "the cycle", "subs": ["the material work finished", "wealth as a foundation, not end", "earth fully realized"]}
  ],
  "pents11": [
    {"lead": "", "key": "earth of earth", "subs": ["matter at its most solid", "the womb of the material", "pregnant with the new", "value about to be born"]},
    {"lead": "grounding", "key": "the seed", "subs": ["the new growth in soil", "potential taking root", "the practical first step"]},
    {"lead": "", "key": "fertility", "subs": ["the earth ready to bear", "abundance gestating", "substance becoming life"]},
    {"lead": "tending", "key": "the real", "subs": ["patient care of the material", "the body honored", "earth as sacred ground"]}
  ],
  "pents12": [
    {"lead": "", "key": "industry", "subs": ["thought applied to the land", "steady, productive labor", "the engineer of matter", "plans that build real things"]},
    {"lead": "working", "key": "the ground", "subs": ["method meeting soil", "the chariot over the field", "reliability as a power"]},
    {"lead": "", "key": "competence", "subs": ["the mind that gets it done", "practical intelligence", "slow sure progress"]},
    {"lead": "planning", "key": "the harvest", "subs": ["foresight in the material", "cultivating what pays off", "the long, grounded view"]}
  ],
  "pents13": [
    {"lead": "", "key": "fertile care", "subs": ["feeling poured into the land", "nurturing what grows", "the mother of the harvest", "matter loved into fullness"]},
    {"lead": "tending", "key": "the garden", "subs": ["patient, sensual care", "the oasis she creates", "abundance through devotion"]},
    {"lead": "", "key": "groundedness", "subs": ["calm rooted in the earth", "the body as a home", "quiet material wisdom"]},
    {"lead": "providing", "key": "warmth", "subs": ["comfort that nourishes", "the hearth kept burning", "care made tangible"]}
  ],
  "pents14": [
    {"lead": "", "key": "steady force", "subs": ["fire harnessed to labor", "slow, relentless work", "the worker of the land", "power applied with patience"]},
    {"lead": "plowing", "key": "ahead", "subs": ["the long task seen through", "endurance over flash", "the harvest earned by toil"]},
    {"lead": "", "key": "reliability", "subs": ["the one who finishes", "strength that doesn't quit", "earth's patient fire"]},
    {"lead": "carrying", "key": "the load", "subs": ["duty shouldered fully", "the unglamorous essential work", "force that builds slowly"]}
  ]
};
