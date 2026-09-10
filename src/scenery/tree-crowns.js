import { THREE } from "./kit.js";

// Three interlocking low crowns. These use the same fine leaf mask as olives,
// replacing the old large folded polygons that formed visible rings.
function shrubGeometry(seed, level = 0) {
  const p = [],
    n = [],
    uv = [],
    colors = [];
  const lobes = [
    [-0.36, 0.02, 0.04, 0.67],
    [0.31, 0.07, 0.1, 0.62],
    [0.01, 0.26, -0.27, 0.6],
  ];
  for (let l = 0; l < lobes.length; l++) {
    const [cx, cy, cz, size] = lobes[l],
      turn = seed * 0.37 + l * 2.39996;
    const planes = [
      [0.12, turn, 0],
      [1.25, turn + 0.4, 0.1],
      [1.32, turn + 1.9, -0.2],
      [-0.6, turn + 0.7, 0.3],
      [0.65, turn + 2.1, 0],
    ];
    const count = level === 0 ? 5 : level === 1 ? 4 : 3;
    for (let k = 0; k < count; k++) {
      const matrix = new THREE.Matrix4().makeRotationFromEuler(
        new THREE.Euler(...planes[k]),
      );
      const vertex = (u, v) => {
        const x = (u - 0.5) * 2,
          z = (v - 0.5) * 2;
        const point = new THREE.Vector3(
          x,
          0.2 * (1 - x * x - z * z),
          z,
        ).applyMatrix4(matrix);
        const normal = new THREE.Vector3(
          point.x * 0.55,
          0.6 + Math.abs(point.y) * 0.2,
          point.z * 0.55,
        ).normalize();
        point
          .multiply(new THREE.Vector3(size, 0.55 * size, size))
          .add(new THREE.Vector3(cx, cy, cz));
        return { point, normal };
      };
      for (let i = 0; i < 2; i++)
        for (let j = 0; j < 2; j++) {
          const coords = [
            [i / 2, j / 2],
            [(i + 1) / 2, j / 2],
            [(i + 1) / 2, (j + 1) / 2],
            [i / 2, (j + 1) / 2],
          ];
          for (const q of [0, 2, 1, 0, 3, 2]) {
            const [u, v] = coords[q],
              a = vertex(u, v);
            p.push(...a.point.toArray());
            n.push(...a.normal.toArray());
            uv.push(u, v);
            const shade = 0.86 + l * 0.04;
            colors.push(shade, shade, shade);
          }
        }
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(p, 3));
  g.setAttribute("normal", new THREE.Float32BufferAttribute(n, 3));
  g.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
  g.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
  // Existing landscape instances use a centred unit crown. Keep that contract
  // so replacing the geometry cannot lift a shrub above its planting bed.
  g.computeBoundingBox();
  const center = g.boundingBox.getCenter(new THREE.Vector3());
  const extent = g.boundingBox.getSize(new THREE.Vector3());
  g.translate(-center.x, -center.y, -center.z);
  g.scale(2 / extent.x, 2 / extent.y, 2 / extent.z);
  g.computeBoundingSphere();
  return g;
}
export function installTreeCrowns(S) {
  for (let i = 0; i < 3; i++) {
    S.batch.geometries["treeCrown" + i] = shrubGeometry(722 + i * 17);
    S.batch.lodGeometries["treeCrown" + i] = [
      shrubGeometry(722 + i * 17, 1),
      shrubGeometry(722 + i * 17, 2),
    ];
  }
  S.treeLeafMaterials = ["#506b43", "#617651", "#526d4b", "#6b7e55"].map(
    (color) => {
      const mat = new THREE.MeshStandardMaterial({
        color,
        roughness: 0.96,
        side: THREE.DoubleSide,
        vertexColors: true,
        alphaMap: S.forestMaterials.olive.alphaMap,
        alphaTest: 0.38,
        alphaToCoverage: true,
      });
      mat.userData.instanceTint = "shrub-leaf-masks-v2";
      return mat;
    },
  );
}
