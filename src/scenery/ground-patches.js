import { THREE, mesh, quad, geometryFromTriangles } from "./kit.js";

// Project path ribbons and irregular planting beds onto the physics height field.
// Accumulated by material and spatial cell, instead of one mesh per paving stone.
export function groundPath(
  S,
  site,
  points,
  width,
  kind = "paving",
  color = "#bfb8a5",
) {
  const c = Math.cos(site.yaw),
    s = Math.sin(site.yaw);
  const curve = new THREE.CatmullRomCurve3(
    points.map(([x, z]) => new THREE.Vector3(x, 0, z)),
    false,
    "centripetal",
  );
  const steps = Math.max(2, Math.ceil(curve.getLength() / 1.2));
  const out = [];
  const edge = (t, u) => {
    const p = curve.getPoint(t),
      n = curve.getTangent(t);
    const xx = p.x - n.z * u,
      zz = p.z + n.x * u;
    const x = site.x + xx * c - zz * s,
      z = site.z + xx * s + zz * c;
    return [x, S.world.height(x, z) + 0.029, z];
  };
  const across = Math.ceil(width / 1.2);
  for (let i = 0; i < steps; i++)
    for (let j = 0; j < across; j++) {
      const a = -width / 2 + (width * j) / across,
        b = -width / 2 + (width * (j + 1)) / across;
      quad(
        out,
        edge(i / steps, a),
        edge((i + 1) / steps, a),
        edge((i + 1) / steps, b),
        edge(i / steps, b),
      );
    }
  accumulate(S, site, kind, color, out);
}
export function groundBed(S, site, x, z, rx, rz, phase = 0) {
  const out = [],
    alpha = [],
    c = Math.cos(site.yaw),
    s = Math.sin(site.yaw),
    rings = Math.max(3, Math.ceil(Math.max(rx, rz) / 1.2)),
    steps = 32;
  const v = (t, r) => {
    const a = t * Math.PI * 2,
      k = 1 + 0.1 * Math.sin(a * 3 + phase) + 0.05 * Math.sin(a * 5 - phase);
    const u = x + Math.cos(a) * rx * r * k,
      v = z + Math.sin(a) * rz * r * k;
    const xx = site.x + u * c - v * s,
      zz = site.z + u * s + v * c;
    return [xx, S.world.height(xx, zz) + 0.025, zz];
  };
  for (let r = 0; r < rings; r++)
    for (let i = 0; i < steps; i++) {
      quad(
        out,
        v(i / steps, r / rings),
        v((i + 1) / steps, r / rings),
        v((i + 1) / steps, (r + 1) / rings),
        v(i / steps, (r + 1) / rings),
      );
      const fade = (t) =>
        Math.min(1, Math.max(0, ((1 - t) * Math.max(rx, rz)) / 1.2));
      const a = fade(r / rings),
        b = fade((r + 1) / rings);
      alpha.push(a, a, b, a, b, b);
    }
  accumulate(S, site, "sand", "#b0a48a", out, alpha);
}
function accumulate(S, site, kind, color, out, alpha = null) {
  S.groundPatches ||= new Map();
  const key =
    kind +
    color +
    (alpha ? ":feather" : "") +
    ":" +
    Math.floor(site.x / 180) +
    ":" +
    Math.floor(site.z / 180);
  if (!S.groundPatches.has(key))
    S.groundPatches.set(key, {
      kind,
      color,
      positions: [],
      alpha: alpha ? [] : null,
    });
  const dst = S.groundPatches.get(key).positions;
  for (const v of out) dst.push(v);
  if (alpha) for (const a of alpha) S.groundPatches.get(key).alpha.push(a);
}
export function finishGroundPatches(S) {
  for (const { kind, color, positions, alpha } of S.groundPatches?.values() ||
    []) {
    const source = S.art.get(kind, color),
      mat = alpha ? source.clone() : source;
    const geometry = geometryFromTriangles(positions);
    if (alpha) {
      mat.onBeforeCompile = source.onBeforeCompile;
      mat.customProgramCacheKey = source.customProgramCacheKey;
      mat.transparent = true;
      mat.depthWrite = false;
      mat.vertexColors = true;
      geometry.setAttribute(
        "color",
        new THREE.Float32BufferAttribute(
          alpha.flatMap((a) => [1, 1, 1, a]),
          4,
        ),
      );
    }
    mat.side = THREE.DoubleSide;
    mesh(geometry, mat, S.group, [0, 0, 0], [0, 0, 0], [1, 1, 1], false);
  }
  S.groundPatches?.clear();
}
export function connectGarden(S, site) {
  const c = Math.cos(site.yaw),
    s = Math.sin(site.yaw);
  const front = {
    x: site.x - s * (site.d / 2 + 0.3),
    z: site.z + c * (site.d / 2 + 0.3),
  };
  const r = S.world.nearestRoad(front.x, front.z);
  const dx = front.x - r.x,
    dz = front.z - r.z,
    len = Math.hypot(dx, dz);
  if (len < 1 || len > 105) return false;
  const end = {
    x: r.x + (dx / len) * (r.width / 2 + 1),
    z: r.z + (dz / len) * (r.width / 2 + 1),
  };
  // Reject routes through houses or existing furniture, rather than paving over them.
  for (let t = 0; t <= 1; t += 1 / Math.max(1, Math.ceil(len))) {
    const x = front.x + (end.x - front.x) * t,
      z = front.z + (end.z - front.z) * t;
    const objects =
      S.world.grid.get(Math.floor(x / 24) + "," + Math.floor(z / 24)) || [];
    for (const o of objects) {
      if (o.type === "circle") {
        if (Math.hypot(x - o.x, z - o.z) < o.r + 1.15) return false;
      } else {
        const a = o.yaw || 0,
          xx = (x - o.x) * Math.cos(a) + (z - o.z) * Math.sin(a),
          zz = -(x - o.x) * Math.sin(a) + (z - o.z) * Math.cos(a);
        if (Math.abs(xx) < o.w / 2 + 1.15 && Math.abs(zz) < o.d / 2 + 1.15)
          return false;
      }
    }
  }
  groundPath(
    S,
    { x: front.x, z: front.z, yaw: 0 },
    [
      [0, 0],
      [end.x - front.x, end.z - front.z],
    ],
    2.2,
  );
  S.world.gardenPaths ||= [];
  S.world.gardenPaths.push({ a: front, b: end, width: 2.2 });
  return true;
}
