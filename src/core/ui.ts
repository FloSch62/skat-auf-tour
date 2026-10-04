// Immediate-mode UI kit. Call widgets inside a scene's draw(); they draw and return interaction results.
//
// Contract §0.4/§0.5: everything works with a single left click. No dragging, no double click, no right click, no
// wheel, no keyboard needed (keys are optional shortcuts). Click targets are at least 44×32 layout units, labels use
// the `head` font. No scroll bars: long lists page with ◀ ▶ buttons (`pager`).
import type { Gfx } from "./gfx";
import type { Input } from "./input";
import { measure, lineHeight, wrap, centerY, type FontId } from "./font";
import { C, P } from "./palette";
import { sfx } from "./audio";
import { theme } from "./theme";

export type CursorKind = "arrow" | "pointer" | "blocked" | "wait";

export type ButtonVariant = "normal" | "go" | "danger" | "paper" | "ghost";

export interface ButtonOpts {
  variant?: ButtonVariant;
  disabled?: boolean;
  /** Optional keyboard shortcut (e.g. "Enter", "Digit1"). Never required. */
  hotkey?: string;
  /** icons atlas frame drawn left of the label. */
  icon?: string;
  tooltip?: string;
  font?: FontId;
  align?: "left" | "center";
  /** Draw as selected/toggled on. */
  active?: boolean;
  color?: string;
  /** Second, smaller line under the label (e.g. the game value under "Grand"). */
  sub?: string;
  subColor?: string;
  sound?: string | null;
}

interface Tooltip {
  text: string;
  x: number;
  y: number;
  width: number;
  anchor?: TipAnchor;
}

export interface TipAnchor {
  x: number;
  y: number;
  w: number;
  h: number;
  side?: "below" | "above" | "right" | "left";
}

/** Minimum click target (contract §0.5). */
export const MIN_W = 44;
export const MIN_H = 32;

export class UI {
  cursor: CursorKind = "arrow";
  private tooltip: Tooltip | null = null;
  private hoverId: string | null = null;
  private lastHoverId: string | null = null;
  private hoverStart = 0;
  private activeId: string | null = null;
  private pages = new Map<string, number>();
  focusId: string | null = null;
  time = 0;
  /** Every clickable rectangle of this frame (for the readability check, tools/readable-qa.mjs). */
  targets: { id: string; x: number; y: number; w: number; h: number }[] = [];

  constructor(readonly g: Gfx, readonly input: Input) {}

  begin(time: number) {
    this.time = time;
    this.cursor = "arrow";
    this.tooltip = null;
    this.lastHoverId = this.hoverId;
    this.hoverId = null;
    this.targets.length = 0;
  }

  /** Draw deferred overlays (tooltips) and the cursor. Call once at the very end of the frame. */
  end() {
    if (this.tooltip) this.drawTooltip(this.tooltip);
    this.drawCursor();
    if (!this.input.isDown(0)) this.activeId = null;
  }

  hover(x: number, y: number, w: number, h: number): boolean {
    return this.input.inRect(x, y, w, h);
  }

  /** Register hover for an id; returns true when hovered. */
  hot(id: string, x: number, y: number, w: number, h: number): boolean {
    if (this.input.enabled) this.targets.push({ id, x, y, w, h });
    if (!this.input.inRect(x, y, w, h)) return false;
    this.hoverId = id;
    if (id !== this.lastHoverId) this.hoverStart = this.time;
    return true;
  }

  hoverTime(): number {
    return this.time - this.hoverStart;
  }

  setTooltip(text: string, width = 260, anchor?: TipAnchor) {
    this.tooltip = { text, x: this.input.mx, y: this.input.my, width, anchor };
  }

  /** Clickable region without visuals. Returns true on click. */
  area(id: string, x: number, y: number, w: number, h: number, opts: { tooltip?: string; cursor?: CursorKind; sound?: string | null } = {}): boolean {
    const over = this.hot(id, x, y, w, h);
    if (!over) return false;
    this.cursor = opts.cursor ?? "pointer";
    if (opts.tooltip && this.hoverTime() > 0.35) this.setTooltip(opts.tooltip, 260, { x, y, w, h });
    if (this.input.pressed(0)) {
      this.input.consume();
      if (opts.sound) sfx.play(opts.sound);
      return true;
    }
    return false;
  }

