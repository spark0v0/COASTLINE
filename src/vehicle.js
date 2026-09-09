import { THREE, mesh, textTexture } from "./scene-utils.js";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";
import { sportBodyGeometry, sportCanopyGeometry } from "./vehicle-geometry.js";

export class VehicleView {
  constructor(scene) {
    this.root = new THREE.Group();
    scene.add(this.root);
    this.chassis = new THREE.Group();
    this.root.add(this.chassis);
    this.wheels = [];
    const paint = new THREE.MeshPhysicalMaterial({
      color: "#176d87",
      metalness: 0.46,
      roughness: 0.29,
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
      color: "#283b45",
      metalness: 0.12,
      roughness: 0.14,
      clearcoat: 1,
      envMapIntensity: 1.3,
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

      // Side skirts bridging the wheels.
      box(side * 0.99, 0.2, 0, 0.1, 0.16, 1.95, dark);
    }
    paint.side = THREE.DoubleSide;
    mesh(sportBodyGeometry(), paint, body);
    glass.side = THREE.DoubleSide;
    mesh(sportCanopyGeometry(), [paint, glass], body);
    const lamp = new THREE.MeshStandardMaterial({
      color: "#effbff",
      emissive: "#c3e9ff",
      emissiveIntensity: 1.1,
      roughness: 0.24,
    });
    for (const side of [-1, 1]) {
      box(side * 0.94, 0.94, -0.69, 0.17, 0.04, 0.1, dark);
      box(side * 1.04, 0.97, -0.64, 0.22, 0.09, 0.29, paint);
      // Flush door handles and a narrow side intake below the rear shoulder.
      box(side * 0.984, 0.73, 0.39, 0.018, 0.025, 0.18, alloy);
      box(side * 1.008, 0.53, 0.67, 0.016, 0.12, 0.28, dark, [
        0,
        0,
        side * -0.15,
      ]);
      const curve = new THREE.CatmullRomCurve3([
        new THREE.Vector3(side * 0.37, 0.64, -2.24),
        new THREE.Vector3(side * 0.66, 0.65, -2.22),
        new THREE.Vector3(side * 0.83, 0.68, -2.09),
      ]);
      mesh(new THREE.TubeGeometry(curve, 16, 0.017, 6, false), lamp, body);
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
    // A narrow recessed rear grille and lower valance, framed by the body.
    box(0, 0.43, 2.347, 1.22, 0.1, 0.025, dark);
    box(0, 0.29, 2.3, 1.57, 0.065, 0.2, dark);
    for (const side of [-1, 1])
      box(side * 0.76, 0.39, 2.31, 0.17, 0.2, 0.11, paint);

    for (let i = -2; i <= 2; i++)
      box(i * 0.24, 0.23, 2.2, 0.023, 0.1, 0.28, dark);
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
    // Rear shoulder and deck are sculpted into the continuous body loft.
    this.brakeMat = new THREE.MeshStandardMaterial({
      color: "#b32823",
      emissive: "#ff3325",
      emissiveIntensity: 0.85,
      roughness: 0.28,
    });
    for (const side of [-1, 1]) {
      const curve = new THREE.CatmullRomCurve3([
        new THREE.Vector3(side * 0.24, 0.694, 2.356),
        new THREE.Vector3(side * 0.6, 0.716, 2.322),
        new THREE.Vector3(side * 0.83, 0.752, 2.225),
      ]);
      mesh(new THREE.TubeGeometry(curve, 22, 0.032, 8, false), dark, body);
      const light = curve.clone();
      light.points.forEach((p) => (p.z += 0.018));
      mesh(
        new THREE.TubeGeometry(light, 22, 0.016, 6, false),
        this.brakeMat,
        body,
      );
    }
    box(0, 0.62, 2.365, 0.24, 0.018, 0.02, alloy);
    const plate = new THREE.MeshBasicMaterial({
      map: textTexture("COAST / 01", {
        bg: "#dddac5",
        fg: "#20333b",
        size: 256,
      }),
    });
    mesh(new THREE.PlaneGeometry(0.43, 0.115), plate, body, [0, 0.51, 2.373]);
    this.wheels = [];
    for (const x of [-0.99, 0.99])
      for (const z of [-1.37, 1.37]) {
        const steer = new THREE.Group();
        steer.position.set(x, 0.37, z);
        this.root.add(steer);
        const wheel = new THREE.Group();
        steer.add(wheel);
        const tireGeo = new THREE.LatheGeometry(
          [
            [0.266, -0.105],
            [0.26, -0.125],
            [0.325, -0.12],
            [0.363, -0.078],
            [0.37, -0.034],
            [0.37, 0.034],
            [0.363, 0.078],
            [0.325, 0.12],
            [0.26, 0.125],
            [0.266, 0.105],
          ].map(([r, y]) => new THREE.Vector2(r, y)),
          40,
        );
        tireGeo.rotateZ(Math.PI / 2);
        mesh(tireGeo, rubber, wheel);
        const rimGeo = new THREE.CylinderGeometry(
          0.266,
          0.266,
          0.232,
          40,
          1,
          true,
        );
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
        // A fine sidewall ring catches light independently of the wheel face.
        mesh(
          new THREE.TorusGeometry(0.322, 0.009, 6, 32),
          rubber,
          wheel,
          [side * 0.127, 0, 0],
          [0, Math.PI / 2, 0],
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
