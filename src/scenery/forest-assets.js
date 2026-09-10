import { THREE, rng } from "./kit.js";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";

// A reusable leaf-spray mask. Colour comes from the canopy, so mipmapped
// transparent edges never introduce black fringes into the leaf colour.
function leafMask(pine) {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = 512;
  const ctx = canvas.getContext("2d"),
    r = rng(pine ? 581 : 791);
  ctx.fillStyle = "#000";
  ctx.fillRect(0, 0, 512, 512);
  for (let sprig = 0; sprig < 76; sprig++) {
    const a = r() * Math.PI * 2,
      radius = Math.sqrt(r()) * 182;
    const x = 256 + Math.cos(a) * radius,
      y = 256 + Math.sin(a) * radius;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(r() * 6.28);
    ctx.strokeStyle = "#d5d5d5";
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(0, 21);
    ctx.quadraticCurveTo(4, -3, 0, -24);
    ctx.stroke();
    for (let j = 0; j < 5; j++)
      for (const side of [-1, 1]) {
        ctx.save();
        ctx.translate(side * (7 + j * 0.8), 17 - j * 9);
        ctx.rotate(side * (0.62 + j * 0.07));
        ctx.fillStyle = j % 2 ? "#fff" : "#ececec";
        ctx.beginPath();
        ctx.ellipse(0, 0, pine ? 5.2 : 7.5, pine ? 15 : 12, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
    ctx.restore();
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.anisotropy = 4;
  tex.colorSpace = THREE.NoColorSpace;
  return tex;
}

// Each crown lobe is a volume of bowed leaf sprays, never a solid sphere.
// Far LOD retains every lobe and its extent, simplifying its internal layers.
function treeAsset(pine, seed, level = 0) {
  const r = rng(seed),
    wood = [],
    p = [],
    n = [],
    uv = [],
    colors = [];
  const branch = (a, b, ra, rb) => {
    const from = new THREE.Vector3(...a),
      to = new THREE.Vector3(...b),
      dir = to.clone().sub(from);
    const g = new THREE.CylinderGeometry(
      rb,
      ra,
      dir.length(),
      level === 2 ? 5 : 7,
      1,
    );
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
        [0.17, 1.7, 0.09],
        [-0.14, 3.05, 0.13],
        [0.22, 4.4, -0.09],
      ]
    : [
        [0, 0, 0],
        [0.24, 0.85, 0.13],
        [-0.14, 1.7, 0.19],
        [0.15, 2.7, -0.11],
      ];
  for (let i = 1; i < trunk.length; i++)
    branch(trunk[i - 1], trunk[i], 0.27 - i * 0.034, 0.23 - i * 0.039);
  let lobeIndex = 0;
  function lobe(center, sizes) {
    const random = rng(seed * 61 + lobeIndex++ * 29);
    const turn = random() * 6.28,
      shade = 0.83 + random() * 0.15;
    const orientations = [
      [0.18, turn, 0.1],
      [Math.PI * 0.45, turn + 0.2, 0],
      [Math.PI * 0.47, turn + Math.PI * 0.5, 0.12],
      [-0.3, turn + 1.8, 0.15],
      [0.63, turn + 0.65, 0.4],
      [-0.65, turn + 2.1, -0.4],
    ];
    const layers = level === 0 ? 6 : level === 1 ? 4 : 3,
      steps = level === 2 ? 2 : 3;
    for (let k = 0; k < layers; k++) {
      const rotation = new THREE.Matrix4().makeRotationFromEuler(
        new THREE.Euler(...orientations[k]),
      );
      const vertex = (u, v) => {
        const xx = (u - 0.5) * 2,
          zz = (v - 0.5) * 2;
        const point = new THREE.Vector3(
          xx,
          0.28 * (1 - xx * xx - zz * zz),
          zz,
        ).applyMatrix4(rotation);
        const normal = new THREE.Vector3(
          point.x * 0.25,
          Math.abs(point.y) * 0.35 + 0.8,
          point.z * 0.25,
        ).normalize();
        return {
          point: point
            .multiply(new THREE.Vector3(...sizes))
            .add(new THREE.Vector3(...center)),
          normal,
        };
      };
      for (let i = 0; i < steps; i++)
        for (let j = 0; j < steps; j++) {
          const coords = [
            [i / steps, j / steps],
            [(i + 1) / steps, j / steps],
            [(i + 1) / steps, (j + 1) / steps],
            [i / steps, (j + 1) / steps],
          ];
          for (const q of [0, 2, 1, 0, 3, 2]) {
            const [u, v] = coords[q],
              vtx = vertex(u, v);
            p.push(...vtx.point.toArray());
            n.push(...vtx.normal.toArray());
            uv.push(u, v);
            colors.push(shade * 0.95, shade, shade * 0.9);
          }
        }
    }
  }
  const count = pine ? 7 : 6;
  for (let i = 0; i < count; i++) {
    const a = i * 2.39996 + seed + (r() - 0.5) * 0.45;
    const reach = (pine ? 2.35 : 1.65) * (0.78 + r() * 0.4);
    const end = [
      Math.cos(a) * reach,
      (pine ? 4.95 : 3.65) + r() * (pine ? 1.25 : 1.6),
      Math.sin(a) * reach,
    ];
    const origin = trunk[i % 3 === 0 ? 2 : 3];
    const mid = [
      end[0] * 0.46,
      origin[1] + (end[1] - origin[1]) * 0.55,
      end[2] * 0.46,
    ];
    branch(origin, mid, 0.12, 0.07);
    branch(mid, end, 0.07, 0.025);
    lobe(
      [end[0] * 0.73, end[1] - 0.25, end[2] * 0.73],
      pine ? [1.25, 0.7, 1.12] : [0.97, 1.08, 0.94],
    );
    for (let fork = 0; fork < 2; fork++) {
      const fa = a + (fork ? 0.68 : -0.55);
      const tip = [
        end[0] + Math.cos(fa) * 0.64,
        end[1] + 0.18 + (fork ? 0.24 : -0.12),
        end[2] + Math.sin(fa) * 0.64,
      ];
      branch(end, tip, 0.03, 0.009);
      lobe(tip, pine ? [1.3, 0.71, 1.13] : [1.0, 1.04, 0.97]);
    }
  }
  lobe(
    [0.1, pine ? 6.35 : 5.14, 0],
    pine ? [1.52, 0.79, 1.37] : [1.23, 1.03, 1.1],
  );
  lobe(
    [-0.55, pine ? 5.55 : 4.1, 0.4],
    pine ? [1.39, 0.86, 1.34] : [1.04, 1.1, 1.13],
  );
  const leaves = new THREE.BufferGeometry();
  leaves.setAttribute("position", new THREE.Float32BufferAttribute(p, 3));
  leaves.setAttribute("normal", new THREE.Float32BufferAttribute(n, 3));
  leaves.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
  leaves.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
  leaves.computeBoundingSphere();
  const trunkGeo = mergeGeometries(wood);
  wood.forEach((g) => g.dispose());
  return { wood: trunkGeo, leaves };
}
export function installForestAssets(S) {
  S.forestMaterials = {};
  for (const species of ["pine", "olive"]) {
    const pine = species === "pine";
    const mat = new THREE.MeshStandardMaterial({
      color: pine ? "#446039" : "#5e754f",
      roughness: 0.94,
      vertexColors: true,
      alphaMap: leafMask(pine),
      alphaTest: 0.38,
      alphaToCoverage: true,
      side: THREE.DoubleSide,
      emissive: pine ? "#5f7049" : "#748369",
      emissiveIntensity: 0.08,
    });
    S.forestMaterials[species] = mat;
    for (let v = 0; v < 3; v++) {
      const seed = 313 + v * 137,
        near = treeAsset(pine, seed),
        mid = treeAsset(pine, seed, 1),
        far = treeAsset(pine, seed, 2),
        key = species + v;
      S.batch.geometries[key + "Wood"] = near.wood;
      S.batch.geometries[key + "Leaves"] = near.leaves;
      S.batch.lodGeometries[key + "Leaves"] = [mid.leaves, far.leaves];
      S.batch.lodGeometries[key + "Wood"] = [mid.wood, far.wood];
    }
  }
}
