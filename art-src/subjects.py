"""SKAT AUF TOUR art: subject briefs (what is in the picture). Style lives in specs.py (heads), so a brief is reused
by every style head. Rules (contract §0.8, §9): invented people only, no brands, no lettering anywhere. Name only
what must be drawn; Krea likes to write on signs, so every sign is described as blank wood.

Briefs are English (Krea follows English best); ids and file names are English, the game shows German.
"""

# ------------------------------------------------------------------------------------------------ backgrounds
# inns/<room>: the view over our own card table (contract §4.3, §9). The lower ~45 % carries the hand and the trick,
# the upper left/right corners carry the two regulars' portrait panels, the top centre the game board.
INN_LAYOUT = (
    "Composition: the whole lower half of the picture is the calm, empty top of our own card table close to the "
    "viewer, a plain dark green felt card mat on warm wooden boards, with nothing lying on it. The room with all its "
    "detail sits in a horizontal band through the middle of the picture, at eye level. The upper left and upper "
    "right corners are calm: plain ceiling beams and plain wall, no objects there. The room is empty of people.")

INNS = {
    "village": (
        "The interior of a Swabian village inn parlour of the early 1980s, seen from our seat at the card table: we "
        "look across our own table into the warm room. Dark brown wood panelling up to chest height, cream plaster "
        "walls above, heavy dark ceiling beams. In the left part of the room a big green tiled stove with a wooden "
        "bench around it. On the back wall a row of small triangular felt pennants in many colours on a string, a "
        "pendulum wall clock, a wooden savings cabinet with a grid of many small locked doors, a window with lace "
        "curtains showing the blue evening village outside, deer antlers. A blank wooden sign hangs on two chains "
        "over the empty regulars' table at the back; the sign is plain wood with nothing written or carved on it. "
        "On the right a small bar counter with a beer tap and a shelf of bottles without labels. Low orange glass "
        "lamp shades hang over the tables and throw warm pools of light, formica-topped side tables, a coat rack "
        "with a felt hat."),
}

# ------------------------------------------------------------------------------------------------ portraits
# portraits/<id>: 96x96 art pixels, a bust, keyed from a flat green render background (alpha in the final).
PORTRAIT_LAYOUT = (
    "The head fills the upper two thirds of the square picture, the shoulders reach the bottom edge, nothing is cut "
    "off at the top.")

PORTRAITS = {
    "maurer": (
        "Head-and-shoulders portrait of an invented sturdy old Swabian bricklayer of about sixty-five, turned three "
        "quarters to the left: a broad weathered face, a big bushy grey walrus moustache, a round red nose, small "
        "kind eyes under heavy lids, a slow good-natured smile, a grey-brown tweed flat cap, a collarless checked "
        "work shirt under a faded blue work jacket with a flat carpenter's pencil in the breast pocket, broad "
        "shoulders."),
}

# ------------------------------------------------------------------------------------------------ dogs
DOG_LAYOUT = "The whole dog is in the picture with a wide margin of background around it."

DOGS = {
    "shepherd": (
        "A friendly German shepherd dog sitting upright, seen from the front in a slight three-quarter view, ears "
        "pricked up, mouth a little open in a happy pant with the pink tongue showing, warm brown eyes, a black "
        "saddle and black muzzle with tan legs, chest and face, the bushy tail curled forward beside the front "
        "paws."),
}

# ------------------------------------------------------------------------------------------------ vehicles
VEHICLE_LAYOUT = "The whole vehicle is in the picture with a wide margin of background around it."

VANS = {
    "van": (
        "A cream-white 1970s alcove camper (a motorhome with a rounded sleeping alcove over the driver's cab), seen "
        "exactly from the side in a flat side elevation, driving direction to the right: a boxy body with rounded "
        "corners, a broad orange-brown stripe along the whole side, small windows with brown curtains, a side door "
        "with a little window, chrome bumpers, a round headlight, black tyres with silver hubcaps, no number plates. "
        "On a carrier rack at the rear end sits a 1970s motorcycle, also seen from the side: a classic upright road "
        "bike with a round headlight, a chrome-sided fuel tank, twin rear shock absorbers and spoked wheels, without "
        "any logos or badges."),
}


# ================================================================================================ production
# Locked 4 Oct 2026 (the user chose "Mix A+B": backgrounds in the `adv` head, figures/dogs/vehicles/items in the
# `comic` head). Briefs follow the code paintings (src/screens/paint/*, chess/park.ts, sudoku/kiosk.ts), which also
# serve as blurred layout inits (art-src/init/<group>-<id>-layout.png).

