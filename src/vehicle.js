import { THREE, mesh, textTexture } from "./scene-utils.js";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";
import { sportBodyGeometry } from "./vehicle-geometry.js";

export class VehicleView {
  constructor(scene) {
    this.root = new THREE.Group();
    scene.add(this.root);
    this.chassis = new THREE.Group();
    this.root.add(this.chassis);
    this.wheels = [];
    const paint = new THREE.MeshPhysicalMaterial({
      color: "#267c8b",
      metalness: 0.66,
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
        mesh(
          new RoundedBoxGeometry(w, h, d, 2, Math.min(w, h, d) * 0.22),
          mat,
          body,
          [x, y, z],
          rot,
        );
    // Fender lips and beltline trim define the wheel arches from the side.
    for (const side of [-1, 1]) {
      for (const zz of [-1.37, 1.37]) {
        mesh(
          new THREE.TorusGeometry(0.477, 0.018, 6, 40, Math.PI),
          paint,
          body,
          [side * 1.015, 0.4, zz],
          [0, (side * Math.PI) / 2, 0],
        );
        // Dark wheel-well liner behind each wheel so arches read as openings.
        box(side * 0.83, 0.4, zz, 0.045, 0.56, 0.84, dark);
      }
      box(side * 1.012, 0.59, -0.02, 0.017, 0.018, 1.7, dark);
      box(side * 1.012, 0.74, 0.48, 0.022, 0.055, 0.21, alloy);
      // Side skirts bridging the wheels.
      box(side * 0.99, 0.2, 0, 0.1, 0.16, 1.95, dark);
    }
    paint.side = THREE.DoubleSide;
    mesh(sportBodyGeometry(), paint, body);
    // Glass canopy: windshield, roof panel, rear screen and side windows.
    const q = (a, b, c, d, mat) => {
      const points = [],
        indices = [],
        nx = 10,
        ny = 5;
      for (let j = 0; j <= ny; j++)
        for (let i = 0; i <= nx; i++) {
          const u = i / nx,
            v = j / ny;
          const left = new THREE.Vector3(...a).lerp(new THREE.Vector3(...d), v);
          const right = new THREE.Vector3(...b).lerp(
            new THREE.Vector3(...c),
            v,
          );
          const p = left.lerp(right, u);
          p.y += Math.sin(u * Math.PI) * Math.sin(v * Math.PI) * 0.04;
          points.push(p.x, p.y, p.z);
        }
      for (let j = 0; j < ny; j++)
        for (let i = 0; i < nx; i++) {
          const a = j * (nx + 1) + i,
            b = a + 1,
            c = b + nx + 1,
            d = c - 1;
          indices.push(a, b, c, a, c, d);
        }
      const g = new THREE.BufferGeometry();
      g.setAttribute("position", new THREE.Float32BufferAttribute(points, 3));
      g.setIndex(indices);
      g.computeVertexNormals();
      return mesh(g, mat, body);
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
      const edge = new THREE.CatmullRomCurve3(
        [
          new THREE.Vector3(s * 0.81, 0.89, -0.91),
          new THREE.Vector3(s * 0.67, 1.35, -0.27),
          new THREE.Vector3(s * 0.7, 1.36, 0.56),
          new THREE.Vector3(s * 0.89, 0.96, 1.23),
        ],
        false,
        "centripetal",
      );
      mesh(new THREE.TubeGeometry(edge, 28, 0.024, 6, false), paint, body);
      q(
        [s * 0.83, 0.9, -0.85],
        [s * 0.67, 1.34, -0.25],
        [s * 0.7, 1.33, 0.52],
        [s * 0.88, 0.96, 1.15],
        glass,
      );
      box(s * 0.745, 1.12, 0.39, 0.035, 0.44, 0.055, dark, [0, 0, s * 0.2]);
      // Mirrors on the A-pillar bases.
      box(s * 0.92, 0.98, -0.78, 0.16, 0.07, 0.1, paint);
      box(s * 1.0, 0.25, 0, 0.05, 0.09, 1.7, dark);
      box(s * 1.035, 0.98, -0.61, 0.24, 0.12, 0.31, paint);
      box(s * 0.9, 0.97, -0.6, 0.21, 0.05, 0.08, dark);
      box(s * 1.033, 0.64, 0.64, 0.022, 0.19, 0.45, dark);
      box(
        s * 0.53,
        0.67,
        -2.24,
        0.51,
        0.038,
        0.1,
        new THREE.MeshStandardMaterial({
          color: "#edfaff",
          emissive: "#cceeff",
          emissiveIntensity: 1.3,
          roughness: 0.2,
        }),
        [0, s * 0.19, 0],
      );
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
    box(0, 0.38, -2.345, 1.4, 0.17, 0.045, dark);
    box(0, 0.31, -2.14, 1.82, 0.065, 0.42, dark);
    // Front splitter lip.
    box(0, 0.13, -2.24, 1.6, 0.07, 0.3, dark);
    box(0, 0.4, 2.345, 1.57, 0.23, 0.045, dark);
    for (let i = -3; i <= 3; i++)
      box(i * 0.19, 0.235, 2.24, 0.025, 0.16, 0.37, dark);
    // Twin exhaust tips.
    for (const s of [-1, 1])
      mesh(
        new THREE.CylinderGeometry(0.05, 0.05, 0.16, 12),
        alloy,
        body,
        [s * 0.24, 0.36, 2.4],
        [Math.PI / 2, 0, 0],
      );
    // Integrated trailing edge: a low ducktail, without oversized wing pylons.
    box(0, 0.88, 2.03, 1.85, 0.07, 0.27, paint, [-0.08, 0, 0]);
    this.brakeMat = new THREE.MeshStandardMaterial({
      color: "#b32823",
      emissive: "#ff3325",
      emissiveIntensity: 0.85,
      roughness: 0.28,
    });
    box(0, 0.7, 2.35, 1.61, 0.038, 0.025, this.brakeMat);
    box(0, 0.62, 2.365, 0.24, 0.018, 0.02, alloy);
    const plate = new THREE.MeshBasicMaterial({
      map: textTexture("APEX · 01", {
        bg: "#dddac5",
        fg: "#20333b",
        size: 256,
      }),
    });
    mesh(new THREE.PlaneGeometry(0.55, 0.18), plate, body, [0, 0.51, 2.373]);
    this.wheels = [];
    for (const x of [-1.035, 1.035])
      for (const z of [-1.37, 1.37]) {
        const steer = new THREE.Group();
        steer.position.set(x, 0.37, z);
        this.root.add(steer);
        const wheel = new THREE.Group();
        steer.add(wheel);
        const tireGeo = new THREE.CylinderGeometry(0.37, 0.37, 0.255, 40, 1);
        tireGeo.rotateZ(Math.PI / 2);
        mesh(tireGeo, rubber, wheel);
        const rimGeo = new THREE.CylinderGeometry(0.266, 0.266, 0.266, 40, 1);
        rimGeo.rotateZ(Math.PI / 2);
        mesh(rimGeo, dark, wheel);
        const disc = new THREE.CylinderGeometry(0.205, 0.205, 0.018, 24);
        disc.rotateZ(Math.PI / 2);
        mesh(disc, alloy, wheel, [x > 0 ? 0.1 : -0.1, 0, 0]);
        // Red caliper peeking over the disc.
        mesh(new THREE.BoxGeometry(0.05, 0.12, 0.07), dark, steer, [
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
        for (let i = 0; i < 10; i++) {
          const a = (i * Math.PI * 2) / 10;
          mesh(
            new RoundedBoxGeometry(0.025, 0.23, 0.027, 1, 0.006),
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
    this.shadow.quaternion.copy(this.root.quaternion);
    this.shadow.rotateX(-Math.PI / 2);
  }
}
