import { THREE, mesh, rng } from "./kit.js";
import { ResortKit } from "./resort-kit.js";
import { groundBed, groundPath } from "./ground-patches.js";

// Authored land-side compositions preserve the sea-facing aperture. The
// limestone is buried into the shared terrain instead of sitting on plinths.
export function buildScenicCoast(S) {
  const w = S.world,
    random = rng(99091),
    stone = S.art.get("limestone", "#c5c0ae", 0.92);
  const occupied = (x, z, r) =>
    w.obstacles.some(
      (o) =>
        Math.hypot(x - o.x, z - o.z) <
        r + (o.r ?? Math.hypot(o.w, o.d) / 2) + 1,
    );
  for (const [cx, cz, rx, rz] of [
    [480, 475, 26, 17],
    [561, 421, 35, 21],
    [580, 345, 21, 25],
    [706, 348, 8, 21],
  ]) {
    const site = { x: cx, z: cz, yaw: 0, y: w.height(cx, cz) };
    const kit = new ResortKit(S, site);
    kit.followTerrain = true;
    groundBed(S, site, 0, 0, rx * 0.83, rz * 0.7, cx);
    for (let i = 0; i < 28; i++) {
      const a = i * 2.39996,
        radius = Math.sqrt(random()),
        x = cx + Math.cos(a) * rx * radius,
        z = cz + Math.sin(a) * rz * radius,
        road = w.nearestRoad(x, z),
        size = 1.3 + random() * 2.3;
      if (
        !w.inside(x, z) ||
        w.height(x, z) < 0.8 ||
        road.d < road.width / 2 + size + 4 ||
        occupied(x, z, size)
      )
        continue;
      if (i % 3 === 0) {
        S.batch.add(
          "rock" + (i % 3),
          stone,
          [x, w.height(x, z) - 0.38, z],
          [size, size * 0.63, size * 0.84],
          [0.1, random() * 6, 0.12],
        );
        w.register({ type: "circle", x, z, r: size * 0.7 });
      } else {
        const leaf = S.treeLeafMaterials[i % 4];
        S.batch.add(
          "treeCrown" + (i % 3),
          leaf,
          [x, w.height(x, z) + 0.5, z],
          [size * 0.7, 0.85, size * 0.6],
          [0, a, 0],
        );
      }
    }
  }
  // A real roadside pull-off, with furniture only along its seaward edge.
  const site = { x: 696, z: 245, y: w.height(696, 245), yaw: -Math.PI / 2 };
  const k = new ResortKit(S, site);
  k.followTerrain = true;
  groundPath(
    S,
    site,
    [
      [-17, -1],
      [-9, -1.4],
      [0, -1],
      [9, -0.3],
      [17, 1],
    ],
    2.6,
    "paving",
    "#bfb8a5",
  );
  for (const x of [-9, 3]) {
    k.box(k.stone, x, -0.16, 0, 3, 0.53, 0.6, true);
    k.box(k.wood, x, 0.37, 0, 3.12, 0.075, 0.68, true);
    k.solid(x, 0, 3.12, 0.68, 0.46);
  }
  for (let x = -18; x < 18; x += 2.7) {
    k.tube(k.metal, [x, 0, 3.1], [x, 1.04, 3.1], 0.036);
    k.tube(k.metal, [x, 1.04, 3.1], [x + 2.7, 1.04, 3.1], 0.034);
    k.tube(k.metal, [x, 0.51, 3.1], [x + 2.7, 0.51, 3.1], 0.019);
    k.solid(x + 1.35, 3.1, 2.7, 0.1, 1.04);
  }
  // Sign faces the arriving car; its post has an explicit, small collider.
  const sign = new ResortKit(S, {
    x: 688,
    z: 263,
    y: w.height(688, 263),
    yaw: 0,
  });
  sign.tube(sign.metal, [0, 0, 0], [0, 2.5, 0], 0.045);
  sign.sign("晴湾观景台 / BELVEDERE", 0, 2.15, 0, 3.6, 0.54);
  sign.solid(0, 0, 0.14, 0.14, 2.5);
  // Off-shore limestone skerries: three distinct silhouettes provide depth
  // against the horizon. They are decorative islands, outside the driveable map.
  for (const [x, z, rx, rz, height, seed] of [
    [934, 140, 64, 39, 23, 2],
    [1100, -70, 103, 55, 37, 5],
    [991, 630, 47, 62, 17, 8],
  ]) {
    const vertices = [],
      colors = [],
      indices = [],
      rings = 14,
      segments = 64;
    for (let j = 0; j <= rings; j++)
      for (let i = 0; i <= segments; i++) {
        const a = (i / segments) * Math.PI * 2,
          r = j / rings,
          shape =
            1 + 0.11 * Math.sin(a * 3 + seed) + 0.065 * Math.sin(a * 7 - seed),
          xx = Math.cos(a) * r * rx * shape,
          zz = Math.sin(a) * r * rz * shape,
          hh =
            Math.pow(Math.max(0, 1 - r * r), 1.65) *
              height *
              (0.82 + 0.14 * Math.sin(a * 2 + r * 4 + seed)) -
            0.85;
        vertices.push(x + xx, hh, z + zz);
        const c = new THREE.Color(hh > height * 0.44 ? "#84917c" : "#c6c4b6");
        colors.push(c.r, c.g, c.b);
      }
    for (let j = 0; j < rings; j++)
      for (let i = 0; i < segments; i++) {
        const a = j * (segments + 1) + i,
          b = a + 1,
          c = b + segments + 1,
          d = c - 1;
        indices.push(a, b, d, b, c, d);
      }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(vertices, 3));
    g.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
    g.setIndex(indices);
    g.computeVertexNormals();
    S.skerryMaterial ||= new THREE.MeshStandardMaterial({
      color: "#ffffff",
      vertexColors: true,
      roughness: 0.96,
      side: THREE.DoubleSide,
    });
    mesh(g, S.skerryMaterial, S.group, [0, 0, 0], [0, 0, 0], [1, 1, 1], false);
  }
}
