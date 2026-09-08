import { THREE, quad, geometryFromTriangles, mesh, urban } from "./kit.js";

// Road ribbons, kerbs/shoulders and guardrails.
export function buildRoads(S) {
  const w = S.world;
  const mats = [
    S.art.get("asphalt", "#555d61", 0.96),
    S.art.get("paving", "#cbc2ad"),
    new THREE.MeshStandardMaterial({ color: "#eee3bd", roughness: 0.9 }),
    S.art.get("stone", "#b3a68b"),
    S.art.get("limestone", "#bcbeb3"),
  ];
  mats.forEach((m) => (m.side = THREE.DoubleSide));
  for (const path of w.paths) {
    let surfaces = [[], [], [], [], []];
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
      surfaces = [[], [], [], [], []];
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
            ribbon(surfaces[1], side * (path.width / 2 + 1.2), 2.4, 0.175);
            ribbon(surfaces[4], side * (path.width / 2 + 0.14), 0.25, 0.18);
            const edgePoint = (p, n, y) => {
              const x = p.x + n.x * side * (path.width / 2 + 0.015),
                z = p.z + n.z * side * (path.width / 2 + 0.015);
              return [x, w.height(x, z) + y, z];
            };
            quad(
              surfaces[4],
              edgePoint(a, na, 0.025),
              edgePoint(b, nb, 0.025),
              edgePoint(b, nb, 0.18),
              edgePoint(a, na, 0.18),
            );
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
  // A rolled W-section catches light along the rail, unlike a rectangular plank.
  const profile = new THREE.Shape();
  profile.moveTo(-0.02, -0.14);
  profile.lineTo(0.055, -0.11);
  profile.lineTo(0.07, -0.075);
  profile.lineTo(0.005, 0);
  profile.lineTo(0.07, 0.075);
  profile.lineTo(0.055, 0.11);
  profile.lineTo(-0.02, 0.14);
  profile.lineTo(-0.045, 0.12);
  profile.lineTo(0.028, 0.078);
  profile.lineTo(-0.04, 0);
  profile.lineTo(0.028, -0.078);
  profile.lineTo(-0.045, -0.12);
  profile.closePath();
  S.batch.geometries.railSection = new THREE.ExtrudeGeometry(profile, {
    depth: 1,
    bevelEnabled: false,
  }).translate(0, 0, -0.5);
  const railMetal = new THREE.MeshStandardMaterial({
    color: "#aebcba",
    metalness: 0.64,
    roughness: 0.46,
  });
  for (let i = 0; i < w.rails.length; i++) {
    const r = w.rails[i],
      h = w.height(r.x, r.z);
    S.batch.add(
      "railSection",
      railMetal,
      [r.x, h + 0.75, r.z],
      [1, 1, r.d],
      [0, -r.yaw, 0],
    );
    if (i % 3 === 0) {
      S.batch.box("#6d7970", r.x, h, r.z, 0.12, 0.9, 0.13, r.yaw);
      S.batch.box("#ede9d7", r.x, h + 0.91, r.z, 0.19, 0.09, 0.2, r.yaw, false);
      S.batch.box(
        "#ba715c",
        r.x,
        h + 0.92,
        r.z,
        0.2,
        0.055,
        0.095,
        r.yaw,
        false,
      );
    }
  }
}
