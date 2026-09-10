import { THREE, rng, geometryFromTriangles } from "./kit.js";
import { ResortKit } from "./resort-kit.js";
import { groundPath, groundBed } from "./ground-patches.js";
import { tourFrame } from "../scenic-route.js";

// The residential verge is a connected planted edge, not furniture on pads.
export function buildRouteLandscape(S) {
  const w = S.world,
    b = S.batch,
    random = rng(71943),
    leaf = S.treeLeafMaterials[1];
  const agave = [];
  for (let i = 0; i < 17; i++) {
    const a = i * 2.39996,
      len = 0.65 + (i % 4) * 0.12,
      dx = Math.cos(a),
      dz = Math.sin(a),
      span = 0.075;
    const root = [0, 0, 0],
      left = [dx * len * 0.43 - dz * span, 0.27, dz * len * 0.43 + dx * span],
      right = [dx * len * 0.43 + dz * span, 0.27, dz * len * 0.43 - dx * span],
      tip = [dx * len, 0.14 + (i % 3) * 0.12, dz * len];
    agave.push(...root, ...left, ...tip, ...root, ...tip, ...right);
  }
  b.geometries.agave = geometryFromTriangles(agave);
  const succulent = new THREE.MeshStandardMaterial({
    color: "#6f9182",
    roughness: 0.88,
    side: THREE.DoubleSide,
  });
  const paths = [];
  for (const h of w.buildings.filter((h) => h.scenicStyle !== undefined)) {
    const road = w.nearestRoad(h.x, h.z),
      front =
        -(road.x - h.x) * Math.sin(h.yaw) + (road.z - h.z) * Math.cos(h.yaw),
      yaw = h.yaw + (front < 0 ? Math.PI : 0),
      site = { x: h.x, z: h.z, yaw, y: w.height(h.x, h.z) },
      k = new ResortKit(S, site);
    k.followTerrain = true;
    const offset = h.d / 2 + 1.6;
    for (const side of [-1, 1]) {
      const x = side * h.w * 0.31;
      k.box(k.stone, x, -0.09, offset, h.w * 0.27, 0.68, 0.27, true);
      k.solid(x, offset, h.w * 0.27, 0.27, 0.6);
      groundBed(S, site, x, offset - 1, h.w * 0.18, 1.3, h.seed + side);
      for (let j = 0; j < 5; j++) {
        const xx = x + (j - 2) * h.w * 0.06;
        k.add(
          "treeCrown" + (j % 3),
          leaf,
          xx,
          0.49,
          offset - 0.8,
          0.55,
          0.49,
          0.46,
          [0, j * 1.7, 0],
        );
      }
      k.add(
        "agave",
        succulent,
        side * h.w * 0.45,
        0.025,
        offset + 0.3,
        0.68,
        0.8,
        0.68,
        [0, h.seed, 0],
      );
    }
    const start = k.p(0, 0, h.d / 2 - 0.05),
      dx = h.x - road.x,
      dz = h.z - road.z,
      distance = Math.hypot(dx, dz),
      end = {
        x: road.x + (dx / distance) * (road.width / 2 + 1.8),
        z: road.z + (dz / distance) * (road.width / 2 + 1.8),
      },
      ex = (end.x - h.x) * k.c + (end.z - h.z) * k.s,
      ez = -(end.x - h.x) * k.s + (end.z - h.z) * k.c;
    groundPath(
      S,
      site,
      [
        [0, h.d / 2 - 0.05],
        [ex * 0.5, (h.d / 2 + ez) * 0.5],
        [ex, ez],
      ],
      3.3,
      "paving",
      "#c6c0af",
    );
    paths.push({ a: { x: start[0], z: start[2] }, b: end, width: 3.3 });
  }
  w.gardenPaths = [...(w.gardenPaths || []), ...paths];
  const pathClear = (x, z) =>
    !paths.some((p) => {
      const dx = p.b.x - p.a.x,
        dz = p.b.z - p.a.z,
        t = Math.max(
          0,
          Math.min(
            1,
            ((x - p.a.x) * dx + (z - p.a.z) * dz) / (dx * dx + dz * dz || 1),
          ),
        );
      return Math.hypot(x - p.a.x - dx * t, z - p.a.z - dz * t) < 2.1;
    });
  const grass = new THREE.MeshStandardMaterial({
    color: "#ffffff",
    roughness: 1,
    vertexColors: true,
    side: THREE.DoubleSide,
  });
  const clear = (x, z) => {
    const road = w.nearestRoad(x, z);
    return (
      w.inside(x, z) &&
      w.height(x, z) > 0.8 &&
      road.d > road.width / 2 + 2.45 &&
      pathClear(x, z) &&
      !w.buildings.some(
        (h) => Math.hypot(x - h.x, z - h.z) < Math.hypot(h.w, h.d) / 2 + 0.8,
      )
    );
  };
  // Density follows broad patches; short grass leaves the turn apex readable.
  for (let x = 42; x < 593; x += 3.6) {
    const f = tourFrame(w, x);
    for (const side of [-1, 1])
      for (let j = 0; j < 4; j++) {
        const off = 7.1 + random() * 10.5,
          xx = f.x + f.nx * off * side + (random() - 0.5) * 4,
          zz = f.z + f.nz * off * side + (random() - 0.5) * 3;
        if (
          !clear(xx, zz) ||
          random() < 0.2 + 0.16 * Math.sin(x * 0.051 + side)
        )
          continue;
        const size = 0.6 + random() * 0.5;
        b.add(
          "meadow",
          grass,
          [xx, w.height(xx, zz) - 0.035, zz],
          [size, 0.5 + random() * 0.37, size],
          [0, random() * 6.28, 0],
          false,
        );
        if (j === 0 && Math.sin(x * 0.13) > 0)
          b.add(
            "treeCrown" + (Math.floor(x) % 3),
            leaf,
            [xx, w.height(xx, zz) + 0.26, zz],
            [0.7, 0.34, 0.55],
            [0, x, 0],
          );
      }
  }
  // A shaded community entrance between residential clusters, with real paths.
  const f = tourFrame(w, 220),
    site = {
      x: f.x + f.nx * 14,
      z: f.z + f.nz * 14,
      yaw: f.angle + Math.PI,
      y: w.height(f.x + f.nx * 14, f.z + f.nz * 14),
    };
  const k = new ResortKit(S, site);
  k.followTerrain = true;
  groundPath(
    S,
    site,
    [
      [0, 7],
      [0, 2],
      [-3, -2],
      [-6, -4],
    ],
    2.3,
    "paving",
    "#c6c0af",
  );
  groundBed(S, site, 3, -2, 3.6, 2.2, 11);
  k.box(k.stone, -3, -0.1, -0.8, 2.3, 0.49, 0.5, true);
  k.box(k.wood, -3, 0.39, -0.8, 2.4, 0.07, 0.58, true);
  k.solid(-3, -0.8, 2.4, 0.58, 0.5);
  for (let i = 0; i < 8; i++)
    k.add(
      "agave",
      succulent,
      2 + Math.cos(i * 2.4) * 2,
      0.02,
      -2 + Math.sin(i * 2.4) * 1.4,
      0.6,
      0.75,
      0.6,
      [0, i, 0],
    );
}
