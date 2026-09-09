// Authored tour is a view of the actual driveable road network, never a second
// approximate line drawn over the minimap.
export const TOUR_STREET_Z = 569.5;
export function tourFrame(w, x) {
  const pts = w.paths.find((p) => p.name === "晴湾花园街道").points;
  let i = 1;
  while (i < pts.length - 1 && pts[i].x < x) i++;
  const a = pts[i - 1],
    b = pts[i],
    t = Math.max(0, Math.min(1, (x - a.x) / (b.x - a.x || 1)));
  const angle = Math.atan2(b.z - a.z, b.x - a.x);
  return {
    x: a.x + (b.x - a.x) * t,
    z: a.z + (b.z - a.z) * t,
    angle,
    nx: -Math.sin(angle),
    nz: Math.cos(angle),
  };
}
export function seaViewWindow(x, z) {
  return x > 470 && x < 740 && z > 220 && z < 620;
}
export function inScenicCorridor(w, x, z) {
  if (seaViewWindow(x, z)) return true;
  return x > 35 && x < 470 && Math.abs(z - tourFrame(w, x).z) < 55;
}
export function prepareScenicRoute(w) {
  const street = w.paths.find((p) => p.name === "晴湾花园街道");
  const coast = w.route
    .filter((p) => p.x > 590 && p.z >= w.overlookJoin.z && p.z < w.scenicJoin.z)
    .slice()
    .reverse();
  const spur = w.paths.find((p) => p.name === "晴湾观景支路");
  const first = tourFrame(w, 55);
  const points = [
    { x: first.x, z: first.z },
    ...street.points.filter((p) => p.x > 55),
    ...coast,
    ...spur.points,
  ];
  let length = 0;
  for (let i = 1; i < points.length; i++)
    length += Math.hypot(
      points[i].x - points[i - 1].x,
      points[i].z - points[i - 1].z,
    );
  const removed = new Set();
  w.buildings = w.buildings.filter((h) => {
    const frame = tourFrame(w, h.x);
    if (
      seaViewWindow(h.x, h.z) ||
      (h.x > 35 && h.x < 460 && Math.abs(h.z - frame.z) < 55)
    ) {
      removed.add(h);
      return false;
    }
    return true;
  });
  // An asymmetric sequence of addresses, not two matching rows of parcels.
  const plots = [
    [75, -1, 14, 12, 1],
    [104, 1, 12, 11, 2],
    [135, -1, 16, 11, 0],
    [164, 1, 13, 10, 1],
    [239, -1, 15, 12, 0],
    [258, 1, 13, 11, 2],
    [284, -1, 12, 10, 2],
    [311, 1, 17, 12, 1],
    [340, -1, 14, 11, 0],
    [373, 1, 13, 10, 2],
    [409, -1, 15, 12, 1],
    [442, 1, 14, 10, 0],
  ];
  for (const [x, side, width, depth, style] of plots) {
    const p = tourFrame(w, x),
      setback = depth / 2 + 10 + (style === 2 ? 3 : 0);
    const h = {
      type: "box",
      x: p.x + p.nx * setback * side,
      z: p.z + p.nz * setback * side,
      yaw: p.angle + (side > 0 ? Math.PI : 0),
      w: width,
      d: depth,
      h: 6.8,
      color: "#e8e5dd",
      variant: 3,
      seed: x * 73,
      scenicStyle: style,
    };
    if (w.nearestRoad(h.x, h.z).d < Math.hypot(width, depth) / 2 + 3) continue;
    if (
      w.buildings.some(
        (b) =>
          Math.hypot(h.x - b.x, h.z - b.z) <
          (Math.hypot(b.w, b.d) + Math.hypot(width, depth)) / 2 + 2,
      )
    )
      continue;
    w.buildings.push(h);
  }
  const removedTrees = new Set();
  w.trees = w.trees.filter((t) => {
    const open =
      (seaViewWindow(t.x, t.z) && (t.x > 654 || t.z > 514)) ||
      w.buildings.some(
        (h) => Math.hypot(h.x - t.x, h.z - t.z) < Math.hypot(h.w, h.d) / 2 + 3,
      );
    if (open) {
      removedTrees.add(t.x + "," + t.z);
      return false;
    }
    return true;
  });
  const kept = w.obstacles.filter(
    (o) =>
      !removed.has(o) &&
      !(o.type === "circle" && removedTrees.has(o.x + "," + o.z)),
  );
  w.obstacles = [];
  w.grid.clear();
  for (const o of kept) w.register(o);
  for (const h of w.buildings) if (!kept.includes(h)) w.register(h);
  // Broad canopy over a few corners, then a deliberate break before the bay.
  for (const [x, side] of [
    [57, 1],
    [146, 1],
    [260, -1],
    [308, -1],
    [395, 1],
    [451, -1],
  ]) {
    const p = tourFrame(w, x),
      tx = p.x + p.nx * 12 * side,
      tz = p.z + p.nz * 12 * side;
    if (
      w.nearestRoad(tx, tz).d < 8 ||
      w.buildings.some(
        (h) => Math.hypot(tx - h.x, tz - h.z) < Math.hypot(h.w, h.d) / 2 + 3,
      )
    )
      continue;
    w.trees.push({ x: tx, z: tz, kind: "pine", h: 9.5, seed: x * 0.073 });
    w.register({ type: "circle", x: tx, z: tz, r: 0.35 });
  }
  w.scenicRoute = {
    name: "晴湾花园路",
    points,
    length,
    start: { ...points[0], yaw: first.angle + Math.PI / 2 },
    removedBuildings: removed.size,
    removedTrees: removedTrees.size,
  };
}
