import { smooth } from "./math.js";

export const CENTRAL_LAKE = Object.freeze({
  x: -3,
  z: 40,
  rx: 110,
  rz: 88,
  level: 2.35,
  name: "镜湖公园",
});
export function lakePoint(angle, scale = 1) {
  const k =
    (1 + 0.05 * Math.sin(angle * 3) + 0.035 * Math.cos(angle * 5)) * scale;
  return {
    x: CENTRAL_LAKE.x + Math.cos(angle) * CENTRAL_LAKE.rx * k,
    z: CENTRAL_LAKE.z + Math.sin(angle) * CENTRAL_LAKE.rz * k,
  };
}
export function lakeDistance(x, z) {
  const dx = (x - CENTRAL_LAKE.x) / CENTRAL_LAKE.rx,
    dz = (z - CENTRAL_LAKE.z) / CENTRAL_LAKE.rz;
  const a = Math.atan2(dz, dx),
    k = 1 + 0.05 * Math.sin(a * 3) + 0.035 * Math.cos(a * 5);
  return Math.hypot(dx, dz) / k;
}
// Only the lake basin changes height. Existing city/race roads lie outside it.
export function lakeTerrain(x, z, height) {
  if (
    Math.abs(x - CENTRAL_LAKE.x) > CENTRAL_LAKE.rx * 1.18 ||
    Math.abs(z - CENTRAL_LAKE.z) > CENTRAL_LAKE.rz * 1.18
  )
    return height;
  const r = lakeDistance(x, z);
  if (r >= 1.1) return height;
  const shore = smooth(0.8, 1.045, r);
  const basin = CENTRAL_LAKE.level - 2.8 + Math.min(r, 0.82) * 0.4;
  return basin * (1 - shore) + height * shore;
}
export const LAKE_SHORE = Array.from({ length: 129 }, (_, i) =>
  lakePoint((i / 128) * Math.PI * 2),
);
