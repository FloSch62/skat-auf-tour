// Das Tourenbuch (contract §4.13): a paper book with his name and rank on the cover, the trophy shelf, place stamps,
// the album of regulars, dogs, souvenirs, the chronicle and the Skat statistics. Section tabs at the top; long
// sections page with « Zurück / Weiter ». Kept across tours, never lost with a tour.
import type { App, Scene } from "../core/scene";
import type { Gfx } from "../core/gfx";
import type { BookState } from "../game/types";
import type { CharacterId } from "../game/ids";
import { DIFFICULTIES, DOGS, REGIONS, SOUVENIRS } from "../game/ids";
import { music } from "../core/audio";
import { settings } from "../core/save";
import { P } from "../core/palette";
import { getPack, getProfile } from "../game/world";
import { BOOK } from "../content/texts";
import { CHARACTER_DEFS } from "../data/characters";
import { DOG_DEFS, dogName } from "../data/dogs";
import { SOUVENIR_DEFS } from "../data/souvenirs";
import { rank, trophyCount, trophyKey, wanderKey } from "../tour/book";
import { loadBook } from "../tour/save";
import { portrait, whatNow } from "./kit";
import { drawKitchen, goHome } from "./home";
import { itemIcon } from "./tour/common";

type Section = "cover" | "trophies" | "stamps" | "album" | "dogs" | "souvenirs" | "chronicle" | "stats";

const TABS: { id: Section; label: string }[] = [
  { id: "cover", label: "Umschlag" },
  { id: "trophies", label: "Pokale" },
  { id: "stamps", label: "Stempel" },
  { id: "album", label: "Album" },
  { id: "dogs", label: "Hunde" },
  { id: "souvenirs", label: "Andenken" },
  { id: "chronicle", label: "Chronik" },
  { id: "stats", label: "Statistik" },
];

const INK = P.ink1;
const DIM = P.ink4;
const X0 = 48;
const Y0 = 92;
const PW = 864;

function heading(g: Gfx, text: string) {
  g.text(text, X0 + 16, Y0 + 6, { font: "big", color: INK });
}

function fillName(text: string): string {
  return text.replace(/\{name\}/g, settings.name || "Unbekannt").replace(/\{rank\}/g, "");
}

