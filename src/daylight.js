import * as THREE from "three";

// One sun direction drives direct lighting, the sky, water and reflected highlights.
export const SUN_DIRECTION = new THREE.Vector3(-0.58, 0.72, -0.37).normalize();
export const DAYLIGHT = {
  skyTop: "#3987bb",
  horizon: "#b6d5df",
  sun: "#fff4e4",
  fill: "#a9c8e1",
  ground: "#948b75",
  sunIntensity: 3.15,
  fillIntensity: 0.6,
  environmentIntensity: 0.55,
};