# ------------------------------------------------------------------------------------------------ inn rooms
INN_ROOMS = {
    "village": INNS["village"],
    "besen": (
        "The interior of a Swabian Besenwirtschaft (a winegrower's seasonal tavern) of the early 1980s, seen from our "
        "seat at the card table: a low whitewashed vaulted cellar room, two big oak wine barrels lying on their side "
        "at the back, an arched wooden door with iron fittings in the middle of the back wall, a broom made of "
        "birch twigs hanging over the door as the sign of the house, simple long wooden tables with red-and-white "
        "checked cloths, a garland of vine leaves along the wall, bottles of wine without labels in wall niches, "
        "two enamel lamps hanging from the vault."),
    "clubhouse": (
        "The interior of a 1980s sports club house (Vereinsheim) in a Swabian village, seen from our seat at the card "
        "table: walls clad in light pine boards, a glass trophy cabinet full of small cups, a wall of small triangular "
        "club pennants, a dartboard, a window onto the evening sports field, long tables with formica tops, "
        "fluorescent light tubes on the ceiling, a few club members' coats on hooks."),
    "station": (
        "The interior of a small 1980s railway station restaurant (Bahnhofsgaststätte) in Swabia, seen from our seat "
        "at the card table: dark green tiled walls up to shoulder height, cream walls above, a big round station clock "
        "without numbers, a wide window onto the platform where a red-and-cream local train waits in the dusk, "
        "globe lamps hanging from the ceiling, a wooden counter with a glass cake display, a coat stand with a "
        "railwayman's coat and cap, small tables with dark red tablecloths."),
    "beergarden": (
        "A Swabian beer garden (Biergarten) on a summer evening in the early 1980s, seen from our seat at the card "
        "table: big old chestnut trees with strings of small light bulbs between them, folding wooden benches and "
        "tables on gravel, a half-timbered inn with lit windows at the back, a small wooden serving hut, the evening "
        "sky glowing orange between the leaves."),
    "canteen": (
        "A 1980s factory canteen (Kantine) in Swabia after the shift, seen from our seat at the card table: light "
        "blue tiled walls, a long serving hatch with steel counters and steaming pots, a wall clock without numbers, "
        "a cork pin board with blank papers, long tables with grey laminate tops and orange plastic chairs, tall "
        "windows showing the dusk, fluorescent ceiling lights."),
    "campsite": (
        "A campsite pub (Campingkneipe) on a summer evening in the early 1980s, seen from our seat at the card table "
        "under a red-and-cream striped awning: wooden poles, a lantern hanging from the awning, a drinks fridge with "
        "a glass door full of bottles without labels, beyond the awning a meadow with tents, caravans and a cream "
        "alcove camper, a lake and hills in the warm sunset."),
    "tent": (
        "The inside of a big Swabian festival tent (Festzelt) in the early 1980s, seen from our seat at the card "
        "table: red-and-white striped canvas ceiling held by tall green-painted wooden poles, strings of colourful "
        "triangular bunting and light bulbs, long beer tables and benches full of cheerful people in the distance, a "
        "small stage with a brass band at the far end."),
    "bikers": (
        "A motorcycle meeting place in the hills (Motorradtreff) on a summer evening in the early 1980s, seen from our "
        "seat at a wooden trestle table: a gravel parking area with a row of 1970s motorcycles without logos, a small "
        "wooden kiosk hut with a lit serving window, two bikers in leather jackets chatting by a high table, a "
        "winding road with a crash barrier, dark fir trees and blue hills under a purple and orange evening sky."),
}

