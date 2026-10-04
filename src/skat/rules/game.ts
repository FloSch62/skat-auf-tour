// The high-level Skat game as an immutable state machine shared by the table scene and the computer opponents.
// Every decision is an `Action`; `applyAction(state, action)` returns a new state (or throws on an illegal action).
// Phases: bidding → skat (pick up or play Hand) → discard → declare → play (⇄ re after a Kontra) → done.
// With Ramsch/Schieberamsch: bidding (all pass) → [schieben] → play → done. Eingepasst: bidding → done.
// States are plain JSON-serialisable objects (masks are numbers).
import { bit, has, pointsOf, popcount, isJack } from "./cards.ts";
import type { Card, CardMask } from "./cards.ts";
import { deal, forehandOf, nextSeat, seatAt } from "./deal.ts";
import type { HandPosition, Seat } from "./deal.ts";
import { STANDARD_RULES, seegerFabian } from "./list.ts";
import type { RuleOptions } from "./list.ts";
import { Position, legalMoves, playRules, trickWinner, trickPoints } from "./play.ts";
import type { PlayKind, PlayRules } from "./play.ts";
import { settleRamsch } from "./ramsch.ts";
import {
  BID_VALUES, DECL_KINDS, MIN_BID, declaration, declarationError, normalizeDeclaration, nullValue, settle,
} from "./value.ts";
import type { Declaration, Levels, LossReason, Matadors } from "./value.ts";

export type Phase = "bidding" | "skat" | "discard" | "declare" | "schieben" | "play" | "re" | "done";

export type Action =
  /** Asker says a value ("18", jump bids allowed, ISkO 3.3.2). */
  | { type: "bid"; seat: Seat; value: number }
  /** Listener says "Ja" — or Vorhand takes the game after everybody else passed (ISkO 3.3.6). */
  | { type: "hold"; seat: Seat }
  /** "Passe" (bidding). */
  | { type: "pass"; seat: Seat }
  /** Perk: look at skat card 0 or 1 before this seat's first bidding decision. */
  | { type: "peek"; seat: Seat; index: 0 | 1 }
  /** Declarer takes the skat; in Schieberamsch: pick the skat up to pass two cards on. */
  | { type: "pickUp"; seat: Seat }
  /** Declarer lays two cards away (drücken); in Schieberamsch: pass two cards (no jacks) on. */
  | { type: "discard"; seat: Seat; cards: [Card, Card] }
  /** Announce the game. In phase "skat" it is a Hand game, in phase "declare" a game with the skat. */
  | { type: "declare"; seat: Seat; declaration: Declaration }
  /** Schieberamsch: pass the skat on unseen (doubles). */
  | { type: "shove"; seat: Seat }
  /** House rule kontra: a defender before his first card (×2). */
  | { type: "kontra"; seat: Seat }
  /** Declarer answers a Kontra with Re (×4) … */
  | { type: "re"; seat: Seat }
  /** … or not. */
  | { type: "noRe"; seat: Seat }
  | { type: "play"; seat: Seat; card: Card }
  /** Perk: take back the own card just played (the most recent action). */
  | { type: "takeBack"; seat: Seat };

export interface BiddingState {
  /** 1: Mittelhand reizt Vorhand. 2: Hinterhand reizt den Verbliebenen. 3: nobody bid; Vorhand may still play. */
  stage: 1 | 2 | 3;
  /** Who says values ("sagt"): Mittelhand in stage 1, Hinterhand in stage 2. */
  asker: Seat;
  /** Who answers ("hört"): Vorhand in stage 1, the survivor in stage 2, Vorhand in stage 3. */
  listener: Seat;
  waiting: "asker" | "listener";
  /** Highest value said so far (0 = none). */
  value: number;
  /** Who has that value (said it or held it). */
  holder: Seat | null;
  passed: [boolean, boolean, boolean];
}

export interface TrickRecord {
  leader: Seat;
  cards: [Card, Card, Card];
  winner: Seat;
  points: number;
}

export interface SchiebenState {
  /** Hand position deciding now (0 Vorhand, 1 Mittelhand, 2 Hinterhand). */
  step: HandPosition;
  /** The deciding player picked the skat up and must pass two cards on. */
  holding: boolean;
  shoves: number;
  /** Per seat: true = picked up, false = shoved, null = not yet. */
  choice: [boolean | null, boolean | null, boolean | null];
  /** Cards each seat passed on (0 when shoved). */
  passed: [CardMask, CardMask, CardMask];
}

