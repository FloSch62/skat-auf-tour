// German explanations for generated Stammtisch problems (contract §4.7): short, in Skat words, and always true — the
// facts come from the open-card solver (principal variations, final Augen after the solution and after the most
// tempting wrong card).
import { CARD_POINTS, cardsOf, maskOf, popcount } from "../../src/skat/rules/cards.ts";
import type { Card, CardMask } from "../../src/skat/rules/cards.ts";
import { cardName } from "../../src/skat/rules/names.ts";
import { beats, legalMoves, playRules, trickWinner } from "../../src/skat/rules/play.ts";
import type { PlayKind } from "../../src/skat/rules/play.ts";
import type { EndgameProblem } from "../../src/skat/problems/format.ts";
import { PointSolver, TrickSolver } from "../../src/skat/ai/dds.ts";

type Case = "nom" | "acc" | "dat";

/** "der Kreuz-Bube" / "den Kreuz-Buben" / "dem Kreuz-Buben", "die Pik-Zehn", "das Herz-Ass". */
export function art(c: Card, k: Case): string {
  const n = cardName(c);
  if (c >= 28) return k === "nom" ? `der ${n}` : `${k === "acc" ? "den" : "dem"} ${n}n`;
  const slot = c % 7;
  if (slot === 4) return `${k === "nom" ? "der" : k === "acc" ? "den" : "dem"} ${n}`; // König
  if (slot === 6) return `${k === "dat" ? "dem" : "das"} ${n}`; // Ass
  return `${k === "dat" ? "der" : "die"} ${n}`; // Dame, Zehn, Neun, Acht, Sieben
}

