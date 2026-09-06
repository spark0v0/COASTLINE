import { THREE, quad, geometryFromTriangles, mesh, urban } from "./kit.js";

// Road ribbons, kerbs/shoulders and guardrails.
export function buildRoads(S) {
  const w = S.world;
  const mats = [
    S.art.get("asphalt", "#8a8d87", 0.96),
    S.art.get("paving", "#cbc2ad"),
    new THREE.MeshStandardMaterial({ color: "#eee3bd", roughness: 0.9 }),
    S.art.get("stone", "#b3a68b"),
  ];
  mats.forEach((m) => (m.side = THREE.DoubleSide));
  for (const path of w.paths) {
    let surfaces = [[], [], [], []];
    const flush = () => {
      surfaces.forEach((p, i) => {
        if (p.length)
          mesh(
            geometryFromTriangles(p),
            mats[i],
            S.group,
            [0, 0, 0],
            [0, 0, 0],
            [1, 1, 1],
            false,
          );
      });
      surfaces = [[], [], [], []];
    };
    for (let i = 1; i < path.points.length; i++) {
      const p = path.points,
        a = p[i - 1],
        b = p[i],
        before = p[Math.max(0, i - 2)],
        after = p[Math.min(p.length - 1, i + 1)];
      const la = Math.hypot(b.x - before.x, b.z - before.z) || 1,
        lb = Math.hypot(after.x - a.x, after.z - a.z) || 1;
      const na = { x: -(b.z - before.z) / la, z: (b.x - before.x) / la },
        nb = { x: -(after.z - a.z) / lb, z: (after.x - a.x) / lb };
      const ribbon = (out, offset, width, y) => {
        const slices = Math.max(1, Math.ceil(width / 2));
        const v = (p, n, d) => {
          const x = p.x + n.x * d,
            z = p.z + n.z * d;
          return [x, w.height(x, z) + y, z];
        };
        for (let k = 0; k < slices; k++) {
          const l = offset - width / 2 + (width * k) / slices,
            r = offset - width / 2 + (width * (k + 1)) / slices;
          quad(out, v(a, na, l), v(b, nb, l), v(b, nb, r), v(a, na, r));
        }
      };
      ribbon(surfaces[0], 0, path.width, 0.082 + path.id * 0.001);
      if (!w.isJunction((a.x + b.x) / 2, (a.z + b.z) / 2, path.id, 3)) {
        const mx = (a.x + b.x) / 2,
          mz = (a.z + b.z) / 2;
        if (urban(mx, mz)) {
          for (const side of [-1, 1]) {
            ribbon(surfaces[1], side * (path.width / 2 + 1.2), 2.4, 0.06);
            ribbon(surfaces[2], side * (path.width / 2 - 0.4), 0.12, 0.105);
          }
        } else {
          // Rural shoulders: compacted gravel instead of city kerbs.
          for (const side of [-1, 1])
            ribbon(surfaces[3], side * (path.width / 2 + 0.7), 2.2, 0.04);
        }
        if (i % 6 < 3) ribbon(surfaces[2], 0, 0.14, 0.108);
      }
      if (i % 100 === 0) flush();
    }
    flush();
  }
  for (let i = 0; i < w.rails.length; i++) {
    const r = w.rails[i],
      h = w.height(r.x, r.z);
    S.batch.box("#c5ccbd", r.x, h + 0.65, r.z, 0.18, 0.2, r.d, r.yaw);
    if (i % 3 === 0)
      S.batch.box("#6d7970", r.x, h, r.z, 0.12, 0.9, 0.13, r.yaw);
  }
}
