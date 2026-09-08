import { THREE, textTexture, mesh } from "./kit.js";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";

// A shared architectural language, built inside the existing collision plots.
// Slabs, recessed glazing and occupied terraces replace decorated solid cubes.
export function buildModernArchitecture(S) {
  const b = S.batch,
    w = S.world;
  b.geometries.roof = new THREE.ConeGeometry(1, 1, 4).rotateY(Math.PI / 4);
  b.geometries.softSlab = new RoundedBoxGeometry(1, 1, 1, 2, 0.025);
  b.lodGeometries.softSlab = [b.geometries.box];
  b.geometries.resortColumn = new THREE.CylinderGeometry(0.83, 1, 1, 32);
  const white = S.art.get("stucco", "#e8e7df", 0.78);
  const stone = S.art.get("limestone", "#c9c6b9", 0.86);
  const timber = S.art.get("wood", "#96795a", 0.75);
  const graphite = "#293b40";
  const glazing = new THREE.MeshPhysicalMaterial({
    color: "#486b77",
    roughness: 0.16,
    metalness: 0.38,
    clearcoat: 1,
    clearcoatRoughness: 0.12,
    envMapIntensity: 1.25,
  });
  const brands = [
    "AZUR / CAFE",
    "MARINA / SUITES",
    "SOLE / DESIGN",
    "PALMA / RESIDENCE",
  ];
  const signGeo = new THREE.PlaneGeometry(4.1, 0.52);
  const signs = brands.map(
    (name) =>
      new THREE.MeshStandardMaterial({
        map: textTexture(name, { bg: "#293b40", fg: "#eeeade", size: 512 }),
        roughness: 0.7,
      }),
  );
  for (const h of w.buildings) {
    const y = w.height(h.x, h.z),
      c = Math.cos(h.yaw),
      s = Math.sin(h.yaw);
    const p = (x, yy, z) => [h.x + x * c - z * s, y + yy, h.z + x * s + z * c];
    const box = (mat, x, yy, z, ww, hh, dd, shadow = true) =>
      b.box(
        mat,
        p(x, yy, z)[0],
        y + yy,
        p(x, yy, z)[2],
        ww,
        hh,
        dd,
        h.yaw,
        shadow,
      );
    const slab = (x, yy, z, ww, hh, dd, mat = white) =>
      b.add(
        "softSlab",
        mat,
        p(x, yy + hh / 2, z),
        [ww, hh, dd],
        [0, -h.yaw, 0],
      );
    const floors = Math.max(2, Math.min(4, Math.round(h.h / 3.25)));
    const variant = h.variant % 4,
      level = 3.25;
    h.h = floors * level + 0.72;
    const W = h.w,
      D = h.d;
    slab(0, -0.25, 0, W + 0.55, 0.5, D + 0.55, stone);
    // Warm stone core, set well behind the facade's glass and shadow gap.
    box(stone, -W * 0.21, 0.25, -D * 0.2, W * 0.32, floors * level, D * 0.55);
    for (let f = 0; f < floors; f++) {
      const yy = 0.25 + f * level;
      const inset = f > 0 ? (variant === 0 ? 0.9 : 0.45) : 0;
      const ww = W - inset * 2,
        dd = D - inset;
      const front = dd / 2 - 0.62,
        back = -dd / 2 + 0.24;
      slab(0, yy, 0, ww, 0.24, dd);
      // Opaque glazing intentionally avoids sorting/overdraw across whole streets.
      box(glazing, ww * 0.06, yy + 0.3, front, ww * 0.81, 2.62, 0.1, true);
      box(glazing, 0, yy + 0.3, back, ww * 0.88, 2.62, 0.1, true);
      for (const side of [-1, 1]) {
        box(
          glazing,
          side * (ww / 2 - 0.32),
          yy + 0.3,
          -0.1,
          0.1,
          2.62,
          dd - 1.45,
          true,
        );
        box(
          white,
          side * (ww / 2 - 0.16),
          yy + 0.24,
          dd / 2 - 0.22,
          0.3,
          2.82,
          0.4,
        );
        box(
          white,
          side * (ww / 2 - 0.16),
          yy + 0.24,
          -dd / 2 + 0.22,
          0.3,
          2.82,
          0.4,
        );
        // Side glazing divisions and slender balcony frames.
        for (let j = 1; j < 4; j++)
          box(
            graphite,
            side * (ww / 2 - 0.24),
            yy + 0.3,
            -dd / 2 + (j * dd) / 4,
            0.09,
            2.62,
            0.065,
            false,
          );
      }
      for (let j = 0; j <= 4; j++) {
        const xx = -ww * 0.36 + j * ww * 0.195;
        box(graphite, xx, yy + 0.3, front + 0.07, 0.055, 2.62, 0.095, false);
        box(graphite, xx, yy + 0.3, back - 0.07, 0.055, 2.62, 0.095, false);
      }
      box(
        graphite,
        ww * 0.04,
        yy + 2.87,
        front + 0.08,
        ww * 0.84,
        0.065,
        0.12,
        false,
      );
      // A solid timber bay interrupts the glass rhythm instead of wallpaper windows.
      const finX = (variant === 1 ? 1 : -1) * ww * 0.33;
      box(timber, finX, yy + 0.25, front + 0.15, ww * 0.23, 2.85, 0.22);
      for (let j = 0; j < 7; j++)
        box(
          timber,
          finX - ww * 0.11 + j * ww * 0.035,
          yy + 0.28,
          front + 0.31,
          0.075,
          2.8,
          0.16,
        );
      if (f > 0) {
        const railZ = dd / 2 - 0.09;
        box(graphite, 0, yy + 1.23, railZ, ww - 0.6, 0.055, 0.055, false);
        for (let j = 0; j < 5; j++)
          box(
            graphite,
            -ww * 0.44 + j * ww * 0.22,
            yy + 0.24,
            railZ,
            0.045,
            1,
            0.045,
            false,
          );
        box(glazing, 0, yy + 0.43, railZ, ww - 0.7, 0.64, 0.035, false);
        // Lower dark panel leaves light between the terrace and railing.
        slab(ww * 0.3, yy + 0.24, dd * 0.32, ww * 0.2, 0.42, 0.66, stone);
        b.add("sphere", "#405d42", p(ww * 0.3, yy + 0.82, dd * 0.32), [
          ww * 0.12,
          0.32,
          0.4,
        ]);
      } else {
        slab(0, yy + 2.9, dd / 2 + 0.14, ww * 0.76, 0.16, 1.35);
        const sign = mesh(
          signGeo,
          signs[variant],
          S.group,
          p(0, yy + 2.48, front + 0.38),
          [0, -h.yaw, 0],
          [1, 1, 1],
          false,
        );
        sign.name = "resort-storefront";
        // Door handles and a real recessed threshold.
        box(graphite, ww * 0.2, yy + 0.1, front + 0.25, 1.45, 0.13, 0.65);
        for (const dx of [-0.1, 0.1])
          box(
            "#b7b9b0",
            ww * 0.2 + dx,
            yy + 1.15,
            front + 0.13,
            0.025,
            0.55,
            0.04,
            false,
          );
      }
    }
    const top = 0.25 + floors * level,
      roofW = W - (variant === 0 ? 1.8 : 0.9);
    slab(0, top, 0, roofW + 0.35, 0.28, D - 0.25);
    // Floating roof terrace and open slatted pergola.
    box(white, 0, top + 0.28, -D / 2 + 0.35, roofW, 0.55, 0.18);
    for (const side of [-1, 1]) {
      box(white, side * (roofW / 2 - 0.08), top + 0.28, 0, 0.16, 0.55, D - 0.5);
      box(graphite, side * roofW * 0.27, top + 0.28, -D * 0.18, 0.1, 1.85, 0.1);
      box(graphite, side * roofW * 0.27, top + 0.28, D * 0.12, 0.1, 1.85, 0.1);
    }
    for (let j = 0; j < 9; j++)
      box(
        timber,
        -roofW * 0.32 + j * roofW * 0.08,
        top + 2.05,
        -D * 0.03,
        0.12,
        0.12,
        D * 0.4,
      );
    // Uppermost solid structure is included in camera occlusion bounds.
    h.h = top + 2.18;
  }
}
