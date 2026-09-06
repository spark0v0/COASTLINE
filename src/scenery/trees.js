import { THREE, geometryFromTriangles, mesh, rng } from "./kit.js";

// Palm, pine and olive vegetation shared across regions.
export function buildTrees(S) {
  const b = S.batch,
    w = S.world;
  const trunk = S.art.get("wood", "#9e8865");
  const leaf = ["#3f704f", "#5d8152", "#758c5c", "#8a9b6a"];
  // Feathered palm fronds: individual curved leaflets with visible gaps.
  const p = [];
  for (let arm = 0; arm < 11; arm++) {
    const angle = (arm * Math.PI * 2) / 11,
      dx = Math.cos(angle),
      dz = Math.sin(angle);
    const center = (t) => [
      dx * t * 4.15,
      Math.sin(t * Math.PI) * 1.1 - t * t * 2.4,
      dz * t * 4.15,
    ];
    for (let j = 1; j < 15; j++) {
      const t = j / 15,
        a = center(t),
        v = center(Math.min(1, t + 0.045)),
        span = Math.sin(t * Math.PI) * 1.02;
      for (const side of [-1, 1]) {
        const tip = [
          a[0] - dz * span * side + dx * 0.3,
          a[1] - 0.2,
          a[2] + dx * span * side + dz * 0.3,
        ];
        p.push(...a, ...tip, ...v);
      }
    }
  }
  b.geometries.fronds = geometryFromTriangles(p);
  const palmMat = new THREE.MeshStandardMaterial({
    color: "#5e8752",
    roughness: 0.92,
    side: THREE.DoubleSide,
  });
  for (const t of w.trees) {
    const y = w.height(t.x, t.z),
      r = rng(Math.floor(t.seed * 999 + 3000));
    if (t.kind === "palm") {
      for (let j = 0; j < 4; j++)
        b.add(
          "cylinder",
          trunk,
          [t.x + Math.sin(t.seed) * j * 0.16, y + (t.h * (j + 0.5)) / 4, t.z],
          [0.23 - j * 0.025, t.h / 4 + 0.07, 0.23 - j * 0.025],
          [0, 0, 0],
        );
      b.add(
        "fronds",
        palmMat,
        [t.x + Math.sin(t.seed) * 0.48, y + t.h, t.z],
        [0.85 + t.h * 0.015, 1, 0.85 + t.h * 0.015],
        [0, t.seed, 0],
      );
    } else if (t.kind === "pine") {
      b.add(
        "cylinder",
        trunk,
        [t.x, y + t.h * 0.16, t.z],
        [0.24, t.h * 0.36, 0.24],
      );
      const greens = ["#2f5d46", "#3a6a4e", "#457757"];
      for (let i = 0; i < 4; i++) {
        const f = i / 3,
          coneH = t.h * 0.36,
          radius = t.h * (0.34 - f * 0.075),
          base = t.h * (0.2 + f * 0.24);
        b.add(
          "cone",
          greens[i % 3],
          [
            t.x + Math.sin(t.seed * 3 + i * 2.1) * 0.35,
            y + base + coneH * 0.5,
            t.z + Math.cos(t.seed * 2 + i * 1.7) * 0.35,
          ],
          [radius, coneH, radius],
          [0, t.seed + i, 0],
        );
      }
    } else {
      b.add(
        "cylinder",
        trunk,
        [t.x, y + t.h * 0.26, t.z],
        [0.26 + r() * 0.08, t.h * 0.55, 0.26 + r() * 0.08],
        [Math.sin(t.seed) * 0.06, 0, Math.cos(t.seed) * 0.06],
      );
      const blobs = 4 + Math.floor(r() * 2);
      for (let i = 0; i < blobs; i++) {
        const angle = i * 2.4 + t.seed,
          spread = t.h * 0.13 * (0.5 + r() * 0.6),
          size = t.h * (0.15 + r() * 0.08);
        b.add(
          "sphere",
          leaf[i % 4],
          [
            t.x + Math.cos(angle) * spread,
            y + t.h * (0.62 + r() * 0.3),
            t.z + Math.sin(angle) * spread,
          ],
          [size * 1.15, size * 0.8, size * 1.05],
          [0, angle, 0],
        );
      }
    }
  }
}
