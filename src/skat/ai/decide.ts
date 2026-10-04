// The computer opponent's decision for one AiRequest (pure and synchronous; the worker and the in-thread fallback both
// call this). Only `req.view` (a SeatView) is used — the AI never sees hidden cards (contract §0.3).
import { Rng, hashString } from "../../core/rng.ts";
import { pointsOf, popcount } from "../rules/cards.ts";
import { playRules } from "../rules/play.ts";
import type { Card } from "../rules/cards.ts";
import { positionOf } from "../rules/deal.ts";
import type { Action } from "../rules/game.ts";
import { declarationError, nextBid, sameDeclaration } from "../rules/value.ts";
import type { Declaration } from "../rules/value.ts";
import type { SeatView } from "../rules/view.ts";
import type { AiRequest } from "./api.ts";
import { VALUATION_SLACK, bestHandGame, bidLimit, handValuation, pickupEV } from "./bid.ts";
import { declareFor, planDiscard } from "./discard.ts";
import { heuristicScores, readTable } from "./heuristics.ts";
import { bidFacts } from "./knowledge.ts";
import { personaFor, scaleBid, scalePlay } from "./persona.ts";
import type { Persona, PlayStyle } from "./persona.ts";
import { chooseCard, declarerWinChance } from "./pimc.ts";
import { durchmarschCard, schiebenAction } from "./ramsch.ts";

export interface Decision {
  action: Action;
  /** Short English note for logs and tools (never shown to the player). */
  note?: string;
  /**
   * What the AI expects, for table talk (contract §4.5 speech situations such as "blunder" / "robbed"): the declarer's
   * win chance as this seat sees it after this decision (0…1), when the decision computed one.
   */
  insight?: { declarerWins: number };
}

function legalOnly(v: SeatView): Action[] {
  return v.legal.filter((a) => a.type !== "peek" && a.type !== "takeBack");
}

function isLegalAction(v: SeatView, a: Action): boolean {
  return v.legal.some((b) => JSON.stringify(b) === JSON.stringify(a));
}

/** Decide one action. Always returns an action from `req.view.legal`. */
export function decide(req: AiRequest): Action {
  return decideWithNote(req).action;
}

export function decideWithNote(req: AiRequest): Decision {
  const v = req.view;
  const legal = legalOnly(v);
  if (!legal.length) throw new Error("AI asked without a legal action");
  if (legal.length === 1) return { action: legal[0] };
  const persona = personaFor(req.character);
  let d: Decision;
  switch (v.phase) {
    case "bidding":
      d = bidding(v, persona, req.depth);
      break;
    case "skat":
      d = skat(v, persona, req.depth);
      break;
    case "discard":
      d = discard(v, persona);
      break;
    case "declare":
      d = declare(v, persona);
      break;
    case "schieben":
      d = { action: schiebenAction(v, persona.shove) };
      break;
    case "re": {
      const chance = declarerWinChance(v, scalePlay(persona.declarer, req.depth), new Rng(req.seed), VALUATION_SLACK);
      d = { action: { type: chance >= persona.re ? "re" : "noRe", seat: v.seat }, note: `win ${chance.toFixed(2)}`, insight: { declarerWins: chance } };
      break;
    }
    case "play":
      d = play(v, persona, req.depth, req.seed);
      break;
    default:
      d = { action: legal[0] };
  }
  if (!isLegalAction(v, d.action)) return { action: legal[0], note: `fallback (illegal ${d.action.type})` };
  return d;
}

// ─── Bidding ──────────────────────────────────────────────────────────────────────────────────────────────

function bidding(v: SeatView, persona: Persona, depth: number): Decision {
  const pos = positionOf(v.seat, v.dealer);
  const style = scaleBid(persona.bid, depth);
  const val = handValuation(v.hand, pos, style);
  const limit = bidLimit(val, style, v.dealer * 7 + pos);
  const b = v.bidding;
  const seat = v.seat;
  if (b.stage === 3) return { action: { type: limit >= 18 ? "hold" : "pass", seat }, note: `limit ${limit}` };
  if (b.waiting === "asker") {
    const nb = nextBid(b.value);
    if (nb !== null && nb <= limit) return { action: { type: "bid", seat, value: nb }, note: `limit ${limit}` };
    return { action: { type: "pass", seat }, note: `limit ${limit}` };
  }
  return { action: { type: b.value <= limit ? "hold" : "pass", seat }, note: `limit ${limit}` };
}

// ─── Hand or skat ─────────────────────────────────────────────────────────────────────────────────────────

function skat(v: SeatView, persona: Persona, depth: number): Decision {
  const pos = positionOf(v.seat, v.dealer);
  const style = scaleBid(persona.bid, depth);
  const val = handValuation(v.hand, pos, style);
  const pick = pickupEV(val, v.bid);
  const pickBest = pick.reduce((m, x) => Math.max(m, x.ev), -Infinity);
  const bestChance = pick.reduce((m, x) => Math.max(m, x.chance), 0);
  const pickUp: Action = { type: "pickUp", seat: v.seat };
  // A Hand game is only worth a look with a strong hand (or a promising Null).
  if (bestChance >= 0.6 || pick.some((x) => x.kind === "null" && x.chance >= 0.5)) {
    const hg = bestHandGame(v.hand, pos, v.bid, style, Math.max(8, style.samples));
    if (hg && hg.ev > Math.max(pickBest, -400) + style.handMargin) {
      const a: Action = { type: "declare", seat: v.seat, declaration: hg.declaration };
      if (declarationError(hg.declaration, { skatTaken: false, bid: v.bid }) === null)
        return { action: a, note: `hand ev ${hg.ev.toFixed(0)} vs pickup ${pickBest.toFixed(0)}`, insight: { declarerWins: hg.chance } };
    }
  }
  return { action: pickUp, note: `pickup ev ${pickBest.toFixed(0)}` };
}

