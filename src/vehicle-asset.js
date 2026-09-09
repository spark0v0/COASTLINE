import { THREE } from "./scene-utils.js";
import { VehicleView as ProceduralVehicle } from "./vehicle.js";

// The simulation owns position/steer/brake state. This adapter turns a reusable
// art asset into an animated car without replacing the established physics.
export class VehicleView extends ProceduralVehicle {
  constructor(scene) {
    super(scene);
    this.assetLoaded = false;
    this.ready = this.loadAsset().catch((error) => {
      this.assetError = "车辆资源未加载，已使用备用车型";
      console.warn(this.assetError, error.message);
    });
  }
  async loadAsset() {
    const { GLTFLoader } = await import("three/addons/loaders/GLTFLoader.js");
    const gltf = await new GLTFLoader().loadAsync(
      "assets/vehicles/coast-gt.glb",
    );
    const model = gltf.scene;
    model.rotation.y = Math.PI;
    model.position.z = 0.085;
    model.position.y = 0.012;
    const newBody = new THREE.Group();
    newBody.add(model);
    const sourceWheels = [];
    model.traverse((o) => {
      if (/^Wheel(Front|Rear)[LR]$/.test(o.name)) sourceWheels.push(o);
      if (o.isMesh) {
        o.castShadow = true;
        o.receiveShadow = true;
        for (const m of [].concat(o.material)) {
          m.envMapIntensity = 0.9;
          for (const value of Object.values(m))
            if (value?.isTexture) {
              value.anisotropy = 4;
              value.magFilter = THREE.LinearFilter;
              value.minFilter = THREE.LinearMipmapLinearFilter;
            }
          if (m.name === "Brakelight") this.assetBrake = m;
          if (m.name === "Headlight") m.emissiveIntensity = 1.1;
        }
      }
    });
    if (sourceWheels.length !== 4)
      throw Error("Vehicle wheel hierarchy is incomplete");
    this.root.add(newBody);
    this.root.updateMatrixWorld(true);
    const wheels = [];
    for (const original of sourceWheels) {
      // Detach from suspension response; tires remain aligned to the road.
      this.root.attach(original);
      const steer = new THREE.Group();
      steer.position.copy(original.position);
      this.root.add(steer);
      const wheel = new THREE.Group();
      steer.add(wheel);
      wheel.attach(original);
      // Calipers steer but do not rotate with the rim and disc.
      const pads = [];
      original.traverse((o) => {
        if (/BrakePad/.test(o.name)) pads.push(o);
      });
      pads.forEach((p) => steer.attach(p));
      wheels.push({ steer, wheel, front: /Front/.test(original.name) });
    }
    const oldBody = this.chassis,
      oldWheels = this.wheels;
    newBody.attach(this.flames);
    // Align two subtle nitro plumes with the concept car's rear valance.
    this.flames.children.forEach((f, i) =>
      f.position.set(i ? 0.53 : -0.53, 0.31, 2.02),
    );
    this.root.remove(oldBody);
    oldWheels.forEach((w) => this.root.remove(w.steer));
    const geometries = new Set(),
      materials = new Set(),
      textures = new Set();
    for (const object of [oldBody, ...oldWheels.map((w) => w.steer)])
      object.traverse((o) => {
        if (o.geometry) geometries.add(o.geometry);
        if (o.material) [].concat(o.material).forEach((m) => materials.add(m));
      });
    materials.forEach((m) => {
      for (const v of Object.values(m)) if (v?.isTexture) textures.add(v);
      m.dispose();
    });
    geometries.forEach((g) => g.dispose());
    textures.forEach((t) => t.dispose());
    this.chassis = newBody;
    this.wheels = wheels;
    this.brakeMat = this.assetBrake || this.brakeMat;
    this.assetLoaded = true;
  }
}
