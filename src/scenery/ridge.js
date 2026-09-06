import { rng } from "./kit.js";

// Ridge-top landmarks: chapel, summit pull-off, scree slopes, retaining
// walls, a ruined watchtower on the cliffs and a mountain hut.
export function buildRidge(S) {
  const w = S.world,
    b = S.batch,
    white = S.art.get("stucco", "#efe2c4"),
    roof = S.art.get("roof", "#b97552");
  const stone = S.art.get("stone", "#a89980");
  const wood = S.art.get("wood", "#8a7355");
  const r = rng(6612);
  // A small hilltop chapel is visible before the climb reaches its summit.
  const summit = w.pointAt(w.routeLength * 0.4),
    sx = summit.x - 36,
    sz = summit.z - 28,
    sy = w.height(sx, sz);
  if (w.nearestRoad(sx, sz).d > 20) {
    b.box(white, sx, sy, sz, 12, 7, 17);
    b.add("roof", roof, [sx, sy + 9, sz], [9, 3, 12]);
    b.box(white, sx + 8, sy, sz, 4, 14, 4);
    b.add("cone", roof, [sx + 8, sy + 15, sz], [3.2, 3, 3.2]);
    b.box("#385955", sx, sy + 0.2, sz + 8.55, 2.2, 3.2, 0.1);
    w.register({ type: "box", x: sx, z: sz, w: 22, d: 18, h: 15, yaw: 0 });
  }
  // Ridge-top pull-off just before the summit hairpin: the place to stop
  // and look back over the island.
  const vp = w.pointAt(w.routeLength * 0.393),
    vRight = { x: Math.cos(vp.yaw), z: Math.sin(vp.yaw) };
  const px = vp.x + vRight.x * 15,
    pz = vp.z + vRight.z * 15,
    py = w.height(px, pz);
  const railYaw = Math.atan2(-Math.sin(vp.yaw), Math.cos(vp.yaw));
  b.box(S.art.get("stone", "#cdbf9f"), px, py - 0.15, pz, 9, 0.5, 10, railYaw);
  const rxC = px + vRight.x * 4.6,
    rzC = pz + vRight.z * 4.6;
  b.box("#c5ccbd", rxC, py + 0.75, rzC, 0.22, 1.1, 10, railYaw);
  w.register({
    type: "box",
    x: rxC,
    z: rzC,
    w: 0.3,
    d: 10,
    h: 1.2,
    yaw: vp.yaw,
  });
  for (let i = -2; i <= 2; i++) {
    const qx = rxC + Math.sin(vp.yaw) * i * 2.2,
      qz = rzC - Math.cos(vp.yaw) * i * 2.2;
    b.box("#8d9385", qx, py + 0.2, qz, 0.16, 0.9, 0.16, railYaw);
  }
  b.add("sphere", "#6f8a5c", [px - 3.4, py + 1.1, pz], [0.9, 0.8, 0.9]);
  b.add("sphere", "#86945b", [px + 3.6, py + 1.1, pz], [0.85, 0.75, 0.85]);
  // Mountain hut tucked on the inner side opposite the pull-off.
  const hp = w.pointAt(w.routeLength * 0.398),
    hrx = Math.cos(hp.yaw),
    hrz = Math.sin(hp.yaw);
  const hx = hp.x - hrx * 24,
    hz = hp.z - hrz * 24,
    hy = w.height(hx, hz);
  if (w.nearestRoad(hx, hz).d > 16) {
    b.box(wood, hx, hy, hz, 7, 3.4, 5.2, hp.yaw);
    b.add(
      "roof",
      S.art.get("roof", "#8a6a4c"),
      [hx, hy + 4.3, hz],
      [5.6, 2.0, 5.8],
      [0, -hp.yaw, 0],
    );
    b.box("#385955", hx, hy + 0.6, hz + 2.55, 1.2, 2.3, 0.12, hp.yaw);
    b.box(
      "#f6ecd2",
      hx - 1.9,
      hy + 1.5,
      hz + 2.62,
      1.0,
      0.9,
      0.08,
      hp.yaw,
      false,
    );
    b.add("cylinder", stone, [hx + 2.4, hy + 4.6, hz - 1], [0.3, 1.7, 0.3]);
  }
  // Scree: small rock piles sprinkled along the mountain road.
  for (let s = 0.3; s < 0.55; s += 0.006) {
    if (r() > 0.4) continue;
    const p = w.pointAt(w.routeLength * s);
    const rx = Math.cos(p.yaw),
      rz = Math.sin(p.yaw);
    const side = r() > 0.5 ? 1 : -1;
    const d = 13 + r() * 8;
    const x = p.x + rx * d * side,
      z = p.z + rz * d * side;
    if (w.nearestRoad(x, z).d < 11) continue;
    const n = 3 + Math.floor(r() * 4);
    for (let k = 0; k < n; k++) {
      const sx2 = x + (r() - 0.5) * 4.5,
        sz2 = z + (r() - 0.5) * 4.5,
        size = 0.4 + r() * 0.9;
      b.add(
        "rock" + (k % 3),
        stone,
        [sx2, w.height(sx2, sz2) + size * 0.3, sz2],
        [size, size * 0.8, size],
        [r(), r() * 6, r()],
        false,
      );
    }
  }
  // Dry-stone retaining walls on the outside of the tight bends.
  for (let s = 0.28; s < 0.6; s += 0.004) {
    const p = w.pointAt(w.routeLength * s);
    const q = w.pointAt(Math.min(w.routeLength, w.routeLength * (s + 0.006)));
    const bend = Math.atan2(Math.sin(q.yaw - p.yaw), Math.cos(q.yaw - p.yaw));
    if (Math.abs(bend) < 0.07) continue;
    const side = bend > 0 ? -1 : 1;
    const rx = Math.cos(p.yaw),
      rz = Math.sin(p.yaw);
    const x = p.x + rx * 9.2 * side,
      z = p.z + rz * 9.2 * side;
    if (w.nearestRoad(x, z).d < 8.6) continue;
    b.box(stone, x, w.height(x, z) - 0.5, z, 0.6, 1.6, 4.2, p.yaw);
    // Solid stone: the car must not pass through the wall.
    w.register({
      type: "box",
      x,
      z,
      w: 0.7,
      d: 4.2,
      h: 1.6,
      yaw: p.yaw,
    });
  }
  // Ruined watchtower on the cliffs, seaward of the road.
  const tp = w.pointAt(w.routeLength * 0.585),
    trx = Math.cos(tp.yaw),
    trz = Math.sin(tp.yaw);
  const hL = w.height(tp.x - trx * 30, tp.z - trz * 30),
    hR = w.height(tp.x + trx * 30, tp.z + trz * 30);
  const seaSide = hL < hR ? -1 : 1;
  const tx = tp.x + trx * 30 * seaSide,
    tz = tp.z + trz * 30 * seaSide,
    ty = w.height(tx, tz);
  if (w.nearestRoad(tx, tz).d > 20) {
    b.add("cylinder", stone, [tx, ty + 0.8, tz], [3.4, 1.6, 3.4]);
    b.add("cylinder", stone, [tx, ty + 3.2, tz], [3.1, 3.2, 3.1]);
    b.add("cylinder", stone, [tx, ty + 6, tz], [2.9, 2.4, 2.9]);
    for (let k = 0; k < 6; k++) {
      const a = (k / 6) * Math.PI * 2,
        hh = 1.1 + r() * 1.9;
      b.box(
        stone,
        tx + Math.cos(a) * 2.5,
        ty + 7.2,
        tz + Math.sin(a) * 2.5,
        2.2,
        hh,
        1.1,
        a,
      );
    }
    b.add(
      "sphere",
      "#4f6b45",
      [tx + 1, ty + 8.7, tz - 0.5],
      [1.3, 0.6, 1.3],
      [0, 0, 0],
      false,
    );
    for (let k = 0; k < 5; k++) {
      const wx = tx + 5.5 + k * 1.8,
        wz = tz + 2 + Math.sin(k) * 0.8;
      b.box(
        stone,
        wx,
        w.height(wx, wz) - 0.2 + r() * 0.4,
        wz,
        1.7,
        0.7 - k * 0.1,
        0.5,
        0.5,
      );
    }
    w.register({ type: "circle", x: tx, z: tz, r: 3.6 });
  }
  // Clifftop wooden fence on the seaward side of the cliff road.
  for (let s = 0.55; s < 0.65; s += 0.0009) {
    const p = w.pointAt(w.routeLength * s);
    const rx = Math.cos(p.yaw),
      rz = Math.sin(p.yaw);
    const lh = w.height(p.x - rx * 26, p.z - rz * 26),
      rh = w.height(p.x + rx * 26, p.z + rz * 26);
    const sd = lh < rh ? -1 : 1;
    const x = p.x + rx * 9.5 * sd,
      z = p.z + rz * 9.5 * sd;
    if (w.nearestRoad(x, z).d < 8.6) continue;
    const y = w.height(x, z);
    b.add("cylinder", wood, [x, y + 0.55, z], [0.09, 1.1, 0.09]);
    b.box(wood, x, y + 0.98, z, 0.07, 0.09, 5.6, p.yaw, false);
    b.box(wood, x, y + 0.58, z, 0.07, 0.07, 5.6, p.yaw, false);
  }
}
