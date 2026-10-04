// One-point perspective for painted interiors and streets: room coordinates in metres (X right, Y down from the
// eye, Z into the picture), projected onto the 640×360 raster. Verticals stay vertical, as in adventure backdrops.
import { P, Px, type Fill, type Pt } from "./painter";

export class View {
  /** vx, vy: vanishing point (eye level) in raster pixels; f: focal length in pixels. */
  constructor(readonly vx: number, readonly vy: number, readonly f: number) {}

  pt(X: number, Y: number, Z: number): Pt {
    return [Math.round(this.vx + (this.f * X) / Z), Math.round(this.vy + (this.f * Y) / Z)];
  }
  x(X: number, Z: number): number {
    return Math.round(this.vx + (this.f * X) / Z);
  }
  y(Y: number, Z: number): number {
    return Math.round(this.vy + (this.f * Y) / Z);
  }
  /** Size of `m` metres at depth Z, in pixels. */
  s(m: number, Z: number): number {
    return (this.f * m) / Z;
  }

  /** Quad on a side wall (X fixed) between depths z0…z1 and heights y0…y1. */
  sideQuad(X: number, y0: number, y1: number, z0: number, z1: number): Pt[] {
    return [this.pt(X, y0, z0), this.pt(X, y0, z1), this.pt(X, y1, z1), this.pt(X, y1, z0)];
  }
  /** Quad on a horizontal plane (Y fixed: floor, table, ceiling). */
  flatQuad(Y: number, x0: number, x1: number, z0: number, z1: number): Pt[] {
    return [this.pt(x0, Y, z0), this.pt(x1, Y, z0), this.pt(x1, Y, z1), this.pt(x0, Y, z1)];
  }
  /** Rectangle facing the viewer at depth Z. */
  frontRect(x0: number, x1: number, y0: number, y1: number, Z: number): [number, number, number, number] {
    const a = this.pt(x0, y0, Z);
    const b = this.pt(x1, y1, Z);
    return [a[0], a[1], b[0] - a[0], b[1] - a[1]];
  }
}

export interface BoxCols {
  front: Fill;
  side?: Fill;
  top?: Fill;
  bottom?: Fill;
  ink?: string;
}

/**
 * An axis-aligned box in room space with its visible faces (front, the side that faces the centre, and top or
 * bottom depending on eye level). Returns the face polygons so callers can decorate them.
 */
export function box3(p: Px, v: View, x0: number, x1: number, y0: number, y1: number, z0: number, z1: number, cols: BoxCols) {
  const ink = cols.ink ?? P.ink0;
  const out: { front: Pt[]; side: Pt[] | null; top: Pt[] | null; bottom: Pt[] | null } = { front: [], side: null, top: null, bottom: null };
  if (y0 > 0 && cols.top) {
    out.top = v.flatQuad(y0, x0, x1, z0, z1);
    p.shape(out.top, cols.top, ink);
  }
  if (y1 < 0 && cols.bottom) {
    out.bottom = v.flatQuad(y1, x0, x1, z0, z1);
    p.shape(out.bottom, cols.bottom, ink);
  }
  if (x1 < 0 && cols.side) {
    out.side = v.sideQuad(x1, y0, y1, z0, z1);
    p.shape(out.side, cols.side, ink);
  } else if (x0 > 0 && cols.side) {
    out.side = v.sideQuad(x0, y0, y1, z0, z1);
    p.shape(out.side, cols.side, ink);
  }
  const [fx, fy, fw, fh] = v.frontRect(x0, x1, y0, y1, z0);
  out.front = [[fx, fy], [fx + fw, fy], [fx + fw, fy + fh], [fx, fy + fh]];
  p.box(fx, fy, fw + 1, fh + 1, cols.front, ink);
  return out;
}

/** Lines across a side-wall quad at the given depths (vertical boards, tile joints). */
export function sideVerticals(p: Px, v: View, X: number, y0: number, y1: number, zs: number[], col: Fill) {
  for (const z of zs) {
    const a = v.pt(X, y0, z);
    const b = v.pt(X, y1, z);
    p.line(a[0], a[1], b[0], b[1], col);
  }
}

/** Lines along a side wall at the given heights (rails, tile courses). */
export function sideHorizontals(p: Px, v: View, X: number, ys: number[], z0: number, z1: number, col: Fill) {
  for (const y of ys) {
    const a = v.pt(X, y, z0);
    const b = v.pt(X, y, z1);
    p.line(a[0], a[1], b[0], b[1], col);
  }
}

/** Evenly spaced values from a to b (inclusive), n steps. */
export function steps(a: number, b: number, n: number): number[] {
  const out: number[] = [];
  for (let i = 0; i <= n; i++) out.push(a + ((b - a) * i) / n);
  return out;
}
