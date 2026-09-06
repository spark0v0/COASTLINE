import * as THREE from "three";
import { rng } from "./math.js";
export class Effects {
  constructor(scene, world) {
    this.world = world;
    this.items = [];
    this.random = rng(754);
    this.acc = 0;
    this.low = false;
    this.skids = [];
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = 64;
    const c = canvas.getContext("2d"),
      g = c.createRadialGradient(32, 32, 2, 32, 32, 31);
    g.addColorStop(0, "rgba(231,230,218,.45)");
    g.addColorStop(0.5, "rgba(219,226,220,.28)");
    g.addColorStop(1, "rgba(223,228,222,0)");
    c.fillStyle = g;
    c.fillRect(0, 0, 64, 64);
    this.texture = new THREE.CanvasTexture(canvas);
    this.scene = scene;
    this.pool = [];
    for (let i = 0; i < 60; i++) {
      const s = new THREE.Sprite(
        new THREE.SpriteMaterial({
          map: this.texture,
          transparent: true,
          depthWrite: false,
          opacity: 0,
        }),
      );
      s.visible = false;
      scene.add(s);
      this.pool.push(s);
    }
    const positions = new Float32Array(420 * 6 * 3);
    this.skidGeometry = new THREE.BufferGeometry();
    this.skidGeometry.setAttribute(
      "position",
      new THREE.BufferAttribute(positions, 3).setUsage(THREE.DynamicDrawUsage),
    );
    this.skidMesh = new THREE.Mesh(
      this.skidGeometry,
      new THREE.MeshBasicMaterial({
        color: "#333f3c",
        transparent: true,
        opacity: 0.26,
        depthWrite: false,
        side: THREE.DoubleSide,
        polygonOffset: true,
        polygonOffsetFactor: -2,
      }),
    );
    this.skidMesh.frustumCulled = false;
    this.skidGeometry.setDrawRange(0, 0);
    scene.add(this.skidMesh);
    this.skidCursor = 0;
    this.skidCount = 0;
    this.previousTires = null;
  }
  reset() {
    this.items = [];
    for (const s of this.pool) s.visible = false;
    this.previousTires = null;
  }
  step(dt, car) {
    this.acc += dt;
    const drifting = car.drift > 0.2 && car.speed > 7,
      active = drifting || (car.offroad && car.speed > 12);
    const fx = Math.sin(car.yaw),
      fz = -Math.cos(car.yaw),
      rx = Math.cos(car.yaw),
      rz = Math.sin(car.yaw);
    if (active && this.acc > (this.low ? 0.1 : 0.045)) {
      this.acc = 0;
      for (const side of [-1, 1])
        if (this.items.length < (this.low ? 20 : 60))
          this.items.push({
            x: car.x - fx * 1.6 + rx * side,
            y: car.y + 0.23,
            z: car.z - fz * 1.6 + rz * side,
            vx: -fx + (this.random() - 0.5),
            vz: -fz + (this.random() - 0.5),
            age: 0,
            life: 0.85,
            size: 0.42,
            dust: car.offroad,
          });
    }
    for (const p of this.items) {
      p.age += dt;
      p.x += p.vx * dt;
      p.z += p.vz * dt;
      p.y += dt * 0.58;
      p.size += dt * 1.55;
    }
    this.items = this.items.filter((p) => p.age < p.life);
    if (drifting && !car.offroad) {
      const tires = [-1, 1].map((side) => ({
        x: car.x - fx * 1.35 + rx * side * 0.96,
        z: car.z - fz * 1.35 + rz * side * 0.96,
      }));
      if (this.previousTires) {
        const a = this.skidGeometry.attributes.position;
        for (let i = 0; i < 2; i++) {
          const p = this.previousTires[i],
            q = tires[i];
          if (Math.hypot(q.x - p.x, q.z - p.z) < 0.09) continue;
          const verts = [
            [p.x - rx * 0.1, p.z - rz * 0.1],
            [q.x - rx * 0.1, q.z - rz * 0.1],
            [q.x + rx * 0.1, q.z + rz * 0.1],
            [p.x - rx * 0.1, p.z - rz * 0.1],
            [q.x + rx * 0.1, q.z + rz * 0.1],
            [p.x + rx * 0.1, p.z + rz * 0.1],
          ];
          for (let j = 0; j < 6; j++)
            a.setXYZ(
              this.skidCursor * 6 + j,
              verts[j][0],
              this.world.height(...verts[j]) + 0.108,
              verts[j][1],
            );
          this.skidCursor = (this.skidCursor + 1) % 420;
          this.skidCount = Math.min(420, this.skidCount + 1);
        }
        a.needsUpdate = true;
        this.skidGeometry.setDrawRange(0, this.skidCount * 6);
      }
      this.previousTires = tires;
    } else this.previousTires = null;
  }
  update() {
    for (let i = 0; i < this.pool.length; i++) {
      const s = this.pool[i],
        p = this.items[i];
      s.visible = !!p;
      if (!p) continue;
      s.position.set(p.x, p.y, p.z);
      s.scale.setScalar(p.size);
      s.material.opacity = (1 - p.age / p.life) * 0.65;
      s.material.color.set(p.dust ? "#c4af89" : "#e5e9e2");
    }
  }
}
