import { THREE, mesh, textTexture } from "./kit.js";

// The building kit shared by the old town and the coastal strip.
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
    box(base, 0, 0.35, 0, h.w + 0.09, 0.65, h.d + 0.09);
    const roofHeight = 2.1 + h.w * 0.035;
    b.add(
      "roof",
      roof,
      [h.x, y + h.h + 0.55 + roofHeight / 2, h.z],
      [(h.w + 1) * 0.71, roofHeight, (h.d + 1) * 0.71],
      [0, -h.yaw, 0],
    );
    box(trim, -h.w * 0.25, h.h + 1.2, 0, 1, 2.1, 0.9);
    box(base, -h.w * 0.25, h.h + 3.3, 0, 1.3, 0.17, 1.2);
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
        new THREE.PlaneGeometry(5.7, 0.8),
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
}
