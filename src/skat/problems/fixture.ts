// A small hand-checked set of Stammtisch problems (contract §4.7), used until the generated pack
// public/puzzles/skat-problems.json exists (AI workstream) and as a fallback if it cannot be loaded. The endgames are
// verified by the exact solver in fixture.test.ts (exactly one card reaches the goal); the discard and bid problems
// are textbook cases with a clear answer. Pure data.
import { declaration, parseCard } from "../rules/index.ts";
import type { Card } from "../rules/index.ts";
import type { SkatProblemData } from "./format.ts";

const cards = (codes: string): Card[] => codes.split(/\s+/).filter(Boolean).map(parseCard);
const card = parseCard;
const pair = (a: string, b: string): [Card, Card] => {
  const x = card(a);
  const y = card(b);
  return x < y ? [x, y] : [y, x];
};

export const FIXTURE_PROBLEMS: SkatProblemData[] = [
  {
    id: "fx-endgame-grand-trumps",
    type: "endgame",
    difficulty: 1,
    declaration: declaration("grand"),
    declarer: 0,
    hands: [cards("CJ HA HT H9"), cards("SJ SA ST S9"), cards("DJ HK CA CT")],
    trick: [],
    leader: 0,
    points: [30, 17],
    goal: "win",
    solution: card("CJ"),
    explanation:
      "Erst die Trümpfe ziehen: Der Kreuz-Bube holt beide Buben der Gegner. Spielst du zuerst Herz, sticht der Linke mit dem Pik-Buben, und das Spiel kippt.",
  },
  {
    id: "fx-endgame-smear",
    type: "endgame",
    difficulty: 1,
    declaration: declaration("spades"),
    declarer: 1,
    hands: [cards("DA D7 C9 C8"), cards("SA ST SK"), cards("C7 D8 H7")],
    trick: [card("HK"), card("HA")],
    leader: 1,
    points: [33, 36],
    goal: "defend",
    solution: card("DA"),
    explanation:
      "Dein Mitspieler hat den Stich mit dem Herz-Ass sicher. Jetzt das Karo-Ass schmieren! Danach hat der Alleinspieler nur noch Trümpfe und holt sich jedes Ass, das du behältst.",
  },
  {
    id: "fx-endgame-null",
    type: "endgame",
    difficulty: 2,
    declaration: declaration("null"),
    declarer: 0,
    hands: [cards("D7 C9 C8 SK"), cards("DQ DK H8 H9"), cards("H7 D9 D8 HJ")],
    trick: [],
    leader: 0,
    points: [0, 0],
    goal: "noTrick",
    solution: card("D7"),
    explanation:
      "Kreuz und Pik hat keiner mehr: Spielst du sie aus, bleibt der Stich bei dir. Die Karo-Sieben liegt unter allem. Danach kommen die anderen raus, und du wirfst Kreuz und Pik einfach ab.",
  },
  {
    id: "fx-discard-tens",
    type: "discard",
    difficulty: 1,
    cards: cards("CJ SJ HJ DJ CA CK CQ C9 HA HK ST DT"),
    declaration: declaration("clubs"),
    solution: pair("ST", "DT"),
    explanation:
      "Zwei blanke Zehnen gehören in den Skat. Behältst du sie, holen die Gegner sie mit ihren Assen ab. Im Skat zählen sie zwanzig Augen für dich.",
  },
  {
    id: "fx-discard-null",
    type: "discard",
    difficulty: 1,
    cards: cards("C7 C8 C9 S7 S8 S9 SA H7 H8 H9 D7 DA"),
    declaration: declaration("null"),
    solution: pair("SA", "DA"),
    explanation:
      "Im Null sind die Asse die Gefahr: Sie gewinnen jeden Stich, in dem sie fallen. Ohne Pik-Ass und Karo-Ass bleibt ein sauberes Nullblatt übrig.",
  },
  {
    id: "fx-bid-hearts-mit2",
    type: "bid",
    difficulty: 1,
    cards: cards("CJ SJ HA HT HK H8 H7 SA D7 D8"),
    position: 1,
    range: [30, 30],
    explanation:
      "Herz mit zweien: Spiel drei, drei mal zehn sind 30. Ein Bube im Skat schadet nicht, er macht das Spiel höchstens teurer. Höher wäre überreizt.",
  },
  {
    id: "fx-bid-null",
    type: "bid",
    difficulty: 2,
    cards: cards("C7 C8 C9 S7 S8 H7 H9 D7 D8 D9"),
    position: 0,
    range: [23, 35],
    explanation:
      "Ein sauberes Nullblatt: Null trägt 23, aus der Hand gespielt 35. Für Null ouvert ist die Herz-Neun zu wackelig.",
  },
];
