// Stammtisch problems (contract §4.7) → public/puzzles/skat-problems.json (format: src/skat/problems/format.ts).
//   nice -n 15 node --experimental-strip-types --no-warnings tools/skat-problems/generate.ts
//     [--endgames 150] [--discards 75] [--bids 75] [--parallel 4] [--out public/puzzles/skat-problems.json]
// Endgames come from positions of rule-of-thumb games with four or five tricks left where exactly one card reaches
// the goal (open-card solver against every other card). Discard problems: the best pair beats the second best by a
// clear margin over 64 solved worlds (src/skat/ai/problemcheck.ts). Bid problems: the range from careful to bold
// bidding by the solver's valuation. Every explanation is built from solver facts. Deterministic for the same seeds.
import { spawn } from "node:child_process";
import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { Rng } from "../../src/core/rng.ts";
import {
  BID_VALUES, CARD_POINTS, JACKS, SUIT_MASKS, applyAction, cardName, cardsOf, currentSeat, declarationValue, deal, maskOf, matadors,
  newGame, pointsOf, popcount, viewFor,
} from "../../src/skat/rules/index.ts";
import type { Card, CardMask, DeclKind, Declaration, GameState, HandPosition, Seat } from "../../src/skat/rules/index.ts";
import type { BidProblem, DiscardProblem, EndgameProblem, SkatProblemData, SkatProblemPack } from "../../src/skat/problems/format.ts";
import { baselineDecide } from "../../src/skat/ai/baseline.ts";
import { THUMB, discardCandidates, estimateKinds, grandScore, nullDanger, suitScore } from "../../src/skat/ai/handeval.ts";
import { DISCARD_MARGIN, bidAnswer, discardRanking, endgameOutcomes } from "../../src/skat/ai/problemcheck.ts";
import { art, cap, explainEndgame } from "./explain.ts";

function arg(name: string, def: string): string {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 && i + 1 < process.argv.length ? process.argv[i + 1] : def;
}

const SUITS_DE = ["Karo", "Herz", "Pik", "Kreuz"];
const KIND_DE: Record<string, string> = { diamonds: "Karo", hearts: "Herz", spades: "Pik", clubs: "Kreuz", grand: "Grand", null: "Null" };

// ─── Endgames ─────────────────────────────────────────────────────────────────────────────────────────────

function rotate(seat: number, mover: number): 0 | 1 | 2 {
  return ((seat - mover + 3) % 3) as 0 | 1 | 2;
}

/** Drive a game with the rule-based players up to `doneTricks` finished tricks plus `extra` cards. */
function positionAt(seed: number, doneTricks: number, extra: number): GameState | null {
  let s = newGame({ seed, dealer: (seed % 3) as Seat });
  let guard = 0;
  while (s.phase !== "done" && guard++ < 300) {
    if (s.phase === "play" && s.tricks.length === doneTricks && s.trick.length === extra) return s;
    const seat = currentSeat(s)!;
    s = applyAction(s, baselineDecide(viewFor(s, seat)));
  }
  return null;
}

