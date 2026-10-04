// The UI look for frames and buttons: blue enamel signs with cream borders, cream enamel buttons (the user chose
// "Emaille" on 4 Oct over the all-wood look). The ui atlas (tools/sprites/ui.py) draws every slice; this module keeps
// the button text colours and the soft gloss that a 9-slice cannot carry.
import { P } from "./palette";

export interface SliceStyle {
  fill: string;
  outer: string;
  frame: string;
  inner: string;
  /** Top highlight line. */
  hi?: string;
  /** A thin second line inside the frame (enamel signs). */
  line?: string;
}

export interface Theme {
  id: "enamel";
  /** Slices drawn in code (empty: the ui atlas draws them all). */
  slices: Record<string, SliceStyle>;
  /** Normal buttons are light (dark text). */
  lightButtons: boolean;
  buttonText: string;
  buttonTextHover: string;
  /** Selected choices ("Gewählt", active tabs). */
  activeSlice: string;
  activeText: string;
}

export const theme: Theme = {
  id: "enamel",
  slices: {},
  lightButtons: true,
  buttonText: P.river0,
  buttonTextHover: P.ink0,
  activeSlice: "button-active",
  activeText: P.ink0,
};

/**
 * A soft gloss over the upper part of big enamel panels, drawn in code because a 9-slice repeats its centre and
 * cannot carry a full-height gradient (docs/notes-sprites.md). Colour per slice; the inner field starts 6 units in.
 */
export const GLOSS: Record<string, Record<string, string>> = {
  enamel: { panel: P.paper3, "panel-hi": P.paper4, dialog: P.paper3 },
};