export interface RamschInfo {
  losers: Seat[];
  jungfrau: Seat[];
  durchmarsch: Seat | null;
  shoves: number;
}

export interface GameResult {
  type: "passed" | "declared" | "ramsch";
  declarer: Seat | null;
  declaration: Declaration | null;
  bid: number;
  /** Declarer won (declared games); Ramsch: a Durchmarsch happened. */
  won: boolean;
  /** Card points per seat at the end: the skat counts for the declarer, in Ramsch for the last trick. */
  points: [number, number, number];
  tricks: [number, number, number];
  /** Declared games: the declarer's points incl. skat. */
  declarerPoints: number;
  matadors: Matadors | null;
  /** Base value (9…24, Null: its fixed value). */
  base: number;
  multiplier: number;
  levels: Levels | null;
  /** Single value after the overbid adjustment, without factors (Null: fixed value; Ramsch: points). */
  value: number;
  overbid: boolean;
  reason: LossReason | null;
  /** The losing party ended Schneider / Schwarz on the cards. */
  schneider: boolean;
  schwarz: boolean;
  kontra: 0 | 1 | 2;
  /** Kontra/Re × Bock (Ramsch: 2^Jungfrau × 2^shoves × Bock). */
  factor: number;
  /** Signed value as written in the list for the declarer (lost: −2·v·factor) or the Ramsch loser/Durchmarsch. */
  written: number;
  /** Extended Seeger-Fabian change per seat, without perk/evening bonuses (the round adds those). */
  list: [number, number, number];
  /** Final skat (after discarding / pushing). */
  skat: CardMask;
  /** Null ended early at the declarer's first trick. */
  earlyEnd: boolean;
  ramsch: RamschInfo | null;
}

export interface GameState {
  seed: number;
  dealer: Seat;
  forehand: Seat;
  rules: RuleOptions;
  phase: Phase;
  /** Current hands by seat. */
  hands: [CardMask, CardMask, CardMask];
  /** Current skat: dealt skat, then the discarded cards (or Schieberamsch: the cards passed last). */
  skat: CardMask;
  /** The dealt skat in dealt order (peek index 0/1). */
  dealtSkat: [Card, Card];
  bidding: BiddingState;
  declarer: Seat | null;
  /** Final bid value of the declarer (18 when Vorhand took the game without bids). */
  bid: number;
  skatTaken: boolean;
  declaration: Declaration | null;
  kontra: 0 | 1 | 2;
  kontraBy: Seat | null;
  schieben: SchiebenState | null;
  /** Hands when play started (all 10 cards). */
  playHands: [CardMask, CardMask, CardMask];
  /** Seat to play (play phase). */
  turn: Seat;
  /** Cards of the unfinished trick in playing order. */
  trick: Card[];
  trickLeader: Seat;
  tricks: TrickRecord[];
  /** Card points won in tricks per seat (skat not included until the result). */
  points: [number, number, number];
  trickCounts: [number, number, number];
  /** All cards played so far (incl. the current trick). */
  played: CardMask;
  /** Cards revealed to a seat by perks (skat peeks). */
  revealed: [CardMask, CardMask, CardMask];
  peeksLeft: [number, number, number];
  takeBacksLeft: [number, number, number];
  history: Action[];
  result: GameResult | null;
  /** The state before the most recent card play (enables `takeBack`). */
  undo: GameState | null;
}

export interface GameSetup {
  seed: number;
  dealer: Seat;
  rules?: Partial<RuleOptions>;
  /** Skat peeks available per seat in this game (perk; usually only seat 0). */
  peeks?: [number, number, number];
  /** Take-backs available per seat in this game (perk). */
  takeBacks?: [number, number, number];
  /** Fixed cards instead of the seeded deal (problems, tests). */
  cards?: { hands: [CardMask, CardMask, CardMask]; skat: [Card, Card] };
}

type Tuple3<T> = [T, T, T];

function set3<T>(t: readonly T[], i: number, v: T): Tuple3<T> {
  const c = [t[0], t[1], t[2]] as Tuple3<T>;
  c[i] = v;
  return c;
}