function endgameCandidate(seed: number, rng: Rng): EndgameProblem | null {
  const left = rng.chance(0.5) ? 4 : 5;
  const extra = rng.int(0, 2);
  const s = positionAt(seed, 10 - left, extra);
  if (!s || s.declarer === null || !s.declaration) return null;
  const d = s.declaration;
  if (d.ouvert) return null;
  // Skip games already lost by overbidding (a "win" would mean nothing).
  if (d.kind !== "null" && declarationValue(d, matadors(s.playHands[s.declarer] | s.skat, d.kind).count) < s.bid) return null;
  const mover = currentSeat(s)!;
  const decl = rotate(s.declarer, mover);
  const hands = [0, 1, 2].map((k) => cardsOf(s.hands[(k + mover) % 3])) as [number[], number[], number[]];
  const declPts = s.points[s.declarer] + (d.kind === "null" ? 0 : pointsOf(s.skat));
  const defPts = s.points[0] + s.points[1] + s.points[2] - s.points[s.declarer] + (d.kind === "null" ? pointsOf(s.skat) : 0);
  const defTricks = s.trickCounts[0] + s.trickCounts[1] + s.trickCounts[2] - s.trickCounts[s.declarer];
  const declTricks = s.trickCounts[s.declarer];
  if (d.kind === "null" && declTricks > 0) return null;
  const base = {
    id: "",
    type: "endgame" as const,
    difficulty: 1 as 1 | 2 | 3,
    declaration: d,
    declarer: decl,
    hands,
    trick: [...s.trick],
    leader: rotate(s.trickLeader, mover),
    points: [declPts, defPts] as [number, number],
    solution: -1,
    explanation: "",
  };
  const goals: EndgameProblem["goal"][] =
    d.kind === "null" ? [decl === 0 ? "noTrick" : "defend"] : decl === 0 ? ["win", "schneider", ...(defTricks === 0 ? (["schwarz"] as const) : [])] : ["defend"];
  for (const goal of goals) {
    if (goal === "schneider" && defPts > 30) continue;
    const p: EndgameProblem = { ...base, goal };
    const outs = endgameOutcomes(p);
    if (outs.length < 2) return null;
    const good = outs.filter((o) => o.achieves);
    if (good.length === 0) return null;
    if (good.length > 1) continue;
    p.solution = good[0].card;
    // Difficulty: does the rule of thumb find it, how many cards to choose from, how deep.
    const thumb = baselineDecide(viewFor(s, mover));
    const thumbCard = thumb.type === "play" ? thumb.card : -1;
    const found = thumbCard === p.solution;
    const n = outs.length;
    p.difficulty = found && n <= 3 && left === 4 ? 1 : !found && (left === 5 || n >= 4) ? 3 : 2;
    const wrongs = outs.filter((o) => !o.achieves).map((o) => o.card);
    const wrong = !found && wrongs.includes(thumbCard) ? thumbCard : pickWrong(p, outs);
    const pts = new Map<Card, number>(outs.map((o) => [o.card, o.declarerPoints]));
    p.explanation = explainEndgame({ p, points: pts, wrong });
    return p;
  }
  return null;
}

/** The wrong card that comes closest (most natural alternative). */
function pickWrong(p: EndgameProblem, outs: ReturnType<typeof endgameOutcomes>): Card {
  const wrong = outs.filter((o) => !o.achieves);
  const declWants = p.declarer === 0;
  wrong.sort((a, b) => (declWants ? b.declarerPoints - a.declarerPoints : a.declarerPoints - b.declarerPoints) || CARD_POINTS[b.card] - CARD_POINTS[a.card]);
  return wrong[0].card;
}

function generateEndgames(count: number): EndgameProblem[] {
  const pool: EndgameProblem[] = [];
  const rng = new Rng(4711);
  const want = Math.ceil(count / 3);
  const done = () => {
    const d = [1, 2, 3].map((x) => pool.filter((p) => p.difficulty === x).length);
    return (d.every((n) => n >= want) && pool.length >= count * 1.5) || pool.length >= count * 3;
  };
  for (let seed = 1_000_000; !done() && seed < 1_400_000; seed++) {
    const p = endgameCandidate(seed, rng);
    if (!p) continue;
    p.id = `eg-${seed}`;
    pool.push(p);
    if (pool.length % 50 === 0) console.error(`endgames: ${pool.length} candidates (seed ${seed})`);
  }
  // Even over difficulties, at most a third of one game kind (Null, Grand, a suit).
  return balanced(pool, count, (p) => p.declaration.kind);
}

// ─── Discards ─────────────────────────────────────────────────────────────────────────────────────────────

/** A sensible game for twelve cards (the best playable by the rules of thumb), or null. */
function discardGame(cards12: CardMask): Declaration | null {
  let best: { kind: DeclKind; s: number } | null = null;
  for (const e of estimateKinds(cards12, 1)) {
    let s: number;
    if (e.kind === "null") s = nullDanger(cards12).unsafeCards <= 2 ? 1 - nullDanger(cards12).unsafeCards * 0.5 : -9;
    else if (e.kind === "grand") s = popcount(cards12 & JACKS) >= 3 ? grandScore(cards12) - THUMB.grand : -9;
    else {
      const t = SUITS_DE.indexOf(KIND_DE[e.kind]);
      s = popcount(cards12 & (JACKS | SUIT_MASKS[t])) >= 6 ? suitScore(cards12, t) - THUMB.suit : -9;
    }
    if (s > -1 && (!best || s > best.s)) best = { kind: e.kind, s };
  }
  return best ? { kind: best.kind, hand: false, schneiderAnnounced: false, schwarzAnnounced: false, ouvert: false } : null;
}

