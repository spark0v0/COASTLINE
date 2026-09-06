import { THREE, Batch } from "./scene-utils.js";

// Shared scene assembly. Region builders are collected by IslandScenery.buildAll.
export class Scenery {
  constructor(scene, world) {
    this.scene = scene;
    this.world = world;
    this.group = new THREE.Group();
    scene.add(this.group);
    this.batch = new Batch(this.group);
    this.detail = new THREE.Group();
    this.group.add(this.detail);
    this.buildAll();
    this.batch.finish();
  }
}
