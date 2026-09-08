import { THREE, rng } from "./kit.js";

// Folded leaf sprays around a small shaded core. No alpha cards or per-tree meshes.
export function crownGeometry(seed, count = 76) {
  const random = rng(seed),
    positions = [],
    normals = [],
    colors = [];
  const core = new THREE.IcosahedronGeometry(0.58, 1);
  const cp = core.attributes.position;
  for (let i = 0; i < cp.count; i++) {
    const x = cp.getX(i),
      y = cp.getY(i),
      z = cp.getZ(i),
      n = new THREE.Vector3(x, y, z).normalize();
    positions.push(x, y, z);
    normals.push(n.x, n.y, n.z);
    colors.push(0.53, 0.65, 0.47);
  }
  core.dispose();
  const tri = (a, b, c, n, col) => {
    for (const p of [a, b, c]) {
      positions.push(...p);
      normals.push(n.x, n.y, n.z);
      colors.push(...col);
    }
  };
  for (let i = 0; i < count; i++) {
    const yy = 1 - (2 * (i + 0.5)) / count,
      a = i * 2.39996 + seed,
      rad = Math.sqrt(1 - yy * yy),
      n = new THREE.Vector3(Math.cos(a) * rad, yy, Math.sin(a) * rad);
    const center = n.clone().multiplyScalar(0.68 + random() * 0.26);
    const tangent = new THREE.Vector3(
      -Math.sin(a),
      0.2 * (random() - 0.5),
      Math.cos(a),
    ).normalize();
    const length = 0.23 + random() * 0.18,
      width = 0.12 + random() * 0.075;
    const axis = new THREE.Vector3().crossVectors(n, tangent).normalize();
    const base = center.clone().addScaledVector(axis, -length * 0.6),
      tip = center.clone().addScaledVector(axis, length),
      left = center.clone().addScaledVector(tangent, -width),
      right = center.clone().addScaledVector(tangent, width),
      fold = center.clone().addScaledVector(n, 0.06);
    const shade = 0.72 + random() * 0.25;
    const col = [shade * 0.86, shade, shade * 0.79];
    const normal = n
      .clone()
      .lerp(new THREE.Vector3(0, 1, 0), 0.3)
      .normalize();
    tri(base.toArray(), left.toArray(), fold.toArray(), normal, col);
    tri(left.toArray(), tip.toArray(), fold.toArray(), normal, col);
    tri(tip.toArray(), right.toArray(), fold.toArray(), normal, col);
    tri(right.toArray(), base.toArray(), fold.toArray(), normal, col);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  g.setAttribute("normal", new THREE.Float32BufferAttribute(normals, 3));
  g.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
  g.computeBoundingSphere();
  return g;
}

export function installTreeCrowns(S) {
  for (let i = 0; i < 3; i++) {
    S.batch.geometries["treeCrown" + i] = crownGeometry(722 + i * 17);
    S.batch.lodGeometries["treeCrown" + i] = [
      crownGeometry(722 + i * 17, 34),
      crownGeometry(722 + i * 17, 18),
    ];
  }
  S.treeLeafMaterials = ["#638168", "#78886c", "#6a8068", "#819075"].map(
    (color) => {
      const mat = new THREE.MeshStandardMaterial({
        color,
        roughness: 0.86,
        side: THREE.DoubleSide,
        vertexColors: true,
      });
      mat.userData.instanceTint = "tree-leaf-sprays";
      return mat;
    },
  );
}
