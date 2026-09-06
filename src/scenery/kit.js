// Shared scenery kit: re-exports and small factories used by region builders.
import {
  THREE,
  quad,
  geometryFromTriangles,
  mesh,
  textTexture,
} from "../scene-utils.js";
import { rng, clamp, smooth } from "../math.js";

export { THREE, quad, geometryFromTriangles, mesh, textTexture };
export { rng, clamp, smooth };

// The old-town / coastal strip where street furniture belongs.
export const urban = (x, z) =>
  (x > -660 && x < 460 && z > -110 && z < 820) || (x > 455 && z > -30);

// Faceted rock silhouettes so outcrops read as stone, not smooth domes.
export function makeRock(seed) {
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
}
