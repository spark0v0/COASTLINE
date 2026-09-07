import test from "node:test";
import assert from "node:assert/strict";
import * as THREE from "three";
import { Batch } from "../src/scene-utils.js";
import { cameraLimit } from "../src/camera-collision.js";

const fixture = (obstacles = [], height = () => 0) => {
  const grid = new Map();
  for (let x = -2; x <= 2; x++)
    for (let z = -2; z <= 2; z++) grid.set(x + "," + z, obstacles);
  return { grid, height };
};
test("camera stops before a thin rotated retaining wall", () => {
  const world = fixture([
    { type: "box", x: 5, z: 0, w: 0.2, d: 8, h: 4, yaw: Math.PI / 4 },
  ]);
  const t = cameraLimit(world, { x: 10, y: 1.5, z: 0 }, { x: 0, y: 1.5, z: 0 });
  assert(t > 0.35 && t < 0.5);
  assert.equal(
    cameraLimit(world, { x: 10, y: 8, z: 0 }, { x: 0, y: 8, z: 0 }),
    1,
  );
});
test("camera ignores boxes beyond its position and stops at intervening terrain", () => {
  const box = { type: "box", x: 18, z: 0, w: 1, d: 5, h: 4, yaw: 0 };
  assert.equal(
    cameraLimit(fixture([box]), { x: 10, y: 2, z: 0 }, { x: 0, y: 2, z: 0 }),
    1,
  );
  const t = cameraLimit(
    fixture([], (x) => (x > 4 && x < 6 ? 4 : 0)),
    { x: 10, y: 2, z: 0 },
    { x: 0, y: 2, z: 0 },
  );
  assert(t > 0.3 && t < 0.5);
});
test("palette batching preserves colours and restores close-up detail", () => {
  const batch = new Batch(new THREE.Group());
  batch.add("sphere", "#a84422", [2, 0, 0], [1, 1, 1]);
  batch.add("sphere", "#2244a8", [4, 0, 0], [1, 1, 1]);
  batch.finish();
  assert.equal(batch.meshes.length, 1);
  const m = batch.meshes[0],
    colour = new THREE.Color();
  m.getColorAt(0, colour);
  assert(Math.abs(colour.r - new THREE.Color("#a84422").r) < 1e-6);
  m.getColorAt(1, colour);
  assert(Math.abs(colour.b - new THREE.Color("#2244a8").b) < 1e-6);
  const full = m.geometry;
  batch.updateVisibility(650, 0, false);
  assert(m.geometry.attributes.position.count < full.attributes.position.count);
  batch.updateVisibility(0, 0, false);
  assert.equal(m.geometry, full);
});
