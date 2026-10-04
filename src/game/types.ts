// Shared data contracts between workstreams (contract §13). Owned by the Lead.
// Pure types: importable from node tests.
import type {
  BeerMatId, CharacterId, DeckId, DifficultyId, DogId, DrinkId, GameKind, HouseRuleId, MusicId, RegionId,
  SouvenirId, StakesId, StationKind, UpgradeId, VehicleId,
} from "./ids.ts";

// ─── Profile and place pack (contract §8) ─────────────────────────────────────────────────────────────────

/** Everything personal. The neutral default profile has neutral dog names, no partner, no child, no notes. */
export interface Profile {
  /** Place id of home (decides the home region = stage 1). */
  home: string;
  partner: string;
  child: string;
  /** Name painted on the camper's rear. */
  van: string;
  /** His motorcycle in words ("eine rote Zweizylinder aus den Siebzigern"). */
  bike: string;
  deck: DeckId;
  dogs: Partial<Record<DogId, string>>;
  /** One line per place id, shown on the place stamp and in the event "Werkstor". */
  notes: Record<string, string>;
}

export interface PlaceDef {
  id: string;
  name: string;
  /** Position on the region map image, 0…1 from the top-left. */
  x: number;
  y: number;
  note?: string;
}

export interface RegionDef {
  id: RegionId;
  /** "Unteres Enztal" */
  title: string;
  /** Place id of the Preisskat. */
  tournament: string;
  /** Art id of the atlas sheet (public/art/maps/<id>.png). */
  map: string;
  /** Direction of travel across the map: places are sorted into columns along it. */
  direction: "east" | "west" | "north" | "south";
  places: PlaceDef[];
}

export interface PlacePack {
  id: string;
  /** "SKAT AUF TOUR" */
  title: string;
  /** "Die Enztal-Tour" */
  subtitle: string;
  regions: RegionDef[];
}

// ─── Stage map (contract §4.2) ────────────────────────────────────────────────────────────────────────────

export interface InnSetup {
  /** "Gasthaus Krone" */
  name: string;
  houseRule: HouseRuleId;
  opponents: [CharacterId, CharacterId];
  stakes: StakesId;
  /** Inn interior art id (public/art/inns/<room>.png), e.g. "village". */
  room: string;
}

export interface MapNode {
  id: string;
  /** 0 = start, 6 = Preisskat. */
  col: number;
  /** Row within the column (0…2). */
  row: number;
  kind: StationKind;
  /** Place id from the place pack. */
  place: string;
  /** Layout position on the map screen (computed by the generator from the place position). */
  x: number;
  y: number;
  /** Node ids in the next column reachable by road. */
  next: string[];
  inn?: InnSetup;
  /** Pre-rolled event id for `event` stations (no repeats within a tour). */
  event?: string;
}

export interface StageMap {
  region: RegionId;
  seed: number;
  nodes: MapNode[];
}

// ─── Skat table (Skat workstream ⇄ Tour workstream) ───────────────────────────────────────────────────────

/** Extra list points per won game kind; computed by the tour from beer mats and house-rule evenings. */
export interface ListBonus {
  grand: number;
  null: number;
  hand: number;
  schneider: number;
  defence: number;
}

/**
 * What the tour gives a table on top of the house rule. Every perk is an honest, visible advantage; nothing changes
 * the cards (contract §0.3).
 */
export interface TablePerks {
  /** Reading glasses or setting: show the trumps that have fallen. */
  showTrumps: boolean;
  /** Notepad or setting: show both parties' card points. */
  showPoints: boolean;
  /** Redeals offered per round before bidding (lucky penny, beer mat "redeal"). */
  redeals: number;
  /** Peeks at one Skat card per round before bidding (Riesenschnauzer schnauzer-a; dog whistle doubles). */
  skatPeeks: number;
  /** Take back the own card while the trick is still open, per game (Wolfshund wolfhound-b). */
  takeBacks: number;
  /** The player sits in forehand in the first game (beer mat "forehand"). */
  forehandFirst: boolean;
  listBonus: ListBonus;
}

export interface RoundConfig {
  seed: number;
  /** Left and right opponent. */
  opponents: [CharacterId, CharacterId];
  houseRule: HouseRuleId;
  /** 3 (inn), 4 (beer mat "extra-game"), 6 (long round, Preisskat), 9 (tour final). */
  games: number;
  /** Tournament scoring (contract §4.6). */
  tournament: boolean;
  /** Inn name or "Preisskat in Vaihingen an der Enz" for the board. */
  title: string;
  /** Inn interior art id. */
  room: string;
  /** Money the player has at the table (house rule "kitty": a lost game pays one Mark into the Kasse). */
  marks: number;
  perks: TablePerks;
  /** Opponent thinking depth multiplier from the difficulty (1 = as the persona says). */
  depth: number;
}

