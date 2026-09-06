import {
  THREE,
  mesh,
  quad,
  geometryFromTriangles,
  textTexture,
} from "./scene-utils.js";
import { damp } from "./math.js";

export class VehicleView {
  constructor(scene) {
    this.root = new THREE.Group();
    scene.add(this.root);
    this.chassis = new THREE.Group();
    this.root.add(this.chassis);
    this.wheels = [];
    const paint = new THREE.MeshPhysicalMaterial({
      color: "#d95534",
      metalness: 0.52,
      roughness: 0.23,
      clearcoat: 1,
      clearcoatRoughness: 0.12,
      envMapIntensity: 1.25,
    });
    const dark = new THREE.MeshStandardMaterial({
      color: "#192f37",
      roughness: 0.48,
      metalness: 0.4,
    });
    const glass = new THREE.MeshPhysicalMaterial({
      color: "#153b49",
      metalness: 0.55,
      roughness: 0.14,
      clearcoat: 1,
      envMapIntensity: 1.9,
    });
    const rubber = new THREE.MeshStandardMaterial({
      color: "#172025",
      roughness: 0.94,
    });
    const alloy = new THREE.MeshStandardMaterial({
      color: "#bec9c8",
      metalness: 0.88,
      roughness: 0.28,
    });
    const body = this.chassis,
      box = (x, y, z, w, h, d, mat = paint, rot = [0, 0, 0]) =>
        mesh(new THREE.BoxGeometry(w, h, d), mat, body, [x, y, z], rot);
    // Fender lips and beltline trim define the wheel arches from the side.
    for (const side of [-1, 1]) {
      for (const zz of [-1.37, 1.37]) {
        mesh(
          new THREE.TorusGeometry(0.44, 0.05, 8, 28, Math.PI),
          paint,
          body,
          [side * 1.015, 0.4, zz],
          [0, (side * Math.PI) / 2, 0],
        );
        // Dark wheel-well liner behind each wheel so arches read as openings.
        box(side * 0.96, 0.34, zz, 0.12, 0.52, 0.92, dark, [0, 0, 0]);
      }
      box(side * 1.012, 0.59, -0.02, 0.017, 0.018, 1.7, dark);
      box(side * 1.012, 0.74, 0.48, 0.022, 0.055, 0.21, alloy);
      // Side skirts bridging the wheels.
      box(side * 0.99, 0.2, 0, 0.1, 0.16, 1.95, dark);
    }
    // Hull loft: ten stations, twelve-point rounded sections with tumblehome.
    const sections = [
      [-2.34, 0.72, 0.5],
      [-2.1, 0.86, 0.6],
      [-1.72, 0.96, 0.72],
      [-1.2, 1.02, 0.83],
      [-0.55, 1.04, 0.9],
      [0.35, 1.04, 0.9],
      [1.1, 1.06, 0.93],
      [1.8, 1.0, 0.86],
      [2.15, 0.9, 0.76],
      [2.38, 0.74, 0.62],
    ];
    const section = (w, h) => [
      [-0.62 * w, 0.16],
      [-0.94 * w, 0.24],
      [-1.0 * w, 0.4],
      [-0.97 * w, 0.62],
      [-0.8 * w, 0.88],
      [-0.42 * w, h],
      [0.42 * w, h],
      [0.8 * w, 0.88],
      [0.97 * w, 0.62],
      [1.0 * w, 0.4],
      [0.94 * w, 0.24],
      [0.62 * w, 0.16],
    ];
    const positions = [],
      indices = [];
    for (const [z, w, h] of sections)
      for (const [x, y] of section(w, h)) positions.push(x, y, z);
    const ring = section(1, 1).length;
    for (let i = 1; i < sections.length; i++)
      for (let j = 0; j < ring; j++) {
        const a = (i - 1) * ring + j,
          b = (i - 1) * ring + ((j + 1) % ring),
          c = i * ring + ((j + 1) % ring),
          d = i * ring + j;
        indices.push(a, b, c, a, c, d);
      }
    for (const base of [0, (sections.length - 1) * ring])
      for (let j = 1; j < ring - 1; j++)
        indices.push(base, base + j, base + j + 1);
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
    g.setIndex(indices);
    g.computeVertexNormals();
    paint.side = THREE.DoubleSide;
    mesh(g, paint, body);
    // Glass canopy: windshield, roof panel, rear screen and side windows.
    const q = (a, b, c, d, mat) => {
      const p = [];
      quad(p, a, b, c, d);
      return mesh(geometryFromTriangles(p), mat, body);
    };
    glass.side = THREE.DoubleSide;
    q(
      [-0.8, 0.89, -0.92],
      [0.8, 0.89, -0.92],
      [0.66, 1.36, -0.27],
      [-0.66, 1.36, -0.27],
      glass,
    );
    q(
      [-0.66, 1.36, -0.27],
      [0.66, 1.36, -0.27],
      [0.7, 1.36, 0.57],
      [-0.7, 1.36, 0.57],
      paint,
    );
    q(
      [-0.7, 1.36, 0.57],
      [0.7, 1.36, 0.57],
      [0.88, 0.96, 1.24],
      [-0.88, 0.96, 1.24],
      glass,
    );
    for (const s of [-1, 1]) {
      q(
        [s * 0.83, 0.9, -0.85],
        [s * 0.67, 1.34, -0.25],
        [s * 0.7, 1.33, 0.52],
        [s * 0.88, 0.96, 1.15],
        glass,
      );
      box(s * 0.745, 1.12, 0.39, 0.055, 0.46, 0.07, paint, [0, 0, s * 0.2]);
      // Mirrors on the A-pillar bases.
      box(s * 0.92, 0.98, -0.78, 0.16, 0.07, 0.1, paint);
      box(s * 1.02, 0.35, 0.1, 0.06, 0.15, 3.39, dark);
      box(s * 1.035, 0.98, -0.61, 0.24, 0.12, 0.31, paint);
      box(s * 0.9, 0.97, -0.6, 0.21, 0.05, 0.08, dark);
      box(s * 1.033, 0.64, 0.64, 0.022, 0.19, 0.45, dark);
      box(
        s * 0.77,
        0.73,
        -2.04,
        0.37,
        0.115,
        0.37,
        new THREE.MeshStandardMaterial({
          color: "#fcf4d7",
          emissive: "#fff2c0",
          emissiveIntensity: 0.7,
          roughness: 0.2,
        }),
        [0.1, 0, s * 0.12],
      );
      box(s * 0.62, 0.46, 2.19, 0.23, 0.17, 0.26, alloy);
      box(s * 0.64, 1.02, 1.72, 0.09, 0.27, 0.08, dark);
    }
    // Interior seen through the glass: dash, wheel, seats.
    const cabin = new THREE.MeshStandardMaterial({
      color: "#1c2830",
      roughness: 0.7,
    });
    box(0, 0.82, -0.42, 1.2, 0.16, 0.34, cabin);
    mesh(
      new THREE.TorusGeometry(0.11, 0.02, 6, 20),
      cabin,
      body,
      [-0.36, 0.92, -0.16],
      [0.35, 0, 0],
    );
    for (const s of [-1, 1]) {
      box(s * 0.38, 0.56, 0.32, 0.44, 0.1, 0.5, cabin, [-0.12, 0, 0]);
      box(s * 0.38, 0.72, 0.5, 0.44, 0.42, 0.12, cabin, [-0.12, 0, 0]);
      box(s * 0.38, 1.02, 0.56, 0.3, 0.14, 0.1, cabin, [-0.12, 0, 0]);
    }
    box(0, 0.41, -2.27, 1.41, 0.18, 0.11, dark);
    box(0, 0.31, -2.14, 1.82, 0.065, 0.42, dark);
    // Front splitter lip.
    box(0, 0.13, -2.24, 1.6, 0.07, 0.3, dark);
    box(0, 0.43, 2.2, 1.59, 0.2, 0.09, dark);
    for (let i = -3; i <= 3; i++)
      box(i * 0.19, 0.31, 2.08, 0.035, 0.16, 0.36, dark);
    // Twin exhaust tips.
    for (const s of [-1, 1])
      mesh(
        new THREE.CylinderGeometry(0.05, 0.05, 0.16, 12),
        alloy,
        body,
        [s * 0.24, 0.36, 2.32],
        [Math.PI / 2, 0, 0],
      );
    // Ducktail spoiler: slim wing on low pylons with small endplates.
    box(0, 0.98, 1.78, 0.08, 0.14, 0.14, dark);
    box(0, 1.14, 1.86, 1.52, 0.045, 0.3, paint, [-0.1, 0, 0]);
    for (const s of [-1, 1])
      box(s * 0.76, 1.12, 1.86, 0.03, 0.17, 0.28, dark, [-0.1, 0, 0]);
    this.brakeMat = new THREE.MeshStandardMaterial({
      color: "#b32823",
      emissive: "#ff3325",
      emissiveIntensity: 0.85,
      roughness: 0.28,
    });
    box(0, 0.735, 2.218, 1.69, 0.065, 0.035, this.brakeMat);
    box(0, 0.77, 2.236, 0.17, 0.025, 0.028, alloy);
    const plate = new THREE.MeshBasicMaterial({
      map: textTexture("APEX · 01", {
        bg: "#dddac5",
        fg: "#20333b",
        size: 256,
      }),
    });
    mesh(new THREE.PlaneGeometry(0.55, 0.18), plate, body, [0, 0.53, 2.257]);
    this.wheels = [];
    for (const x of [-1.035, 1.035])
      for (const z of [-1.37, 1.37]) {
        const steer = new THREE.Group();
        steer.position.set(x, 0.37, z);
        this.root.add(steer);
        const wheel = new THREE.Group();
        steer.add(wheel);
        const tireGeo = new THREE.CylinderGeometry(0.37, 0.37, 0.255, 24, 1);
        tireGeo.rotateZ(Math.PI / 2);
        mesh(tireGeo, rubber, wheel);
        const rimGeo = new THREE.CylinderGeometry(0.266, 0.266, 0.266, 24, 1);
        rimGeo.rotateZ(Math.PI / 2);
        mesh(rimGeo, dark, wheel);
        const disc = new THREE.CylinderGeometry(0.205, 0.205, 0.018, 24);
        disc.rotateZ(Math.PI / 2);
        mesh(disc, alloy, wheel, [x > 0 ? 0.1 : -0.1, 0, 0]);
        // Red caliper peeking over the disc.
        mesh(new THREE.BoxGeometry(0.05, 0.12, 0.07), this.brakeMat, wheel, [
          x > 0 ? 0.115 : -0.115,
          0.1,
          0,
        ]);
        mesh(new THREE.BoxGeometry(0.06, 0.19, 0.1), paint, steer, [
          x > 0 ? 0.12 : -0.12,
          0.06,
          0.19,
        ]);
        const side = x > 0 ? 1 : -1;
        mesh(
          new THREE.TorusGeometry(0.254, 0.019, 6, 24),
          alloy,
          wheel,
          [side * 0.14, 0, 0],
          [0, Math.PI / 2, 0],
        );
        for (let i = 0; i < 5; i++) {
          const a = (i * Math.PI * 2) / 5;
          mesh(
            new THREE.BoxGeometry(0.025, 0.23, 0.045),
            alloy,
            wheel,
            [side * 0.15, Math.cos(a) * 0.12, Math.sin(a) * 0.12],
            [a, 0, 0],
          );
        }
        mesh(
          new THREE.CylinderGeometry(0.075, 0.075, 0.285, 12),
          alloy,
          wheel,
          [0, 0, 0],
          [0, 0, Math.PI / 2],
        );
        this.wheels.push({ steer, wheel, front: z < 0 });
      }
    const shadowCanvas = document.createElement("canvas");
    shadowCanvas.width = 128;
    shadowCanvas.height = 256;
    const c = shadowCanvas.getContext("2d"),
      gradient = c.createRadialGradient(64, 128, 14, 64, 128, 110);
    gradient.addColorStop(0, "rgba(9,23,25,.6)");
    gradient.addColorStop(0.5, "rgba(9,23,25,.45)");
    gradient.addColorStop(1, "rgba(9,23,25,0)");
    c.fillStyle = gradient;
    c.fillRect(0, 0, 128, 256);
    this.shadow = new THREE.Mesh(
      new THREE.PlaneGeometry(3.5, 6.2),
      new THREE.MeshBasicMaterial({
        map: new THREE.CanvasTexture(shadowCanvas),
        transparent: true,
        depthWrite: false,
        polygonOffset: true,
        polygonOffsetFactor: -1,
      }),
    );
    this.shadow.rotation.x = -Math.PI / 2;
    scene.add(this.shadow);
    const flameMat = new THREE.MeshBasicMaterial({
      color: "#83fff0",
      transparent: true,
      opacity: 0.85,
      depthWrite: false,
    });
    this.flames = new THREE.Group();
    body.add(this.flames);
    for (const s of [-1, 1])
      mesh(
        new THREE.ConeGeometry(0.105, 0.9, 6),
        flameMat,
        this.flames,
        [s * 0.24, 0.36, 2.75],
        [Math.PI / 2, 0, 0],
        [1, 1, 1],
        false,
      );
  }
  update(car, time) {
    this.root.position.set(car.x, car.y, car.z);
    this.root.rotation.set(0, -car.yaw, 0);
    this.root.rotateX(car.pitch);
    this.root.rotateZ(car.roll);
    this.chassis.rotation.x = car.bodyPitch;
    this.chassis.rotation.z = car.bodyRoll || 0;
    for (const { steer, wheel, front } of this.wheels) {
      steer.rotation.y = front ? -car.steer * 0.38 : 0;
      wheel.rotation.x = -car.wheelSpin;
    }
    this.brakeMat.emissiveIntensity = car.braking ? 3 : 0.65;
    this.flames.visible = car.boost;
    this.flames.scale.z = 0.8 + Math.sin(time * 51) * 0.2;
    this.shadow.position.set(car.x, car.y + 0.016, car.z);
    this.shadow.rotation.set(-Math.PI / 2, 0, car.yaw);
  }
}
