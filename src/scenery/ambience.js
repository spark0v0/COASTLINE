import { THREE, mesh, textTexture } from "./kit.js";

// Town gate where the coast road enters the old town, plus global dressing:
// faceted rock outcrops, vista signposts and the circling birds.
export function buildAmbience(S) {
  const w = S.world,
    b = S.batch,
    white = S.art.get("stucco", "#e8e7df"),
    roof = S.art.get("stucco", "#344950");
  const gate = w.pointAt(w.routeLength * 0.955),
    gRight = { x: Math.cos(gate.yaw), z: Math.sin(gate.yaw) };
  const gx = gate.x,
    gz = gate.z,
    gy = w.height(gx, gz),
    gYaw = Math.atan2(-Math.cos(gate.yaw), Math.sin(gate.yaw));
  for (const side of [-1, 1]) {
    const qx = gx + gRight.x * 8.8 * side,
      qz = gz + gRight.z * 8.8 * side;
    b.box(white, qx, gy, qz, 0.5, 6.1, 0.8, gYaw);

    w.register({
      type: "box",
      x: qx,
      z: qz,
      w: 0.5,
      d: 0.8,
      h: 6.2,
      yaw: gYaw,
    });
  }
  b.box(roof, gx, gy + 5.9, gz, 0.85, 0.28, 19, gYaw);
  const gateSign = textTexture("棕 榈 港", { bg: "#efe2c4", fg: "#8a4436" });
  for (const flip of [1, -1]) {
    mesh(
      new THREE.PlaneGeometry(6.4, 1.15),
      new THREE.MeshStandardMaterial({
        map: gateSign,
        roughness: 0.8,
        side: THREE.DoubleSide,
      }),
      S.group,
      [gx, gy + 4.9, gz],
      [0, -gate.yaw + (flip === 1 ? 0 : Math.PI), 0],
      [1, 1, 1],
      false,
    );
  }
  // Rock outcrops give mountains and sea cliffs a sense of geological scale.
  const r = S.rng511;
  const rock = S.art.get("stone", "#b3a68b");
  b.geometries.rock0 = S.makeRock(1);
  b.geometries.rock1 = S.makeRock(2);
  b.geometries.rock2 = S.makeRock(3);
  for (let i = 0; i < 340; i++) {
    const x = -1080 + r() * 1800,
      z = -1150 + r() * 2150;
    if (!w.inside(x, z) || (z > -350 && x < 570)) continue;
    const near = w.roadGrid.has(Math.floor(x / 32) + "," + Math.floor(z / 32))
      ? w.nearestRoad(x, z)
      : null;
    const size = 2.2 + r() * 5.5;
    if (near && near.d < near.width / 2 + size + 5) continue;
    const y = w.height(x, z);
    b.add(
      "rock" + (i % 3),
      rock,
      [x, y + size * 0.24, z],
      [size, size * (0.55 + r() * 0.75), size * (0.7 + r() * 0.3)],
      [r() * 0.5, r() * 6, r() * 0.3],
    );
  }
  for (const d of w.discoveries) {
    const fx = Math.sin(d.yaw),
      fz = -Math.cos(d.yaw);
    const x = d.x - fz * 14,
      z = d.z + fx * 14,
      y = w.height(x, z);
    b.box("#51665b", x, y, z, 0.15, 3.8, 0.15);
    mesh(
      new THREE.PlaneGeometry(4.8, 1.4),
      new THREE.MeshStandardMaterial({
        map: textTexture(d.name),
        side: THREE.DoubleSide,
      }),
      S.group,
      [x, y + 3.3, z],
      [0, -d.yaw, 0],
    );
  }
  S.birds = new THREE.Group();
  S.group.add(S.birds);
  const birdGeo = S.geometryFromTriangles([
    -0.9, 0, 0, 0, 0.16, 0, -0.3, 0, 0.22, 0, 0.16, 0, 0.9, 0, 0, 0.3, 0, 0.22,
  ]);
  const bm = new THREE.MeshBasicMaterial({
    color: "#f5ecda",
    side: THREE.DoubleSide,
  });
  for (let i = 0; i < 7; i++)
    mesh(
      birdGeo,
      bm,
      S.birds,
      [i * 9, Math.sin(i) * 3, (i % 3) * 6],
      [0, i * 0.2, 0],
      [1, 1, 1],
      false,
    );
}
