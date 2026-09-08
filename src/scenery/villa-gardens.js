import { THREE, mesh, quad, geometryFromTriangles } from "./kit.js";
import { ResortKit } from "./resort-kit.js";
import { placeOnVerge } from "./verge-placement.js";

// Private grounds are attached to houses, never sprinkled across unused land.
// Each plot is reserved before smaller public furniture fills the remaining gaps.
export function buildVillaGardens(S) {
  const w = S.world;
  w.gardens = [];
  S.gardenPaving = [];
  S.gardenTime = { value: 0 };
  S.poolWater = new THREE.MeshPhysicalMaterial({
    color: "#65b6b5",
    roughness: 0.21,
    metalness: 0.12,
    clearcoat: 1,
    clearcoatRoughness: 0.12,
    envMapIntensity: 1.2,
  });
  S.poolWater.onBeforeCompile = (shader) => {
    shader.uniforms.gardenTime = S.gardenTime;
    shader.vertexShader = "varying vec3 vPoolLocal;\n" + shader.vertexShader;
    shader.vertexShader = shader.vertexShader.replace(
      "#include <begin_vertex>",
      "#include <begin_vertex>\nvPoolLocal=position;",
    );
    shader.fragmentShader =
      "uniform float gardenTime; varying vec3 vPoolLocal;\n" +
      shader.fragmentShader;
    shader.fragmentShader = shader.fragmentShader.replace(
      "#include <color_fragment>",
      `#include <color_fragment>
      vec2 p=vPoolLocal.xz;
      float a=sin(p.x*72.0+sin(p.y*51.0+gardenTime*.65));
      float b=sin(p.y*67.0+sin(p.x*47.0-gardenTime*.48));
      float caustic=pow(max(0.0,1.0-abs(a+b)*.65),8.0);
      diffuseColor.rgb *= .87+.13*sin(p.y*3.5);
      diffuseColor.rgb += vec3(.08,.13,.12)*caustic;
      `,
    );
  };
  S.poolWater.customProgramCacheKey = () => "villa-pool-caustics-v1";
  // Continuous tapered pots and individual leaves avoid ball-on-stick topiary.
  S.batch.geometries.estatePot ||= new THREE.LatheGeometry(
    [
      [0.22, 0],
      [0.29, 0.04],
      [0.34, 0.42],
      [0.35, 0.48],
      [0.3, 0.49],
      [0.28, 0.44],
    ].map(([x, y]) => new THREE.Vector2(x, y)),
    20,
  );
  const leaf = new THREE.Shape();
  leaf.moveTo(0, 0);
  leaf.bezierCurveTo(-0.25, 0.25, -0.2, 0.68, 0, 1);
  leaf.bezierCurveTo(0.2, 0.68, 0.25, 0.25, 0, 0);
  const leafGeo = new THREE.ShapeGeometry(leaf, 8);
  const pos = leafGeo.attributes.position;
  for (let i = 0; i < pos.count; i++)
    pos.setZ(i, Math.sin(pos.getY(i) * Math.PI) * 0.18);
  leafGeo.computeVertexNormals();
  S.batch.geometries.estateLeaf ||= leafGeo;
  S.estateLeaves = new THREE.MeshStandardMaterial({
    color: "#4f7057",
    roughness: 0.78,
    side: THREE.DoubleSide,
  });
  const homes = w.buildings.filter(
    (h) => h.variant % 4 === 0 || h.variant % 4 === 3,
  );
  for (const h of homes) {
    const c = Math.cos(h.yaw),
      s = Math.sin(h.yaw),
      road = w.nearestRoad(h.x, h.z);
    const front = -(road.x - h.x) * s + (road.z - h.z) * c >= 0 ? 1 : -1;
    const candidate = (x, z, width, depth, yaw = h.yaw) => {
      return placeOnVerge(
        w,
        {
          x: h.x + x * c - z * s,
          z: h.z + x * s + z * c,
          yaw,
          w: width,
          d: depth,
        },
        h,
      );
    };
    // Broad arrival court: a real opening, stone piers, letterbox and paving.
    for (const d of [5.8, 3.8]) {
      const site = candidate(
        0,
        front * (h.d / 2 + d / 2 + 0.65),
        Math.min(h.w - 1, 12),
        d,
        h.yaw + (front < 0 ? Math.PI : 0),
      );
      if (!site) continue;
      site.kind = "arrival";
      w.gardens.push(site);
      arrival(new ResortKit(S, site), h.seed);
      break;
    }
    // A side garden remains visible from the street, including on the sea side.
    for (const side of [h.seed % 2 ? 1 : -1, h.seed % 2 ? -1 : 1]) {
      let site = candidate(side * (h.w / 2 + 5.6), 0, 10, 10);
      let pool = true;
      if (!site) {
        site = candidate(side * (h.w / 2 + 4.5), 0, 7.8, 6);
        pool = false;
      }
      if (!site) continue;
      site.kind = pool ? (h.seed % 3 === 0 ? "pool" : "terrace") : "lounge";
      w.gardens.push(site);
      const k = new ResortKit(S, site);
      garden(k, site.kind);
      break;
    }
  }
  const paving = S.art.get("paving", "#d4d0be");
  paving.side = THREE.DoubleSide;
  mesh(
    geometryFromTriangles(S.gardenPaving),
    paving,
    S.group,
    [0, 0, 0],
    [0, 0, 0],
    [1, 1, 1],
    false,
  );
  delete S.gardenPaving;
}