function explainDiscard(cards12: CardMask, decl: Declaration, pair: [Card, Card], second: [Card, Card]): string {
  const kind = decl.kind;
  const [a, b] = pair;
  const m = (1 << a) | (1 << b);
  const rest = cards12 & ~m;
  const sents: string[] = [];
  const names = `${art(a, "acc")} und ${art(b, "acc")}`;
  if (kind === "null") {
    const before = nullDanger(cards12).unsafeCards;
    const after = nullDanger(rest).unsafeCards;
    sents.push(`Drück ${names}: Das sind die Karten, mit denen du einen Stich bekommen könntest.`);
    if (after === 0) sents.push("Danach hat dein Blatt keine Lücke mehr, unter jeder Karte liegt eine kleinere oder sie ist die niedrigste.");
    else if (after < before) sents.push("Damit werden deine schwachen Stellen deutlich weniger.");
  } else {
    sents.push(`Drück ${names}.`);
    const voids: string[] = [];
    for (let s = 0; s < 4; s++) {
      if (kind !== "grand" && SUITS_DE[s] === KIND_DE[kind]) continue;
      if ((cards12 & SUIT_MASKS[s]) && !(rest & SUIT_MASKS[s])) voids.push(SUITS_DE[s]);
    }
    if (voids.length && kind !== "grand") sents.push(`${voids.join(" und ")} ist danach frei, dort kannst du gleich stechen.`);
    else if (voids.length) sents.push(`${voids.join(" und ")} hast du danach nicht mehr, dort kann dir keiner etwas abnehmen.`);
    const tens = [a, b].filter((c) => c < 28 && c % 7 === 5 && !(cards12 & (1 << (c - 5 + 6))));
    if (tens.length) sents.push(`Eine Zehn ohne ihr Ass ist in Gefahr, im Skat ist sie sicher.`);
    const pts = CARD_POINTS[a] + CARD_POINTS[b];
    if (pts >= 10) sents.push(`Die ${pts} Augen im Skat zählen am Ende für dich.`);
  }
  sents.push(`Drückst du ${art(second[0], "acc")} und ${art(second[1], "acc")}, gewinnst du das Spiel deutlich seltener.`);
  return sents.join(" ");
}

/** Child process job: discard problem candidates for seeds [from, from+count). */
function discardCandidatesFor(from: number, count: number, emit: (p: DiscardProblem) => void): void {
  for (let seed = from; seed < from + count; seed++) {
    const d = deal(seed, 0);
    const k = seed % 3;
    const cards12 = d.hands[k] | (1 << d.skat[0]) | (1 << d.skat[1]);
    const decl = discardGame(cards12);
    if (!decl) continue;
    const id = `dc-${seed}`;
    const r = discardRanking(cards12, decl, id);
    if (r.length < 2) continue;
    const [best, second] = r;
    if (!(best.chance - second.chance >= DISCARD_MARGIN.chance || best.ev - second.ev >= DISCARD_MARGIN.ev)) continue;
    if (best.chance < 0.4) continue; // a game worth playing
    const thumb = discardCandidates(cards12, decl.kind, 6).map((p) => `${Math.min(...p)},${Math.max(...p)}`);
    const rank = thumb.indexOf(`${best.pair[0]},${best.pair[1]}`);
    const difficulty: 1 | 2 | 3 = rank === 0 ? 1 : rank >= 1 && rank <= 2 ? 2 : 3;
    emit({
      id,
      type: "discard",
      difficulty,
      cards: cardsOf(cards12),
      declaration: decl,
      solution: [best.pair[0], best.pair[1]],
      explanation: explainDiscard(cards12, decl, best.pair, second.pair),
    });
  }
}

/** Pick `count` problems from a pool: as even as possible over difficulties 1–3, at most a third per game kind. */
function balanced<T extends { difficulty: 1 | 2 | 3; id: string }>(pool: T[], count: number, kindOf: (p: T) => string): T[] {
  const out: T[] = [];
  const perKind: Record<string, number> = {};
  const byDiff = [1, 2, 3].map((d) => pool.filter((p) => p.difficulty === d));
  const cap = Math.ceil(count / 3);
  let progress = true;
  while (out.length < count && progress) {
    progress = false;
    for (const list of byDiff) {
      while (list.length) {
        const p = list.shift()!;
        const k = kindOf(p);
        if ((perKind[k] ?? 0) >= cap) continue;
        perKind[k] = (perKind[k] ?? 0) + 1;
        out.push(p);
        progress = true;
        break;
      }
      if (out.length >= count) break;
    }
  }
  return out.sort((a, b) => a.id.localeCompare(b.id));
}

