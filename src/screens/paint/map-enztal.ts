// Atlas paper "Unteres Enztal" (maps/enztal): the Enz comes in past the Roßwag loop, runs through Vaihingen,
// Enzweihingen and the Riexingens, turns north at Bissingen and meets the Neckar at Besigheim; the Stromberg forest
// and its vineyards in the north-west, the Metter and the Glems as side streams. Calm texture only: no roads or
// settlements (the tour draws its own).
import type { Px } from "./painter";
import { paintAtlas } from "./atlas";

export function paintMapEnztal(p: Px) {
  paintAtlas(p, {
    region: "enztal",
    seed: 3,
    relief: 0.7,
    rivers: [
      // the Enz (place positions: rosswag 51,157 · vaihingen 145,222 · enzweihingen 296,244 · oberriexingen 320,241 ·
      // unterriexingen 402,236 · bissingen 524,143 · besigheim 589,40)
      { w: 3, pts: [[-8, 140], [22, 146], [40, 162], [62, 176], [86, 170], [92, 150], [76, 136], [88, 124], [108, 136], [120, 176], [140, 214], [176, 236], [236, 250], [290, 250], [324, 246], [364, 244], [404, 240], [436, 226], [470, 204], [500, 176], [522, 152], [540, 124], [556, 96], [574, 64], [590, 44]] },
      // the Neckar from the south-east, past Besigheim, northwards
      { w: 4, pts: [[650, 214], [628, 180], [612, 140], [604, 104], [598, 70], [592, 44], [600, 20], [612, -8]] },
      // the Metter via Sachsenheim to Bietigheim
      { w: 1, pts: [[300, 104], [340, 122], [380, 138], [406, 150], [450, 160], [500, 158], [520, 154]] },
      // the Glems from Markgröningen to Unterriexingen
      { w: 1, pts: [[470, 368], [452, 320], [440, 296], [426, 268], [408, 244]] },
      // a brook from Aurich and Riet
      { w: 1, pts: [[236, 368], [224, 334], [196, 300], [160, 270], [146, 230]] },
    ],
    valleys: [0, 1],
    forests: [
      // the Stromberg
      [[-8, -8], [380, -8], [372, 18], [330, 22], [290, 40], [240, 30], [180, 46], [120, 54], [70, 48], [30, 70], [-8, 76]],
      // woods south-west of Vaihingen
      [[-8, 236], [40, 226], [92, 250], [110, 300], [90, 368], [-8, 368]],
      // woods south of Riet
      [[250, 368], [262, 320], [300, 306], [340, 318], [352, 368]],
      // the Hardt north-east
      [[640, 210], [600, 236], [570, 270], [600, 300], [648, 296]],
    ],
    vineyards: [
      // inside the Roßwag loop, south-facing
      [[30, 168], [70, 170], [80, 150], [60, 140], [36, 150]],
      // the Stromberg slopes above Gündelbach, Horrheim and Hohenhaslach
      [[92, 62], [170, 54], [230, 40], [290, 50], [340, 36], [372, 52], [330, 80], [260, 82], [200, 76], [140, 82], [96, 80]],
      // the Neckar slopes at Besigheim
      [[566, 18], [598, 8], [620, 30], [612, 76], [590, 84], [572, 56]],
      // the Enz slopes at Bietigheim
      [[470, 186], [500, 160], [516, 170], [496, 204], [476, 212]],
    ],
  });
}
