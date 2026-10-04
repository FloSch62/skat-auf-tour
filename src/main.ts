// Boot: canvas, input, fonts, core atlases, audio, place pack and profile; then the start screen (or a dev scene via
// ?dev=<name>).
import { Screen, W, H } from "./core/screen";
import { Input } from "./core/input";
import { Gfx } from "./core/gfx";
import { UI } from "./core/ui";
import { SceneManager, type App, type Scene } from "./core/scene";
import { loadFonts, qaSmallText, qaText } from "./core/font";
import { loadArtIndex, loadAtlas } from "./core/assets";
import { audio } from "./core/audio";
import { settings } from "./core/save";
import { P } from "./core/palette";
import { setApp } from "./core/app";
import { devScenes } from "./dev";
import { loadWorld } from "./game/world";
import { createStart } from "./screens/start";

/** Atlases every screen may draw from (tools/sprites → public/sprites). Missing ones fall back to code drawing. */
const CORE_ATLASES = ["ui", "icons", "cards", "fx", "drinks", "words", "chess", "sudoku", "van", "items"];

async function boot() {
  const canvas = document.getElementById("game") as HTMLCanvasElement;
  const screen = new Screen(canvas);
  screen.setMode(settings.scale);
  const input = new Input(screen);
  const g = new Gfx(screen.ctx);
  const ui = new UI(g, input);
  let app!: App;
  const scenes = new SceneManager(() => app);
  app = { screen, input, g, ui, scenes, time: 0 };
  setApp(app);

  audio.volumes = { master: settings.master, music: settings.music, sfx: settings.sfx };
  input.onFirstGesture(() => audio.unlock());

  // Loading screen drawn in the canvas: three cards being dealt while a beer-coloured bar fills.
  let progress = 0;
  let loading = true;
  const drawLoading = () => {
    screen.resetTransform();
    const c = screen.ctx;
    c.fillStyle = P.ink0;
    c.fillRect(0, 0, W, H);
    const t = performance.now() / 1000;
    for (let i = 0; i < 3; i++) {
      const lift = Math.round(Math.max(0, Math.sin(t * 3 - i * 0.7)) * 6);
      const x = W / 2 - 54 + i * 36;
      const y = H / 2 - 70 - lift;
      c.fillStyle = P.ink1;
      c.fillRect(x + 2, y + 2, 32, 48);
      c.fillStyle = P.paper4;
      c.fillRect(x, y, 32, 48);
      c.fillStyle = i === 1 ? P.brick1 : P.ink1;
      c.fillRect(x + 12, y + 18, 8, 12);
    }
    const bw = 240;
    const x = (W - bw) / 2;
    const y = H / 2 + 10;
    c.fillStyle = P.wood1;
    c.fillRect(x, y, bw, 8);
    c.fillStyle = P.beer2;
    c.fillRect(x + 1, y + 1, Math.round((bw - 2) * progress), 6);
    if (loading) requestAnimationFrame(drawLoading);
  };
  requestAnimationFrame(drawLoading);

  const tasks: Promise<unknown>[] = [loadFonts(), audio.init(), loadWorld(), loadArtIndex(), ...CORE_ATLASES.map((a) => loadAtlas(a))];
  let done = 0;
  await Promise.all(tasks.map((t) => t.then(() => (progress = ++done / tasks.length))));
  loading = false;

  const params = new URLSearchParams(location.search);
  const dev = params.get("dev");
  let first: Scene;
  if (dev && devScenes[dev]) first = await devScenes[dev](app, params);
  else first = createStart(app);
  scenes.push(first);

  let last = performance.now();
  const frame = (now: number) => {
    const dt = Math.min(0.1, (now - last) / 1000);
    last = now;
    app.time += dt;
    g.time = app.time;
    scenes.update(dt);
    screen.resetTransform();
    qaSmallText.length = 0;
    qaText.length = 0;
    ui.begin(app.time);
    scenes.draw(g);
    ui.end();
    input.endFrame();
    requestAnimationFrame(frame);
  };
  requestAnimationFrame(frame);

  window.addEventListener("keydown", (e) => {
    if (e.code === "F11" || (e.code === "Enter" && e.altKey)) {
      e.preventDefault();
      void screen.toggleFullscreen();
    }
  });
  (window as unknown as { __sat: unknown }).__sat = { app, qa: { small: qaSmallText, text: qaText, targets: () => ui.targets.slice() } };
}

void boot();
