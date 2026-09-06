import { Scenery } from "./scenery.js";
import {
  THREE,
  quad,
  geometryFromTriangles,
  mesh,
  textTexture,
} from "./scene-utils.js";
import { ArtMaterials } from "./art-materials.js";
import { rng, clamp, smooth } from "./math.js";

// Regional art direction shares the physics height field and road data.
export class IslandScenery extends Scenery {
  buildTerrain() {
    this.art = new ArtMaterials();
    this.low = false;
    const w = this.world,
      step = 8,
      chunk = 192,
      bounds = w.bounds;
    const ground = this.art.get("grass", "#a3ad79", 1);
    ground.vertexColors = true;
    const green = new THREE.Color("#aeb48b"),
      stone = new THREE.Color("#cebea1"),
      dry = new THREE.Color("#c0b27e");
    for (let cx = bounds.minX; cx < bounds.maxX; cx += chunk)
      for (let cz = bounds.minZ; cz < bounds.maxZ; cz += chunk) {
        const positions = [],
          normals = [],
          colors = [],
          uv = [],
          indices = [],
          n = chunk / step;
        for (let i = 0; i <= n; i++)
          for (let j = 0; j <= n; j++) {
            const x = cx + i * step,
              z = cz + j * step,
              h = w.height(x, z);
            const dx = (w.height(x + 2, z) - w.height(x - 2, z)) / 4,
              dz = (w.height(x, z + 2) - w.height(x, z - 2)) / 4;
            const normal = new THREE.Vector3(-dx, 1, -dz).normalize();
            const roads = w.roadGrid.get(
              Math.floor(x / 32) + "," + Math.floor(z / 32),
            );
            const nearest = roads ? w.nearestRoad(x, z) : null;
            const depression =
              nearest && nearest.d < nearest.width / 2 + 3 ? 0.19 : 0;
            positions.push(x, h - depression, z);
            normals.push(normal.x, normal.y, normal.z);
            uv.push(x * 0.1, z * 0.1);
            const slope = Math.hypot(dx, dz),
              variation =
                0.5 +
                0.5 *
                  Math.sin(x * 0.014 + Math.sin(z * 0.019) * 2) *
                  Math.cos(z * 0.008);
            const color = green
              .clone()
              .lerp(dry, variation * 0.36)
              .lerp(stone, smooth(0.21, 0.55, slope) * 0.85);
            if (z < -750) color.lerp(stone, 0.17);
            colors.push(color.r, color.g, color.b);
          }
        for (let i = 0; i < n; i++)
          for (let j = 0; j < n; j++) {
            if (!w.inside(cx + (i + 0.5) * step, cz + (j + 0.5) * step))
              continue;
            const a = i * (n + 1) + j,
              b = a + 1,
              c = a + n + 2,
              d = a + n + 1;
            indices.push(a, b, c, a, c, d);
          }
        if (!indices.length) continue;
        const g = new THREE.BufferGeometry();
        g.setAttribute(
          "position",
          new THREE.Float32BufferAttribute(positions, 3),
        );
        g.setAttribute("normal", new THREE.Float32BufferAttribute(normals, 3));
        g.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
        g.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
        g.setIndex(indices);
        mesh(g, ground, this.group, [0, 0, 0], [0, 0, 0], [1, 1, 1], false);
      }
    const beach = [],
      cliff = [],
      foam = [],
      center = w.center;
    const shorePoint = (p, k, y) => [
      center.x + (p.x - center.x) * k,
      y,
      p.z * k,
    ];
    for (let i = 1; i < w.shore.length; i++) {
      const a = w.shore[i - 1],
        b = w.shore[i],
        ha = w.height(a.x, a.z),
        hb = w.height(b.x, b.z);
      const high = (ha + hb) / 2 > 15;
      if (high) {
        quad(
          cliff,
          shorePoint(a, 0.992, ha + 0.02),
          shorePoint(b, 0.992, hb + 0.02),
          shorePoint(b, 1.005, -0.75),
          shorePoint(a, 1.005, -0.75),
        );
      } else {
        quad(
          beach,
          shorePoint(a, 0.984, ha + 0.025),
          shorePoint(b, 0.984, hb + 0.025),
          shorePoint(b, 1.025, -1.1),
          shorePoint(a, 1.025, -1.1),
        );
      }
      const k = high ? 1.008 : 1.019;
      quad(
        foam,
        shorePoint(a, k, -0.77),
        shorePoint(b, k, -0.77),
        shorePoint(b, k + 0.0015, -0.77),
        shorePoint(a, k + 0.0015, -0.77),
      );
    }
    for (const [positions, kind, color] of [
      [beach, "sand", "#e3d3a4"],
      [cliff, "stone", "#bfb090"],
    ]) {
      const mat = this.art.get(kind, color);
      mat.side = THREE.DoubleSide;
      mesh(
        geometryFromTriangles(positions),
        mat,
        this.group,
        [0, 0, 0],
        [0, 0, 0],
        [1, 1, 1],
        false,
      );
    }
    mesh(
      geometryFromTriangles(foam),
      new THREE.MeshBasicMaterial({
        color: "#ecf4dc",
        transparent: true,
        opacity: 0.44,
        depthWrite: false,
        side: THREE.DoubleSide,
      }),
      this.group,
      [0, 0, 0],
      [0, 0, 0],
      [1, 1, 1],
      false,
    );
    this.waterMaterial = new THREE.ShaderMaterial({
      uniforms: {
        time: { value: 0 },
        center: { value: center.x },
        radius: { value: new THREE.Vector2(260 * w.scale, 350 * w.scale) },
      },
      vertexShader:
        "varying vec3 vWorld;void main(){vec4 p=modelMatrix*vec4(position,1.);vWorld=p.xyz;gl_Position=projectionMatrix*viewMatrix*p;}",
      fragmentShader: `uniform float time;uniform float center;uniform vec2 radius;varying vec3 vWorld;
      void main(){
        vec2 p=vWorld.xz;
        vec2 q=abs((p-vec2(center,0.))/radius);
        float edge=pow(pow(q.x,5.263)+pow(q.y,5.263),1./5.263);
        float depth=smoothstep(1.,1.38,edge);
        vec3 col=mix(vec3(.075,.53,.47),vec3(.024,.22,.34),depth);
        float a=sin(p.x*.11+time*.8),b=sin(p.y*.14-time*.65);
        vec3 n=normalize(vec3(a*.085,1.,b*.085));
        vec3 view=normalize(cameraPosition-vWorld);
        vec3 light=normalize(vec3(-.55,.8,.45));
        float spec=pow(max(dot(n,normalize(view+light)),0.),150.);
        float ripple=sin(p.x*.32+sin(p.y*.23)+time)*sin(p.y*.46-time*.7);
        col+=ripple*.008+spec*vec3(.6,.56,.38)*.4;
        col=mix(col,vec3(.53,.71,.73),smoothstep(1000.,3800.,length(cameraPosition-vWorld)));
        gl_FragColor=vec4(col,1.);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`,
    });
    mesh(
      new THREE.PlaneGeometry(14000, 14000),
      this.waterMaterial,
      this.group,
      [0, -0.9, 0],
      [-Math.PI / 2, 0, 0],
      [1, 1, 1],
      false,
    ).receiveShadow = false;
  }
  buildRoads() {
    const w = this.world;
    const mats = [
      this.art.get("asphalt", "#8a8d87", 0.96),
      this.art.get("stone", "#c7baa0"),
      new THREE.MeshStandardMaterial({ color: "#eee3bd", roughness: 0.9 }),
    ];
    mats.forEach((m) => (m.side = THREE.DoubleSide));
    const urban = (x, z) =>
      (x > -660 && x < 460 && z > -110 && z < 820) || (x > 455 && z > -30);
    for (const path of w.paths) {
      let surfaces = [[], [], []];
      const flush = () => {
        surfaces.forEach((p, i) => {
          if (p.length)
            mesh(
              geometryFromTriangles(p),
              mats[i],
              this.group,
              [0, 0, 0],
              [0, 0, 0],
              [1, 1, 1],
              false,
            );
        });
        surfaces = [[], [], []];
      };
      for (let i = 1; i < path.points.length; i++) {
        const p = path.points,
          a = p[i - 1],
          b = p[i],
          before = p[Math.max(0, i - 2)],
          after = p[Math.min(p.length - 1, i + 1)];
        const la = Math.hypot(b.x - before.x, b.z - before.z) || 1,
          lb = Math.hypot(after.x - a.x, after.z - a.z) || 1;
        const na = { x: -(b.z - before.z) / la, z: (b.x - before.x) / la },
          nb = { x: -(after.z - a.z) / lb, z: (after.x - a.x) / lb };
        const ribbon = (out, offset, width, y) => {
          const slices = Math.max(1, Math.ceil(width / 2));
          const v = (p, n, d) => {
            const x = p.x + n.x * d,
              z = p.z + n.z * d;
            return [x, w.height(x, z) + y, z];
          };
          for (let k = 0; k < slices; k++) {
            const l = offset - width / 2 + (width * k) / slices,
              r = offset - width / 2 + (width * (k + 1)) / slices;
            quad(out, v(a, na, l), v(b, nb, l), v(b, nb, r), v(a, na, r));
          }
        };
        ribbon(surfaces[0], 0, path.width, 0.082 + path.id * 0.001);
        if (!w.isJunction((a.x + b.x) / 2, (a.z + b.z) / 2, path.id, 3)) {
          const mx = (a.x + b.x) / 2,
            mz = (a.z + b.z) / 2;
          if (urban(mx, mz)) {
            for (const side of [-1, 1]) {
              ribbon(surfaces[1], side * (path.width / 2 + 1.2), 2.4, 0.06);
              ribbon(surfaces[2], side * (path.width / 2 - 0.4), 0.12, 0.105);
            }
          } else {
            // Rural shoulders: compacted gravel instead of city kerbs.
            for (const side of [-1, 1])
              ribbon(surfaces[1], side * (path.width / 2 + 0.7), 2.2, 0.04);
          }
          if (i % 6 < 3) ribbon(surfaces[2], 0, 0.14, 0.108);
        }
        if (i % 100 === 0) flush();
      }
      flush();
    }
    for (let i = 0; i < w.rails.length; i++) {
      const r = w.rails[i],
        h = w.height(r.x, r.z);
      this.batch.box("#c5ccbd", r.x, h + 0.65, r.z, 0.18, 0.2, r.d, r.yaw);
      if (i % 3 === 0)
        this.batch.box("#6d7970", r.x, h, r.z, 0.12, 0.9, 0.13, r.yaw);
    }
  }
  buildTown() {
    const w = this.world,
      b = this.batch;
    const trim = this.art.get("stucco", "#eee2c7"),
      base = this.art.get("stone", "#b9b099");
    const roof = this.art.get("roof", "#bd7753"),
      wood = this.art.get("wood", "#52786e");
    const glass = new THREE.MeshPhysicalMaterial({
      color: "#30494e",
      roughness: 0.25,
      metalness: 0.32,
      clearcoat: 0.7,
      envMapIntensity: 1.1,
    });
    const signs = [
      "CAFE AZUR",
      "CASA MARINA",
      "HOTEL SOLE",
      "PANETTERIA",
      "ATELIER",
    ].map(
      (t) =>
        new THREE.MeshStandardMaterial({ map: textTexture(t), roughness: 0.8 }),
    );
    b.geometries.roof = new THREE.ConeGeometry(1, 1, 4);
    b.geometries.roof.rotateY(Math.PI / 4);
    for (const h of w.buildings) {
      const c = Math.cos(h.yaw),
        s = Math.sin(h.yaw),
        y = w.height(h.x, h.z),
        wall = this.art.get("stucco", h.color);
      const pos = (x, z) => [h.x + x * c - z * s, h.z + x * s + z * c];
      const box = (mat, x, yy, z, ww, hh, dd, shadow = true) => {
        const [xx, zz] = pos(x, z);
        b.box(mat, xx, y + yy, zz, ww, hh, dd, h.yaw, shadow);
      };
      const pad = 1.4;
      box(base, 0, -0.45, 0, h.w + pad, 1.0, h.d + pad);
      box(wall, 0, 0.3, 0, h.w, h.h, h.d);
      box(trim, 0, h.h + 0.2, 0, h.w + 0.65, 0.3, h.d + 0.65);
      box(base, 0, 0.35, 0, h.w + 0.09, 0.65, h.d + 0.09);
      const roofHeight = 2.1 + h.w * 0.035;
      b.add(
        "roof",
        roof,
        [h.x, y + h.h + 0.55 + roofHeight / 2, h.z],
        [(h.w + 1) * 0.71, roofHeight, (h.d + 1) * 0.71],
        [0, -h.yaw, 0],
      );
      box(trim, -h.w * 0.25, h.h + 1.2, 0, 1, 2.1, 0.9);
      box(base, -h.w * 0.25, h.h + 3.3, 0, 1.3, 0.17, 1.2);
      const floors = Math.max(1, Math.floor(h.h / 3.1));
      // Windows, inset dark reveals, shutters and projecting sills on all four facades.
      for (let face = 0; face < 4; face++) {
        const alongX = face < 2,
          side = face % 2 ? 1 : -1,
          length = alongX ? h.w : h.d,
          count = Math.max(2, Math.floor(length / 3.2));
        for (let f = 0; f < floors; f++)
          for (let k = 0; k < count; k++) {
            const u = -length / 2 + ((k + 0.5) * length) / count,
              yy = 1.25 + f * 3.1;
            const x = alongX ? u : side * (h.w / 2 + 0.065),
              z = alongX ? side * (h.d / 2 + 0.065) : u;
            box(
              trim,
              x,
              yy - 0.14,
              z,
              alongX ? 1.6 : 0.16,
              2.05,
              alongX ? 0.16 : 1.6,
            );
            box(
              glass,
              x + (alongX ? 0 : side * 0.1),
              yy,
              z + (alongX ? side * 0.1 : 0),
              alongX ? 1.2 : 0.07,
              1.78,
              alongX ? 0.07 : 1.2,
            );
            box(
              trim,
              x,
              yy - 0.2,
              z,
              alongX ? 1.85 : 0.43,
              0.13,
              alongX ? 0.43 : 1.85,
            );
            for (const edge of [-1, 1]) {
              box(
                wood,
                x + (alongX ? edge * 0.9 : side * 0.13),
                yy,
                z + (alongX ? side * 0.13 : edge * 0.9),
                alongX ? 0.38 : 0.1,
                1.83,
                alongX ? 0.1 : 0.38,
                false,
              );
            }
            box(
              trim,
              x,
              yy + 0.8,
              z,
              alongX ? 1.26 : 0.22,
              0.06,
              alongX ? 0.22 : 1.26,
              false,
            );
            if (f > 0 && h.variant === 2 && face === 1) {
              box(trim, u, yy - 0.3, h.d / 2 + 0.65, 2.35, 0.17, 1.5);
              box(
                "#405b53",
                u,
                yy + 0.5,
                h.d / 2 + 1.3,
                2.25,
                0.065,
                0.07,
                false,
              );
              for (let k2 = -2; k2 <= 2; k2++)
                box(
                  "#405b53",
                  u + k2 * 0.45,
                  yy - 0.05,
                  h.d / 2 + 1.3,
                  0.045,
                  0.6,
                  0.045,
                  false,
                );
            }
          }
      }
      box(wood, 0, 0.5, h.d / 2 + 0.13, 1.8, 2.55, 0.13);
      box(trim, 0, 0.2, h.d / 2 + 0.8, 2.7, 0.22, 1.5);
      if (h.variant !== 3) {
        const awning = h.variant % 2 ? "#597d76" : "#b97558";
        for (let k = 0; k < 10; k++)
          box(
            k % 2 ? trim : awning,
            (k - 4.5) * 0.65,
            3.1,
            h.d / 2 + 1.1,
            0.65,
            0.12,
            2.1,
          );
        box(awning, 0, 2.77, h.d / 2 + 2.1, 6.5, 0.4, 0.1);
        const [sx, sz] = pos(0, h.d / 2 + 0.2);
        mesh(
          new THREE.PlaneGeometry(5.7, 0.8),
          signs[h.variant % 5],
          this.group,
          [sx, y + 4.1, sz],
          [0, -h.yaw, 0],
          [1, 1, 1],
          false,
        );
      }
      for (const side of [-1, 1]) {
        box(roof, side * (h.w / 2 - 0.8), 0.3, h.d / 2 + 1, 1, 0.8, 1);
        const [px, pz] = pos(side * (h.w / 2 - 0.8), h.d / 2 + 1);
        b.add("sphere", "#637c49", [px, y + 1.35, pz], [0.85, 0.8, 0.8]);
        if (h.variant === 1)
          b.add(
            "sphere",
            "#b36f88",
            [px, y + 1.8, pz],
            [0.55, 0.45, 0.55],
            [0, 0, 0],
            false,
          );
      }
    }
  }
  buildTrees() {
    const b = this.batch,
      w = this.world;
    const trunk = this.art.get("wood", "#9e8865");
    const leaf = ["#3f704f", "#5d8152", "#758c5c", "#8a9b6a"];
    // Feathered palm fronds: individual curved leaflets with visible gaps.
    const p = [];
    for (let arm = 0; arm < 11; arm++) {
      const angle = (arm * Math.PI * 2) / 11,
        dx = Math.cos(angle),
        dz = Math.sin(angle);
      const center = (t) => [
        dx * t * 4.15,
        Math.sin(t * Math.PI) * 1.1 - t * t * 2.4,
        dz * t * 4.15,
      ];
      for (let j = 1; j < 15; j++) {
        const t = j / 15,
          a = center(t),
          v = center(Math.min(1, t + 0.045)),
          span = Math.sin(t * Math.PI) * 1.02;
        for (const side of [-1, 1]) {
          const tip = [
            a[0] - dz * span * side + dx * 0.3,
            a[1] - 0.2,
            a[2] + dx * span * side + dz * 0.3,
          ];
          p.push(...a, ...tip, ...v);
        }
      }
    }
    b.geometries.fronds = geometryFromTriangles(p);
    const palmMat = new THREE.MeshStandardMaterial({
      color: "#5e8752",
      roughness: 0.92,
      side: THREE.DoubleSide,
    });
    for (const t of w.trees) {
      const y = w.height(t.x, t.z),
        r = rng(Math.floor(t.seed * 999 + 3000));
      if (t.kind === "palm") {
        for (let j = 0; j < 4; j++)
          b.add(
            "cylinder",
            trunk,
            [t.x + Math.sin(t.seed) * j * 0.16, y + (t.h * (j + 0.5)) / 4, t.z],
            [0.23 - j * 0.025, t.h / 4 + 0.07, 0.23 - j * 0.025],
            [0, 0, 0],
          );
        b.add(
          "fronds",
          palmMat,
          [t.x + Math.sin(t.seed) * 0.48, y + t.h, t.z],
          [0.85 + t.h * 0.015, 1, 0.85 + t.h * 0.015],
          [0, t.seed, 0],
        );
      } else if (t.kind === "pine") {
        b.add(
          "cylinder",
          trunk,
          [t.x, y + t.h * 0.16, t.z],
          [0.24, t.h * 0.36, 0.24],
        );
        const greens = ["#2f5d46", "#3a6a4e", "#457757"];
        for (let i = 0; i < 4; i++) {
          const f = i / 3,
            coneH = t.h * 0.36,
            radius = t.h * (0.34 - f * 0.075),
            base = t.h * (0.2 + f * 0.24);
          b.add(
            "cone",
            greens[i % 3],
            [
              t.x + Math.sin(t.seed * 3 + i * 2.1) * 0.35,
              y + base + coneH * 0.5,
              t.z + Math.cos(t.seed * 2 + i * 1.7) * 0.35,
            ],
            [radius, coneH, radius],
            [0, t.seed + i, 0],
          );
        }
      } else {
        b.add(
          "cylinder",
          trunk,
          [t.x, y + t.h * 0.26, t.z],
          [0.26 + r() * 0.08, t.h * 0.55, 0.26 + r() * 0.08],
          [Math.sin(t.seed) * 0.06, 0, Math.cos(t.seed) * 0.06],
        );
        const blobs = 4 + Math.floor(r() * 2);
        for (let i = 0; i < blobs; i++) {
          const angle = i * 2.4 + t.seed,
            spread = t.h * 0.13 * (0.5 + r() * 0.6),
            size = t.h * (0.15 + r() * 0.08);
          b.add(
            "sphere",
            leaf[i % 4],
            [
              t.x + Math.cos(angle) * spread,
              y + t.h * (0.62 + r() * 0.3),
              t.z + Math.sin(angle) * spread,
            ],
            [size * 1.15, size * 0.8, size * 1.05],
            [0, angle, 0],
          );
        }
      }
    }
  }
  buildLandmarks() {
    const w = this.world,
      b = this.batch,
      stone = this.art.get("stone", "#d4c3a3"),
      white = this.art.get("stucco", "#efe2c4"),
      roof = this.art.get("roof", "#b97552");
    // Lighthouse is off the driving surface, on the seaward side of the coastal approach.
    const cp = w.pointAt(w.routeLength * 0.75),
      x = cp.x + 25,
      z = cp.z,
      y = w.height(x, z);
    b.add("cylinder", stone, [x, y + 0.6, z], [7, 1.2, 7]);
    b.add("cylinder", white, [x, y + 12, z], [3.3, 23, 3.3]);
    b.add("cylinder", roof, [x, y + 15, z], [3.1, 2.1, 3.1]);
    b.add("cylinder", stone, [x, y + 24, z], [4.2, 0.5, 4.2]);
    b.add("cylinder", "#57797b", [x, y + 26, z], [2.7, 3, 2.7]);
    b.add("cone", roof, [x, y + 28.3, z], [3.7, 2.2, 3.7]);
    w.register({ type: "circle", x, z, r: 5 });
    for (let i = 0; i < 8; i++) {
      const a = (i * Math.PI) / 4;
      b.box(
        "#546761",
        x + Math.cos(a) * 3.8,
        y + 24.2,
        z + Math.sin(a) * 3.8,
        0.09,
        1,
        0.09,
      );
    }
    // Marina sits beyond the southern shoreline, with a pier connected to the town road.
    const harbor = w.shore.reduce(
      (best, p) =>
        Math.abs(p.x - 320) + Math.abs(p.z - 1110) <
        Math.abs(best.x - 320) + Math.abs(best.z - 1110)
          ? p
          : best,
      w.shore[0],
    );
    const hx = harbor.x,
      hz = harbor.z;
    const wood = this.art.get("wood", "#b59b73");
    b.box(wood, hx, 0.2, hz + 20, 7, 0.7, 85);
    b.box(wood, hx + 25, 0.2, hz + 57, 57, 0.7, 5);
    for (let i = 0; i < 5; i++) {
      const xx = hx + 5 + i * 11,
        zz = hz + 71;
      b.box(wood, xx, 0.2, zz - 2, 2, 0.65, 27);
      b.add(
        "sphere",
        "#e9e0c7",
        [xx + 4, 0.05, zz],
        [2.1, 0.85, 6],
        [0, 0.12, 0],
      );
      b.box("#d8ccb0", xx + 4, 0.45, zz, 2.7, 0.9, 5);
      b.box("#365563", xx + 4, 1.32, zz, 2.45, 0.55, 3.4);
      b.add("cylinder", "#d4d3bc", [xx + 4, 6, zz], [0.07, 11, 0.07]);
      const sail = [xx + 4, 11, zz, xx + 4, 2, zz, xx + 8, 2, zz];
      mesh(
        geometryFromTriangles(sail),
        new THREE.MeshStandardMaterial({
          color: "#eee7cb",
          side: THREE.DoubleSide,
        }),
        this.group,
      );
    }
    // A small hilltop chapel is visible before the climb reaches its summit.
    const summit = w.pointAt(w.routeLength * 0.4),
      sx = summit.x - 36,
      sz = summit.z - 28,
      sy = w.height(sx, sz);
    if (w.nearestRoad(sx, sz).d > 20) {
      b.box(white, sx, sy, sz, 12, 7, 17);
      b.add("roof", roof, [sx, sy + 9, sz], [9, 3, 12]);
      b.box(white, sx + 8, sy, sz, 4, 14, 4);
      b.add("cone", roof, [sx + 8, sy + 15, sz], [3.2, 3, 3.2]);
      b.box("#385955", sx, sy + 0.2, sz + 8.55, 2.2, 3.2, 0.1);
      w.register({ type: "box", x: sx, z: sz, w: 22, d: 18, h: 15, yaw: 0 });
    }
  }
  buildCoastalDetails() {
    const w = this.world,
      b = this.batch,
      r = rng(511),
      rock = this.art.get("stone", "#b3a68b");
    // Faceted rock silhouettes replace smooth domes so outcrops read as stone.
    const makeRock = (seed) => {
      const g = new THREE.IcosahedronGeometry(1, 1),
        pos = g.attributes.position;
      for (let i = 0; i < pos.count; i++) {
        const x = pos.getX(i),
          y = pos.getY(i),
          z = pos.getZ(i);
        const n =
          0.72 +
          0.5 * Math.abs(Math.sin(x * 12.9 + y * 7.7 + z * 5.3 + seed * 3.1));
        pos.setXYZ(i, x * n, y * n * 0.82, z * n);
      }
      g.computeVertexNormals();
      return g;
    };
    b.geometries.rock0 = makeRock(1);
    b.geometries.rock1 = makeRock(2);
    b.geometries.rock2 = makeRock(3);
    for (let i = 0; i < 340; i++) {
      const x = -1080 + r() * 1800,
        z = -1150 + r() * 2150;
      if (!w.inside(x, z) || (z > -350 && x < 570)) continue;
      const near = w.roadGrid.has(Math.floor(x / 32) + "," + Math.floor(z / 32))
        ? w.nearestRoad(x, z)
        : null;
      const size = 2.2 + r() * 5.5;
      if (near && near.d < near.width / 2 + size + 5) continue;
      const y = w.height(x, z);
      b.add(
        "rock" + (i % 3),
        rock,
        [x, y + size * 0.24, z],
        [size, size * (0.55 + r() * 0.75), size * (0.7 + r() * 0.3)],
        [r() * 0.5, r() * 6, r() * 0.3],
      );
    }
    // Low roadside planting and street furniture keep the driving sightline clear.
    const route = w.route;
    for (let i = 0; i < route.length - 1; i += 14) {
      const p = route[i],
        q = route[i + 1];
      if (p.x < 470 || p.z < -190 || p.z > 790) continue;
      const dx = q.x - p.x,
        dz = q.z - p.z,
        len = Math.hypot(dx, dz) || 1;
      const x = p.x - (dz / len) * 20,
        z = p.z + (dx / len) * 20,
        y = w.height(x, z);
      if (w.isJunction(x, z, 0, 5)) continue;
      b.box(this.art.get("stone", "#d6c7a6"), x, y - 0.1, z, 2.5, 0.5, 1.2);
      for (let j = 0; j < 3; j++)
        b.add(
          "sphere",
          j % 2 ? "#86945b" : "#637d4e",
          [x + j * 0.65 - 0.65, y + 0.55, z],
          [0.7, 0.65, 0.65],
        );
      if (i % 28 === 0) {
        b.box("#455e58", x + 2, y, z, 0.13, 5.2, 0.13);
        b.box("#e9dcc0", x + 2, y + 5.1, z, 0.65, 0.3, 0.65);
      }
    }
    for (const d of w.discoveries) {
      const fx = Math.sin(d.yaw),
        fz = -Math.cos(d.yaw);
      const x = d.x - fz * 14,
        z = d.z + fx * 14,
        y = w.height(x, z);
      b.box("#51665b", x, y, z, 0.15, 3.8, 0.15);
      mesh(
        new THREE.PlaneGeometry(4.8, 1.4),
        new THREE.MeshStandardMaterial({
          map: textTexture(d.name),
          side: THREE.DoubleSide,
        }),
        this.group,
        [x, y + 3.3, z],
        [0, -d.yaw, 0],
      );
    }
    // Terraced orchards fill the valley with organized, region-specific planting.
    const orchard = this.art.get("grass", "#b0a16a");
    for (let row = 0; row < 8; row++) {
      const x = -705 - row * 8,
        z = 15;
      const road = w.nearestRoad(x, z);
      if (road.d < 22) continue;
      b.box(orchard, x, w.height(x, z) - 0.12, z, 2, 0.15, 75);
      for (let k = 0; k < 6; k++) {
        const zz = z - 32 + k * 12;
        if (w.nearestRoad(x, zz).d < 17) continue;
        b.add("sphere", "#778759", [x, w.height(x, zz) + 2, zz], [2, 1.5, 2]);
      }
    }
    this.birds = new THREE.Group();
    this.group.add(this.birds);
    const birdGeo = geometryFromTriangles([
      -0.9, 0, 0, 0, 0.16, 0, -0.3, 0, 0.22, 0, 0.16, 0, 0.9, 0, 0, 0.3, 0,
      0.22,
    ]);
    const bm = new THREE.MeshBasicMaterial({
      color: "#f5ecda",
      side: THREE.DoubleSide,
    });
    for (let i = 0; i < 7; i++)
      mesh(
        birdGeo,
        bm,
        this.birds,
        [i * 9, Math.sin(i) * 3, (i % 3) * 6],
        [0, i * 0.2, 0],
        [1, 1, 1],
        false,
      );
  }
  update(time, car) {
    this.waterMaterial.uniforms.time.value = time;
    if (car) {
      if (
        !this.lastVisibility ||
        Math.hypot(
          car.x - this.lastVisibility.x,
          car.z - this.lastVisibility.z,
        ) > 25
      ) {
        this.batch.updateVisibility(car.x, car.z, this.low);
        this.lastVisibility = { x: car.x, z: car.z };
      }
      this.birds.position.set(
        725 + Math.sin(time * 0.035) * 70,
        39,
        325 + Math.cos(time * 0.035) * 80,
      );
      this.birds.rotation.y = -time * 0.035;
    }
  }
  setQuality(low) {
    this.low = low;
    this.lastVisibility = null;
    this.detail.visible = !low;
  }
}
