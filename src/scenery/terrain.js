import { THREE, quad, geometryFromTriangles, mesh, smooth } from "./kit.js";
import { landscapeMaterial } from "../landscape-material.js";
import { SUN_DIRECTION } from "../daylight.js";

// Terrain chunks, shoreline quads and the animated water plane.
export function buildTerrain(S) {
  const w = S.world,
    step = 6,
    chunk = 192,
    bounds = w.bounds;
  const ground = landscapeMaterial(S.art);
  for (let cx = bounds.minX; cx < bounds.maxX; cx += chunk)
    for (let cz = bounds.minZ; cz < bounds.maxZ; cz += chunk) {
      const positions = [],
        normals = [],
        verges = [],
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
            nearest && nearest.d < nearest.width / 2 + 3 ? 0.055 : 0;
          positions.push(x, h - depression, z);
          normals.push(normal.x, normal.y, normal.z);
          uv.push(x * 0.1, z * 0.1);
          verges.push(
            nearest
              ? smooth(
                  nearest.width / 2 + 0.6,
                  nearest.width / 2 + 3.2,
                  nearest.d,
                )
              : 1,
          );
        }
      for (let i = 0; i < n; i++)
        for (let j = 0; j < n; j++) {
          if (!w.inside(cx + (i + 0.5) * step, cz + (j + 0.5) * step)) continue;
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
      g.setAttribute("verge", new THREE.Float32BufferAttribute(verges, 1));
      g.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
      g.setIndex(indices);
      mesh(g, ground, S.group, [0, 0, 0], [0, 0, 0], [1, 1, 1], false);
    }
  const beach = [],
    cliff = [],
    foam = [],
    center = w.center;
  const shorePoint = (p, k, y) => [center.x + (p.x - center.x) * k, y, p.z * k];
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
    [beach, "sand", "#d7c7a4"],
    [cliff, "stone", "#beb9a6"],
  ]) {
    const mat = S.art.get(kind, color);
    mat.side = THREE.DoubleSide;
    mesh(
      geometryFromTriangles(positions),
      mat,
      S.group,
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
    S.group,
    [0, 0, 0],
    [0, 0, 0],
    [1, 1, 1],
    false,
  );
  S.waterMaterial = new THREE.ShaderMaterial({
    transparent: true,
    uniforms: {
      time: { value: 0 },
      sunDirection: { value: SUN_DIRECTION },
      center: { value: center.x },
      radius: { value: new THREE.Vector2(260 * w.scale, 350 * w.scale) },
    },
    vertexShader:
      "varying vec3 vWorld;void main(){vec4 p=modelMatrix*vec4(position,1.);vWorld=p.xyz;gl_Position=projectionMatrix*viewMatrix*p;}",
    fragmentShader: `uniform float time;uniform float center;uniform vec2 radius;uniform vec3 sunDirection;varying vec3 vWorld;
      void main(){
        vec2 p=vWorld.xz;
        vec2 signedQ=(p-vec2(center,0.))/radius;
        vec2 angular=sign(signedQ)*pow(abs(signedQ),vec2(1./.38));
        float angle=atan(angular.y,angular.x);
        float shoreScale=1.+.026*sin(angle*3.+.3)+.016*sin(angle*7.-1.);
        vec2 q=abs(signedQ)/shoreScale;
        float edge=pow(pow(q.x,2./.38)+pow(q.y,2./.38),.38/2.);
        float depth=smoothstep(1.,1.38,edge);
        vec3 col=mix(vec3(.09,.56,.5),vec3(.024,.22,.34),depth);
        float a=sin(p.x*.11+time*.8),b=sin(p.y*.14-time*.65);
        vec3 n=normalize(vec3(a*.085,1.,b*.085));
        vec3 view=normalize(cameraPosition-vWorld);
        vec3 light=sunDirection;
        float spec=pow(max(dot(n,normalize(view+light)),0.),150.);
        float ripple=sin(p.x*.32+sin(p.y*.23)+time)*sin(p.y*.46-time*.7);
        float fresnel=pow(1.-max(dot(n,view),0.),4.);
        col=mix(col,vec3(.46,.63,.70),fresnel*.48);
        col+=ripple*.008+spec*vec3(.6,.56,.38)*.4;
        // Breaking foam line pulses back and forth across the waterline.
        float band=smoothstep(.993,1.,edge)*(1.-smoothstep(1.,1.018,edge));
        float wave=sin(edge*280.-time*2.4+sin(p.x*.05)*2.5);
        col+=band*(.14+.13*wave)*vec3(1.,.97,.88);
        col=mix(col,vec3(.53,.71,.73),smoothstep(1000.,3800.,length(cameraPosition-vWorld)));
        // Shallows stay slightly translucent so the sand reads through.
        float alpha=mix(.8,.97,smoothstep(.99,1.05,edge));
        gl_FragColor=vec4(col,alpha);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`,
  });
  mesh(
    new THREE.PlaneGeometry(14000, 14000),
    S.waterMaterial,
    S.group,
    [0, -0.9, 0],
    [-Math.PI / 2, 0, 0],
    [1, 1, 1],
    false,
  ).receiveShadow = false;
}
