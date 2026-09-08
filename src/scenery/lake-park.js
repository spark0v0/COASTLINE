import { THREE, mesh, quad, geometryFromTriangles, rng } from "./kit.js";
import { CENTRAL_LAKE as L, lakePoint } from "../lake-data.js";
import { ResortKit } from "./resort-kit.js";
import { SUN_DIRECTION } from "../daylight.js";

export function buildLakePark(S) {
  const b = S.batch,
    w = S.world,
    random = rng(7419),
    shore = w.lake.shore;
  const waterPositions = [],
    uv = [];
  for (let i = 1; i < shore.length; i++) {
    const a = shore[i - 1],
      c = shore[i];
    waterPositions.push(
      L.x,
      L.level,
      L.z,
      a.x,
      L.level,
      a.z,
      c.x,
      L.level,
      c.z,
    );
    uv.push(
      0,
      0,
      (a.x - L.x) / L.rx,
      (a.z - L.z) / L.rz,
      (c.x - L.x) / L.rx,
      (c.z - L.z) / L.rz,
    );
  }
  const geo = geometryFromTriangles(waterPositions);
  geo.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
  S.lakeMaterial = new THREE.ShaderMaterial({
    uniforms: { time: { value: 0 }, sunDirection: { value: SUN_DIRECTION } },
    side: THREE.DoubleSide,
    vertexShader:
      "varying vec2 vUv;varying vec3 vWorld;void main(){vUv=uv;vWorld=(modelMatrix*vec4(position,1.)).xyz;gl_Position=projectionMatrix*viewMatrix*vec4(vWorld,1.);}",
    fragmentShader: `uniform float time;uniform vec3 sunDirection;varying vec2 vUv;varying vec3 vWorld;
      void main(){
        float edge=length(vUv);
        vec3 col=mix(vec3(.025,.20,.235),vec3(.105,.37,.32),smoothstep(.50,1.,edge));
        float a=sin(vWorld.x*.34+time*.82+sin(vWorld.z*.2));
        float b=cos(vWorld.z*.29-time*.57);
        vec3 n=normalize(vec3(a*.035,1.,b*.035));
        vec3 v=normalize(cameraPosition-vWorld),sun=sunDirection;
        float fresnel=pow(1.-max(dot(n,v),0.),3.);
        col=mix(col,vec3(.37,.55,.64),fresnel*.55);
        col+=pow(max(dot(n,normalize(sun+v)),0.),180.)*.6;
        col+=(a+b)*.003;
        col=mix(col,vec3(.48,.61,.67),smoothstep(700.,1800.,length(cameraPosition-vWorld)));
        gl_FragColor=vec4(col,1.);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`,
  });
  mesh(geo, S.lakeMaterial, S.group, [0, 0, 0], [0, 0, 0], [1, 1, 1], false);
  // Boardwalk on the bank: varying edge follows the actual lake silhouette.
  const deck = [],
    verge = [];
  for (let i = 1; i <= 128; i++) {
    const a = ((i - 1) / 128) * Math.PI * 2,
      c = (i / 128) * Math.PI * 2;
    const p = (t, r) => {
      const q = lakePoint(t, r);
      return [q.x, w.height(q.x, q.z) + 0.12, q.z];
    };
    quad(deck, p(a, 1.064), p(c, 1.064), p(c, 1.1), p(a, 1.1));
    quad(verge, p(a, 1.1), p(c, 1.1), p(c, 1.16), p(a, 1.16));
  }
  mesh(
    geometryFromTriangles(deck),
    S.art.get("wood", "#a99373"),
    S.group,
    [0, 0, 0],
    [0, 0, 0],
    [1, 1, 1],
    false,
  );
  mesh(
    geometryFromTriangles(verge),
    S.art.get("limestone", "#bdbba8"),
    S.group,
    [0, 0, 0],
    [0, 0, 0],
    [1, 1, 1],
    false,
  );
  // Rest areas sit on the landward edge, facing the fountain.
  for (let n = 0; n < 6; n++) {
    const a = 0.36 + (n * Math.PI) / 3,
      p = lakePoint(a, 1.14);
    const site = {
      x: p.x,
      z: p.z,
      y: w.height(p.x, p.z),
      yaw: Math.PI / 2 + a,
    };
    const k = new ResortKit(S, site);
    k.bench(0, 0);
    k.bin(2, 0);
    k.planter(-2.2, 0, 1.3);
    const q = lakePoint(a + 0.065, 1.145);
    b.add(
      "propPole",
      k.metal,
      [q.x, w.height(q.x, q.z) + 2.0, q.z],
      [0.045, 4, 0.045],
    );
    b.add(
      "propDisc",
      k.white,
      [q.x, w.height(q.x, q.z) + 4, q.z],
      [0.4, 0.1, 0.4],
    );
  }
  for (let n = 0; n < 3; n++) {
    const a = 1.1 + n * 2.05,
      p = lakePoint(a, 1.49);
    const k = new ResortKit(S, {
      x: p.x,
      z: p.z,
      y: w.height(p.x, p.z),
      yaw: a + Math.PI / 2,
      w: 10,
      d: 7,
    });
    k.deck();
    k.solid(0, 0, 10, 7, 0.25);
    for (const x of [-4, 4])
      for (const z of [-2.4, 2.4]) k.box(k.wood, x, 0.16, z, 0.16, 3.15, 0.16);
    for (let x = -4.5; x <= 4.5; x += 0.5)
      k.box(k.wood, x, 3.32, 0, 0.12, 0.15, 5.8);
    k.box(k.white, 0, 3.15, -2.55, 9.3, 0.16, 0.22, true);
    k.box(k.white, 0, 3.15, 2.55, 9.3, 0.16, 0.22, true);
    k.table(-2, 0);
    k.table(2, 0);
    k.sign("镜湖 / LAKESIDE", 0, 2.7, 2.56, 3, 0.48);
  }
  // Curated groves and reed beds; park roads keep their clear width.
  for (let i = 0; i < 88; i++) {
    const a = i * 2.39996,
      p = lakePoint(a, 1.38 + random() * 0.2);
    const road = w.nearestRoad(p.x, p.z);
    if (road.d < road.width / 2 + 4) continue;
    const nearby = new Set();
    for (
      let x = Math.floor((p.x - 5) / 24);
      x <= Math.floor((p.x + 5) / 24);
      x++
    )
      for (
        let z = Math.floor((p.z - 5) / 24);
        z <= Math.floor((p.z + 5) / 24);
        z++
      )
        for (const o of w.grid.get(x + "," + z) || []) nearby.add(o);
    if (
      [...nearby].some(
        (o) =>
          Math.hypot(p.x - o.x, p.z - o.z) <
          3 + (o.r || Math.hypot(o.w, o.d) / 2),
      )
    )
      continue;
    const y = w.height(p.x, p.z),
      h = 3.7 + random() * 2.7;
    b.add(
      "propPole",
      S.art.get("wood", "#887860"),
      [p.x, y + h * 0.42, p.z],
      [0.14, h * 0.84, 0.14],
    );
    for (let j = 0; j < 4; j++) {
      const a = j * 2.4 + i,
        x = p.x + Math.cos(a) * 1.4,
        z = p.z + Math.sin(a) * 1.4;
      b.add(
        "foliage" + (j % 3),
        i % 13 === 0 ? "#b59788" : ["#506a48", "#6c8256", "#849465"][j % 3],
        [x, y + h - 0.4 + (j % 2) * 0.6, z],
        [2.15, 1.25, 1.9],
        [0, a, 0],
      );
    }
    w.register({ type: "circle", x: p.x, z: p.z, r: 0.25 });
  }
  const reed = [];
  for (let i = 0; i < 9; i++) {
    const x = (random() - 0.5) * 1.8,
      z = (random() - 0.5) * 1.8,
      h = 0.6 + random() * 0.8;
    reed.push(x - 0.025, 0, z, x + 0.025, 0, z, x + 0.13, h, z + 0.12);
    reed.push(x, 0, z - 0.025, x, 0, z + 0.025, x - 0.08, h * 0.83, z + 0.18);
  }
  b.geometries.lakeReeds = geometryFromTriangles(reed);
  const reedMat = new THREE.MeshStandardMaterial({
    color: "#6d8050",
    roughness: 1,
    side: THREE.DoubleSide,
  });
  for (let i = 0; i < 70; i++) {
    const p = lakePoint(i * 2.4, 0.968 + random() * 0.018),
      y = w.height(p.x, p.z);
    b.add(
      "lakeReeds",
      reedMat,
      [p.x, Math.max(y, L.level - 0.2), p.z],
      [1, 1, 1],
      [0, i, 0],
      false,
    );
  }
  for (let i = 0; i < 28; i++) {
    const p = lakePoint(0.6 + i * 0.028, 0.72 + random() * 0.13);
    b.add(
      "propDisc",
      "#708955",
      [p.x, L.level + 0.016, p.z],
      [0.45, 0.025, 0.32],
      [0, i, 0],
      false,
    );
  }
  const entry = lakePoint(0, 1.28);
  const marker = new ResortKit(S, {
    x: entry.x + 27,
    z: entry.z + 10,
    y: w.height(entry.x + 27, entry.z + 10),
    yaw: Math.PI / 2,
  });
  marker.box(marker.stone, 0, 0, 0, 0.42, 3.0, 3.0, true);
  marker.sign("镜湖公园 / LAKE PARK", 0, 2.18, 0.22, 3.0, 0.63);
  buildFountain(S);
}