export function newGame(setup: GameSetup): GameState {
  const dealer = setup.dealer;
  const d = setup.cards ? { hands: setup.cards.hands, skat: setup.cards.skat } : deal(setup.seed, dealer);
  const skat = bit(d.skat[0]) | bit(d.skat[1]);
  if (setup.cards) {
    const all = d.hands[0] | d.hands[1] | d.hands[2] | skat;
    const sizes = d.hands.map(popcount);
    if (all !== -1 || sizes.some((n) => n !== 10) || d.skat[0] === d.skat[1]) throw new Error("cards must be 10/10/10/2");
  }
  const fh = forehandOf(dealer);
  return {
    seed: setup.seed,
    dealer,
    forehand: fh,
    rules: { ...STANDARD_RULES, ...setup.rules },
    phase: "bidding",
    hands: [d.hands[0], d.hands[1], d.hands[2]],
    skat,
    dealtSkat: [d.skat[0], d.skat[1]],
    bidding: {
      stage: 1,
      asker: seatAt(1, dealer),
      listener: fh,
      waiting: "asker",
      value: 0,
      holder: null,
      passed: [false, false, false],
    },
    declarer: null,
    bid: 0,
    skatTaken: false,
    declaration: null,
    kontra: 0,
    kontraBy: null,
    schieben: null,
    playHands: [0, 0, 0],
    turn: fh,
    trick: [],
    trickLeader: fh,
    tricks: [],
    points: [0, 0, 0],
    trickCounts: [0, 0, 0],
    played: 0,
    revealed: [0, 0, 0],
    peeksLeft: setup.peeks ? [...setup.peeks] : [0, 0, 0],
    takeBacksLeft: setup.takeBacks ? [...setup.takeBacks] : [0, 0, 0],
    history: [],
    result: null,
    undo: null,
  };
}

// ─── Queries ──────────────────────────────────────────────────────────────────────────────────────────────

/** The game kind that decides the card order now (null before the game is known). */
export function playKindOf(s: GameState): PlayKind | null {
  if (s.declaration) return s.declaration.kind;
  if (s.phase === "schieben" || ((s.phase === "play" || s.phase === "done") && s.declarer === null)) return "ramsch";
  return null;
}

export function rulesOf(s: GameState): PlayRules | null {
  const k = playKindOf(s);
  return k ? playRules(k) : null;
}

/** Whose decision it is (null when the game is over). Out-of-turn perks (peek, takeBack) are in `legalActions`. */
export function currentSeat(s: GameState): Seat | null {
  switch (s.phase) {
    case "bidding": {
      const b = s.bidding;
      if (b.stage === 3) return s.forehand;
      return b.waiting === "asker" ? b.asker : b.listener;
    }
    case "skat":
    case "discard":
    case "declare":
    case "re":
      return s.declarer;
    case "schieben":
      return seatAt(s.schieben!.step, s.dealer);
    case "play":
      return s.turn;
    case "done":
      return null;
  }
}

/** Card led to the current trick, or -1. */
export function ledCard(s: GameState): Card {
  return s.trick.length > 0 ? s.trick[0] : -1;
}

/** Legal cards for the seat to play (0 outside the play phase). */
export function legalCards(s: GameState): CardMask {
  if (s.phase !== "play") return 0;
  const r = rulesOf(s)!;
  return legalMoves(r, s.hands[s.turn], ledCard(s));
}

/** The last completed trick (ISkO 4.4.3: may be looked at), or null. */
export function lastTrick(s: GameState): TrickRecord | null {
  return s.tricks.length ? s.tricks[s.tricks.length - 1] : null;
}

/** Card points of the declarer's party and the defenders so far (skat excluded until the end). */
export function partyPoints(s: GameState): { declarer: number; defenders: number } {
  if (s.declarer === null) return { declarer: 0, defenders: 0 };
  const d = s.points[s.declarer];
  return { declarer: d, defenders: s.points[0] + s.points[1] + s.points[2] - d };
}

function hasActedInBidding(s: GameState, seat: Seat): boolean {
  return s.history.some((a) => a.seat === seat && (a.type === "bid" || a.type === "hold" || a.type === "pass"));
}