# ------------------------------------------------------------------------------------------------ scenes
SCENE_LAYOUT = {
    "pitch": ("Composition: the camper stands in the lower left part of the picture; the sky fills the upper third; "
              "the right half of the picture is open landscape."),
}
SCENES = {
    "kitchen": (
        "A cosy Swabian kitchen of the early 1980s on a summer evening, seen from the kitchen table: orange-and-brown "
        "flower-patterned wallpaper, a window with red curtains looking out onto the village street where a "
        "cream-white alcove camper with a broad orange-brown stripe and a motorcycle on its rear rack is parked, a "
        "round wall clock without numbers, wooden kitchen cupboards, a car key on a hook, a dog basket with a "
        "sleeping German shepherd. In the foreground the plain wooden kitchen table with an open blank notebook, a "
        "coffee cup and a pretzel on a plate."),
    "title": (
        "A wide view over the Enz valley in Swabia at sunset in the early 1980s: steep terraced vineyards with dry "
        "stone walls on both slopes, a river making a big loop through green meadows, a small village with "
        "half-timbered houses and a church tower on the river bank, a country road winding towards the viewer on "
        "which a cream-white alcove camper with a broad orange-brown stripe drives to the right, the sun low over the "
        "hills, warm golden light and long shadows. The upper third is open evening sky."),
    "pitch-enztal": (
        "A camper pitch by the river Enz on a warm evening in the early 1980s: a gravel pitch with a cream-white "
        "alcove camper with a broad orange-brown stripe and a motorcycle on its rear rack, a folding camping chair and "
        "a lantern beside it, the river glittering behind, a village with a church tower and steep terraced vineyards "
        "climbing the hill on the right, the sun setting on the left."),
    "pitch-muehlacker": (
        "A camper pitch on an orchard meadow near an old Cistercian monastery in Swabia on a warm evening in the early "
        "1980s: a cream-white alcove camper with a broad orange-brown stripe and a motorcycle on its rear rack on "
        "gravel, a camping chair and a lantern, a dirt path leading to the monastery church and its long roofs, apple "
        "trees, a small lake with reeds, gentle wooded hills, the sun setting on the right."),
    "pitch-schwarzwald": (
        "A camper pitch in a narrow Black Forest valley on an evening in the early 1980s: a cream-white alcove camper "
        "with a broad orange-brown stripe and a motorcycle on its rear rack on a gravel pitch, a camping chair and a "
        "lantern, steep slopes covered with dark fir forest, a clear stream with stones, an old wooden sawmill with a "
        "water wheel and stacked logs, mist in the valley, a cool blue and purple evening sky."),
    "pitch-stuttgart": (
        "A camper pitch above Stuttgart on a summer night in the early 1980s: a cream-white alcove camper with a broad "
        "orange-brown stripe and a motorcycle on its rear rack parked on a quiet street at the edge of the hills, a "
        "steep stone stairway with an iron handrail going down on the right, the city lights in the valley below, "
        "vineyards on the slopes, a slender concrete television tower on a wooded hill against the purple sky."),
    "dogs": (
        "A dog meadow at the edge of a forest on a summer evening in Swabia: a wide green meadow with a sandy path, "
        "a big old oak tree on the right with a bench under it, a wooden fence along the back, a few dogs playing far "
        "away, a red ball in the grass, the sun setting behind the trees, a cream-white camper parked small in the "
        "distance."),
    "market": (
        "A flea market on a Swabian town square on a summer evening in the early 1980s: a row of tall half-timbered "
        "houses with red roofs and flower boxes, strings of colourful triangular bunting between them, trestle tables "
        "covered with old things (crockery, lamps, toys, books with blank covers, clocks) under red, blue and yellow "
        "striped parasols, cobblestones, a wooden crate of old records, a few visitors far away."),
    "garage": (
        "A small Swabian village car workshop of the early 1980s on an evening: a blue 1970s saloon car without logos "
        "raised on a two-post lift, a wooden workbench with a vice, a pegboard of tools on the wall, a red tool "
        "cabinet, a stack of old tyres, oil stains on the concrete floor, a green enamel lamp, the big garage door open "
        "to the purple evening sky. No people."),
    "bikers": (
        "A motorcycle meeting place in the hills (Motorradtreff) on a summer evening in the early 1980s: a gravel "
        "parking area where a row of 1970s motorcycles without logos stands, a small wooden kiosk hut with a lit "
        "serving window, a few bikers in leather jackets chatting with drinks at a high table, a winding road with a "
        "crash barrier sweeping into a curve, dark fir trees and layered blue hills under a purple and orange sky."),
    "homecoming": (
        "Coming home at night to a Swabian village in the early 1980s: a white half-timbered house with a red roof and "
        "warm lit windows on the right, a garage with an open door, a woman waving from the lit front door, a "
        "cream-white alcove camper with a broad orange-brown stripe and a motorcycle on its rear rack rolling into the "
        "driveway with its headlights on, a German shepherd running ahead, the dark village roofs behind, a crescent "
        "moon in the deep blue night sky."),
    "trophy": (
        "The prize-giving of a Skat tournament in a Swabian village hall of the early 1980s: a wooden stage with red "
        "velvet curtains and bunting, shining silver and gold trophies on a white-covered table on the stage, a "
        "spotlight from above, wooden panelled walls, rows of guests seen from behind in the dark foreground, warm "
        "festive light."),
    "park": (
        "A town park in Swabia on a sunny late afternoon in the early 1980s: a large paved square with a big outdoor "
        "chess board of black and cream squares laid into the paving, a few knee-high standing chess pieces, a "
        "wooden park bench, an old iron lamp post, round trimmed trees, a low hedge, red-roofed town houses and a "
        "church tower behind, a light blue sky with small clouds."),
    "kiosk": (
        "A small Swabian street kiosk of the early 1980s seen from the front: a red-and-cream striped awning, shelves "
        "full of magazines and newspapers whose covers show only colour blocks and simple pictures without any "
        "titles, glass jars of colourful sweets, stacks of folded newspapers with blank grey columns, a wooden counter "
        "in front, a cobbled street and half-timbered houses at the sides."),
}

