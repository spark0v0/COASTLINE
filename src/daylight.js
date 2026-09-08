import * as THREE from "three";

// One sun direction drives direct lighting, the sky, water and reflected highlights.
export const SUN_DIRECTION = new THREE.Vector3(-0.58, 0.72, 0.38).normalize();
export const DAYLIGHT = {
  skyTop: "#5b99bc",
  horizon: "#c8dae0",
  sun: "#fff0d6",
  fill: "#c5d7e2",
  ground: "#948b75",
  sunIntensity: 2.65,
  fillIntensity: 0.72,
  environmentIntensity: 0.65,
};
