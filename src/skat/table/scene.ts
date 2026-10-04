// The Skattisch (contract §4.3): one round of RoundConfig.games games at the three-table, from the round intro to the
// places. The table works only through the rules engine (src/skat/rules) and asks the computer opponents through the
// AI seam with a SeatView (contract §0.3). Everything is left click, nothing hurries the player (contract §0.4); the
// "Was jetzt?" sentence above the hand always says what to do.
//
// Flow per game: deal (3 – Skat – 4 – 3) → [offer a redeal] → bidding → Skat or Hand → drücken → Ansage → play →
// result panel (onProgress after every game) → next game … → places → onDone(RoundResult).
import type { App, Scene } from "../../core/scene";
import type { Gfx } from "../../core/gfx";
import type { UI } from "../../core/ui";
import { settings } from "../../core/save";
import { music, sfx, type LoopHandle } from "../../core/audio";
import { lineHeight, measure, wrap } from "../../core/font";
import { C, P, rgba } from "../../core/palette";
import { Rng, hashString } from "../../core/rng";
import { bubble as drawBubble, para, portrait, soundWord, textHeight, whatNow } from "../../screens/kit";
import { createGameMenu, menuButton } from "../../screens/menu";
import { PAINTED, drawBackdrop } from "../../screens/paint/index";
import { art, atlas, hasArt } from "../../core/assets";
import type { CharacterId, DeckId, DogId, StakesId } from "../../game/ids";
import type { GameRecord, RoundProgress, RoundResult, SpeechSituation } from "../../game/types";
import { CHARACTER_DEFS, characterName, characterNameStart } from "../../data/characters";
import { HOUSE_RULE_TEXTS } from "../../content/help";
import { INN_ROOMS, INN_RULE_LEAD, SPEECH_TITLES, TOURNAMENT_RULE, TUTORIAL, fillText } from "../../content/texts";
import { DRINK_DEFS } from "../../data/drinks";
import { roomAmbience } from "../../game/ids";

/** The player's Stammgetränk (first start) is only mentioned once when he sits down — scenery, never a mechanic. */
const DRINK_SERVED: Partial<Record<string, string>> = Object.fromEntries(
  Object.entries(DRINK_DEFS).map(([id, d]) => [id, `Die Bedienung stellt dir ${d.text.replace(/^ein Most\b/, "einen Most")} hin.`]),
);
import { dogName } from "../../data/dogs";
import { getProfile } from "../../game/world";
import {
  POSITION_NAMES, applyAction, currentSeat, declarationName, finishGame, gameOptions, has, houseRuleEffects,
  isJack, isLegal, isRoundOver, kindName, lastTrick, legalActions, legalCards, nextBid, playKindOf,
  popcount, positionOf, redealsLeft, roundResult, rulesOf, sortHand, startGame, suitName, useRedeal, viewFor,
  BID_VALUES, CARD_POINTS, TRUMP, partyPoints,
} from "../rules/index";
import type { Action, Card, CardMask, DeclKind, GameOption, GameState, Seat, TrickRecord } from "../rules/index";
import { decide, ensureAi } from "./ai";
import {
  CARD_H, CARD_W, drawBack, drawBackFan, drawCard, drawChalkboard, drawSmallCard, drawTurnedCard, suitIcon,
  type CardState,
} from "./draw";
import { createLastTrickOverlay, createListeOverlay } from "./overlays";
import { duoExchange, line as speechLine, sigiTell } from "./talk";
import { gameBanter, trickBanter, type Banter } from "./banter";
import { cap, mergeHead, outcomeLine, shortName, signed, valueLines } from "./text";

export interface TableSceneOpts {
  progress: RoundProgress;
  /** Called after every finished game (and after a redeal) with the progress to save. */
  onProgress(p: RoundProgress): void;
  /** Called once after the last game, when the player clicks "Weiter" on the places. */
  onDone(r: RoundResult): void;
  playerName?: string;
  /** How the regulars address him (contract §4.5). */
  title?: "Lehrling" | "Meister";
  /** Optional intro sentence for the round panel (the tour knows the place; RoundConfig does not). */
  intro?: string;
  /** Optional stakes for the round panel. */
  stakes?: StakesId;
  /** Dev / soak test: the player's seat is played by the AI too, panels continue by themselves. */
  auto?: boolean;
  /** Dev / soak test: time factor for every pause (1 = the pace setting as it is). */
  speed?: number;
  /** Dev: a game of the round's next deal to start from (finished: its result panel; running: play goes on). */
  devGame?: GameState;
  /** Dev: actions played first instead of asking the AI (also for the player's seat). */
  devScript?: Action[];
  /** Dev: banter always fires (no chance, no cool-down) to look at it. */
  devBanter?: boolean;
  /** Dev / QA: skip the round intro and deal at once. */
  devSkipIntro?: boolean;
  /**
   * The guided first trip (Probefahrt): calm notes explain bidding, drücken, the Ansage, playing, the last trick and
   * the Liste the first time each comes up (TUTORIAL.steps). They never block: the player always acts himself.
   */
  tutorial?: boolean;
  /** The dogs travelling with him: scenery beside the table (contract §4.12), ears up when the Alte falls. */
  dogs?: DogId[];
}

type TutStep = "bid" | "discard" | "declare" | "play" | "lastTrick" | "list";

type Stage = "intro" | "deal" | "offer" | "game" | "result" | "final";

interface Bubble {
  seat: 1 | 2;
  text: string;
  t0: number;
  dur: number;
}

interface Gather {
  rec: TrickRecord;
  t0: number;
  sounded: boolean;
}

interface Flight {
  x: number;
  y: number;
  t0: number;
}

interface Word {
  text: string;
  x: number;
  y: number;
  t0: number;
  size: 0 | 1 | 2;
}

interface Pending {
  id: number;
  seat: Seat;
  state: GameState;
  t0: number;
  minDelay: number;
  action: Action | null;
}

interface LastGame {
  record: GameRecord;
  state: GameState;
  before: [number, number, number];
  heading: string;
  sentence: string;
  lines: string[];
  quote: { seat: 1 | 2; text: string } | null;
}

// ─── layout (960×540) ─────────────────────────────────────────────────────────────────────────────────────

const HAND = { x0: 150, w: 660, y: 424, raise: 12, lift: 26 };
const WHAT_BOTTOM = 394;
const TRICK: Record<Seat, { x: number; y: number }> = {
  0: { x: 444, y: 212 },
  1: { x: 386, y: 178 },
  2: { x: 502, y: 178 },
};
/** The Skat: big in the middle while it matters (bidding, Skat or Hand), small beside the trick during play. */
const SKAT_BIG = { x: 404, y: 186, step: 36 };
const SKAT_SMALL = { x: 612, y: 268, step: 14 };
const TAFEL = { x: 318, y: 6, w: 324, h: 84 };
/**
 * The two regulars in the upper corners (art study, Lead note): a 300×160 panel with the portrait drawn 3×
 * (96 art px = 144 layout units), name, position or bid, card count and the fanned backs.
 */
const OPP = {
  1: { panelX: 8, px: 16, textX: 170, fanX: 170, dir: 1 as const, tail: [88, 168] as const, glassX: 40 },
  2: { panelX: 652, px: 800, textX: 664, fanX: 664, dir: 1 as const, tail: [872, 168] as const, glassX: 920 },
};
const PANEL_W = 300;
const PANEL_H = 160;
const FAN_Y = 102;
const MENU = { x: 846, y: 176 };
const SLOT_A = { x: 12, y: 452, w: 130, h: 40 };
const SLOT_B = { x: 12, y: 498, w: 130, h: 36 };
const BTN_ROW_Y = 304;

/** Pauses per pace setting in seconds (contract §4.3: gemütlich, normal, flott). Never a time limit for the player. */
const PACE = {
  slow: { bid: 1.5, card: 1.5, think: 2.2, hold: 1.9, read: 2.4, deal: 1.4, takeBack: 2.8, slide: 0.4 },
  normal: { bid: 1.0, card: 1.0, think: 1.5, hold: 1.3, read: 1.8, deal: 1.0, takeBack: 2.2, slide: 0.32 },
  fast: { bid: 0.6, card: 0.6, think: 0.9, hold: 0.8, read: 1.2, deal: 0.7, takeBack: 1.6, slide: 0.25 },
};

const FLY = 0.2;
/** Rank letters of a trump suit from the ace down (slot 6 … 0), French/tournament and German deck. */
const RANK_LABEL = [
  ["7", "8", "9", "D", "K", "10", "A"],
  ["7", "8", "9", "O", "K", "10", "A"],
];
/** Women at the table (for "sie"/"ihr" in sentences). */
const FEMALE = new Set<string>(["rechnerin", "wirtin", "muellerin", "schaffnerin", "biker-uschi"]);
const STAKES_NAME: Record<StakesId, string> = { small: "klein", medium: "mittel", high: "hoch" };

