// Shared ids (contract §13: owned by the Lead). Code, ids and file names are
// English (contract §0.10); everything visible is German and lives in src/content/ and src/data/.

// ─── Cards ────────────────────────────────────────────────────────────────────────────────────────────────

/** Suits in ascending Skat order: Karo < Herz < Pik < Kreuz. */
export const SUITS = ["diamonds", "hearts", "spades", "clubs"] as const;
export type SuitId = (typeof SUITS)[number];

/** Ranks as named in sprite frames. Order here is the natural order 7…A, not the trick order. */
export const RANKS = ["7", "8", "9", "10", "jack", "queen", "king", "ace"] as const;
export type RankId = (typeof RANKS)[number];

export const DECKS = ["french", "german", "tournament"] as const;
export type DeckId = (typeof DECKS)[number];

/** Game types a declarer can announce, plus Ramsch (house rule) for the Liste and statistics. */
export const GAME_KINDS = ["diamonds", "hearts", "spades", "clubs", "grand", "null", "ramsch"] as const;
export type GameKind = (typeof GAME_KINDS)[number];

// ─── Tour ─────────────────────────────────────────────────────────────────────────────────────────────────

export const STATION_KINDS = [
  "start", "inn", "bikers", "problem", "chess", "sudoku", "pitch", "dogs", "market", "garage", "event", "tournament",
] as const;
export type StationKind = (typeof STATION_KINDS)[number];

export const REGIONS = ["enztal", "muehlacker", "schwarzwald", "stuttgart"] as const;
export type RegionId = (typeof REGIONS)[number];

/** Gemütlich, Sportlich, Scharf (contract §4.14). */
export const DIFFICULTIES = ["cozy", "sporty", "sharp"] as const;
export type DifficultyId = (typeof DIFFICULTIES)[number];

export const HOUSE_RULES = [
  "standard", "ramsch", "schieberamsch", "kontra", "bock", "grand-evening", "null-evening", "hand-evening", "sharp",
  "long-round", "kitty",
] as const;
export type HouseRuleId = (typeof HOUSE_RULES)[number];

/** Inn stakes: pot and consequences ×1, ×1.5, ×2 (contract §4.3). */
export type StakesId = "small" | "medium" | "high";

// ─── People ───────────────────────────────────────────────────────────────────────────────────────────────

/** The twelve regulars (Stammgäste, contract §4.5). */
export const REGULARS = [
  "maurer", "zocker", "rechnerin", "nullfuchs", "grandspieler", "neuling", "schwaetzer", "lehrer", "schlitzohr",
  "kommandant", "wirtin", "altmeister",
] as const;
export type RegularId = (typeof REGULARS)[number];

/** Two Preisskat favourites per region (strength high to very high). */
export const FAVOURITES = [
  "wengerter", "muellerin", // enztal: the winegrower from the steep slopes, the miller from the Enz weir
  "bahner", "klosterwirt", // muehlacker: the railwayman from the junction, the innkeeper by the monastery
  "floesser", "brenner", // schwarzwald: the raftsman, the cherry-brandy distiller
  "wasenwirt", "schaffnerin", // stuttgart: the fairground landlord, the tram conductor
] as const;
export type FavouriteId = (typeof FAVOURITES)[number];

export const FAVOURITES_BY_REGION: Record<RegionId, [FavouriteId, FavouriteId]> = {
  enztal: ["wengerter", "muellerin"],
  muehlacker: ["bahner", "klosterwirt"],
  schwarzwald: ["floesser", "brenner"],
  stuttgart: ["wasenwirt", "schaffnerin"],
};

/** Side characters who also play Skat (village police, bikers) and the garage pair. */
export const SIDE_CHARACTERS = [
  "wachtmeister", "anwaerter", "biker-manne", "biker-uschi", "meister", "lehrling",
  // the village duo: the vain Schultes (mayor) and his sly Amtsbote, who always gets one over him (contract §0.9)
  "schultes", "amtsbote",
] as const;
export type SideCharacterId = (typeof SIDE_CHARACTERS)[number];

export type CharacterId = RegularId | FavouriteId | SideCharacterId;
export const CHARACTERS: readonly CharacterId[] = [...REGULARS, ...FAVOURITES, ...SIDE_CHARACTERS];

// ─── Collectables ─────────────────────────────────────────────────────────────────────────────────────────

export const DOGS = ["shepherd", "wolfhound-a", "wolfhound-b", "airedale", "schnauzer-a", "schnauzer-b"] as const;
export type DogId = (typeof DOGS)[number];

export const SOUVENIRS = [
  "reading-glasses", "notepad", "lucky-penny", "thermos", "road-atlas", "piggy-bank", "pennant", "chess-clock",
  "pencil", "snack-board", "dog-whistle", "postcard", "oil-can", "magnifier",
] as const;
export type SouvenirId = (typeof SOUVENIRS)[number];

export const BEER_MATS = [
  "grand-bonus", "null-bonus", "hand-bonus", "schneider-bonus", "defence-bonus", "redeal", "extra-game", "forehand",
  "double-pot",
] as const;
export type BeerMatId = (typeof BEER_MATS)[number];

export const UPGRADES = ["aux-tank", "roof-box", "dog-bed", "awning", "fridge", "radio", "sidecar"] as const;
export type UpgradeId = (typeof UPGRADES)[number];

export const VEHICLES = ["camper", "sidecar-rig"] as const;
export type VehicleId = (typeof VEHICLES)[number];

/** Stammgetränk of the player (contract §4.1). */
export const DRINKS = ["beer", "weizen", "wine", "cider", "spezi"] as const;
export type DrinkId = (typeof DRINKS)[number];

// ─── Media ────────────────────────────────────────────────────────────────────────────────────────────────

export const MUSIC = [
  "daheim", "enztal", "stromberg", "schwarzwald", "stuttgart", "stammtisch", "preisskat", "raetsel", "stellplatz",
  "motorradtreff", "pokal", "heimfahrt",
] as const;
export type MusicId = (typeof MUSIC)[number];

export const SFX = [
  "card-deal", "card-play", "card-raise", "trick-take", "shuffle", "knock", "bid", "pass", "skat-pick", "list-write",
  "glass-clink", "bottle-open", "pour", "gulp", "cheers", "burp", "chair", "inn-murmur", "inn-murmur-busy", "beergarden",
  "coin", "till", "stamp",
  "page-turn", "van-start", "van-drive", "van-door", "van-horn", "bike-kick", "bike-rev", "bike-idle", "dog-bark-big",
  "dog-bark-small", "dog-pant", "dog-whine", "chess-move", "chess-capture", "pencil", "sudoku-right", "sudoku-wrong",
  "church-bell", "rain", "crickets", "fuel", "wrench", "ui-click", "ui-back", "ui-open", "win-sting", "lose-sting",
  "trophy-fanfare",
] as const;
export type SfxId = (typeof SFX)[number];

/** The room tone for an inn room (recorded loops, contract §11): busy for the tent, outdoor for garden-like rooms. */
export function roomAmbience(room: string): SfxId {
  if (room === "tent") return "inn-murmur-busy";
  if (room === "beergarden" || room === "campsite" || room === "bikers") return "beergarden";
  return "inn-murmur";
}
