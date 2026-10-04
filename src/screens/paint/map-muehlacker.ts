// Atlas paper "Mühlacker und Stromberg" (maps/muehlacker): the Enz from Enzberg past Dürrmenz and Mühlacker,
// Lomersheim and the Mühlhausen loop; Maulbronn's woods, the Stromberg forest and its vineyards in the north, the
// Hagenschieß woods in the south. Calm texture only: no roads or settlements (the tour draws its own).
import type { Px } from "./painter";
import { paintAtlas } from "./atlas";

export function paintMapMuehlacker(p: Px) {
  paintAtlas(p, {
    region: "muehlacker",
    seed: 5,
    relief: 0.65,
    rivers: [
      // the Enz (enzberg 215,230 · duerrmenz 314,210 · muehlacker 339,197 · lomersheim 419,161 · muehlhausen 502,161)
      { w: 3, pts: [[-8, 268], [70, 258], [150, 246], [212, 238], [262, 226], [304, 214], [334, 204], [364, 190], [396, 172], [420, 166], [452, 170], [474, 150], [500, 140], [520, 156], [512, 172], [532, 184], [566, 176], [604, 184], [648, 178]] },
      // the Schmie from Maulbronn and Lienzingen
      { w: 1, pts: [[250, 70], [262, 100], [283, 126], [300, 160], [326, 196]] },
      // the Kraichbach west of Knittlingen
      { w: 1, pts: [[82, 40], [60, 90], [40, 130], [-8, 160]] },
      // the Erlenbach from Großglattbach
      { w: 1, pts: [[470, 300], [452, 262], [430, 220], [418, 172]] },
    ],
    valleys: [0],
    forests: [
      // the Stromberg
      [[300, -8], [648, -8], [648, 120], [600, 112], [560, 80], [520, 70], [480, 84], [440, 72], [400, 40], [360, 30], [320, 18]],
      // the woods around Maulbronn
      [[180, 40], [228, 30], [290, 50], [300, 90], [270, 110], [230, 108], [200, 84]],
      // the Hagenschieß and the woods by Wiernsheim
      [[160, 300], [240, 288], [300, 300], [340, 320], [420, 312], [470, 340], [480, 368], [150, 368]],
      // Ölbronn woods
      [[-8, 180], [40, 186], [80, 220], [60, 260], [-8, 252]],
    ],
    vineyards: [
      // the Mühlhausen loop
      [[480, 130], [512, 126], [534, 146], [522, 160], [496, 148]],
      // south slopes of the Stromberg above Zaisersweiher and Schützingen
      [[320, 50], [380, 44], [430, 60], [470, 40], [520, 54], [510, 74], [450, 84], [390, 70], [330, 72]],
      // Lomersheim slope
      [[396, 150], [430, 146], [440, 160], [410, 166]],
      // Knittlingen
      [[60, 14], [110, 10], [120, 30], [80, 40]],
    ],
  });
}
