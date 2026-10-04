// Einstellungen (contract §7): name and drink, deck, one- or two-click play, pace, help offers, puzzle levels,
// volumes, fullscreen, still backgrounds, profile import and backups. Drawn as an overlay over the calling screen.
import type { App, Scene } from "../core/scene";
import type { DeckStyle, Level, Pace } from "../core/save";
import { saveSettings, settings } from "../core/save";
import { audio, sfx } from "../core/audio";
import { C, P } from "../core/palette";
import { centerY } from "../core/font";
import { collectBackup, downloadJson, pickJsonFile, restoreBackup } from "../core/files";
import { getProfile, normaliseProfile, placeName, setProfile } from "../game/world";
import type { Profile } from "../game/types";
import { DOGS } from "../game/ids";
import { createWelcome, DRINK_CHOICES } from "./welcome";
import { dialog, para } from "./kit";
import { drawCardFace } from "./cardface";

const TABS = ["Spieler", "Skat", "Rätsel", "Ton und Bild", "Sicherung"];

export function createSettingsScene(app: App): Scene {
  let tab = 0;
  let message = "";
  let messageT = 0;
  const say = (m: string) => {
    message = m;
    messageT = 4;
  };
  const scene: Scene = {
    overlay: true,
    update(dt) {
      messageT = Math.max(0, messageT - dt);
    },
    draw(g, a) {
      const ui = a.ui;
      const { x, y, w, h } = dialog(g, 900, 500);
      g.text("Einstellungen", x + 24, y + 14, { font: "big", color: C.title, shadow: P.ink0 });
      if (ui.button("close", x + w - 150, y + 14, 130, 40, "Fertig", { variant: "go", hotkey: "Escape" })) {
        saveSettings();
        a.scenes.remove(scene);
        return;
      }
      tab = ui.choice("tabs", x + 24, y + 64, TABS, tab, { w: 162, h: 40, gap: 6 });
      const cx = x + 30;
      let cy = y + 128;
      const row = (label: string) => {
        g.text(label, cx, centerY("head", cy, 40), { font: "head", color: C.textDim, shadow: P.ink0 });
      };
      const lx = cx + 230;

      if (tab === 0) {
        row("Name");
        g.panel(lx, cy, 260, 40, "paper");
        g.text(settings.name || "—", lx + 12, centerY("head", cy, 40), { font: "head", color: P.ink1 });
        if (ui.button("rename", lx + 274, cy, 320, 40, "Name und Getränk ändern")) {
          a.scenes.push(createWelcome(a, {
            editing: true,
            done: () => a.scenes.pop(),
          }));
        }
        cy += 54;
        row("Stammgetränk");
        g.text(DRINK_CHOICES.find((d) => d.id === settings.drink)?.label ?? "", lx, centerY("head", cy, 40), { font: "head", color: C.text, shadow: P.ink0 });
        cy += 54;
        row("Profil");
        const prof = getProfile();
        const home = prof.home ? placeName(prof.home) : "—";
        const dogs = DOGS.map((d) => prof.dogs[d]).filter(Boolean).join(", ");
        para(g, `Daheim in ${home}. Hunde: ${dogs || "—"}.${prof.partner ? ` Daheim wartet ${prof.partner}.` : ""}`, lx, cy + 6, 560, { font: "head", shadow: P.ink0 });
        cy += 64;
        if (ui.button("profile", lx, cy, 260, 40, "Profil laden …")) {
          void pickJsonFile().then((data) => {
            const p = data as Partial<Profile> | null;
            if (!p || typeof p !== "object" || (!p.home && !p.dogs)) {
              say("Das war keine Profil-Datei.");
              return;
            }
            setProfile(normaliseProfile(p));
            say("Profil geladen.");
          });
        }
        g.text("Ein Profil enthält Heimatort, Hundenamen und Namen der Familie.", lx, cy + 50, { font: "body", color: C.textDim, width: 560 });
      } else if (tab === 1) {
        row("Kartenblatt");
        const decks: [DeckStyle, string][] = [["french", "Französisch"], ["german", "Deutsch"], ["tournament", "Turnierbild"]];
        decks.forEach(([id, label], i) => {
          const bx = lx + i * 190;
          if (ui.button(`deck-${id}`, bx, cy, 180, 40, label, { active: settings.deck === id })) {
            settings.deck = id;
            saveSettings();
          }
          drawCardFace(g, id, "clubs", "jack", bx + 18, cy + 50, true);
          drawCardFace(g, id, "hearts", "10", bx + 62, cy + 50, true);
          drawCardFace(g, id, "diamonds", "ace", bx + 106, cy + 50, true);
        });
        cy += 120;
        row("Ausspielen");
        if (ui.button("two", lx, cy, 260, 40, "Mit zwei Klicks", { active: !settings.oneClickPlay })) settings.oneClickPlay = false;
        if (ui.button("one", lx + 274, cy, 260, 40, "Mit einem Klick", { active: settings.oneClickPlay })) settings.oneClickPlay = true;
        cy += 50;
        row("Tempo am Tisch");
        const paces: [Pace, string][] = [["slow", "Gemütlich"], ["normal", "Normal"], ["fast", "Flott"]];
        paces.forEach(([id, label], i) => {
          if (ui.button(`pace-${id}`, lx + i * 180, cy, 170, 40, label, { active: settings.pace === id })) settings.pace = id;
        });
        cy += 54;
        row("Hilfen");
        settings.showTrumpCount = ui.checkbox("trumps", lx, cy + 4, "Gefallene Trümpfe zeigen", settings.showTrumpCount);
        settings.showPoints = ui.checkbox("points", lx + 330, cy + 4, "Augen mitzählen", settings.showPoints);
      } else if (tab === 2) {
        const levels: [Level, string][] = [["easy", "Leicht"], ["medium", "Mittel"], ["hard", "Schwer"]];
        row("Schach");
        levels.forEach(([id, label], i) => {
          if (ui.button(`chess-${id}`, lx + i * 180, cy, 170, 40, label, { active: settings.chessLevel === id })) settings.chessLevel = id;
        });
        g.text("Leicht: Matt in einem Zug. Mittel: Matt in zwei. Schwer: Matt in drei.", lx, cy + 48, { font: "body", color: C.textDim });
        cy += 80;
        row("Sudoku");
        levels.forEach(([id, label], i) => {
          if (ui.button(`sudoku-${id}`, lx + i * 180, cy, 170, 40, label, { active: settings.sudokuLevel === id })) settings.sudokuLevel = id;
        });
        cy += 60;
        row("Fehler zeigen");
        settings.sudokuMarkErrors = ui.checkbox("sudoku-err", lx, cy + 4, "Falsche Ziffern im Sudoku rot markieren", settings.sudokuMarkErrors);
      } else if (tab === 3) {
        const vol = (key: "master" | "music" | "sfx", label: string) => {
          row(label);
          const v = ui.stepper(`vol-${key}`, lx, cy, 260, settings[key]);
          if (v !== settings[key]) {
            settings[key] = Math.round(v * 10) / 10;
            audio.volumes = { master: settings.master, music: settings.music, sfx: settings.sfx };
            audio.applyVolumes();
            sfx.play("ui-click");
          }
          cy += 50;
        };
        vol("master", "Lautstärke");
        vol("music", "Musik");
        vol("sfx", "Geräusche");
        row("Bildschirm");
        if (ui.button("fs", lx, cy, 260, 40, a.screen.fullscreen ? "Vollbild beenden" : "Vollbild")) void a.screen.toggleFullscreen();
        cy += 54;
        row("Bewegung");
        settings.reducedMotion = ui.checkbox("motion", lx, cy + 4, "Ruhige Hintergründe (nichts bewegt sich)", settings.reducedMotion);
      } else {
        para(g, "Hier kannst du alles, was das Spiel im Browser aufhebt (Tourenbuch, laufende Tour, Einstellungen und Profil), als Datei sichern und auf einem anderen Laptop wieder laden.", cx, cy, w - 60, { shadow: P.ink0 });
        cy += 90;
        if (ui.button("export", cx, cy, 300, 44, "Sicherung speichern", { variant: "go" })) {
          saveSettings();
          const b = collectBackup();
          downloadJson(`skat-auf-tour-${b.date}.json`, b);
          say("Die Sicherung liegt jetzt in deinen Downloads.");
        }
        if (ui.button("import", cx + 320, cy, 300, 44, "Sicherung laden …")) {
          void pickJsonFile().then((data) => {
            if (restoreBackup(data)) {
              say("Sicherung geladen. Das Spiel startet neu …");
              setTimeout(() => location.reload(), 1200);
            } else say("Das war keine Sicherung von SKAT AUF TOUR.");
          });
        }
      }

      if (messageT > 0) {
        g.panel(x + 200, y + h - 58, w - 400, 40, "paper");
        g.text(message, x + w / 2, centerY("head", y + h - 58, 40), { font: "head", align: "center", color: P.ink1 });
      }
    },
  };
  return scene;
}
