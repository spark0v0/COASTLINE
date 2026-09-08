import { THREE } from "./kit.js";
import { ResortKit } from "./resort-kit.js";
import { placeOnVerge } from "./verge-placement.js";

const THEMES = [
  { kind: "tennis", name: "棕榈网球俱乐部", w: 21, d: 34, max: 5 },
  { kind: "orchard", name: "晴湾柑橘园", w: 23, d: 19, max: 9 },
  { kind: "allotment", name: "四季社区花圃", w: 20, d: 16, max: 9 },
  { kind: "park", name: "海风雕塑花园", w: 24, d: 20, max: 7 },
];

// Occupied space behind the road frontage, not another row of pavement props.
export function buildOpenSpaces(S) {
  const w = S.world;
  w.openSpaces = [];
  const counts = Object.fromEntries(THEMES.map((t) => [t.kind, 0]));
  const candidates = [];
  for (const path of w.paths) {
    if (/镜湖/.test(path.name)) continue;
    for (let i = 28; i < path.points.length - 2; i += 37) {
      const p = path.points[i],
        q = path.points[i + 1];
      if (p.z < -350 || p.z > 910) continue;
      candidates.push({ p, path, yaw: Math.atan2(q.z - p.z, q.x - p.x) });
    }
  }
  // A deterministic shuffle spreads the limited budget across different roads.
  candidates.sort((a, b) => score(a.p) - score(b.p));
  function score(p) {
    return (Math.sin(p.x * 12.9898 + p.z * 78.233) * 43758.5453) % 1;
  }
  prepareNet(S);
  for (const { p, path, yaw } of candidates) {
    if (w.openSpaces.length >= 30) break;
    if (w.openSpaces.some((s) => Math.hypot(s.x - p.x, s.z - p.z) < 95))
      continue;
    const choices = [...THEMES].sort(
      (a, b) => counts[a.kind] / a.max - counts[b.kind] / b.max,
    );
    let placed = false;
    for (const theme of choices) {
      if (counts[theme.kind] >= theme.max) continue;
      for (const offset of [36, 57, 82]) {
        for (const side of [1, -1]) {
          const site = placeOnVerge(w, {
            x: p.x - Math.sin(yaw) * (path.width / 2 + offset) * side,
            z: p.z + Math.cos(yaw) * (path.width / 2 + offset) * side,
            yaw: yaw + (side === 1 ? Math.PI : 0),
            w: theme.w,
            d: theme.d,
          });
          if (
            !site ||
            w.openSpaces.some(
              (s) => Math.hypot(s.x - site.x, s.z - site.z) < 85,
            )
          )
            continue;
          Object.assign(site, {
            kind: theme.kind,
            name: theme.name + " · " + (counts[theme.kind] + 1),
          });
          w.openSpaces.push(site);
          counts[theme.kind]++;
          const k = new ResortKit(S, site);
          if (theme.kind === "tennis") tennis(k);
          else if (theme.kind === "orchard") orchard(k);
          else if (theme.kind === "allotment") allotment(k);
          else park(k);
          placed = true;
          break;
        }
        if (placed) break;
      }
      if (placed) break;
    }
  }
}
function prepareNet(S) {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = 64;
  const c = canvas.getContext("2d");
  c.clearRect(0, 0, 64, 64);
  c.fillStyle = "#ced5c6";
  for (let i = 0; i < 64; i += 8) {
    c.fillRect(i, 0, 1.3, 64);
    c.fillRect(0, i, 64, 1.3);
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(8, 1);
  S.courtNet = new THREE.MeshStandardMaterial({
    map: tex,
    color: "#788c80",
    alphaTest: 0.35,
    side: THREE.DoubleSide,
    roughness: 1,
  });
}
function ground(k, mat) {
  // Raised scenic areas are explicitly bounded so cars cannot clip the surface.
  k.box(k.stone, 0, -0.72, 0, k.site.w, 0.78, k.site.d, true);
  k.box(mat, 0, 0.06, 0, k.site.w - 0.2, 0.045, k.site.d - 0.2);
  k.solid(0, 0, k.site.w, k.site.d, 0.12);
}
function gate(k, label) {
  const z = k.site.d / 2 - 0.6;
  for (const x of [-2.1, 2.1]) {
    k.box(k.stone, x, 0.12, z, 0.34, 1.55, 0.34, true);
    k.planter(x + Math.sign(x) * 1.5, z, 1.6);
  }
  k.sign(label, 3.5, 1.26, z + 0.1, 2.1, 0.48, "#586d61");
}
function hedge(k, x, z, len) {
  k.box(k.stone, x, 0.12, z, len, 0.26, 0.8, true);
  for (let i = 0; i < Math.ceil(len / 0.8); i++)
    k.add(
      "foliage" + (i % 3),
      ["#46624c", "#617650", "#74805d"][i % 3],
      x - len / 2 + 0.4 + i * 0.8,
      0.75,
      z,
      0.58,
      0.5,
      0.48,
      [0, i * 0.73, 0],
    );
}
function pergola(k, x, z, w = 5, d = 3.5) {
  for (const a of [-1, 1])
    for (const b of [-1, 1])
      k.box(
        k.wood,
        x + a * (w / 2 - 0.1),
        0.12,
        z + b * (d / 2 - 0.1),
        0.13,
        2.75,
        0.13,
      );
  for (const b of [-1, 1])
    k.box(k.wood, x, 2.82, z + b * (d / 2 - 0.1), w + 0.3, 0.17, 0.16);
  for (let i = 0; i < 13; i++)
    k.box(k.wood, x - w / 2 + (i * w) / 12, 3.0, z, 0.09, 0.08, d + 0.25);
}
function tennis(k) {
  ground(k, "#8c9d82");
  k.box("#668d89", 0, 0.11, 0, 12.8, 0.018, 26.3);
  const line = (x, z, w, d) => k.box("#ecebdd", x, 0.131, z, w, 0.008, d);
  for (const x of [-5.485, 5.485]) line(x, 0, 0.06, 23.77);
  for (const z of [-11.885, 11.885]) line(0, z, 10.97, 0.06);
  for (const x of [-4.115, 4.115]) line(x, 0, 0.05, 23.77);
  for (const z of [-6.4, 6.4]) line(0, z, 8.23, 0.05);
  line(0, 0, 0.05, 12.8);
  for (const x of [-6.1, 6.1]) k.box(k.metal, x, 0.13, 0, 0.08, 1.06, 0.08);
  k.add("plane", k.S.courtNet, 0, 0.65, 0, 12.2, 1.0, 1, [0, 0, 0], false);
  k.box("#e0daca", 0, 1.13, 0, 12.2, 0.045, 0.03);
  // Backstop and side fencing: open mesh, slender uprights, framed corners.
  for (const x of [-9.7, 9.7]) {
    for (let z = -15.6; z <= 15.6; z += 5.2)
      k.box(k.metal, x, 0.13, z, 0.065, 3.1, 0.065);
    k.add(
      "plane",
      k.S.courtNet,
      x,
      1.68,
      0,
      31.2,
      3.1,
      1,
      [0, Math.PI / 2, 0],
      false,
    );
    k.box(k.metal, x, 3.21, 0, 0.05, 0.05, 31.2);
  }
  k.add("plane", k.S.courtNet, 0, 1.68, -15.6, 19.4, 3.1, 1, [0, 0, 0], false);
  k.box(k.metal, 0, 3.21, -15.6, 19.4, 0.05, 0.05);
  k.bench(-7.75, 6.4);
  k.bench(7.75, -6.4);
  k.bin(-8.1, 13.7);
  k.sign("PALMA / TENNIS", 0, 1.0, 16.1, 3.8, 0.5);
}
function orchard(k) {
  ground(k, k.S.art.get("grass", "#7d8865"));
  k.box(k.S.art.get("paving", "#c4b598"), 0, 0.11, 0, 2.0, 0.022, 18.5);
  for (const x of [-7.7, -3.8, 3.8, 7.7])
    for (const z of [-5.5, 0, 5.5]) {
      k.add("propDisc", "#918571", x, 0.14, z, 1.1, 0.04, 1.1);
      k.tube(k.wood, [x, 0.15, z], [x + 0.13, 2.2, z], 0.09);
      for (let j = 0; j < 3; j++) {
        const a = j * 2.4;
        k.add(
          "treeCrown" + j,
          k.S.treeLeafMaterials[j],
          x + Math.cos(a) * 0.52,
          2.65,
          z + Math.sin(a) * 0.52,
          1.0,
          1.08,
          0.95,
          [0, a, 0],
        );
      }
      for (let j = 0; j < 7; j++) {
        const a = j * 2.39996;
        k.add(
          "sphere",
          j % 2 ? "#d0a052" : "#bc873d",
          x + Math.cos(a) * 1.04,
          2.25 + Math.sin(j * 2) * 0.48,
          z + Math.sin(a) * 1.04,
          0.095,
          0.095,
          0.095,
        );
      }
    }
  pergola(k, 0, -7.2, 4.5, 2.0);
  k.bench(0, -7.1);
  for (let i = 0; i < 3; i++) {
    k.box(k.wood, 2.4 + i * 0.65, 0.12, -7.3, 0.52, 0.42, 0.6, true);
    for (let j = 0; j < 4; j++)
      k.add(
        "sphere",
        "#cfa15a",
        2.25 + i * 0.65 + j * 0.095,
        0.59,
        -7.3,
        0.09,
        0.09,
        0.09,
      );
  }
  gate(k, "CITRUS / 柑橘园");
}
function allotment(k) {
  ground(k, k.S.art.get("paving", "#b6b095"));
  for (const x of [-5.8, 0, 5.8])
    for (const z of [-3.8, 1.1]) {
      k.box(k.wood, x, 0.12, z, 3.8, 0.38, 2.5, true);
      k.box("#716653", x, 0.51, z, 3.5, 0.025, 2.2);
      for (let a = 0; a < 5; a++)
        for (let b = 0; b < 3; b++) {
          const xx = x - 1.35 + a * 0.67,
            zz = z - 0.7 + b * 0.7;
          k.add(
            "foliage" + b,
            ["#718256", "#888f61", "#526e55"][a % 3],
            xx,
            0.72,
            zz,
            0.34,
            0.24,
            0.3,
          );
          if ((a + b) % 2 === 0)
            k.add(
              "sphere",
              ["#bda3a4", "#cabb8b", "#b18791"][a % 3],
              xx,
              0.99,
              zz,
              0.095,
              0.11,
              0.095,
            );
        }
    }
  // Open potting shelter, trellises and a workbench.
  pergola(k, 0, -6.05, 5.4, 2.4);
  k.box(k.wood, 0, 0.12, -6.05, 2.8, 0.81, 0.72, true);
  for (const x of [-8, 8]) {
    for (let j = 0; j < 6; j++)
      k.box(k.wood, x, 0.15, -4 + j * 0.9, 0.055, 2.05, 0.055);
    for (const y of [0.9, 1.7]) k.box(k.wood, x, y, -1.75, 0.055, 0.055, 5.5);
  }
  gate(k, "GARDEN / 四季花圃");
}
function park(k) {
  ground(k, k.S.art.get("grass", "#89936d"));
  k.box(k.S.art.get("paving", "#c7c3b0"), 0, 0.11, 0, 3.2, 0.025, 19.5);
  k.add("propDisc", k.stone, 0, 0.17, -3.2, 3.1, 0.13, 3.1);
  k.box(k.white, 0, 0.24, -3.2, 1.5, 0.48, 1.5, true);
  // Twin bronze loops provide a recognizable, taller focal point.
  k.add(
    "propRing",
    "#9f977c",
    0,
    2.42,
    -3.2,
    1.75,
    1.75,
    1.75,
    [0.2, 0.45, 0.3],
  );
  k.add(
    "propRing",
    "#6b8b89",
    0,
    2.42,
    -3.2,
    1.7,
    1.7,
    1.7,
    [0.2, -0.85, -0.3],
  );
  for (const x of [-6.8, 6.8]) {
    pergola(k, x, 3.2, 5.2, 4.1);
    k.table(x, 3.1);
    k.bench(x, -3.4);
    hedge(k, x, -7.7, 6.6);
  }
  k.umbrella(-6.8, 3.1);
  for (const x of [-9.5, 9.5])
    for (const z of [-6.4, 6.4]) {
      k.planter(x, z, 1.35);
      k.bicycle(x - Math.sign(x) * 1.0, z, "#899e93");
    }
  gate(k, "SCULPTURE / 海风花园");
}