# ------------------------------------------------------------------------------------------------ portraits
# 26 characters of src/game/ids.ts CHARACTERS + the flea-market trader of the market station. Invented faces,
# caricatured but warm, plain fabrics (patterns turn into noise at 96x96), no green clothes on the green key.
PORTRAITS_ALL = {
    "maurer": PORTRAITS["maurer"].replace("a grey-brown tweed flat cap", "a plain grey-brown flat cap"),
    "zocker": (
        "Head-and-shoulders portrait of an invented wiry Swabian card gambler of about fifty-five, turned three "
        "quarters to the right: slicked-back dark hair with grey temples, a thin pencil moustache, a sly toothy grin, "
        "one eyebrow raised, a loud mustard-yellow sports jacket over an open-collared brown shirt."),
    "rechnerin": (
        "Head-and-shoulders portrait of an invented sharp-eyed Swabian lady of about sixty, turned three quarters to "
        "the left: grey hair in a neat permed bun, half-moon reading glasses on a thin chain, a knowing pursed smile, "
        "small pearl earrings, a plum-coloured buttoned cardigan over a white blouse, a pencil tucked behind her ear."),
    "nullfuchs": (
        "Head-and-shoulders portrait of an invented skinny Swabian man of about fifty with a fox-like narrow face, "
        "turned three quarters to the right: a long pointed nose, a huge mischievous grin, sparse ginger hair combed "
        "over, big ears, a brown corduroy jacket and a thin red tie."),
    "grandspieler": (
        "Head-and-shoulders portrait of an invented big broad Swabian man of about sixty, facing forward: a bald head "
        "with a dark fringe, bushy black eyebrows, a double chin, a proud boastful grin, a white shirt with rolled-up "
        "sleeves and red braces, one huge fist raised beside his face."),
    "neuling": (
        "Head-and-shoulders portrait of an invented young Swabian man of about twenty, turned three quarters to the "
        "left: shaggy blond late-1970s hair, a thin fuzzy first moustache, a nervous eager smile, wide eyes, a faded "
        "denim jacket over a red-and-white striped T-shirt."),
    "schwaetzer": (
        "Head-and-shoulders portrait of an invented chubby talkative Swabian man of about fifty-five, turned three "
        "quarters to the right: mouth wide open in the middle of a sentence, rosy cheeks, curly brown hair, one index "
        "finger raised, a knitted burgundy sweater vest over a light blue shirt."),
    "lehrer": (
        "Head-and-shoulders portrait of an invented thin, strict retired Swabian schoolteacher of about sixty-five, "
        "facing forward: thick horn-rimmed glasses, neatly parted grey hair, a small grey goatee, a slightly "
        "disapproving smile, a plain brown jacket with a red bow tie, a red pencil in his breast pocket."),
    "schlitzohr": (
        "Head-and-shoulders portrait of an invented crafty old Swabian card player of about sixty-five, turned three "
        "quarters to the left: winking with one eye, a sly crooked grin, a thin grey moustache, a dark grey felt hat "
        "tilted to one side, a black waistcoat over a white shirt with a pocket-watch chain."),
    "kommandant": (
        "Head-and-shoulders portrait of an invented Swabian village fire brigade commander of about fifty-eight, "
        "facing forward: a red face, a huge bushy brown moustache, mouth open as if shouting an order with a grin, a "
        "dark navy blue uniform jacket with silver buttons and a navy peaked cap without any badge, a broad chest."),
    "wirtin": (
        "Head-and-shoulders portrait of an invented robust, cheerful Swabian inn landlady of about fifty, turned three "
        "quarters to the right: fair hair pinned up, red cheeks, a warm laughing face, a white blouse with puffed "
        "short sleeves under a dark red apron dress, a pencil behind her ear."),
    "altmeister": (
        "Head-and-shoulders portrait of an invented very old Swabian card master of about eighty, facing forward: thin "
        "white hair, big bushy white eyebrows, a deeply wrinkled calm face, a wise half-smile, a black felt hat, a "
        "dark suit jacket over a white collarless shirt buttoned to the top."),
    "wengerter": (
        "Head-and-shoulders portrait of an invented weathered Swabian winegrower of about sixty, turned three quarters "
        "to the left: a sun-tanned leathery face with deep wrinkles and grey stubble, squinting up at the sky with a "
        "worried frown, a battered straw hat, a brown waistcoat over a collarless white shirt with rolled sleeves."),
    "muellerin": (
        "Head-and-shoulders portrait of an invented sturdy Swabian miller woman of about sixty, turned three quarters "
        "to the right: a white headscarf, flour dust on her cheeks and eyebrows, small round glasses, a kind firm "
        "smile, a grey-blue dress with sleeves rolled up and a white apron."),
    "bahner": (
        "Head-and-shoulders portrait of an invented Swabian railwayman of about fifty-eight, turned three quarters to "
        "the left: a dark blue railway uniform jacket and a dark blue peaked cap without any badge, a neat grey "
        "moustache, a round face, looking down at a big silver pocket watch held up in his hand."),
    "klosterwirt": (
        "Head-and-shoulders portrait of an invented portly innkeeper of about sixty-two from beside an old monastery, "
        "facing forward: a bald round head with a white fringe of hair, rosy cheeks, a content smile, hands folded on "
        "his belly, a white apron over a brown shirt."),
    "floesser": (
        "Head-and-shoulders portrait of an invented strong Black Forest raftsman of about fifty-five, turned three "
        "quarters to the right: a wide-brimmed black felt hat, a thick black beard, a weathered face, a red waistcoat "
        "over a white shirt, a long wooden pole resting on his shoulder."),
    "brenner": (
        "Head-and-shoulders portrait of an invented Black Forest cherry-brandy distiller of about sixty-five, turned "
        "three quarters to the left: a red bulbous nose, a white handlebar moustache, small round glasses, sniffing a "
        "small schnapps glass held up in his fingers, a black waistcoat over a white shirt."),
    "wasenwirt": (
        "Head-and-shoulders portrait of an invented loud fairground beer-tent landlord of about fifty-five, facing "
        "forward: a red face, mouth wide open laughing, a big belly, a white shirt with a red neckerchief and leather "
        "braces, a grey felt hat with a feather."),
    "schaffnerin": (
        "Head-and-shoulders portrait of an invented Stuttgart tram conductress of about sixty, turned three quarters to "
        "the right: short grey curly hair under a dark blue-grey uniform cap without any badge, a stern but amused "
        "look, a dark blue-grey uniform jacket, a leather ticket bag strap across her chest, an old metal ticket punch "
        "held up in her hand."),
    "wachtmeister": (
        "Head-and-shoulders portrait of an invented friendly Swabian village policeman of about fifty-five, facing "
        "forward: a round face with a thick brown moustache, a guilty smile, a green uniform jacket over a beige "
        "shirt with a dark tie and a green peaked cap without any badge or emblem."),
    "anwaerter": (
        "Head-and-shoulders portrait of an invented young Swabian police trainee of about twenty-two, turned three "
        "quarters to the left: an eager freckled face, a green peaked cap a little too big for him without any badge "
        "or emblem, a green uniform jacket over a beige shirt, a small notebook and a pencil in his hand."),
    "biker-manne": (
        "Head-and-shoulders portrait of an invented burly biker of about forty-five, turned three quarters to the "
        "right: long brown hair in a ponytail, a full bushy beard, a red bandana, sunglasses pushed up on his head, a "
        "big friendly grin, a black leather jacket with zips."),
    "biker-uschi": (
        "Head-and-shoulders portrait of an invented cool biker woman of about forty, turned three quarters to the "
        "left: short spiky dark hair, aviator sunglasses pushed up on her head, a confident half-smile, a smudge of "
        "chain grease on her cheek, a red leather motorcycle jacket."),
    "meister": (
        "Head-and-shoulders portrait of an invented Swabian master car mechanic of about sixty, facing forward: grey "
        "hair, a big grey moustache, a pencil behind his ear, a calm shrug with both palms turned up, a light brown "
        "workshop coat over a checked shirt, a spanner in his breast pocket."),
    "lehrling": (
        "Head-and-shoulders portrait of an invented Swabian apprentice mechanic of about seventeen, turned three "
        "quarters to the right: messy blond hair, oil smudges on his cheek and nose, a sheepish grin, blue work "
        "overalls that are too big for him, holding up a broken piece of exhaust pipe."),
    "flohmarkt": (
        "Head-and-shoulders portrait of an invented Swabian flea-market trader of about sixty, turned three quarters to "
        "the left: a plain brown flat cap, bushy grey sideburns, a wheeler-dealer grin, a beige cardigan, holding up "
        "an old brass alarm clock."),
}
BLUE_KEY = {"wachtmeister", "anwaerter"}   # green uniforms -> blue chroma key