/** Capitalise the first letter (sentence start). */
export function cap(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export function augenWord(n: number): string {
  return n === 1 ? "ein Auge" : `${n} Augen`;
}

// ─── Principal variation ──────────────────────────────────────────────────────────────────────────────────

export interface PvStep {
  seat: number;
  card: Card;
}

interface State {
  kind: PlayKind;
  hands: number[];
  leader: number;
  trick: Card[];
  solo: number;
}

function turnOf(s: State): number {
  return (s.leader + s.trick.length) % 3;
}

function playCard(s: State, c: Card): State {
  const turn = turnOf(s);
  const hands = [...s.hands];
  hands[turn] &= ~(1 << c);
  const trick = [...s.trick, c];
  if (trick.length < 3) return { ...s, hands, trick };
  const r = playRules(s.kind);
  const w = (s.leader + trickWinner(r, trick[0], trick[1], trick[2])) % 3;
  return { ...s, hands, trick: [], leader: w };
}

const ps = new PointSolver();
const ts = new TrickSolver();

/** Best play from here (suit/Grand: Augen; Null: trick goal), `plies` cards long. */
export function principalVariation(st: State, plies: number, mode: "points" | "null"): PvStep[] {
  const out: PvStep[] = [];
  let s = st;
  for (let i = 0; i < plies; i++) {
    if (s.hands.every((h) => h === 0)) break;
    const turn = turnOf(s);
    const r = playRules(s.kind);
    const legal = cardsOf(legalMoves(r, s.hands[turn], s.trick.length ? s.trick[0] : -1));
    let best = legal[0];
    if (mode === "points") {
      ps.load({ kind: s.kind, hands: s.hands, leader: s.leader, trick: s.trick, solo: s.solo }, true);
      const vals = legal.map((c) => ps.exactAfter(c) ?? 0);
      const maxSide = turn === s.solo;
      let bi = 0;
      for (let k = 1; k < legal.length; k++) if (maxSide ? vals[k] > vals[bi] : vals[k] < vals[bi]) bi = k;
      best = legal[bi];
    } else {
      ts.load({ kind: s.kind, hands: s.hands, leader: s.leader, trick: s.trick, solo: s.solo }, "none");
      const ok = legal.map((c) => ts.testAfter(c) ?? false);
      const want = turn === s.solo;
      const k = ok.findIndex((x) => x === want);
      best = legal[k >= 0 ? k : 0];
    }
    out.push({ seat: turn, card: best });
    s = playCard(s, best);
  }
  return out;
}

// ─── Templates ────────────────────────────────────────────────────────────────────────────────────────────

export interface ExplainInput {
  p: EndgameProblem;
  /** Final declarer Augen per legal card (suit/Grand). */
  points: Map<Card, number>;
  /** The most tempting wrong card (rules of thumb), or another wrong card. */
  wrong: Card;
}

/** Who wins the current trick after `first` with best play, and with which card. */
function trickOutcome(p: EndgameProblem, first: Card): { winner: number; card: Card; pts: number } {
  const st: State = { kind: p.declaration.kind, hands: p.hands.map((h) => maskOf(h)), leader: p.leader, trick: [...p.trick], solo: p.declarer };
  const mode = p.declaration.kind === "null" ? "null" : "points";
  let s = playCard(st, first);
  const cards = [...p.trick, first];
  if (cards.length < 3) {
    const pv = principalVariation(s, 3 - cards.length, mode);
    for (const step of pv) cards.push(step.card);
  }
  const r = playRules(p.declaration.kind);
  const wi = trickWinner(r, cards[0], cards[1], cards[2]);
  return { winner: (p.leader + wi) % 3, card: cards[wi], pts: CARD_POINTS[cards[0]] + CARD_POINTS[cards[1]] + CARD_POINTS[cards[2]] };
}

function trumpsAfterTrick(p: EndgameProblem, first: Card, seats: number[]): number {
  const st: State = { kind: p.declaration.kind, hands: p.hands.map((h) => maskOf(h)), leader: p.leader, trick: [...p.trick], solo: p.declarer };
  let s = playCard(st, first);
  const need = 3 - (p.trick.length + 1);
  for (const step of principalVariation(s, need, "points")) s = playCard(s, step.card);
  const r = playRules(p.declaration.kind);
  let n = 0;
  for (const seat of seats) n += popcount(s.hands[seat] & r.trumps);
  return n;
}

export function explainEndgame({ p, points, wrong }: ExplainInput): string {
  const s = p.solution;
  const kind = p.declaration.kind;
  const r = playRules(kind);
  const me = 0;
  const isDecl = p.declarer === me;
  const partner = isDecl ? -1 : 3 - me - p.declarer;
  const lead = p.trick.length === 0;
  const out = trickOutcome(p, s);
  const outWrong = trickOutcome(p, wrong);
  const sAcc = art(s, "acc");
  const sDat = art(s, "dat");
  const wAcc = art(wrong, "acc");
  const wDat = art(wrong, "dat");
  const sents: string[] = [];

  if (kind === "null") {
    if (p.goal === "noTrick") {
      if (lead) sents.push(`Spiel ${sAcc} aus: Den Stich nimmt ein Gegner, und du kommst ohne Stich durch.`);
      else if (out.winner !== me) sents.push(`Mit ${sDat} bleibst du unter dem Stich, und deine übrigen Karten sind sicher.`);
      else sents.push(`Nur ${art(s, "nom")} hält dich stichfrei.`);
      sents.push(`Spielst du ${wAcc}, bekommst du einen Stich und das Nullspiel ist verloren.`);
    } else {
      sents.push(lead ? `Spiel ${sAcc} an: So muss der Alleinspieler einen Stich nehmen.` : `Mit ${sDat} zwingst du den Alleinspieler, einen Stich zu nehmen.`);
      sents.push(`Mit ${wDat} käme er stichfrei durch.`);
    }
    return sents.join(" ");
  }

  const ps0 = points.get(s)!;
  const pw = points.get(wrong)!;
  const defenders = isDecl ? [1, 2] : [p.declarer];
  if (isDecl) {
    const trumpLead = lead && r.classOf[s] === 4;
    const oppTrumpsBefore = defenders.reduce((n, seat) => n + popcount(maskOf(p.hands[seat]) & r.trumps), 0);
    const ruff = !lead && r.classOf[s] === 4 && r.classOf[p.trick[0]] !== 4;
    if (trumpLead && oppTrumpsBefore > 0 && trumpsAfterTrick(p, s, defenders) === 0) {
      sents.push(`Mit ${sDat} ziehst du den Gegnern ${oppTrumpsBefore === 1 ? "den letzten Trumpf" : "die letzten Trümpfe"}, danach stehen deine Karten hoch.`);
    } else if (trumpLead && out.winner === me) {
      sents.push(`Spiel ${sAcc} an und hol dir den Stich mit Trumpf.`);
    } else if (ruff && out.winner === me) {
      sents.push(`Stich mit ${sDat} ein: Das sind ${augenWord(out.pts)} für dich.`);
    } else if (out.winner === me && !lead) {
      sents.push(`Nimm den Stich mit ${sDat}: Das sind ${augenWord(out.pts)} für dich.`);
    } else if (out.winner === me && lead) {
      sents.push(`Spiel ${sAcc} an: Den Stich bekommst du${out.pts >= 10 ? `, mit ${augenWord(out.pts)}` : ""}.`);
    } else if (out.winner !== me && legalWins(p) && !lead) {
      sents.push(`Lass den Stich mit ${sDat} laufen, auch wenn du ihn nehmen könntest.`);
    } else if (out.winner !== me && lead) {
      sents.push(`Gib den Stich mit ${sDat} ab, dann müssen die Gegner ausspielen.`);
    } else if (CARD_POINTS[s] === 0) {
      sents.push(`Wirf ${sAcc} ab und halte deine Augen zurück.`);
    } else {
      sents.push(`${cap(art(s, "nom"))} ist die richtige Karte.`);
    }
    if (p.goal === "schneider") sents.push(`So kommst du auf ${ps0} Augen, und die Gegner sind Schneider. Mit ${wDat} kämen sie auf ${120 - pw} Augen.`);
    else if (p.goal === "schwarz") sents.push(`So bekommen die Gegner keinen Stich mehr. Mit ${wDat} käme noch einer durch.`);
    else sents.push(`So kommst du auf ${ps0} Augen. Mit ${wDat} bleibst du bei ${pw} und verlierst.`);
    return sents.join(" ");
  }
  // Defender.
  const partnerWins = out.winner === partner;
  const follows = !lead && r.classOf[s] === r.classOf[p.trick[0]];
  if (partnerWins && CARD_POINTS[s] >= 3 && !lead && !follows) {
    sents.push(`Schmier ${sAcc} auf den Stich deines Mitspielers.`);
  } else if (partnerWins && CARD_POINTS[s] >= 3 && !lead) {
    sents.push(`Gib deinem Mitspieler ${sAcc} in den Stich, den Stich bekommt ihr.`);
  } else if (out.winner === me && !lead && r.classOf[s] === 4 && r.classOf[p.trick[0]] !== 4) {
    sents.push(`Stich mit ${sDat} ein: Die ${augenWord(out.pts)} gehören euch.`);
  } else if (out.winner === me && !lead) {
    sents.push(`Nimm den Stich mit ${sDat}: Das sind ${augenWord(out.pts)} für euch.`);
  } else if (lead && out.winner === partner) {
    sents.push(`Spiel ${sAcc} an: Dein Mitspieler nimmt den Stich.`);
  } else if (lead && out.winner === me) {
    sents.push(`Spiel ${sAcc} an: Den Stich bekommst du.`);
  } else if (lead) {
    sents.push(`Spiel ${sAcc} an und lass den Alleinspieler stechen.`);
  } else if (partnerWins) {
    sents.push(`Dein Mitspieler hat den Stich, du gibst ${sAcc} dazu.`);
  } else if (CARD_POINTS[s] === 0) {
    sents.push(`Wirf ${sAcc} ab und halte deine Augen zurück.`);
  } else {
    sents.push(`${cap(art(s, "nom"))} ist die richtige Karte.`);
  }
  sents.push(`So bleibt der Alleinspieler bei ${ps0} Augen und verliert. Mit ${wDat} käme er auf ${pw}.`);
  return sents.join(" ");
}

/** Could the player win the current trick with some legal card? (for the "let it run" sentence) */
function legalWins(p: EndgameProblem): boolean {
  if (!p.trick.length) return false;
  const r = playRules(p.declaration.kind);
  const legal = cardsOf(legalMoves(r, maskOf(p.hands[0]), p.trick[0]));
  let w = p.trick[0];
  for (let i = 1; i < p.trick.length; i++) if (beats(r, p.trick[i], w)) w = p.trick[i];
  return legal.some((c) => beats(r, c, w));
}

export type { CardMask };