  button(id: string, x: number, y: number, w: number, h: number, label: string, opts: ButtonOpts = {}): boolean {
    const g = this.g;
    const over = this.hot(id, x, y, w, h);
    let clicked = false;
    if (over) {
      this.cursor = opts.disabled ? "blocked" : "pointer";
      if (opts.tooltip && this.hoverTime() > 0.35) this.setTooltip(opts.tooltip, 260, { x, y, w, h });
      if (!opts.disabled && this.input.pressed(0)) {
        this.activeId = id;
        this.input.consume();
      }
      if (!opts.disabled && this.activeId === id && this.input.released(0)) clicked = true;
    }
    if (!opts.disabled && opts.hotkey && this.input.keyPressed(opts.hotkey)) {
      this.input.eatKey(opts.hotkey);
      clicked = true;
    }
    const pressed = this.activeId === id && this.input.isDown(0) && over;
    const variant = opts.variant ?? "normal";
    const hl = over || !!opts.active;
    let slice = "button-normal";
    if (opts.disabled) slice = "button-disabled";
    else if (variant === "go") slice = hl ? "button-go-hover" : "button-go";
    else if (variant === "danger") slice = hl ? "button-danger-hover" : "button-danger";
    else if (variant === "paper") slice = hl ? "button-paper-hover" : "button-paper";
    else if (opts.active) slice = theme.activeSlice;
    else if (pressed) slice = "button-pressed";
    else if (hl) slice = "button-hover";
    if (variant !== "ghost") g.panel(x, y, w, h, slice);
    else if (hl) g.rrect(x, y, w, h, 3, P.wood2);
    const font = opts.font ?? "head";
    // a selected choice is drawn as a light, pressed-in key with dark text (clearer than a colour change); themes with
    // cream buttons use dark text on every normal button
    const lightNormal = variant === "normal" && theme.lightButtons && !opts.disabled;
    const onPaper = variant === "paper" || (variant === "normal" && !!opts.active && !opts.disabled) || lightNormal;
    const color = opts.disabled
      ? onPaper ? P.ink5 : theme.lightButtons ? P.stone3 : P.paper0
      : opts.color ?? (opts.active && variant === "normal" ? theme.activeText : lightNormal ? (hl ? theme.buttonTextHover : theme.buttonText) : onPaper ? P.ink1 : hl ? P.beer4 : C.text);
    const shadow = onPaper ? null : P.ink0;
    const dy = pressed ? 1 : 0;
    const lh = lineHeight(font);
    const subFont: FontId = "body";
    const subH = opts.sub ? lineHeight(subFont) : 0;
    let tx = x + 10;
    let ty = (opts.sub ? Math.round(y + (h - lh - subH) / 2) : centerY(font, y, h)) + dy;
    if (opts.icon) {
      const f = g.frameSize("icons", opts.icon);
      if (f) {
        g.sprite("icons", opts.icon, x + 8, y + Math.round((h - f.h) / 2) + dy, { noAnchor: true, alpha: opts.disabled ? 0.45 : 1 });
        tx += f.w + 4;
      }
    }
    const center = (opts.align ?? "center") === "center";
    if (label) {
      if (center) {
        const cx = opts.icon ? tx + Math.round((x + w - 10 - tx) / 2) : x + Math.round(w / 2);
        g.text(label, cx, ty, { font, color, align: "center", shadow });
      } else {
        g.text(label, tx, ty, { font, color, shadow, width: w - (tx - x) - 8, maxLines: Math.max(1, Math.floor((h - 4 - subH) / lh)) });
      }
    }
    if (opts.sub) {
      const sc = opts.disabled ? (onPaper ? P.ink5 : P.paper0) : opts.subColor ?? (onPaper ? P.ink4 : P.paper2);
      const sy = ty + lh;
      if (center) g.text(opts.sub, x + Math.round(w / 2), sy, { font: subFont, color: sc, align: "center", shadow });
      else g.text(opts.sub, tx, sy, { font: subFont, color: sc, shadow });
    }
    if (clicked && opts.sound !== null) sfx.play(opts.sound ?? "ui-click");
    return clicked;
  }

  /** Square icon button (at least 44×44 when it must be read; smaller only for decoration-level duplicates). */
  iconButton(id: string, x: number, y: number, size: number, icon: string, opts: ButtonOpts & { fallback?: string } = {}): boolean {
    const clicked = this.button(id, x, y, size, size, "", { ...opts, icon: undefined });
    const f = this.g.frameSize("icons", icon);
    if (f) {
      this.g.sprite("icons", icon, x + Math.round((size - f.w) / 2), y + Math.round((size - f.h) / 2), { noAnchor: true, alpha: opts.disabled ? 0.45 : 1 });
    } else {
      const label = opts.fallback ?? icon.slice(0, 1).toUpperCase();
      this.g.text(label, x + size / 2, centerY("head", y, size), { font: "head", align: "center", color: opts.disabled ? P.paper0 : C.text, shadow: P.ink0 });
    }
    return clicked;
  }

