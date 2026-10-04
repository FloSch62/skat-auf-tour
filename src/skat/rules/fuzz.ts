// Invariant fuzzer (contract §5.2): random legal games — random bidding, Hand/announcements/ouvert, discards, Kontra/Re,
// Ramsch/Schieberamsch, take-backs and peeks — checked against independent, deliberately naive re-implementations
// (suit/rank names instead of masks) and against the fast `Position`. Used by `fuzz.test.ts` (fast) and by
// `tools/balance/random-games.ts` (one million games).
import { Rng } from "../../core/rng.ts";
import type { HouseRuleId, RankId, SuitId } from "../../game/ids.ts";
import type { RoundConfig, RoundProgress } from "../../game/types.ts";
import { ALL_CARDS, bit, cardSprite, cardsOf, pointsOf, popcount } from "./cards.ts";
import type { Card } from "./cards.ts";
import { deal } from "./deal.ts";
import type { Seat } from "./deal.ts";
import { applyAction, currentSeat, legalActions, legalCards, playKindOf, positionFromState } from "./game.ts";
import type { Action, GameState } from "./game.ts";
import { Position } from "./play.ts";
import { finishGame, startGame, startRound } from "./round.ts";
import { sampleWorld, viewFor, voidMasks } from "./view.ts";
import { BID_VALUES } from "./value.ts";
import type { Declaration } from "./value.ts";

export interface FuzzOptions {
  games: number;
  seed?: number;
  /** Called every 10 000 games. */
  onProgress?: (done: number, report: FuzzReport) => void;
  /** Stop collecting after this many errors (default 20). */
  maxErrors?: number;
}

export interface FuzzReport {
  games: number;
  /** Individual invariant checks performed. */
  checks: number;
  errors: string[];
  passed: number;
  ramsch: number;
  schieberamsch: number;
  durchmarsch: number;
  jungfrau: number;
  declared: number;
  won: number;
  overbid: number;
  hand: number;
  ouvert: number;
  schneiderAnnounced: number;
  schwarzAnnounced: number;
  schneider: number;
  schwarz: number;
  nullEarly: number;
  kontra: number;
  re: number;
  takeBacks: number;
  peeks: number;
  byKind: Record<string, number>;
  maxBid: number;
  maxWritten: number;
  minWritten: number;
  ms: number;
}

const HOUSE_RULES: HouseRuleId[] = ["standard", "ramsch", "schieberamsch", "kontra", "bock", "grand-evening", "kitty"];

// ─── Naive reference rules (names, not masks) ─────────────────────────────────────────────────────────────

const SUIT_GAME_ORDER: RankId[] = ["7", "8", "9", "queen", "king", "10", "ace"];
const NULL_ORDER: RankId[] = ["7", "8", "9", "10", "jack", "queen", "king", "ace"];
const JACK_ORDER: SuitId[] = ["diamonds", "hearts", "spades", "clubs"];
const BASE: Record<string, number> = { diamonds: 9, hearts: 10, spades: 11, clubs: 12, grand: 24 };
const NULLV = (d: Declaration) => (d.ouvert ? (d.hand ? 59 : 46) : d.hand ? 35 : 23);
const AUGEN: Record<RankId, number> = { "7": 0, "8": 0, "9": 0, "10": 10, jack: 2, queen: 3, king: 4, ace: 11 };

function naiveTrump(c: Card, kind: string): boolean {
  const { suit, rank } = cardSprite(c);
  if (kind === "null") return false;
  if (rank === "jack") return true;
  return suit === kind;
}

function naiveClass(c: Card, kind: string): string {
  return naiveTrump(c, kind) ? "trump" : cardSprite(c).suit;
}

function naiveLegal(hand: Card[], led: Card, kind: string): Card[] {
  if (led < 0) return hand;
  const cls = naiveClass(led, kind);
  const f = hand.filter((c) => naiveClass(c, kind) === cls);
  return f.length ? f : hand;
}

function naiveStrength(c: Card, kind: string, ledClass: string): number {
  const { suit, rank } = cardSprite(c);
  if (kind === "null") return suit === ledClass ? 100 + NULL_ORDER.indexOf(rank) : 0;
  if (naiveTrump(c, kind)) return rank === "jack" ? 300 + JACK_ORDER.indexOf(suit) : 200 + SUIT_GAME_ORDER.indexOf(rank);
  return suit === ledClass ? 100 + SUIT_GAME_ORDER.indexOf(rank) : 0;
}

