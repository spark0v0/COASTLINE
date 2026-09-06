import { THREE, geometryFromTriangles, mesh } from "./kit.js";

// Lighthouse, marina and the coastal approach planting.
export function buildCoast(S) {
  const w = S.world,
    b = S.batch,
    stone = S.art.get("stone", "#d4c3a3"),
    white = S.art.get("stucco", "#efe2c4"),
    roof = S.art.get("roof", "#b97552");
  // Lighthouse is off the driving surface, on the seaward side of the coastal approach.
  const cp = w.pointAt(w.routeLength * 0.75),
    x = cp.x + 25,
    z = cp.z,
    y = w.height(x, z);
  b.add("cylinder", stone, [x, y + 0.6, z], [7, 1.2, 7]);
  b.add("cylinder", white, [x, y + 12, z], [3.3, 23, 3.3]);
  b.add("cylinder", roof, [x, y + 15, z], [3.1, 2.1, 3.1]);
  b.add("cylinder", stone, [x, y + 24, z], [4.2, 0.5, 4.2]);
  b.add("cylinder", "#57797b", [x, y + 26, z], [2.7, 3, 2.7]);
  b.add("cone", roof, [x, y + 28.3, z], [3.7, 2.2, 3.7]);
  w.register({ type: "circle", x, z, r: 5 });
  for (let i = 0; i < 8; i++) {
    const a = (i * Math.PI) / 4;
    b.box(
      "#546761",
      x + Math.cos(a) * 3.8,
      y + 24.2,
      z + Math.sin(a) * 3.8,
      0.09,
      1,
      0.09,
    );
  }
  // Marina sits beyond the southern shoreline, with a pier linked to the
  // harbour road that runs down from the town's south street.
  const harbor = w.harbor;
  const hx = harbor.x,
    hz = harbor.z;
  const wood = S.art.get("wood", "#b59b73");
  b.box(wood, hx, 0.2, hz + 20, 7, 0.7, 85);
  b.box(wood, hx + 25, 0.2, hz + 57, 57, 0.7, 5);
  for (let i = 0; i < 5; i++) {
    const xx = hx + 5 + i * 11,
      zz = hz + 71;
    b.box(wood, xx, 0.2, zz - 2, 2, 0.65, 27);
    b.add(
      "sphere",
      "#e9e0c7",
      [xx + 4, 0.05, zz],
      [2.1, 0.85, 6],
      [0, 0.12, 0],
    );
    b.box("#d8ccb0", xx + 4, 0.45, zz, 2.7, 0.9, 5);
    b.box("#365563", xx + 4, 1.32, zz, 2.45, 0.55, 3.4);
    b.add("cylinder", "#d4d3bc", [xx + 4, 6, zz], [0.07, 11, 0.07]);
    const sail = [xx + 4, 11, zz, xx + 4, 2, zz, xx + 8, 2, zz];
    mesh(
      geometryFromTriangles(sail),
      new THREE.MeshStandardMaterial({
        color: "#eee7cb",
        side: THREE.DoubleSide,
      }),
      S.group,
    );
  }
  // Low roadside planting and street lamps keep the coastal sightline clear.
  const route = w.route;
  for (let i = 0; i < route.length - 1; i += 14) {
    const p = route[i],
      q = route[i + 1];
    if (p.x < 470 || p.z < -190 || p.z > 790) continue;
    const dx = q.x - p.x,
      dz = q.z - p.z,
      len = Math.hypot(dx, dz) || 1;
    const x = p.x - (dz / len) * 20,
      z = p.z + (dx / len) * 20,
      y = w.height(x, z);
    if (w.isJunction(x, z, 0, 5)) continue;
    b.box(S.art.get("stone", "#d6c7a6"), x, y - 0.1, z, 2.5, 0.5, 1.2);
    for (let j = 0; j < 3; j++)
      b.add(
        "sphere",
        j % 2 ? "#86945b" : "#637d4e",
        [x + j * 0.65 - 0.65, y + 0.55, z],
        [0.7, 0.65, 0.65],
      );
    if (i % 28 === 0) {
      b.box("#455e58", x + 2, y, z, 0.13, 5.2, 0.13);
      b.box("#e9dcc0", x + 2, y + 5.1, z, 0.65, 0.3, 0.65);
    }
  }
}