# ------------------------------------------------------------------------------------------------ dogs
DOG_LOOK = {
    "shepherd": ("a German shepherd dog with a black saddle, a tan face, chest and legs, a black muzzle, tall upright "
                 "pointed ears and a bushy tail, wearing a red collar"),
    "wolfhound-a": ("an Irish Wolfhound, a very tall shaggy dog with a wiry steel-grey coat, small folded-back ears, "
                    "a long head with a scruffy grey beard and eyebrows, long legs, wearing a blue collar"),
    "wolfhound-b": ("an Irish Wolfhound, a very tall shaggy dog with a wiry wheaten sandy-cream coat with darker "
                    "brindle streaks, a darker muzzle, small folded-back ears, a scruffy beard, long legs, wearing a "
                    "brown leather collar"),
    "airedale": ("an Airedale Terrier with a wiry tan coat and a black saddle on its back, small folded V-shaped ears, "
                 "a square bearded muzzle, a perky upright tail, wearing a yellow collar"),
    "schnauzer-a": ("a Giant Schnauzer with a solid black wiry coat, bushy black eyebrows and a big black beard, "
                    "natural folded ears, wearing an orange collar"),
    "schnauzer-b": ("a Giant Schnauzer with a pepper-and-salt grey wiry coat, bushy pale grey eyebrows and a big "
                    "silver-grey beard, natural folded ears, wearing a purple collar"),
}
DOG_PORTRAIT = ("Head-and-shoulders portrait of {look}, a friendly happy face, mouth a little open, looking at the "
                "viewer. The head fills the upper two thirds of the square picture, the chest reaches the bottom edge.")
DOG_POSES = {
    "sit": "{look}, sitting upright and calm, seen from the front in a slight three-quarter view, the whole dog visible.",
    "lie": "{look}, lying down on its belly with its head up and front paws stretched forward, seen from the side "
           "facing right, the whole dog visible.",
    "ears": "{look}, standing alert with its head raised high and ears up as far as they go, seen from the side "
            "facing right, the whole dog visible.",
    "bark": "{look}, standing and barking happily with its mouth wide open, seen from the side facing right, the whole "
            "dog visible.",
    "sleep": "{look}, curled up asleep with closed eyes and its nose tucked against its tail, seen from the side, the "
             "whole dog visible.",
    "window": "the head and neck of {look}, leaning out happily as if from a car window, mouth open with the tongue "
              "out, ears flapping in the wind, facing right, cut off at the bottom of the picture below the neck.",
}

# ------------------------------------------------------------------------------------------------ vehicles
VEHICLES = {
    "van": VANS["van"].split(" On a carrier rack")[0] + (
        " On the rear end there is an empty motorcycle carrier rack: a small flat steel platform with a rail."),
    "bike": (
        "A classic 1970s motorcycle without rider, seen exactly from the side in a flat side elevation, front wheel to "
        "the right: an upright road bike with a round chrome headlight, a dark red fuel tank with chrome side panels, "
        "a black bench seat, an air-cooled twin engine with fins, chrome exhaust pipes, twin rear shock absorbers, "
        "spoked wheels with chrome rims, without any logos or badges."),
    "rig": (
        "A classic 1970s motorcycle with a sidecar, without rider, seen exactly from the side in a flat side "
        "elevation, front wheel to the right: an upright road bike with a round chrome headlight, a dark red fuel tank "
        "with chrome side panels, spoked wheels, and a boat-shaped dark red sidecar with a small windscreen attached "
        "on the far side, its body and wheel partly visible behind the motorcycle, without any logos or badges."),
}