// ─── Discard and declare ──────────────────────────────────────────────────────────────────────────────────

function discardFacts(v: SeatView) {
  return { bids: bidFacts(v), dealer: v.dealer };
}

function discard(v: SeatView, persona: Persona): Decision {
  const pos = positionOf(v.seat, v.dealer);
  const plan = planDiscard(v.hand, v.bid, pos, persona.discard, discardFacts(v), persona.id);
  return {
    action: { type: "discard", seat: v.seat, cards: plan.pair },
    note: `${plan.declaration.kind} ev ${plan.ev.toFixed(0)} chance ${plan.chance.toFixed(2)}`,
    insight: { declarerWins: plan.chance },
  };
}

function declare(v: SeatView, persona: Persona): Decision {
  const pos = positionOf(v.seat, v.dealer);
  const skatMask = v.skat ?? 0;
  const cards12 = v.hand | skatMask;
  const plan = planDiscard(cards12, v.bid, pos, persona.discard, discardFacts(v), persona.id);
  const planned = (1 << plan.pair[0]) | (1 << plan.pair[1]);
  let d: Declaration = planned === skatMask ? plan.declaration : declareFor(v.hand, skatMask, v.bid, pos, persona.discard, persona.id);
  if (declarationError(d, { skatTaken: true, bid: v.bid }) !== null) {
    // E.g. a Null below the bid: take the best legal alternative from the plan.
    const alt = plan.results.find((r) => r.kind !== "null");
    d = { kind: alt?.kind ?? "grand", hand: false, schneiderAnnounced: false, schwarzAnnounced: false, ouvert: false };
  }
  const options = v.legal.filter((a): a is Extract<Action, { type: "declare" }> => a.type === "declare");
  const match = options.find((a) => sameDeclaration(a.declaration, d));
  return { action: match ?? options[0], note: `declare ${d.kind}` };
}

// ─── Card play ────────────────────────────────────────────────────────────────────────────────────────────

function styleFor(v: SeatView, persona: Persona, depth: number): PlayStyle {
  const base = v.declarer === null ? persona.ramsch : v.declarer === v.seat ? persona.declarer : persona.defender;
  return scalePlay(base, depth);
}

function play(v: SeatView, persona: Persona, depth: number, seed: number): Decision {
  const style = styleFor(v, persona, depth);
  const kontra = v.legal.find((a) => a.type === "kontra");
  // Kontra needs a defensive hand (three trumps in a suit game, two jacks in Grand) and a declarer who looks hopeless
  // in practically every world — measured, the defenders' estimate is far too gloomy for the declarer (notes-ai.md).
  const trumpsInHand = v.kind && v.kind !== "null" ? popcount(v.hand & playRules(v.kind).trumps) : 3;
  if (kontra && trumpsInHand >= (v.kind === "grand" ? 2 : 3)) {
    const sharp = { ...style, samples: style.samples * 2, pool: Math.max(4, style.pool * 2) };
    const chance = declarerWinChance(v, sharp, new Rng(seed ^ 0x6b6f6e), VALUATION_SLACK);
    if (chance < persona.kontra) return { action: kontra, note: `kontra, declarer chance ${chance.toFixed(2)}`, insight: { declarerWins: chance } };
  }
  const legal: Card[] = [];
  for (const a of v.legal) if (a.type === "play") legal.push(a.card);
  if (legal.length === 1) return { action: { type: "play", seat: v.seat, card: legal[0] } };
  if (v.declarer === null) {
    const dm = durchmarschCard(v, legal, style, seed);
    if (dm !== null) return { action: { type: "play", seat: v.seat, card: dm }, note: "durchmarsch" };
  }
  // Quirk of beginners: smear on the partner's card although the declarer may still take the trick.
  if (persona.smearEarly > 0 && v.declarer !== null && v.declarer !== v.seat && v.trick.length === 1) {
    const partnerLed = v.trickLeader !== v.declarer;
    const rng = new Rng(hashString(`smear/${seed}`));
    if (partnerLed && rng.next() < persona.smearEarly) {
      const t = readTable(v);
      const scores = heuristicScores(v, legal, t);
      const fat = legal.filter((c) => pointsOf(1 << c) >= 10 && (t.r.classOf[c] === t.r.classOf[v.trick[0]] || t.r.classOf[c] !== 4));
      if (fat.length) {
        fat.sort((a, b) => pointsOf(1 << b) - pointsOf(1 << a) || scores[legal.indexOf(b)] - scores[legal.indexOf(a)]);
        return { action: { type: "play", seat: v.seat, card: fat[0] }, note: "smears early" };
      }
    }
  }
  const res = chooseCard(v, legal, style, { errorRate: style.errorRate, errorTolerance: style.errorTolerance }, seed);
  const top = res.evals[0];
  const isRamsch = v.declarer === null;
  return {
    action: { type: "play", seat: v.seat, card: res.card },
    note: top ? `u ${top.utility.toFixed(1)} p ${top.declarerWins.toFixed(2)}` : undefined,
    insight: top && !isRamsch && top.weight > 0 ? { declarerWins: top.declarerWins } : undefined,
  };
}
