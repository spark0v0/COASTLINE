// Authored corridor uses existing streets and the coastal main road.
export const TOUR_STREET_Z = 569.5;
export function seaViewWindow(x, z) {
  return x > 490 && x < 720 && z > 548 && z < 637;
}
export function prepareScenicRoute(w) {
  const coast = w.paths[0].points
    .filter((p) => p.x > 590 && p.z >= 414 && p.z <= TOUR_STREET_Z)
    .slice()
    .reverse();
  const join = coast[0] || { x: 621, z: TOUR_STREET_Z };
  const points = [
    { x: 55, z: TOUR_STREET_Z },
    { x: 201, z: TOUR_STREET_Z },
    { x: 385, z: TOUR_STREET_Z },
    { x: join.x, z: TOUR_STREET_Z },
    ...coast,
  ];
  let length = 0;
  for (let i = 1; i < points.length; i++)
    length += Math.hypot(
      points[i].x - points[i - 1].x,
      points[i].z - points[i - 1].z,
    );
  const removed = new Set();
  w.buildings = w.buildings.filter((h) => {
    if (seaViewWindow(h.x, h.z)) {
      removed.add(h);
      return false;
    }
    if (h.x > 45 && h.x < 485 && Math.abs(h.z - TOUR_STREET_Z) < 55)
      h.scenicStyle = Math.floor(h.x / 93) % 3;
    return true;
  });
  const removedTrees = new Set();
  w.trees = w.trees.filter((t) => {
    const open =
      seaViewWindow(t.x, t.z) ||
      (t.x > 657 &&
        t.x < 730 &&
        t.z > 414 &&
        t.z < 548 &&
        Math.floor(t.z / 42) % 3 !== 0);
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
  w.scenicRoute = {
    name: "晴湾花园路",
    points,
    length,
    start: { ...points[0], yaw: Math.PI / 2 },
    removedBuildings: removed.size,
    removedTrees: removedTrees.size,
  };
}
