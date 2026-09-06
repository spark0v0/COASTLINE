import { THREE, geometryFromTriangles, mesh, rng } from "./kit.js";

// Lighthouse, marina, coastal planting and the beach leisure strip.
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
  // Keeper's cottage and a low plot wall complete the lighthouse ground.
  const kx = x + 14,
    kz = z - 9,
    ky = w.height(kx, kz);
  b.box(white, kx, ky, kz, 6, 3.4, 4.6, 0.4);
  b.add("roof", roof, [kx, ky + 4.4, kz], [4.6, 1.6, 3.4], [0, 0.4, 0]);
  b.box("#385955", kx, ky + 0.2, kz + 2.4, 1.1, 2.2, 0.12, 0.4);
  b.box("#546761", kx + 1.6, ky + 1.4, kz + 2.35, 0.9, 0.9, 0.08, 0.4);
  w.register({ type: "box", x: kx, z: kz, w: 6.5, d: 5, h: 4.6, yaw: 0.4 });
  for (let i = 0; i < 14; i++) {
    if (i === 6 || i === 7) continue; // gate gap facing the road
    const a = (i / 14) * Math.PI * 2;
    const wx = x + Math.cos(a) * 12,
      wz = z + Math.sin(a) * 12,
      wy = w.height(wx, wz);
    b.box(stone, wx, wy, wz, 2.4, 0.8, 0.35, -a);
  }
  b.add(
    "sphere",
    "#637c49",
    [x + 9, w.height(x + 9, z + 3) + 0.9, z + 3],
    [1.1, 0.95, 1.1],
  );
  // Marina sits beyond the southern shoreline, with a pier linked to the
  // harbour road that runs down from the town's south street.
  const harbor = w.harbor;
  const hx = harbor.x,
    hz = harbor.z;
  const wood = S.art.get("wood", "#b59b73");
  b.box(wood, hx, 0.2, hz + 20, 7, 0.7, 85);
  b.box(wood, hx + 25, 0.2, hz + 57, 57, 0.7, 5);
  // Mooring bollards along both pier edges.
  for (let i = 0; i < 9; i++)
    for (const s2 of [-1, 1])
      b.add(
        "cylinder",
        "#546761",
        [hx + s2 * 2.9, 0.72, hz + 6 + i * 9.5],
        [0.16, 0.5, 0.16],
      );
  // Fishing crates and floats piled at the pier head.
  b.box(wood, hx + 26, 0.55, hz + 100, 1.4, 0.7, 1.4);
  b.box(wood, hx + 24.6, 0.55, hz + 101, 1.2, 0.7, 1.2);
  b.add("sphere", "#c9b27c", [hx + 25.5, 1.2, hz + 100.5], [0.5, 0.5, 0.5]);
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
  buildBeachLife(S);
}

// Parasols, loungers, bathing huts and a boardwalk on the sandy stretches.
function buildBeachLife(S) {
  const w = S.world,
    b = S.batch;
  const r = rng(7301);
  const wood = S.art.get("wood", "#b59b73");
  const parasol = ["#c2543f", "#3f7f8c", "#c2b280"];
  let group = 0;
  for (let i = 1; i < w.shore.length; i += 9) {
    const p = w.shore[i];
    if (w.height(p.x, p.z) > 8 || w.height(p.x, p.z) < 0.5) continue;
    if (w.nearestRoad(p.x, p.z).d < 14) continue;
    // Inland offset so everything sits on dry sand.
    const dx = w.center.x - p.x,
      dz = -p.z,
      len = Math.hypot(dx, dz) || 1;
    const bx = p.x + (dx / len) * 9,
      bz = p.z + (dz / len) * 9,
      by = w.height(bx, bz);
    const col = parasol[group % 3];
    group++;
    if (group % 3 !== 0) {
      // Parasol with a lounger beneath it.
      b.add("cylinder", wood, [bx, by + 1.2, bz], [0.05, 2.4, 0.05]);
      b.add(
        "cone",
        col,
        [bx, by + 2.5, bz],
        [1.7, 0.55, 1.7],
        [0, r() * 3, 0],
        false,
      );
      b.box(wood, bx + 1.6, by + 0.3, bz + 0.4, 0.7, 0.1, 1.9, r() * 3);
      b.box(
        wood,
        bx + 1.6,
        by + 0.55,
        bz - 0.2,
        0.7,
        0.1,
        1.0,
        r() * 0.6 + 1.1,
        false,
      );
    } else {
      // Bathing-hut row on the wider sand.
      for (let k = 0; k < 3; k++) {
        const hx = bx + k * 3.2,
          hy = w.height(hx, bz);
        b.box(wood, hx, hy, bz, 2.1, 2.3, 2.0);
        b.box("#8a6a4c", hx, hy + 2.3, bz, 2.3, 0.16, 2.3);
        b.box("#385955", hx, hy + 0.7, bz + 1.02, 0.7, 1.4, 0.08);
        w.register({
          type: "box",
          x: hx,
          z: bz,
          w: 2.2,
          d: 2.1,
          h: 2.4,
          yaw: 0,
        });
      }
    }
    if (group === 4) {
      // One boardwalk ramping from the road side down to the waterline.
      for (let k = 0; k < 12; k++) {
        const px2 = bx + (dx / len) * (k * -1.6) + 6,
          pz2 = bz + (dz / len) * (k * -1.6),
          py2 = w.height(px2, pz2);
        b.box(wood, px2, py2 + 0.12, pz2, 2.2, 0.16, 1.5);
      }
    }
  }
  // Half-sunk reef clusters between the beach groups.
  for (let i = 0; i < 16; i++) {
    const p = w.shore[Math.floor((i / 16) * w.shore.length)];
    if (w.height(p.x, p.z) > 10) continue;
    if (w.nearestRoad(p.x, p.z).d < 18) continue;
    const bx =
        p.x + (w.center.x - p.x) * 0.004 * ((i % 3) + 1) + (r() - 0.5) * 20,
      bz = p.z + (r() - 0.5) * 16,
      by = -0.35 - r() * 0.3;
    b.add(
      "rock" + (i % 3),
      S.art.get("stone", "#a89980"),
      [bx, by, bz],
      [1.6 + r() * 1.6, 1.0 + r(), 1.4 + r()],
      [r() * 0.4, r() * 6, r() * 0.3],
      false,
    );
  }
}