/** One finished Skat game, for the Liste, the statistics and the Tourenbuch. Seats: 0 = player, 1 = left, 2 = right. */
export interface GameRecord {
  /** Seed of the deal (shown in the Liste, contract §0.3). */
  seed: number;
  /** Seat in forehand. */
  forehand: 0 | 1 | 2;
  /** Seat of the declarer; null when passed in (eingepasst) or Ramsch. */
  declarer: 0 | 1 | 2 | null;
  kind: GameKind | "passed";
  hand: boolean;
  ouvert: boolean;
  schneiderAnnounced: boolean;
  schwarzAnnounced: boolean;
  schneider: boolean;
  schwarz: boolean;
  /** Matadors "mit"/"ohne" count (0 for Null and Ramsch). */
  matadors: number;
  /** true = "mit", false = "ohne" (absent for Null, Ramsch and passed games). Added by Skat. */
  withTops?: boolean;
  /** Ramsch details for the Liste (absent otherwise). Added by Skat. */
  ramsch?: { losers: (0 | 1 | 2)[]; jungfrau: (0 | 1 | 2)[]; durchmarsch: 0 | 1 | 2 | null; shoves: number };
  bid: number;
  won: boolean;
  overbid: boolean;
  /** Card points of the declarer's party (or, for Ramsch, of the loser). */
  points: number;
  /** Game value as written (negative when lost, doubled per ISkO). */
  value: number;
  /** Kontra/Re factor (1, 2, 4) and Bock (×2) already included in value. */
  kontra: 0 | 1 | 2;
  /** Change of the Liste per seat for this game (extended Seeger-Fabian plus bonuses). */
  list: [number, number, number];
}

export interface RoundProgress {
  config: RoundConfig;
  games: GameRecord[];
  list: [number, number, number];
  /** House rule "kitty": Mark in the Kasse so far, and how many of them the player paid. */
  kitty: number;
  kittyPaid: number;
  /** Perks used this round (redeals, peeks). Per-game perks reset each game. */
  used: Record<string, number>;
}

export interface RoundResult {
  list: [number, number, number];
  /** Player's place 1…3; ties go in the player's favour. */
  place: 1 | 2 | 3;
  games: GameRecord[];
  /** Net Mark for the player from the table itself (house rule "kitty"; 0 otherwise). The pot is the tour's. */
  marks: number;
}

// ─── Station results (screens → tour) ─────────────────────────────────────────────────────────────────────

export type StationResult =
  | { kind: "inn" | "bikers" | "tournament" | "skat"; round: RoundResult }
  | { kind: "problem" | "chess"; solved: boolean; attempts: number }
  | { kind: "sudoku"; solved: boolean; size: 6 | 9 }
  | { kind: "none" };

// ─── Tour state (saved after every station and every Skat game) ───────────────────────────────────────────

export interface RouteEntry {
  stage: number;
  node: string;
  place: string;
  kind: StationKind;
  /** One German line for the Abrechnung ("Krone, Roßwag: Erster, +7 Mark"). */
  line: string;
  fuel: number;
  marks: number;
  /** The player's list points at a Skat station (for the Abrechnung's Liste). Added by Tour. */
  points?: number;
}

/**
 * What the current station still holds (rolled on arrival, saved so a reload resumes inside the station).
 * Added by Tour.
 */
export interface StationState {
  node: string;
  /** Rolled offers: souvenir ids (market), upgrade ids (garage), dog ids (dog meadow). */
  offer?: string[];
  /** The event on screen (event station, the bikers' talk, the dog meadow, a chain step). */
  event?: string;
  /** A special Skat round from an event, and where the story continues. */
  special?: {
    opponents: [CharacterId, CharacterId];
    houseRule: HouseRuleId;
    games: number;
    stakes: StakesId;
    intro?: string;
    onWin?: string;
    onLose?: string;
  };
  /** A puzzle offered by an event or the awning. */
  puzzle?: "problem" | "chess" | "sudoku";
  /** Steps already done here ("arrived", "round", "event", "fuel", "awning", "bought:<id>"…). */
  done: string[];
}

export interface TourState {
  version: number;
  seed: number;
  difficulty: DifficultyId;
  vehicle: VehicleId;
  /** 0, 1, 2 */
  stage: number;
  /** Regions of the stages so far (index = stage). */
  regions: RegionId[];
  map: StageMap;
  /** Current node id. */
  at: string;
  /** Node ids visited in the current stage. */
  visited: string[];
  fuel: number;
  fuelMax: number;
  marks: number;
  dogs: DogId[];
  souvenirs: SouvenirId[];
  beerMats: BeerMatId[];
  upgrades: UpgradeId[];
  flags: string[];
  seenEvents: string[];
  /** Once-per-stage / once-per-tour counters ("shepherd", "fridge", "free-detour", "postcard"…). */
  used: Record<string, number>;
  /** Regions whose Preisskat was won in this tour. */
  trophies: RegionId[];
  route: RouteEntry[];
  /** A Skat round in progress (resumes at the next game after loading). */
  round?: RoundProgress;
  /** The current station's sub-state (offers, event on screen, pending special round). Added by Tour. */
  station?: StationState;
  /** The guided first trip (four fixed stations, no fuel loss). */
  tutorial?: boolean;
  /** Outcome when the tour has ended. */
  ended?: "won" | "empty" | "lost-final";
  stats: TourStats;
}