async function generateDiscards(count: number, parallel: number): Promise<DiscardProblem[]> {
  const pool: DiscardProblem[] = [];
  const script = fileURLToPath(import.meta.url);
  const chunk = 40;
  let next = 2_000_000;
  const want = Math.ceil(count / 3);
  const enough = () => {
    const d = [1, 2, 3].map((x) => pool.filter((p) => p.difficulty === x).length);
    // Stop when every difficulty has its share and there is some choice, or the pool is three times the need.
    return (d.every((n) => n >= want) && pool.length >= count * 1.3) || pool.length >= count * 3;
  };
  const lane = async () => {
    while (!enough() && next < 2_100_000) {
      const from = next;
      next += chunk;
      await new Promise<void>((resolve, reject) => {
        const child = spawn(process.execPath, ["--experimental-strip-types", "--no-warnings", script, "--child", "discard", "--from", String(from), "--count", String(chunk)], {
          stdio: ["ignore", "pipe", "inherit"],
        });
        let buf = "";
        child.stdout.on("data", (d: Buffer) => {
          buf += d.toString();
          let i: number;
          while ((i = buf.indexOf("\n")) >= 0) {
            const line = buf.slice(0, i);
            buf = buf.slice(i + 1);
            if (line.trim()) {
              pool.push(JSON.parse(line));
              if (pool.length % 10 === 0) console.error(`discards: ${pool.length} candidates (seed ${from})`);
            }
          }
        });
        child.on("error", reject);
        child.on("close", () => resolve());
      });
    }
  };
  await Promise.all(Array.from({ length: Math.max(1, Math.min(4, parallel)) }, lane));
  pool.sort((a, b) => a.id.localeCompare(b.id));
  return balanced(pool, count, (p) => p.declaration.kind);
}

// ─── Bidding ──────────────────────────────────────────────────────────────────────────────────────────────

const POS_DE = ["Vorhand", "Mittelhand", "Hinterhand"];

function topsText(cards: CardMask, kind: Exclude<DeclKind, "null">): string {
  const m = matadors(cards, kind);
  const short = ["Kreuz-", "Pik-", "Herz-", "Karo-"];
  const list = (n: number) => (n === 1 ? "Kreuz-Buben" : `${short.slice(0, n - 1).join(", ")} und ${short[n - 1]}Buben`.replace(/^([^,]*), /, "$1, "));
  if (m.count >= 5) return `${m.withTops ? "mit" : "ohne"} ${m.count} Spitzen`;
  if (m.count === 4) return m.withTops ? "mit allen vier Buben" : "ohne alle vier Buben";
  if (m.withTops) return m.count === 1 ? "mit dem Kreuz-Buben" : `mit ${list(m.count)}`;
  return m.count === 1 ? "ohne den Kreuz-Buben" : `ohne ${list(m.count)}`;
}

function explainBid(cards10: CardMask, position: HandPosition, range: [number, number], kind: DeclKind): string {
  const [lo, hi] = range;
  const sents: string[] = [];
  if (kind === "null") {
    sents.push(`Dein Blatt hat kaum eine Lücke: Das ist ein Nullspiel. Null zählt ${hi >= 46 ? "offen 46" : "23"}.`);
  } else {
    const m = matadors(cards10, kind);
    const base = kind === "grand" ? 24 : [9, 10, 11, 12][["diamonds", "hearts", "spades", "clubs"].indexOf(kind)];
    const value = base * (m.count + 1);
    sents.push(
      `${cap(KIND_DE[kind])} ${topsText(cards10, kind)}: ${m.withTops ? "mit" : "ohne"} ${m.count}, Spiel ${m.count + 1}, ${m.count + 1} × ${base} = ${value}.`,
    );
    if (hi > value) sents.push(`Der Skat kann den Wert noch erhöhen, und das Blatt ist stark genug: Bis ${hi} kannst du mitgehen.`);
    else if (hi < value) sents.push(`Das Spiel ist aber nicht sicher genug für den vollen Wert: Bis ${hi} trägt das Blatt.`);
    else sents.push(`Bis ${hi} kannst du mitgehen.`);
  }
  if (lo < hi) sents.push(`Wer vorsichtig ist, hört schon bei ${lo} auf, das ist auch richtig.`);
  sents.push(`Du sitzt in ${POS_DE[position]}.`);
  return sents.join(" ");
}

