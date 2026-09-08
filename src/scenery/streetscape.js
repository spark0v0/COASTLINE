import { THREE, mesh, quad, geometryFromTriangles } from "./kit.js";
import { ResortKit } from "./resort-kit.js";
import { placeOnVerge } from "./verge-placement.js";

export function buildStreetscape(S) {
  const w = S.world,
    b = S.batch;
  w.streetscape = [];
  buildPromenade(S);
  // Start with the visible coastal approach, then distribute across city streets.
  const samples = [];
  for (const path of w.paths) {
    if (/镜湖|松岭/.test(path.name)) continue;
    for (let i = 8; i < path.points.length - 3; i += 9) {
      const p = path.points[i],
        q = path.points[i + 1];
      if (p.z < -180 || p.z > 890) continue;
      samples.push({ path, p, q, priority: p.x > 455 ? 0 : 1 });
    }
  }
  samples.sort((a, b) => a.priority - b.priority);
  for (const { path, p, q } of samples) {
    if (w.streetscape.length >= 180) break;
    const a = Math.atan2(q.z - p.z, q.x - p.x),
      seaside = p.x > 455;
    for (const side of [-1, 1]) {
      if (w.streetscape.length >= 180) break;
      // Every third location has a deeper seating/flower area where land allows it.
      const variant = w.streetscape.length % 6,
        wide = variant === 0 || variant === 5;
      let site = null;
      for (const setback of seaside ? [8.5, 4.2, 11.5] : [4.2, 7.8]) {
        site = placeOnVerge(w, {
          x: p.x - Math.sin(a) * (path.width / 2 + setback) * side,
          z: p.z + Math.cos(a) * (path.width / 2 + setback) * side,
          yaw: a + (side === 1 ? Math.PI : 0),
          w: wide ? 6 : 5,
          d: wide ? 4 : 2.8,
        });
        if (site) break;
      }
      // Narrow street gaps still get a bench or cycle rack.
      let type = variant;
      if (!site && wide) {
        site = placeOnVerge(w, {
          x: p.x - Math.sin(a) * (path.width / 2 + 4.2) * side,
          z: p.z + Math.cos(a) * (path.width / 2 + 4.2) * side,
          yaw: a + (side === 1 ? Math.PI : 0),
          w: 4.6,
          d: 2.5,
        });
        type = 1;
      }
      if (!site) continue;
      w.streetscape.push(site);
      const k = new ResortKit(S, site);
      k.box(k.stone, 0, -0.6, 0, site.w, 0.72, site.d, true);
      k.solid(0, 0, site.w, site.d, 0.15);
      if (type === 0) shade(k);
      else if (type === 1) cycles(k);
      else if (type === 2) flowers(k);
      else if (type === 3) wayfinding(k);
      else if (type === 4) stall(k);
      else loungers(k);
    }
  }
}

