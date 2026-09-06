import { Scenery } from "./scenery.js";
import { ArtMaterials } from "./art-materials.js";
import { rng } from "./math.js";
import { makeRock, geometryFromTriangles } from "./scenery/kit.js";
import { buildTerrain } from "./scenery/terrain.js";
import { buildRoads } from "./scenery/roads.js";
import { buildTown } from "./scenery/town.js";
import { buildTrees } from "./scenery/trees.js";
import { buildCoast } from "./scenery/coast.js";
import { buildRidge } from "./scenery/ridge.js";
import { buildValley } from "./scenery/valley.js";
import { buildAmbience } from "./scenery/ambience.js";

// Orchestrator: regional art layers share the physics height field and road
// data. Each region builder lives in src/scenery/<region>.js.
export class IslandScenery extends Scenery {
  buildAll() {
    this.art = new ArtMaterials();
    this.low = false;
    this.rng511 = rng(511);
    this.makeRock = makeRock;
    this.geometryFromTriangles = geometryFromTriangles;
    buildTerrain(this);
    buildRoads(this);
    buildTown(this);
    buildTrees(this);
    buildCoast(this);
    buildRidge(this);
    buildValley(this);
    buildAmbience(this);
  }
  update(time, car) {
    this.waterMaterial.uniforms.time.value = time;
    if (car) {
      if (
        !this.lastVisibility ||
        Math.hypot(
          car.x - this.lastVisibility.x,
          car.z - this.lastVisibility.z,
        ) > 25
      ) {
        this.batch.updateVisibility(car.x, car.z, this.low);
        this.lastVisibility = { x: car.x, z: car.z };
      }
      this.birds.position.set(
        725 + Math.sin(time * 0.035) * 70,
        39,
        325 + Math.cos(time * 0.035) * 80,
      );
      this.birds.rotation.y = -time * 0.035;
    }
  }
  setQuality(low) {
    this.low = low;
    this.lastVisibility = null;
    this.detail.visible = !low;
  }
}
