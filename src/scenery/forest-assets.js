import { THREE, rng } from "./kit.js";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";

// Metre-scale tree assets: crooked trunk, primary limbs, fine forks and small
// leaf sprays. Generated once, then instanced with distance-specific leaf LODs.
function treeAsset(pine, seed, density = 1) {
  const r = rng(seed),
    wood = [],
    p = [],
    n = [],
    colors = [];
  const branch = (a, b, ra, rb) => {
    const from = new THREE.Vector3(...a),
      to = new THREE.Vector3(...b),
      dir = to.clone().sub(from);
    const g = new THREE.CylinderGeometry(rb, ra, dir.length(), 7, 1);
    g.applyQuaternion(
      new THREE.Quaternion().setFromUnitVectors(
        new THREE.Vector3(0, 1, 0),
        dir.normalize(),
      ),
    );
    g.translate(...from.add(to).multiplyScalar(0.5).toArray());
    wood.push(g);
  };
  const trunk = pine
    ? [
        [0, 0, 0],
        [0.14, 1.5, 0.04],
        [-0.12, 3.1, 0.13],
        [0.08, 4.45, 0],
      ]
    : [
        [0, 0, 0],
        [0.21, 0.9, 0.12],
        [-0.12, 1.7, 0.17],
        [0.18, 2.8, -0.06],
      ];
  for (let i = 1; i < trunk.length; i++)
    branch(trunk[i - 1], trunk[i], 0.25 - i * 0.035, 0.21 - i * 0.035);
  const leaf = (center, axis, widthAxis, len, width, shade) => {
    const base = center.clone().addScaledVector(axis, -len * 0.45),
      tip = center.clone().addScaledVector(axis, len * 0.55),
      left = center.clone().addScaledVector(widthAxis, -width),
      right = center.clone().addScaledVector(widthAxis, width),
      normal = new THREE.Vector3().crossVectors(axis, widthAxis).normalize();
    if (normal.y < 0) normal.negate();
    normal.lerp(new THREE.Vector3(0, 1, 0), 0.45).normalize();
    for (const v of [base, left, tip, base, tip, right]) {
      p.push(v.x, v.y, v.z);
      n.push(normal.x, normal.y, normal.z);
      colors.push(shade * 0.88, shade, shade * 0.78);
    }
  };
  const crownCount = pine ? 7 : 6;
  for (let i = 0; i < crownCount; i++) {
    const angle = i * 2.39996 + seed,
      reach = (pine ? 2.7 : 2.05) * (0.73 + r() * 0.3),
      end = [
        Math.cos(angle) * reach,
        (pine ? 5.95 : 4.5) + r() * 0.7,
        Math.sin(angle) * reach,
      ],
      mid = [end[0] * 0.43, (pine ? 4.65 : 3.13) + r() * 0.3, end[2] * 0.43];
    branch(trunk.at(-1), mid, 0.13, 0.08);
    branch(mid, end, 0.08, 0.035);
    for (let fork = 0; fork < 2; fork++) {
      const a = angle + (fork ? 0.8 : -0.65),
        tip = [
          end[0] + Math.cos(a) * 0.66,
          end[1] + 0.23,
          end[2] + Math.sin(a) * 0.66,
        ];
      branch(end, tip, 0.034, 0.012);
      // Fixed random stream per LOD keeps the crown volumes in the same place.
      const foliage = rng(seed * 31 + i * 13 + fork * 7);
      for (let j = 0; j < Math.round(55 * density); j++) {
        const az = foliage() * Math.PI * 2,
          radius = Math.sqrt(foliage()),
          yy = foliage() - 0.5,
          center = new THREE.Vector3(
            tip[0] + Math.cos(az) * radius * (pine ? 1.35 : 1),
            tip[1] + yy * (pine ? 0.85 : 1.4),
            tip[2] + Math.sin(az) * radius,
          ),
          axis = new THREE.Vector3(
            Math.cos(az),
            0.3 + yy,
            Math.sin(az),
          ).normalize(),
          widthAxis = new THREE.Vector3(
            -Math.sin(az),
            0.1,
            Math.cos(az),
          ).normalize();
        for (let k = 0; k < 4; k++) {
          const s = k % 2 ? 1 : -1,
            pos = center
              .clone()
              .addScaledVector(axis, (k - 1.5) * 0.12)
              .addScaledVector(widthAxis, s * 0.08),
            leafAxis = axis
              .clone()
              .multiplyScalar(0.65)
              .addScaledVector(widthAxis, s * 0.7)
              .normalize();
          leaf(
            pos,
            leafAxis,
            new THREE.Vector3()
              .crossVectors(new THREE.Vector3(0, 1, 0), leafAxis)
              .normalize(),
            pine ? 0.23 : 0.18,
            pine ? 0.055 : 0.032,
            0.77 + foliage() * 0.22,
          );
        }
      }
    }
  }
  const leaves = new THREE.BufferGeometry();
  leaves.setAttribute("position", new THREE.Float32BufferAttribute(p, 3));
  leaves.setAttribute("normal", new THREE.Float32BufferAttribute(n, 3));
  leaves.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
  const trunkGeo = mergeGeometries(wood);
  wood.forEach((g) => g.dispose());
  return { wood: trunkGeo, leaves };
}
export function installForestAssets(S) {
  for (const species of ["pine", "olive"])
    for (let v = 0; v < 2; v++) {
      const seed = 313 + v * 77,
        near = treeAsset(species === "pine", seed),
        mid = treeAsset(species === "pine", seed, 0.38),
        far = treeAsset(species === "pine", seed, 0.14),
        key = species + v;
      S.batch.geometries[key + "Wood"] = near.wood;
      S.batch.geometries[key + "Leaves"] = near.leaves;
      S.batch.lodGeometries[key + "Leaves"] = [mid.leaves, far.leaves];
      mid.wood.dispose();
      far.wood.dispose();
    }
}
