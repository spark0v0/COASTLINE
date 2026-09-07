// Short swept segment against terrain and rotated collision boxes.
// Works with the same spatial grid as vehicle collisions; no render raycasts.
export function cameraLimit(world, eye, anchor, clearance = 0.4) {
  const dx = eye.x - anchor.x,
    dy = eye.y - anchor.y,
    dz = eye.z - anchor.z;
  const length = Math.hypot(dx, dy, dz);
  if (length < 0.001) return 1;
  let limit = 1;
  const groundSteps = Math.max(1, Math.ceil(length / 0.75));
  for (let i = 1; i <= groundSteps; i++) {
    const t = i / groundSteps;
    if (
      anchor.y + dy * t <
      world.height(anchor.x + dx * t, anchor.z + dz * t) + clearance
    ) {
      limit = Math.max(0, (i - 1) / groundSteps);
      break;
    }
  }
  const candidates = new Set(),
    cells = Math.max(1, Math.ceil(Math.hypot(dx, dz) / 12));
  for (let i = 0; i <= cells; i++) {
    const t = i / cells,
      gx = Math.floor((anchor.x + dx * t) / 24),
      gz = Math.floor((anchor.z + dz * t) / 24);
    for (let x = gx - 1; x <= gx + 1; x++)
      for (let z = gz - 1; z <= gz + 1; z++)
        for (const o of world.grid.get(x + "," + z) || [])
          if (o.type === "box" && o.h > 0.5) candidates.add(o);
  }
  for (const o of candidates) {
    const c = Math.cos(o.yaw || 0),
      s = Math.sin(o.yaw || 0),
      ox = anchor.x - o.x,
      oz = anchor.z - o.z;
    const start = [
      ox * c + oz * s,
      anchor.y - world.height(o.x, o.z),
      -ox * s + oz * c,
    ];
    const delta = [dx * c + dz * s, dy, -dx * s + dz * c];
    const min = [-o.w / 2 - clearance, -clearance, -o.d / 2 - clearance];
    const max = [o.w / 2 + clearance, o.h + clearance, o.d / 2 + clearance];
    let enter = 0,
      exit = limit,
      hit = true;
    for (let axis = 0; axis < 3; axis++) {
      if (Math.abs(delta[axis]) < 1e-8) {
        if (start[axis] < min[axis] || start[axis] > max[axis]) {
          hit = false;
          break;
        }
      } else {
        const a = (min[axis] - start[axis]) / delta[axis],
          b = (max[axis] - start[axis]) / delta[axis];
        enter = Math.max(enter, Math.min(a, b));
        exit = Math.min(exit, Math.max(a, b));
        if (enter > exit) {
          hit = false;
          break;
        }
      }
    }
    if (hit) limit = Math.min(limit, Math.max(0, enter - 0.08 / length));
  }
  return limit;
}
