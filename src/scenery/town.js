import { THREE, rng } from "./kit.js";
import { buildModernArchitecture } from "./architecture.js";
import { sportBodyGeometry } from "../vehicle-geometry.js";

// The building kit shared by the old town and the coastal strip, plus the
// street furniture that gives the town its life.
export function buildTown(S) {
  buildModernArchitecture(S);
  buildStreetLife(S);
}

// Street lamps, benches, planters, shaded kiosks and parked coupes along
// the town streets. Deterministic placement keeps every run identical.
function buildStreetLife(S) {
  const w = S.world,
    b = S.batch;
  const woodMat = S.art.get("wood", "#8a7355");
  const poleMat = "#3f5a54";
  const carCols = ["#d6dedb", "#335e70", "#839694", "#454c52"];
  const clearOfBuildings = (x, z) =>
    !w.buildings.some(
      (bd) =>
        Math.hypot(x - bd.x, z - bd.z) < Math.hypot(bd.w, bd.d) * 0.5 + 2.2,
    );
  for (const path of w.paths) {
    if (!/街道|大道/.test(path.name)) continue;
    const r = rng(9000 + path.id * 77);
    const pts = path.points;
    for (let i = 6; i < pts.length - 6; i += 12) {
      const p = pts[i],
        q = pts[i + 1];
      const dx = q.x - p.x,
        dz = q.z - p.z,
        len = Math.hypot(dx, dz) || 1;
      const ax = dx / len,
        az = dz / len;
      const px = -az,
        pz = ax;
      const yaw = Math.atan2(-dx, dz);
      for (const side of [-1, 1]) {
        if (r() > 0.34) continue;
        const off = path.width / 2 + 3.6;
        const x = p.x + px * off * side,
          z = p.z + pz * off * side,
          y = w.height(x, z);
        if (w.nearestRoad(x, z).d < path.width / 2 + 2.4) continue;
        if (!clearOfBuildings(x, z)) continue;
        const roll = r();
        if (roll < 0.3) {
          // Street lamp: pole, arm reaching over the road, warm head.
          b.box(poleMat, x, y, z, 0.18, 5.4, 0.18);
          b.box(
            poleMat,
            x - px * side * 0.55,
            y + 5.28,
            z - pz * side * 0.55,
            1.2,
            0.12,
            0.12,
            yaw,
          );
          b.box(
            "#f6ecd2",
            x - px * side * 1.05,
            y + 5.16,
            z - pz * side * 1.05,
            0.36,
            0.14,
            0.22,
            yaw,
            false,
          );
          w.register({ type: "circle", x, z, r: 0.3 });
        } else if (roll < 0.5) {
          // Bench facing the street.
          b.box(woodMat, x, y + 0.44, z, 0.5, 0.08, 1.6, yaw);
          b.box(
            woodMat,
            x + px * side * 0.24,
            y + 0.74,
            z + pz * side * 0.24,
            0.08,
            0.52,
            1.6,
            yaw,
          );
          b.box(
            "#6b6f5e",
            x - px * side * 0.18,
            y,
            z - pz * side * 0.18,
            0.42,
            0.42,
            0.14,
            yaw,
          );
          b.box(
            "#6b6f5e",
            x + px * side * 0.18,
            y,
            z + pz * side * 0.18,
            0.42,
            0.42,
            0.14,
            yaw,
          );
        } else if (roll < 0.72) {
          // Planter pair flanking a doorway.
          for (const t of [-0.8, 0.8]) {
            const fx = x + ax * t,
              fz = z + az * t,
              fy = w.height(fx, fz);
            b.add(
              "cylinder",
              "#b9b9ae",
              [fx, fy + 0.35, fz],
              [0.55, 0.7, 0.55],
            );
            b.add("sphere", "#5f7a4d", [fx, fy + 1.05, fz], [0.72, 0.66, 0.72]);
          }
        } else if (roll < 0.86) {
          // Contemporary coupe silhouette, shared geometry with the hero vehicle.
          const col = carCols[Math.floor(r() * 4)];
          b.geometries.parkedCoupe ||= sportBodyGeometry();
          b.add(
            "parkedCoupe",
            col,
            [x, y, z],
            [0.86, 0.95, 0.86],
            [0, -yaw, 0],
          );
          b.add(
            "softSlab",
            "#304750",
            [x, y + 1.03, z],
            [1.24, 0.48, 1.75],
            [0, -yaw, 0],
          );
          for (const ta of [-1.15, 1.15])
            for (const ts of [-0.72, 0.72])
              b.add(
                "sphere",
                "#20262b",
                [x + ax * ta + px * ts, y + 0.28, z + az * ta + pz * ts],
                [0.24, 0.32, 0.32],
                [0, -yaw, 0],
              );
          w.register({ type: "circle", x, z, r: 1.55 });
        } else {
          // Bollard trio guarding a corner.
          for (const t of [-1, 0, 1]) {
            const fx = x + ax * t * 0.9,
              fz = z + az * t * 0.9,
              fy = w.height(fx, fz);
            b.box("#546761", fx, fy, fz, 0.22, 0.85, 0.22);
          }
        }
      }
    }
  }
  // Market stalls cluster near street corners.
  let stalls = 0;
  for (const path of w.paths) {
    if (!/街道|大道/.test(path.name) || stalls >= 6) continue;
    const r = rng(3100 + path.id * 31);
    const pts = path.points;
    for (let i = 6; i < pts.length - 6 && stalls < 6; i += 6) {
      const p = pts[i],
        q = pts[i + 1];
      if (!w.isJunction(p.x, p.z, path.id, 1.5) || r() > 0.35) continue;
      const dx = q.x - p.x,
        dz = q.z - p.z,
        len = Math.hypot(dx, dz) || 1;
      const px = -dz / len,
        pz = dx / len;
      const x = p.x + px * 6.4,
        z = p.z + pz * 6.4,
        y = w.height(x, z);
      if (w.nearestRoad(x, z).d < path.width / 2 + 1.6) continue;
      if (!clearOfBuildings(x, z)) continue;
      for (const cs of [
        [-1.6, -1.1],
        [1.6, -1.1],
        [-1.6, 1.1],
        [1.6, 1.1],
      ])
        b.box("#6b5a43", x + cs[0], y, z + cs[1], 0.1, 2.3, 0.1);
      for (let s2 = 0; s2 < 6; s2++)
        b.box(
          s2 % 2 ? "#ad9474" : "#c0aa8c",
          x - 1.75 + s2 * 0.7,
          y + 2.3,
          z,
          0.7,
          0.1,
          2.4,
        );
      b.box(woodMat, x, y + 0.85, z, 1.9, 0.09, 1.0);
      b.box(woodMat, x + 1.0, y + 0.42, z + 0.6, 0.55, 0.5, 0.55);
      b.box("#b9b9ae", x - 1.1, y + 0.36, z + 0.7, 0.6, 0.55, 0.6);
      w.register({ type: "circle", x, z, r: 1.5 });
      stalls++;
    }
  }
}