export interface TourStats {
  innRounds: number;
  innWins: number;
  detours: number;
  timesDriver: number;
  puzzlesSolved: number;
}

// ─── Tourenbuch (kept across tours, contract §4.13) ───────────────────────────────────────────────────────

export interface SkatStats {
  games: number;
  declared: number;
  declaredWon: number;
  byKind: Partial<Record<GameKind | "passed", number>>;
  highestValue: number;
  grandHand: number;
  schneider: number;
  schwarz: number;
  bestList: number;
  defenceWon: number;
}

export interface BookState {
  version: number;
  /** Trophies by "<region>-<difficulty>" and "wander-<difficulty>". */
  trophies: Record<string, number>;
  /** First visit date (ISO day) per place id. */
  stamps: Record<string, string>;
  /** Games and Liste balance against each character. */
  album: Partial<Record<CharacterId, { games: number; won: number; lost: number; met: string }>>;
  dogs: DogId[];
  souvenirs: SouvenirId[];
  chronicle: { date: string; text: string }[];
  skat: SkatStats;
  puzzles: { problems: number; chess: number; sudoku6: number; sudoku9: number };
  tours: { started: number; won: number; empty: number };
  /** The fun numbers: detours with the motorcycle, times he drove the others home. */
  fun: { detours: number; timesDriver: number };
  unlocks: { sidecarRig: boolean };
  innWins: number;
  /** Ids of `once` events already seen in earlier tours. Added by Tour. */
  events?: string[];
}

// ─── Data definitions (src/data) ──────────────────────────────────────────────────────────────────────────

/** Strength 1 niedrig, 2 mittel, 3 hoch, 4 sehr hoch. */
export type Strength = 1 | 2 | 3 | 4;

export interface CharacterDef {
  id: CharacterId;
  /** "Maurer-Karle" */
  name: string;
  role: "regular" | "favourite" | "side";
  region?: RegionId;
  strength: Strength;
  /** Spielweise, one sentence (shown on the map preview and in the album). */
  style: string;
  /** A table habit, one humorous sentence (flavour only, no effect on play). */
  habit: string;
  /** What stands in front of him (scenery only: drinking is a quiet joke, never a mechanic). */
  drink: "beer" | "wine" | "cider" | "schnapps" | "water" | "spezi";
  /** Portrait art id (public/art/portraits/<id>.png); defaults to the character id. */
  portrait?: string;
}

export type SpeechSituation =
  | "greet" | "bid" | "pass" | "declare" | "trickWon" | "trickLost" | "gameWon" | "gameLost" | "ramsch" | "order"
  | "farewell" | "kontra" | "tell"
  /** Someone spoilt the speaker's trick or plan (overtrumped his own partner, smeared wrong, let the declarer
   * through): friendly Swabian scolding aimed at {target} — „Du Seggl!“, „Du saublöder Grasdackel!“. */
  | "blunder"
  /** His Ass or Zehn was just taken: grumbling at {target}. */
  | "robbed"
  /** He spoilt it himself (overbid, lost his own game, wrong card): scolding himself — „I Granateseggl!“. */
  | "selfBlame"
  /** The declarer {target} just lost or overbid: dry teasing from the other two. */
  | "tease";

/**
 * Speech lines per character and situation. Placeholders: {name} (player name), {title} ("Lehrling"/"Meister"),
 * {target} (short name of whoever the line is aimed at: the player's name or another regular's short name).
 */
export type SpeechBook = Partial<Record<CharacterId, Partial<Record<SpeechSituation, string[]>>>>;

export interface HouseRuleDef {
  id: HouseRuleId;
  name: string;
  /** The rule as shown before the round (one or two sentences). */
  text: string;
}

export interface ItemDef<Id extends string = string> {
  id: Id;
  name: string;
  text: string;
  /** Price in Mark (souvenirs 2–6, upgrades 6–12). */
  price?: number;
  /** icons/items atlas frame or art id. */
  icon?: string;
}

export interface DogDef {
  id: DogId;
  breed: string;
  /** Default name when the profile has none. */
  defaultName: string;
  ability: string;
  unlock: string;
}

