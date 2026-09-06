export const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
export const lerp = (a, b, t) => a + (b - a) * t;
export const damp = (a, b, k, dt) => lerp(a, b, 1 - Math.exp(-k * dt));
export const angleDiff = (a, b) => Math.atan2(Math.sin(a - b), Math.cos(a - b));
export const distance = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);
export function smooth(a, b, x) {
  const t = clamp((x - a) / (b - a), 0, 1);
  return t * t * (3 - 2 * t);
}
export function segmentPoint(x, z, a, b) {
  const dx = b.x - a.x,
    dz = b.z - a.z;
  const t = clamp(
    ((x - a.x) * dx + (z - a.z) * dz) / (dx * dx + dz * dz || 1),
    0,
    1,
  );
  return {
    x: a.x + dx * t,
    z: a.z + dz * t,
    t,
    d: Math.hypot(x - a.x - dx * t, z - a.z - dz * t),
  };
}
export function rng(seed) {
  return () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed / 4294967296;
  };
}
export function formatTime(seconds) {
  const ms = Math.floor(Math.max(0, seconds) * 1000);
  return `${String(Math.floor(ms / 60000)).padStart(2, "0")}:${String(Math.floor(ms / 1000) % 60).padStart(2, "0")}.${String(ms % 1000).padStart(3, "0")}`;
}
