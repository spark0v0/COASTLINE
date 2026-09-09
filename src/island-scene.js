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
import { buildGroundCover } from "./scenery/groundcover.js";
import { buildResortLife } from "./scenery/resort-life.js";
import { buildLakePark } from "./scenery/lake-park.js";
import { buildRoadsideCourts } from "./scenery/roadside-courts.js";
import { buildStreetscape } from "./scenery/streetscape.js";
import { dressFrontages } from "./scenery/frontages.js";
import { buildVillaGardens } from "./scenery/villa-gardens.js";
import { buildContactShadows } from "./scenery/contact-shadows.js";
import { buildOpenSpaces } from "./scenery/open-spaces.js";
import { prepareScenicRoute } from "./scenic-route.js";
import { buildScenicGardens } from "./scenery/scenic-gardens.js";
import { finishGroundPatches } from "./scenery/ground-patches.js";
import { buildScenicCoast } from "./scenery/scenic-coast.js";
import { buildRouteLandscape } from "./scenery/route-landscape.js";

// Orchestrator: regional art layers share the physics height field and road
// data. Each region builder lives in src/scenery/<region>.js.
export class IslandScenery extends Scenery {
  buildAll() {
    prepareScenicRoute(this.world);
    this.art = new ArtMaterials();
    this.low = false;
    this.rng511 = rng(511);
    this.makeRock = makeRock;
    this.geometryFromTriangles = geometryFromTriangles;
    for (let i = 0; i < 3; i++)
      this.batch.geometries["rock" + i] = makeRock(i + 1);
    buildTerrain(this);
    buildRoads(this);
    buildTrees(this);
    buildTown(this);
    buildCoast(this);
    buildRidge(this);
    buildValley(this);
    buildAmbience(this);
    buildResortLife(this);
    buildLakePark(this);
    buildVillaGardens(this);
    buildScenicGardens(this);
    buildScenicCoast(this);
    dressFrontages(this);
    buildRoadsideCourts(this);
    buildStreetscape(this);
    buildOpenSpaces(this);
    buildGroundCover(this);
    buildRouteLandscape(this);
    finishGroundPatches(this);
    buildContactShadows(this);
  }
  update(time, car) {
    this.gardenTime.value = time;
    this.waterMaterial.uniforms.time.value = time;
    this.lakeMaterial.uniforms.time.value = time;
    this.fountainMaterial.uniforms.time.value = time;
    if (car) {
      const lake = this.world.lake;
      this.fountain.visible =
        Math.hypot(car.x - lake.x, car.z - lake.z) < (this.low ? 550 : 1200);
      if (
        !this.lastVisibility ||
        Math.hypot(
          car.x - this.lastVisibility.x,
          car.z - this.lastVisibility.z,
        ) > 25
      ) {
        this.batch.updateVisibility(car.x, car.z, this.low);
        for (const shadow of this.contactShadows) {
          const p = shadow.geometry.boundingSphere.center;
          shadow.visible =
            Math.hypot(p.x - car.x, p.z - car.z) < (this.low ? 420 : 950);
        }
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
    this.fountainDrops.setDrawRange(0, low ? 72 : 240);
  }
}
