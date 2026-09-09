// Reproducible, offline pruning of the CC BY 4.0 CarConcept GLB.
// Usage: node scripts/prepare-car.mjs original.glb public/assets/vehicles/coast-gt.glb
import fs from "node:fs";
import crypto from "node:crypto";
import * as THREE from "three";
const [input, output] = process.argv.slice(2);
if (!input || !output) throw Error("Provide source and destination GLB paths");
const bytes = fs.readFileSync(input),
  jsonLength = bytes.readUInt32LE(12);
const g = JSON.parse(bytes.subarray(20, 20 + jsonLength).toString());
const binary = bytes.subarray(28 + jsonLength);
const originalHash = crypto.createHash("sha256").update(bytes).digest("hex");
// Outside-view driving needs no concealed engine, pedals, doors' inner skins
// or trademark-bearing dashboard. Doors/hood remain closed.
const keepNode = (n) =>
  !/^Interior|^Engine$|^Axles$|^BodyHoodInterior|^BodyHoodUnder$/.test(
    n.name || "",
  );
const nodeMap = new Map();
g.nodes.forEach((n, i) => {
  if (keepNode(n)) nodeMap.set(i, nodeMap.size);
});
g.nodes = g.nodes.filter(keepNode).map((n) => {
  if (n.children)
    n.children = n.children
      .filter((i) => nodeMap.has(i))
      .map((i) => nodeMap.get(i));
  if (/^WheelFront[LR]$/.test(n.name)) {
    // Source asset is posed with the front wheels steered 30 degrees.
    const m = new THREE.Matrix4().fromArray(n.matrix),
      p = new THREE.Vector3().setFromMatrixPosition(m);
    m.setPosition(0, 0, 0).premultiply(
      new THREE.Matrix4().makeRotationZ(Math.PI / 6),
    );
    m.setPosition(p);
    n.matrix = m.toArray();
  }
  return n;
});
g.scenes.forEach(
  (s) =>
    (s.nodes = s.nodes
      .filter((i) => nodeMap.has(i))
      .map((i) => nodeMap.get(i))),
);
function prune(key, used) {
  const map = new Map([...used].sort((a, b) => a - b).map((v, i) => [v, i]));
  g[key] = [...map.keys()].map((i) => g[key][i]);
  return map;
}
const meshMap = prune(
  "meshes",
  new Set(g.nodes.filter((n) => n.mesh !== undefined).map((n) => n.mesh)),
);
g.nodes.forEach((n) => {
  if (n.mesh !== undefined) n.mesh = meshMap.get(n.mesh);
});
const matMap = prune(
  "materials",
  new Set(g.meshes.flatMap((m) => m.primitives.map((p) => p.material))),
);
g.meshes.forEach((m) =>
  m.primitives.forEach((p) => {
    p.material = matMap.get(p.material);
    delete p.extensions;
  }),
);
for (const m of g.materials) {
  if (/Paint 1/.test(m.name)) {
    m.pbrMetallicRoughness.baseColorFactor = [0.43, 0.56, 0.6, 1];
    m.pbrMetallicRoughness.metallicFactor = 0.72;
    m.pbrMetallicRoughness.roughnessFactor = 0.27;
    if (m.normalTexture) m.normalTexture.scale = 0.035;
  }
  if (/Paint 2/.test(m.name)) {
    m.pbrMetallicRoughness.baseColorFactor = [0.022, 0.033, 0.037, 1];
    m.pbrMetallicRoughness.roughnessFactor = 0.36;
  }
  if (m.name === "Glass") {
    delete m.extensions;
    m.pbrMetallicRoughness = {
      baseColorFactor: [0.018, 0.035, 0.052, 1],
      metallicFactor: 0.26,
      roughnessFactor: 0.13,
    };
    m.alphaMode = "OPAQUE";
  }
  if (m.name === "License" || m.name === "Tireside")
    delete m.pbrMetallicRoughness.baseColorTexture;
  if (m.name === "License")
    m.pbrMetallicRoughness.baseColorFactor = [0.13, 0.17, 0.19, 1];
}
const textures = new Set();
function visitTextureInfo(obj, fn) {
  for (const [key, value] of Object.entries(obj || {})) {
    if (!value || typeof value !== "object") continue;
    if (/Texture$/.test(key) && Number.isInteger(value.index)) fn(value);
    else visitTextureInfo(value, fn);
  }
}
g.materials.forEach((m) => visitTextureInfo(m, (t) => textures.add(t.index)));
const texMap = prune("textures", textures);
g.materials.forEach((m) =>
  visitTextureInfo(m, (t) => (t.index = texMap.get(t.index))),
);
const imageMap = prune("images", new Set(g.textures.map((t) => t.source)));
g.textures.forEach((t) => (t.source = imageMap.get(t.source)));
const accessorSet = new Set();
g.meshes.forEach((m) =>
  m.primitives.forEach((p) => {
    Object.values(p.attributes).forEach((i) => accessorSet.add(i));
    if (p.indices !== undefined) accessorSet.add(p.indices);
  }),
);
const acMap = prune("accessors", accessorSet);
g.meshes.forEach((m) =>
  m.primitives.forEach((p) => {
    for (const k in p.attributes) p.attributes[k] = acMap.get(p.attributes[k]);
    if (p.indices !== undefined) p.indices = acMap.get(p.indices);
  }),
);
const viewMap = prune(
  "bufferViews",
  new Set([
    ...g.accessors.map((a) => a.bufferView),
    ...g.images.map((i) => i.bufferView),
  ]),
);
g.accessors.forEach((a) => {
  if (a.sparse) throw Error("Sparse accessor requires a different packer");
  a.bufferView = viewMap.get(a.bufferView);
});
g.images.forEach((i) => (i.bufferView = viewMap.get(i.bufferView)));
let length = 0;
const parts = [];
for (const v of g.bufferViews) {
  const start = v.byteOffset || 0,
    data = binary.subarray(start, start + v.byteLength),
    pad = (4 - (data.length % 4)) % 4;
  v.byteOffset = length;
  v.buffer = 0;
  parts.push(data, Buffer.alloc(pad));
  length += data.length + pad;
}
g.buffers = [{ byteLength: length }];
delete g.extensions;
delete g.animations;
g.extensionsUsed = [
  "KHR_materials_clearcoat",
  "KHR_materials_emissive_strength",
  "KHR_texture_transform",
];
g.asset.extras = {
  source:
    "https://github.com/KhronosGroup/glTF-Sample-Assets/tree/main/Models/CarConcept",
  sourceSha256: originalHash,
  adaptation:
    "COASTLINE: interior/unused variants removed; opaque driving glass; silver paint; source steering neutralized; logo maps omitted.",
};
let json = Buffer.from(JSON.stringify(g));
json = Buffer.concat([json, Buffer.alloc((4 - (json.length % 4)) % 4, 32)]);
const bin = Buffer.concat(parts),
  out = Buffer.alloc(28 + json.length + bin.length);
out.writeUInt32LE(0x46546c67, 0);
out.writeUInt32LE(2, 4);
out.writeUInt32LE(out.length, 8);
out.writeUInt32LE(json.length, 12);
out.writeUInt32LE(0x4e4f534a, 16);
json.copy(out, 20);
out.writeUInt32LE(bin.length, 20 + json.length);
out.writeUInt32LE(0x004e4942, 24 + json.length);
bin.copy(out, 28 + json.length);
fs.writeFileSync(output, out);
console.log(
  JSON.stringify({
    bytes: out.length,
    materials: g.materials.length,
    images: g.images.length,
    triangles: g.meshes.reduce(
      (a, m) =>
        a +
        m.primitives.reduce(
          (s, p) =>
            s + g.accessors[p.indices ?? p.attributes.POSITION].count / 3,
          0,
        ),
      0,
    ),
    sourceSha256: originalHash,
  }),
);