# ------------------------------------------------------------------------------------------------ items
ITEMS = {
    # souvenirs
    "reading-glasses": "a pair of folding reading glasses with thin gold frames and a black cord",
    "notepad": "a small spiral-bound notepad with blank lined pages and a short pencil lying on it",
    "lucky-penny": "a shiny old copper coin with a simple oak-twig relief, no numbers and no letters",
    "thermos": "a 1970s red thermos flask with a cream screw-on cup lid",
    "road-atlas": "a closed thick road atlas book with a cover showing a colourful map pattern of roads and green "
                  "areas, no title",
    "piggy-bank": "a pink ceramic piggy bank with a coin slot on its back",
    "pennant": "a small red-and-white felt club pennant with a stitched yellow star, hanging from a little wooden stand",
    "chess-clock": "a wooden twin-dial chess clock with two round clock faces with plain tick marks and no numerals and "
                   "two buttons on top",
    "pencil": "a short stubby red-and-black carpenter's pencil, chewed at one end",
    "snack-board": "a wooden Swabian snack board (Vesperbrett) with a slice of farmhouse bread, sausage slices, a "
                   "pickled gherkin, a radish and a small knife",
    "dog-whistle": "a small silver dog whistle on a leather cord",
    "postcard": "a picture postcard showing a sunny river valley with vineyards, slightly bent, without any writing",
    "oil-can": "an old-fashioned red oil can with a long thin brass spout",
    "magnifier": "a magnifying glass with a wooden handle and a brass rim",
    # beer mats: cardboard coasters seen from straight above, a symbol in two colours, never letters or numbers
    "grand-bonus": "a round cream cardboard beer mat with a scalloped edge, printed with a red crown",
    "null-bonus": "a round light blue cardboard beer mat printed with a thick empty dark blue ring",
    "hand-bonus": "a square cream cardboard beer mat with rounded corners, printed with a red open hand",
    "schneider-bonus": "a round cream cardboard beer mat printed with a pair of black tailor's scissors",
    "defence-bonus": "a square light green cardboard beer mat with rounded corners, printed with a dark green shield",
    "redeal": "a round cream cardboard beer mat printed with two curved red arrows chasing each other in a circle",
    "extra-game": "a round yellow cardboard beer mat printed with a fan of four red playing card backs and a small "
                  "plus sign",
    "forehand": "a square cream cardboard beer mat with rounded corners, printed with a brown hand pointing its index "
                "finger forward",
    "double-pot": "a round orange cardboard beer mat with a scalloped edge, printed with two stacked gold coins",
    # camper upgrades
    "aux-tank": "a red metal jerrycan with a handle",
    "roof-box": "a cream-coloured streamlined roof box for a car roof",
    "dog-bed": "a round wicker dog basket with a red checked cushion",
    "awning": "a rolled-out orange-and-brown striped camper awning on two thin poles, small and seen from the side",
    "fridge": "a small cream camping cool box with a handle and a lid",
    "radio": "a 1970s car radio with chrome knobs, push buttons and a tuning dial with plain tick marks and no numerals",
    "sidecar": "a boat-shaped dark red motorcycle sidecar with a small windscreen and its own spoked wheel",
}
ITEM_TOP = {"grand-bonus", "null-bonus", "hand-bonus", "schneider-bonus", "defence-bonus", "redeal", "extra-game",
            "forehand", "double-pot"}
TROPHIES = {
    "enztal": "a shining silver trophy cup on a dark wooden base, the cup decorated with a relief of grape vines and a "
              "small golden bunch of grapes on the lid",
    "muehlacker": "a shining gold trophy cup on a dark wooden base, the cup decorated with a relief of a monastery "
                  "arch and a small golden wheel on the lid",
    "schwarzwald": "a shining silver trophy cup on a dark wooden base, the cup decorated with a relief of fir trees "
                   "and a small golden fir cone on the lid",
    "stuttgart": "a shining gold trophy cup on a dark wooden base, the cup decorated with a relief of vineyards and a "
                 "small slender golden tower on the lid",
    "wander": "a big lidded silver challenge cup (Wanderpokal) with two large handles on a tall dark wooden base, a "
              "row of small blank silver plates on the base, a golden finial on the lid",
}

# ------------------------------------------------------------------------------------------------ maps
MAPS = {
    "enztal": "the river Enz winding in a big loop from the top right across the middle to the left, vineyard slopes "
              "along it, a few forest patches in the corners",
    "muehlacker": "a river crossing from left to right with one small bend, forests at the top and bottom, orchards "
                  "and vineyards on gentle hills",
    "schwarzwald": "dense fir forest almost everywhere with a few clearings, two rivers running down valleys from the "
                   "top to the bottom",
    "stuttgart": "a broad river coming from the top and flowing to the right, vineyard slopes, a few forests at the "
                 "edges, gentle hills",
}

# ------------------------------------------------------------------------------------------------ event panels
# docs/art-requests.md (Text area): 256x128 comic panels, lower quarter calm, no lettering. Same camper everywhere.
CAMPER = ("a cream-white 1970s alcove camper with a broad orange-brown stripe along its side and a motorcycle on its "
          "rear rack")
