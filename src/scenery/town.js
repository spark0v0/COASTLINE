import { THREE, mesh, textTexture, rng } from "./kit.js";

// The building kit shared by the old town and the coastal strip, plus the
// street furniture that gives the town its life.
export function buildTown(S) {
  const w = S.world,
    b = S.batch;
  const trim = S.art.get("stucco", "#eee2c7"),
    base = S.art.get("stone", "#b9b099");
  const roof = S.art.get("roof", "#bd7753"),
    wood = S.art.get("wood", "#52786e");
  const glass = new THREE.MeshPhysicalMaterial({
    color: "#30494e",
    roughness: 0.25,
    metalness: 0.32,
    clearcoat: 0.7,
    envMapIntensity: 1.1,
  });
  const signs = [
    "CAFE AZUR",
    "CASA MARINA",
    "HOTEL SOLE",
    "PANETTERIA",
    "ATELIER",
  ].map(
    (t) =>
      new THREE.MeshStandardMaterial({ map: textTexture(t), roughness: 0.8 }),
  );
  b.geometries.roof = new THREE.ConeGeometry(1, 1, 4);
  b.geometries.roof.rotateY(Math.PI / 4);
  const signGeo = new THREE.PlaneGeometry(5.7, 0.8);
  for (const h of w.buildings) {
    const c = Math.cos(h.yaw),
      s = Math.sin(h.yaw),
      y = w.height(h.x, h.z),
      wall = S.art.get("stucco", h.color);
    const pos = (x, z) => [h.x + x * c - z * s, h.z + x * s + z * c];
    const box = (mat, x, yy, z, ww, hh, dd, shadow = true) => {
      const [xx, zz] = pos(x, z);
      b.box(mat, xx, y + yy, zz, ww, hh, dd, h.yaw, shadow);
    };
    const pad = 1.4;
    box(base, 0, -0.45, 0, h.w + pad, 1.0, h.d + pad);
    box(wall, 0, 0.3, 0, h.w, h.h, h.d);
    box(trim, 0, h.h + 0.2, 0, h.w + 0.65, 0.3, h.d + 0.65);
    // Cornice fillet below the roof band breaks the flat wall top.
    box(trim, 0, h.h - 0.28, 0, h.w + 0.35, 0.18, h.d + 0.35);
    box(base, 0, 0.35, 0, h.w + 0.09, 0.65, h.d + 0.09);
    const roofHeight = 2.1 + h.w * 0.035;
    if (h.variant === 3) {
      // Flat Mediterranean roof: deck, parapet and a water tank.
      box(roof, 0, h.h + 0.4, 0, h.w + 0.6, 0.16, h.d + 0.6);
      box(trim, 0, h.h + 0.34, -(h.d + 0.6) / 2, h.w + 0.62, 0.6, 0.2);
      box(trim, 0, h.h + 0.34, (h.d + 0.6) / 2, h.w + 0.62, 0.6, 0.2);
      box(trim, -(h.w + 0.6) / 2, h.h + 0.34, 0, 0.2, 0.6, h.d + 0.62);
      box(trim, (h.w + 0.6) / 2, h.h + 0.34, 0, 0.2, 0.6, h.d + 0.62);
      box(base, h.w * 0.2, h.h + 0.56, -h.d * 0.15, 0.95, 0.95, 0.95);
      box(trim, h.w * 0.2, h.h + 1.51, -h.d * 0.15, 1.0, 0.1, 1.0);
    } else {
      b.add(
        "roof",
        roof,
        [h.x, y + h.h + 0.55 + roofHeight / 2, h.z],
        [(h.w + 1) * 0.71, roofHeight, (h.d + 1) * 0.71],
        [0, -h.yaw, 0],
      );
      box(trim, -h.w * 0.25, h.h + 1.2, 0, 1, 2.1, 0.9);
      box(base, -h.w * 0.25, h.h + 3.3, 0, 1.3, 0.17, 1.2);
      // Chimney against the roof slope, capped in dark stone.
      const cx = ((h.seed % 13) / 13 - 0.5) * h.w * 0.4;
      const cz = ((Math.floor(h.seed / 13) % 13) / 13 - 0.5) * h.d * 0.4;
      box(trim, cx, h.h + 1.15, cz, 0.6, 1.6, 0.6);
      box(base, cx, h.h + 2.75, cz, 0.74, 0.16, 0.74);
    }
    const floors = Math.max(1, Math.floor(h.h / 3.1));
    // Windows, inset dark reveals, shutters and projecting sills on all four facades.
    for (let face = 0; face < 4; face++) {
      const alongX = face < 2,
        side = face % 2 ? 1 : -1,
        length = alongX ? h.w : h.d,
        count = Math.max(2, Math.floor(length / 3.2));
      for (let f = 0; f < floors; f++)
        for (let k = 0; k < count; k++) {
          const u = -length / 2 + ((k + 0.5) * length) / count,
            yy = 1.25 + f * 3.1;
          const x = alongX ? u : side * (h.w / 2 + 0.065),
            z = alongX ? side * (h.d / 2 + 0.065) : u;
          box(
            trim,
            x,
            yy - 0.14,
            z,
            alongX ? 1.6 : 0.16,
            2.05,
            alongX ? 0.16 : 1.6,
          );
          box(
            glass,
            x + (alongX ? 0 : side * 0.1),
            yy,
            z + (alongX ? side * 0.1 : 0),
            alongX ? 1.2 : 0.07,
            1.78,
            alongX ? 0.07 : 1.2,
          );
          box(
            trim,
            x,
            yy - 0.2,
            z,
            alongX ? 1.85 : 0.43,
            0.13,
            alongX ? 0.43 : 1.85,
          );
          // Lintel above every window answers the sill below it.
          box(
            trim,
            x,
            yy + 1.04,
            z,
            alongX ? 1.78 : 0.2,
            0.14,
            alongX ? 0.2 : 1.78,
          );
          for (const edge of [-1, 1]) {
            box(
              wood,
              x + (alongX ? edge * 0.9 : side * 0.13),
              yy,
              z + (alongX ? side * 0.13 : edge * 0.9),
              alongX ? 0.38 : 0.1,
              1.83,
              alongX ? 0.1 : 0.38,
              false,
            );
          }
          box(
            trim,
            x,
            yy + 0.8,
            z,
            alongX ? 1.26 : 0.22,
            0.06,
            alongX ? 0.22 : 1.26,
            false,
          );
          // Juliet balconies on the street side of the upper floors.
          if ((h.variant === 0 || h.variant === 2) && face === 1 && f > 0) {
            const bw = Math.min(3.4, length * 0.5);
            box(trim, u, yy - 0.3, h.d / 2 + 0.55, bw, 0.12, 1.05);
            box(wood, u, yy + 0.86, h.d / 2 + 1.04, bw, 0.07, 0.07, false);
            for (let bp = 0; bp <= 4; bp++)
              box(
                wood,
                u - bw / 2 + (bp * bw) / 4,
                yy + 0.28,
                h.d / 2 + 1.02,
                0.06,
                0.62,
                0.06,
                false,
              );
          }
          if (f > 0 && h.variant === 2 && face === 1) {
            box(trim, u, yy - 0.3, h.d / 2 + 0.65, 2.35, 0.17, 1.5);
            box(
              "#405b53",
              u,
              yy + 0.5,
              h.d / 2 + 1.3,
              2.25,
              0.065,
              0.07,
              false,
            );
            for (let k2 = -2; k2 <= 2; k2++)
              box(
                "#405b53",
                u + k2 * 0.45,
                yy - 0.05,
                h.d / 2 + 1.3,
                0.045,
                0.6,
                0.045,
                false,
              );
          }
        }
    }
    box(wood, 0, 0.5, h.d / 2 + 0.13, 1.8, 2.55, 0.13);
    box(trim, 0, 0.2, h.d / 2 + 0.8, 2.7, 0.22, 1.5);
    if (h.variant !== 3) {
      const awning = h.variant % 2 ? "#597d76" : "#b97558";
      for (let k = 0; k < 10; k++)
        box(
          k % 2 ? trim : awning,
          (k - 4.5) * 0.65,
          3.1,
          h.d / 2 + 1.1,
          0.65,
          0.12,
          2.1,
        );
      box(awning, 0, 2.77, h.d / 2 + 2.1, 6.5, 0.4, 0.1);
      const [sx, sz] = pos(0, h.d / 2 + 0.2);
      mesh(
        signGeo,
        signs[h.variant % 5],
        S.group,
        [sx, y + 4.1, sz],
        [0, -h.yaw, 0],
        [1, 1, 1],
        false,
      );
    }
    for (const side of [-1, 1]) {
      box(roof, side * (h.w / 2 - 0.8), 0.3, h.d / 2 + 1, 1, 0.8, 1);
      const [px, pz] = pos(side * (h.w / 2 - 0.8), h.d / 2 + 1);
      b.add("sphere", "#637c49", [px, y + 1.35, pz], [0.85, 0.8, 0.8]);
      if (h.variant === 1)
        b.add(
          "sphere",
          "#b36f88",
          [px, y + 1.8, pz],
          [0.55, 0.45, 0.55],
          [0, 0, 0],
          false,
        );
    }
  }
  buildStreetLife(S);
}

