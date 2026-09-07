import * as THREE from "three";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
import { IslandScenery as Scenery } from "./island-scene.js";
import { VehicleView } from "./vehicle.js";
import { damp, clamp } from "./math.js";
import { cameraLimit } from "./camera-collision.js";

export class GameRenderer {
  constructor(canvas, world) {
    this.world = world;
    this.canvas = canvas;
    this.quality = "standard";
    this.frames = 0;
    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      alpha: false,
      powerPreference: "high-performance",
    });
    this.renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.0;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFShadowMap;
    this.scene = new THREE.Scene();
    // Golden late-afternoon: low warm sun, cool ambient fill, hazy gold fog.
    this.scene.fog = new THREE.FogExp2("#d3ccbc", 0.00066);
    this.camera = new THREE.PerspectiveCamera(57, 1, 0.18, 8000);
    this.camera.position.set(world.spawn.x + 12, 8, world.spawn.z - 12);
    this.look = new THREE.Vector3(world.spawn.x, 3, world.spawn.z);
    this.scene.add(new THREE.HemisphereLight("#c9dff2", "#8f8066", 1.05));
    this.sun = new THREE.DirectionalLight("#ffbe82", 2.9);
    this.sun.position.set(-90, 140, 65);
    this.sun.castShadow = true;
    this.sun.shadow.mapSize.set(2048, 2048);
    Object.assign(this.sun.shadow.camera, {
      left: -80,
      right: 80,
      top: 80,
      bottom: -80,
      near: 1,
      far: 360,
    });
    this.sun.shadow.bias = -0.00022;
    this.sun.shadow.normalBias = 0.035;
    this.sun.shadow.radius = 3.5;
    this.scene.add(this.sun, this.sun.target);
    const pmrem = new THREE.PMREMGenerator(this.renderer),
      room = new RoomEnvironment();
    this.environment = pmrem.fromScene(room, 0.015);
    this.scene.environment = this.environment.texture;
    this.scene.environmentIntensity = 0.5;
    room.dispose();
    pmrem.dispose();
    const sky = new THREE.Mesh(
      new THREE.SphereGeometry(6500, 32, 16),
      new THREE.ShaderMaterial({
        side: THREE.BackSide,
        depthWrite: false,
        uniforms: {
          top: { value: new THREE.Color("#2e7cbd") },
          bottom: { value: new THREE.Color("#f0ddb9") },
          sun: { value: new THREE.Vector3(-0.7, 0.54, 0.47).normalize() },
        },
        vertexShader:
          "varying vec3 vPosition;void main(){vPosition=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}",
        fragmentShader:
          "uniform vec3 top;uniform vec3 bottom;uniform vec3 sun;varying vec3 vPosition;void main(){vec3 dir=normalize(vPosition);float h=pow(max(dir.y,0.),.48);vec3 color=mix(bottom,top,h);float disk=smoothstep(.9993,.9997,dot(dir,sun));float glow=pow(max(dot(dir,sun),0.),24.);color+=vec3(1.,.85,.53)*(disk*.8+glow*.18);gl_FragColor=vec4(color,1.);\n#include <tonemapping_fragment>\n#include <colorspace_fragment>\n}",
      }),
    );
    sky.frustumCulled = false;
    this.scene.add(sky);
    this.sky = sky;
    this.makeClouds();
    this.scenery = new Scenery(this.scene, world);
    this.vehicle = new VehicleView(this.scene);
    this.makeGates();
    this.resize();
  }
  makeGates() {
    this.gates = new THREE.Group();
    this.scene.add(this.gates);
    const color = new THREE.MeshStandardMaterial({
        color: "#e2f5a4",
        emissive: "#a7d574",
        emissiveIntensity: 0.25,
        roughness: 0.45,
      }),
      dark = new THREE.MeshStandardMaterial({
        color: "#365950",
        roughness: 0.75,
      });
    for (const x of [-8.2, 8.2]) {
      const leg = new THREE.Mesh(new THREE.BoxGeometry(0.22, 5.2, 0.3), color);
      leg.position.set(x, 2.6, 0);
      this.gates.add(leg);
      const flag = new THREE.Mesh(new THREE.BoxGeometry(0.9, 2.8, 0.12), color);
      flag.position.set(x + (x < 0 ? 0.5 : -0.5), 3.9, 0);
      this.gates.add(flag);
    }
    const header = new THREE.Mesh(
      new THREE.BoxGeometry(16.6, 0.24, 0.28),
      color,
    );
    header.position.y = 5.24;
    this.gates.add(header);
    for (let i = 0; i < 16; i++) {
      const block = new THREE.Mesh(
        new THREE.BoxGeometry(0.95, 0.28, 0.08),
        i % 2 ? dark : color,
      );
      block.position.set(-7.5 + i, 5.0, -0.19);
      this.gates.add(block);
    }
    const arrow = new THREE.Mesh(new THREE.ConeGeometry(0.52, 1.0, 3), color);
    arrow.rotation.z = Math.PI;
    arrow.position.y = 7;
    this.gates.add(arrow);
    this.gateArrow = arrow;
    this.gates.visible = false;
  }
  makeClouds() {
    const canvas = document.createElement("canvas");
    canvas.width = 256;
    canvas.height = 128;
    const c = canvas.getContext("2d"),
      r = ((n) => () => (
        (n = (Math.imul(n, 1664525) + 1013904223) >>> 0),
        n / 4294967296
      ))(901);
    for (let i = 0; i < 9; i++) {
      const x = 40 + r() * 176,
        y = 44 + r() * 40,
        rad = 22 + r() * 26;
      const g = c.createRadialGradient(x, y, 2, x, y, rad);
      g.addColorStop(0, "rgba(255,255,255,.55)");
      g.addColorStop(1, "rgba(255,255,255,0)");
      c.fillStyle = g;
      c.fillRect(0, 0, 256, 128);
    }
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    this.clouds = new THREE.Group();
    this.scene.add(this.clouds);
    for (let i = 0; i < 12; i++) {
      const sprite = new THREE.Sprite(
        new THREE.SpriteMaterial({
          map: texture,
          transparent: true,
          opacity: 0.78,
          depthWrite: false,
          fog: false,
        }),
      );
      const angle = (i / 12) * Math.PI * 2 + (i % 3) * 0.2,
        radius = 4100 + (i % 4) * 380;
      sprite.position.set(
        Math.cos(angle) * radius,
        430 + ((i * 97) % 560),
        Math.sin(angle) * radius,
      );
      const s = 760 + ((i * 131) % 620);
      sprite.scale.set(s, s * 0.42, 1);
      this.clouds.add(sprite);
    }
  }
  resize() {
    const w = this.canvas.clientWidth,
      h = this.canvas.clientHeight;
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
  }
  setQuality(value) {
    this.quality = value;
    const low = value === "low";
    this.renderer.setPixelRatio(
      low
        ? Math.min(devicePixelRatio, 1) * 0.8
        : Math.min(devicePixelRatio, 1.5),
    );
    this.sun.shadow.mapSize.set(low ? 1024 : 2048, low ? 1024 : 2048);
    this.sun.shadow.map?.dispose();
    this.sun.shadow.map = null;
    this.scene.fog.density = low ? 0.0014 : 0.00066;
    this.scenery.setQuality(low);
    this.resize();
  }
  cameraOcclusion(eye, target) {
    eye.y = Math.max(eye.y, this.world.height(eye.x, eye.z) + 1);
    return eye.lerpVectors(target, eye, cameraLimit(this.world, eye, target));
  }
  render(car, race, mode, dt, time, snap = false) {
    const fx = Math.sin(car.yaw),
      fz = -Math.cos(car.yaw),
      speed = car.speed,
      back = 8.4 + speed * 0.055;
    let eye = new THREE.Vector3(
      car.x - fx * back,
      car.y + 3.15 + speed * 0.021,
      car.z - fz * back,
    );
    let target = new THREE.Vector3(
      car.x + fx * (3.8 + speed * 0.07),
      car.y + 1.05,
      car.z + fz * (3.8 + speed * 0.07),
    );
    if (mode === "welcome") {
      // Beauty shot from the land side, framing the car against the sea.
      const rx = Math.cos(car.yaw),
        rz = Math.sin(car.yaw);
      const seaSide =
        this.world.height(car.x - rx * 10, car.z - rz * 10) <
        this.world.height(car.x + rx * 10, car.z + rz * 10)
          ? -1
          : 1;
      eye.set(
        car.x - fx * 7.2 - rx * seaSide * 3.4,
        car.y + 3.4,
        car.z - fz * 7.2 - rz * seaSide * 3.4,
      );
      target.set(
        car.x + fx * 6 + rx * seaSide * 2.6,
        car.y + 1.6,
        car.z + fz * 6 + rz * seaSide * 2.6,
      );
    } else {
      const roadAhead = this.world.height(target.x, target.z) + 1.12;
      target.y = target.y * 0.25 + roadAhead * 0.75;
      const anticipation = car.steer * Math.min(speed * 0.022, 0.7);
      target.x += Math.cos(car.yaw) * anticipation;
      target.z += Math.sin(car.yaw) * anticipation;
    }
    // Clip from the car, since the look-ahead target can lie inside a wall.
    const anchor = new THREE.Vector3(car.x, car.y + 1.15, car.z);
    eye = this.cameraOcclusion(eye, anchor);
    const follow = snap ? 1 : 1 - Math.exp(-5.8 * dt);
    this.camera.position.lerp(eye, follow);
    // Smoothing must not carry the camera through terrain or a building.
    this.camera.position.copy(
      this.cameraOcclusion(this.camera.position.clone(), anchor),
    );
    this.look.lerp(target, snap ? 1 : 1 - Math.exp(-9 * dt));
    this.camera.lookAt(this.look);
    this.camera.fov = damp(
      this.camera.fov,
      57 + speed * 0.045 + (car.boost ? 7 : 0),
      4,
      dt,
    );
    this.camera.updateProjectionMatrix();
    const sx = Math.round(car.x / 2) * 2,
      sz = Math.round(car.z / 2) * 2;
    this.sun.target.position.set(sx, car.y, sz);
    // Sun kept low in the west for long golden-hour shadows.
    this.sun.position.set(sx - 84, car.y + 64, sz + 56);
    this.sky.position.copy(this.camera.position);
    this.clouds.position.copy(this.camera.position);
    this.vehicle.update(car, time);
    this.scenery.update(time, car);
    this.gates.visible = race.state === "running" || race.state === "countdown";
    if (this.gates.visible) {
      const p = race.points[race.index];
      this.gates.position.set(p.x, this.world.height(p.x, p.z) + 0.1, p.z);
      this.gates.rotation.y = -p.yaw;
      this.gateArrow.position.y = 6.5 + Math.sin(time * 2.5) * 0.25;
    }
    this.renderer.render(this.scene, this.camera);
    this.frames++;
  }
  stats() {
    return {
      drawCalls: this.renderer.info.render.calls,
      triangles: this.renderer.info.render.triangles,
      geometries: this.renderer.info.memory.geometries,
      textures: this.renderer.info.memory.textures,
    };
  }
}