function canPeek(s: GameState, seat: Seat, index: number): boolean {
  return (
    s.phase === "bidding" &&
    s.peeksLeft[seat] > 0 &&
    (index === 0 || index === 1) &&
    !has(s.revealed[seat], s.dealtSkat[index]) &&
    !hasActedInBidding(s, seat)
  );
}

function canTakeBack(s: GameState, seat: Seat): boolean {
  if (!s.undo || s.takeBacksLeft[seat] <= 0) return false;
  const last = s.history[s.history.length - 1];
  return !!last && last.type === "play" && last.seat === seat;
}

function canKontra(s: GameState, seat: Seat): boolean {
  return (
    s.phase === "play" &&
    s.rules.kontra &&
    s.declaration !== null &&
    s.kontra === 0 &&
    seat !== s.declarer &&
    seat === s.turn &&
    popcount(s.hands[seat]) === 10
  );
}

function pairs(m: CardMask): [Card, Card][] {
  const cs: Card[] = [];
  for (let c = 0; c < 32; c++) if (has(m, c)) cs.push(c);
  const out: [Card, Card][] = [];
  for (let i = 0; i < cs.length; i++) for (let j = i + 1; j < cs.length; j++) out.push([cs[i], cs[j]]);
  return out;
}

const VARIANTS: Partial<Omit<Declaration, "kind">>[] = [
  {},
  { schneiderAnnounced: true },
  { schwarzAnnounced: true },
  { ouvert: true },
];

/** All declarations the declarer may announce now (phase "skat": Hand games; "declare": games with the skat). */
export function legalDeclarations(s: GameState): Declaration[] {
  if (s.phase !== "skat" && s.phase !== "declare") return [];
  const hand = s.phase === "skat";
  const out: Declaration[] = [];
  for (const kind of DECL_KINDS) {
    if (kind === "null") {
      for (const ouvert of [false, true]) {
        const d = declaration("null", { hand, ouvert });
        if (nullValue(d) >= s.bid) out.push(d);
      }
    } else if (hand) {
      for (const v of VARIANTS) out.push(declaration(kind, { hand: true, ...v }));
    } else {
      out.push(declaration(kind));
    }
  }
  return out;
}

/**
 * Every action `seat` may take now (default: the seat whose turn it is). Includes out-of-turn perks: `peek` during
 * bidding and `takeBack` right after the seat's own card. Bids list every allowed value (jump bids).
 */
export function legalActions(s: GameState, seat: Seat | null = currentSeat(s)): Action[] {
  if (seat === null) return [];
  const out: Action[] = [];
  if (seat === currentSeat(s)) {
    switch (s.phase) {
      case "bidding": {
        const b = s.bidding;
        if (b.stage !== 3 && b.waiting === "asker") {
          for (const v of BID_VALUES) if (v > b.value) out.push({ type: "bid", seat, value: v });
        } else {
          out.push({ type: "hold", seat });
        }
        out.push({ type: "pass", seat });
        break;
      }
      case "skat":
        out.push({ type: "pickUp", seat });
        for (const d of legalDeclarations(s)) out.push({ type: "declare", seat, declaration: d });
        break;
      case "discard":
        for (const p of pairs(s.hands[seat])) out.push({ type: "discard", seat, cards: p });
        break;
      case "declare":
        for (const d of legalDeclarations(s)) out.push({ type: "declare", seat, declaration: d });
        break;
      case "schieben":
        if (s.schieben!.holding) {
          for (const p of pairs(s.hands[seat] & ~(0xf << 28))) out.push({ type: "discard", seat, cards: p });
        } else {
          out.push({ type: "pickUp", seat }, { type: "shove", seat });
        }
        break;
      case "re":
        out.push({ type: "re", seat }, { type: "noRe", seat });
        break;
      case "play": {
        if (canKontra(s, seat)) out.push({ type: "kontra", seat });
        let m = legalCards(s);
        while (m !== 0) {
          const low = m & -m;
          out.push({ type: "play", seat, card: 31 - Math.clz32(low) });
          m ^= low;
        }
        break;
      }
      case "done":
        break;
    }
  }
  for (const index of [0, 1] as const) if (canPeek(s, seat, index)) out.push({ type: "peek", seat, index });
  if (canTakeBack(s, seat)) out.push({ type: "takeBack", seat });
  return out;
}

// ─── Transitions ──────────────────────────────────────────────────────────────────────────────────────────