export function createTableScene(app: App, opts: TableSceneOpts): Scene {
  let progress = opts.progress;
  const config = progress.config;
  const auto = !!opts.auto;
  const speed = Math.max(0.1, opts.speed ?? 1);
  const playerName = (opts.playerName || settings.name || "Du").trim();
  const title = opts.title ?? SPEECH_TITLES.before;
  const opps: [CharacterId, CharacterId] = config.opponents;
  const effects = houseRuleEffects(config.houseRule);
  const ruleName = config.tournament ? "Preisskat" : HOUSE_RULE_TEXTS[config.houseRule].name;
  const talkRng = new Rng(hashString(`talk/${config.seed}/${progress.games.length}`));
  const fxRng = new Rng(hashString(`fx/${config.seed}/${progress.games.length}`));
  const showTrumps = () => config.perks.showTrumps || settings.showTrumpCount;
  const showPoints = () => config.perks.showPoints || settings.showPoints;

  let stage: Stage = isRoundOver(progress) ? "final" : "intro";
  let game: GameState | null = null;
  let clock = 0;
  let stageT0 = 0;
  let dealPackets = 0;
  let bubble: Bubble | null = null;
  let gather: Gather | null = null;
  const flights = new Map<Card, Flight>();
  let word: Word | null = null;
  let pending: Pending | null = null;
  let pendingId = 0;
  let finishAt = -1;
  // the player's own choices before they are final
  let selected: Card[] = [];
  let lifted: Card = -1;
  let handMode = false;
  let mods = { schneider: false, schwarz: false, ouvert: false };
  let pick: DeclKind | null = null;
  let higher = false;
  let fromSkat: CardMask = 0;
  let last: LastGame | null = null;
  let greeted = false;
  let finalQuote: { seat: 1 | 2; text: string } | null = null;
  let doneCalled = false;
  let murmur: LoopHandle | null = null;
  let gameIndexAtStart = progress.games.length;
  const tutSeen = new Set<TutStep>();
  const script: Action[] = [...(opts.devScript ?? [])];
  /** Trick number at which each regular last scolded, grumbled or teased (cool-down of about two tricks). */
  const lastBanter: Record<number, number> = { 1: -10, 2: -10 };
  const duo = opps.includes("schultes") && opps.includes("amtsbote");
  const schultesSeat: Seat = opps[0] === "schultes" ? 1 : 2;
  const amtsboteSeat: Seat = schultesSeat === 1 ? 2 : 1;
  /** A second bubble waiting for its turn (the Amtsbote's answer to the Schultes). */
  let queued: { seat: 1 | 2; text: string; at: number } | null = null;
  /** When the dogs last pricked up their ears (a jack trick, the Alte). */
  let earsAt = -10;

  const pace = () => PACE[settings.pace] ?? PACE.normal;
  const deck = (): DeckId => settings.deck;
  const opp = (seat: Seat): CharacterId => (seat === 1 ? opps[0] : opps[1]);
  const charOf = (seat: Seat): CharacterId => (seat === 0 ? "lehrer" : opp(seat));
  /** Name at the start of a sentence / on a plate. */
  const nameOf = (seat: Seat): string => (seat === 0 ? playerName : characterNameStart(opp(seat)));
  /** Name inside a sentence ("der Erwin"). */
  const nameIn = (seat: Seat): string => (seat === 0 ? "du" : characterName(opp(seat)));
  const names = (): [string, string, string] => [playerName, nameOf(1), nameOf(2)];
  /** Short names for narrow places; a regular who shares the player's name keeps his full name. */
  const shortOf = (seat: Seat): string => {
    if (seat === 0) return playerName;
    const sh = shortName(nameOf(seat));
    const other = shortName(nameOf(seat === 1 ? 2 : 1));
    return sh.toLowerCase() === playerName.toLowerCase() || sh === other ? nameOf(seat) : sh;
  };
  const talkValues = { name: playerName, title, present: opps };
  const er = (seat: Seat) => (FEMALE.has(opp(seat)) ? "sie" : "er");
  const sein = (seat: Seat) => (FEMALE.has(opp(seat)) ? "ihr" : "sein");

  function say(seat: 1 | 2, text: string, read = 1) {
    const p = pace();
    const plain = text.replace(/\{[^}]*\}/g, "");
    bubble = { seat, text, t0: clock, dur: Math.max(p.read, 0.9 + plain.length / 18) * read };
  }

  /** The Schultes and his Amtsbote, both at the table: one exchange (two bubbles, one after the other). */
  function exchange(situation: string, chance: number, target?: Seat | null, avoid?: RegExp): boolean {
    if (!duo || !talkRng.chance(chance)) return false;
    const values = { ...talkValues, avoid, ...(target !== undefined && target !== null ? { target: shortOf(target) } : {}) };
    const pair = duoExchange(situation, talkRng, values);
    if (!pair) return false;
    say(schultesSeat as 1 | 2, pair[0]);
    queued = { seat: amtsboteSeat as 1 | 2, text: pair[1], at: clock + bubble!.dur * 0.85 };
    return true;
  }

  function talk(seat: 1 | 2, situation: SpeechSituation, chance = 1): string | null {
    if (!talkRng.chance(chance)) return null;
    return speechLine(opp(seat), situation, talkRng, talkValues);
  }

  // ─── game flow ────────────────────────────────────────────────────────────────────────────────────────

  function setStage(s: Stage) {
    stage = s;
    stageT0 = clock;
  }

  function beginGame() {
    game = startGame(progress);
    gameIndexAtStart = progress.games.length;
    resetChoices();
    fromSkat = 0;
    gather = null;
    flights.clear();
    pending = null;
    finishAt = -1;
    dealPackets = 0;
    setStage("deal");
    sfx.play("shuffle");
    if (!greeted) {
      greeted = true;
      if (exchange("greet", 0.6)) return;
      const seat = talkRng.chance(0.5) ? 1 : 2;
      const l = talk(seat, "greet");
      if (l) say(seat, l, 1.3);
    } else if (progress.games.length > 0 && !config.tournament && talkRng.chance(0.3)) {
      const seat = talkRng.chance(0.5) ? 1 : 2;
      const l = talk(seat, "order");
      if (l) say(seat, l);
    }
  }

  function afterDeal() {
    if (!game) return;
    if (!auto && redealsLeft(progress) > 0) {
      setStage("offer");
      return;
    }
    startBidding();
  }

  function startBidding() {
    setStage("game");
    // Schwätzer-Sigi talks now and then, and what he says about his hand is true (contract §0.3, §4.5).
    for (const seat of [1, 2] as const) {
      if (opp(seat) === "schwaetzer" && game && talkRng.chance(0.35)) {
        const t = sigiTell(game.hands[seat], deck(), talkRng);
        if (t) say(seat, t, 1.2);
      }
    }
  }

  function redeal() {
    progress = useRedeal(progress);
    opts.onProgress(progress);
    beginGame();
  }

  function resetChoices() {
    selected = [];
    lifted = -1;
    handMode = false;
    mods = { schneider: false, schwarz: false, ouvert: false };
    pick = null;
    higher = false;
  }

  function apply(a: Action) {
    if (!game) return;
    const prev = game;
    let next: GameState;
    try {
      next = applyAction(prev, a);
    } catch (e) {
      console.error("[table] action rejected", a, e);
      return;
    }
    if (a.type === "play") {
      const src = cardSource(prev, a.seat, a.card);
      flights.set(a.card, { x: src.x, y: src.y, t0: clock });
      if (gather) gather = null;
    }
    if (a.type === "takeBack") {
      gather = null;
      for (const c of [...flights.keys()]) if (!has(next.played, c)) flights.delete(c);
    }
    game = next;
    react(prev, a, next);
  }

  /** Where a played card comes from (top-left of a full card in layout units). */
  function cardSource(s: GameState, seat: Seat, c: Card): { x: number; y: number } {
    if (seat === 0) {
      const order = sortHand(s.hands[0], playKindOf(s));
      const i = Math.max(0, order.indexOf(c));
      return { x: handX(i, order.length), y: HAND.y - HAND.raise };
    }
    const o = OPP[seat];
    return { x: o.fanX + 20, y: FAN_Y - 10 };
  }

  function react(prev: GameState, a: Action, next: GameState) {
    const seat = a.seat;
    const ai = seat !== 0;
    if (seat === 0) {
      resetChoices();
      if (a.type === "pickUp" && prev.phase === "skat") fromSkat = prev.skat;
      if (a.type === "bid" || a.type === "hold" || a.type === "pass") tutSeen.add("bid");
      if (a.type === "discard" && prev.phase === "discard") tutSeen.add("discard");
      if (a.type === "declare") tutSeen.add("declare");
      if (a.type === "play") tutSeen.add("play");
    }
    if (next.tricks.length >= 4) tutSeen.add("lastTrick");
    switch (a.type) {
      case "bid":
        sfx.play("bid");
        if (ai) say(seat as 1 | 2, withLine(`{inkred}${a.value}.{/}`, talk(seat as 1 | 2, "bid", 0.3)), 0.8);
        break;
      case "hold":
        sfx.play("bid");
        if (ai) {
          const word = prev.bidding.stage === 3 ? "Ich spiel." : "Ja.";
          say(seat as 1 | 2, withLine(`{inkred}${word}{/}`, talk(seat as 1 | 2, "bid", 0.25)), 0.8);
        }
        break;
      case "pass":
        sfx.play("pass");
        if (ai) say(seat as 1 | 2, withLine("{inkred}Passe.{/}", talk(seat as 1 | 2, "pass", 0.35)), 0.8);
        break;
      case "pickUp":
        sfx.play("skat-pick");
        if (ai && prev.phase === "schieben") say(seat as 1 | 2, "{inkred}Ich nehm ihn.{/}", 0.7);
        break;
      case "discard":
        sfx.play("card-deal", { volume: 0.7 });
        break;
      case "shove":
        sfx.play("card-deal", { volume: 0.7 });
        if (ai) say(seat as 1 | 2, "{inkred}Ich schieb.{/}", 0.7);
        break;
      case "declare":
        sfx.play("knock");
        if (ai) say(seat as 1 | 2, withLine(`{inkblue}${declarationName(a.declaration, deck())}!{/}`, talk(seat as 1 | 2, "declare", 0.8)), 1.1);
        break;
      case "kontra":
        sfx.play("knock");
        if (ai) say(seat as 1 | 2, withLine("{inkred}Kontra!{/}", talk(seat as 1 | 2, "kontra")), 1.1);
        break;
      case "re":
        sfx.play("knock");
        if (ai) say(seat as 1 | 2, withLine("{inkred}Re!{/}", talk(seat as 1 | 2, "kontra")), 1.1);
        break;
      case "noRe":
        if (ai) say(seat as 1 | 2, "{inkred}Kein Re.{/}", 0.7);
        break;
      case "play": {
        sfx.play("card-play", { rate: 0.96 + fxRng.next() * 0.08 });
        if (isJack(a.card) && clock - (word?.t0 ?? -10) > 2) {
          const hard = ["grandspieler", "kommandant", "biker-manne", "wasenwirt"].includes(charOf(seat));
          if (fxRng.chance(seat === 0 ? 0.15 : hard ? 0.6 : 0.25)) {
            const p = TRICK[seat];
            word = { text: "KLATSCH", x: p.x + CARD_W / 2, y: p.y - 6, t0: clock, size: 1 };
            sfx.play("card-play", { volume: 1.4, rate: 0.9 });
          }
        }
        break;
      }
      default:
        break;
    }
    if (next.tricks.length > prev.tricks.length) trickDone(next.tricks[next.tricks.length - 1], next, prev);
    if (prev.phase === "bidding" && next.phase !== "bidding" && next.declarer === null && next.phase !== "done") {
      const s: 1 | 2 = talkRng.chance(0.5) ? 1 : 2;
      const l = talk(s, "ramsch");
      if (l) say(s, l, 1.2);
    }
    if (prev.phase !== "done" && next.phase === "done") finishAt = -1;
  }

  /**
   * The action word in colour, then the character's line ("{inkred}Passe.{/} Des Blatt hat koi Fundament."). When the
   * line itself starts with that word ("Passe. Des Blatt …"), the word is not repeated: the line's own opening words
   * get the colour instead.
   */
  function withLine(head: string, l: string | null): string {
    if (!l) return head;
    return mergeHead(head, l);
  }

  /**
   * Stammtisch banter after a trick (contract §0.9): at most one line per trick, never over another bubble, each
   * regular at most every other trick. Lines missing in the speech book simply mean no bubble.
   */
  function banterAfterTrick(prev: GameState, next: GameState): boolean {
    if (bubble && clock < bubble.t0 + 1) return false;
    const trickNo = next.tricks.length;
    for (const b of withDuo(trickBanter(prev, next))) {
      if (b.speaker === 0) continue;
      if (!opts.devBanter && (trickNo - lastBanter[b.speaker] < 3 || !talkRng.chance(b.chance))) continue;
      lastBanter[b.speaker] = trickNo;
      // the Schultes scolding, blaming himself or teasing: now and then the Amtsbote answers him
      if (b.speaker === schultesSeat && (b.situation !== "blunder" || b.target === amtsboteSeat) && exchange(b.situation, 0.5, b.target, avoidFor(b))) return true;
      const l = banterLine(b);
      if (!l) continue;
      say(b.speaker as 1 | 2, l, 1.1);
      return true;
    }
    return false;
  }

  /** The Schultes and his Amtsbote answer each other: when one blames himself, the other may tease him instead. */
  function withDuo(list: Banter[]): Banter[] {
    if (!duo) return list;
    const out: Banter[] = [];
    for (const b of list) {
      if (b.situation === "selfBlame" && b.speaker !== 0 && talkRng.chance(0.5)) {
        const other = (b.speaker === 1 ? 2 : 1) as Seat;
        out.push({ ...b, situation: "tease", speaker: other, target: b.speaker });
      }
      out.push(b);
    }
    return out;
  }

  /** Only true words: "überreizt" only when the game really was overbid. */
  const avoidFor = (b: Banter): RegExp | undefined => (b.reason === "overbid" ? undefined : /überreiz/i);

  function banterLine(b: Banter): string | null {
    const values = { ...talkValues, avoid: avoidFor(b), ...(b.target !== null ? { target: shortOf(b.target) } : {}) };
    return speechLine(opp(b.speaker), b.situation, talkRng, values);
  }

  function trickDone(rec: TrickRecord, s: GameState, prev: GameState) {
    gather = { rec, t0: clock, sounded: false };
    const dogs = opts.dogs ?? [];
    if (dogs.length && rec.cards.some(isJack)) {
      earsAt = clock;
      // the Alte (Kreuz-Bube) makes the dog look up, now and then with a quiet "wuff"
      if (rec.cards.includes(31) && fxRng.chance(0.3)) sfx.play(dogs[0] === "airedale" ? "dog-bark-small" : "dog-bark-big", { volume: 0.5 });
    }
    const r = rulesOf(s);
    if (!r) return;
    const winCard = rec.cards[(rec.winner - rec.leader + 3) % 3];
    const led = rec.cards[0];
    const recent = clock - (word?.t0 ?? -10) < 1.5;
    if (!recent && rec.points >= 30 && fxRng.chance(0.5)) {
      word = { text: "RUMMS", x: 480, y: 236, t0: clock + 0.15, size: 2 };
    } else if (!recent && CARD_POINTS[led] === 11 && r.classOf[winCard] === TRUMP && r.classOf[led] !== TRUMP && fxRng.chance(0.35)) {
      word = { text: "ZACK", x: 480, y: 236, t0: clock + 0.15, size: 1 };
    }
    // a scolding, a grumble or a tease first; otherwise now and then a plain comment (never on top of another line)
    if (banterAfterTrick(prev, s)) return;
    if (duo && (!bubble || clock > bubble.t0 + 1) && talkRng.chance(0.1)) {
      if (rec.winner === schultesSeat && exchange("trickWon", 1)) return;
      if (rec.winner === amtsboteSeat && exchange("trickLost", 1)) return;
    }
    if ((!bubble || clock > bubble.t0 + 1) && talkRng.chance(0.14)) {
      if (rec.winner !== 0 && talkRng.chance(0.6)) {
        const l = talk(rec.winner as 1 | 2, "trickWon");
        if (l) say(rec.winner as 1 | 2, l);
      } else {
        const losers = ([1, 2] as const).filter((x) => x !== rec.winner);
        const sp = losers[talkRng.int(0, losers.length - 1)];
        const l = sp ? talk(sp, "trickLost") : null;
        if (sp && l) say(sp, l);
      }
    }
  }

  function finish() {
    if (!game || game.phase !== "done" || !game.result) return;
    const before: [number, number, number] = [...progress.list];
    const { progress: p2, record } = finishGame(progress, game);
    progress = p2;
    opts.onProgress(progress);
    sfx.play("list-write");
    last = describe(game, record, before);
    const mine = playerWon(game);
    if (mine === true) sfx.play("win-sting");
    else if (mine === false) sfx.play("lose-sting");
    bubble = null;
    setStage("result");
  }

  /** Did the game go the player's way? null when it is neither (eingepasst). */
  function playerWon(s: GameState): boolean | null {
    const r = s.result!;
    if (r.type === "passed") return null;
    if (r.type === "ramsch") return !r.ramsch!.losers.includes(0) || r.ramsch!.durchmarsch === 0;
    if (r.declarer === 0) return r.won;
    return !r.won;
  }

  function describe(s: GameState, record: GameRecord, before: [number, number, number]): LastGame {
    const r = s.result!;
    const d = deck();
    let heading = "";
    let sentence = "";
    const lines: string[] = [];
    let quote: LastGame["quote"] = null;
    const quoteFrom = (seat: 1 | 2, sit: SpeechSituation) => {
      if (quote) return;
      if (duo && seat === schultesSeat && talkRng.chance(0.5)) {
        const pair = duoExchange(sit, talkRng, talkValues);
        if (pair) {
          quote = { seat, text: `${pair[0]}“ – „${pair[1]}` };
          return;
        }
      }
      const l = speechLine(opp(seat), sit, talkRng, talkValues);
      if (l) quote = { seat, text: l };
    };
    // a lost or overbid game: the declarer blames himself or the others tease him (one line, by chance)
    for (const b of withDuo(gameBanter(r))) {
      if (quote || b.speaker === 0 || !(opts.devBanter || talkRng.chance(b.chance))) continue;
      if (duo && b.speaker === schultesSeat && talkRng.chance(0.5)) {
        const pair = duoExchange(b.situation, talkRng, { ...talkValues, avoid: avoidFor(b), ...(b.target !== null ? { target: shortOf(b.target) } : {}) });
        if (pair) {
          quote = { seat: b.speaker as 1 | 2, text: `${pair[0]}“ – „${pair[1]}` };
          continue;
        }
      }
      const l = banterLine(b);
      if (l) quote = { seat: b.speaker as 1 | 2, text: l };
    }
    if (r.type === "passed") {
      heading = "Eingepasst";
      sentence = "Alle drei haben gepasst. Das Spiel zählt nicht, der Nächste gibt.";
    } else if (r.type === "ramsch") {
      const rm = r.ramsch!;
      heading = "Ramsch";
      if (rm.durchmarsch !== null) {
        sentence = rm.durchmarsch === 0 ? "Durchmarsch! Alle Stiche für dich." : `Durchmarsch! ${nameOf(rm.durchmarsch)} hat alle Stiche gemacht.`;
      } else if (rm.losers.length === 0) {
        sentence = "Alle drei haben gleich viele Augen. Das zählt nichts.";
      } else if (rm.losers.includes(0)) {
        sentence = `Du hast die meisten Augen (${r.points[0]}) und schreibst sie als Minus.`;
      } else {
        const l = rm.losers[0];
        sentence = `${nameOf(l)} hat die meisten Augen (${r.points[l]}) und schreibt sie als Minus.`;
      }
      lines.push(`Augen: du ${r.points[0]}, ${shortOf(1)} ${r.points[1]}, ${shortOf(2)} ${r.points[2]}.`);
      if (rm.jungfrau.length) lines.push(`Jungfrau (ohne Stich): ${rm.jungfrau.map((x) => (x === 0 ? "du" : shortOf(x))).join(", ")}. Das zählt doppelt.`);
      if (rm.shoves) lines.push(rm.shoves === 1 ? "Einmal geschoben: Das zählt doppelt." : `${rm.shoves}-mal geschoben: Jedes Mal zählt es doppelt.`);
      const loserAi = rm.losers.find((x) => x !== 0);
      if (loserAi) quoteFrom(loserAi as 1 | 2, "gameLost");
    } else {
      const decl = r.declarer!;
      const gameName = declarationName(r.declaration!, d);
      if (decl === 0) {
        heading = r.won ? "Gewonnen!" : "Verloren";
        const pts = r.declarerPoints;
        if (r.won) sentence = talkRng.pick(["Sauber gespielt.", "Das sitzt. Die Liste freut sich.", "So gehört sich das.", "Da staunt der Stammtisch."]);
        else if (r.overbid) sentence = "Überreizt. Das passiert den Besten.";
        else if (r.reason === "schneider-missed" || r.reason === "schwarz-missed") sentence = "Die Ansage war zu kühn. Das Spiel geht verloren.";
        else if (r.declaration!.kind === "null") sentence = "Ein Stich, und das Null ist dahin.";
        else if (pts >= 55) sentence = talkRng.pick(["Knapp daneben ist auch vorbei.", "Ein paar Augen haben gefehlt."]);
        else sentence = talkRng.pick(["Diesmal hat es nicht gereicht.", "Das nächste Spiel kommt bestimmt.", "Die Karten wollten heute nicht."]);
        quoteFrom(talkRng.chance(0.5) ? 1 : 2, r.won ? "gameLost" : "gameWon");
      } else {
        heading = r.won ? `${shortOf(decl)} gewinnt` : `${shortOf(decl)} verliert`;
        sentence = r.won ? `${nameOf(decl)} gewinnt ${sein(decl)} Spiel: ${gameName}.` : `${nameOf(decl)} verliert ${sein(decl)} Spiel: ${gameName}. Gut verteidigt!`;
        if (r.declaration!.kind === "null") sentence = r.won ? `${nameOf(decl)} kommt im ${gameName} ohne Stich durch.` : `${nameOf(decl)} hat im ${gameName} einen Stich bekommen. Gut verteidigt!`;
        quoteFrom(decl as 1 | 2, r.won ? "gameWon" : "gameLost");
      }
      lines.push(...valueLines(r, d), outcomeLine(r));
    }
    return { record, state: s, before, heading, sentence, lines, quote };
  }

  // ─── the computer opponents ───────────────────────────────────────────────────────────────────────────

  function aiDelay(s: GameState): number {
    const p = pace();
    switch (s.phase) {
      case "bidding":
      case "re":
        return p.bid;
      case "skat":
      case "discard":
      case "declare":
      case "schieben":
        return p.think;
      case "play": {
        let d = s.trick.length === 0 && s.tricks.length > 0 ? p.card * 0.6 : p.card;
        if (!auto && legalActions(s, 0).some((x) => x.type === "takeBack")) d += p.takeBack;
        return d;
      }
      default:
        return p.card;
    }
  }

  function fallback(s: GameState, seat: Seat): Action {
    const legal = legalActions(s, seat);
    return legal.find((x) => x.type !== "peek" && x.type !== "takeBack" && x.type !== "kontra") ?? legal[0];
  }

  function runAi() {
    if (!game || game.phase === "done") return;
    const seat = currentSeat(game);
    if (seat === null) return;
    if (script.length && script[0].seat === seat && (!pending || pending.state !== game)) {
      // dev: a scripted action instead of the AI (with the usual pause)
      pending = { id: ++pendingId, seat, state: game, t0: clock, minDelay: aiDelay(game), action: script.shift()! };
      return;
    }
    if (seat === 0 && !auto && !(pending && pending.state === game && pending.seat === 0)) {
      pending = null;
      return;
    }
    if (!pending || pending.state !== game || pending.seat !== seat) {
      const id = ++pendingId;
      const st = game;
      pending = { id, seat, state: st, t0: clock, minDelay: aiDelay(st), action: null };
      const req = {
        view: viewFor(st, seat),
        character: charOf(seat),
        depth: config.depth,
        seed: hashString(`${st.seed}/${st.history.length}/${seat}`),
        tournament: config.tournament,
      };
      void decide(req).then((a) => {
        if (pending && pending.id === id) pending.action = a;
      });
      return;
    }
    if (!pending.action) return;
    if (clock < pending.t0 + pending.minDelay) return;
    if (queued) return; // let the Amtsbote answer first
    if (game.phase === "play" && gather) return;
    if (bubble && clock < bubble.t0 + Math.min(bubble.dur, pace().read) * 0.8) return;
    let a = pending.action;
    if (!isLegal(game, a)) {
      console.warn("[table] AI chose an illegal action, using a legal one", a);
      a = fallback(game, seat);
    }
    pending = null;
    apply(a);
  }

  // ─── auto mode (soak tests): panels continue by themselves ────────────────────────────────────────────

  function autoAdvance() {
    const wait = clock - stageT0;
    if (stage === "intro" && wait > 0.3) beginGame();
    else if (stage === "result" && wait > 0.6) nextAfterResult();
    else if (stage === "final" && wait > 0.6 && !doneCalled) {
      doneCalled = true;
      opts.onDone(roundResult(progress));
    }
  }

  function nextAfterResult() {
    if (tutorialStep() === "list") tutSeen.add("list");
    last = null;
    if (isRoundOver(progress)) {
      setStage("final");
      const s: 1 | 2 = talkRng.chance(0.5) ? 1 : 2;
      const pair = duo && talkRng.chance(0.5) ? duoExchange("farewell", talkRng, talkValues) : null;
      const l = pair ? null : speechLine(opp(s), "farewell", talkRng, talkValues);
      finalQuote = pair ? { seat: schultesSeat as 1 | 2, text: `${pair[0]}“ – „${pair[1]}` } : l ? { seat: s, text: l } : null;
      sfx.play(roundResult(progress).place === 1 ? "cheers" : "glass-clink");
    } else beginGame();
  }

  // ─── what the player may do now ───────────────────────────────────────────────────────────────────────

  const humanTurn = () =>
    !auto && stage === "game" && !!game && game.phase !== "done" && currentSeat(game) === 0 && !(script.length && script[0].seat === 0) &&
    !(pending && pending.state === game && pending.seat === 0);
  const legal0 = (type: Action["type"]) => (game && !auto ? legalActions(game, 0).find((x) => x.type === type) ?? null : null);

  /** x of hand card i of n. */
  function handX(i: number, n: number): number {
    const step = n > 1 ? Math.min(80, Math.floor((HAND.w - CARD_W) / (n - 1))) : 0;
    const w = CARD_W + step * (n - 1);
    return Math.round(HAND.x0 + (HAND.w - w) / 2 + i * step);
  }

  function sortKind() {
    if (!game) return null;
    if (pick && (game.phase === "skat" || game.phase === "declare" || game.phase === "discard")) return pick;
    return playKindOf(game);
  }

  // ─── the "Was jetzt?" sentence ────────────────────────────────────────────────────────────────────────

  function whatNowText(): string {
    switch (stage) {
      case "intro":
        if (progress.games.length) return "Klick auf „Weiter spielen“, dann wird gegeben.";
        return config.tournament ? "Lies dir die Turnierregel durch. Dann klick auf „Los geht’s“." : "Lies dir die Hausregel durch. Dann klick auf „Los geht’s“.";
      case "deal":
        return game && game.dealer === 0 ? "Du gibst: drei, Skat, vier, drei." : `${nameOf(game?.dealer ?? 1)} gibt.`;
      case "offer":
        return "Gefällt dir das Blatt? Du darfst einmal neu geben lassen.";
      case "result":
        return isRoundOver(progress) ? "Klick auf „Zur Abrechnung“." : "Klick auf „Weiter“ für das nächste Spiel.";
      case "final":
        return "Die Runde ist aus. Klick auf „Weiter“.";
      case "game":
        break;
    }
    const s = game!;
    if (s.phase === "done") return s.result?.type === "passed" ? "Alle haben gepasst." : "Das Spiel ist aus. Gleich wird gezählt.";
    const cur = currentSeat(s)!;
    const pos = (seat: Seat) => POSITION_NAMES[positionOf(seat, s.dealer)];
    if (cur !== 0 || auto) {
      if (legal0("takeBack")) return "Du kannst deine Karte noch zurücknehmen.";
      if (s.phase === "bidding" && s.bidding.passed[0]) return `Du hast gepasst. ${cap(nameIn(cur))} ist dran.`;
      if (s.phase === "skat") return `${nameOf(cur)} überlegt: Skat oder Hand?`;
      if (s.phase === "discard") return `${nameOf(cur)} drückt zwei Karten.`;
      if (s.phase === "declare") return `${nameOf(cur)} sagt gleich ${sein(cur)} Spiel an.`;
      if (s.phase === "schieben") return `${nameOf(cur)} entscheidet: Skat aufnehmen oder schieben.`;
      if (s.phase === "re") return `${nameOf(cur)} überlegt, ob ${er(cur)} Re sagt.`;
      return `${nameOf(cur)} ist dran.`;
    }
    const b = s.bidding;
    switch (s.phase) {
      case "bidding":
        if (b.stage === 3) return `Beide haben gepasst. Spielst du selbst? Sonst wird ${s.rules.allPass === "passed" ? "eingepasst" : "Ramsch gespielt"}.`;
        if (b.waiting === "asker") {
          const nb = nextBid(b.value) ?? 18;
          if (b.value === 0) return `Du bist in ${pos(0)}. Sag ${nb} oder passe.`;
          return `${cap(nameIn(b.holder ?? b.listener))} hält ${b.value}. Sag ${nb} oder passe.`;
        }
        return `${cap(nameIn(b.asker))} sagt ${b.value}. Sag Ja oder passe.`;
      case "skat":
        if (handMode) return pick ? pickSentence() : `Sag dein Handspiel an. Gereizt ist bis ${s.bid}.`;
        return `Du spielst${s.bid > 18 || b.value > 0 ? ` für ${s.bid}` : ""}. Nimmst du den Skat auf oder spielst du Hand?`;
      case "discard":
        if (selected.length === 0) return "Klick zwei Karten an, die du drücken willst. Grün umrandet: aus dem Skat.";
        if (selected.length === 1) return "Noch eine Karte anklicken.";
        return "Klick auf „Drücken“. Bis dahin kannst du noch tauschen.";
      case "declare":
        return pick ? pickSentence() : `Sag dein Spiel an. Gereizt ist bis ${s.bid}.`;
      case "schieben":
        if (s.schieben?.holding) {
          if (selected.length < 2) return "Klick zwei Karten an, die du weitergibst. Buben dürfen nicht mit.";
          return "Klick auf „Weitergeben“. Bis dahin kannst du noch tauschen.";
        }
        return "Nimmst du den Skat auf, oder schiebst du ihn ungesehen weiter?";
      case "re":
        return `${cap(nameIn(s.kontraBy ?? 1))} sagt Kontra. Sagst du Re? (Knöpfe links unten)`;
      case "play": {
        if (lifted >= 0) return "Klick die Karte noch einmal, dann liegt sie.";
        const k = legal0("kontra") ? " Du kannst auch Kontra sagen." : "";
        if (s.trick.length === 0) return `Du kommst raus. Klick eine Karte an.${k}`;
        const r = rulesOf(s)!;
        const cls = r.classOf[s.trick[0]];
        const what = cls === TRUMP ? "Trumpf" : suitName(cls, deck());
        const can = (s.hands[0] & r.follow[s.trick[0]]) !== 0;
        return can ? `Du bist dran. Du musst ${what} bedienen.${k}` : `Du bist dran. Du hast kein ${what}: Spiel eine beliebige Karte.${k}`;
      }
      default:
        return "";
    }
  }

  function pickSentence(): string {
    const o = currentOptions().find((x) => x.kind === pick);
    if (!o || !game) return "";
    const n = kindName(o.kind, deck());
    if (o.kind !== "null" && o.maxValue < game.bid) return `Achtung: ${n} reicht nicht für ${game.bid}. Du würdest überreizt verlieren.`;
    return `Klick auf „${n} ansagen“ – oder wähl ein anderes Spiel.`;
  }

  function currentOptions(): GameOption[] {
    if (!game) return [];
    if (game.phase === "skat") return gameOptions(game, { schneiderAnnounced: mods.schneider || mods.schwarz, schwarzAnnounced: mods.schwarz, ouvert: mods.ouvert });
    if (game.phase === "declare") return gameOptions(game, { ouvert: mods.ouvert });
    return [];
  }

  // ─── drawing ──────────────────────────────────────────────────────────────────────────────────────────

  // ─── the Probefahrt (tutorial) and the dogs ───────────────────────────────────────────────────────────

  /** The tutorial note due now, or null. Each step is explained once per round. */
  function tutorialStep(): TutStep | null {
    if (!opts.tutorial || auto) return null;
    if (stage === "result" && last && !tutSeen.has("list")) return "list";
    if (stage !== "game" || !game || game.phase === "done") return null;
    const s = game;
    if (humanTurn()) {
      if (s.phase === "bidding" && !tutSeen.has("bid")) return "bid";
      if (s.phase === "discard" && !tutSeen.has("discard")) return "discard";
      if (s.phase === "declare" && !tutSeen.has("declare")) return "declare";
      if (s.phase === "play" && !tutSeen.has("play")) return "play";
    }
    if (s.phase === "play" && s.tricks.length >= 1 && tutSeen.has("play") && !tutSeen.has("lastTrick")) return "lastTrick";
    return null;
  }

  const tutorialText = (step: TutStep) => {
    // with one-click play (settings) the card lies at once: only the first half of the "play" step is true then
    if (step === "play" && settings.oneClickPlay) return "Klicke eine Karte an, dann liegt sie auf dem Tisch.";
    return fillText(TUTORIAL.steps[step].join(" "), { name: playerName });
  };

  /**
   * A paper note with the Probefahrt's explanation, over the Tafel (nothing there is clickable, and it stays clear of
   * the cards, the bubbles and every button). "Verstanden" closes it; acting closes it too.
   */
  function drawTutorial(g: Gfx, ui: UI) {
    const step = tutorialStep();
    if (!step || step === "declare" || step === "list") return; // these two live inside their panels
    const x = 312;
    const w = 336;
    const text = tutorialText(step);
    const h = 10 + 32 + 4 + textHeight(text, w - 28) + 12;
    const y = 4;
    g.rect(x + 3, y + 4, w, h, rgba(P.ink0, 0.35));
    g.panel(x, y, w, h, "paper");
    g.text("Probefahrt", x + 14, y + 14, { font: "head", color: P.river0 });
    if (ui.button("tut-ok", x + w - 14 - 130, y + 8, 130, 32, "Verstanden", { variant: "paper", font: "head" })) tutSeen.add(step);
    para(g, text, x + 14, y + 46, w - 28, { color: P.ink1, shadow: null });
  }

  /** The travelling dogs beside the table, bottom right above the buttons; ears up when a jack trick falls. */
  function drawDogs(g: Gfx) {
    const dogs = (opts.dogs ?? []).slice(0, 3);
    if (!dogs.length || stage === "intro" || stage === "final") return;
    const up = clock - earsAt < 1.2;
    const hop = up ? -Math.round(Math.sin(Math.min(1, (clock - earsAt) / 0.25) * Math.PI / 2) * 6) : 0;
    const painted = dogs.filter((d) => hasArt(`dogs/${d}`));
    if (painted.length === dogs.length) {
      // painted dogs (96 art px drawn 3× = 144 units), the second one a step behind
      dogs.forEach((d, i) => {
        // lying beside the table; on a jack trick the head comes up (painted poses, 2× density cut-outs)
        const rest = hasArt(`dogs/${d}-lie`) ? `dogs/${d}-lie` : `dogs/${d}`;
        const id = up && hasArt(`dogs/${d}-ears`) ? `dogs/${d}-ears` : rest;
        const img = art(id);
        const x = 808 - i * 104;
        if (img) g.pixelFit(img, x, 300 + (id.endsWith("-ears") ? 0 : hop), 144, 144);
      });
      return;
    }
    // the items atlas heads: chins on the table edge, looking over to the cards
    if (!atlas("items")) return;
    dogs.forEach((d, i) => {
      const cx = 922 - i * 54;
      g.rrect(cx - 22, 440, 44, 4, 2, rgba(P.ink0, 0.35));
      g.sprite("items", d, cx, 418 + (i % 2 === 0 ? hop : Math.round(hop / 2)));
    });
  }

  function drawRoom(g: Gfx) {
    const room = config.room || "village";
    if (room === "bikers" && !hasArt("inns/bikers")) {
      // the bikers' meeting (Tour: room "bikers") before its painting exists: bg/motorradtreff, else an evening meadow
      if (hasArt("bg/motorradtreff") || PAINTED["bg/motorradtreff"]) drawBackdrop(g, "bg/motorradtreff");
      else drawBikersMeadow(g);
    } else drawBackdrop(g, `inns/${room}`);
    // a calm veil over the upper room so portraits, the board and the bubbles read well
    g.rect(0, 0, 960, 300, rgba(P.ink0, 0.18));
  }

  function tafelLines(): string[] {
    const n = Math.min(progress.games.length + (stage === "result" || stage === "final" ? 0 : 1), config.games);
    const head = `Spiel ${Math.max(1, n)} von ${config.games} · ${ruleName}`;
    const s = stage === "result" && last ? last.state : game;
    if (!s || stage === "intro" || stage === "final") return [head, config.tournament ? "Turnierwertung" : "Liste nach Seeger-Fabian", ""];
    if (stage === "deal" || stage === "offer") return [head, "Es wird gegeben.", ""];
    const kontra = s.kontra === 2 ? " · Kontra · Re" : s.kontra === 1 ? " · Kontra" : "";
    if (s.declaration && s.declarer !== null) {
      return [head, `${declarationName(s.declaration, deck())}${kontra}`, `Spieler: ${shortOf(s.declarer)} · gereizt ${s.bid}`];
    }
    if (s.declarer !== null) return [head, `${shortOf(s.declarer)} spielt`, `gereizt bis ${s.bid}`];
    if (s.phase === "play" || s.phase === "schieben" || (s.phase === "done" && s.result?.type === "ramsch")) {
      const sh = s.schieben?.shoves ?? 0;
      return [head, "Ramsch: jeder für sich", sh ? `${sh}-mal geschoben` : "Wer die meisten Augen hat, verliert"];
    }
    if (s.phase === "done") return [head, "Eingepasst", ""];
    const b = s.bidding;
    if (b.stage === 3) return [head, "Zwei haben gepasst.", `${shortOf(s.forehand)} darf noch spielen`];
    if (b.value === 0) return [head, "Gereizt wird.", `${shortOf(b.asker)} sagt zuerst`];
    return [head, `Gereizt: ${b.value}`, `${shortOf(b.holder ?? b.asker)} hält`];
  }

  function drawTafel(g: Gfx) {
    const { x, y, w } = TAFEL;
    drawChalkboard(g, x, y, w, TAFEL.h);
    const [l1, l2, l3] = tafelLines();
    g.text(l1, x + w / 2, y + 8, { font: "body", align: "center", color: P.paper1 });
    g.text(l2, x + w / 2, y + 27, { font: measure(l2, "head") > w - 16 ? "body" : "head", align: "center", color: P.paper4 });
    if (l3) g.text(l3, x + w / 2, y + 52, { font: measure(l3, "head") > w - 16 ? "body" : "head", align: "center", color: P.beer4 });
  }

  /** The plate line under a name: position and the bidding word, or the role in the game. */
  function seatLine(seat: Seat): string {
    const s = stage === "result" && last ? last.state : game;
    if (!s) return "";
    const pos = POSITION_NAMES[positionOf(seat, s.dealer)];
    if (s.phase === "bidding" || stage === "deal" || stage === "offer") {
      let said = "";
      for (const a of s.history) {
        if (a.seat !== seat) continue;
        if (a.type === "bid") said = `sagt ${a.value}`;
        else if (a.type === "hold") said = "Ja";
        else if (a.type === "pass") said = "passt";
      }
      return said ? `${pos} · ${said}` : pos;
    }
    if (s.declarer === null) return pos;
    return s.declarer === seat ? "Alleinspieler" : "Gegenspieler";
  }

  function drawOpponent(g: Gfx, seat: 1 | 2) {
    const o = OPP[seat];
    const id = opp(seat);
    const s = game;
    const turn = !!(stage === "game" && s && s.phase !== "done" && currentSeat(s) === seat);
    if (turn) g.rect(o.panelX - 3, 5, PANEL_W + 6, PANEL_H + 6, P.beer2);
    g.panel(o.panelX, 8, PANEL_W, PANEL_H, turn ? "panel-hi" : "panel-dark");
    g.rect(o.px, 16, 144, 144, P.wood0);
    portrait(g, CHARACTER_DEFS[id].portrait ?? id, o.px, 16, 144, { frame: false });
    const open = !!(s && s.declaration?.ouvert && s.declarer === seat && (s.phase === "play" || s.phase === "re" || s.phase === "done") && stage === "game");
    if (open) {
      // ouvert: the declarer's cards lie open for everybody (ISkO 2.2.5), in two rows beside the portrait
      const name = characterNameStart(id);
      g.text(name, o.textX, 18, { font: measure(name, "head") > 134 ? "body" : "head", color: C.title, shadow: P.ink0, maxLines: 1, width: 134 });
      const cards = sortHand(s!.hands[seat], playKindOf(s!));
      cards.forEach((c, i) => drawSmallCard(g, deck(), c, o.textX - 4 + (i % 5) * 24, i < 5 ? 46 : 104));
      return;
    }
    // the name in the running-text font, on two lines if it is long ("Der alte / Gottlob")
    const nameLines = wrap(characterNameStart(id), 136, "head").slice(0, 2);
    let ty = 18;
    for (const l of nameLines) {
      g.text(l, o.textX, ty, { font: "head", color: C.title, shadow: P.ink0 });
      ty += 22;
    }
    const sub = seatLine(seat);
    const lead = s && s.declarer === seat && s.phase !== "bidding";
    g.text(sub, o.textX, ty + 4, { font: "body", color: lead ? P.beer4 : C.textDim, shadow: P.ink0, maxLines: 1, width: 132 });
    if (!s || stage === "intro" || stage === "final") return;
    const n = dealtCount(seat);
    g.text(n === 1 ? "1 Karte" : `${n} Karten`, o.textX, ty + 22, { font: "body", color: C.textDim, shadow: P.ink0 });
    drawBackFan(g, o.fanX, FAN_Y + 6, n, o.dir, 9);
  }

  /** Cards to show in a hand while dealing (3 – 4 – 3). */
  function dealtCount(seat: Seat): number {
    if (!game) return 0;
    const n = popcount(game.hands[seat]);
    if (stage !== "deal") return n;
    return Math.min(n, [0, 3, 7, 10][dealPackets]);
  }

  function drawSkat(g: Gfx) {
    const s = game;
    if (!s || stage === "intro" || stage === "final" || stage === "result") return;
    if (stage === "deal" && dealPackets < 1) return;
    const count = popcount(s.skat);
    if (count === 0) return;
    const cards: Card[] = [];
    for (let c = 0; c < 32; c++) if (has(s.skat, c)) cards.push(c);
    const seen = s.revealed[0];
    const big = s.phase === "bidding" || s.phase === "skat" || stage === "deal" || stage === "offer";
    if (big) {
      cards.forEach((c, i) => {
        const x = SKAT_BIG.x + i * SKAT_BIG.step;
        const y = SKAT_BIG.y + i * 4;
        if (has(seen, c)) drawCard(g, deck(), c, x, y);
        else drawBack(g, x, y);
      });
      return;
    }
    cards.forEach((c, i) => drawBack(g, SKAT_SMALL.x + i * SKAT_SMALL.step, SKAT_SMALL.y + i * 2, true));
    const label = s.declarer === null ? "Skat: zum letzten Stich" : "Skat";
    g.rrect(SKAT_SMALL.x - 4, SKAT_SMALL.y + 56, measure(label, "body") + 8, 19, 2, rgba(P.ink0, 0.6));
    g.text(label, SKAT_SMALL.x, SKAT_SMALL.y + 58, { font: "body", color: C.text });
  }

  function drawTrick(g: Gfx) {
    const s = game;
    if (!s || stage !== "game") return;
    const p = pace();
    if (gather) {
      const t = clock - gather.t0;
      const rec = gather.rec;
      let u = 0;
      if (t > p.hold) {
        u = Math.min(1, (t - p.hold) / p.slide);
        if (!gather.sounded) {
          gather.sounded = true;
          sfx.play("trick-take", { rate: 0.96 + fxRng.next() * 0.08 });
        }
      }
      const target = rec.winner === 0 ? { x: 444, y: 470 } : rec.winner === 1 ? { x: 190, y: 90 } : { x: 690, y: 90 };
      g.alpha(1 - u * 0.85, () => {
        for (let i = 0; i < 3; i++) {
          const seat = ((rec.leader + i) % 3) as Seat;
          const base = TRICK[seat];
          const x = base.x + (target.x - base.x) * ease(u);
          const y = base.y + (target.y - base.y) * ease(u);
          drawTurnedCard(g, deck(), rec.cards[i], x + CARD_W / 2, y + CARD_H / 2, stageFor(s, s.tricks.indexOf(rec), seat));
        }
      });
      return;
    }
    for (let i = 0; i < s.trick.length; i++) {
      const seat = ((s.trickLeader + i) % 3) as Seat;
      const c = s.trick[i];
      const base = TRICK[seat];
      let x = base.x;
      let y = base.y;
      const f = flights.get(c);
      if (f) {
        const u = Math.min(1, (clock - f.t0) / FLY);
        x = f.x + (base.x - f.x) * ease(u);
        y = f.y + (base.y - f.y) * ease(u);
        if (u >= 1) flights.delete(c);
      }
      drawTurnedCard(g, deck(), c, x + CARD_W / 2, y + CARD_H / 2, stageFor(s, s.tricks.length, seat));
    }
  }

  function stageFor(s: GameState, trickNo: number, seat: Seat): number {
    const base = seat === 1 ? 0 : seat === 0 ? 2 : 4;
    return base + (hashString(`${s.seed}/${trickNo}/${seat}`) % 3);
  }

  /** Lesebrille / Notizblock (or the help settings): fallen trumps and the parties' Augen, honest and public. */
  function drawInfo(g: Gfx) {
    const s = game;
    if (!s || stage !== "game" || (s.phase !== "play" && s.phase !== "re")) return;
    const trumps = showTrumps() && s.declaration?.kind !== "null";
    const pts = showPoints();
    if (!trumps && !pts) return;
    const x = 12;
    let y = 270;
    const w = 236;
    const h = (trumps ? 74 : 0) + (pts ? 26 : 0) + 10;
    g.panel(x, y, w, h, "panel-dark");
    y += 6;
    if (trumps) {
      const r = rulesOf(s)!;
      const fallen = popcount(s.played & r.trumps);
      g.text(`Trümpfe gefallen: ${fallen} von ${popcount(r.trumps)}`, x + 10, y, { font: "body", color: C.textDim });
      y += 20;
      // the four jacks as suit symbols, struck through when they have fallen; own ones in gold
      const jackLetter = deck() === "german" ? "U" : "B";
      let cx = x + 10;
      for (const c of [31, 30, 29, 28]) {
        const gone = has(s.played, c);
        g.alpha(gone ? 0.35 : 1, () => {
          g.text(jackLetter, cx, y, { font: "head", color: has(s.hands[0], c) ? P.beer3 : C.text });
          suitIcon(g, deck(), c - 28, cx + 12, y + 4, 18);
        });
        if (gone) g.rect(cx - 2, y + 11, 36, 2, P.brick3);
        cx += 48;
      }
      y += 26;
      // the trump suit high to low (suit games only)
      if (r.trumpSuit >= 0) {
        suitIcon(g, deck(), r.trumpSuit, x + 10, y + 3, 18);
        cx = x + 34;
        for (let slot = 6; slot >= 0; slot--) {
          const c = r.trumpSuit * 7 + slot;
          const lab = RANK_LABEL[deck() === "german" ? 1 : 0][slot];
          const gone = has(s.played, c);
          const lw = measure(lab, "head");
          g.alpha(gone ? 0.35 : 1, () => g.text(lab, cx, y, { font: "head", color: has(s.hands[0], c) ? P.beer3 : C.text }));
          if (gone) g.rect(cx - 1, y + 11, lw + 2, 2, P.brick3);
          cx += lw + 9;
        }
      } else g.text("Nur die Buben sind Trumpf.", x + 10, y + 3, { font: "body", color: C.textDim });
      y += 28;
    }
    if (pts) {
      if (s.declarer !== null) {
        const d = s.points[s.declarer];
        const def = s.points[0] + s.points[1] + s.points[2] - d;
        const text = s.declarer === 0 ? `Augen: du ${d} · Gegner ${def}` : `Augen: ${shortOf(s.declarer)} ${d} · wir ${def}`;
        g.text(text, x + 10, y, { font: measure(text, "head") > w - 20 ? "body" : "head", color: C.text });
      } else g.text(`Augen: du ${s.points[0]} · ${shortOf(1)} ${s.points[1]} · ${shortOf(2)} ${s.points[2]}`, x + 10, y + 3, { font: "body", color: C.text });
    }
  }

  function drawPlayerPlate(g: Gfx) {
    if (!game || stage === "intro" || stage === "final") return;
    const sub = seatLine(0);
    const w = Math.max(130, Math.max(measure(playerName, "head"), measure(sub, "body")) + 22);
    const turn = humanTurn();
    g.panel(12, 400, Math.min(w, 136), 48, turn ? "panel-hi" : "panel-dark");
    g.text(playerName, 22, 404, { font: "head", color: C.title, shadow: P.ink0, maxLines: 1, width: 116 });
    g.text(sub, 22, 428, { font: "body", color: C.textDim, shadow: P.ink0, maxLines: 1, width: 116 });
  }

  function drawHand(g: Gfx, ui: UI) {
    const s = game;
    if (!s || stage === "intro" || stage === "final") return;
    if (stage === "result") return;
    const hand = s.hands[0];
    const order = sortHand(hand, sortKind());
    const shown = stage === "deal" ? order.slice(0, dealtCount(0)) : order;
    const n = order.length;
    const myTurn = humanTurn();
    const playing = myTurn && s.phase === "play";
    const choosing = myTurn && (s.phase === "discard" || (s.phase === "schieben" && !!s.schieben?.holding));
    const playable = playing ? legalCards(s) : 0;
    const steps = shown.map((_, i) => (i < n - 1 ? handX(i + 1, n) - handX(i, n) : CARD_W));
    // hover: the top-most card under the mouse
    let hover = -1;
    if (playing || choosing) {
      for (let i = shown.length - 1; i >= 0; i--) {
        const c = shown[i];
        const y = cardY(c, playable, playing, choosing);
        if (ui.hover(handX(i, n), y, i < n - 1 ? steps[i] : CARD_W, 540 - y)) {
          hover = i;
          break;
        }
      }
    }
    shown.forEach((c, i) => {
      const x = handX(i, n);
      const y = cardY(c, playable, playing, choosing);
      let state: CardState = "plain";
      if (playing) state = c === lifted ? "selected" : has(playable, c) ? "plain" : "veiled";
      if (choosing) {
        if (selected.includes(c)) state = "selected";
        else if (s.phase === "schieben" && isJack(c)) state = "veiled";
        else if (has(fromSkat, c)) state = "marked";
      }
      drawCard(g, deck(), c, x, y, { state, hover: hover === i });
      // click targets: the visible slice of each card
      const clickable = (playing && has(playable, c)) || (choosing && !(s.phase === "schieben" && isJack(c)));
      if (clickable) {
        const wv = i < n - 1 ? steps[i] : CARD_W;
        if (ui.area(`hand-${c}`, x, y, wv, 540 - y)) clickCard(c);
      }
    });
  }

  function cardY(c: Card, playable: CardMask, playing: boolean, choosing: boolean): number {
    let y = HAND.y;
    if (playing) {
      if (c === lifted) y -= HAND.lift;
      else if (has(playable, c)) y -= HAND.raise;
    }
    if (choosing && selected.includes(c)) y -= HAND.lift;
    return y;
  }

  function clickCard(c: Card) {
    const s = game!;
    if (s.phase === "play") {
      if (settings.oneClickPlay || lifted === c) {
        apply({ type: "play", seat: 0, card: c });
      } else {
        lifted = c;
        sfx.play("card-raise");
      }
      return;
    }
    // discard / pass two cards on: toggle, at most two (a third click replaces the older choice)
    const i = selected.indexOf(c);
    if (i >= 0) selected.splice(i, 1);
    else {
      if (selected.length >= 2) selected.shift();
      selected.push(c);
      sfx.play("card-raise");
    }
  }

  // ─── controls per phase ───────────────────────────────────────────────────────────────────────────────

  function twoButtons(ui: UI, a: { id: string; label: string; sub?: string; variant?: "go" | "normal" | "danger"; disabled?: boolean }, b: { id: string; label: string; sub?: string }): 0 | 1 | -1 {
    const w = 200;
    const h = 52;
    const x = 480 - w - 10;
    if (ui.button(a.id, x, BTN_ROW_Y, w, h, a.label, { variant: a.variant ?? "go", sub: a.sub, disabled: a.disabled, font: "head" })) return 0;
    if (ui.button(b.id, 490, BTN_ROW_Y, w, h, b.label, { sub: b.sub, font: "head" })) return 1;
    return -1;
  }

  function drawControls(g: Gfx, ui: UI) {
    const s = game;
    if (!s || stage !== "game") return;
    // out-of-turn perks
    const peek = legal0("peek");
    if (peek && s.phase === "bidding") {
      if (ui.button("peek", 12, BTN_ROW_Y - 2, 130, 54, "Skat ansehen", { sub: dogName(getProfile(), "schnauzer-a"), variant: "paper" })) {
        apply(peek);
        sfx.play("dog-pant");
      }
    }
    const tb = legal0("takeBack");
    if (tb && ui.button("takeback", SLOT_A.x, SLOT_A.y, SLOT_A.w, SLOT_A.h, "Karte zurück", { variant: "paper", tooltip: `${dogName(getProfile(), "wolfhound-b")} passt auf: einmal pro Spiel` })) {
      apply(tb);
      sfx.play("card-raise");
    }
    if (!humanTurn()) return;
    const b = s.bidding;
    switch (s.phase) {
      case "bidding": {
        if (b.stage === 3) {
          const r = twoButtons(ui, { id: "bid-play", label: "Ich spiele", sub: "für 18" }, { id: "bid-pass", label: "Passe" });
          if (r === 0) apply({ type: "hold", seat: 0 });
          if (r === 1) apply({ type: "pass", seat: 0 });
        } else if (b.waiting === "asker") {
          const nb = nextBid(b.value) ?? 18;
          const r = twoButtons(ui, { id: "bid-say", label: `${nb} sagen` }, { id: "bid-pass", label: "Passe" });
          if (r === 0) apply({ type: "bid", seat: 0, value: nb });
          if (r === 1) apply({ type: "pass", seat: 0 });
          if (ui.button("bid-higher", 700, BTN_ROW_Y + 6, 112, 40, higher ? "Zu" : "Höher …", { variant: "paper", font: "head" })) higher = !higher;
          if (higher) drawHigher(g, ui, nb);
        } else {
          const r = twoButtons(ui, { id: "bid-yes", label: "Ja", sub: `${b.value} halten` }, { id: "bid-pass", label: "Passe" });
          if (r === 0) apply({ type: "hold", seat: 0 });
          if (r === 1) apply({ type: "pass", seat: 0 });
        }
        break;
      }
      case "skat":
        if (!handMode) {
          const r = twoButtons(ui, { id: "skat-up", label: "Skat aufnehmen" }, { id: "skat-hand", label: "Hand spielen", sub: "ohne den Skat" });
          if (r === 0) apply({ type: "pickUp", seat: 0 });
          if (r === 1) {
            handMode = true;
            pick = null;
          }
        } else drawDeclare(g, ui, true);
        break;
      case "discard":
        if (ui.button("discard", 480 - 110, BTN_ROW_Y, 220, 52, "Drücken", { variant: "go", disabled: selected.length !== 2, sub: selected.length === 2 ? "die zwei Karten in den Skat" : `noch ${2 - selected.length} anklicken` })) {
          apply({ type: "discard", seat: 0, cards: [selected[0], selected[1]] });
        }
        break;
      case "declare":
        drawDeclare(g, ui, false);
        break;
      case "schieben":
        if (s.schieben?.holding) {
          if (ui.button("push", 480 - 110, BTN_ROW_Y, 220, 52, "Weitergeben", { variant: "go", disabled: selected.length !== 2, sub: selected.length === 2 ? "zwei Karten zum Nächsten" : `noch ${2 - selected.length} anklicken` })) {
            apply({ type: "discard", seat: 0, cards: [selected[0], selected[1]] });
          }
        } else {
          const r = twoButtons(ui, { id: "sch-up", label: "Skat aufnehmen" }, { id: "sch-shove", label: "Schieben", sub: "ungesehen, zählt doppelt" });
          if (r === 0) apply({ type: "pickUp", seat: 0 });
          if (r === 1) apply({ type: "shove", seat: 0 });
        }
        break;
      case "re":
        // beside the hand like Kontra: the trick in the middle stays visible
        if (ui.button("re-yes", SLOT_A.x, SLOT_A.y, SLOT_A.w, SLOT_A.h, "Re!", { variant: "danger", tooltip: "Das Spiel zählt dann vierfach." })) apply({ type: "re", seat: 0 });
        if (ui.button("re-no", SLOT_B.x, SLOT_B.y, SLOT_B.w, SLOT_B.h, "Kein Re", { variant: "normal" })) apply({ type: "noRe", seat: 0 });
        break;
      case "play": {
        const k = legal0("kontra");
        if (k && ui.button("kontra", SLOT_A.x, SLOT_A.y, SLOT_A.w, SLOT_A.h, "Kontra!", { variant: "danger", tooltip: "Das Spiel zählt dann doppelt." })) apply(k);
        if (lifted >= 0 && !settings.oneClickPlay && ui.button("unlift", SLOT_A.x, SLOT_B.y, SLOT_A.w, SLOT_B.h, "Doch nicht", { variant: "paper" })) lifted = -1;
        break;
      }
      default:
        break;
    }
  }

  /** The small chooser for a jump bid ("höher …"): the next twelve values. */
  function drawHigher(g: Gfx, ui: UI, nb: number) {
    const values = BID_VALUES.filter((v) => v > nb).slice(0, 12);
    const x = 250;
    const y = 176;
    const w = 460;
    const h = 112;
    g.panel(x, y, w, h, "panel");
    g.text("Gleich höher reizen:", x + 14, y + 8, { font: "body", color: C.textDim, shadow: P.ink0 });
    values.forEach((v, i) => {
      const bx = x + 14 + (i % 6) * 72;
      const by = y + 28 + Math.floor(i / 6) * 40;
      if (ui.button(`bid-v${v}`, bx, by, 66, 36, String(v), { variant: "paper" })) apply({ type: "bid", seat: 0, value: v });
    });
  }

  /** The six declaration buttons with value and "reicht"/"reicht nicht", the toggles and the confirm button. */
  function drawDeclare(g: Gfx, ui: UI, hand: boolean) {
    const s = game!;
    const options = currentOptions();
    // left of the Menü button (846, 176), so both stay clickable
    const x = 30;
    const y = 92;
    const w = 808;
    const h = 258;
    g.panel(x, y, w, h, "panel");
    g.text(hand ? "Dein Handspiel" : "Dein Spiel", x + 18, y + 8, { font: "big", color: C.title, shadow: P.ink0 });
    g.text(`Gereizt bis ${s.bid}`, x + w - 18, y + 14, { font: "head", color: C.text, shadow: P.ink0, align: "right" });
    const bw = 124;
    const bh = 100;
    const gap = 6;
    const bx0 = x + Math.round((w - (6 * bw + 5 * gap)) / 2);
    const by = y + 46;
    options.forEach((o, i) => {
      const bx = bx0 + i * (bw + gap);
      const chosen = pick === o.kind;
      if (ui.button(`decl-${o.kind}`, bx, by, bw, bh, "", { variant: "paper", active: chosen, disabled: !o.allowed, sound: "ui-click" })) pick = o.kind;
      drawOption(g, o, bx, by, bw, s.bid, hand, chosen);
    });
    // toggles in their own row (only what the Skatordnung allows now)
    let tx = bx0;
    const ty = by + bh + 10;
    const toggle = (id: string, label: string, value: boolean, locked = false): boolean => {
      let v = value;
      if (locked) g.alpha(0.55, () => void ui.checkbox(`${id}-locked`, tx, ty, label, value));
      else v = ui.checkbox(id, tx, ty, label, value);
      tx += 28 + 10 + measure(label, "head") + 30;
      return v;
    };
    if (hand) {
      const sch = toggle("t-schneider", "Schneider angesagt", mods.schneider || mods.schwarz, mods.schwarz || mods.ouvert);
      if (!mods.schwarz && !mods.ouvert) mods.schneider = sch;
      const schw = toggle("t-schwarz", "Schwarz angesagt", mods.schwarz || mods.ouvert, mods.ouvert);
      if (!mods.ouvert) mods.schwarz = schw;
      mods.ouvert = toggle("t-ouvert", "Ouvert (offen)", mods.ouvert);
    } else {
      mods.ouvert = toggle("t-ouvert", "Null ouvert (offen)", mods.ouvert);
      if (tutorialStep() === "declare") {
        const tw = x + w - 18 - tx;
        const text = tutorialText("declare");
        const font = wrap(text, tw, "head").length <= 2 ? "head" : "body";
        g.rrect(tx - 8, ty - 6, tw + 12, 52, 3, P.paper3);
        g.text(text, tx, ty - 2, { font, color: P.river0, width: tw - 4 });
      }
    }
    // the decision row
    const ay = y + h - 54;
    const o = options.find((q) => q.kind === pick);
    const label = o ? `${kindName(o.kind, deck())} ansagen` : "Erst ein Spiel wählen";
    if (ui.button("declare-go", x + w - 18 - 260, ay, 260, 44, label, { variant: "go", disabled: !o || !o.allowed })) {
      if (o) apply({ type: "declare", seat: 0, declaration: o.declaration });
    }
    if (hand && ui.button("declare-back", x + 18, ay, 250, 44, "Doch Skat aufnehmen", { variant: "normal" })) {
      handMode = false;
      pick = null;
      mods = { schneider: false, schwarz: false, ouvert: false };
    }
  }

  function drawOption(g: Gfx, o: GameOption, x: number, y: number, w: number, bid: number, hand: boolean, chosen: boolean) {
    const ink = o.allowed ? P.ink1 : P.ink5;
    const cx = x + w / 2;
    // symbol
    if (o.kind === "grand" || o.kind === "null") {
      const icon = o.kind === "grand" ? "game-grand" : "game-null";
      if (!g.sprite("icons", icon, cx - 13, y + 8, { noAnchor: true, alpha: o.allowed ? 1 : 0.5 })) {
        g.text(o.kind === "grand" ? "G" : "0", cx, y + 6, { font: "big", align: "center", color: ink });
      }
    } else {
      const suit = ["diamonds", "hearts", "spades", "clubs"].indexOf(o.kind);
      g.alpha(o.allowed ? 1 : 0.5, () => suitIcon(g, deck(), suit, cx - 13, y + 8, 27));
    }
    g.text(kindName(o.kind, deck()), cx, y + 40, { font: "head", align: "center", color: ink });
    const valueText = hand && o.kind !== "null" && o.minValue !== o.maxValue ? `${o.minValue}–${o.maxValue}` : `${o.value}`;
    g.text(valueText, cx, y + 62, { font: "head", align: "center", color: chosen ? P.river0 : ink });
    let reach: string;
    let col: string;
    if (o.kind === "null") {
      reach = o.allowed ? "reicht" : "reicht nicht";
      col = o.allowed ? P.forest1 : P.brick1;
    } else if (o.minValue >= bid) {
      reach = "reicht";
      col = P.forest1;
    } else if (o.maxValue < bid) {
      reach = "reicht nicht";
      col = P.brick1;
    } else {
      reach = "je nach Skat";
      col = P.beer0;
    }
    g.text(reach, cx, y + 84, { font: "body", align: "center", color: o.allowed ? col : P.ink5 });
  }

  function drawCorner(g: Gfx, ui: UI) {
    if (tutorialStep() === "lastTrick") {
      // Probefahrt: a calm pulsing frame around the two buttons the note talks about
      g.alpha(0.55 + 0.35 * Math.sin(clock * 3), () => g.box(804, 440, 154, 100, P.beer2, 4));
    }
    if (menuButton(app, MENU.x, MENU.y)) app.scenes.push(createGameMenu(app, { helpPage: "house-rules", note: "Gespeichert wird nach jedem Spiel. Ein angefangenes Spiel wird neu gegeben." }));
    const lt = game ? lastTrick(game) : null;
    const canLast = stage === "game" && !!lt;
    if (ui.button("last-trick", 810, 446, 142, 40, "Letzter Stich", { disabled: !canLast, font: "head" }) && lt) {
      tutSeen.add("lastTrick");
      app.scenes.push(createLastTrickOverlay(app, { trick: lt, names: names(), deck: deck() }));
    }
    if (ui.button("liste", 810, 494, 142, 40, "Liste", { font: "head" })) {
      if (stage === "game") tutSeen.add("lastTrick");
      sfx.play("page-turn");
      app.scenes.push(createListeOverlay(app, { progress, names: names(), short: [shortOf(0), shortOf(1), shortOf(2)], deck: deck() }));
    }
  }

  function drawBubbleNow(g: Gfx) {
    if (!bubble || stage === "intro" || stage === "result" || stage === "final") return;
    const o = OPP[bubble.seat];
    if (bubble.seat === 1) drawBubble(g, bubble.text, 12, 178, o.tail[0], o.tail[1], { maxW: 300 });
    else drawBubble(g, bubble.text, MENU.x - 8, 178, o.tail[0], o.tail[1], { maxW: 250, align: "right" });
  }

  function drawWord(g: Gfx) {
    if (!word) return;
    const t = clock - word.t0;
    if (t < 0) return;
    if (t > 1.1) {
      word = null;
      return;
    }
    const a = t > 0.8 ? 1 - (t - 0.8) / 0.3 : 1;
    g.alpha(a, () => soundWord(g, word!.text, word!.x, word!.y, word!.size, Math.min(1, t * 2)));
  }

  // ─── panels: round intro, game result, places ────────────────────────────────────────────────────────

  function drawIntro(g: Gfx, ui: UI) {
    const w = 820;
    const inner = w - 80;
    const intro = introLine();
    const ruleText = config.tournament ? "" : HOUSE_RULE_TEXTS[config.houseRule].text;
    const perks = perkLines();
    const perkText = perks.join(" · ");
    // measure first, so the paper is as tall as its content and the "Was jetzt?" line stays free below it
    const h =
      14 + 36 + 30 + (intro ? textHeight(intro, inner) + 8 : 0) + 10 + 26 + (ruleText ? textHeight(ruleText, inner) + 10 : 0) + 112 +
      (perks.length ? textHeight(perkText, inner - 100) + 8 : 0) + 64;
    g.dim(0.55);
    const x = Math.round((960 - w) / 2);
    const y = Math.max(10, Math.round((484 - h) / 2));
    g.panel(x, y, w, h, "paper");
    const ink = P.ink1;
    let cy = y + 14;
    g.text(config.title, x + w / 2, cy, { font: "big", align: "center", color: ink });
    cy += 36;
    const sub = config.tournament
      ? `${config.games} Spiele · Turnierwertung`
      : `${config.games === 1 ? "Ein Spiel" : `${config.games} Spiele`}${opts.stakes ? ` · Einsatz ${STAKES_NAME[opts.stakes]}` : ""}`;
    g.text(progress.games.length ? `${sub} · weiter mit Spiel ${progress.games.length + 1}` : sub, x + w / 2, cy, { font: "head", align: "center", color: P.ink4 });
    cy += 30;
    if (intro) cy += para(g, intro, x + 40, cy, inner, { color: ink, shadow: null, align: "center" }) + 8;
    // the house rule (contract §0.3: every deviation is named before the round)
    g.rect(x + 30, cy, w - 60, 1, P.paper0);
    cy += 10;
    const rule = config.tournament ? tournamentRule() : `${INN_RULE_LEAD} {inkred}${HOUSE_RULE_TEXTS[config.houseRule].name}{/}`;
    g.text(rule, x + 40, cy, { font: "head", color: ink });
    cy += 26;
    if (ruleText) cy += para(g, ruleText, x + 40, cy, inner, { color: P.ink3, shadow: null }) + 10;
    // the two regulars
    const colW = inner / 2;
    ([1, 2] as const).forEach((seat, i) => {
      const id = opp(seat);
      const px = x + 40 + i * colW;
      portrait(g, CHARACTER_DEFS[id].portrait ?? id, px + 4, cy + 4, 96);
      g.text(characterNameStart(id), px + 116, cy, { font: "head", color: ink });
      para(g, CHARACTER_DEFS[id].style, px + 116, cy + 26, colW - 126, { font: "body", color: P.ink3, shadow: null });
    });
    cy += 112;
    if (perks.length) {
      g.text("Mit dabei:", x + 40, cy, { font: "head", color: ink });
      para(g, perkText, x + 140, cy, inner - 100, { color: P.ink3, shadow: null });
    }
    const label = progress.games.length ? "Weiter spielen" : "Los geht’s";
    if (ui.button("intro-go", x + w / 2 - 120, y + h - 56, 240, 46, label, { variant: "go", hotkey: "Enter" })) beginGame();
  }

  function introLine(): string {
    const drink = config.tournament ? "" : ` ${DRINK_SERVED[settings.drink] ?? ""}`.trimEnd();
    if (opts.intro) return `${opts.intro}${drink}`;
    if (config.tournament) return "";
    const room = INN_ROOMS[config.room] ?? INN_ROOMS[{ campsite: "camping", tent: "festtent" }[config.room] ?? "village"] ?? INN_ROOMS.village;
    const lines = room.intro.filter((l) => !l.includes("{place}"));
    if (!lines.length) return "";
    return fillText(lines[hashString(`intro/${config.seed}`) % lines.length], { inn: config.title }) + drink;
  }

  function tournamentRule(): string {
    const n = config.games;
    const words = ["", "ein", "zwei", "drei", "vier", "fünf", "sechs", "sieben", "acht", "neun", "zehn"];
    return TOURNAMENT_RULE.replace("sechs", words[n] ?? String(n));
  }

  function perkLines(): string[] {
    const p = config.perks;
    const prof = getProfile();
    const out: string[] = [];
    if (p.showTrumps) out.push("gefallene Trümpfe werden gezeigt");
    if (p.showPoints) out.push("die Augen stehen am Rand");
    if (p.redeals > 0) out.push(p.redeals === 1 ? "einmal neu geben lassen" : `${p.redeals}-mal neu geben lassen`);
    if (p.skatPeeks > 0) out.push(`${dogName(prof, "schnauzer-a")}: ${p.skatPeeks === 1 ? "eine Skatkarte" : `${p.skatPeeks} Skatkarten`} ansehen`);
    if (p.takeBacks > 0) out.push(`${dogName(prof, "wolfhound-b")}: eine Karte pro Spiel zurücknehmen`);
    if (p.forehandFirst) out.push("im ersten Spiel in Vorhand");
    const b = p.listBonus;
    const ev = effects.listBonus;
    const extra: string[] = [];
    if (b.grand - ev.grand > 0) extra.push(`Grand +${b.grand - ev.grand}`);
    if (b.null - ev.null > 0) extra.push(`Null +${b.null - ev.null}`);
    if (b.hand - ev.hand > 0) extra.push(`Hand +${b.hand - ev.hand}`);
    if (b.schneider > 0) extra.push(`Schneider +${b.schneider}`);
    if (b.defence > 0) extra.push(`Gegenspiel +${b.defence}`);
    if (extra.length) out.push(`deine Bierdeckel: ${extra.join(", ")}`);
    return out;
  }

  function drawResult(g: Gfx, ui: UI) {
    if (!last) return;
    const L = last;
    const w = 760;
    const inner = w - 80;
    const r = L.state.result!;
    const sk: Card[] = [];
    for (let c = 0; c < 32; c++) if (has(r.skat, c)) sk.push(c);
    const showSkat = r.type !== "passed" && sk.length > 0;
    const textH = textHeight(L.sentence, inner) + 6 + L.lines.reduce((n, l) => n + textHeight(l, inner), 0);
    const tut = tutorialStep() === "list" ? `Probefahrt: ${tutorialText("list")}` : "";
    const tutH = tut ? textHeight(tut, inner) + 12 : 0;
    const h = 50 + textH + 10 + (showSkat ? 64 : 0) + 96 + tutH + 66;
    g.dim(0.55);
    const x = Math.round((960 - w) / 2);
    const y = Math.max(10, Math.round((484 - h) / 2));
    g.panel(x, y, w, h, "paper");
    const ink = P.ink1;
    const good = playerWon(L.state);
    g.text(L.heading, x + w / 2, y + 12, { font: "big", align: "center", color: good === true ? P.forest1 : good === false ? P.brick1 : ink });
    let cy = y + 50;
    cy += para(g, L.sentence, x + 40, cy, inner, { color: ink, shadow: null, align: "center" }) + 6;
    for (const l of L.lines) cy += para(g, l, x + 40, cy, inner, { color: P.ink3, shadow: null, align: "center" });
    cy += 10;
    // the skat (after the game everybody may see it)
    if (showSkat) {
      const label = r.type === "ramsch" || !L.state.skatTaken ? "Im Skat lagen:" : "Gedrückt:";
      const lw = measure(label, "head");
      const total = lw + 12 + sk.length * 40;
      let sx = x + Math.round((w - total) / 2);
      g.text(label, sx, cy + 16, { font: "head", color: P.ink4 });
      sx += lw + 12;
      sk.forEach((c, i) => drawSmallCard(g, deck(), c, sx + i * 40, cy));
      cy += 64;
    }
    // what this game wrote into the Liste
    const colW = 200;
    const tx = x + Math.round((w - 3 * colW) / 2);
    g.rect(x + 30, cy, w - 60, 1, P.paper0);
    cy += 8;
    ([0, 1, 2] as Seat[]).forEach((seat, i) => {
      const cx = tx + i * colW + colW / 2;
      const ch = L.record.list[seat];
      g.text(shortOf(seat), cx, cy, { font: "head", align: "center", color: seat === 0 ? P.river0 : ink });
      g.text(ch === 0 ? "–" : signed(ch), cx, cy + 24, { font: "big", align: "center", color: ch < 0 ? P.brick1 : ch > 0 ? P.forest1 : P.ink4 });
      g.text(`Liste: ${signed(progress.list[seat])}`, cx, cy + 60, { font: "body", align: "center", color: P.ink4 });
    });
    if (tut) para(g, tut, x + 40, cy + 88, inner, { color: P.river0, shadow: null, align: "center" });
    const by = y + h - 58;
    if (L.quote) {
      const q = L.quote;
      portrait(g, CHARACTER_DEFS[opp(q.seat)].portrait ?? opp(q.seat), x + 34, by - 2, 48);
      para(g, `„${q.text.replace(/\{[^}]*\}/g, "")}“`, x + 94, by, w - 380, { font: "body", color: P.ink3, shadow: null });
    }
    const lastGame = isRoundOver(progress);
    if (ui.button("result-go", x + w - 290, by, 230, 46, lastGame ? "Zur Abrechnung" : "Weiter", { variant: "go", hotkey: "Enter" })) nextAfterResult();
  }

  function drawFinal(g: Gfx, ui: UI) {
    const w = 700;
    const kitty = effects.kittyStake > 0;
    const h = 14 + 40 + 40 + 3 * 62 + (kitty ? 30 : 0) + 74;
    g.dim(0.55);
    const x = Math.round((960 - w) / 2);
    const y = Math.max(10, Math.round((484 - h) / 2));
    g.panel(x, y, w, h, "paper");
    const ink = P.ink1;
    const res = roundResult(progress);
    g.text("Die Runde ist aus", x + w / 2, y + 14, { font: "big", align: "center", color: ink });
    const sentence = res.place === 1 ? "Du bist Erster am Tisch!" : res.place === 2 ? "Zweiter. Knapp daneben ist auch vorbei." : "Dritter. Heute fährst du die anderen heim.";
    g.text(sentence, x + w / 2, y + 54, { font: "head", align: "center", color: res.place === 1 ? P.forest1 : ink });
    // places: the player wins ties (round module); show him first among equals
    const seats = ([0, 1, 2] as Seat[]).sort((a, b) => progress.list[b] - progress.list[a] || (a === 0 ? -1 : b === 0 ? 1 : a - b));
    let cy = y + 94;
    for (const seat of seats) {
      const place = seat === 0 ? res.place : 1 + seats.filter((o) => progress.list[o] > progress.list[seat]).length;
      const rx = x + 110;
      g.text(`${place}.`, rx, cy + 12, { font: "big", color: place === 1 ? P.beer0 : P.ink4 });
      if (seat !== 0) portrait(g, CHARACTER_DEFS[opp(seat)].portrait ?? opp(seat), rx + 50, cy, 48);
      else {
        g.panel(rx + 46, cy - 4, 56, 56, "panel-dark");
        g.text(playerName.slice(0, 1).toUpperCase(), rx + 74, cy + 10, { font: "big", align: "center", color: C.title });
      }
      g.text(nameOf(seat), rx + 118, cy + 12, { font: "head", color: seat === 0 ? P.river0 : ink });
      g.text(signed(progress.list[seat]), x + w - 110, cy + 8, { font: "big", align: "right", color: progress.list[seat] < 0 ? P.brick1 : ink });
      cy += 62;
    }
    if (kitty) g.text(`In der Skatkasse liegen ${progress.kitty} Mark. Die bekommt der Erste.`, x + w / 2, cy + 2, { font: "head", align: "center", color: P.ink3 });
    const by = y + h - 60;
    if (finalQuote) {
      const q = finalQuote;
      portrait(g, CHARACTER_DEFS[opp(q.seat)].portrait ?? opp(q.seat), x + 34, by, 44);
      para(g, `„${q.text}“`, x + 90, by + 2, w - 350, { font: "body", color: P.ink3, shadow: null });
    }
    if (ui.button("final-go", x + w - 250, by, 220, 46, "Weiter", { variant: "go", hotkey: "Enter" }) && !doneCalled) {
      doneCalled = true;
      opts.onDone(res);
    }
  }

  function drawOffer(g: Gfx, ui: UI) {
    const r = twoButtons(ui, { id: "offer-keep", label: "Behalten", sub: "und reizen" }, { id: "offer-redeal", label: "Neu geben", sub: redealsLeft(progress) === 1 ? "geht einmal" : `noch ${redealsLeft(progress)}-mal` });
    if (r === 0) startBidding();
    if (r === 1) redeal();
  }

  function drawWhatNow(g: Gfx) {
    const text = whatNowText();
    if (!text) return;
    const panelOpen = stage === "intro" || stage === "result" || stage === "final";
    if (panelOpen) {
      whatNow(g, text, { y: 494, w: 900 });
      return;
    }
    const lines = wrap(text, 760 - 32, "head").length;
    whatNow(g, text, { y: WHAT_BOTTOM - 34 - (lines - 1) * lineHeight("head") });
  }

  // ─── the scene ────────────────────────────────────────────────────────────────────────────────────────

  if (opts.devGame) {
    game = opts.devGame;
    setStage("game");
  } else if (opts.devSkipIntro && stage === "intro") beginGame();

  /**
   * Contract §11: the Stammtisch/Preisskat music crossfades to its tense layer when a game gets close — the outcome is
   * still open late in the game, or Kontra was said — and back to calm when it is decided. Switches at most every 8 s.
   */
  let layerAt = -99;
  function closeGame(s: GameState): boolean {
    if (s.phase !== "play" && s.phase !== "re") return false;
    if (s.kontra > 0) return true;
    const n = s.tricks.length;
    if (s.declarer === null) return n >= 6; // Ramsch: the last tricks decide who carries the minus
    if (s.declaration?.kind === "null") return n >= 5; // Null: the declarer still clean late in the game
    const { declarer: d, defenders: f } = partyPoints(s);
    return n >= 4 && d >= 31 && f >= 30 && d < 61 && f < 60;
  }
  function updateMusicLayer() {
    const want = stage === "game" && game && closeGame(game) ? "tense" : "calm";
    if (want !== music.layer && clock - layerAt > 8) {
      layerAt = clock;
      music.setLayer(want);
    }
  }

  const scene: Scene = {
    enter() {
      void ensureAi();
      music.play(config.tournament ? "preisskat" : "stammtisch", "calm");
      // recorded room tone, mastered quiet (−36 LUFS), so it plays at full volume
      murmur = sfx.loop(roomAmbience(config.room), { volume: 1 });
    },
    exit() {
      murmur?.stop(0.5);
      murmur = null;
    },
    update(dt) {
      clock += dt * speed;
      updateMusicLayer();
      if (stage === "deal") {
        const p = pace();
        const t = clock - stageT0;
        const marks = [0.15, 0.5, 0.85].map((v) => v * p.deal);
        while (dealPackets < 3 && t >= marks[dealPackets]) {
          dealPackets++;
          sfx.play("card-deal", { rate: 0.96 + fxRng.next() * 0.08 });
        }
        if (t >= 1.25 * p.deal) afterDeal();
      }
      if (stage === "game" && game) {
        const p = pace();
        if (gather && clock - gather.t0 > p.hold + p.slide) gather = null;
        if (game.phase === "done") {
          if (finishAt < 0) finishAt = clock + (gather ? p.hold + p.slide + 0.4 : 0.9);
          if (clock >= finishAt && !gather) finish();
        } else runAi();
      }
      if (auto) autoAdvance();
      if (queued && clock >= queued.at) {
        say(queued.seat, queued.text);
        queued = null;
      }
      if (bubble && clock > bubble.t0 + bubble.dur) bubble = null;
    },
    draw(g, a) {
      const ui = a.ui;
      drawRoom(g);
      drawTafel(g);
      drawOpponent(g, 1);
      drawOpponent(g, 2);
      drawSkat(g);
      drawTrick(g);
      drawInfo(g);
      drawPlayerPlate(g);
      drawDogs(g);
      drawHand(g, ui);
      if (stage === "game") drawControls(g, ui);
      if (stage === "offer") drawOffer(g, ui);
      drawTutorial(g, ui);
      drawBubbleNow(g);
      drawWord(g);
      if (stage === "intro") drawIntro(g, ui);
      if (stage === "result") drawResult(g, ui);
      if (stage === "final") drawFinal(g, ui);
      // the corner buttons last: Menü and Liste stay reachable over every panel
      drawCorner(g, ui);
      drawWhatNow(g);
    },
  };

  // dev / soak hooks: the state for tools/soak.mjs and quick looks in the console
  (window as unknown as { __table?: unknown }).__table = {
    get stage() {
      return stage;
    },
    get games() {
      return progress.games.length;
    },
    get phase() {
      return game?.phase ?? null;
    },
    get done() {
      return doneCalled;
    },
    get current() {
      return game && game.phase !== "done" ? currentSeat(game) : null;
    },
    get history() {
      return game?.history.length ?? 0;
    },
    get bid() {
      return game ? Math.max(game.bid, game.bidding.value) : 0;
    },
    get allowed() {
      return currentOptions().filter((o) => o.allowed).map((o) => o.kind);
    },
    get last() {
      const r = last?.state.result;
      return r ? { type: r.type, declarer: r.declarer, kind: r.declaration?.kind ?? null, won: r.won, written: r.written } : null;
    },
    get list() {
      return [...progress.list];
    },
  };

  return scene;
}