  /** A checkbox drawn as a big square with a tick; the label is part of the click target. */
  checkbox(id: string, x: number, y: number, label: string, value: boolean, opts: { color?: string; font?: FontId } = {}): boolean {
    const g = this.g;
    const font = opts.font ?? "head";
    const box = 28;
    const w = box + 10 + measure(label, font);
    const clicked = this.area(id, x, y, w, Math.max(box, MIN_H));
    const over = this.hover(x, y, w, Math.max(box, MIN_H));
    g.panel(x, y, box, box, over ? "button-paper-hover" : "button-paper");
    if (value) {
      // a tick
      const c = P.forest1;
      for (let i = 0; i < 6; i++) g.rect(x + 7 + i, y + 13 + i, 3, 3, c);
      for (let i = 0; i < 10; i++) g.rect(x + 12 + i, y + 18 - i * 1.1, 3, 3, c);
    }
    g.text(label, x + box + 10, centerY(font, y, box), { font, color: opts.color ?? (over ? P.beer4 : C.text), shadow: P.ink0 });
    if (clicked) sfx.play("ui-click");
    return clicked ? !value : value;
  }

  /** "−  value  +" stepper instead of a slider (no dragging). Returns the new value. */
  stepper(id: string, x: number, y: number, w: number, value: number, opts: { min?: number; max?: number; step?: number; format?: (v: number) => string } = {}): number {
    const min = opts.min ?? 0;
    const max = opts.max ?? 1;
    const step = opts.step ?? 0.1;
    const h = 36;
    const bw = 44;
    let v = value;
    if (this.button(`${id}:-`, x, y, bw, h, "–", { disabled: v <= min + 1e-9 })) v = Math.max(min, Math.round((v - step) / step) * step);
    if (this.button(`${id}:+`, x + w - bw, y, bw, h, "+", { disabled: v >= max - 1e-9 })) v = Math.min(max, Math.round((v + step) / step) * step);
    const g = this.g;
    g.panel(x + bw + 4, y, w - 2 * bw - 8, h, "panel-dark");
    const text = opts.format ? opts.format(v) : `${Math.round(v * 100)} %`;
    g.text(text, x + w / 2, centerY("head", y, h), { font: "head", align: "center", color: C.text });
    return v;
  }

  /** A row of choice buttons; returns the selected index. */
  choice(id: string, x: number, y: number, labels: string[], selected: number, opts: { w?: number; h?: number; gap?: number; variant?: ButtonVariant } = {}): number {
    const w = opts.w ?? 140;
    const h = opts.h ?? 40;
    const gap = opts.gap ?? 6;
    let sel = selected;
    labels.forEach((label, i) => {
      if (this.button(`${id}:${i}`, x + i * (w + gap), y, w, h, label, { active: i === selected, variant: opts.variant })) sel = i;
    });
    return sel;
  }

  /**
   * Paging instead of scrolling: draws « Zurück · "Seite n von m" · Weiter » at (x, y) across width w and returns the current page.
   * Callers draw `perPage` items starting at page * perPage.
   */
  pager(id: string, x: number, y: number, w: number, total: number, perPage: number): number {
    const pages = Math.max(1, Math.ceil(total / perPage));
    let p = Math.min(this.pages.get(id) ?? 0, pages - 1);
    if (pages > 1) {
      const bw = 120;
      const h = 36;
      if (this.button(`${id}:prev`, x, y, bw, h, "« Zurück", { disabled: p === 0, sound: "page-turn" })) p--;
      if (this.button(`${id}:next`, x + w - bw, y, bw, h, "Weiter »", { disabled: p >= pages - 1, sound: "page-turn" })) p++;
      this.g.text(`Seite ${p + 1} von ${pages}`, x + w / 2, centerY("head", y, h), { font: "head", align: "center", color: C.textDim });
    }
    this.pages.set(id, p);
    return p;
  }

  setPage(id: string, page: number) {
    this.pages.set(id, page);
  }

  /** Single-line text field (keyboard). The name screen also offers letter buttons, so typing is never required. */
  textField(id: string, x: number, y: number, w: number, value: string, maxLen = 12): string {
    const g = this.g;
    const h = 40;
    if (this.area(id, x, y, w, h, { cursor: "pointer" })) this.focusId = id;
    const focused = this.focusId === id;
    g.panel(x, y, w, h, focused ? "button-paper-hover" : "paper");
    if (focused) {
      for (const ch of this.input.typed) {
        if (ch === "\b") value = [...value].slice(0, -1).join("");
        else if (ch === "\n") this.focusId = null;
        else if ([...value].length < maxLen && ch >= " ") value += ch;
      }
    }
    const ty = centerY("head", y, h);
    g.text(value, x + 10, ty, { font: "head", color: P.ink1 });
    if (focused && Math.floor(this.time * 2) % 2 === 0) g.rect(x + 11 + measure(value, "head"), y + 9, 2, h - 18, P.ink1);
    return value;
  }

