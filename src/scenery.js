import {
  THREE,
  Batch,
  quad,
  geometryFromTriangles,
  mesh,
  textTexture,
} from "./scene-utils.js";
import { clamp, lerp, rng, distance } from "./math.js";

export class Scenery {
  constructor(scene, world) {
    this.scene = scene;
    this.world = world;
    this.group = new THREE.Group();
    scene.add(this.group);
    this.batch = new Batch(this.group);
    this.dynamic = [];
    this.detail = new THREE.Group();
    this.group.add(this.detail);
    this.buildTerrain();
    this.buildRoads();
    this.buildTown();
    this.buildTrees();
    this.buildLandmarks();
    this.buildCoastalDetails();
    this.batch.finish();
  }
  buildTerrain() {
    const world = this.world,
      pos = [],
      colors = [],
      r = rng(405),
      c = new THREE.Color(),
      step = 5;
    for (let x = -335; x < 235; x += step)
      for (let z = -350; z < 350; z += step) {
        if (!world.inside(x + step / 2, z + step / 2)) continue;
        const vertices = [
          [x, world.height(x, z), z],
          [x, world.height(x, z + step), z + step],
          [x + step, world.height(x + step, z + step), z + step],
          [x + step, world.height(x + step, z), z],
        ];
        quad(pos, ...vertices);
        const h = world.height(x, z);
        c.set(h > 24 ? "#779b78" : "#86ac78");
        c.multiplyScalar(0.965 + r() * 0.065);
        for (let i = 0; i < 6; i++) colors.push(c.r, c.g, c.b);
      }
    const land = mesh(
      geometryFromTriangles(pos, colors),
      new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1 }),
      this.group,
    );
    land.castShadow = false;
    const sand = [],
      cliff = [];
    for (let i = 1; i < world.shore.length; i++) {
      const a = world.shore[i - 1],
        b = world.shore[i],
        outer = (p) => [-50 + (p.x + 50) * 1.055, -0.8, p.z * 1.045],
        inner = (p) => [
          -50 + (p.x + 50) * 0.97,
          Math.max(1.6, world.height(p.x, p.z) - 0.3),
          p.z * 0.97,
        ];
      quad(sand, inner(a), inner(b), outer(b), outer(a));
      const pa = [a.x, world.height(a.x, a.z) - 0.1, a.z],
        pb = [b.x, world.height(b.x, b.z) - 0.1, b.z];
      quad(cliff, pa, pb, [b.x, -0.3, b.z], [a.x, -0.3, a.z]);
    }
    mesh(
      geometryFromTriangles(sand),
      new THREE.MeshStandardMaterial({
        color: "#ecdbb0",
        roughness: 1,
        side: THREE.DoubleSide,
      }),
      this.group,
    ).castShadow = false;
    mesh(
      geometryFromTriangles(cliff),
      new THREE.MeshStandardMaterial({
        color: "#c5b58f",
        roughness: 1,
        flatShading: true,
        side: THREE.DoubleSide,
      }),
      this.group,
    ).castShadow = false;
    this.waterMaterial = new THREE.ShaderMaterial({
      uniforms: {
        time: { value: 0 },
        sunDirection: { value: new THREE.Vector3(-0.4, 0.8, 0.3).normalize() },
      },
      vertexShader: `varying vec3 vWorld; void main(){vec4 p=modelMatrix*vec4(position,1.);vWorld=p.xyz;gl_Position=projectionMatrix*viewMatrix*p;}`,
      fragmentShader: `uniform float time;varying vec3 vWorld;
      void main(){vec2 p=vWorld.xz;float waves=sin(p.x*.15+time*.9)*sin(p.y*.115-time*.65)+.35*sin((p.x+p.y)*.46-time*1.3);float shore=clamp((abs(p.x+50.)-279.)/105.,0.,1.);vec3 nearColor=vec3(.11,.65,.66);vec3 farColor=vec3(.035,.34,.48);float depth=clamp((length(p*vec2(.85,.7))-180.)/400.,0.,1.);vec3 col=mix(nearColor,farColor,depth);col+=waves*.018;float glint=pow(max(0.,sin(p.x*.32+time)*sin(p.y*.51-time*.6)),20.);col+=glint*.13;float dist=length(cameraPosition-vWorld);col=mix(col,vec3(.68,.84,.85),smoothstep(550.,1600.,dist));gl_FragColor=vec4(col,1.); #include <tonemapping_fragment>
      #include <colorspace_fragment>
      }`,
    });
    // Shader chunks need their own lines for GLSL preprocessing.
    this.waterMaterial.fragmentShader =
      this.waterMaterial.fragmentShader.replace("; #include", ";\n#include");
    const water = mesh(
      new THREE.PlaneGeometry(3600, 3600),
      this.waterMaterial,
      this.group,
      [0, -0.9, 0],
      [-Math.PI / 2, 0, 0],
      [1, 1, 1],
      false,
    );
    water.receiveShadow = false;
    const foam = [];
    for (let i = 1; i < world.shore.length; i++) {
      const a = world.shore[i - 1],
        b = world.shore[i],
        p = (v, k) => [-50 + (v.x + 50) * k, -0.77, v.z * k];
      quad(foam, p(a, 1.045), p(b, 1.045), p(b, 1.05), p(a, 1.05));
    }
    mesh(
      geometryFromTriangles(foam),
      new THREE.MeshBasicMaterial({
        color: "#d9f4df",
        transparent: true,
        opacity: 0.5,
        side: THREE.DoubleSide,
        depthWrite: false,
      }),
      this.group,
      [0, 0, 0],
      [0, 0, 0],
      [1, 1, 1],
      false,
    );
    for (const [x, z, s] of [
      [620, -670, 135],
      [-640, -730, 180],
      [830, 270, 120],
    ]) {
      this.batch.add(
        "cone",
        "#8caead",
        [x, -15, z],
        [s, s * 0.45, s * 0.65],
        [0, 0.4, 0],
        false,
      );
      this.batch.add(
        "cone",
        "#9cbabb",
        [x - s * 0.55, -19, z],
        [s * 0.62, s * 0.42, s * 0.44],
        [0, -0.3, 0],
        false,
      );
    }
  }
  buildRoads() {
    const w = this.world,
      asphalt = [],
      shoulder = [],
      markings = [],
      curb = [];
    const surface = (x, z, up = 0.09) => [x, w.height(x, z) + up, z];
    for (const path of w.paths) {
      const p = path.points;
      for (let i = 1; i < p.length; i++) {
        const a = p[i - 1],
          b = p[i],
          before = p[Math.max(0, i - 2)],
          after = p[Math.min(p.length - 1, i + 1)];
        const ta = { x: b.x - before.x, z: b.z - before.z },
          tb = { x: after.x - a.x, z: after.z - a.z };
        let la = Math.hypot(ta.x, ta.z),
          lb = Math.hypot(tb.x, tb.z);
        const na = { x: -ta.z / la, z: ta.x / la },
          nb = { x: -tb.z / lb, z: tb.x / lb };
        const ribbon = (out, offset, width, up) => {
          // Tessellate across the carriageway as well as along it. A single
          // 17-metre quad cut through convex hills and let grass cover the road.
          const slices = Math.max(1, Math.ceil(width / 2.4));
          for (let slice = 0; slice < slices; slice++) {
            const left = offset - width / 2 + (width * slice) / slices;
            const right = offset - width / 2 + (width * (slice + 1)) / slices;
            quad(
              out,
              surface(a.x + na.x * left, a.z + na.z * left, up),
              surface(b.x + nb.x * left, b.z + nb.z * left, up),
              surface(b.x + nb.x * right, b.z + nb.z * right, up),
              surface(a.x + na.x * right, a.z + na.z * right, up),
            );
          }
        };
        const junction = w.isJunction(
          (a.x + b.x) / 2,
          (a.z + b.z) / 2,
          path.id,
          3,
        );
        ribbon(asphalt, 0, path.width, 0.082 + path.id * 0.001);
        if (!junction) {
          for (const side of [-1, 1]) {
            ribbon(shoulder, (path.width / 2 + 0.55) * side, 1.1, 0.08);
            ribbon(markings, (path.width / 2 - 0.48) * side, 0.12, 0.098);
            if ((a.x > 125 && a.z > -90) || (path.id > 0 && a.z > -90))
              ribbon(curb, (path.width / 2 + 1.25) * side, 0.3, 0.12);
          }
          if (i % 6 < 3) ribbon(markings, 0, 0.16, 0.102);
        }
      }
    }
    const noise = document.createElement("canvas");
    noise.width = noise.height = 128;
    const cx = noise.getContext("2d"),
      im = cx.createImageData(128, 128),
      random = rng(91);
    for (let i = 0; i < im.data.length; i += 4) {
      const n = 113 + random() * 24;
      im.data[i] = im.data[i + 1] = im.data[i + 2] = n;
      im.data[i + 3] = 255;
    }
    cx.putImageData(im, 0, 0);
    const tex = new THREE.CanvasTexture(noise);
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(0.65, 0.65);
    tex.colorSpace = THREE.SRGBColorSpace;
    const asphaltGeo = geometryFromTriangles(asphalt),
      uv = [];
    for (let i = 0; i < asphalt.length; i += 3)
      uv.push(asphalt[i], asphalt[i + 2]);
    asphaltGeo.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
    const road = mesh(
      asphaltGeo,
      new THREE.MeshStandardMaterial({
        color: "#667475",
        map: tex,
        roughness: 0.93,
        side: THREE.DoubleSide,
      }),
      this.group,
    );
    road.castShadow = false;
    mesh(
      geometryFromTriangles(shoulder),
      new THREE.MeshStandardMaterial({
        color: "#d4cdb2",
        roughness: 1,
        side: THREE.DoubleSide,
      }),
      this.group,
    ).castShadow = false;
    mesh(
      geometryFromTriangles(markings),
      new THREE.MeshStandardMaterial({
        color: "#f5e9bd",
        roughness: 1,
        side: THREE.DoubleSide,
      }),
      this.group,
    ).castShadow = false;
    mesh(
      geometryFromTriangles(curb),
      new THREE.MeshStandardMaterial({
        color: "#e6dfc6",
        roughness: 0.9,
        side: THREE.DoubleSide,
      }),
      this.group,
    ).castShadow = false;
    for (const r of w.rails) {
      const h = w.height(r.x, r.z);
      this.batch.box("#d5dcd0", r.x, h + 0.58, r.z, 0.17, 0.24, r.d, r.yaw);
      this.batch.box("#788b83", r.x, h, r.z, 0.13, 0.9, 0.18, r.yaw);
    }
    for (let z = 12; z < 212; z += 47)
      for (const x of [-72, -48]) {
        if (w.isJunction(x, z, 0, 5)) continue;
        this.lamp(x, z, x < -60 ? 1 : -1);
      }
    // Zebra crossings and a clear start/finish line are attached to the road plane.
    for (const z of [53, 77, 158, 182])
      for (let i = 0; i < 8; i++)
        this.batch.box(
          "#eee7ca",
          -66.3 + i * 1.8,
          w.height(-60, z) + 0.11,
          z,
          1.05,
          0.012,
          2.4,
          0,
          false,
        );
    for (let row = 0; row < 2; row++)
      for (let col = 0; col < 12; col++)
        this.batch.box(
          (row + col) % 2 ? "#f6f0d5" : "#35464c",
          -67.8 + col * 1.42,
          w.height(-60, 206) + 0.12,
          205.5 + row * 0.85,
          1.42,
          0.013,
          0.85,
          0,
          false,
        );
  }
  lamp(x, z, side = 1) {
    const y = this.world.height(x, z),
      b = this.batch;
    b.box("#455e61", x, y, z, 0.14, 6.2, 0.14);
    b.box("#455e61", x + side * 1.1, y + 6.0, z, 2.3, 0.13, 0.18);
    b.box("#f6e7b8", x + side * 1.9, y + 5.85, z, 0.8, 0.18, 0.44);
  }
  buildTown() {
    const b = this.batch,
      w = this.world,
      windowMat = b.material("#527d81", 0.3),
      roofMat = b.material("#ba795d");
    const signMaterials = [
      "CAFE AZUR",
      "COAST CLUB",
      "PALM HOTEL",
      "ATELIER",
    ].map(
      (t) =>
        new THREE.MeshStandardMaterial({
          map: textTexture(t),
          roughness: 0.85,
        }),
    );
    for (const house of w.buildings) {
      const { x, z, h, variant } = house,
        width = house.w,
        depth = house.d,
        y = w.height(x, z),
        random = rng(house.seed);
      b.box("#dbd7be", x, y - 0.08, z, width + 2.2, 0.28, depth + 2.2);
      b.box(house.color, x, y + 0.2, z, width, h, depth);
      b.box("#f5ecd6", x, y + h + 0.2, z, width + 0.5, 0.3, depth + 0.5);
      b.box("#cfc4a5", x, y + h + 0.51, z, width - 0.7, 0.12, depth - 0.7);
      if (variant === 1 || variant === 3) {
        const roof = new THREE.CylinderGeometry(0, 1, 1, 4, 1);
        roof.rotateY(Math.PI / 4);
        mesh(
          roof,
          roofMat,
          this.group,
          [x, y + h + 1.6, z],
          [0, 0, 0],
          [width * 0.76, 2.4, depth * 0.76],
        );
      } else {
        b.box(
          "#e7dcc1",
          x - width * 0.25,
          y + h + 0.64,
          z - depth * 0.15,
          width * 0.28,
          1.1,
          depth * 0.29,
        );
        b.box(
          "#638983",
          x + width * 0.24,
          y + h + 0.63,
          z + depth * 0.1,
          2,
          0.6,
          2.8,
        );
      }
      const floors = Math.floor(h / 3.8),
        count = Math.floor(width / 3.5);
      for (let floor = 0; floor < floors; floor++)
        for (let k = 0; k < count; k++) {
          const xx = x - width / 2 + 2.1 + k * 3.5,
            yy = y + 1.05 + floor * 3.8;
          for (const side of [-1, 1]) {
            b.box(
              "#f3e7ce",
              xx,
              yy - 0.12,
              z + side * (depth / 2 + 0.075),
              1.64,
              2.45,
              0.13,
              0,
              false,
            );
            b.box(
              windowMat,
              xx,
              yy,
              z + side * (depth / 2 + 0.16),
              1.24,
              2.1,
              0.06,
              0,
              false,
            );
            b.box(
              "#e2d7bd",
              xx,
              yy + 1,
              z + side * (depth / 2 + 0.2),
              1.28,
              0.075,
              0.07,
              0,
              false,
            );
            if (variant === 2 && floor > 0) {
              b.box(
                "#e7d9bc",
                xx,
                yy - 0.18,
                z + side * (depth / 2 + 0.7),
                2.2,
                0.16,
                1.5,
              );
              b.box(
                "#506b68",
                xx,
                yy + 0.1,
                z + side * (depth / 2 + 1.38),
                2.05,
                0.78,
                0.06,
                0,
                false,
              );
            }
          }
        }
      for (let floor = 0; floor < floors; floor++)
        for (let k = 0; k < Math.floor(depth / 4); k++)
          for (const side of [-1, 1]) {
            const zz = z - depth / 2 + 2.2 + k * 4,
              yy = y + 1.1 + floor * 3.8;
            b.box(
              "#f3e7ce",
              x + side * (width / 2 + 0.07),
              yy - 0.1,
              zz,
              0.13,
              2.4,
              1.65,
              0,
              false,
            );
            b.box(
              windowMat,
              x + side * (width / 2 + 0.15),
              yy,
              zz,
              0.06,
              2.05,
              1.25,
              0,
              false,
            );
          }
      if (variant !== 1) {
        const awningColor = variant === 2 ? "#588c83" : "#dba076";
        for (let k = 0; k < 9; k++)
          b.box(
            k % 2 ? "#f3e7d0" : awningColor,
            x - width * 0.36 + k * width * 0.09,
            y + 3.25,
            z + depth / 2 + 0.95,
            width * 0.09,
            0.13,
            2.0,
          );
        b.box(
          awningColor,
          x,
          y + 2.92,
          z + depth / 2 + 1.9,
          width * 0.81,
          0.36,
          0.12,
        );
        const sg = mesh(
          new THREE.PlaneGeometry(width * 0.68, 1.7),
          signMaterials[variant],
          this.group,
          [x, y + 4.6, z + depth / 2 + 0.22],
          [0, 0, 0],
          [1, 1, 1],
          false,
        );
        sg.receiveShadow = false;
      }
      for (const side of [-1, 1]) {
        b.box(
          "#b3ac87",
          x + side * (width / 2 + 1),
          y,
          z + depth / 2 - 2,
          1.1,
          0.7,
          1.1,
        );
        b.add(
          "sphere",
          "#71946b",
          [x + side * (width / 2 + 1), y + 1.1, z + depth / 2 - 2],
          [0.7, 0.8, 0.7],
          [0, 0, 0],
          true,
        );
      }
    }
  }
  buildTrees() {
    const w = this.world,
      b = this.batch,
      leafMats = ["#397d63", "#4c916a", "#579a73"].map((c) => b.material(c));
    const palmGeometries = [];
    for (let k = 0; k < 7; k++) {
      const p = [],
        angle = (k * Math.PI * 2) / 7,
        dx = Math.cos(angle),
        dz = Math.sin(angle),
        nx = -dz,
        nz = dx;
      const frond = (t, side) => {
        const width = Math.pow(Math.sin(t * Math.PI), 0.7) * 0.56;
        const y = Math.sin(t * Math.PI) * 0.8 - t * t * 1.65;
        return [
          dx * t * 4.7 + nx * width * side,
          y - Math.abs(side) * width * 0.24,
          dz * t * 4.7 + nz * width * side,
        ];
      };
      for (let j = 0; j < 6; j++) {
        const a = j / 6,
          c = (j + 1) / 6;
        quad(p, frond(a, -1), frond(c, -1), frond(c, 0), frond(a, 0));
        quad(p, frond(a, 0), frond(c, 0), frond(c, 1), frond(a, 1));
      }
      palmGeometries.push(geometryFromTriangles(p));
      b.geometries["palm" + k] = palmGeometries[k];
    }
    for (const m of leafMats) m.side = THREE.DoubleSide;
    for (const t of w.trees) {
      const y = w.height(t.x, t.z);
      if (t.kind === "palm") {
        b.add(
          "cylinder",
          "#bca07c",
          [t.x, y + t.h * 0.5, t.z],
          [0.24, t.h, 0.24],
          [0, 0, 0.04],
        );
        for (let i = 0; i < 7; i++)
          b.add(
            "palm" + i,
            leafMats[i % 3],
            [t.x, y + t.h, t.z],
            [1, 1, 1],
            [0, t.seed, 0],
          );
        b.add(
          "sphere",
          "#8b8c55",
          [t.x, y + t.h - 0.35, t.z],
          [0.35, 0.4, 0.35],
        );
      } else if (t.kind === "pine") {
        b.add(
          "cylinder",
          "#8d8061",
          [t.x, y + t.h * 0.22, t.z],
          [0.3, t.h * 0.44, 0.3],
        );
        for (let i = 0; i < 3; i++)
          b.add(
            "cone",
            i % 2 ? "#4d8365" : "#44795f",
            [t.x, y + t.h * (0.39 + i * 0.2), t.z],
            [t.h * (0.29 - i * 0.05), t.h * 0.53, t.h * (0.29 - i * 0.05)],
            [0, t.seed, 0],
          );
      } else {
        b.add(
          "cylinder",
          "#9a8968",
          [t.x, y + 1.8, t.z],
          [0.36, 3.6, 0.36],
          [0, 0, 0.09],
        );
        for (let i = 0; i < 3; i++)
          b.add(
            "sphere",
            i % 2 ? "#7e9e72" : "#708f68",
            [
              t.x + Math.sin(i * 2) * 1.2,
              y + 3.6 + i * 0.4,
              t.z + Math.cos(i * 2),
            ],
            [2.3, 1.85, 2.0],
            [0, t.seed, 0],
          );
      }
    }
  }
  buildLandmarks() {
    const w = this.world,
      b = this.batch;
    const x = 221,
      z = 145,
      y = w.height(x, z);
    b.add("cylinder", "#eee7cb", [x, y + 9, z], [3.2, 18, 3.2]);
    b.add("cylinder", "#d48068", [x, y + 10, z], [3.24, 3.1, 3.24]);
    b.add("cylinder", "#f6efdb", [x, y + 18.4, z], [4, 1.0, 4]);
    b.add("cylinder", "#55878b", [x, y + 20.4, z], [2.65, 3.1, 2.65]);
    for (let i = 0; i < 8; i++) {
      const a = (i * Math.PI) / 4;
      b.box(
        "#f0e9d3",
        x + Math.sin(a) * 2.72,
        y + 18.7,
        z + Math.cos(a) * 2.72,
        0.16,
        3.4,
        0.16,
      );
    }
    b.add("cone", "#bc745a", [x, y + 23.5, z], [4.4, 3.2, 4.4]);
    b.box("#dcc7a3", x, y, z, 9, 0.16, 9);
    // Oceanfront promenade, shade umbrellas, a wooden marina and small yachts.
    for (let zz = 15; zz < 122; zz += 24) {
      const xx = 217,
        yy = w.height(xx, zz);
      b.box("#d2bf98", xx, yy, zz, 3.6, 0.14, 1.1);
      b.box("#526f68", xx - 1.25, yy - 0.3, zz, 0.13, 0.5, 0.7);
      b.box("#526f68", xx + 1.25, yy - 0.3, zz, 0.13, 0.5, 0.7);
    }
    for (let i = 0; i < 5; i++) {
      const xx = 224 + i * 1.8,
        zz = 205 + i * 13,
        yy = 0.35;
      b.add("cylinder", "#b5946b", [xx, yy + 1.3, zz], [0.07, 2.6, 0.07]);
      b.add(
        "cone",
        i % 2 ? "#eeb59a" : "#ece3be",
        [xx, yy + 2.65, zz],
        [2.7, 0.9, 2.7],
      );
    }
    b.box("#b89770", 211, 0.1, 277, 43, 0.6, 4);
    for (let i = 0; i < 4; i++) {
      const xx = 196 + i * 10;
      b.box("#c2a17b", xx, 0.1, 285, 2.2, 0.6, 19);
      b.box("#f3edda", xx + 3.6, -0.45, 291, 4, 1.4, 10);
      b.box("#a6c7c3", xx + 3.6, 0.95, 291, 2.8, 1.3, 4.2);
      b.add("cylinder", "#d6d9cb", [xx + 3.6, 5.0, 292], [0.075, 8, 0.075]);
      const sail = [];
      sail.push(xx + 3.6, 9.1, 292, xx + 3.6, 2.8, 292, xx + 7.6, 2.8, 292);
      mesh(
        geometryFromTriangles(sail),
        new THREE.MeshStandardMaterial({
          color: "#f5efd4",
          side: THREE.DoubleSide,
        }),
        this.group,
      );
    }
    const lookout = w.pointAt(w.routeLength * 0.42);
    let site = null;
    for (const radius of [30, 40, 52]) {
      for (let i = 0; i < 16; i++) {
        const angle = (i * Math.PI) / 8,
          x = lookout.x + Math.cos(angle) * radius,
          z = lookout.z + Math.sin(angle) * radius;
        if (w.inside(x, z) && w.nearestRoad(x, z).d > 24) {
          site = { x, z };
          break;
        }
      }
      if (site) break;
    }
    const lx = site?.x ?? lookout.x - 55,
      lz = site?.z ?? lookout.z - 45,
      ly = w.height(lx, lz);
    b.add("cylinder", "#d6c8a3", [lx, ly + 0.15, lz], [9, 0.3, 9]);
    for (let i = 0; i < 7; i++) {
      const a = (i / 7) * Math.PI * 2;
      b.box(
        "#e0cfab",
        lx + Math.cos(a) * 8,
        ly,
        lz + Math.sin(a) * 8,
        0.3,
        1.15,
        0.3,
      );
    }
    const roadSigns = [
      [-40, 155, "海岸 →"],
      [157, 185, "棕榈港 ←"],
      [-83, -112, "松岭山道 ↗"],
    ];
    for (const [sx, sz, label] of roadSigns) {
      const sy = w.height(sx, sz);
      b.box("#54756e", sx, sy, sz, 0.15, 3.7, 0.15);
      mesh(
        new THREE.PlaneGeometry(5, 1.65),
        new THREE.MeshStandardMaterial({
          map: textTexture(label),
          side: THREE.DoubleSide,
        }),
        this.group,
        [sx, sy + 3.2, sz],
      );
    }
  }
  buildCoastalDetails() {
    const b = this.batch,
      w = this.world,
      path = [];
    for (let z = -72; z < 136; z += 4) {
      quad(
        path,
        [210, w.height(210, z) + 0.035, z],
        [210, w.height(210, z + 4) + 0.035, z + 4],
        [214, w.height(214, z + 4) + 0.035, z + 4],
        [214, w.height(214, z) + 0.035, z],
      );
    }
    mesh(
      geometryFromTriangles(path),
      new THREE.MeshStandardMaterial({
        color: "#dacfb0",
        roughness: 1,
        side: THREE.DoubleSide,
      }),
      this.group,
    ).castShadow = false;
    for (let z = -70; z < 130; z += 16) {
      const y = w.height(213, z);
      b.box("#657f72", 213, y, z, 0.09, 1.05, 0.09);
      b.box("#8d9c81", 213, y + 0.85, z + 7.8, 0.09, 0.09, 15.6);
    }
    const random = rng(219);
    // Small coastal rock clusters give the shore a readable scale.
    for (let i = 0; i < 30; i++) {
      const z = -90 + random() * 270,
        x = 225 + random() * 8;
      if (!w.inside(x, z)) continue;
      b.add(
        "sphere",
        i % 2 ? "#b9b397" : "#c6bfa1",
        [x, w.height(x, z) - 0.45, z],
        [1.3 + random() * 1.7, 0.9 + random() * 1.6, 1 + random() * 1.8],
        [0, random() * 6, 0.2],
      );
    }
    const cloudMaterial = new THREE.MeshBasicMaterial({
      color: "#f0f4e5",
      fog: true,
    });
    for (const [x, z, size] of [
      [-300, -620, 1],
      [320, -650, 1.15],
      [670, -230, 0.8],
      [-540, 200, 0.85],
      [490, 470, 1.15],
    ]) {
      for (let i = 0; i < 5; i++)
        b.add(
          "sphere",
          cloudMaterial,
          [x + (i - 2) * 17 * size, 142 + Math.sin(i) * 5, z + Math.cos(i) * 9],
          [25 * size, (9 + (i % 3) * 3) * size, 14 * size],
          [0, 0.2 * i, 0],
          false,
        );
    }
  }
  update(time) {
    this.waterMaterial.uniforms.time.value = time;
  }
  setQuality(low) {
    this.detail.visible = !low;
    for (const mesh of this.batch.meshes)
      if (mesh.userData.optionalDetail) mesh.visible = !low;
  }
}