EVENTS = {
    "road-enz": f"A country road along a loop of the river Enz, steep vineyards on the slope above, {CAMPER} driving "
                "to the right along the road.",
    "vineyard": "A steep terraced vineyard with dry stone walls above the river Enz, a winegrower carrying a wooden "
                "grape basket on his back between the vine rows, the village far below.",
    "besen": "The courtyard of a Swabian Besenwirtschaft: a broom of birch twigs hanging above the house door, simple "
             "wooden benches and tables, wine in handled glasses, lamps glowing in the courtyard, guests chatting.",
    "cellar": "A vaulted stone cellar with big wooden wine barrels; from one barrel a strong jet of cider shoots out "
              "and a man in an apron presses his thumb on the hole, splashing.",
    "village-square": f"A Swabian village square with half-timbered houses, a stone fountain and the town hall with "
                      f"a little bell tower, pigeons on the cobbles, {CAMPER} parked at the edge.",
    "hocketse": "A Swabian street festival (Hocketse): beer benches under paper lanterns, trays of sheet cake, a "
                "musician playing the accordion, a card table with one empty chair waiting for a player.",
    "pitch-evening": f"A camper pitch in the evening: {CAMPER} with its awning out, two folding camping chairs, a "
                     "glowing lantern, crickets in the tall grass, the last light over the hills.",
    "pitch-rain": "Rain pounding on a camper, seen from inside: a coffee cup and an open newspaper with blank grey "
                  "columns on a small table, a fogged-up window with raindrops, a cosy lamp.",
    "kehrwoche": "Kehrwoche at a camper pitch: a stern Swabian woman in a flowered apron dress holding a birch broom "
                 "points sternly at a small pile of leaves on the path.",
    "traffic-jam": "A traffic jam on a country road in the summer sun: a queue of 1970s cars without logos, heat "
                   "shimmer, an empty yellow diversion sign at the roadside.",
    "sheep": f"A flock of sheep crossing a country road, a shepherd with a broad hat and a crook, {CAMPER} waiting with "
             "its engine running.",
    "police": f"Two village policemen in green uniforms with a signalling disc at a green-and-white 1970s patrol car "
              f"without logos, waving {CAMPER} to stop at the roadside.",
    "fire-station": "The yard in front of a village fire station during the fire brigade festival: a red fire engine "
                    "without logos, beer benches, firemen aiming a water hose at a tin can on a post.",
    "exhaust": "A small village workshop: the exhaust pipe falls off a motorcycle right at the apprentice's feet, he "
               "looks shocked, the old master mechanic shrugs calmly.",
    "petrol-station": "A small village petrol station with two old petrol pumps, oil cans on a rack, an attendant in "
                      "a grey work coat, three mopeds leaning at the side.",
    "bike-curves": "A 1970s motorcycle leaning into a curve on a forest road, the rider in an open-face helmet and a "
                   "brown leather jacket, fir trees rushing past.",
    "bike-meet": "A motorcycle meeting on a meadow: 1970s motorcycles in a row, small tents, a campfire, a card table "
                 "made from a wooden crate.",
    "bike-roadside": "A motorcycle at the roadside with an open tool roll, the rider kneeling beside it fiddling with "
                     "the engine, a buzzard watching from a fence post.",
    "phone-booth": "A yellow telephone booth at the edge of a village in the evening light, a man inside with the "
                   "receiver at his ear and coins in his hand.",
    "hungary-road": f"A long straight road through the Hungarian plain lined with poplars, a wooden draw well with a "
                    f"long sweep pole, {CAMPER} small on the road.",
    "shelter": "An animal shelter with kennels behind wire fences; in the last kennel a big grey Irish Wolfhound "
               "calmly looks through the bars.",
    "dog-meadow": "A dog meadow at the edge of a forest: dogs romping, a ball flying through the air, owners holding "
                  "leashes.",
    "dog-thief": "A dog running off with a long string of sausages in its mouth, a butcher in a white apron running "
                 "after it waving his arms.",
    "visit": "A car stops at a camper pitch, a big black Giant Schnauzer jumps out of the door, a picnic basket on "
             "the passenger seat.",
    "hitchhiker": "A hitchhiker with a backpack at the roadside holding out his thumb, a folding chess board under "
                  "his arm.",
    "kiosk": "A kiosk with a newspaper stand and jars of sweets, a local newspaper lying open on the counter at the "
             "puzzle page with an empty grid of squares.",
    "inn-stube": "A Swabian inn parlour: the regulars' table under a blank wooden sign, playing cards and beer "
                 "glasses on the table, a green tiled stove, a felt pennant on the wall.",
    "van-breakdown": f"{CAMPER[0].upper() + CAMPER[1:]} stopped at the roadside with its bonnet open and steam rising, a "
                     "red warning triangle on the road, the driver scratching his head.",
    "monastery": "The cloister of an old Cistercian monastery: a fountain house with a stone basin, arches and walls "
                 "of warm sandstone, an innkeeper in an apron walking through.",
    "railway": "A railway junction: many tracks, a brick signal box, a long freight train passing, the red-and-white "
               "barrier of a level crossing lowered.",
    "orchard": "An orchard meadow below the hills: old apple trees, a wooden ladder against a tree, baskets full of "
               "red apples, a stoneware cider jug in the grass.",
    "forest-road": f"A Black Forest road climbing in hairpin bends, dark fir trees, mist in the valley, {CAMPER} small "
                   "in the picture.",
    "distillery": "A small Black Forest distillery: a shining copper still, baskets of dark cherries, small schnapps "
                  "glasses on a wooden board.",
    "raft": "A wooden log raft on the river Enz between fir-covered slopes, raftsmen with long poles, water "
            "splashing.",
    "spa": "The spa gardens of Bad Wildbad: a grand spa house, a music pavilion, spa guests with walking sticks and "
           "hats strolling, the river Enz rippling past.",
    "wasen": "A folk festival on the Cannstatter Wasen at dusk: a big festival tent, a Ferris wheel, gingerbread "
             "hearts decorated with icing swirls only, colourful lights.",
    "staeffele": f"Steep stone stairways between houses on a Stuttgart hillside, {CAMPER} standing helplessly at the "
                 "bottom.",
    "city": f"A busy Stuttgart crossroads: a yellow tram, tall buildings, {CAMPER} wedged in between 1970s cars "
            "without logos.",
    "factory-gate": "A factory gate with a gatekeeper's hut at shift change: workers with bicycles and lunch tins, "
                    "big factory halls behind, no signs.",
    "flea-market": "A flea market: trestle tables full of odds and ends, a trader in a flat cap proudly holding up an "
                   "old clock.",
}

