// Ridge-top landmarks: the chapel before the summit and the summit pull-off.
export function buildRidge(S) {
  const w = S.world,
    b = S.batch,
    white = S.art.get("stucco", "#efe2c4"),
    roof = S.art.get("roof", "#b97552");
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
}