function base(k) {
  k.box(k.stone, 0, -0.75, 0, k.site.w, 0.84, k.site.d, true);
  k.box(
    k.S.art.get("paving", "#d4d0be"),
    0,
    0.09,
    0,
    k.site.w - 0.15,
    0.045,
    k.site.d - 0.15,
  );
}
function border(k, x, z, w, d, h = 0.7) {
  k.box(k.stone, x, 0.12, z, w, h, d, true);
  k.box(k.white, x, h + 0.12, z, w + 0.04, 0.055, d + 0.04, true);
  k.solid(x, z, w, d, h + 0.18);
}
function bollard(k, x, z) {
  k.box(k.metal, x, 0.13, z, 0.1, 0.65, 0.1, true);
  k.box("#e9d7a1", x, 0.65, z, 0.115, 0.065, 0.115, true);
}
function plant(k, x, z, scale = 1) {
  k.add("estatePot", k.white, x, 0.14, z, scale, scale, scale);
  for (let j = 0; j < 9; j++) {
    const a = j * 2.39996;
    k.add(
      "estateLeaf",
      k.S.estateLeaves,
      x,
      0.53 * scale,
      z,
      scale * 0.7,
      scale * (0.65 + (j % 3) * 0.18),
      scale,
      [Math.sin(a) * 0.62, a, Math.cos(a) * 0.62],
    );
  }
}
function hedge(k, x, z, width) {
  k.planter(x, z, width);
  for (let j = 0; j < Math.ceil(width / 0.7); j++) {
    const px = x - width / 2 + 0.3 + j * 0.7;
    k.add(
      "foliage" + (j % 3),
      ["#405e47", "#536d50", "#647957"][j % 3],
      px,
      1.16,
      z,
      0.53,
      0.57,
      0.37,
      [0, j * 0.8, 0],
    );
  }
}
function arrival(k, seed) {
  const W = k.site.w,
    D = k.site.d,
    z = D / 2 - 0.3;
  // The open driveway follows physics terrain; no floating slab under wheels.
  const surface = (x, z) => {
    const p = k.p(x, 0, z);
    p[1] = k.w.height(p[0], p[2]) + 0.03;
    return p;
  };
  for (let x = -W / 2; x < W / 2; x += 1.5)
    for (let z = -D / 2; z < D / 2; z += 1.5)
      quad(
        k.S.gardenPaving,
        surface(x, z),
        surface(Math.min(x + 1.5, W / 2), z),
        surface(Math.min(x + 1.5, W / 2), Math.min(z + 1.5, D / 2)),
        surface(x, Math.min(z + 1.5, D / 2)),
      );
  const flank = (W - 3.7) / 2;
  for (const side of [-1, 1]) {
    border(k, side * (1.85 + flank / 2), z, flank, 0.32, 0.85);
    border(k, side * 1.85, z, 0.48, 0.5, 1.46);
    k.box("#f5e5bd", side * 1.85, 1.38, z + 0.27, 0.23, 0.055, 0.025);
    hedge(k, side * (W / 2 - 1.1), -0.7, 1.55);
    bollard(k, side * 1.7, -D / 2 + 0.45);
    // Retracted slatted gate sections preserve a 3.2 metre vehicle opening.
    for (let j = 0; j < 7; j++)
      k.box(
        k.metal,
        side * (2.22 + j * 0.18),
        0.22,
        z - 0.22,
        0.075,
        0.96,
        0.08,
        true,
      );
  }
  k.box(k.metal, -2.52, 0.91, z + 0.2, 0.42, 0.3, 0.1, true);
  k.box("#adb6ad", -2.52, 1.13, z + 0.26, 0.29, 0.025, 0.012);
  k.sign("PALMA / PRIVATE", 2.9, 0.78, z + 0.2, 1.65, 0.28, "#50665e");
  plant(k, -W / 2 + 1, -D / 2 + 0.75, 1.1);
  if (seed % 3 === 0) k.bicycle(W / 2 - 1, -D / 2 + 1.15, "#829fa1");
}
function chaise(k, x, z) {
  k.box(k.wood, x, 0.22, z, 0.8, 0.1, 1.92, true);
  k.add("softSlab", k.fabric, x, 0.38, z + 0.2, 0.73, 0.13, 1.35);
  k.add("softSlab", k.fabric, x, 0.7, z - 0.57, 0.73, 0.12, 0.9, [0.62, 0, 0]);
  for (const zz of [-0.7, 0.7]) {
    k.tube(k.metal, [x - 0.31, 0.14, z + zz], [x - 0.31, 0.29, z + zz], 0.026);
    k.tube(k.metal, [x + 0.31, 0.14, z + zz], [x + 0.31, 0.29, z + zz], 0.026);
  }
  k.add(
    "softSlab",
    "#d4b791",
    x,
    0.96,
    z - 0.75,
    0.53,
    0.16,
    0.24,
    [0.62, 0, 0],
  );
}
function pergola(k, x, z, width, depth) {
  for (const a of [-1, 1])
    for (const b of [-1, 1])
      k.box(
        k.metal,
        x + a * (width / 2 - 0.12),
        0.14,
        z + b * (depth / 2 - 0.12),
        0.1,
        2.65,
        0.1,
      );
  for (const side of [-1, 1])
    k.box(
      k.wood,
      x,
      2.73,
      z + side * (depth / 2 - 0.12),
      width + 0.15,
      0.19,
      0.12,
      true,
    );
  for (let j = 0; j < 11; j++)
    k.box(
      k.wood,
      x - width / 2 + (j * width) / 10,
      2.9,
      z,
      0.085,
      0.09,
      depth + 0.22,
    );
  k.box(k.fabric, x, 2.7, z, width - 0.2, 0.035, depth - 0.1);
}
function sofa(k, x, z) {
  k.box(k.wood, x, 0.22, z, 2.35, 0.17, 0.86, true);
  k.box(k.fabric, x, 0.39, z, 2.22, 0.25, 0.74, true);
  k.box(k.fabric, x, 0.61, z - 0.34, 2.35, 0.48, 0.16, true);
  for (const side of [-1, 1]) {
    k.box(k.wood, x + side * 1.13, 0.42, z, 0.13, 0.33, 0.87, true);
    k.add(
      "softSlab",
      side < 0 ? "#b88e77" : "#85988e",
      x + side * 0.74,
      0.79,
      z - 0.18,
      0.38,
      0.38,
      0.15,
      [0.13, 0, side * 0.12],
    );
  }
}
function garden(k, kind) {
  base(k);
  const W = k.site.w,
    D = k.site.d;
  border(k, 0, -D / 2 + 0.2, W, 0.3, 0.95);
  border(k, -W / 2 + 0.2, 0, 0.3, D, 0.62);
  border(k, W / 2 - 0.2, -D * 0.22, 0.3, D * 0.5, 0.62);
  if (kind === "pool") {
    // Raised basin has a solid tiled floor, coping, water and stainless ladder.
    k.box(
      k.S.art.get("paving", "#4e8d91"),
      -1.45,
      0.14,
      0.25,
      4.8,
      0.34,
      6.3,
      true,
    );
    k.box(k.S.poolWater, -1.45, 0.44, 0.25, 4.34, 0.022, 5.84);
    for (const side of [-1, 1]) {
      k.box(k.white, -1.45 + side * 2.3, 0.46, 0.25, 0.23, 0.095, 6.32, true);
      k.box(k.white, -1.45, 0.46, 0.25 + side * 3.04, 4.6, 0.095, 0.23, true);
    }
    k.solid(-1.45, 0.25, 4.8, 6.3, 0.54);
    for (const x of [-0.4, 0.15]) {
      k.tube("#b5c3c0", [x, 0.25, 2.72], [x, 1.06, 2.72], 0.025);
      k.tube("#b5c3c0", [x, 1.06, 2.72], [x, 1.06, 3.36], 0.025);
      k.tube("#b5c3c0", [x, 1.06, 3.36], [x, 0.5, 3.36], 0.025);
    }
    chaise(k, 2.1, -1.2);
    chaise(k, 3.45, -1.2);
    k.umbrella(2.7, 1.15);
    hedge(k, -1.2, -4.15, 5.5);
    plant(k, 3.85, 3.6, 1.5);
    k.sign("PALMA / POOL", 1.8, 1.15, -4.7, 2.3, 0.32);
  } else {
    pergola(k, 0, -0.5, 5.4, 3.4);
    sofa(k, 0, -1.35);
    k.add("propDisc", k.stone, 0, 0.47, 0.03, 0.66, 0.13, 0.66);
    k.tube(k.metal, [0, 0.14, 0.03], [0, 0.41, 0.03], 0.06);
    plant(k, -2.7, -1.8, 1.35);
    plant(k, 2.7, -1.8, 1.35);
    k.chair(-1.5, 0.65, 1);
    k.chair(1.5, 0.65, 1);
    hedge(k, 0, 2.3, 3.5);
    if (kind === "terrace") {
      // Larger grounds become outdoor living rooms rather than identical pools.
      k.box(k.stone, 0, 0.14, 3.65, 3.7, 0.88, 0.82, true);
      k.box(k.white, 0, 1.02, 3.65, 3.84, 0.095, 0.95, true);
      for (const x of [-1.2, 0, 1.2]) {
        k.box(k.wood, x, 0.26, 4.075, 1.07, 0.66, 0.035, true);
        k.box(k.metal, x, 0.78, 4.1, 0.3, 0.025, 0.045);
      }
      k.box(k.metal, -0.8, 1.13, 3.65, 1.18, 0.24, 0.68, true);
      k.box("#9eafaa", -0.8, 1.37, 3.65, 1.18, 0.045, 0.68, true);
      for (let i = 0; i < 9; i++)
        k.box(k.metal, -1.28 + i * 0.12, 1.42, 3.65, 0.028, 0.012, 0.57);
      k.box("#78918d", 0.85, 1.12, 3.65, 0.73, 0.025, 0.54, true);
      k.tube(k.metal, [0.85, 1.14, 3.35], [0.85, 1.58, 3.35], 0.025);
      k.tube(k.metal, [0.85, 1.58, 3.35], [0.85, 1.58, 3.65], 0.025);
      k.solid(0, 3.65, 3.7, 0.9, 1.12);
      hedge(k, -3.9, 1, 1.0);
      hedge(k, 3.9, 1, 1.0);
      plant(k, -3.8, 3.65, 1.6);
      plant(k, 3.8, 3.65, 1.6);
      chaise(k, 3.55, -2.35);
      for (const x of [-3.7, 3.7]) bollard(k, x, -3.7);
    }
  }
  bollard(k, -W / 2 + 0.75, D / 2 - 0.65);
  bollard(k, W / 2 - 0.75, D / 2 - 0.65);
}
