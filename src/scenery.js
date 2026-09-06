import { THREE, Batch } from "./scene-utils.js";

// Shared scene assembly. IslandScenery supplies each regional art layer.
export class Scenery {
  constructor(scene, world) {
    this.scene = scene;
    this.world = world;
    this.group = new THREE.Group();
    scene.add(this.group);
    this.batch = new Batch(this.group);
    this.detail = new THREE.Group();
    this.group.add(this.detail);
    this.buildTerrain();
    this.buildRoads();
    this.buildTown();
    this.buildTrees();
    this.buildLandmarks();
    this.buildCoastalDetails();
    this.batch.finish();
  }
}
