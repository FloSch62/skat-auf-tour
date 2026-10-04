// Atlas paper "Nordschwarzwald" (maps/schwarzwald): forest everywhere but the clearings on the plateaus and the
// narrow Enz valley from Bad Wildbad via Calmbach, Höfen and Neuenbürg (in its loop) to Birkenfeld and Pforzheim,
// where the Nagold comes in. Calm texture only: no roads or settlements (the tour draws its own).
import type { Px } from "./painter";
import { paintAtlas } from "./atlas";

export function paintMapSchwarzwald(p: Px) {
  paintAtlas(p, {
    region: "schwarzwald",
    seed: 7,
    relief: 1,
    rivers: [
      // the Enz (bad-wildbad 120,331 · calmbach 209,278 · hoefen 221,225 · neuenbuerg 261,127 · arnbach 297,93 ·
      // birkenfeld 399,76 · pforzheim 589,29)
      { w: 3, pts: [[104, 368], [118, 334], [150, 306], [196, 288], [214, 266], [222, 236], [228, 204], [242, 172], [254, 150], [244, 134], [252, 116], [272, 120], [280, 106], [298, 96], [340, 92], [396, 82], [452, 72], [520, 54], [584, 36], [648, 16]] },
      // the Kleine Enz from the south to Calmbach
      { w: 2, pts: [[250, 368], [236, 330], [214, 290]] },
      // the Eyach to Höfen
      { w: 1, pts: [[360, 368], [320, 320], [272, 270], [228, 238]] },
      // the Nagold to Pforzheim
      { w: 2, pts: [[560, 368], [548, 300], [540, 240], [556, 170], [570, 110], [586, 40]] },
    ],
    valleys: [0, 1, 3],
    forests: [],
    forestAll: { open: 0.62 },
    vineyards: [],
  });
}
