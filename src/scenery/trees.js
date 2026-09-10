import { installForestAssets } from "./forest-assets.js";
import { THREE, geometryFromTriangles, rng } from "./kit.js";
import { installTreeCrowns } from "./tree-crowns.js";

// Shared irregular crowns and a continuous, tapered palm trunk.
// No per-tree geometry or textures: the scenery batch retains spatial culling.
export function buildTrees(S) {
  installForestAssets(S);
  installTreeCrowns(S);
  const b = S.batch,
    w = S.world,
    trunk = S.art.get("wood", "#827761");
  const verts = [],
    indices = [],
    rings = 12,
    sides = 9;
  for (let j = 0; j <= rings; j++) {
    const t = j / rings,
      radius = 0.25 * (1 - 0.54 * t);
    for (let k = 0; k < sides; k++) {
      const a = (k / sides) * Math.PI * 2;
      verts.push(Math.cos(a) * radius + 0.48 * t * t, t, Math.sin(a) * radius);
    }
  }
  for (let j = 0; j < rings; j++)
    for (let k = 0; k < sides; k++) {
      const a = j * sides + k,
        c = j * sides + ((k + 1) % sides);
      indices.push(a, a + sides, c, c, a + sides, c + sides);
    }
  const palm = new THREE.BufferGeometry();
  palm.setAttribute("position", new THREE.Float32BufferAttribute(verts, 3));
  palm.setIndex(indices);
  palm.computeVertexNormals();
  b.geometries.palmTrunk = palm;
  const p = [];
  for (let arm = 0; arm < 19; arm++) {
    const angle = arm * 2.39996,
      dx = Math.cos(angle),
      dz = Math.sin(angle);
    const length = 3.25 + (arm % 4) * 0.43,
      rise = arm < 6 ? 1.7 : 0.8;
    const center = (t) => [
      dx * t * length,
      Math.sin(t * Math.PI) * rise - t * t * (arm < 4 ? 0.9 : 2.0),
      dz * t * length,
    ];
    for (let j = 1; j < 19; j++) {
      const t = j / 19,
        a = center(t),
        v = center(Math.min(1, t + 0.063));
      const span = Math.sin(t * Math.PI) * 0.78;
      for (const side of [-1, 1]) {
        const tip = [
          a[0] - dz * span * side + dx * 0.3,
          a[1] - 0.19,
          a[2] + dx * span * side + dz * 0.3,
        ];
        const rib = [(a[0] + tip[0]) * 0.5, a[1] + 0.06, (a[2] + tip[2]) * 0.5];
        p.push(...a, ...tip, ...rib, ...rib, ...tip, ...v);
      }
    }
  }
  b.geometries.fronds = geometryFromTriangles(p);
  const palmMat = new THREE.MeshStandardMaterial({
    color: "#426a43",
    roughness: 0.87,
    side: THREE.DoubleSide,
  });
  // Each crown has a scalloped silhouette and small planar leaf clusters.
  for (let variant = 0; variant < 3; variant++) {
    const geo = new THREE.IcosahedronGeometry(1, 2),
      a = geo.attributes.position;
    for (let i = 0; i < a.count; i++) {
      const x = a.getX(i),
        y = a.getY(i),
        z = a.getZ(i);
      const f =
        1 +
        0.13 * Math.sin(x * 11 + variant) * Math.cos(z * 9 - y * 8) +
        0.06 * Math.sin(y * 19 + x * 9);
      a.setXYZ(i, x * f, y * f, z * f);
    }
    geo.computeVertexNormals();
    b.geometries["foliage" + variant] = geo;
    b.lodGeometries["foliage" + variant] = [
      new THREE.IcosahedronGeometry(1, 1),
      new THREE.IcosahedronGeometry(1, 0),
    ];
  }
  for (const t of w.trees) {
    const y = w.height(t.x, t.z),
      r = rng(Math.floor(t.seed * 999 + 3000)),
      h = t.h;
    if (t.kind === "palm") {
      b.add("palmTrunk", trunk, [t.x, y, t.z], [1, h, 1], [0, t.seed, 0]);
      b.add(
        "fronds",
        palmMat,
        [t.x + Math.cos(t.seed) * 0.48, y + h, t.z - Math.sin(t.seed) * 0.48],
        [0.85 + h * 0.015, 1, 0.85 + h * 0.015],
        [0, t.seed, 0],
      );
      continue;
    }
    const key =
      (t.kind === "pine" ? "pine" : "olive") +
      (Math.floor(Math.abs(t.seed) * 19) % 3);
    const scale = h / 8;
    b.add(
      key + "Wood",
      trunk,
      [t.x, y, t.z],
      [scale, scale, scale],
      [0, t.seed, 0],
    );
    b.add(
      key + "Leaves",
      S.forestMaterials[t.kind === "pine" ? "pine" : "olive"],
      [t.x, y, t.z],
      [scale, scale, scale],
      [0, t.seed, 0],
    );
  }
}
