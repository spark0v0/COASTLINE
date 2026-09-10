import {
  clamp,
  lerp,
  distance,
  smooth,
  segmentPoint,
  rng,
  angleDiff,
} from "./math.js";
import {
  ISLAND_SCALE as S,
  ISLAND_CENTER,
  ISLAND_BOUNDS,
  ROUTE_NODES,
  REGIONS,
  RACE_DEFINITIONS,
} from "./world-layout.js";
const point = (x, z) => ({ x, z });
import {
  CENTRAL_LAKE,
  LAKE_SHORE,
  lakePoint,
  lakeDistance,
  lakeTerrain,
} from "./lake-data.js";

export class WorldData {
  constructor() {
    this.paths = [];
    this.roads = [];
    this.obstacles = [];
    this.buildings = [];
    this.trees = [];
    this.rails = [];
    this.grid = new Map();
    this.roadGrid = new Map();
    this.scale = S;
    this.center = ISLAND_CENTER;
    this.bounds = ISLAND_BOUNDS;
    this.regions = REGIONS;
    this.lake = { ...CENTRAL_LAKE, shore: LAKE_SHORE };
    this.route = this.curve(ROUTE_NODES, true);
    this.addPath(this.route, 10.5, "环岛公路");
    this.addPath([point(-170, 233), point(122, 233)], 16, "港湾大道");
    for (const x of [-170, 60])
      this.addPath([point(x, 233), point(x, -40)], 15, "城市街道");
    for (const z of [-40, 65])
      this.addPath([point(-170, z), point(192, z)], 15, "城市街道");
    // Metre-authored promenade; the same ribbon feeds rendering, reset,
    // off-road grip, roadside placement and the minimap.
    const coastAt = (z) =>
      this.route.reduce(
        (a, b) => (b.x > 590 && Math.abs(b.z - z) < Math.abs(a.z - z) ? b : a),
        { x: 635, z: 9999 },
      );
    this.scenicJoin = coastAt(490);
    this.addPath(
      this.curve(
        [
          [-569.5, 569.5],
          [-90, 569.5],
          [55, 569.5],
          [133, 549],
          [201, 569.5],
          [274, 590],
          [351, 571],
          [426, 541],
          [503, 548],
          [563, 528],
          [602, 503],
          [this.scenicJoin.x, this.scenicJoin.z],
        ].map(([x, z]) => point(x / S, z / S)),
        false,
      ),
      8.4,
      "晴湾花园街道",
    );
    this.overlookJoin = coastAt(282);
    this.addPath(
      this.curve(
        [
          this.overlookJoin,
          point(this.overlookJoin.x + 13, this.overlookJoin.z - 4),
          point(682, 266),
          point(686, 246),
          point(676, 235),
        ].map((p) => point(p.x / S, p.z / S)),
        false,
      ),
      7.2,
      "晴湾观景支路",
    );
    this.overlook = { x: 686, z: 246 };
    const loop = Array.from({ length: 97 }, (_, i) =>
      lakePoint((i / 96) * Math.PI * 2, 1.28),
    );
    this.addPath(
      loop.map((p) => point(p.x / S, p.z / S)),
      6,
      "镜湖环湖路",
    );
    const entrance = loop[0];
    this.addPath(
      [
        point(60, 40 / S),
        point((201 + entrance.x) / (2 * S), 40 / S),
        point(entrance.x / S, entrance.z / S),
      ],
      8,
      "镜湖入口",
    );
    this.addPath(
      this.curve(
        [
          point(-170, 65),
          point(-223, 7),
          point(-244, -74),
          point(-199, -136),
          point(-171, -182),
        ],
        false,
      ),
      14,
      "松岭支路",
    );
    this.distances = [0];
    for (let i = 1; i < this.route.length; i++)
      this.distances.push(
        this.distances[i - 1] + distance(this.route[i - 1], this.route[i]),
      );
    this.routeLength = this.distances.at(-1);
    this.events = RACE_DEFINITIONS.map((def) => ({
      ...def,
      length: (def.to - def.from) * this.routeLength,
      start: this.pointAt(def.from * this.routeLength),
      points: Array.from({ length: def.count }, (_, i) => ({
        ...this.pointAt(
          this.routeLength *
            (def.from + ((def.to - def.from) * (i + 1)) / def.count),
        ),
        radius: 8.6,
      })),
      route: this.route.filter(
        (_, i) =>
          this.distances[i] >= def.from * this.routeLength &&
          this.distances[i] <= def.to * this.routeLength,
      ),
    }));
    this.checkpoints = this.events[2].points;
    this.start = this.pointAt(0);
    this.spawn = { ...this.pointAt(this.routeLength * 0.795) };
    this.shore = Array.from({ length: 385 }, (_, i) => {
      const a = (i / 384) * Math.PI * 2,
        c = Math.cos(a),
        s = Math.sin(a);
      const k = this.shoreVariation(a);
      return point(
        this.center.x + 260 * S * Math.sign(c) * Math.abs(c) ** 0.38 * k,
        350 * S * Math.sign(s) * Math.abs(s) ** 0.38 * k,
      );
    });
    // Marina spur: links the town's south street to the fishing harbour.
    this.harbor = this.shore.reduce(
      (best, p) =>
        Math.abs(p.x - 320) + Math.abs(p.z - 1110) <
        Math.abs(best.x - 320) + Math.abs(best.z - 1110)
          ? p
          : best,
      this.shore[0],
    );
    this.addPath(
      this.curve([point(90, 262), point(95, 296), point(90, 332)], false),
      10,
      "港口路",
    );
    this.generateProps();
    this.discoveries = [
      {
        at: 0.19,
        name: "橄榄谷地",
        description: "风穿过果园，山路从这里开始。",
      },
      {
        at: 0.393,
        name: "松岭之巅",
        description: "驶过连续弯道，岛屿在脚下展开。",
      },
      { at: 0.58, name: "北岬望海", description: "山脊尽头，是另一片海。" },
      {
        at: 0.73,
        name: "晴湾灯塔",
        description: "沿着灯塔，驶向蓝绿色的海湾。",
      },
      {
        x: this.harbor.x - 22,
        z: this.harbor.z - 46,
        yaw: Math.PI,
        name: "老城码头",
        description: "彩色老城与停泊的帆船。",
      },
      {
        x: lakePoint(0, 1.28).x,
        z: lakePoint(0, 1.28).z,
        yaw: -Math.PI / 2,
        name: "镜湖公园",
        description: "驶入环湖路，在喷泉与树影之间慢下来。",
      },
      {
        ...this.overlook,
        yaw: Math.PI / 2,
        name: "晴湾观景台",
        description: "驶过花园街与沿海缓弯，在这里回望晴湾。",
      },
    ].map((d, i) => ({
      ...(d.at !== undefined ? this.pointAt(this.routeLength * d.at) : d),
      id: "vista-" + i,
      name: d.name,
      description: d.description,
    }));
  }
  curve(points, closed) {
    const out = [],
      n = points.length;
    for (let i = 0; i < (closed ? n : n - 1); i++) {
      const b = points[i],
        c = points[(i + 1) % n],
        a = !closed && i === 0 ? b : points[(i - 1 + n) % n],
        d = !closed && i === n - 2 ? c : points[(i + 2) % n];
      const count = Math.max(4, Math.ceil(distance(b, c) / 3));
      for (let j = 0; j < count; j++) {
        const t = j / count,
          t2 = t * t,
          t3 = t2 * t,
          f = (k) =>
            0.5 *
            (2 * b[k] +
              (-a[k] + c[k]) * t +
              (2 * a[k] - 5 * b[k] + 4 * c[k] - d[k]) * t2 +
              (-a[k] + 3 * b[k] - 3 * c[k] + d[k]) * t3);
        out.push(point(f("x"), f("z")));
      }
    }
    out.push({ ...points[closed ? 0 : n - 1] });
    return out;
  }
  addPath(points, width, name) {
    if (name !== "环岛公路")
      points = points.map((p) => ({ x: p.x * S, z: p.z * S }));
    const dense = [];
    for (let i = 1; i < points.length; i++) {
      const a = points[i - 1],
        b = points[i],
        n = Math.max(1, Math.ceil(distance(a, b) / 3));
      for (let j = 0; j < n; j++)
        dense.push(point(lerp(a.x, b.x, j / n), lerp(a.z, b.z, j / n)));
    }
    dense.push({ ...points.at(-1) });
    const id = this.paths.length;
    this.paths.push({ points: dense, width, name, id });
    for (let i = 1; i < dense.length; i++) {
      const road = { a: dense[i - 1], b: dense[i], width, name, id, index: i };
      this.roads.push(road);
      const pad = width / 2 + 24;
      for (
        let x = Math.floor((Math.min(road.a.x, road.b.x) - pad) / 32);
        x <= Math.floor((Math.max(road.a.x, road.b.x) + pad) / 32);
        x++
      )
        for (
          let z = Math.floor((Math.min(road.a.z, road.b.z) - pad) / 32);
          z <= Math.floor((Math.max(road.a.z, road.b.z) + pad) / 32);
          z++
        ) {
          const key = x + "," + z;
          if (!this.roadGrid.has(key)) this.roadGrid.set(key, []);
          this.roadGrid.get(key).push(road);
        }
    }
  }
  pointAt(s) {
    s = clamp(s, 0, this.routeLength);
    let lo = 1,
      hi = this.distances.length - 1;
    while (lo < hi) {
      const mid = (lo + hi) >> 1;
      if (this.distances[mid] < s) lo = mid + 1;
      else hi = mid;
    }
    const i = lo,
      a = this.route[i - 1],
      b = this.route[i],
      t =
        (s - this.distances[i - 1]) /
        (this.distances[i] - this.distances[i - 1] || 1);
    return {
      x: lerp(a.x, b.x, t),
      z: lerp(a.z, b.z, t),
      yaw: Math.atan2(b.x - a.x, -(b.z - a.z)),
      s,
    };
  }
  height(x, z) {
    x /= S;
    z /= S;
    const hill = (cx, cz, sx, sz, h) =>
      h * Math.exp(-Math.pow((x - cx) / sx, 2) - Math.pow((z - cz) / sz, 2));
    const mountains =
      (hill(-191, -244, 104, 102, 142) +
        hill(15, -310, 93, 72, 116) +
        hill(-110, -340, 40, 42, 58)) *
      smooth(12, -115, z);
    const valley = hill(-236, -55, 77, 83, 24) + hill(60, -128, 85, 64, 28);
    const folds =
      (Math.sin(x * 0.058 + z * 0.016) * Math.cos(z * 0.041) * 3.4 +
        Math.sin(x * 0.113 + z * 0.073) * 1.3) *
      smooth(-60, -200, z);
    // Broad, gentle landforms bring the coast above the sea. Shared sampling
    // keeps road surface, car suspension and foundations on the same slopes.
    const coastalRelief =
      hill(87, 191, 44, 29, 9.4) +
      hill(169, 88, 23, 37, 7) +
      hill(192, 64, 24, 38, 10) +
      hill(128, 170, 34, 26, 3.2);
    const gardenRoll =
      0.7 *
      Math.sin(x * 0.061 + z * 0.039) *
      Math.cos(z * 0.073) *
      Math.exp(-Math.pow((x - 78) / 90, 2) - Math.pow((z - 166) / 57, 2));
    let h = 3.1 + mountains + valley + folds + coastalRelief + gardenRoll;
    // Low shoreline eases below sea level so beaches slope into the water;
    // tall sea cliffs keep their full drop.
    const rim = this.shoreRim(x, z);
    const beach = smooth(0.82, 1.0, rim) * (1 - smooth(6, 14, h));
    return lakeTerrain(x * S, z * S, h * (1 - beach) + -1.4 * beach);
  }
  // Superellipse rim metric: 0 at the centre, 1 on the shoreline.
  shoreRim(x, z) {
    const dx = (x + 50) / 260,
      dz = z / 350;
    const a = Math.atan2(
      Math.sign(dz) * Math.abs(dz) ** (1 / 0.38),
      Math.sign(dx) * Math.abs(dx) ** (1 / 0.38),
    );
    const k = this.shoreVariation(a);
    return Math.abs(dx / k) ** (2 / 0.38) + Math.abs(dz / k) ** (2 / 0.38);
  }
  shoreVariation(a) {
    return 1 + 0.026 * Math.sin(a * 3 + 0.3) + 0.016 * Math.sin(a * 7 - 1);
  }
  inside(x, z) {
    const dx = (x - this.center.x) / (260 * S),
      dz = z / (350 * S);
    const a = Math.atan2(
      Math.sign(dz) * Math.abs(dz) ** (1 / 0.38),
      Math.sign(dx) * Math.abs(dx) ** (1 / 0.38),
    );
    const k = this.shoreVariation(a);
    return Math.abs(dx / k) ** (2 / 0.38) + Math.abs(dz / k) ** (2 / 0.38) < 1;
  }
  nearestRoad(x, z) {
    let best = { d: Infinity, width: 17 };
    const list =
      this.roadGrid.get(Math.floor(x / 32) + "," + Math.floor(z / 32)) ||
      this.roads;
    for (const road of list) {
      const p = segmentPoint(x, z, road.a, road.b);
      if (p.d < best.d) best = { ...road, ...p };
    }
    return best;
  }
  isJunction(x, z, id, margin = 2) {
    return (
      this.roadGrid.get(Math.floor(x / 32) + "," + Math.floor(z / 32)) || []
    ).some(
      (r) =>
        r.id !== id && segmentPoint(x, z, r.a, r.b).d < r.width / 2 + margin,
    );
  }
  region(x, z) {
    return z < -680 && x > -100
      ? "北岬海崖"
      : z < -430
        ? "松岭山道"
        : x < -650 || z < -130
          ? "橄榄谷地"
          : x > 445
            ? "晴湾海岸"
            : "棕榈港老城";
  }
  safeReset(car) {
    const p = this.nearestRoad(car.x, car.z);
    let yaw = Math.atan2(p.b.x - p.a.x, -(p.b.z - p.a.z));
    if (Math.abs(angleDiff(car.yaw, yaw)) > Math.PI / 2) yaw += Math.PI;
    return { ...p, yaw };
  }
  register(o) {
    this.obstacles.push(o);
    const r = o.type === "circle" ? o.r : Math.hypot(o.w, o.d) / 2;
    for (
      let x = Math.floor((o.x - r) / 24);
      x <= Math.floor((o.x + r) / 24);
      x++
    )
      for (
        let z = Math.floor((o.z - r) / 24);
        z <= Math.floor((o.z + r) / 24);
        z++
      ) {
        const key = x + "," + z;
        if (!this.grid.has(key)) this.grid.set(key, []);
        this.grid.get(key).push(o);
      }
  }
  generateProps() {
    const random = rng(42018),
      palette = ["#ead4ad", "#e6ad91", "#e8ddc1", "#c6d0b3", "#d4ae80"];
    const clear = (x, z, r) =>
      this.inside(x, z) &&
      lakeDistance(x, z) > 1.53 + r / this.lake.rz &&
      this.nearestRoad(x, z).d > r + 9 &&
      !this.buildings.some(
        (b) =>
          Math.hypot(x - b.x, z - b.z) < r + Math.hypot(b.w, b.d) * 0.5 + 3,
      );
    for (const path of this.paths)
      for (let i = 6; i < path.points.length - 6; i += 11) {
        const p = path.points[i],
          next = path.points[i + 1];
        const town = p.z > -110 && p.z < 820 && p.x > -660 && p.x < 460;
        const coast = p.x > 455 && p.z > -30 && p.z < 765;
        if (!town && !coast) continue;
        const yaw = Math.atan2(next.z - p.z, next.x - p.x),
          nx = -Math.sin(yaw),
          nz = Math.cos(yaw);
        for (const side of [-1, 1]) {
          if (random() > (coast ? 0.64 : 0.83)) continue;
          const width = 12 + random() * 7,
            depth = 10 + random() * 6,
            offset = path.width / 2 + depth / 2 + 5 + random() * 3;
          const x = p.x + nx * offset * side,
            z = p.z + nz * offset * side;
          if (coast && x > p.x) continue;
          if (!clear(x, z, Math.hypot(width, depth) / 2)) continue;
          const house = {
            type: "box",
            x,
            z,
            w: width,
            d: depth,
            h: 6.8 + Math.floor(random() * 3) * 3.1,
            yaw,
            color: palette[Math.floor(random() * palette.length)],
            variant: Math.floor(random() * 5),
            seed: Math.floor(random() * 100000),
          };
          this.buildings.push(house);
          this.register(house);
        }
      }
    // Small valley hamlets use the same architectural kit with more space.
    const branch = this.paths.at(-1);
    for (let i = 20; i < branch.points.length; i += 24) {
      const p = branch.points[i],
        x = p.x - 26,
        z = p.z;
      if (!clear(x, z, 13)) continue;
      const house = {
        type: "box",
        x,
        z,
        w: 16,
        d: 12,
        h: 6.6,
        yaw: 0,
        color: palette[i % 5],
        variant: 3,
        seed: i * 73,
      };
      this.buildings.push(house);
      this.register(house);
    }
    const tree = (x, z, kind, h, seed) => {
      this.trees.push({ x, z, kind, h, seed });
      this.register({ type: "circle", x, z, r: kind === "palm" ? 0.34 : 0.55 });
    };
    for (let i = 0; i < 2400; i++) {
      const x = -1110 + random() * 1880,
        z = -1180 + random() * 2300;
      if (!this.inside(x, z)) continue;
      if (lakeDistance(x, z) < 1.55) continue;
      const list = this.roadGrid.get(
        Math.floor(x / 32) + "," + Math.floor(z / 32),
      );
      if (list && this.nearestRoad(x, z).d < 15) continue;
      if (
        this.buildings.some(
          (b) => Math.hypot(x - b.x, z - b.z) < Math.hypot(b.w, b.d) / 2 + 5,
        )
      )
        continue;
      const kind = z < -420 ? "pine" : x > 425 ? "palm" : "olive";
      tree(
        x,
        z,
        kind,
        kind === "palm"
          ? 9 + random() * 4
          : kind === "pine"
            ? 9 + random() * 9
            : 5 + random() * 3,
        random() * 6.28,
      );
    }
    // Loose groves alternate planted foreground with open sea views.
    for (let i = 0; i < this.route.length; i += 10) {
      const p = this.route[i],
        q = this.route[Math.min(i + 1, this.route.length - 1)];
      if (p.z < -160 || (p.x < 450 && Math.abs(p.x + 201) > 3)) continue;
      const yaw = Math.atan2(q.z - p.z, q.x - p.x);
      for (const side of [-1, 1]) {
        if (random() < 0.32) continue;
        const offset = 19 + random() * 17;
        const x = p.x - Math.sin(yaw) * offset * side + (random() - 0.5) * 7,
          z = p.z + Math.cos(yaw) * offset * side + (random() - 0.5) * 7;
        if (
          !this.inside(x, z) ||
          this.isJunction(x, z, 0, 4) ||
          this.buildings.some((b) => Math.hypot(x - b.x, z - b.z) < 17)
        )
          continue;
        tree(x, z, "palm", 7.5 + random() * 3.5, i * 0.37);
      }
    }
    for (const road of this.roads) {
      if (road.id !== 0) continue;
      const { a, b } = road,
        dx = b.x - a.x,
        dz = b.z - a.z,
        len = distance(a, b);
      if (len < 0.01) continue;
      const mx = (a.x + b.x) / 2,
        mz = (a.z + b.z) / 2;
      if (mz > -410 && mx < 520) continue;
      for (const side of [-1, 1]) {
        const x = mx - (dz / len) * (road.width / 2 + 1.3) * side,
          z = mz + (dx / len) * (road.width / 2 + 1.3) * side;
        if (this.isJunction(x, z, 0, 6)) continue;
        const rail = {
          type: "box",
          x,
          z,
          w: 0.34,
          d: len + 0.55,
          yaw: Math.atan2(-dx, dz),
          h: 1,
        };
        this.rails.push(rail);
        this.register(rail);
      }
    }
  }
  collide(car) {
    // A pair of circles approximates the full vehicle footprint, including its nose.
    const radius = 1.04,
      fx = Math.sin(car.yaw),
      fz = -Math.cos(car.yaw),
      candidates = new Set();
    for (
      let x = Math.floor((car.x - 3) / 24);
      x <= Math.floor((car.x + 3) / 24);
      x++
    )
      for (
        let z = Math.floor((car.z - 3) / 24);
        z <= Math.floor((car.z + 3) / 24);
        z++
      )
        for (const o of this.grid.get(x + "," + z) || []) candidates.add(o);
    for (let pass = 0; pass < 2; pass++)
      for (const o of candidates)
        for (const offset of [-1.1, 1.1]) {
          const x = car.x + fx * offset,
            z = car.z + fz * offset;
          let nx, nz, penetration;
          if (o.type === "circle") {
            const dx = x - o.x,
              dz = z - o.z,
              d = Math.hypot(dx, dz),
              total = radius + o.r;
            if (d >= total) continue;
            nx = d > 0 ? dx / d : 1;
            nz = d > 0 ? dz / d : 0;
            penetration = total - d;
          } else {
            const c = Math.cos(o.yaw),
              s = Math.sin(o.yaw),
              dx = x - o.x,
              dz = z - o.z,
              lx = dx * c + dz * s,
              lz = -dx * s + dz * c,
              px = lx - clamp(lx, -o.w / 2, o.w / 2),
              pz = lz - clamp(lz, -o.d / 2, o.d / 2),
              d = Math.hypot(px, pz);
            if (d >= radius) continue;
            let ux, uz;
            if (d > 0.00001) {
              ux = px / d;
              uz = pz / d;
              penetration = radius - d;
            } else {
              const a = o.w / 2 - Math.abs(lx),
                b = o.d / 2 - Math.abs(lz);
              if (a < b) {
                ux = Math.sign(lx) || 1;
                uz = 0;
                penetration = radius + a;
              } else {
                ux = 0;
                uz = Math.sign(lz) || 1;
                penetration = radius + b;
              }
            }
            nx = ux * c - uz * s;
            nz = ux * s + uz * c;
          }
          car.x += nx * (penetration + 0.002);
          car.z += nz * (penetration + 0.002);
          const into = car.vx * nx + car.vz * nz;
          if (into < 0) {
            car.vx -= nx * into * 1.08;
            car.vz -= nz * into * 1.08;
            car.vx *= 0.92;
            car.vz *= 0.92;
            car.impact = Math.max(car.impact, clamp(-into / 14, 0, 1));
          }
        }
    if (!this.inside(car.x, car.z) || lakeDistance(car.x, car.z) < 0.965) {
      car.reset(this.safeReset(car));
      car.rescued = true;
    }
  }
}