function buildFountain(S) {
  const origin = new THREE.Vector3(L.x, L.level + 0.06, L.z);
  S.fountain = new THREE.Group();
  S.fountain.position.copy(origin);
  S.group.add(S.fountain);
  const water = new THREE.MeshStandardMaterial({
    color: "#c9e9e6",
    roughness: 0.18,
    transparent: true,
    opacity: 0.53,
    depthWrite: false,
  });
  for (let i = 0; i < 9; i++) {
    const a = (i / 8) * Math.PI * 2,
      points = [];
    for (let j = 0; j <= 20; j++) {
      const t = j / 20,
        r = i === 8 ? t * 0.28 : t * 8.5;
      points.push(
        new THREE.Vector3(
          Math.cos(a) * r,
          (i === 8 ? 18 : 10) * t * (1 - t) * 4,
          Math.sin(a) * r,
        ),
      );
    }
    mesh(
      new THREE.TubeGeometry(
        new THREE.CatmullRomCurve3(points),
        36,
        i === 8 ? 0.12 : 0.045,
        5,
        false,
      ),
      water,
      S.fountain,
      [0, 0, 0],
      [0, 0, 0],
      [1, 1, 1],
      false,
    );
  }
  const count = 240,
    data = new Float32Array(count * 3);
  for (let i = 0; i < count; i++)
    data.set([i / count, Math.floor(i % 9), (i * 0.618) % 1], i * 3);
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.BufferAttribute(data, 3));
  S.fountainMaterial = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    uniforms: { time: { value: 0 } },
    vertexShader: `uniform float time;varying float fade;void main(){
      float t=fract(position.x+time*.24),a=position.y/8.*6.283185;
      float r=position.y>7.5?t*.28:t*8.5;
      float h=(position.y>7.5?18.:10.)*t*(1.-t)*4.;
      vec3 p=vec3(cos(a)*r,h,sin(a)*r);
      vec4 mv=modelViewMatrix*vec4(p,1.);
      gl_Position=projectionMatrix*mv;gl_PointSize=clamp(180./max(-mv.z,1.),1.,5.);
      fade=sin(t*3.14159)*.65;
    }`,
    fragmentShader:
      "varying float fade;void main(){float a=1.-smoothstep(.08,.5,length(gl_PointCoord-.5));gl_FragColor=vec4(.85,.97,1.,a*fade);\n#include <tonemapping_fragment>\n#include <colorspace_fragment>\n}",
  });
  const droplets = new THREE.Points(geo, S.fountainMaterial);
  droplets.frustumCulled = false;
  S.fountain.add(droplets);
  S.fountainDrops = geo;
}