export function createBookScene(app: App, opts: { back?: () => void; book?: BookState } = {}): Scene {
  const book = opts.book ?? loadBook();
  const profile = getProfile();
  const pack = getPack();
  let section: Section = "cover";
  const album = (Object.keys(book.album) as CharacterId[]).sort((a, b) => (book.album[b]!.games - book.album[a]!.games));
  const close = () => (opts.back ?? (() => goHome(app)))();

  const drawCover = (g: Gfx) => {
    const r = rank(book);
    g.text(BOOK.title, 480, Y0 + 30, { font: "huge", align: "center", color: P.brick1 });
    g.text(fillName(BOOK.cover), 480, Y0 + 90, { font: "big", align: "center", color: INK });
    g.text(`Rang: ${r.name}`, 480, Y0 + 136, { font: "big", align: "center", color: P.beer0 });
    g.text(r.text, 480, Y0 + 178, { font: "head", align: "center", color: DIM, width: 0 });
    const lines = [
      `${BOOK.stats.tours}: ${book.tours.started} · ${BOOK.stats.toursWon}: ${book.tours.won}`,
      `Pokale: ${trophyCount(book)} · Ortsstempel: ${Object.keys(book.stamps).length}`,
      r.next !== undefined ? `Zum nächsten Rang fehlen noch ${r.next - trophyCount(book)} Pokale.` : "Höher geht es nicht.",
    ];
    lines.forEach((l, i) => g.text(l, 480, Y0 + 230 + i * 30, { font: "head", align: "center", color: INK }));
  };

  const drawTrophies = (g: Gfx) => {
    heading(g, BOOK.sections.trophies);
    if (!trophyCount(book)) g.text(BOOK.empty.trophies, X0 + 16, Y0 + 48, { font: "head", color: DIM });
    DIFFICULTIES.forEach((d, k) => g.text(BOOK.difficulty[d], X0 + 330 + k * 180, Y0 + 76, { font: "head", align: "center", color: INK }));
    const rows = [...REGIONS.map((r) => ({ label: pack.regions.find((x) => x.id === r)?.title ?? r, key: (d: string) => trophyKey(r, d as never), icon: `trophy-${r}` })), { label: BOOK.wanderpokal, key: (d: string) => wanderKey(d as never), icon: "trophy-wander" }];
    rows.forEach((row, i) => {
      const y = Y0 + 104 + i * 58;
      g.text(row.label, X0 + 16, y + 14, { font: "head", color: INK });
      DIFFICULTIES.forEach((d, k) => {
        const n = book.trophies[row.key(d)] ?? 0;
        const cx = X0 + 330 + k * 180;
        itemIcon(g, row.icon, cx - 20, y + 24, { dim: n === 0, label: "P" });
        g.text(n ? `×${n}` : "–", cx + 18, y + 14, { font: "head", color: n ? INK : DIM });
      });
    });
  };

  const drawStamps = (g: Gfx, a: App) => {
    heading(g, BOOK.sections.stamps);
    const regions = pack.regions;
    const page = a.ui.pager("book-stamps", X0 + 16, Y0 + 340, PW - 32, regions.length, 1);
    const reg = regions[page];
    if (!reg) return;
    g.text(reg.title, X0 + PW - 16, Y0 + 14, { font: "head", align: "right", color: DIM });
    reg.places.forEach((pl, i) => {
      const col = i % 3;
      const row = Math.floor(i / 3);
      const x = X0 + 24 + col * 280;
      const y = Y0 + 52 + row * 48;
      const date = book.stamps[pl.id];
      if (date) {
        if (!g.sprite("fx", "stamp-red", x + 18, y + 18)) g.circle(x + 18, y + 18, 16, P.brick1, false);
      } else g.circle(x + 18, y + 18, 14, P.paper1, false);
      g.text(pl.name, x + 44, y + 2, { font: "head", color: date ? INK : DIM, width: 230, maxLines: 1 });
      const note = profile.notes?.[pl.id];
      g.text(date ? `${date}${note ? ` · ${note}` : ""}` : "noch nicht besucht", x + 44, y + 24, { font: "body", color: DIM, width: 230, maxLines: 1 });
    });
  };

  const drawAlbum = (g: Gfx, a: App) => {
    heading(g, BOOK.sections.album);
    if (!album.length) {
      g.text(BOOK.empty.album, X0 + 16, Y0 + 52, { font: "head", color: DIM });
      return;
    }
    const per = 4;
    const page = a.ui.pager("book-album", X0 + 16, Y0 + 340, PW - 32, album.length, per);
    album.slice(page * per, page * per + per).forEach((id, i) => {
      const e = book.album[id]!;
      const ch = CHARACTER_DEFS[id];
      const x = X0 + 16 + (i % 2) * 424;
      const y = Y0 + 48 + Math.floor(i / 2) * 140;
      portrait(g, id, x + 6, y + 6, 88);
      g.text(ch.name, x + 108, y, { font: "head", color: INK });
      g.text(ch.style, x + 108, y + 24, { font: "body", color: DIM, width: 300, maxLines: 2 });
      g.text(`${BOOK.album.games}: ${e.games} · ${e.won} ${BOOK.album.won} · ${e.lost} ${BOOK.album.lost}`, x + 108, y + 66, { font: "body", color: INK });
      g.text(`${BOOK.album.met}: ${e.met}`, x + 108, y + 88, { font: "body", color: DIM });
    });
  };

  const drawDogs = (g: Gfx) => {
    heading(g, BOOK.sections.dogs);
    DOGS.forEach((d, i) => {
      const x = X0 + 16 + (i % 2) * 424;
      const y = Y0 + 48 + Math.floor(i / 2) * 96;
      const open = book.dogs.includes(d);
      itemIcon(g, d, x + 26, y + 26, { dim: !open, label: DOG_DEFS[d].breed });
      g.text(`${dogName(profile, d)}, ${DOG_DEFS[d].breed}`, x + 60, y, { font: "head", color: open ? INK : DIM, width: 350, maxLines: 1 });
      g.text(open ? DOG_DEFS[d].ability : `Freigeschaltet durch: ${DOG_DEFS[d].unlock}`, x + 60, y + 24, { font: "body", color: DIM, width: 350, maxLines: 3 });
    });
  };

  const drawSouvenirs = (g: Gfx) => {
    heading(g, BOOK.sections.souvenirs);
    SOUVENIRS.forEach((id, i) => {
      const x = X0 + 16 + (i % 2) * 424;
      const y = Y0 + 46 + Math.floor(i / 2) * 42;
      const has = book.souvenirs.includes(id);
      itemIcon(g, id, x + 20, y + 18, { dim: !has, label: SOUVENIR_DEFS[id].name });
      g.text(SOUVENIR_DEFS[id].name, x + 52, y + 2, { font: "head", color: has ? INK : DIM, width: 360, maxLines: 1 });
    });
  };

  const drawChronicle = (g: Gfx, a: App) => {
    heading(g, BOOK.sections.chronicle);
    const entries = [...book.chronicle].reverse();
    if (!entries.length) {
      g.text(BOOK.empty.chronicle, X0 + 16, Y0 + 52, { font: "head", color: DIM });
      return;
    }
    const per = 9;
    const page = a.ui.pager("book-chron", X0 + 16, Y0 + 340, PW - 32, entries.length, per);
    entries.slice(page * per, page * per + per).forEach((e, i) => {
      const y = Y0 + 48 + i * 32;
      g.text(e.date, X0 + 16, y, { font: "head", color: DIM });
      g.text(e.text, X0 + 150, y, { font: "head", color: INK, width: PW - 180, maxLines: 1 });
    });
  };

  const drawStats = (g: Gfx) => {
    heading(g, BOOK.sections.stats);
    const s = book.skat;
    const pct = s.declared ? Math.round((100 * s.declaredWon) / s.declared) : 0;
    const left: [string, string][] = [
      [BOOK.stats.games, String(s.games)],
      [BOOK.stats.declared, String(s.declared)],
      [BOOK.stats.declaredWon, s.declared ? `${s.declaredWon} (${pct} %)` : "–"],
      [BOOK.stats.highestValue, String(s.highestValue || "–")],
      [BOOK.stats.grandHand, String(s.grandHand)],
      [BOOK.stats.schneider, String(s.schneider)],
      [BOOK.stats.schwarz, String(s.schwarz)],
      [BOOK.stats.bestList, String(s.bestList || "–")],
      [BOOK.stats.defenceWon, String(s.defenceWon)],
    ];
    left.forEach(([k, v], i) => {
      g.text(k, X0 + 16, Y0 + 48 + i * 30, { font: "head", color: DIM });
      g.text(v, X0 + 400, Y0 + 48 + i * 30, { font: "head", align: "right", color: INK });
    });
    const kinds = Object.entries(s.byKind).filter(([, n]) => n);
    g.text(BOOK.stats.byKind, X0 + 450, Y0 + 48, { font: "head", color: INK });
    kinds.forEach(([k, n], i) => {
      const kx = X0 + 450 + (i % 2) * 200;
      const ky = Y0 + 78 + Math.floor(i / 2) * 26;
      g.text(BOOK.kinds[k as keyof typeof BOOK.kinds] ?? k, kx, ky, { font: "body", color: DIM });
      g.text(String(n), kx + 170, ky, { font: "body", align: "right", color: INK });
    });
    const fy = Y0 + 78 + Math.max(1, Math.ceil(kinds.length / 2)) * 26 + 14;
    g.text(BOOK.sections.fun, X0 + 450, fy, { font: "head", color: INK });
    const fun: [string, number][] = [[BOOK.fun.detours, book.fun.detours], [BOOK.fun.timesDriver, book.fun.timesDriver], [BOOK.stats.innWins, book.innWins]];
    fun.forEach(([k, v], i) => {
      g.text(k, X0 + 450, fy + 30 + i * 26, { font: "body", color: DIM });
      g.text(String(v), X0 + 840, fy + 30 + i * 26, { font: "body", align: "right", color: INK });
    });
  };

  return {
    enter() {
      void music.play("daheim");
    },
    draw(g, a) {
      const ui = a.ui;
      drawKitchen(g);
      g.dim(0.45);
      // the book: two pages with a spine
      g.panel(X0 - 16, 14, PW + 32, 460, "panel-dark");
      g.panel(X0, 30, PW, 432, "paper");
      TABS.forEach((t, i) => {
        if (ui.button(`bk-${t.id}`, X0 + 8 + i * 106, 36, 100, 44, t.label, { variant: "paper", active: section === t.id, sound: "page-turn" })) section = t.id;
      });
      if (section !== "cover") g.rect(X0 + PW / 2 - 1, 88, 2, 370, P.paper1);
      switch (section) {
        case "cover": drawCover(g); break;
        case "trophies": drawTrophies(g); break;
        case "stamps": drawStamps(g, a); break;
        case "album": drawAlbum(g, a); break;
        case "dogs": drawDogs(g); break;
        case "souvenirs": drawSouvenirs(g); break;
        case "chronicle": drawChronicle(g, a); break;
        case "stats": drawStats(g); break;
      }
      // page turning across sections
      const idx = TABS.findIndex((t) => t.id === section);
      whatNow(g, "Was jetzt? Reiter oben anklicken.", { x: 14, y: 492, w: 470 });
      if (ui.button("bk-prev", 494, 484, 140, 48, "« Zurück", { disabled: idx === 0, sound: "page-turn" })) section = TABS[idx - 1].id;
      if (ui.button("bk-next", 640, 484, 140, 48, "Weiter »", { disabled: idx === TABS.length - 1, sound: "page-turn" })) section = TABS[idx + 1].id;
      if (ui.button("bk-close", 790, 484, 156, 48, "Zuklappen", { variant: "go", hotkey: "Escape" })) close();
    },
  };
}