  private drawTooltip(t: Tooltip) {
    const g = this.g;
    const font: FontId = "head";
    const lines = wrap(t.text, t.width - 16, font);
    const lh = lineHeight(font);
    let w = 0;
    for (const l of lines) w = Math.max(w, measure(l, font));
    w += 16;
    const h = lines.length * lh + 12;
    let x = t.x + 18;
    let y = t.y + 22;
    if (t.anchor) {
      const a = t.anchor;
      const clampX = (v: number) => Math.max(4, Math.min(956 - w, v));
      const clampY = (v: number) => Math.max(4, Math.min(536 - h, v));
      const spots: Record<string, () => [number, number] | null> = {
        below: () => (a.y + a.h + 4 + h <= 536 ? [clampX(t.x - 10), a.y + a.h + 4] : null),
        above: () => (a.y - 4 - h >= 4 ? [clampX(t.x - 10), a.y - 4 - h] : null),
        right: () => (a.x + a.w + 4 + w <= 956 ? [a.x + a.w + 4, clampY(t.y - 10)] : null),
        left: () => (a.x - 4 - w >= 4 ? [a.x - 4 - w, clampY(t.y - 10)] : null),
      };
      const order = [a.side ?? "below", "below", "above", "right", "left"];
      let p: [number, number] | null = null;
      for (const k of order) if ((p = spots[k]())) break;
      if (p) [x, y] = p;
    }
    if (x + w > 956) x = t.x - w - 6;
    if (y + h > 536) y = t.y - h - 6;
    x = Math.max(4, x);
    y = Math.max(4, y);
    g.panel(x, y, w, h, "tooltip");
    g.text(lines.join("\n"), x + 8, y + 6, { font, color: P.ink1 });
  }

  private drawCursor() {
    if (!this.input.inside) return;
    const x = this.input.mx;
    const y = this.input.my;
    const kind = this.cursor === "blocked" ? "arrow" : this.cursor;
    if (this.g.sprite("ui", `cursor-${kind}`, x, y)) return;
    // Procedural fallback: a large arrow and a pointing hand (contract §10 "großer Zeiger und Hand als Cursor").
    const pat = kind === "pointer" ? HAND : ARROW;
    const ox = kind === "pointer" ? -6 : 0;
    const g = this.g;
    for (let r = 0; r < pat.length; r++) {
      const row = pat[r];
      for (let c = 0; c < row.length; c++) {
        const ch = row[c];
        if (ch === "X") g.rect(x + ox + c, y + r, 1, 1, P.ink0);
        else if (ch === "O") g.rect(x + ox + c, y + r, 1, 1, P.paper4);
        else if (ch === "S") g.rect(x + ox + c, y + r, 1, 1, P.paper1);
      }
    }
  }
}

const ARROW = [
  "X..............",
  "XX.............",
  "XOX............",
  "XOOX...........",
  "XOOOX..........",
  "XOOOOX.........",
  "XOOOOOX........",
  "XOOOOOOX.......",
  "XOOOOOOOX......",
  "XOOOOOOOOX.....",
  "XOOOOOOOOOX....",
  "XOOOOOOOOOOX...",
  "XOOOOOOOOOOOX..",
  "XOOOOOOXXXXXXX.",
  "XOOOXOOX.......",
  "XOOXXOOOX......",
  "XOX..XOOX......",
  "XX...XOOOX.....",
  "X.....XOOX.....",
  "......XOOOX....",
  ".......XOOX....",
  ".......XXX.....",
];

const HAND = [
  "......XX..........",
  ".....XOOX.........",
  ".....XOOX.........",
  ".....XOOX.........",
  ".....XOOX.........",
  ".....XOOXXX.......",
  ".....XOOXOOXXX....",
  ".....XOOXOOXOOXX..",
  ".XX..XOOXOOXOOXOX.",
  "XOOX.XOOOOOOOOXOOX",
  "XOOOXXOOOOOOOOOOOX",
  ".XOOOXOOOOOOOOOOOX",
  "..XOOOOOOOOOOOOOOX",
  "..XOOOOOOOOOOOOOOX",
  "...XOOOOOOOOOOOOSX",
  "...XOOOOOOOOOOOOX.",
  "....XOOOOOOOOOOSX.",
  "....XOOOOOOOOOOX..",
  ".....XOOOOOOOOSX..",
  ".....XXXXXXXXXXX..",
];

export function keyLabel(code: string): string {
  if (code.startsWith("Key")) return code.slice(3);
  if (code.startsWith("Digit")) return code.slice(5);
  const map: Record<string, string> = {
    Space: "Leertaste", Escape: "Esc", Enter: "Eingabe", Backspace: "Löschen", ArrowLeft: "links", ArrowRight: "rechts",
  };
  return map[code] ?? code;
}
