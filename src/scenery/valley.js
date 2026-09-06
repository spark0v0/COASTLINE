import { rng } from "./kit.js";

// The valley: terraced orchards, stone walls, hay bales and farm sheds so
// the stretch reads as tended farmland instead of empty terrain.
export function buildValley(S) {
  const w = S.world,
    b = S.batch,
    r = rng(4477);
  const orchard = S.art.get("grass", "#b0a16a");
  const wall = S.art.get("stone", "#a99b82");
  const wood = S.art.get("wood", "#8a7355");
  // Terraced orchard rows with low retaining walls below each terrace.
  for (let row = 0; row < 10; row++) {
    const x = -705 - row * 8,
      z = 15;
    const road = w.nearestRoad(x, z);
    if (road.d < 22) continue;
    b.box(orchard, x, w.height(x, z) - 0.12, z, 2, 0.15, 75);
    // Retaining wall on the downhill edge of every second terrace.
    if (row % 2 === 0)
      b.box(wall, x - 1.6, w.height(x - 1.6, z) - 0.4, z, 0.7, 1.3, 74);
    for (let k = 0; k < 6; k++) {
      const zz = z - 32 + k * 12;
      if (w.nearestRoad(x, zz).d < 17) continue;
      b.add("sphere", "#778759", [x, w.height(x, zz) + 2, zz], [2, 1.5, 2]);
      b.add(
        "cylinder",
        wood,
        [x, w.height(x, zz) + 0.7, zz],
        [0.16, 1.6, 0.16],
      );
    }
  }
  // Stone field walls following the contour, with gaps as field gates.
  for (let seg = 0; seg < 9; seg++) {
    const x0 = -660 - seg * 55,
      z0 = -70 + Math.sin(seg * 1.7) * 26;
    for (let k = 0; k < 8; k++) {
      if (k === 4) continue;
      const x = x0 + k * 5.4,
        z = z0 + Math.sin(x * 0.021) * 6;
      if (w.nearestRoad(x, z).d < 15 || !w.inside(x, z)) continue;
      b.box(wall, x, w.height(x, z) - 0.25, z, 5.2, 0.9, 0.55, 0.35);
    }
  }
  // Hay bales scattered on the meadow east of the terraces.
  for (let i = 0; i < 14; i++) {
    const x = -620 + r() * 150,
      z = 60 + r() * 180;
    if (w.nearestRoad(x, z).d < 14 || !w.inside(x, z)) continue;
    b.add(
      "cylinder",
      S.art.get("grass", "#c9b280"),
      [x, w.height(x, z) + 0.75, z],
      [0.85, 1.5, 0.85],
      [Math.PI / 2, 0, r() * 3],
    );
  }
  // Two farm sheds with gable roofs by the field gate.
  for (const [fx, fz, fyaw] of [
    [-646, 96, 0.4],
    [-588, 34, -0.7],
  ]) {
    const fy = w.height(fx, fz);
    if (w.nearestRoad(fx, fz).d < 16) continue;
    b.box(wood, fx, fy, fz, 7, 3.2, 5, fyaw);
    b.add(
      "roof",
      S.art.get("roof", "#8a6a4c"),
      [fx, fy + 4.1, fz],
      [5.4, 1.9, 5.6],
      [0, -fyaw, 0],
    );
    b.box("#385955", fx, fy + 0.5, fz + 2.4, 1.4, 2.2, 0.12, fyaw);
    b.box(stoneW(), fx + 2.8, fy + 0.1, fz + 3.4, 0.8, 1.4, 0.8, fyaw);
    w.register({ type: "box", x: fx, z: fz, w: 7.5, d: 5.5, h: 5, yaw: fyaw });
  }
  // Dirt spur from the main road into the orchard gate.
  for (let k = 0; k < 10; k++) {
    const x = -648 + k * 1.9,
      z = 44 - k * 2.4;
    if (w.nearestRoad(x, z).d < 9 && k < 2) continue;
    b.box(
      S.art.get("sand", "#c7b491"),
      x,
      w.height(x, z) + 0.03,
      z,
      3.4,
      0.1,
      3.2,
      0.6,
    );
  }
  function stoneW() {
    return wall;
  }
}