/** Why the action is illegal now, or null if it is legal. */
export function checkAction(s: GameState, a: Action): string | null {
  const seat = a.seat;
  if (seat !== 0 && seat !== 1 && seat !== 2) return "bad seat";
  if (a.type === "peek") return canPeek(s, seat, a.index) ? null : "no peek possible";
  if (a.type === "takeBack") return canTakeBack(s, seat) ? null : "nothing to take back";
  if (seat !== currentSeat(s)) return `not seat ${seat}'s turn`;
  const b = s.bidding;
  switch (a.type) {
    case "bid":
      if (s.phase !== "bidding" || b.stage === 3 || b.waiting !== "asker") return "no bid expected";
      if (!BID_VALUES.includes(a.value)) return `${a.value} is no bid value`;
      if (a.value <= b.value) return `bid must exceed ${b.value}`;
      return null;
    case "hold":
      return s.phase === "bidding" && (b.stage === 3 || b.waiting === "listener") ? null : "no answer expected";
    case "pass":
      return s.phase === "bidding" ? null : "not bidding";
    case "pickUp":
      if (s.phase === "skat") return null;
      if (s.phase === "schieben" && !s.schieben!.holding) return null;
      return "cannot pick up now";
    case "discard": {
      if (s.phase !== "discard" && !(s.phase === "schieben" && s.schieben!.holding)) return "cannot discard now";
      const [x, y] = a.cards;
      if (!Number.isInteger(x) || !Number.isInteger(y) || x === y || x < 0 || y < 0 || x > 31 || y > 31) return "bad cards";
      if (!has(s.hands[seat], x) || !has(s.hands[seat], y)) return "cards not in hand";
      if (s.phase === "schieben" && (isJack(x) || isJack(y))) return "jacks may not be pushed";
      return null;
    }
    case "declare": {
      if (s.phase !== "skat" && s.phase !== "declare") return "cannot declare now";
      return declarationError(a.declaration, { skatTaken: s.phase === "declare", bid: s.bid });
    }
    case "shove":
      return s.phase === "schieben" && !s.schieben!.holding ? null : "cannot shove now";
    case "kontra":
      return canKontra(s, seat) ? null : "no Kontra possible";
    case "re":
    case "noRe":
      return s.phase === "re" ? null : "no Re expected";
    case "play": {
      if (s.phase !== "play") return "not playing";
      if (!Number.isInteger(a.card) || a.card < 0 || a.card > 31) return "bad card";
      if (!has(legalCards(s), a.card)) return has(s.hands[seat], a.card) ? "must follow suit" : "card not in hand";
      return null;
    }
  }
}

export function isLegal(s: GameState, a: Action): boolean {
  return checkAction(s, a) === null;
}

/** Apply a legal action and return the new state. Throws on an illegal action. */
export function applyAction(s: GameState, a: Action): GameState {
  const err = checkAction(s, a);
  if (err) throw new Error(`illegal ${a.type} by seat ${a.seat}: ${err}`);
  const history = [...s.history, a];
  const seat = a.seat;
  switch (a.type) {
    case "peek":
      return {
        ...s,
        history,
        revealed: set3(s.revealed, seat, s.revealed[seat] | bit(s.dealtSkat[a.index])),
        peeksLeft: set3(s.peeksLeft, seat, s.peeksLeft[seat] - 1),
      };
    case "takeBack":
      return { ...s.undo!, takeBacksLeft: set3(s.takeBacksLeft, seat, s.takeBacksLeft[seat] - 1), undo: null };
    case "bid":
      return { ...s, history, undo: null, bidding: { ...s.bidding, value: a.value, holder: seat, waiting: "listener" } };
    case "hold": {
      const b = s.bidding;
      if (b.stage === 3) {
        return toDeclarer({ ...s, history, bidding: { ...b, holder: s.forehand, value: MIN_BID } }, s.forehand, MIN_BID);
      }
      return { ...s, history, bidding: { ...b, holder: seat, waiting: "asker" } };
    }
    case "pass":
      return applyPass(s, seat, history);
    case "pickUp": {
      const hands = set3(s.hands, seat, s.hands[seat] | s.skat);
      if (s.phase === "skat") return { ...s, history, hands, skat: 0, skatTaken: true, phase: "discard" };
      const sch = s.schieben!;
      return {
        ...s,
        history,
        hands,
        skat: 0,
        schieben: { ...sch, holding: true, choice: set3(sch.choice, seat, true) },
      };
    }
    case "discard": {
      const m = bit(a.cards[0]) | bit(a.cards[1]);
      const hands = set3(s.hands, seat, s.hands[seat] & ~m);
      if (s.phase === "discard") return { ...s, history, hands, skat: m, phase: "declare" };
      const sch = s.schieben!;
      return advanceSchieben({
        ...s,
        history,
        hands,
        skat: m,
        schieben: { ...sch, holding: false, passed: set3(sch.passed, seat, m) },
      });
    }
    case "shove": {
      const sch = s.schieben!;
      return advanceSchieben({
        ...s,
        history,
        schieben: { ...sch, shoves: sch.shoves + 1, choice: set3(sch.choice, seat, false) },
      });
    }
    case "declare":
      return startPlay({ ...s, history, declaration: normalizeDeclaration(a.declaration) });
    case "kontra":
      return { ...s, history, undo: null, kontra: 1, kontraBy: seat, phase: "re" };
    case "re":
      return { ...s, history, kontra: 2, phase: "play" };
    case "noRe":
      return { ...s, history, phase: "play" };
    case "play":
      return applyPlay(s, a.card, history);
  }
}

