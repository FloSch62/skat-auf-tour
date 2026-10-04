// Atlas paper "Stuttgart" (maps/stuttgart): the Neckar from Wangen and Untertürkheim past Bad Cannstatt and
// Münster, the park belt to the river, vineyards on the Neckar slopes, the wooded hills around (Glemswald, Bopser,
// Schurwald). Calm texture only: no roads, railways or built-up areas (the tour draws its own).
import type { Px } from "./painter";
import { paintAtlas } from "./atlas";

export function paintMapStuttgart(p: Px) {
  paintAtlas(p, {
    region: "stuttgart",
    seed: 9,
    relief: 0.8,
    rivers: [
      // the Neckar (wangen 499,210 · untertuerkheim 525,198 · bad-cannstatt 399,138 · muenster 416,106)
      { w: 4, pts: [[648, 238], [600, 226], [548, 214], [512, 206], [474, 192], [434, 172], [404, 152], [388, 134], [398, 114], [414, 96], [420, 70], [408, 40], [396, 8], [392, -8]] },
      // the Feuerbach to Zuffenhausen and the Neckar
      { w: 1, pts: [[150, 140], [217, 124], [250, 90], [300, 60], [360, 46], [400, 40]] },
      // the Körsch on the Filder
      { w: 1, pts: [[200, 368], [300, 330], [420, 330], [520, 300], [600, 268], [640, 250]] },
    ],
    valleys: [0],
    forests: [
      // the Glemswald and the Rot- und Schwarzwildpark
      [[-8, 130], [40, 140], [90, 160], [140, 200], [150, 250], [120, 290], [60, 300], [-8, 290]],
      // the Bopser and the woods above Degerloch
      [[270, 236], [320, 226], [360, 244], [380, 262], [350, 292], [300, 300], [262, 280]],
      // woods south-east of Sillenbuch
      [[420, 284], [480, 270], [540, 296], [560, 340], [500, 368], [420, 368], [400, 330]],
      // the Schurwald edge
      [[580, 268], [648, 250], [648, 368], [590, 368], [570, 320]],
    ],
    vineyards: [
      // Rotenberg and Untertürkheim
      [[530, 160], [590, 150], [640, 168], [636, 196], [580, 190], [540, 186]],
      // the Cannstatt slopes
      [[420, 112], [452, 104], [466, 124], [440, 140]],
      // Münster and Mühlhausen
      [[430, 60], [470, 54], [482, 80], [446, 92]],
      // the Lemberg at Feuerbach
      [[190, 98], [226, 92], [232, 108], [200, 112]],
    ],
    parks: [
      // Schlossgarten and Rosensteinpark to the Neckar
      [[300, 196], [330, 176], [372, 150], [392, 144], [396, 160], [360, 182], [320, 206]],
      // Killesberg
      [[236, 140], [264, 136], [270, 156], [244, 162]],
    ],
  });
}