# ------------------------------------------------------------------------------------------------ additions (4 Oct, later)
PORTRAITS_ALL.update({
    "schultes": (
        "Head-and-shoulders portrait of an invented vain Swabian village mayor in his late fifties, facing forward: "
        "dark hair carefully combed over a bald patch, a self-important beaming smile, a raised index finger as if "
        "giving a speech, a dark grey suit with a white shirt and a dark red tie, a heavy golden chain of office with "
        "a plain round medallion without any picture or writing lying on his chest."),
    "amtsbote": (
        "Head-and-shoulders portrait of an invented lean, sly Swabian town-hall clerk of about sixty, turned three "
        "quarters to the left: a long thin face with a deadpan expression and a tiny mischievous gleam in his eyes, "
        "thin grey hair, a beige cardigan over a white shirt with black sleeve garters, holding a dark flat cap in "
        "his hand against his chest."),
})
EVENTS.pop("fire-station", None)
EVENTS["rathaus"] = ("A small half-timbered town hall with an outside stone staircase and a little bell tower: on the "
                     "steps a vain village mayor with a golden chain of office raises his index finger, a pair of "
                     "scissors in his other hand cutting a red ribbon, beside him his lean clerk with a document folder "
                     "and a deadpan face, a few villagers below.")

# event panels with our camper: rendered WITHOUT it (Krea draws caravans or other motorhomes), our camper is
# composited later (tools/art/compose.py); the brief keeps the space free where it will stand
EVENTS_NOVAN = {
    "road-enz": "A country road along a loop of the river Enz, steep vineyards on the slope above, the road in the "
                "foreground empty, warm evening light.",
    "village-square": "A Swabian village square with half-timbered houses, a stone fountain and the town hall with a "
                      "little bell tower, pigeons on the cobbles, an empty cobbled parking space at the right edge of "
                      "the square.",
    "pitch-evening": "A camper pitch in the evening: the left half of the picture is an empty level grassy pitch, in "
                     "the right half two folding camping chairs and a glowing lantern on the grass, crickets in the "
                     "tall grass, the last light over the hills.",
    "sheep": "A flock of sheep crossing a country road from the left, a shepherd with a broad hat and a crook, the "
             "right third of the road empty.",
    "police": "Two village policemen in green uniforms, one raising a round signalling disc, standing beside a "
              "green-and-white 1970s patrol car without logos on the right side of a village road, both looking at "
              "the empty left half of the road.",
    "hungary-road": "A long straight road through the Hungarian plain lined with poplars, a wooden draw well with a "
                    "long sweep pole on the left, the road empty.",
    "van-breakdown": "A country roadside: a big cloud of white steam rising in the middle of the picture, a red "
                     "warning triangle standing on the road on the right, a man on the right scratching his head, the "
                     "left half of the roadside empty.",
    "forest-road": "A Black Forest road climbing in hairpin bends, dark fir trees, mist in the valley, the road empty.",
    "staeffele": "Steep stone stairways between old houses on a Stuttgart hillside, an empty cobbled street at the "
                 "bottom of the stairs.",
    "city": "A busy Stuttgart crossroads: a yellow tram on the left, tall old buildings, 1970s cars without logos "
            "queuing on the right, an empty gap in the traffic in the middle of the street.",
}

# the same motorcycle seen head-on, for the crosswise rear carrier (Motorradträger am Heck): in the camper's pure side
# view a bike carried crosswise behind the rear wall is seen end-on
BIKE_FRONT = (
    "The same classic 1970s motorcycle without rider, seen exactly from the front (head-on, a straight front "
    "elevation), standing upright: the front wheel seen edge-on as a narrow black tyre under a short chrome "
    "mudguard, the two chrome fork legs, a round chrome headlight in the middle, wide chrome handlebars with black "
    "grips and two round mirrors on thin stalks, the dark red fuel tank with chrome side panels visible above and "
    "behind the headlight, the finned cylinders of the air-cooled twin engine sticking out a little on both sides "
    "below the tank, black footpegs, without any logos or badges.")