function toDeclarer(s: GameState, declarer: Seat, bid: number): GameState {
  return { ...s, declarer, bid, phase: "skat" };
}

function applyPass(s: GameState, seat: Seat, history: Action[]): GameState {
  const b = s.bidding;
  const passed = set3(b.passed, seat, true);
  const rh = s.dealer;
  if (b.stage === 1) {
    const survivor = seat === b.asker ? b.listener : b.asker;
    const holder = seat === b.asker ? b.holder : b.asker;
    return {
      ...s,
      history,
      bidding: { stage: 2, asker: rh, listener: survivor, waiting: "asker", value: b.value, holder, passed },
    };
  }
  if (b.stage === 2) {
    if (seat === b.asker) {
      if (b.value > 0) return toDeclarer({ ...s, history, bidding: { ...b, passed } }, b.listener, b.value);
      return {
        ...s,
        history,
        bidding: { stage: 3, asker: s.forehand, listener: s.forehand, waiting: "listener", value: 0, holder: null, passed },
      };
    }
    return toDeclarer({ ...s, history, bidding: { ...b, passed } }, b.asker, b.value);
  }
  // Stage 3: Vorhand passes too → nobody plays.
  const t: GameState = { ...s, history, bidding: { ...b, passed } };
  switch (s.rules.allPass) {
    case "passed":
      return { ...t, phase: "done", result: passedResult(t) };
    case "ramsch":
      return startPlay(t);
    case "schieberamsch":
      return {
        ...t,
        phase: "schieben",
        schieben: { step: 0, holding: false, shoves: 0, choice: [null, null, null], passed: [0, 0, 0] },
      };
  }
}

function advanceSchieben(s: GameState): GameState {
  const sch = s.schieben!;
  if (sch.step === 2) return startPlay({ ...s, schieben: { ...sch, holding: false } });
  return { ...s, schieben: { ...sch, step: (sch.step + 1) as HandPosition, holding: false } };
}

function startPlay(s: GameState): GameState {
  return {
    ...s,
    phase: "play",
    playHands: [s.hands[0], s.hands[1], s.hands[2]],
    turn: s.forehand,
    trickLeader: s.forehand,
    trick: [],
  };
}

function applyPlay(s: GameState, card: Card, history: Action[]): GameState {
  const seat = s.turn;
  const hands = set3(s.hands, seat, s.hands[seat] & ~bit(card));
  const trick = [...s.trick, card];
  const played = s.played | bit(card);
  const undo: GameState = { ...s, undo: null };
  if (trick.length < 3) return { ...s, history, hands, trick, played, turn: nextSeat(seat), undo };
  const r = rulesOf(s)!;
  const winner = ((s.trickLeader + trickWinner(r, trick[0], trick[1], trick[2])) % 3) as Seat;
  const pts = trickPoints(trick[0], trick[1], trick[2]);
  const rec: TrickRecord = { leader: s.trickLeader, cards: [trick[0], trick[1], trick[2]], winner, points: pts };
  const next: GameState = {
    ...s,
    history,
    hands,
    trick: [],
    played,
    tricks: [...s.tricks, rec],
    points: set3(s.points, winner, s.points[winner] + pts),
    trickCounts: set3(s.trickCounts, winner, s.trickCounts[winner] + 1),
    trickLeader: winner,
    turn: winner,
    undo,
  };
  const nullLost = r.isNull && winner === s.declarer;
  if (next.tricks.length === 10 || nullLost) return { ...next, phase: "done", result: finalResult(next, nullLost) };
  return next;
}

