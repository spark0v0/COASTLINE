import * as THREE from "three";

// Longitudinal interpolation keeps highlights continuous across bonnet and hips.
// The lower outer skin rises around both wheels: arches are openings in the hull.
export function sportBodyGeometry() {
  const stations = [
    [-2.34, 0.72, 0.53],
    [-2.16, 0.91, 0.64],
    [-1.72, 1.025, 0.87],
    [-1.37, 1.045, 0.93],
    [-0.9, 0.99, 0.84],
    [-0.35, 0.965, 0.81],
    [0.4, 0.99, 0.83],
    [1.0, 1.075, 0.94],
    [1.37, 1.085, 0.97],
    [1.85, 1.025, 0.9],
    [2.18, 0.97, 0.82],
    [2.34, 0.87, 0.72],
  ];
  const line = new THREE.CatmullRomCurve3(
    stations.map(([z, w, h]) => new THREE.Vector3(w, h, z)),
    false,
    "centripetal",
  );
  const vertices = [],
    indices = [],
    count = 88;
  const ring = 18;
  for (let k = 0; k <= count; k++) {
    const v = line.getPoint(k / count),
      w = v.x,
      h = v.y,
      z = v.z;
    const dz = Math.min(Math.abs(z - 1.37), Math.abs(z + 1.37));
    const arch = dz < 0.48 ? 0.37 + Math.sqrt(0.48 * 0.48 - dz * dz) : 0.19;
    const profile = [
      [-0.58, 0.16],
      [-0.73, 0.17],
      [-0.97, Math.max(0.23, arch)],
      [-1, Math.max(h * 0.55, arch)],
      [-0.985, Math.max(h * 0.77, arch)],
      [-0.93, h * 0.97],
      [-0.79, h * 1.015],
      [-0.52, h * 0.955],
      [-0.23, h * 0.925],
      [0.23, h * 0.925],
      [0.52, h * 0.955],
      [0.79, h * 1.015],
      [0.93, h * 0.97],
      [0.985, Math.max(h * 0.77, arch)],
      [1, Math.max(h * 0.55, arch)],
      [0.97, Math.max(0.23, arch)],
      [0.73, 0.17],
      [0.58, 0.16],
    ];
    for (const [x, y] of profile) {
      // Pull the bumper corners forward: the tail is a wraparound surface.
      const corner = Math.max(0, (Math.abs(z) - 1.82) / 0.52);
      vertices.push(
        x * w,
        y,
        z - Math.sign(z) * corner * Math.pow(Math.abs(x), 4) * 0.18,
      );
    }
  }
  for (let i = 0; i < count; i++)
    for (let j = 0; j < ring; j++) {
      const a = i * ring + j,
        b = i * ring + ((j + 1) % ring),
        c = b + ring,
        d = a + ring;
      indices.push(a, c, b, a, d, c);
    }
  for (let j = 1; j < ring - 1; j++) {
    indices.push(0, j, j + 1);
    const e = count * ring;
    indices.push(e, e + j + 1, e + j);
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute(
    "position",
    new THREE.Float32BufferAttribute(vertices, 3),
  );
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}

// A single loft joins windscreen, curved roof and long fastback. Shared seam
// vertices eliminate the protruding tube rails of the old four-panel canopy.
export function sportCanopyGeometry() {
  const line = new THREE.CatmullRomCurve3(
    [
      [-1.06, 0.74, 0.79],
      [-0.8, 0.76, 1.02],
      [-0.39, 0.64, 1.29],
      [0.12, 0.65, 1.34],
      [0.51, 0.66, 1.29],
      [0.99, 0.72, 1.12],
      [1.57, 0.77, 0.86],
    ].map(([z, w, h]) => new THREE.Vector3(w, h, z)),
    false,
    "centripetal",
  );
  const p = [],
    indices = [],
    rows = 52,
    cols = 24,
    g = new THREE.BufferGeometry();
  for (let i = 0; i <= rows; i++) {
    const v = line.getPoint(i / rows),
      base = 0.79 + Math.max(0, v.z) * 0.044;
    for (let j = 0; j <= cols; j++) {
      const u = (j / cols) * 2 - 1;
      // Soft shoulder, near-flat crown; window sides are curved, not boxes.
      const arch = Math.pow(Math.max(0, 1 - Math.pow(Math.abs(u), 3)), 0.46);
      p.push(u * v.x, base + (v.y - base) * arch, v.z);
    }
  }
  for (let i = 0; i < rows; i++)
    for (let j = 0; j < cols; j++) {
      const a = i * (cols + 1) + j,
        b = a + 1,
        c = b + cols + 1,
        d = c - 1;
      const z = (p[a * 3 + 2] + p[d * 3 + 2]) * 0.5,
        u = Math.abs(((j + 0.5) / cols) * 2 - 1);
      const roof = z > -0.38 && z < 0.5 && u < 0.72;
      const seam = u > 0.93 || (u > 0.7 && u < 0.8 && z > -0.48 && z < 0.65);
      g.addGroup(indices.length, 6, roof || seam ? 0 : 1);
      indices.push(a, d, b, b, d, c);
    }
  g.setAttribute("position", new THREE.Float32BufferAttribute(p, 3));
  g.setIndex(indices);
  g.computeVertexNormals();
  // Pack by material: the whole canopy takes exactly two draw calls.
  const buckets = [[], []];
  for (const group of g.groups)
    buckets[group.materialIndex].push(
      ...indices.slice(group.start, group.start + group.count),
    );
  g.clearGroups();
  g.setIndex([...buckets[0], ...buckets[1]]);
  g.addGroup(0, buckets[0].length, 0);
  g.addGroup(buckets[0].length, buckets[1].length, 1);
  return g;
}
