import { THREE, mesh } from "./kit.js";

// Soft static ambient contact at foundations and tree roots, independent of the
// moving directional shadow map. Patches follow the same height field as physics.
export function buildContactShadows(S) {
  S.contactShadows = [];
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = 96;
  const ctx = canvas.getContext("2d"),
    pixels = ctx.createImageData(96, 96);
  for (let y = 0; y < 96; y++)
    for (let x = 0; x < 96; x++) {
      const a = Math.abs((x + 0.5) / 48 - 1),
        b = Math.abs((y + 0.5) / 48 - 1);
      const edge = Math.pow(Math.pow(a, 6) + Math.pow(b, 6), 1 / 6);
      const alpha = Math.pow(Math.max(0, 1 - edge), 0.8);
      const i = (y * 96 + x) * 4;
      pixels.data[i] = pixels.data[i + 1] = pixels.data[i + 2] = 255;
      pixels.data[i + 3] = Math.round(alpha * 255);
    }
  ctx.putImageData(pixels, 0, 0);
  const texture = new THREE.CanvasTexture(canvas);
  const material = new THREE.MeshBasicMaterial({
    color: "#28382f",
    map: texture,
    transparent: true,
    opacity: 0.18,
    depthWrite: false,
    side: THREE.DoubleSide,
    polygonOffset: true,
    polygonOffsetFactor: -1,
    polygonOffsetUnits: -1,
  });
  const chunks = new Map();
  const add = (x, z, w, d, yaw) => {
    const key = Math.floor(x / 192) + "," + Math.floor(z / 192);
    if (!chunks.has(key)) chunks.set(key, { p: [], uv: [] });
    const dst = chunks.get(key),
      c = Math.cos(yaw),
      s = Math.sin(yaw),
      n = 4;
    const vertex = (u, v) => {
      const dx = (u - 0.5) * w,
        dz = (v - 0.5) * d,
        xx = x + dx * c - dz * s,
        zz = z + dx * s + dz * c;
      dst.p.push(xx, S.world.height(xx, zz) + 0.027, zz);
      dst.uv.push(u, v);
    };
    for (let i = 0; i < n; i++)
      for (let j = 0; j < n; j++) {
        const a = i / n,
          b = j / n,
          c = (i + 1) / n,
          d = (j + 1) / n;
        for (const [u, v] of [
          [a, b],
          [a, d],
          [c, d],
          [a, b],
          [c, d],
          [c, b],
        ])
          vertex(u, v);
      }
  };
  for (const h of S.world.buildings)
    for (const v of h.groundVolumes || [h])
      add(v.x, v.z, v.w + 2, v.d + 2, v.yaw);
  for (const t of S.world.trees) {
    if (S.world.nearestRoad(t.x, t.z).d < 7) continue;
    const r = Math.min(4.2, 1.4 + t.h * 0.15);
    add(t.x, t.z, r, r, t.seed);
  }
  for (const { p, uv } of chunks.values()) {
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(p, 3));
    g.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
    g.computeBoundingSphere();
    const m = mesh(
      g,
      material,
      S.group,
      [0, 0, 0],
      [0, 0, 0],
      [1, 1, 1],
      false,
    );
    m.receiveShadow = false;
    S.contactShadows.push(m);
  }
}