function naiveWinner(cards: Card[], kind: string): number {
  const ledClass = naiveClass(cards[0], kind);
  let best = 0;
  for (let i = 1; i < 3; i++) if (naiveStrength(cards[i], kind, ledClass) > naiveStrength(cards[best], kind, ledClass)) best = i;
  return best;
}

function naiveMatadors(cards12: Card[], kind: string): { count: number; mit: boolean } {
  const names = new Set(cards12.map((c) => `${cardSprite(c).suit}/${cardSprite(c).rank}`));
  const order = ["clubs/jack", "spades/jack", "hearts/jack", "diamonds/jack"];
  if (kind !== "grand") for (const r of ["ace", "10", "king", "queen", "9", "8", "7"]) order.push(`${kind}/${r}`);
  const mit = names.has(order[0]);
  let n = 0;
  while (n < order.length && names.has(order[n]) === mit) n++;
  return { count: n, mit };
}

/** ISkO 5.2–5.4 written out once more, independently of value.ts. */
function naiveSettle(
  d: Declaration,
  cards12: Card[],
  bid: number,
  declPts: number,
  declTricks: number,
  defTricks: number,
): { won: boolean; value: number; overbid: boolean } {
  if (d.kind === "null") {
    const v = NULLV(d);
    return { won: declTricks === 0, value: v, overbid: v < bid };
  }
  const base = BASE[d.kind];
  const m = naiveMatadors(cards12, d.kind).count;
  const ouvert = d.ouvert;
  const annSchwarz = d.schwarzAnnounced || ouvert;
  const annSchneider = d.schneiderAnnounced || annSchwarz;
  const defPts = 120 - declPts;
  let onCards = declPts >= 61;
  if (annSchneider && defPts > 30) onCards = false;
  if (annSchwarz && defTricks > 0) onCards = false;
  let cases = m + 1;
  if (d.hand) cases++;
  const schneider = annSchneider || (onCards ? defPts <= 30 : declPts <= 30);
  const schwarz = annSchwarz || (onCards ? defTricks === 0 : declTricks === 0);
  if (schneider) cases++;
  if (annSchneider) cases++;
  if (schwarz) cases++;
  if (annSchwarz) cases++;
  if (ouvert) cases++;
  let value = base * cases;
  const overbid = value < bid;
  if (overbid) {
    let k = 1;
    while (base * k < bid) k++;
    value = base * k;
  }
  return { won: onCards && !overbid, value, overbid };
}

// ─── Random agent ─────────────────────────────────────────────────────────────────────────────────────────

function pickBid(s: GameState, acts: Action[], rng: Rng): Action {
  const bids = acts.filter((a) => a.type === "bid") as Extract<Action, { type: "bid" }>[];
  const value = s.bidding.value;
  const passP = Math.min(0.95, 0.3 + value / 300);
  if (!bids.length || rng.chance(passP)) return acts.find((a) => a.type === "pass")!;
  if (rng.chance(0.7)) return bids[0];
  return bids[Math.min(bids.length - 1, rng.int(0, rng.chance(0.1) ? bids.length - 1 : 8))];
}

function weightDecl(d: Declaration): number {
  if (d.kind === "null") return d.ouvert ? 2 : 4;
  if (d.ouvert) return 1;
  if (d.schwarzAnnounced) return 1.5;
  if (d.schneiderAnnounced) return 2;
  return d.kind === "grand" ? 5 : 6;
}

function randomAction(s: GameState, rng: Rng, passive: boolean): Action {
  const seat = currentSeat(s)!;
  // Perks of seat 0 (out of turn) now and then.
  const extras = legalActions(s, 0).filter((a) => a.type === "peek" || a.type === "takeBack");
  if (extras.length && rng.chance(0.15)) return rng.pick(extras);
  const acts = legalActions(s, seat).filter((a) => a.type !== "peek" && a.type !== "takeBack");
  switch (s.phase) {
    case "bidding": {
      const b = s.bidding;
      if (passive) return acts.find((a) => a.type === "pass")!;
      if (b.stage !== 3 && b.waiting === "asker") return pickBid(s, acts, rng);
      return rng.chance(b.stage === 3 ? 0.5 : 0.6) ? acts.find((a) => a.type === "hold")! : acts.find((a) => a.type === "pass")!;
    }
    case "skat": {
      if (rng.chance(0.72)) return acts.find((a) => a.type === "pickUp")!;
      const decls = acts.filter((a) => a.type === "declare") as Extract<Action, { type: "declare" }>[];
      return rng.weighted(decls, (a) => weightDecl(a.declaration));
    }
    case "declare": {
      const decls = acts as Extract<Action, { type: "declare" }>[];
      return rng.weighted(decls, (a) => weightDecl(a.declaration));
    }
    case "schieben": {
      if (!s.schieben!.holding) return rng.chance(0.35) ? acts.find((a) => a.type === "shove")! : acts.find((a) => a.type === "pickUp")!;
      return rng.pick(acts);
    }
    case "re":
      return rng.chance(0.4) ? acts[0] : acts[1];
    case "play": {
      const k = acts.find((a) => a.type === "kontra");
      if (k && rng.chance(0.1)) return k;
      return rng.pick(acts.filter((a) => a.type === "play"));
    }
    default:
      return rng.pick(acts);
  }
}

