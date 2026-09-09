import { THREE } from "./kit.js";
import { groundPath, groundBed } from "./ground-patches.js";

// Three complete residence plans. First-floor volumes are also the colliders:
// the open forecourt of the L house is genuinely accessible.
export function buildVilla(S, h) {
  const w = S.world,
    b = S.batch,
    W = h.w,
    D = h.d,
    road = w.nearestRoad(h.x, h.z);
  const front =
    -(road.x - h.x) * Math.sin(h.yaw) + (road.z - h.z) * Math.cos(h.yaw);
  const yaw = h.yaw + (front < 0 ? Math.PI : 0),
    c = Math.cos(yaw),
    s = Math.sin(yaw),
    style = h.scenicStyle ?? h.seed % 3;
  const site = { x: h.x, z: h.z, yaw };
  const world = (x, z) => ({ x: h.x + x * c - z * s, z: h.z + x * s + z * c });
  const terrain = w.height(h.x, h.z);
  const y =
    Math.max(
      terrain,
      ...[-1, 1].flatMap((a) =>
        [-1, 1].map((bb) => {
          const p = world(a * W * 0.47, bb * D * 0.47);
          return w.height(p.x, p.z);
        }),
      ),
    ) + 0.025;
  const point = (x, yy, z) => {
    const p = world(x, z);
    return [p.x, y + yy, p.z];
  };
  const wall = S.art.get(
      "stucco",
      ["#ebe6da", "#e6e4dc", "#e3ddce"][style],
      0.88,
    ),
    stone = S.art.get("stone", "#c6bfae", 0.94),
    wood = S.art.get("wood", "#8d7257", 0.79),
    metal = "#33434a";
  S.residenceGlass ||= new THREE.MeshPhysicalMaterial({
    color: "#283f49",
    roughness: 0.17,
    metalness: 0.24,
    clearcoat: 1,
    envMapIntensity: 0.85,
  });
  const box = (mat, x, yy, z, ww, hh, dd) =>
    b.add("box", mat, point(x, yy + hh / 2, z), [ww, hh, dd], [0, -yaw, 0]);
  const volume = (x, z, ww, dd, hh, base = 0, mat = wall) => {
    const f = z + dd / 2;
    if (base === 0) {
      // Individual wall courses carry the floor down to the slope.
      for (const side of [-1, 1])
        for (let i = 0; i < Math.ceil(ww / 2); i++) {
          const width = ww / Math.ceil(ww / 2),
            xx = x - ww / 2 + width * (i + 0.5),
            zz = z + side * (dd / 2 - 0.15),
            p = world(xx, zz);
          const bottom = Math.min(0.02, w.height(p.x, p.z) - y - 0.1);
          box(stone, xx, bottom, zz, width + 0.01, 0.18 - bottom, 0.3);
        }
      for (const side of [-1, 1]) {
        const p = world(x + side * (ww / 2 - 0.15), z),
          bottom = Math.min(-0.06, w.height(p.x, p.z) - y - 0.35);
        box(
          stone,
          x + side * (ww / 2 - 0.15),
          bottom,
          z,
          0.3,
          0.18 - bottom,
          dd,
        );
      }
      const p = world(x, z);
      const solid = {
        type: "box",
        ...p,
        w: ww,
        d: dd,
        h: hh + y - w.height(p.x, p.z),
        yaw,
      };
      w.register(solid);
      (h.groundVolumes ??= []).push(solid);
    }
    box(stone, x, base + 0.16, z, ww, 0.15, dd);
    box(mat, x, base + 0.31, z - dd / 2 + 0.14, ww, hh - 0.31, 0.28);
    for (const side of [-1, 1])
      box(mat, x + side * (ww / 2 - 0.14), base + 0.31, z, 0.28, hh - 0.31, dd);
    // Glazing sits in a real opening between the sill, lintel and jambs.
    box(mat, x, base + 0.31, f - 0.14, ww, 0.48, 0.28);
    box(mat, x, base + hh - 0.43, f - 0.14, ww, 0.43, 0.28);
    const inset = 0.26,
      windowW = ww - 1.0;
    box(S.residenceGlass, x, base + 0.81, f - inset, windowW, hh - 1.29, 0.045);
    for (const side of [-1, 1])
      box(
        mat,
        x + side * (ww / 2 - 0.25),
        base + 0.79,
        f - 0.14,
        0.5,
        hh - 1.2,
        0.28,
      );
    const panes = Math.max(2, Math.round(windowW / 1.7));
    for (let j = 0; j <= panes; j++)
      box(
        metal,
        x - windowW / 2 + (j * windowW) / panes,
        base + 0.8,
        f - inset + 0.04,
        0.035,
        hh - 1.24,
        0.05,
      );
    box(metal, x, base + 0.79, f - inset + 0.04, windowW, 0.035, 0.065);
    box(metal, x, base + hh - 0.45, f - inset + 0.04, windowW, 0.035, 0.065);
    box(stone, x, base + 0.71, f - 0.03, windowW + 0.22, 0.09, 0.48);
    // Roof is a slender projecting slab with an inset fascia, not a thick frame.
    box(metal, x, base + hh, z, ww + 0.28, 0.07, dd + 0.24);
    box(wall, x, base + hh + 0.07, z, ww + 0.42, 0.14, dd + 0.36);
    box(mat, x, base + hh + 0.21, z - dd / 2 + 0.12, ww, 0.2, 0.25);
    return f;
  };
  S.replacedResidenceBounds ||= new Set();
  S.replacedResidenceBounds.add(h);
  let doorX, doorZ, top;
  if (style === 0) {
    // L-plan garden house, sheltered by the side wing; courtyard stays open.
    volume(0, -D * 0.23, W * 0.96, D * 0.49, 3.25);
    volume(-W * 0.32, D * 0.21, W * 0.32, D * 0.39, 3.1);
    doorX = -W * 0.21;
    doorZ = D * 0.015;
    top = 3.7;
    groundPath(
      S,
      site,
      [
        [W * 0.15, D * 0.55],
        [W * 0.13, D * 0.2],
        [0, D * 0.1],
      ],
      2.1,
      "paving",
      "#c6c0ae",
    );
    groundBed(S, site, W * 0.3, D * 0.24, W * 0.12, D * 0.13, h.seed);
  } else if (style === 1) {
    // Tall plaster wing and a lower limestone service wing form a stepped skyline.
    volume(-W * 0.17, -D * 0.04, W * 0.6, D * 0.83, 3.35);
    volume(W * 0.32, -D * 0.22, W * 0.29, D * 0.46, 3.65, 0, stone);
    volume(-W * 0.19, -D * 0.09, W * 0.56, D * 0.68, 2.8, 3.56);
    doorX = W * 0.09;
    doorZ = D * 0.375;
    top = 6.75;
    for (const xx of [-W * 0.37, W * 0.05])
      box(metal, xx, 3.58, D * 0.383, 0.045, 1, 0.045);
    box(metal, -W * 0.16, 4.58, D * 0.383, W * 0.43, 0.035, 0.05);
    box(wood, W * 0.31, 2.85, D * 0.12, W * 0.3, 0.13, D * 0.22);
    box(metal, W * 0.42, 0.02, D * 0.22, 0.075, 2.84, 0.075);
    const p = world(W * 0.42, D * 0.22);
    w.register({ type: "circle", ...p, r: 0.07 });
  } else {
    // Broad pavilion under a coherent inclined canopy, with a stone end wall.
    volume(-W * 0.04, -D * 0.15, W * 0.86, D * 0.64, 3.05);
    volume(W * 0.3, D * 0.25, W * 0.26, D * 0.28, 2.64, 0, stone);
    doorX = -W * 0.32;
    doorZ = D * 0.17;
    top = 3.9;
    b.geometries.residenceRoof ||= (() => {
      const shape = new THREE.Shape();
      shape.moveTo(-0.5, 0);
      shape.lineTo(0.5, 0);
      shape.lineTo(0.5, 0.55);
      shape.lineTo(-0.5, 0.15);
      shape.closePath();
      const g = new THREE.ExtrudeGeometry(shape, {
        depth: 1,
        bevelEnabled: false,
      });
      g.translate(0, 0, -0.5);
      return g;
    })();
    b.add(
      "residenceRoof",
      wall,
      point(-W * 0.04, 3.22, -D * 0.15),
      [W * 0.93, 1, D * 0.73],
      [0, -yaw, 0],
    );
    box(wood, -W * 0.1, 2.83, D * 0.23, W * 0.47, 0.12, 1.12);
  }
  // Closed oak front door: no suggestion that building interiors are playable.
  box(wood, doorX, 0.31, doorZ + 0.02, 1.02, 2.25, 0.13);
  box(metal, doorX + 0.34, 1.13, doorZ + 0.101, 0.024, 0.58, 0.036);
  box(stone, doorX, 0.05, doorZ + 0.33, 1.65, 0.14, 0.61);
  box(stone, doorX, 0.19, doorZ + 0.13, 1.4, 0.12, 0.41);
  h.h = top + y - terrain;
  h.residential = true;
  h.foundationY = y;
}

export function finalizeResidences(S) {
  if (!S.replacedResidenceBounds) return;
  const kept = S.world.obstacles.filter(
    (o) => !S.replacedResidenceBounds.has(o),
  );
  S.world.obstacles = [];
  S.world.grid.clear();
  kept.forEach((o) => S.world.register(o));
}
