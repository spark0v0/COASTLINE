import * as THREE from "three";

// Longitudinal interpolation keeps highlights continuous across bonnet and hips.
// The lower outer skin rises around both wheels: arches are openings in the hull.
export function sportBodyGeometry() {
  const stations = [
    [-2.34, 0.78, 0.58],
    [-2.16, 0.9, 0.67],
    [-1.72, 1.01, 0.87],
    [-1.37, 1.035, 0.91],
    [-0.9, 1.0, 0.86],
    [-0.35, 0.99, 0.9],
    [0.4, 1.015, 0.91],
    [1.0, 1.055, 0.96],
    [1.37, 1.07, 0.95],
    [1.85, 1.01, 0.87],
    [2.18, 0.93, 0.8],
    [2.34, 0.85, 0.74],
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
      [-0.8, 0.17],
      [-0.97, Math.max(0.23, arch)],
      [-1, Math.max(h * 0.55, arch)],
      [-0.99, Math.max(h * 0.77, arch)],
      [-0.94, h * 0.95],
      [-0.79, h * 1.015],
      [-0.52, h],
      [-0.23, h * 0.982],
      [0.23, h * 0.982],
      [0.52, h],
      [0.79, h * 1.015],
      [0.94, h * 0.95],
      [0.99, Math.max(h * 0.77, arch)],
      [1, Math.max(h * 0.55, arch)],
      [0.97, Math.max(0.23, arch)],
      [0.8, 0.17],
      [0.58, 0.16],
    ];
    for (const [x, y] of profile) vertices.push(x * w, y, z);
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
