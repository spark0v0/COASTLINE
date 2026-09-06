// Terraced orchards fill the valley with organized, region-specific planting.
export function buildValley(S) {
  const w = S.world,
    b = S.batch;
  const orchard = S.art.get("grass", "#b0a16a");
  for (let row = 0; row < 8; row++) {
    const x = -705 - row * 8,
      z = 15;
    const road = w.nearestRoad(x, z);
    if (road.d < 22) continue;
    b.box(orchard, x, w.height(x, z) - 0.12, z, 2, 0.15, 75);
    for (let k = 0; k < 6; k++) {
      const zz = z - 32 + k * 12;
      if (w.nearestRoad(x, zz).d < 17) continue;
      b.add("sphere", "#778759", [x, w.height(x, zz) + 2, zz], [2, 1.5, 2]);
    }
  }
}