export interface VehicleDef {
  id: VehicleId;
  name: string;
  text: string;
  fuelMax: number;
  souvenirSlots: number;
  dogSlots: number;
}

export interface DifficultyDef {
  id: DifficultyId;
  name: string;
  text: string;
  fuelMax: number;
  potFactor: number;
  /** Second place at the Preisskat loses this much fuel (third: secondLoss + 1, sharp: 2 and 2). */
  secondLoss: number;
  thirdLoss: number;
  /** Character strength mix weights [1, 2, 3, 4]. */
  mix: [number, number, number, number];
  /** Thinking depth multiplier for opponents. */
  depth: number;
}

// ─── Events (contract §4.10) ──────────────────────────────────────────────────────────────────────────────

export type EventPool = "region" | "anywhere" | "dog" | "bike" | "chain" | "tutorial";

export interface Condition {
  dog?: DogId | "any";
  souvenir?: SouvenirId;
  upgrade?: UpgradeId;
  beerMat?: BeerMatId;
  vehicle?: VehicleId;
  /** At least this many Mark / fuel. */
  marks?: number;
  fuel?: number;
  /** Fuel at most this. */
  fuelAtMost?: number;
  flag?: string;
  notFlag?: string;
  region?: RegionId;
  /** The profile has a partner / child / a note for the current place / a van name / a bike description. */
  profile?: ProfileField;
  /** The profile lacks this field (e.g. an alternative to the child's visit for the neutral profile). */
  noProfile?: ProfileField;
  /** This dog is not yet unlocked in the Tourenbuch (unlock events stop appearing once it is). */
  dogLocked?: DogId;
  /** Dog slots free. */
  dogSlot?: boolean;
}

export type ProfileField = "partner" | "child" | "note" | "van" | "bike";

export type Range = number | [number, number];

export interface Outcome {
  /** Shown after the choice. */
  text?: string;
  fuel?: Range;
  marks?: Range;
  souvenir?: SouvenirId | "random";
  beerMat?: BeerMatId | "random";
  upgrade?: UpgradeId;
  /** A dog joins (if a slot is free) / leaves. */
  dog?: DogId;
  dogLeaves?: DogId;
  /** Unlock a dog in the Tourenbuch for future tours. */
  unlockDog?: DogId;
  /** A special round of Skat. */
  skat?: {
    opponents: [CharacterId, CharacterId];
    houseRule?: HouseRuleId;
    games?: number;
    stakes?: StakesId;
    intro?: string;
    /** Event ids to continue with depending on the place. */
    onWin?: string;
    onLose?: string;
  };
  /** A puzzle right now. */
  puzzle?: "problem" | "chess" | "sudoku";
  next?: string;
  flags?: string[];
  clearFlags?: string[];
  /** A line for the chronicle in the Tourenbuch. */
  chronicle?: string;
}

export interface WeightedOutcome {
  weight?: number;
  outcome: Outcome;
}

export interface ChoiceDef {
  text: string;
  req?: Condition;
  /** Highlighted answer unlocked by a dog, souvenir or upgrade; shows its requirement. */
  blue?: boolean;
  /** Hide when the requirement is not met (default: blue answers hidden, others shown disabled). */
  hideIfUnmet?: boolean;
  outcomes: WeightedOutcome[];
}

export interface EventDef {
  id: string;
  pool: EventPool;
  region?: RegionId;
  weight?: number;
  /** At most once per tour (all events are unique within a tour; this also excludes later tours of the book). */
  once?: boolean;
  requires?: Condition;
  title: string;
  /** public/art/events/<art>.png (256×128 comic panel). */
  art?: string;
  portrait?: string;
  speaker?: string;
  /**
   * Body text. Placeholders: {name} (player), {title} (Lehrling/Meister), {partner}, {child}, {van}, {bike},
   * {dog} (the dog named in the choice's or event's `req.dog`; with "any" the first travelling dog), {dog:<id>} (that
   * dog's profile name even when it is not travelling), {place} (current place), {home}, {note} (profile note).
   */
  text: string;
  choices: ChoiceDef[];
  music?: MusicId;
}

// ─── Puzzles ──────────────────────────────────────────────────────────────────────────────────────────────

/** A Stammtisch problem (contract §4.7), generated and verified by the open-card solver. */
export interface SkatProblem {
  id: string;
  type: "endgame" | "discard" | "bid";
  /** Short German task line ("Du spielst Pik. Wie gewinnst du alle Stiche?") */
  task: string;
  /** Encoded position; format defined by src/skat/problems. */
  data: unknown;
  difficulty: 1 | 2 | 3;
}

export interface ChessPuzzle {
  id: string;
  fen: string;
  /** UCI moves; the first is the opponent's move that sets up the puzzle (Lichess convention). */
  moves: string[];
  rating: number;
  themes: string[];
}

export type PlayerDrink = DrinkId;
