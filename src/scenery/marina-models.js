import { THREE, quad, geometryFromTriangles } from "./kit.js";
import { ResortKit } from "./resort-kit.js";

export function buildSailboat(S, x, z, index) {
  const k = new ResortKit(S, { x, z, y: -0.3, yaw: (index - 2) * 0.045 });
  if (!S.batch.geometries.sailingHull) {
    const sections = [
      [-5, 0.025, 0.08],
      [-3.8, 1.23, -0.5],
      [-1.8, 1.62, -0.92],
      [1.6, 1.6, -0.82],
      [4.4, 1.18, -0.48],
    ];
    const ring = ([z, w, bottom]) => [
      [-w, 0.57, z],
      [-w * 0.9, -0.12, z],
      [0, bottom, z],
      [w * 0.9, -0.12, z],
      [w, 0.57, z],
    ];
    const p = [];
    for (let i = 1; i < sections.length; i++) {
      const a = ring(sections[i - 1]),
        b = ring(sections[i]);
      for (let j = 0; j < 4; j++) quad(p, a[j], b[j], b[j + 1], a[j + 1]);
      quad(p, a[0], a[4], b[4], b[0]);
    }
    const end = ring(sections.at(-1));
    for (let i = 1; i < 4; i++) p.push(...end[0], ...end[i], ...end[i + 1]);
    S.batch.geometries.sailingHull = geometryFromTriangles(p);
    const sail = [],
      N = 10,
      point = (u, v) => [
        3.1 * u * (1 - v),
        1.65 + 8.1 * v,
        -0.3 + Math.sin(u * Math.PI) * 0.52 * (1 - v),
      ];
    for (let i = 0; i < N; i++)
      for (let j = 0; j < N; j++)
        quad(
          sail,
          point(i / N, j / N),
          point((i + 1) / N, j / N),
          point((i + 1) / N, (j + 1) / N),
          point(i / N, (j + 1) / N),
        );
    S.batch.geometries.fullSail = geometryFromTriangles(sail);
    S.sailHullMaterial = new THREE.MeshStandardMaterial({
      color: "#e8e8dc",
      roughness: 0.36,
      side: THREE.DoubleSide,
    });
    S.sailClothMaterial = new THREE.MeshStandardMaterial({
      color: "#e4ddcb",
      roughness: 0.94,
      side: THREE.DoubleSide,
    });
  }
  k.add("sailingHull", S.sailHullMaterial, 0, 0, 0, 1, 1, 1);
  k.box(k.wood, 0, 0.585, 0.5, 2.6, 0.055, 6.4, true);
  k.box(k.glass, 0, 0.65, 0.6, 1.92, 0.92, 2.6, true);
  k.box(k.white, 0, 1.57, 0.6, 2.08, 0.1, 2.85, true);
  for (const side of [-1, 1]) {
    for (let j = 0; j < 7; j++) {
      const zz = -3.8 + j * 1.27,
        width = zz < -2.8 ? 1.0 : zz > 3 ? 1.16 : 1.45;
      k.tube(
        "#b6c1bc",
        [side * width, 0.58, zz],
        [side * width, 1.13, zz],
        0.018,
      );
      if (j < 6)
        k.tube(
          "#bbc5bd",
          [side * width, 1.13, zz],
          [side * (zz > 2 ? 1.16 : 1.45), 1.13, zz + 1.27],
          0.012,
        );
    }
    for (let j = 0; j < 3; j++)
      k.add(
        "surfboard",
        "#dde0d7",
        side * 1.62,
        0.24,
        j * 0.9,
        0.18,
        0.24,
        0.18,
      );
    k.box("#3c626d", side * 1.38, 0.2, 0.6, 0.035, 0.085, 5.7);
  }
  k.tube("#a8b8b8", [0, 0.58, -0.3], [0, 10.0, -0.3], 0.045);
  k.tube("#a8b8b8", [0, 1.63, -0.3], [3.1, 1.63, -0.3], 0.028);
  k.add("fullSail", S.sailClothMaterial, 0, 0, 0, 1, 1, 1);
  k.tube("#acb8aa", [0, 9.6, -0.3], [0, 0.6, -4.6], 0.012);
  k.tube("#acb8aa", [0, 9.6, -0.3], [0, 0.6, 4.1], 0.012);
  k.add("propRing", "#c88361", 1.48, 1.0, 2.5, 0.3, 0.3, 0.3, [
    0,
    Math.PI / 2,
    0,
  ]);
  k.box(k.wood, 0, 0.76, 3.0, 1.7, 0.14, 1.1, true);
}
