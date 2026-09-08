import { THREE, rng, geometryFromTriangles, urban } from "./kit.js";
import { lakeDistance } from "../lake-data.js";

// Small coherent planting islands along roads, with an open verge.
// Every blade and shrub is batched; no downloaded alpha cards or particle lawn.
export function buildGroundCover(S) {
  const w = S.world,
    b = S.batch,
    r = rng(88131),
    p = [],
    colors = [];
  for (let i = 0; i < 17; i++) {
    const angle = i * 2.39996,
      radius = 0.85 * Math.sqrt(r());
    const x = Math.cos(angle) * radius,
      z = Math.sin(angle) * radius,
      h = 0.18 + r() * 0.42;
    const bend = 0.1 + r() * 0.19,
      dx = Math.cos(angle),
      dz = Math.sin(angle),
      width = 0.018 + r() * 0.025;
    const blade = [
      x - dz * width,
      0,
      z + dx * width,
      x + dz * width,
      0,
      z - dx * width,
      x + dx * bend * 0.4,
      h * 0.58,
      z + dz * bend * 0.4,
      x - dz * width,
      0,
      z + dx * width,
      x + dx * bend * 0.4,
      h * 0.58,
      z + dz * bend * 0.4,
      x + dx * bend,
      h,
      z + dz * bend,
    ];
    p.push(...blade);
    for (let j = 0; j < 6; j++) {
      const c = new THREE.Color(j % 3 === 2 ? "#899256" : "#415d32");
      colors.push(c.r, c.g, c.b);
    }
  }
  b.geometries.meadow = geometryFromTriangles(p, colors);
  b.lodGeometries.meadow = [new THREE.BufferGeometry()];
  const grass = new THREE.MeshStandardMaterial({
    color: "#ffffff",
    vertexColors: true,
    side: THREE.DoubleSide,
    roughness: 1,
  });
  const stems = [],
    flowers = [];
  for (let i = 0; i < 10; i++) {
    const a = i * 2.4,
      h = 0.32 + r() * 0.27,
      x = Math.cos(a) * r() * 0.45,
      z = Math.sin(a) * r() * 0.45;
    stems.push(x - 0.012, 0, z, x + 0.012, 0, z, x + 0.04, h, z);
    const s = 0.055;
    flowers.push(x - s, h - s, z, x + s, h - s, z, x, h + 0.13, z);
    flowers.push(x, h - s, z - s, x, h - s, z + s, x, h + 0.13, z);
  }
  b.geometries.lavenderStems = geometryFromTriangles(stems);
  b.geometries.lavender = geometryFromTriangles(flowers);
  b.lodGeometries.lavender = [new THREE.BufferGeometry()];
  b.lodGeometries.lavenderStems = [new THREE.BufferGeometry()];
  const lavender = new THREE.MeshStandardMaterial({
    color: "#8580a0",
    roughness: 0.95,
    side: THREE.DoubleSide,
  });
  const stalk = new THREE.MeshStandardMaterial({
    color: "#52694b",
    roughness: 1,
    side: THREE.DoubleSide,
  });
  const rock = S.art.get("stone", "#b6b3a2");
  // Hand-authored scenic emphasis: coast, arrival bay, summit and valley.
  const areas = [
    { from: 0.69, to: 0.88, side: 1, spread: 32 },
    { from: 0.38, to: 0.43, side: -1, spread: 22 },
    { from: 0.14, to: 0.24, side: 1, spread: 27 },
    { from: 0.53, to: 0.64, side: 1, spread: 24 },
  ];
  const occupiedPlots = [
    ...(w.places || []),
    ...(w.courtyards || []),
    ...(w.frontages || []),
    ...(w.streetscape || []),
    ...(w.gardens || []),
    ...(w.openSpaces || []),
  ];
  const clear = (x, z, margin) => {
    if (lakeDistance(x, z) < 1.62) return false;
    if (!w.inside(x, z) || w.height(x, z) < 1.1) return false;
    if (
      occupiedPlots.some((h) => {
        const dx = x - h.x,
          dz = z - h.z,
          c = Math.cos(h.yaw),
          s = Math.sin(h.yaw);
        return (
          Math.abs(dx * c + dz * s) < h.w / 2 + margin &&
          Math.abs(-dx * s + dz * c) < h.d / 2 + margin
        );
      })
    )
      return false;
    const road = w.nearestRoad(x, z);
    if (road.d < road.width * 0.5 + margin) return false;
    if (
      x > 470 &&
      z > -130 &&
      z < 850 &&
      road.id === 0 &&
      x > road.x &&
      road.d < road.width / 2 + 7.4
    )
      return false;
    return !w.buildings.some(
      (h) =>
        Math.abs(x - h.x) < h.w * 0.7 + margin &&
        Math.abs(z - h.z) < h.d * 0.7 + margin,
    );
  };
  for (const area of areas)
    for (
      let s = area.from * w.routeLength;
      s < area.to * w.routeLength;
      s += 13
    ) {
      const cp = w.pointAt(s),
        right = { x: Math.cos(cp.yaw), z: Math.sin(cp.yaw) };
      const side = (r() < 0.24 ? -1 : 1) * area.side;
      const offset = 11 + r() * area.spread,
        cx = cp.x + right.x * offset * side,
        cz = cp.z + right.z * offset * side;
      if (!clear(cx, cz, 3)) continue;
      const cy = w.height(cx, cz);
      // Low shrubs, grasses and limestone occur together, not evenly spaced objects.
      if (r() < 0.5) {
        for (let j = 0; j < 3; j++) {
          const x = cx + (r() - 0.5) * 3,
            z = cz + (r() - 0.5) * 3,
            sz = 0.5 + r() * 0.75;
          b.add(
            "foliage" + j,
            ["#4b6443", "#617451", "#737e57"][j],
            [x, w.height(x, z) + sz * 0.38, z],
            [sz, sz * 0.52, sz * 0.8],
            [0, r() * 6, 0],
          );
        }
        if (r() < 0.35)
          b.add(
            "rock1",
            rock,
            [cx, cy + 0.15, cz],
            [1.4, 0.65, 0.9],
            [0, r() * 6, 0],
          );
      }
      for (let j = 0; j < 28; j++) {
        const angle = r() * 6.28,
          dist = Math.sqrt(r()) * (3.6 + r() * 2.5);
        const x = cx + Math.cos(angle) * dist,
          z = cz + Math.sin(angle) * dist;
        if (!clear(x, z, 2.3)) continue;
        const y = w.height(x, z) - 0.025,
          scale = 0.65 + r() * 0.8;
        b.add(
          "meadow",
          grass,
          [x, y, z],
          [scale, 0.7 + r() * 0.6, scale],
          [0, r() * 6, 0],
          false,
        );
        if (j < 5 && area.from > 0.65) {
          b.add("lavender", lavender, [x, y, z], [1, 1, 1], [0, 0, 0], false);
          b.add("lavenderStems", stalk, [x, y, z], [1, 1, 1], [0, 0, 0], false);
        }
      }
    }
}