/** Code fallback for the bikers' meeting: dusk over a meadow, the treeline, a campfire glow, a trestle table. */
function drawBikersMeadow(g: Gfx) {
  const sky = [P.dusk0, P.dusk1, P.dusk2, P.dusk3, P.brick4, P.beer3];
  sky.forEach((c, i) => g.rect(0, i * 40, 960, 40, c));
  for (let x = -20; x < 980; x += 34) {
    const h = 60 + ((x * 37) % 41);
    for (let k = 0; k < h; k += 6) {
      const half = Math.round((1 - k / h) * 22);
      g.rect(x + 17 - half, 234 - k, half * 2 + 2, 6, P.forest0);
    }
  }
  g.rect(0, 240, 960, 64, P.forest1);
  for (let x = 0; x < 960; x += 12) g.rect(x, 236 + ((x * 13) % 7), 6, 6, P.forest2);
  // campfire glow behind the middle
  g.alpha(0.35, () => g.circle(480, 250, 70, P.beer2, true));
  g.alpha(0.5, () => g.circle(480, 262, 30, P.beer3, true));
  // the trestle table we sit at
  g.rect(0, 304, 960, 236, P.wood2);
  for (let y = 304; y < 540; y += 26) {
    g.rect(0, y, 960, 2, P.wood1);
    g.rect(0, y + 2, 960, 1, P.wood3);
  }
}

function ease(u: number): number {
  return u < 0.5 ? 2 * u * u : 1 - Math.pow(-2 * u + 2, 2) / 2;
}
