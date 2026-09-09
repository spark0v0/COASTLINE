import { ResortKit } from "./resort-kit.js";
import { placeOnVerge } from "./verge-placement.js";
import { groundBed, groundPath } from "./ground-patches.js";
import { TOUR_STREET_Z, tourFrame } from "../scenic-route.js";

// Few placed compositions alternate with clear views; each footprint is checked.
export function buildScenicGardens(S) {
  const sites = [
    [86, -1, 11, 3.8],
    [154, 1, 8, 3.5],
    [235, -1, 12, 3.2],
    [302, 1, 10, 4.1],
    [362, -1, 9, 4],
    [432, 1, 12, 3.5],
  ];
  S.world.scenicBeds = [];
  for (let i = 0; i < sites.length; i++) {
    const [x, side, width, depth] = sites[i];
    const frame = tourFrame(S.world, x);
    let site = null;
    for (const offset of [13, 16, 20]) {
      site = placeOnVerge(S.world, {
        authored: true,
        x: frame.x + frame.nx * side * offset,
        z: frame.z + frame.nz * side * offset,
        yaw: frame.angle + (side > 0 ? Math.PI : 0),
        w: width,
        d: depth,
      });
      if (site) break;
    }
    if (!site) continue;
    S.world.scenicBeds.push(site);
    const k = new ResortKit(S, site);
    k.followTerrain = true;
    groundBed(S, site, 0, 0, width * 0.45, depth * 0.4, i * 0.9);
    // Three complementary layers: low stones, loose foliage, flowering stems.
    for (let j = 0; j < 9; j++) {
      const x = -width * 0.4 + j * width * 0.1,
        z = Math.sin(j * 1.8 + i) * depth * 0.18;
      const scale = 0.45 + 0.16 * Math.sin(j * 2.3 + i);
      k.add(
        "foliage" + (j % 3),
        ["#6c8065", "#8a9474", "#527363"][j % 3],
        x,
        0.2,
        z,
        scale,
        0.3,
        scale * 0.8,
        [0, j * 2.4, 0],
      );
      if (j % 3 === 0)
        k.add(
          "rock" + (j % 3),
          k.stone,
          x + 0.4,
          0.08,
          z - 0.35,
          0.5,
          0.26,
          0.4,
          [0, j, 0],
        );
      if (j % 2 === 1)
        for (let f = 0; f < 3; f++)
          k.add(
            "sphere",
            i % 2 ? "#c1b1b7" : "#cbbb95",
            x + (f - 1) * 0.12,
            0.5,
            z,
            0.05,
            0.07,
            0.05,
          );
    }
    // Short limestone bench-wall with a narrow cap, not a perimeter around a pad.
    if (i % 2 === 0) {
      k.box(k.stone, -width * 0.2, -0.12, -depth * 0.36, 3.2, 0.64, 0.38, true);
      k.box(k.wood, -width * 0.2, 0.52, -depth * 0.36, 3.3, 0.045, 0.46, true);
      k.solid(-width * 0.2, -depth * 0.36, 3.3, 0.46, 0.6);
    }
    // Slender paired arms and a small luminaire establish street scale.
    const lampX = width * 0.39;
    k.tube(k.metal, [lampX, 0, 0], [lampX, 4.6, 0], 0.045);
    k.tube(k.metal, [lampX, 4.6, 0], [lampX - 0.55, 4.7, 0.38], 0.03);
    k.add("softSlab", k.metal, lampX - 0.6, 4.67, 0.4, 0.55, 0.08, 0.19);
    k.add("softSlab", "#e9dfc2", lampX - 0.6, 4.63, 0.4, 0.42, 0.025, 0.13);
    k.solid(lampX, 0, 0.12, 0.12, 4.8);
  }
  // Approaches to existing villas use gravel margins instead of more furniture.
  for (const h of S.world.buildings) {
    if (h.x < 55 || h.x > 465 || Math.abs(h.z - TOUR_STREET_Z) > 50) continue;
    const road = S.world.nearestRoad(h.x, h.z),
      yaw =
        h.yaw +
        (Math.sin(h.yaw) * (h.x - road.x) + Math.cos(h.yaw) * (road.z - h.z) < 0
          ? Math.PI
          : 0);
    const site = { x: h.x, z: h.z, yaw };
    groundPath(
      S,
      site,
      [
        [-h.w * 0.4, h.d / 2 + 0.5],
        [0, h.d / 2 + 0.65],
        [h.w * 0.4, h.d / 2 + 0.5],
      ],
      0.65,
      "sand",
      "#b7ad96",
    );
  }
}
