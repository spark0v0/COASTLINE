import { THREE, textTexture } from "./kit.js";

// Dimensions are metres. Primitive stock is shared, while recognizable props
// are assembled from curves, thin frames and shaped surfaces rather than cubes.
export class ResortKit {
  constructor(S, site) {
    this.S = S;
    this.b = S.batch;
    this.w = S.world;
    this.site = site;
    this.c = Math.cos(site.yaw);
    this.s = Math.sin(site.yaw);
    this.white = S.art.get("stucco", "#e7e3d7");
    this.wood = S.art.get("wood", "#ac8964", 0.8);
    this.stone = S.art.get("limestone", "#c7c4b5");
    this.metal = "#344b51";
    this.b.geometries.propPole ||= new THREE.CylinderGeometry(1, 1, 1, 10);
    this.b.geometries.propRing ||= new THREE.TorusGeometry(1, 0.065, 6, 24);
    this.b.geometries.propDisc ||= new THREE.CylinderGeometry(1, 1, 1, 24);
    this.b.geometries.surfboard ||= new THREE.CapsuleGeometry(0.5, 1, 4, 12);
    this.b.geometries.parasol ||= new THREE.LatheGeometry(
      [
        [0, 0.32],
        [0.16, 0.3],
        [0.48, 0.22],
        [0.78, 0.11],
        [1, 0],
      ].map(([x, y]) => new THREE.Vector2(x, y)),
      24,
    );
    S.placeMaterials ||= {
      glass: new THREE.MeshPhysicalMaterial({
        color: "#789398",
        roughness: 0.2,
        metalness: 0.23,
        clearcoat: 0.8,
      }),
      canvas: new THREE.MeshStandardMaterial({
        color: "#e5d6b9",
        roughness: 0.95,
        side: THREE.DoubleSide,
      }),
      coral: new THREE.MeshStandardMaterial({
        color: "#bc745d",
        roughness: 0.92,
        side: THREE.DoubleSide,
      }),
    };
    this.glass = S.placeMaterials.glass;
    this.fabric = S.placeMaterials.canvas;
  }
  p(x, y, z) {
    return [
      this.site.x + x * this.c - z * this.s,
      this.site.y + y,
      this.site.z + x * this.s + z * this.c,
    ];
  }
  add(kind, mat, x, y, z, w, h, d, rot = [0, 0, 0], shadow = true) {
    const local = new THREE.Quaternion().setFromEuler(new THREE.Euler(...rot));
    const parent = new THREE.Quaternion().setFromAxisAngle(
      new THREE.Vector3(0, 1, 0),
      -this.site.yaw,
    );
    const e = new THREE.Euler().setFromQuaternion(parent.multiply(local));
    this.b.add(kind, mat, this.p(x, y, z), [w, h, d], [e.x, e.y, e.z], shadow);
  }
  box(mat, x, y, z, w, h, d, rounded = false) {
    this.add(rounded ? "softSlab" : "box", mat, x, y + h / 2, z, w, h, d);
  }
  tube(mat, a, b, r = 0.025) {
    const v = new THREE.Vector3(...this.p(...a)),
      q = new THREE.Vector3(...this.p(...b));
    const dir = q.clone().sub(v),
      e = new THREE.Euler().setFromQuaternion(
        new THREE.Quaternion().setFromUnitVectors(
          new THREE.Vector3(0, 1, 0),
          dir.clone().normalize(),
        ),
      );
    this.b.add(
      "propPole",
      mat,
      v.add(q).multiplyScalar(0.5).toArray(),
      [r, dir.length(), r],
      [e.x, e.y, e.z],
    );
  }
  solid(x, z, w, d, h) {
    const p = this.p(x, 0, z);
    this.w.register({
      type: "box",
      x: p[0],
      z: p[2],
      w,
      d,
      h: h + Math.max(0, this.site.y - this.w.height(p[0], p[2])),
      yaw: this.site.yaw,
    });
  }
  sign(label, x, y, z, w = 3, h = 0.72, bg = "#263f49") {
    this.S.placeSigns ||= new Map();
    const key = label + bg;
    if (!this.S.placeSigns.has(key))
      this.S.placeSigns.set(
        key,
        new THREE.MeshStandardMaterial({
          map: textTexture(label, { bg, fg: "#f2ebdb", size: 512 }),
          roughness: 0.8,
          side: THREE.DoubleSide,
        }),
      );
    this.box(
      this.metal,
      x,
      y - h / 2,
      z - 0.035,
      w + 0.12,
      h + 0.12,
      0.07,
      true,
    );
    this.add(
      "plane",
      this.S.placeSigns.get(key),
      x,
      y,
      z + 0.01,
      w,
      h,
      1,
      [0, 0, 0],
      false,
    );
  }
  deck() {
    this.box(this.stone, 0, -1.2, 0, this.site.w, 1.3, this.site.d, true);
    this.box(this.wood, 0, 0.1, 0, this.site.w - 0.2, 0.055, this.site.d - 0.2);
    for (let x = -this.site.w / 2 + 0.6; x < this.site.w / 2; x += 0.7)
      this.box("#8e7b63", x, 0.155, 0, 0.014, 0.004, this.site.d - 0.3);
    // Low entrance step. All structures stay behind the clear road verge.
    this.box(this.stone, 0, -0.12, this.site.d / 2 + 0.24, 3, 0.25, 0.48, true);
  }
  planter(x, z, w = 1.2) {
    this.box(this.stone, x, 0.16, z, w, 0.52, 0.65, true);
    this.box("#5e6146", x, 0.67, z, w - 0.14, 0.025, 0.52);
    for (let i = 0; i < 3; i++)
      this.add(
        "foliage" + i,
        ["#536c49", "#668155", "#839363"][i],
        x + (i - 1) * w * 0.27,
        0.92,
        z,
        w * 0.34,
        0.3,
        0.35,
      );
    this.solid(x, z, w, 0.65, 0.7);
  }
  bench(x, z) {
    for (let i = 0; i < 5; i++)
      this.box(
        this.wood,
        x,
        0.58,
        z + (i - 2) * 0.085,
        1.65,
        0.055,
        0.07,
        true,
      );
    for (const s of [-1, 1]) {
      this.tube(
        this.metal,
        [x + s * 0.61, 0.16, z - 0.15],
        [x + s * 0.61, 0.6, z - 0.15],
        0.035,
      );
      this.tube(
        this.metal,
        [x + s * 0.61, 0.16, z + 0.15],
        [x + s * 0.61, 0.6, z + 0.15],
        0.035,
      );
      this.tube(
        this.metal,
        [x + s * 0.61, 0.57, z - 0.2],
        [x + s * 0.61, 1.04, z - 0.27],
        0.025,
      );
    }
    for (let j = 0; j < 3; j++)
      this.box(
        this.wood,
        x,
        0.77 + j * 0.095,
        z - 0.25,
        1.65,
        0.072,
        0.045,
        true,
      );
  }
  chair(x, z, back = -1) {
    this.box(this.wood, x, 0.58, z, 0.44, 0.045, 0.44, true);
    for (const a of [-1, 1])
      for (const b of [-1, 1])
        this.tube(
          this.metal,
          [x + a * 0.18, 0.16, z + b * 0.18],
          [x + a * 0.16, 0.58, z + b * 0.16],
          0.018,
        );
    for (const s of [-1, 1])
      this.tube(
        this.metal,
        [x + s * 0.2, 0.58, z + back * 0.17],
        [x + s * 0.22, 1.02, z + back * 0.22],
        0.02,
      );
    this.box(this.wood, x, 0.84, z + back * 0.22, 0.45, 0.13, 0.04, true);
  }
  table(x, z) {
    this.add("propDisc", this.white, x, 0.91, z, 0.52, 0.045, 0.52);
    this.tube(this.metal, [x, 0.18, z], [x, 0.9, z], 0.045);
    this.add("propDisc", this.metal, x, 0.19, z, 0.24, 0.04, 0.24);
    this.chair(x, z - 0.83, -1);
    this.chair(x, z + 0.83, 1);
    this.add("propDisc", this.white, x + 0.15, 0.97, z, 0.055, 0.075, 0.055);
    this.add(
      "propDisc",
      this.white,
      x - 0.13,
      0.94,
      z + 0.13,
      0.12,
      0.016,
      0.12,
    );
  }
  umbrella(x, z, colour = this.fabric) {
    this.tube(this.wood, [x, 0.16, z], [x, 2.65, z], 0.035);
    this.add("parasol", colour, x, 2.6, z, 1.7, 1.3, 1.7);
    for (let j = 0; j < 8; j++) {
      const a = (j * Math.PI) / 4;
      this.tube(
        "#b5a68c",
        [x, 2.95, z],
        [x + Math.cos(a) * 1.68, 2.6, z + Math.sin(a) * 1.68],
        0.011,
      );
    }
  }
  bicycle(x, z, colour = "#b86e51") {
    for (const s of [-1, 1]) {
      this.add("propRing", "#25353a", x + s * 0.59, 0.49, z, 0.32, 0.32, 0.32);
      this.add(
        "propRing",
        "#a5b3b0",
        x + s * 0.59,
        0.49,
        z,
        0.277,
        0.277,
        0.277,
      );
      for (let i = 0; i < 6; i++) {
        const a = (i * Math.PI) / 3;
        this.tube(
          "#a7b5b1",
          [x + s * 0.59, 0.49, z],
          [x + s * 0.59 + Math.cos(a) * 0.28, 0.49 + Math.sin(a) * 0.28, z],
          0.006,
        );
      }
    }
    const a = [x - 0.59, 0.49, z],
      b = [x - 0.12, 0.49, z],
      c = [x - 0.23, 1.0, z],
      d = [x + 0.35, 1.02, z],
      e = [x + 0.59, 0.49, z];
    for (const [p, q] of [
      [a, b],
      [a, c],
      [b, c],
      [b, d],
      [c, d],
      [d, e],
    ])
      this.tube(colour, p, q, 0.022);
    this.tube(this.metal, c, [x - 0.24, 1.13, z], 0.021);
    this.box("#26363b", x - 0.25, 1.12, z, 0.25, 0.045, 0.14, true);
    this.tube(this.metal, d, [x + 0.3, 1.23, z], 0.019);
    this.tube(
      this.metal,
      [x + 0.3, 1.23, z - 0.2],
      [x + 0.3, 1.23, z + 0.2],
      0.018,
    );
    this.add(
      "propRing",
      this.metal,
      x - 0.12,
      0.49,
      z + 0.025,
      0.095,
      0.095,
      0.095,
    );
    this.tube(
      this.metal,
      [x - 0.12, 0.49, z],
      [x - 0.23, 0.37, z + 0.12],
      0.012,
    );
  }
  bin(x, z) {
    this.box(this.metal, x, 0.16, z, 0.42, 0.82, 0.42, true);
    this.box(this.wood, x, 0.26, z + 0.216, 0.33, 0.54, 0.035);
    this.box("#111f24", x, 0.79, z + 0.225, 0.24, 0.095, 0.014, true);
    this.solid(x, z, 0.42, 0.42, 1);
  }
  pavilion(label, accent = "#b77859") {
    const z = -this.site.d * 0.23;
    this.box(this.white, 0, 0.16, z, 6, 2.95, 3.4, true);
    this.box(accent, -2.8, 0.22, z + 0.18, 0.16, 2.8, 3.25);
    this.box(this.metal, 0, 0.7, z + 1.71, 4.9, 1.55, 0.06);
    this.box(this.glass, 0, 0.77, z + 1.76, 4.7, 1.38, 0.025);
    this.box(this.wood, 0, 0.72, z + 1.96, 5.4, 0.1, 0.58, true);
    this.box(this.white, 0, 3.12, z + 0.35, 7.0, 0.19, 4.5, true);
    for (let i = -4; i <= 4; i++)
      this.box(this.wood, i * 0.7, 3.3, z + 0.4, 0.09, 0.13, 4.6);
    this.sign(label, 0, 2.73, z + 1.84, 4.5, 0.52, accent);
    for (const side of [-1, 1])
      this.box(this.metal, side * 1.2, 0.76, z + 1.79, 0.045, 1.43, 0.025);
    this.solid(0, z, 6, 3.4, 3.5);
  }
}