// Street lamps, benches, planters, market stalls and parked classics along
// the town streets. Deterministic placement keeps every run identical.
function buildStreetLife(S) {
  const w = S.world,
    b = S.batch;
  const woodMat = S.art.get("wood", "#8a7355");
  const poleMat = "#3f5a54";
  const carCols = ["#b97558", "#597d76", "#c2b280", "#7a6a54"];
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
              "#9c6b4f",
              [fx, fy + 0.35, fz],
              [0.55, 0.7, 0.55],
            );
            b.add("sphere", "#5f7a4d", [fx, fy + 1.05, fz], [0.72, 0.66, 0.72]);
          }
        } else if (roll < 0.86) {
          // Parked classic silhouette, wheels as dark discs.
          const col = carCols[Math.floor(r() * 4)];
          b.box(col, x, y + 0.3, z, 1.55, 0.52, 3.7, yaw);
          b.box(col, x, y + 0.8, z, 1.38, 0.5, 1.8, yaw);
          for (const ta of [-1.15, 1.15])
            for (const ts of [-0.72, 0.72])
              b.add(
                "sphere",
                "#20262b",
                [x + ax * ta + px * ts, y + 0.28, z + az * ta + pz * ts],
                [0.3, 0.3, 0.3],
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
          s2 % 2 ? "#b97558" : "#e9dcc0",
          x - 1.75 + s2 * 0.7,
          y + 2.3,
          z,
          0.7,
          0.1,
          2.4,
        );
      b.box(woodMat, x, y + 0.85, z, 1.9, 0.09, 1.0);
      b.box(woodMat, x + 1.0, y + 0.42, z + 0.6, 0.55, 0.5, 0.55);
      b.box("#9c6b4f", x - 1.1, y + 0.36, z + 0.7, 0.6, 0.55, 0.6);
      w.register({ type: "circle", x, z, r: 1.5 });
      stalls++;
    }
  }
}