// ─── Results ──────────────────────────────────────────────────────────────────────────────────────────────

function emptyResult(s: GameState): GameResult {
  return {
    type: "passed",
    declarer: null,
    declaration: null,
    bid: 0,
    won: false,
    points: [0, 0, 0],
    tricks: [0, 0, 0],
    declarerPoints: 0,
    matadors: null,
    base: 0,
    multiplier: 0,
    levels: null,
    value: 0,
    overbid: false,
    reason: null,
    schneider: false,
    schwarz: false,
    kontra: 0,
    factor: 1,
    written: 0,
    list: [0, 0, 0],
    skat: s.skat,
    earlyEnd: false,
    ramsch: null,
  };
}

function passedResult(s: GameState): GameResult {
  return emptyResult(s);
}

function finalResult(s: GameState, earlyEnd: boolean): GameResult {
  const bock = s.rules.bock ? 2 : 1;
  const skatPoints = pointsOf(s.skat);
  if (s.declarer === null) {
    const last = s.tricks[s.tricks.length - 1].winner;
    const points = set3(s.points, last, s.points[last] + skatPoints);
    const shoves = s.schieben?.shoves ?? 0;
    const rs = settleRamsch({ points, tricks: s.trickCounts, shoves, bock: s.rules.bock });
    return {
      ...emptyResult(s),
      type: "ramsch",
      won: rs.durchmarsch !== null,
      points,
      tricks: [...s.trickCounts],
      value: rs.points,
      factor: rs.factor,
      written: rs.written,
      list: rs.list,
      ramsch: { losers: rs.losers, jungfrau: rs.jungfrau, durchmarsch: rs.durchmarsch, shoves },
    };
  }
  const decl = s.declarer;
  const d = s.declaration!;
  const points = set3(s.points, decl, s.points[decl] + skatPoints);
  const declarerTricks = s.trickCounts[decl];
  const defenderTricks = s.trickCounts[0] + s.trickCounts[1] + s.trickCounts[2] - declarerTricks;
  const st = settle({
    declaration: d,
    declarerCards: s.playHands[decl] | s.skat,
    bid: s.bid,
    declarerPoints: points[decl],
    declarerTricks,
    defenderTricks,
  });
  const factor = (s.kontra === 2 ? 4 : s.kontra === 1 ? 2 : 1) * bock;
  const written = st.written * factor;
  return {
    ...emptyResult(s),
    type: "declared",
    declarer: decl,
    declaration: d,
    bid: s.bid,
    won: st.won,
    points,
    tricks: [...s.trickCounts],
    declarerPoints: points[decl],
    matadors: st.matadors,
    base: st.base,
    multiplier: st.multiplier,
    levels: st.levels,
    value: st.value,
    overbid: st.overbid,
    reason: st.reason,
    schneider: st.schneider,
    schwarz: st.schwarz,
    kontra: s.kontra,
    factor,
    written,
    list: seegerFabian(decl, st.won, written),
    earlyEnd,
  };
}

// ─── Helpers for solvers and tests ────────────────────────────────────────────────────────────────────────

/** A fast `Position` for the current play state with all cards known (problems, tests; not for the AI's own view). */
export function positionFromState(s: GameState): Position {
  const r = rulesOf(s);
  if (!r || (s.phase !== "play" && s.phase !== "re")) throw new Error("not in play");
  return new Position(r, s.hands, s.trickLeader, s.declarer ?? -1, {
    trick: s.trick,
    points: s.points,
    tricks: s.trickCounts,
    played: s.played,
  });
}

/** Replay a list of actions from a setup (determinism checks, saved games). */
export function replay(setup: GameSetup, actions: readonly Action[]): GameState {
  let s = newGame(setup);
  for (const a of actions) s = applyAction(s, a);
  return s;
}