// ─── The fuzzer ───────────────────────────────────────────────────────────────────────────────────────────

function roundConfig(seed: number, houseRule: HouseRuleId, rng: Rng): RoundConfig {
  return {
    seed,
    opponents: ["maurer", "zocker"],
    houseRule,
    games: 3,
    tournament: false,
    title: "Fuzz",
    room: "village",
    marks: rng.int(0, 3),
    perks: {
      showTrumps: false,
      showPoints: false,
      redeals: 0,
      skatPeeks: rng.int(0, 2),
      takeBacks: rng.int(0, 2),
      forehandFirst: rng.chance(0.3),
      listBonus: { grand: 20, null: 15, hand: 15, schneider: 15, defence: 10 },
    },
    depth: 1,
  };
}

export function runRandomGames(opts: FuzzOptions): FuzzReport {
  const t0 = Date.now();
  const rng = new Rng(opts.seed ?? 1);
  const maxErrors = opts.maxErrors ?? 20;
  const R: FuzzReport = {
    games: 0, checks: 0, errors: [], passed: 0, ramsch: 0, schieberamsch: 0, durchmarsch: 0, jungfrau: 0, declared: 0,
    won: 0, overbid: 0, hand: 0, ouvert: 0, schneiderAnnounced: 0, schwarzAnnounced: 0, schneider: 0, schwarz: 0,
    nullEarly: 0, kontra: 0, re: 0, takeBacks: 0, peeks: 0, byKind: {}, maxBid: 0, maxWritten: 0, minWritten: 0, ms: 0,
  };
  let gameNo = 0;
  const fail = (msg: string) => {
    if (R.errors.length < maxErrors) R.errors.push(`game ${gameNo}: ${msg}`);
  };
  const check = (ok: boolean, msg: string) => {
    R.checks++;
    if (!ok) fail(msg);
  };

  let progress: RoundProgress | null = null;
  while (R.games < opts.games && R.errors.length < maxErrors) {
    if (!progress || progress.games.length >= progress.config.games) {
      const rule = rng.pick(HOUSE_RULES);
      progress = startRound(roundConfig(rng.int(0, 2 ** 31), rule, rng));
    }
    gameNo = R.games;
    let s: GameState;
    try {
      s = startGame(progress);
      playOne();
    } catch (e) {
      fail(`exception ${(e as Error).stack ?? e}`);
      progress = null;
    }
    R.games++;
    if (opts.onProgress && R.games % 10000 === 0) opts.onProgress(R.games, R);

    function playOne() {
      // Deal invariants.
      const all = s.hands[0] | s.hands[1] | s.hands[2] | s.skat;
      check(all === ALL_CARDS, "deal does not cover 32 cards");
      check(s.hands.every((h) => popcount(h) === 10) && popcount(s.skat) === 2, "deal not 10/10/10/2");
      check(
        popcount(s.hands[0]) + popcount(s.hands[1]) + popcount(s.hands[2]) + popcount(s.skat) === 32,
        "deal overlaps",
      );
      if (gameNo % 97 === 0) {
        const again = deal(s.seed, s.dealer);
        check(again.hands.every((h, i) => h === s.hands[i]), "same seed gave another deal");
      }
      let lastBid = 0;
      let pos: Position | null = null;
      const passive = rng.chance(0.15);
      let steps = 0;
      while (s.phase !== "done") {
        if (++steps > 500) throw new Error("game does not end");
        const a = randomAction(s, rng, passive);
        if (a.type === "bid") {
          check(BID_VALUES.includes(a.value) && a.value > lastBid, `bid ${a.value} after ${lastBid}`);
          lastBid = a.value;
          R.maxBid = Math.max(R.maxBid, a.value);
        }
        if (a.type === "play") {
          const kind = playKindOf(s)!;
          const hand = cardsOf(s.hands[a.seat]);
          const naive = naiveLegal(hand, s.trick.length ? s.trick[0] : -1, kind);
          check(naive.includes(a.card), `naive rules reject ${a.card}`);
          let naiveMask = 0;
          for (const c of naive) naiveMask |= bit(c);
          check(naiveMask === legalCards(s), "legal cards differ from naive rules");
          if (!pos) pos = positionFromState(s);
          check(pos.legal() === legalCards(s), "Position legal() differs");
          check(pos.turn === s.turn, "Position turn differs");
        }
        if (a.type === "takeBack") R.takeBacks++;
        if (a.type === "peek") R.peeks++;
        const prevPhase = s.phase;
        const next = applyAction(s, a);
        if (a.type === "play" && pos) {
          pos.play(a.card);
          if (next.tricks.length > s.tricks.length) {
            const t = next.tricks[next.tricks.length - 1];
            const w = (t.leader + naiveWinner(t.cards, playKindOf(s)!)) % 3;
            check(w === t.winner, `trick winner ${t.winner} vs naive ${w}`);
            check(t.points === t.cards.reduce((x, c) => x + AUGEN[cardSprite(c).rank], 0), "trick points");
          }
        }
        if (a.type === "takeBack" && pos) {
          pos.undo();
          check(pos.legal() === legalCards(next), "Position after undo differs");
        }
        if (prevPhase !== "play" && prevPhase !== "re" && next.phase === "play") {
          // Start of play: 10 cards each, skat 2, all 32 cards.
          check(next.hands.every((h) => popcount(h) === 10), "not 10 cards each at play start");
          check((next.hands[0] | next.hands[1] | next.hands[2] | next.skat) === ALL_CARDS, "cards lost before play");
          check(popcount(next.skat) === 2, "skat not 2 cards at play start");
          if (next.declaration?.hand) check(next.skat === (bit(next.dealtSkat[0]) | bit(next.dealtSkat[1])), "Hand game skat changed");
          if (next.declarer === null && next.schieben) {
            for (const seat of [0, 1, 2] as Seat[]) check((next.schieben.passed[seat] & (0xf << 28)) === 0, "jack pushed");
          }
        }
        s = next;
        // Information sets: real hands never hold cards a seat showed void in; sampled worlds fit the view.
        if (s.phase === "play" && gameNo % 7 === 0 && s.tricks.length > 0) {
          for (const viewer of [0, 1, 2] as Seat[]) {
            const v = viewFor(s, viewer);
            const voids = voidMasks(v);
            for (const seat of [0, 1, 2] as Seat[]) check((s.hands[seat] & voids[seat]) === 0, "void inference wrong");
            if (viewer !== s.declarer) check(v.skat === null || s.declarer === null, "defender sees the skat");
            const w = sampleWorld(v, rng);
            check(w !== null, "no world sampled");
            if (w) {
              check(w.hands[viewer] === s.hands[viewer], "sample changed own hand");
              for (const seat of [0, 1, 2] as Seat[]) check(popcount(w.hands[seat]) === popcount(s.hands[seat]), "sample hand size");
              check((w.hands[0] | w.hands[1] | w.hands[2] | w.skat | s.played) === ALL_CARDS, "sample misses cards");
              check(popcount(w.hands[0]) + popcount(w.hands[1]) + popcount(w.hands[2]) + popcount(w.skat) + popcount(s.played) === 32, "sample overlaps");
              for (const seat of [0, 1, 2] as Seat[]) check((w.hands[seat] & voids[seat]) === 0, "sample breaks voids");
            }
          }
        }
      }
      checkResult(s, pos);
      const fin = finishGame(progress!, s);
      const rec = fin.record;
      const sum = (l: readonly number[]) => l[0] + l[1] + l[2];
      check(sum(fin.progress.list) === sum(progress!.list) + sum(rec.list), "round list sum");
      check(rec.value === s.result!.written, "record value");
      progress = fin.progress;
    }
  }
  R.ms = Date.now() - t0;
  return R;

  function checkResult(s: GameState, pos: Position | null) {
    const r = s.result!;
    if (r.type === "passed") {
      R.passed++;
      check(r.list.every((x) => x === 0), "passed game scores");
      return;
    }
    if (pos) {
      check(pos.isOver(), "Position not over");
      for (const seat of [0, 1, 2]) check(pos.tricks[seat] === s.trickCounts[seat], "Position tricks differ");
      for (const seat of [0, 1, 2]) check(pos.points[seat] === s.points[seat], "Position points differ");
    }
    R.maxWritten = Math.max(R.maxWritten, r.written);
    R.minWritten = Math.min(R.minWritten, r.written);
    if (r.type === "ramsch") {
      R.ramsch++;
      if (r.ramsch!.shoves > 0 || s.schieben) R.schieberamsch++;
      if (r.ramsch!.durchmarsch !== null) R.durchmarsch++;
      if (r.ramsch!.jungfrau.length && r.ramsch!.durchmarsch === null) R.jungfrau++;
      check(r.points[0] + r.points[1] + r.points[2] === 120, "Ramsch points not 120");
      check(r.tricks[0] + r.tricks[1] + r.tricks[2] === 10, "Ramsch tricks not 10");
      const max = Math.max(...r.points);
      if (r.ramsch!.durchmarsch === null) {
        const losers = ([0, 1, 2] as Seat[]).filter((x) => r.points[x] === max);
        if (losers.length < 3) {
          const f = 2 ** r.ramsch!.jungfrau.length * 2 ** r.ramsch!.shoves * (s.rules.bock ? 2 : 1);
          for (const x of [0, 1, 2] as Seat[]) check(r.list[x] === (losers.includes(x) ? -max * f : 0), "Ramsch list");
        }
      } else {
        check(r.tricks[r.ramsch!.durchmarsch] === 10, "Durchmarsch without all tricks");
      }
      return;
    }
    R.declared++;
    const d = r.declaration!;
    R.byKind[d.kind] = (R.byKind[d.kind] ?? 0) + 1;
    if (r.won) R.won++;
    if (r.overbid) R.overbid++;
    if (d.hand) R.hand++;
    if (d.ouvert) R.ouvert++;
    if (d.schneiderAnnounced) R.schneiderAnnounced++;
    if (d.schwarzAnnounced) R.schwarzAnnounced++;
    if (r.schneider) R.schneider++;
    if (r.schwarz) R.schwarz++;
    if (r.kontra >= 1) R.kontra++;
    if (r.kontra === 2) R.re++;
    const decl = r.declarer!;
    if (r.earlyEnd) {
      R.nullEarly++;
      check(d.kind === "null" && r.tricks[decl] === 1, "early end only at the Null declarer's first trick");
    } else {
      check(r.points[0] + r.points[1] + r.points[2] === 120, "points not 120");
      check(r.tricks[0] + r.tricks[1] + r.tricks[2] === 10, "tricks not 10");
    }
    check(r.declarerPoints === s.points[decl] + pointsOf(s.skat), "declarer points incl. skat");
    const cards12 = s.playHands[decl] | s.skat;
    check(popcount(cards12) === 12, "declarer does not have 12 cards with the skat");
    const n = naiveSettle(d, cardsOf(cards12), r.bid, r.declarerPoints, r.tricks[decl], s.tricks.length - r.tricks[decl]);
    check(n.won === r.won, `won ${r.won} vs naive ${n.won} (${JSON.stringify(d)})`);
    check(n.value === r.value, `value ${r.value} vs naive ${n.value} (${JSON.stringify(d)}, bid ${r.bid})`);
    check(n.overbid === r.overbid, "overbid differs from naive");
    if (r.won) check(r.value >= r.bid, "won below the bid");
    if (r.overbid) {
      check(!r.won && r.value >= r.bid && r.value - r.base < r.bid, "overbid value is not the smallest multiple");
    }
    if (d.kind === "null") check([23, 35, 46, 59].includes(r.value) && r.value >= r.bid, "Null value/bid");
    else check(r.value % r.base === 0 && (r.overbid || BID_VALUES.includes(r.value)), "value not a game value");
    const f = (r.kontra === 2 ? 4 : r.kontra === 1 ? 2 : 1) * (s.rules.bock ? 2 : 1);
    check(r.written === (r.won ? r.value : -2 * r.value) * f, "written value");
    for (const x of [0, 1, 2] as Seat[]) {
      const want = x === decl ? r.written + (r.won ? 50 : -50) : r.won ? 0 : 40;
      check(r.list[x] === want, "Seeger-Fabian list");
    }
  }
}
