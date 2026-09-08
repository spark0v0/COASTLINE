import { ResortKit } from "./resort-kit.js";
import { placeOnVerge } from "./verge-placement.js";

// Small landscaped plots fill selected roadside gaps with human-scale objects.
export function buildRoadsideCourts(S) {
  const w = S.world;
  w.courtyards = [];
  for (const path of w.paths) {
    if (/镜湖/.test(path.name)) continue;
    for (
      let i = 19;
      i < path.points.length - 5 && w.courtyards.length < 80;
      i += 23
    ) {
      const p = path.points[i],
        q = path.points[i + 1];
      if (p.z < -200 || p.z > 850) continue;
      const a = Math.atan2(q.z - p.z, q.x - p.x);
      for (const side of [1, -1]) {
        let site = null;
        for (const setback of [7.6, 10, 13]) {
          const x = p.x - Math.sin(a) * (path.width / 2 + setback) * side;
          const z = p.z + Math.cos(a) * (path.width / 2 + setback) * side;
          site = placeOnVerge(w, {
            x,
            z,
            yaw: a + (side === 1 ? Math.PI : 0),
            w: 8,
            d: 6,
          });
          if (site) break;
        }
        if (!site) continue;
        w.courtyards.push(site);
        const k = new ResortKit(S, site),
          n = w.courtyards.length;
        k.box(k.stone, 0, -0.9, 0, 8, 1.02, 6, true);
        k.solid(0, 0, 8, 6, 0.18);
        k.box(k.wood, 0, 0.12, -2.75, 8, 0.35, 0.24, true);
        k.bench(-1.8, -1.5);
        k.planter(2.5, -1.4, 2.0);
        k.planter(-3.1, 2.1, 1.35);
        k.bin(3.1, 2);
        if (n % 3 === 0) {
          k.table(0.7, 1.1);
          k.umbrella(0.7, 1.1);
        } else if (n % 3 === 1) {
          k.bicycle(0.3, 1.7, "#708e8c");
          k.bicycle(-1.5, 1.7, "#b18b67");
          for (const xx of [-3, 3])
            k.box(k.wood, xx, 0.15, -2.5, 0.13, 2.9, 0.13);
          for (let xx = -3.4; xx <= 3.4; xx += 0.45)
            k.box(k.wood, xx, 3.05, -1.4, 0.09, 0.12, 2.9);
        } else {
          k.box(k.stone, 0.8, 0.16, 0.6, 2.1, 0.38, 1.8, true);
          k.box(k.glass, 0.8, 0.55, 0.6, 1.83, 0.02, 1.52);
          k.box(k.white, 0.8, 0.55, 0.6, 0.2, 1.15, 0.2, true);
          k.box(k.wood, -2.6, 0.16, 0.3, 0.62, 1.0, 0.13, true);
          k.sign("COAST / 慢行", -2.6, 0.92, 0.39, 0.55, 0.4);
        }
        break;
      }
    }
  }
}