function buildPromenade(S) {
  const w = S.world,
    path = w.paths[0],
    pavers = [],
    edge = [];
  w.promenadeLength = 0;
  for (let i = 1; i < path.points.length; i++) {
    const a = path.points[i - 1],
      b = path.points[i];
    if (a.x < 470 || b.x < 470 || a.z < -130 || a.z > 850) continue;
    const len = Math.hypot(b.x - a.x, b.z - a.z);
    if (!len) continue;
    let nx = -(b.z - a.z) / len,
      nz = (b.x - a.x) / len;
    if (nx < 0) {
      nx = -nx;
      nz = -nz;
    }
    const point = (p, d) => {
      const x = p.x + nx * d,
        z = p.z + nz * d;
      return [x, w.height(x, z) + 0.075, z];
    };
    const l = path.width / 2 + 3.0,
      r = path.width / 2 + 7.1;
    const corners = [point(a, l), point(b, l), point(b, r), point(a, r)];
    if (corners.some(([x, y, z]) => !w.inside(x, z) || y < 0.5)) continue;
    // Buildings are normally inland, but retain the explicit footprint guard.
    if (
      corners.some(([x, , z]) =>
        w.buildings.some((h) => {
          const dx = x - h.x,
            dz = z - h.z,
            c = Math.cos(h.yaw),
            s = Math.sin(h.yaw);
          return (
            Math.abs(dx * c + dz * s) < h.w / 2 + 0.3 &&
            Math.abs(-dx * s + dz * c) < h.d / 2 + 0.3
          );
        }),
      )
    )
      continue;
    quad(pavers, ...corners);
    quad(edge, point(a, r), point(b, r), point(b, r + 0.2), point(a, r + 0.2));
    w.promenadeLength += len;
  }
  for (const [points, material] of [
    [pavers, S.art.get("paving", "#d8d1bd")],
    [edge, S.art.get("limestone", "#a5ae9d")],
  ]) {
    material.side = THREE.DoubleSide;
    mesh(
      geometryFromTriangles(points),
      material,
      S.group,
      [0, 0, 0],
      [0, 0, 0],
      [1, 1, 1],
      false,
    );
  }
}
function shade(k) {
  k.table(0, 0);
  for (const x of [-2.45, 2.45]) k.box(k.wood, x, 0.12, -1.5, 0.13, 2.9, 0.13);
  for (let x = -2.7; x <= 2.7; x += 0.45)
    k.box(k.wood, x, 3.02, -0.2, 0.09, 0.12, 3.7);
  k.box(k.white, 0, 2.89, -1.7, 5.5, 0.15, 0.16, true);
  k.planter(2.2, 1.1, 0.75);
}
function cycles(k) {
  k.bicycle(-0.8, 0, "#5f8d91");
  k.bicycle(0.7, 0, "#c09169");
  for (const x of [-1.55, 0, 1.5]) {
    k.tube(k.metal, [x, 0.12, -0.4], [x, 0.73, -0.4], 0.025);
    k.tube(k.metal, [x, 0.73, -0.4], [x, 0.73, 0.35], 0.025);
    k.tube(k.metal, [x, 0.73, 0.35], [x, 0.12, 0.35], 0.025);
  }
  k.bin(1.95, 0);
}
function flowers(k) {
  k.planter(-0.4, 0, 2.8);
  k.tube(k.metal, [1.8, 0.12, 0], [1.8, 4.15, 0], 0.045);
  k.add("propDisc", k.white, 1.8, 4.14, 0, 0.35, 0.085, 0.35);
  k.box("#bd906f", 1.52, 2.8, 0, 0.45, 1.04, 0.045);
  k.sign("AZUR", 1.5, 3.35, 0.035, 0.4, 0.25, "#7f9a8b");
  for (let i = 0; i < 7; i++) {
    k.add(
      "sphere",
      i % 2 ? "#bca2ab" : "#d6c08d",
      -1.5 + i * 0.33,
      1.18,
      0,
      0.1,
      0.11,
      0.1,
    );
  }
}
function wayfinding(k) {
  k.bench(-0.65, 0);
  k.box(k.wood, 1.55, 0.12, -0.2, 0.08, 1.55, 0.08);
  k.sign("海岛慢行", 1.55, 1.49, -0.14, 1.2, 0.3);
  k.sign("沿路有风景", 1.55, 1.08, -0.14, 1.2, 0.3, "#7a8d79");
  k.bin(-2, 0);
}
function stall(k) {
  k.box(k.wood, 0, 0.12, -0.15, 2.3, 0.81, 1.0, true);
  for (const x of [-1.4, 1.4])
    k.tube(k.metal, [x, 0.12, -0.8], [x, 2.55, -0.8], 0.03);
  k.box(k.fabric, 0, 2.55, -0.05, 3.4, 0.12, 2.35, true);
  k.sign("FLOWERS / 花与海", 0, 2.2, -0.1, 2.7, 0.36, "#967b73");
  for (let i = 0; i < 5; i++) {
    const x = (i - 2) * 0.39;
    k.add("propDisc", "#ac8a69", x, 1.07, -0.12, 0.14, 0.26, 0.14);
    k.add(
      "foliage" + (i % 3),
      ["#9ba17b", "#b59da8", "#c9b284"][i % 3],
      x,
      1.4,
      -0.12,
      0.2,
      0.27,
      0.18,
    );
  }
  k.planter(2, 0, 0.7);
}
function loungers(k) {
  for (const x of [-1.1, 1.1]) {
    k.add("softSlab", k.fabric, x, 0.48, 0, 0.7, 0.09, 1.8, [-0.08, 0, 0]);
    k.add("softSlab", k.fabric, x, 0.82, -0.66, 0.7, 0.08, 0.8, [0.68, 0, 0]);
    for (const z of [-0.65, 0.65]) k.box(k.wood, x, 0.12, z, 0.59, 0.29, 0.075);
  }
  k.umbrella(0, 0.1);
}
