// Curated stops on the first coastal drive, with a few distinct inland stops.
// Width/depth include furniture and forecourt, not just the building shell.
export const RESORT_PLACES = [
  { at: 0.776, side: 1, kind: "cafe", name: "海风咖啡", w: 15, d: 11 },
  { at: 0.795, side: -1, kind: "surf", name: "蓝湾冲浪社", w: 13, d: 10 },
  { at: 0.812, side: 1, kind: "transit", name: "晴湾公交站", w: 10, d: 6 },
  { at: 0.835, side: -1, kind: "market", name: "海岸周末市集", w: 16, d: 10 },
  { at: 0.855, side: 1, kind: "view", name: "海湾休憩台", w: 13, d: 9 },
  { at: 0.887, side: -1, kind: "service", name: "海岸补给站", w: 13, d: 10 },
  { at: 0.745, side: -1, kind: "surf", name: "灯塔沙滩俱乐部", w: 13, d: 10 },
  { at: 0.716, side: 1, kind: "view", name: "北湾观海台", w: 13, d: 9 },
  { at: 0.035, side: 1, kind: "cafe", name: "棕榈街咖啡", w: 15, d: 11 },
  { at: 0.13, side: -1, kind: "market", name: "山麓果蔬摊", w: 16, d: 10 },
  { at: 0.226, side: 1, kind: "service", name: "松岭骑行驿站", w: 13, d: 10 },
  { at: 0.392, side: -1, kind: "view", name: "山顶观景露台", w: 13, d: 9 },
  { at: 0.545, side: 1, kind: "transit", name: "北岬山道站", w: 10, d: 6 },
];

function overlaps(site, o) {
  const c = Math.cos(site.yaw),
    s = Math.sin(site.yaw);
  const dx = o.x - site.x,
    dz = o.z - site.z;
  const x = dx * c + dz * s,
    z = -dx * s + dz * c;
  const hx = site.w / 2 + 0.7,
    hz = site.d / 2 + 0.7;
  if (o.type === "circle") {
    return (
      Math.hypot(Math.max(Math.abs(x) - hx, 0), Math.max(Math.abs(z) - hz, 0)) <
      o.r + 0.35
    );
  }
  const a = (o.yaw || 0) - site.yaw,
    ca = Math.cos(a),
    sa = Math.sin(a),
    ow = o.w / 2,
    od = o.d / 2;
  if (Math.abs(x) > hx + ow * Math.abs(ca) + od * Math.abs(sa)) return false;
  if (Math.abs(z) > hz + ow * Math.abs(sa) + od * Math.abs(ca)) return false;
  if (Math.abs(x * ca + z * sa) > ow + hx * Math.abs(ca) + hz * Math.abs(sa))
    return false;
  if (Math.abs(-x * sa + z * ca) > od + hx * Math.abs(sa) + hz * Math.abs(ca))
    return false;
  return true;
}

// Placement is deterministic and checks the whole plot against roads and solids.
// No trees/buildings are deleted to make an unsuitable plot fit.
export function planResortPlaces(world) {
  const sites = [];
  for (const def of RESORT_PLACES) {
    let chosen = null;
    for (const shift of [0, 14, -14, 28, -28, 44, -44, 65, -65]) {
      if (chosen) break;
      const cp = world.pointAt(
        Math.max(
          0,
          Math.min(world.routeLength, def.at * world.routeLength + shift),
        ),
      );
      const nearest = world.nearestRoad(cp.x, cp.z);
      for (const side of [def.side, -def.side]) {
        if (chosen) break;
        for (const setback of [3, 8, 15]) {
          const offset = nearest.width / 2 + def.d / 2 + setback;
          const site = {
            ...def,
            x: cp.x + Math.cos(cp.yaw) * offset * side,
            z: cp.z + Math.sin(cp.yaw) * offset * side,
            yaw: Math.atan2(side * Math.cos(cp.yaw), -side * Math.sin(cp.yaw)),
          };
          const c = Math.cos(site.yaw),
            s = Math.sin(site.yaw),
            heights = [];
          let clear = true;
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
            if (
              !world.inside(x, z) ||
              y < 0.45 ||
              road.d < road.width / 2 + 1
            ) {
              clear = false;
              break;
            }
            heights.push(y);
          }
          if (!clear || Math.max(...heights) - Math.min(...heights) > 1.15)
            continue;
          const radius = Math.hypot(site.w, site.d) / 2 + 2,
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
              for (const o of world.grid.get(x + "," + z) || [])
                obstacles.add(o);
          if (
            [...obstacles].some((o) => overlaps(site, o)) ||
            sites.some((o) => overlaps(site, { ...o, type: "box" }))
          )
            continue;
          site.y = Math.max(...heights) + 0.055;
          chosen = site;
          break;
        }
      }
    }
    if (chosen) sites.push(chosen);
  }
  return sites;
}
