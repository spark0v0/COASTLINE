import { THREE } from "./kit.js";
import { ResortKit } from "./resort-kit.js";
import { planResortPlaces } from "../resort-places.js";
import { inScenicCorridor } from "../scenic-route.js";

export function buildResortLife(S) {
  // Authored courtyards and garden entrances own the scenic road frontage.
  S.world.places = planResortPlaces(S.world).filter(
    (site) => !inScenicCorridor(S.world, site.x, site.z),
  );
  for (const site of S.world.places) {
    const k = new ResortKit(S, site);
    k.deck();
    // The raised public deck is scenery; its boundary stops cars entering furniture.
    k.solid(0, 0, site.w, site.d, 0.22);
    if (site.kind === "cafe") cafe(k);
    else if (site.kind === "surf") surf(k);
    else if (site.kind === "market") market(k);
    else if (site.kind === "transit") transit(k);
    else if (site.kind === "service") service(k);
    else overlook(k);
    k.bin(site.w / 2 - 1, site.d / 2 - 1);
    k.planter(-site.w / 2 + 1, site.d / 2 - 0.75, 1.4);
  }
}
function cafe(k) {
  k.pavilion("AZUR / 海风咖啡", "#a4674e");
  for (const x of [-4.8, 0, 4.8]) {
    k.table(x, 2.5);
    if (x !== 0) k.umbrella(x, 2.5);
  }
  // Freestanding menu and a shaded bicycle rack give the frontage a human scale.
  k.box(k.wood, 1.8, 0.16, 4.1, 0.62, 1.04, 0.085, true);
  k.sign("COFFEE / GELATO", 1.8, 0.88, 4.16, 0.52, 0.43);
  for (const x of [-5.2, -3.8])
    k.bicycle(x, -3.3, x < -4 ? "#43838d" : "#b77553");
  k.planter(5.9, -3.5, 1.3);
}
function surf(k) {
  k.pavilion("BLUE BAY / 冲浪租赁", "#467e84");
  // Board outlines have round rails and pointed-looking ends, not upright slabs.
  for (let i = 0; i < 4; i++) {
    const x = -4.95 + i * 0.58;
    k.add(
      "surfboard",
      ["#ddb46d", "#dce2d8", "#6c9da2", "#c78166"][i],
      x,
      1.53,
      0.1,
      0.5,
      1.2,
      0.09,
      [0.1, 0, (i - 1.5) * 0.1],
    );
    k.box("#e8ddbf", x, 1.04, 0.18, 0.045, 1.05, 0.012);
  }
  k.bench(3.8, 2.8);
  k.bicycle(-3.6, 3.7, "#50909a");
  k.tube(k.metal, [-5.5, 0.2, 0.2], [-5.5, 2.5, 0.2], 0.035);
  k.tube(k.metal, [-5.5, 2.5, 0.2], [-5.5, 2.5, 0.8], 0.035);
  k.add("propDisc", k.metal, -5.5, 2.43, 0.8, 0.13, 0.04, 0.13);
  // Lifebuoy and life jackets beside the rental window.
  k.add("propRing", "#d28258", 4.0, 1.42, -0.1, 0.36, 0.36, 0.36);
  for (let i = 0; i < 3; i++)
    k.box("#d7a365", 3.5 + i * 0.48, 1.4, -1.2, 0.34, 0.52, 0.12, true);
  flag(k, 5.25, -3.6, "SURF", "#467e84");
}
function transit(k) {
  // Shelter is open on three sides, with individual supports and slim glazing.
  for (const x of [-3.6, 3.6])
    k.tube(k.metal, [x, 0.16, -1.65], [x, 2.85, -1.65], 0.06);
  k.box(k.white, 0, 2.83, -0.55, 8, 0.16, 3.1, true);
  k.box(k.glass, 0, 0.55, -1.72, 7.2, 2.1, 0.035);
  k.box(k.metal, 0, 0.47, -1.74, 7.3, 0.075, 0.08);
  k.sign("晴湾 / COASTAL LINE", 0, 2.48, -1.67, 4.5, 0.45);
  k.bench(-1.6, -0.85);
  k.bench(1.5, -0.85);
  k.box(k.white, 3.4, 0.3, -0.65, 0.64, 1.95, 0.15, true);
  k.sign("08 / MARINA", 3.4, 1.83, -0.56, 0.53, 0.53);
  for (let i = 0; i < 6; i++)
    k.box("#66848a", 3.4, 1.0 + i * 0.085, -0.55, 0.42, 0.016, 0.015);
  k.tube(k.metal, [-4, 0.16, 1.8], [-4, 3, 1.8], 0.045);
  k.sign("BUS / 08", -4, 2.55, 1.85, 1.0, 0.58, "#477784");
  k.bicycle(2, 1.9, "#bf8660");
}
function market(k) {
  for (let n = 0; n < 3; n++) {
    const x = (n - 1) * 4.7,
      z = -1.2;
    for (const s of [-1, 1]) {
      k.tube(
        k.metal,
        [x + s * 1.75, 0.16, z - 1.15],
        [x + s * 1.75, 2.55, z - 1.15],
        0.035,
      );
      k.tube(
        k.metal,
        [x + s * 1.75, 0.16, z + 1.15],
        [x + s * 1.75, 2.55, z + 1.15],
        0.035,
      );
    }
    k.box(k.fabric, x, 2.55, z, 3.9, 0.14, 2.8, true);
    for (let i = -2; i <= 2; i++)
      k.box(
        n % 2 ? "#a78158" : "#699086",
        x + i * 0.7,
        2.7,
        z,
        0.14,
        0.018,
        2.8,
      );
    k.box(k.wood, x, 0.16, z, 3.4, 0.9, 1.25, true);
    k.sign(
      ["CITRUS / 鲜果", "LOCAL / 手作", "FLOWERS / 花铺"][n],
      x,
      2.21,
      z + 1.19,
      3,
      0.46,
    );
    for (let i = 0; i < 4; i++) {
      k.box(k.wood, x - 1.2 + i * 0.8, 1.06, z, 0.67, 0.19, 0.78);
      for (let j = 0; j < 5; j++) {
        const xx = x - 1.4 + i * 0.8 + (j % 3) * 0.15,
          zz = z - 0.18 + Math.floor(j / 3) * 0.3;
        k.add(
          "sphere",
          n === 2 ? "#c7a4a2" : n === 0 ? "#dfae50" : "#818d54",
          xx,
          1.34,
          zz,
          0.095,
          0.1,
          0.095,
        );
      }
    }
  }
  k.bench(0, 3.4);
  k.planter(-6.7, 3, 1.25);
  k.planter(6.7, 3, 1.25);
}
function service(k) {
  k.pavilion("COAST / 旅行补给", "#5b736f");
  for (let i = 0; i < 2; i++) {
    const x = 3.6 + i * 1.45;
    k.box(k.white, x, 0.16, 2, 0.6, 1.65, 0.48, true);
    k.box(k.metal, x, 1.1, 2.25, 0.43, 0.51, 0.025, true);
    k.sign("EV", x, 1.39, 2.28, 0.3, 0.25);
    const points = [
      new THREE.Vector3(x + 0.32, 1.2, 2.12),
      new THREE.Vector3(x + 0.66, 0.95, 2.1),
      new THREE.Vector3(x + 0.66, 0.39, 2.1),
      new THREE.Vector3(x + 0.2, 0.38, 2.1),
      new THREE.Vector3(x + 0.12, 1.03, 2.15),
    ];
    for (let j = 1; j < points.length; j++)
      k.tube("#243b42", points[j - 1].toArray(), points[j].toArray(), 0.026);
  }
  k.bicycle(-4.1, 1.55, "#b78052");
  k.bicycle(-4.1, 2.7, "#48838b");
  k.bench(0, 3.5);
  k.box(k.white, -5.35, 0.16, 3.45, 0.32, 1.07, 0.32, true);
  k.tube(k.metal, [-5.35, 1.23, 3.45], [-5.35, 1.23, 3.75], 0.035);
  k.sign("WATER", -5.35, 1.55, 3.5, 0.78, 0.28);
}
function overlook(k) {
  const z = -k.site.d / 2 + 0.45;
  for (let i = -5; i <= 5; i++)
    k.tube(k.metal, [i, 0.16, z], [i, 1.18, z], 0.025);
  k.tube(k.wood, [-5.5, 1.19, z], [5.5, 1.19, z], 0.035);
  for (const y of [0.46, 0.74])
    k.tube("#a5b1a8", [-5.5, y, z], [5.5, y, z], 0.012);
  // Pergola frames the view without a solid back wall.
  for (const x of [-4.5, 4.5])
    for (const zz of [-2.4, 0.25]) k.box(k.wood, x, 0.16, zz, 0.15, 2.9, 0.15);
  for (let x = -4.9; x <= 4.9; x += 0.45)
    k.box(k.wood, x, 3.06, -1.05, 0.1, 0.13, 3.2);
  k.bench(-2.8, -1.0);
  k.bench(2.8, -1.0);
  k.tube(k.metal, [0, 0.16, z + 0.7], [0, 1.23, z + 0.7], 0.07);
  k.add("propDisc", k.metal, 0, 1.36, z + 0.57, 0.12, 0.54, 0.12, [
    Math.PI / 2 - 0.18,
    0,
    0,
  ]);
  k.box(k.white, 0, 0.73, 2.4, 2.45, 0.45, 0.28, true);
  k.sign("COASTLINE / 观景地图", 0, 1.05, 2.56, 2.15, 0.45);
  k.planter(-5, 2.6, 1.5);
  k.planter(5, 2.6, 1.5);
}
function flag(k, x, z, label, col) {
  k.tube(k.metal, [x, 0.16, z], [x, 4.35, z], 0.04);
  const key = "flag-" + col;
  if (!k.b.geometries[key]) {
    const geo = new THREE.PlaneGeometry(1.05, 2.1, 6, 5),
      p = geo.attributes.position;
    for (let i = 0; i < p.count; i++)
      p.setZ(i, Math.sin((p.getX(i) + 0.53) * 5) * 0.13);
    geo.computeVertexNormals();
    k.b.geometries[key] = geo;
  }
  const mat = new THREE.MeshStandardMaterial({
    color: col,
    roughness: 0.94,
    side: THREE.DoubleSide,
  });
  k.add(key, mat, x + 0.53, 3.15, z, 1, 1, 1);
  k.sign(label, x + 0.53, 3.13, z + 0.15, 0.8, 0.3, col);
}
