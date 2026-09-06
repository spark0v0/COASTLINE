import * as THREE from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";

export function geometryFromTriangles(positions, colors) {
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  if (colors)
    g.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
  g.computeVertexNormals();
  return g;
}
export function quad(out, a, b, c, d) {
  out.push(...a, ...b, ...c, ...a, ...c, ...d);
}
export function mesh(
  geo,
  material,
  parent,
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  scale = [1, 1, 1],
  shadow = true,
) {
  const m = new THREE.Mesh(geo, material);
  m.position.set(...position);
  m.rotation.set(...rotation);
  m.scale.set(...scale);
  m.castShadow = shadow;
  m.receiveShadow = true;
  parent.add(m);
  return m;
}
export class Batch {
  constructor(parent) {
    this.parent = parent;
    this.meshes = [];
    this.buckets = new Map();
    this.materials = new Map();
    this.geometries = {
      box: new THREE.BoxGeometry(1, 1, 1),
      cylinder: new THREE.CylinderGeometry(0.83, 1, 1, 12),
      cone: new THREE.ConeGeometry(1, 1, 8),
      sphere: new THREE.IcosahedronGeometry(1, 2),
      plane: new THREE.PlaneGeometry(1, 1),
    };
    this.object = new THREE.Object3D();
  }
  material(color, roughness = 0.82) {
    const key = color + ":" + roughness;
    if (!this.materials.has(key))
      this.materials.set(
        key,
        new THREE.MeshStandardMaterial({ color, roughness }),
      );
    return this.materials.get(key);
  }
  add(kind, color, pos, size, rotation = [0, 0, 0], shadow = true) {
    const mat = typeof color === "string" ? this.material(color) : color,
      key =
        kind +
        ":" +
        mat.uuid +
        ":" +
        shadow +
        ":" +
        Math.floor(pos[0] / 180) +
        ":" +
        Math.floor(pos[2] / 180);
    if (!this.buckets.has(key))
      this.buckets.set(key, {
        geo: this.geometries[kind],
        mat,
        matrices: [],
        shadow,
        center: {
          x: (Math.floor(pos[0] / 180) + 0.5) * 180,
          z: (Math.floor(pos[2] / 180) + 0.5) * 180,
        },
      });
    this.object.position.set(...pos);
    this.object.scale.set(...size);
    this.object.rotation.set(...rotation);
    this.object.updateMatrix();
    this.buckets.get(key).matrices.push(this.object.matrix.clone());
  }
  box(color, x, y, z, w, h, d, yaw = 0, shadow = true) {
    this.add("box", color, [x, y + h / 2, z], [w, h, d], [0, -yaw, 0], shadow);
  }
  finish() {
    for (const b of this.buckets.values()) {
      const m = new THREE.InstancedMesh(b.geo, b.mat, b.matrices.length);
      b.matrices.forEach((mat, i) => m.setMatrixAt(i, mat));
      m.castShadow = b.shadow;
      m.receiveShadow = true;
      m.computeBoundingSphere();
      m.userData.optionalDetail = !b.shadow && b.geo === this.geometries.box;
      m.userData.center = b.center;
      this.parent.add(m);
      this.meshes.push(m);
    }
    this.buckets.clear();
  }
  updateVisibility(x, z, low) {
    const limit = low ? 520 : 1000;
    for (const m of this.meshes) {
      const p = m.userData.center;
      m.visible =
        Math.hypot(p.x - x, p.z - z) < limit &&
        !(
          low &&
          m.userData.optionalDetail &&
          Math.hypot(p.x - x, p.z - z) > 170
        );
    }
  }
}
export function textTexture(
  text,
  { bg = "#193c44", fg = "#f7f0d4", size = 256 } = {},
) {
  const c = document.createElement("canvas");
  c.width = size;
  c.height = size / 3;
  const x = c.getContext("2d");
  x.fillStyle = bg;
  x.fillRect(0, 0, c.width, c.height);
  x.fillStyle = fg;
  x.font = `600 ${size / 9}px "Segoe UI", "Microsoft YaHei", sans-serif`;
  x.textAlign = "center";
  x.textBaseline = "middle";
  x.fillText(text, c.width / 2, c.height / 2);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}
export { THREE, mergeGeometries };
