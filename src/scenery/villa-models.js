import { THREE } from "./kit.js";

// Three solid residential silhouettes, all contained by the existing plot.
// Windows sit inside structural reveals; roofs, walls and timber have distinct jobs.
export function buildVilla(S, h) {
  const b = S.batch,
    W = h.w,
    D = h.d,
    y = S.world.height(h.x, h.z);
  const road = S.world.nearestRoad(h.x, h.z);
  const front =
    -(road.x - h.x) * Math.sin(h.yaw) + (road.z - h.z) * Math.cos(h.yaw);
  const yaw = h.yaw + (front < 0 ? Math.PI : 0);
  const c = Math.cos(yaw),
    s = Math.sin(yaw),
    style = h.seed % 3;
  const point = (x, yy, z) => [
    h.x + x * c - z * s,
    y + yy,
    h.z + x * s + z * c,
  ];
  const materials = {
    wall: S.art.get("stucco", ["#e3dfd4", "#d8d4c8", "#e8e5dd"][style], 0.82),
    stone: S.art.get("limestone", "#c6bfae", 0.91),
    wood: S.art.get("wood", "#897055", 0.77),
    frame: "#35474c",
    reveal: "#807c71",
    curtain: "#b6b3a5",
  };
  S.villaGlass ||= new THREE.MeshPhysicalMaterial({
    color: "#57747c",
    metalness: 0.23,
    roughness: 0.22,
    clearcoat: 1,
    clearcoatRoughness: 0.17,
    envMapIntensity: 0.9,
  });
  const box = (mat, x, yy, z, w, hh, d, soft = false) => {
    b.add(
      soft ? "softSlab" : "box",
      mat,
      point(x, yy + hh / 2, z),
      [w, hh, d],
      [0, -yaw, 0],
    );
  };
  const { wall, stone, wood, frame, reveal, curtain } = materials;
  const window = (x, yy, z, w, hh) => {
    // Backing, glazing, deep side jambs, sill and slim mullions.
    box(reveal, x, yy - 0.1, z - 0.11, w + 0.3, hh + 0.23, 0.2);
    box(S.villaGlass, x, yy, z + 0.005, w, hh, 0.06);
    box(stone, x, yy - 0.16, z + 0.09, w + 0.42, 0.13, 0.42, true);
    for (const side of [-1, 1])
      box(
        wall,
        x + side * (w / 2 + 0.11),
        yy - 0.04,
        z + 0.1,
        0.18,
        hh + 0.1,
        0.38,
      );
    box(wall, x, yy + hh, z + 0.1, w + 0.42, 0.16, 0.38);
    for (let j = 0; j <= Math.ceil(w / 1.3); j++)
      box(
        frame,
        x - w / 2 + (j * w) / Math.ceil(w / 1.3),
        yy,
        z + 0.06,
        0.045,
        hh,
        0.07,
      );
    box(frame, x, yy, z + 0.06, w, 0.04, 0.07);
    box(frame, x, yy + hh - 0.04, z + 0.06, w, 0.04, 0.07);
    // A few partially drawn blinds break up the broad reflection.
    if (style === 1)
      box(
        curtain,
        x - w * 0.36,
        yy + 0.05,
        z + 0.042,
        w * 0.15,
        hh - 0.1,
        0.018,
      );
  };
  const F = D / 2 - 0.5,
    B = -D / 2 + 0.3,
    depth = F - B;
  // Recessed dark plinth, pale slab and stone rear wall anchor the building.
  box(stone, 0, -0.18, 0, W, 0.4, D, true);
  box(reveal, 0, 0.22, 0, W - 0.18, 0.1, D - 0.18);
  box(wall, 0, 0.32, B + 0.22, W - 0.2, 2.85, 0.44);
  for (const side of [-1, 1]) {
    box(wall, side * (W / 2 - 0.27), 0.32, 0, 0.44, 2.85, D - 0.4);
    // Shallow stone bands articulate side walls, not another glass box.
    box(stone, side * (W / 2 - 0.025), 0.34, -D * 0.18, 0.07, 2.7, D * 0.32);
    box(
      S.villaGlass,
      side * (W / 2 + 0.025),
      1.03,
      -D * 0.17,
      0.055,
      1.4,
      D * 0.23,
    );
    for (const z of [-D * 0.285, -D * 0.055])
      box(frame, side * (W / 2 + 0.06), 1.03, z, 0.055, 1.4, 0.035);
    box(
      stone,
      side * (W / 2 + 0.06),
      0.93,
      -D * 0.17,
      0.22,
      0.09,
      D * 0.26,
      true,
    );
    for (let j = 0; j < 6; j++)
      box(
        wood,
        side * (W / 2 + 0.018),
        0.42,
        D * 0.03 + j * 0.21,
        0.085,
        2.5,
        0.065,
      );
  }
  const doorX = -W * 0.3;
  box(wood, doorX, 0.32, F - 0.11, 1.32, 2.62, 0.15);
  box(frame, doorX + 0.41, 1.16, F, 0.035, 0.66, 0.07);
  box(wall, -W * 0.43, 0.32, F - 0.1, W * 0.12, 2.85, 0.44);
  box(wall, -W * 0.17, 0.32, F - 0.1, W * 0.16, 2.85, 0.44);
  window(W * 0.19, 0.55, F - 0.2, W * 0.47, 2.33);
  box(stone, 0, 0.32, F - 0.03, W - 0.3, 0.18, 0.25);
  box(wall, 0, 3.05, F - 0.1, W, 0.2, 0.6, true);
  // Thin cantilever throws a readable shadow over the recessed entrance.
  box(wall, -W * 0.25, 2.97, F + 0.27, W * 0.4, 0.18, 0.82, true);
  box(frame, doorX - 0.86, 1.64, F + 0.16, 0.09, 0.38, 0.09, true);
  box("#ddd2a9", doorX - 0.86, 1.71, F + 0.215, 0.065, 0.18, 0.012);
  box(stone, 0, 3.19, 0, W + 0.18, 0.23, D + 0.08, true);
  if (style === 2) {
    // Low pavilion with a sheltered roof terrace and one tall stone chimney.
    box(wall, 0, 3.42, -D * 0.26, W - 0.5, 0.42, D * 0.45, true);
    box(stone, -W * 0.33, 3.42, -D * 0.28, 1.1, 1.65, 1.05, true);
    pergola(W * 0.14, 3.44, D * 0.16, W * 0.52, D * 0.38);
    seats(W * 0.08, 3.44, D * 0.19);
    rail(0, 3.44, F - 0.15, W - 0.9);
    h.h = 6.15;
  } else {
    // Offset upper wing: the opposite side is a genuinely open terrace.
    const U = W * 0.62,
      ux = (style === 0 ? -1 : 1) * W * 0.16,
      ud = D * 0.77,
      uz = -D * 0.085;
    box(wall, ux, 3.42, uz, U, 2.82, ud, true);
    const front = uz + ud / 2;
    // Cover the facade behind the inset glazing with an opening-shaped frame.
    // Glazing is placed just ahead of the wall; surrounding jambs carry depth.
    window(ux, 3.98, front + 0.035, U * 0.7, 1.93);
    box(wall, ux, 6.24, uz, U + 0.28, 0.24, ud + 0.25, true);
    box(stone, ux, 6.48, uz - ud / 2 + 0.14, U, 0.28, 0.24);
    const terraceX = -Math.sign(ux) * W * 0.34;
    pergola(terraceX, 3.42, 0.08, W * 0.25, D * 0.7);
    seats(terraceX, 3.42, D * 0.17);
    rail(0, 3.42, F - 0.12, W - 0.8);
    h.h = 6.78;
  }
  // No commercial banner on private homes.
  h.residential = true;
  function rail(x, yy, z, w) {
    box(frame, x, yy + 0.98, z, w, 0.035, 0.045);
    box(frame, x, yy + 0.26, z, w, 0.025, 0.035);
    for (let j = 0; j <= Math.ceil(w / 1.4); j++)
      box(
        frame,
        x - w / 2 + (j * w) / Math.ceil(w / 1.4),
        yy,
        z,
        0.036,
        0.98,
        0.036,
      );
  }
  function pergola(x, yy, z, w, d) {
    for (const side of [-1, 1]) {
      box(
        frame,
        x + side * (w / 2 - 0.09),
        yy,
        z + d / 2 - 0.13,
        0.085,
        2.45,
        0.085,
      );
      box(wood, x + side * (w / 2 - 0.09), yy + 2.38, z, 0.12, 0.16, d + 0.13);
    }
    for (let j = 0; j < 10; j++)
      box(wood, x - w / 2 + (j * w) / 9, yy + 2.53, z, 0.075, 0.075, d + 0.13);
    box(wood, x, yy + 2.38, z - d / 2 + 0.13, w, 0.15, 0.13);
  }
  function seats(x, yy, z) {
    box(wood, x, yy + 0.22, z, 1.65, 0.12, 0.76, true);
    box("#ccc7b8", x, yy + 0.34, z, 1.55, 0.2, 0.69, true);
    box("#ccc7b8", x, yy + 0.54, z - 0.31, 1.6, 0.34, 0.12, true);
    box(wood, x, yy + 0.13, z + 1.02, 0.88, 0.28, 0.58, true);
    box(stone, x, yy + 0.41, z + 1.02, 0.92, 0.065, 0.64, true);
  }
}
