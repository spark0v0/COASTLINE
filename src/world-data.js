import {
  clamp,
  lerp,
  distance,
  smooth,
  segmentPoint,
  rng,
  angleDiff,
} from "./math.js";
const point = (x, z) => ({ x, z });

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
    const nodes = [
      [-60, 206],
      [-60, 110],
      [-60, -25],
      [-66, -114],
      [-109, -160],
      [-171, -182],
      [-224, -226],
      [-207, -283],
      [-140, -294],
      [-82, -242],
      [-29, -278],
      [40, -303],
      [113, -273],
      [157, -211],
      [182, -123],
      [192, -20],
      [192, 102],
      [174, 210],
      [118, 257],
      [27, 258],
      [-60, 230],
    ];
    this.route = this.curve(
      nodes.map((p) => point(...p)),
      true,
    );
    this.addPath(this.route, 17, "环岛公路");
    this.addPath([point(-170, 233), point(122, 233)], 16, "港湾大道");
    for (const x of [-170, 60])
      this.addPath([point(x, 233), point(x, -40)], 15, "城市街道");
    for (const z of [-40, 65, 170])
      this.addPath([point(-170, z), point(192, z)], 15, "城市街道");
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
    this.checkpoints = Array.from({ length: 16 }, (_, i) => ({
      ...this.pointAt((this.routeLength * (i + 1)) / 16),
      radius: 10.8,
    }));
    this.start = this.pointAt(0);
    this.spawn = { ...this.pointAt(this.routeLength * 0.778) };
    this.shore = Array.from({ length: 129 }, (_, i) => {
      const a = (i / 128) * Math.PI * 2,
        c = Math.cos(a),
        s = Math.sin(a);
      return point(
        -50 + 285 * Math.sign(c) * Math.abs(c) ** 0.28,
        350 * Math.sign(s) * Math.abs(s) ** 0.28,
      );
    });
    this.generateProps();
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
    return (
      2 +
      (46 *
        Math.exp(-Math.pow((x + 191) / 137, 2) - Math.pow((z + 239) / 118, 2)) +
        26 *
          Math.exp(
            -Math.pow((x - 24) / 112, 2) - Math.pow((z + 308) / 84, 2),
          )) *
        smooth(15, -115, z)
    );
  }
  inside(x, z) {
    return (
      (Math.abs(x + 50) / 285) ** (1 / 0.28) +
        (Math.abs(z) / 350) ** (1 / 0.28) <
      1
    );
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
    return z < -135 || x < -205 ? "松岭山道" : x > 130 ? "晴湾海岸" : "棕榈港";
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
    const random = rng(14071),
      palette = [
        "#efc58f",
        "#e8d8b6",
        "#edb0a0",
        "#cfdfd0",
        "#f0e6d0",
        "#dca07e",
      ];
    for (let x = -195; x < 132; x += 32)
      for (let z = -74; z < 221; z += 35) {
        const px = x + (random() - 0.5) * 5,
          pz = z + (random() - 0.5) * 5,
          w = 14 + random() * 6,
          d = 13 + random() * 7,
          r = this.nearestRoad(px, pz);
        if (r.d < Math.max(w, d) * 0.66 + r.width / 2 + 5) continue;
        const h = 7 + Math.floor(random() * 4) * 3.8,
          b = {
            type: "box",
            x: px,
            z: pz,
            w,
            d,
            h,
            yaw: 0,
            color: palette[Math.floor(random() * palette.length)],
            variant: Math.floor(random() * 4),
            seed: Math.floor(random() * 100000),
          };
        this.buildings.push(b);
        this.register(b);
      }
    for (const [x, z, h] of [
      [112, 118, 31],
      [-123, 116, 23],
      [-113, -80, 18],
    ]) {
      const b = {
        type: "box",
        x,
        z,
        w: 18,
        d: 19,
        h,
        yaw: 0,
        color: "#ead4b1",
        variant: 2,
        seed: 415,
      };
      this.buildings.push(b);
      this.register(b);
    }
    for (let i = 0; i < 330; i++) {
      const x = -320 + random() * 540,
        z = -326 + random() * 643;
      if (!this.inside(x, z)) continue;
      const road = this.nearestRoad(x, z);
      if (road.d < road.width / 2 + 4.5) continue;
      if (
        this.buildings.some(
          (b) =>
            Math.abs(x - b.x) < b.w / 2 + 5 && Math.abs(z - b.z) < b.d / 2 + 5,
        )
      )
        continue;
      const kind =
          z < -110 || x < -210
            ? "pine"
            : x > 130 || random() > 0.4
              ? "palm"
              : "olive",
        h =
          kind === "palm"
            ? 7 + random() * 5
            : kind === "pine"
              ? 7 + random() * 7
              : 4 + random() * 3;
      this.trees.push({ x, z, h, kind, seed: random() * 6.28 });
      this.register({ type: "circle", x, z, r: kind === "palm" ? 0.35 : 0.55 });
    }
    for (let z = -10; z < 225; z += 34)
      for (const x of [-74, -46]) {
        if (this.isJunction(x, z, 0, 3)) continue;
        this.trees.push({ x, z, h: 9, kind: "palm", seed: z });
        this.register({ type: "circle", x, z, r: 0.35 });
      }
    for (let z = -86; z < 186; z += 29) {
      const p = this.nearestRoad(192, z);
      const x = p.x + 15;
      if (this.isJunction(x, z, 0, 5)) continue;
      this.trees.push({ x, z, h: 10 + (z % 3), kind: "palm", seed: z });
      this.register({ type: "circle", x, z, r: 0.35 });
    }
    for (const road of this.roads) {
      if (road.id !== 0 || road.index % 2 !== 0) continue;
      const a = road.a,
        b = road.b,
        dx = b.x - a.x,
        dz = b.z - a.z,
        len = distance(a, b),
        mx = (a.x + b.x) / 2,
        mz = (a.z + b.z) / 2,
        nx = -dz / len,
        nz = dx / len;
      if (mz > -142 && mx < 159) continue;
      for (const side of [-1, 1]) {
        const x = mx + nx * (road.width / 2 + 1.2) * side,
          z = mz + nz * (road.width / 2 + 1.2) * side;
        if (this.isJunction(x, z, 0, 7)) continue;
        const rail = {
          type: "box",
          x,
          z,
          w: 0.45,
          d: len * 2 + 0.15,
          yaw: Math.atan2(-dx, dz),
          h: 1.0,
        };
        this.rails.push(rail);
        this.register(rail);
      }
    }
    this.register({ type: "circle", x: 221, z: 145, r: 4 });
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
    if (!this.inside(car.x, car.z)) {
      car.reset(this.safeReset(car));
      car.rescued = true;
    }
  }
}
