import { ResortKit } from "./resort-kit.js";
import { placeOnVerge } from "./verge-placement.js";

export function dressFrontages(S) {
  const w = S.world;
  w.frontages = [];
  for (const h of w.buildings) {
    if (h.residential) continue;
    if (w.frontages.length >= 90) break;
    const road = w.nearestRoad(h.x, h.z),
      c = Math.cos(h.yaw),
      s = Math.sin(h.yaw);
    const side = -(road.x - h.x) * s + (road.z - h.z) * c >= 0 ? 1 : -1;
    const offset = (h.d / 2 + 1.15) * side;
    const site = placeOnVerge(
      w,
      {
        x: h.x - offset * s,
        z: h.z + offset * c,
        yaw: h.yaw + (side < 0 ? Math.PI : 0),
        w: Math.min(5.3, h.w * 0.48),
        d: 1.65,
      },
      h,
    );
    if (!site) continue;
    w.frontages.push(site);
    const k = new ResortKit(S, site),
      v = h.variant % 4;
    // A shallow extension anchored to the existing front wall.
    k.box(k.stone, 0, -0.5, 0, site.w, 0.63, site.d, true);
    k.solid(0, 0, site.w, site.d, 0.15);
    if (v === 0) {
      k.box(k.fabric, 0, 2.8, 0, site.w + 0.2, 0.13, 1.85, true);
      for (let i = -3; i <= 3; i++)
        k.box("#889c8d", i * 0.65, 2.94, 0, 0.16, 0.018, 1.85);
      k.box(k.wood, -0.85, 0.13, 0.18, 0.6, 1.08, 0.12, true);
      k.sign("CAFE / GELATO", -0.85, 0.9, 0.255, 0.55, 0.38);
      k.planter(1.75, 0, 1.0);
    } else if (v === 1) {
      k.box(k.glass, 0, 2.78, 0, site.w + 0.1, 0.085, 1.8);
      k.box(k.metal, 0, 2.75, 0.83, site.w + 0.1, 0.075, 0.06);
      k.bench(-0.3, 0);
      k.planter(1.85, 0, 0.85);
      k.sign("MARINA / WELCOME", 0, 2.27, -0.79, 3.3, 0.43);
    } else if (v === 2) {
      k.box(k.white, -1.5, 0.13, -0.17, 0.74, 1.55, 0.14, true);
      k.sign("SOLE / STUDIO", -1.5, 1.32, -0.085, 0.64, 0.54, "#ac896a");
      for (let j = 0; j < 3; j++)
        k.add("propDisc", k.white, 0.4 + j * 0.63, 0.52, 0.1, 0.25, 0.75, 0.25);
      for (let j = 0; j < 3; j++)
        k.add(
          "foliage" + j,
          "#80906a",
          0.4 + j * 0.63,
          1.13,
          0.1,
          0.37,
          0.5,
          0.3,
        );
    } else {
      k.bench(0, -0.1);
      k.planter(-1.85, 0, 0.85);
      k.planter(1.85, 0, 0.85);
    }
  }
}
