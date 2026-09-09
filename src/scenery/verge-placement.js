import { lakeDistance } from "../lake-data.js";
import { seaViewWindow } from "../scenic-route.js";

// Rectangle-aware placement avoids the large empty exclusion circles that
// previously rejected narrow gaps between buildings, fences and tree trunks.
export function placeOnVerge(world, site, ignore = null) {
  if (world.scenicRoute && seaViewWindow(site.x, site.z)) return null;
  const c = Math.cos(site.yaw),
    s = Math.sin(site.yaw),
    heights = [];
  if (lakeDistance(site.x, site.z) < 1.68) return null;
  for (const [u, v] of [
    [0, 0],
    [-0.5, -0.5],
    [-0.5, 0.5],
    [0.5, -0.5],
    [0.5, 0.5],
    [0, 0.5],
    [0, -0.5],
  ]) {
    const x = site.x + u * site.w * c - v * site.d * s,
      z = site.z + u * site.w * s + v * site.d * c;
    const road = world.nearestRoad(x, z),
      y = world.height(x, z);
    if (!world.inside(x, z) || y < 0.5 || road.d < road.width / 2 + 1.5)
      return null;
    heights.push(y);
  }
  if (Math.max(...heights) - Math.min(...heights) > 0.65) return null;
  const radius = Math.hypot(site.w, site.d) / 2 + 0.5,
    obstacles = new Set();
  for (
    let x = Math.floor((site.x - radius) / 24);
    x <= Math.floor((site.x + radius) / 24);
    x++
  )
    for (
      let z = Math.floor((site.z - radius) / 24);
      z <= Math.floor((site.z + radius) / 24);
      z++
    )
      for (const o of world.grid.get(x + "," + z) || []) obstacles.add(o);
  const hx = site.w / 2 + 0.3,
    hz = site.d / 2 + 0.3;
  for (const plot of [
    ...(world.gardens || []),
    ...(world.openSpaces || []),
    ...(world.scenicBeds || []),
  ]) {
    if (
      Math.hypot(plot.x - site.x, plot.z - site.z) <
      radius + Math.hypot(plot.w, plot.d) / 2
    )
      obstacles.add(plot);
  }
  for (const o of obstacles) {
    if (o === ignore) continue;
    const dx = o.x - site.x,
      dz = o.z - site.z,
      x = dx * c + dz * s,
      z = -dx * s + dz * c;
    if (o.type === "circle") {
      if (
        Math.hypot(
          Math.max(Math.abs(x) - hx, 0),
          Math.max(Math.abs(z) - hz, 0),
        ) <
        o.r + 0.2
      )
        return null;
      continue;
    }
    const a = (o.yaw || 0) - site.yaw,
      ca = Math.cos(a),
      sa = Math.sin(a),
      ow = o.w / 2,
      od = o.d / 2;
    if (Math.abs(x) > hx + ow * Math.abs(ca) + od * Math.abs(sa)) continue;
    if (Math.abs(z) > hz + ow * Math.abs(sa) + od * Math.abs(ca)) continue;
    if (Math.abs(x * ca + z * sa) > ow + hx * Math.abs(ca) + hz * Math.abs(sa))
      continue;
    if (Math.abs(-x * sa + z * ca) > od + hx * Math.abs(sa) + hz * Math.abs(ca))
      continue;
    return null;
  }
  return { ...site, y: Math.max(...heights) + 0.025 };
}