function generateBids(count: number): BidProblem[] {
  const out: (BidProblem & { kind: string })[] = [];
  const want = Math.ceil(count / 3);
  const done = () => {
    const d = [1, 2, 3].map((x) => out.filter((p) => p.difficulty === x).length);
    return (d.every((n) => n >= want) && out.length >= count * 1.3) || out.length >= count * 3;
  };
  for (let seed = 3_000_000; !done() && seed < 3_020_000; seed++) {
    const d = deal(seed, 0);
    const position = (seed % 3) as HandPosition;
    const cards10 = d.hands[position];
    const a = bidAnswer(cards10, position);
    if (!a) continue;
    const steps = (x: number) => BID_VALUES.indexOf(x);
    if (steps(a.range[1]) - steps(a.range[0]) > 4) continue;
    if (a.range[1] > 96) continue; // the station offers bid values up to 96
    const k = a.kind;
    // Difficulty: plain "mit" suit games are easy; "ohne", Grand and wide skat effects are harder; Null hardest.
    let difficulty: 1 | 2 | 3 = 2;
    if (k === "null") difficulty = 3;
    else {
      const m = matadors(cards10, k);
      const base = k === "grand" ? 24 : [9, 10, 11, 12][["diamonds", "hearts", "spades", "clubs"].indexOf(k)];
      const value = base * (m.count + 1);
      if (m.withTops && k !== "grand" && a.range[1] === value) difficulty = 1;
      else if (!m.withTops && m.count >= 2) difficulty = 3;
    }
    out.push({
      kind: k,
      id: `bd-${seed}`,
      type: "bid",
      difficulty,
      cards: cardsOf(cards10),
      position,
      range: a.range,
      explanation: explainBid(cards10, position, a.range, k),
    });
    if (out.length % 25 === 0) console.error(`bids: ${out.length} candidates`);
  }
  return balanced(out, count, (p) => p.kind).map(({ kind, ...p }) => p);
}

// ─── Main ─────────────────────────────────────────────────────────────────────────────────────────────────

if (process.argv.includes("--child")) {
  const from = Number(arg("from", "0"));
  const count = Number(arg("count", "0"));
  discardCandidatesFor(from, count, (p) => process.stdout.write(JSON.stringify(p) + "\n"));
} else {
  const t0 = Date.now();
  const nE = Number(arg("endgames", "150"));
  const nD = Number(arg("discards", "75"));
  const nB = Number(arg("bids", "75"));
  const out = arg("out", "public/puzzles/skat-problems.json");
  const endgames = generateEndgames(nE);
  console.error(`endgames done: ${endgames.length}, ${((Date.now() - t0) / 1000).toFixed(0)} s`);
  const bids = generateBids(nB);
  console.error(`bids done: ${bids.length}, ${((Date.now() - t0) / 1000).toFixed(0)} s`);
  const discards = nD > 0 ? await generateDiscards(nD, Number(arg("parallel", "4"))) : [];
  console.error(`discards done: ${discards.length}, ${((Date.now() - t0) / 1000).toFixed(0)} s`);
  const problems: SkatProblemData[] = [...endgames, ...discards, ...bids];
  const pack: SkatProblemPack = { version: 1, problems };
  writeFileSync(out, JSON.stringify(pack) + "\n");
  const by = (t: string) => problems.filter((p) => p.type === t);
  const diff = (ps: SkatProblemData[]) => [1, 2, 3].map((d) => ps.filter((p) => p.difficulty === d).length).join("/");
  console.log(
    `wrote ${out}: ${problems.length} problems — endgames ${by("endgame").length} (difficulty ${diff(by("endgame"))}), ` +
      `discards ${by("discard").length} (${diff(by("discard"))}), bids ${by("bid").length} (${diff(by("bid"))}) in ${((Date.now() - t0) / 1000).toFixed(0)} s`,
  );
}

export { cardName, maskOf };
