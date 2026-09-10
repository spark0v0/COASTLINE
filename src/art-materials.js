import * as THREE from "three";
import { rng } from "./math.js";
import { addSurfaceRelief } from "./surface-detail.js";

// Shared surface materials. Photo-based CC0 textures (Poly Haven) drive the
// big surfaces; world-space triplanar projection keeps every kit piece at
// real scale. Small kit textures stay procedural.
const EXTERNAL_MAPS = {
  asphalt: {
    map: "assets/surfaces/asphalt_02_diff_1k.jpg",
    roughnessMap: "assets/surfaces/asphalt_02_rough_1k.jpg",
  },
  stone: { map: "assets/surfaces/aerial_rocks_02_diff_1k.jpg" },
  grass: { map: "assets/surfaces/aerial_grass_rock_diff_1k.jpg" },
  sand: { map: "assets/surfaces/aerial_beach_01_diff_1k.jpg" },
  stucco: { map: "assets/surfaces/clay_plaster_diff_1k.jpg" },
};

export class ArtMaterials {
  constructor() {
    this.textures = new Map();
    this.materials = new Map();
    this.loader = new THREE.TextureLoader();
  }
  texture(kind) {
    if (this.textures.has(kind)) return this.textures.get(kind);
    const external = EXTERNAL_MAPS[kind];
    if (external && external.map) {
      const tex = this.loader.load(external.map);
      tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
      tex.colorSpace = THREE.SRGBColorSpace;
      tex.anisotropy = 8;
      this.textures.set(kind, tex);
      return tex;
    }
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = 256;
    const ctx = canvas.getContext("2d"),
      r = rng(417 + kind.length * 83);
    const image = ctx.createImageData(256, 256);
    for (let y = 0; y < 256; y++)
      for (let x = 0; x < 256; x++) {
        const i = (y * 256 + x) * 4;
        let n = 218 + (r() - 0.5) * (kind === "asphalt" ? 34 : 20);
        if (kind === "grass")
          n +=
            12 * Math.sin(x * 0.13) * Math.sin(y * 0.12) +
            8 * Math.sin((x + y) * 0.31);
        if (kind === "stone") {
          const row = Math.floor(y / 32),
            xx = (x + (row % 2) * 32) % 64;
          n =
            xx < 2 || y % 32 < 2
              ? 135
              : 198 +
                18 *
                  Math.sin(
                    row * 17 + Math.floor((x + (row % 2) * 32) / 64) * 3,
                  ) +
                (r() - 0.5) * 23;
        }
        if (kind === "roof") {
          const q = (x % 24) / 24;
          n = 155 + 66 * Math.sin(q * Math.PI) + (r() - 0.5) * 12;
          if (y % 42 < 3) n -= 34;
        }
        if (kind === "limestone") {
          n = 227 + (r() - 0.5) * 7 + 2 * Math.sin(y * 0.21);
          if (y % 128 === 0) n -= 13;
        }
        if (kind === "ashlar") {
          // Dressed blocks, about 83 x 42 cm at the material's world scale.
          const row = Math.floor(y / 64),
            xx = (x + (row % 2) * 64) % 128;
          n =
            228 +
            Math.sin(row * 17 + Math.floor((x + (row % 2) * 64) / 128) * 7) *
              5 +
            (r() - 0.5) * 5;
          if (xx < 1 || y % 64 < 1) n = 205;
        }
        if (kind === "wood")
          n += 13 * Math.sin(x * 0.6 + Math.sin(y * 0.08) * 0.6);
        if (kind === "paving") {
          // Flagstone grid with grout lines and per-stone tonal drift.
          const row = Math.floor(y / 42),
            xx = (x + (row % 2) * 21) % 42;
          n =
            xx < 2 || y % 42 < 2
              ? 148
              : 204 +
                13 * Math.sin(row * 13 + Math.floor(xx / 21) * 5) +
                (r() - 0.5) * 15;
        }
        image.data[i] = image.data[i + 1] = image.data[i + 2] = n;
        image.data[i + 3] = 255;
      }
    ctx.putImageData(image, 0, 0);
    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = 4;
    this.textures.set(kind, tex);
    return tex;
  }
  roughnessTexture(kind) {
    const key = kind + ":rough";
    if (this.textures.has(key)) return this.textures.get(key);
    const tex = this.loader.load(EXTERNAL_MAPS[kind].roughnessMap);
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    tex.anisotropy = 4;
    this.textures.set(key, tex);
    return tex;
  }
  get(kind, color, roughness = 0.85) {
    const key = kind + color + roughness;
    if (this.materials.has(key)) return this.materials.get(key);
    const material = new THREE.MeshStandardMaterial({
      color,
      map: this.texture(kind),
      roughness,
    });
    if (EXTERNAL_MAPS[kind]?.roughnessMap)
      material.roughnessMap = this.roughnessTexture(kind);
    const scale =
      {
        stone: 0.22,
        limestone: 0.4,
        ashlar: 0.6,
        roof: 0.45,
        wood: 0.32,
        grass: 0.08,
        sand: 0.16,
        asphalt: 0.55,
        stucco: 0.6,
        paving: 1.1,
      }[kind] || 0.35;
    // How strongly the photo texture modulates the base colour. Dark source
    // textures (plaster, dry grass) only add grain, they must not repaint.
    const strength =
      { stucco: 0.16, grass: 0.5, sand: 0.75, stone: 0.85, asphalt: 0.9 }[
        kind
      ] ?? 1;
    material.onBeforeCompile = (shader) => {
      shader.uniforms.artScale = { value: scale };
      shader.uniforms.artStrength = { value: strength };
      shader.vertexShader = shader.vertexShader.replace(
        "#include <common>",
        "#include <common>\nvarying vec3 vArtWorld; varying vec3 vArtNormal;",
      );
      shader.vertexShader = shader.vertexShader.replace(
        "#include <begin_vertex>",
        `#include <begin_vertex>
        vec4 artLocal=vec4(transformed,1.0); vec3 artNormal=normal;
        #ifdef USE_INSTANCING
          artLocal=instanceMatrix*artLocal;
          mat3 artIM=mat3(instanceMatrix);
          artNormal/=max(vec3(dot(artIM[0],artIM[0]),dot(artIM[1],artIM[1]),dot(artIM[2],artIM[2])),vec3(1e-8));
          artNormal=artIM*artNormal;
        #endif
        vArtWorld=(modelMatrix*artLocal).xyz;
        mat3 artMM=mat3(modelMatrix);
        artNormal/=max(vec3(dot(artMM[0],artMM[0]),dot(artMM[1],artMM[1]),dot(artMM[2],artMM[2])),vec3(1e-8));
        vArtNormal=normalize(artMM*artNormal);`,
      );
      shader.fragmentShader = shader.fragmentShader.replace(
        "#include <common>",
        "#include <common>\nvarying vec3 vArtWorld; varying vec3 vArtNormal; uniform float artScale; uniform float artStrength;",
      );
      shader.fragmentShader = shader.fragmentShader.replace(
        "#include <map_fragment>",
        `
        vec3 weights=pow(abs(normalize(vArtNormal)),vec3(6.0));weights/=max(dot(weights,vec3(1.0)),.001);
        vec3 p=vArtWorld*artScale;
        vec4 texel=texture2D(map,p.zy)*weights.x+texture2D(map,p.xz)*weights.y+texture2D(map,p.xy)*weights.z;
        float artGrain=dot(texel.rgb,vec3(.2126,.7152,.0722));
        diffuseColor.rgb*=mix(vec3(1.0),texel.rgb,artStrength);
      `,
      );
      if (kind === "asphalt") {
        shader.fragmentShader = shader.fragmentShader.replace(
          "diffuseColor.rgb*=mix(vec3(1.0),texel.rgb,artStrength);",
          "float grain=texture2D(map,vArtWorld.xz*4.3).r; float broad=texture2D(map,vArtWorld.xz*.017).r; diffuseColor.rgb*=.82+grain*.16+broad*.07;",
        );
      }
      shader.fragmentShader = shader.fragmentShader.replace(
        "#include <roughnessmap_fragment>",
        `float roughnessFactor = roughness;
        #ifdef USE_ROUGHNESSMAP
          vec3 rWeights=pow(abs(normalize(vArtNormal)),vec3(6.0));rWeights/=max(dot(rWeights,vec3(1.0)),.001);
          vec3 rP=vArtWorld*artScale;
          float rTexel=texture2D(roughnessMap,rP.zy).g*rWeights.x+texture2D(roughnessMap,rP.xz).g*rWeights.y+texture2D(roughnessMap,rP.xy).g*rWeights.z;
          roughnessFactor*=rTexel;
        #endif
      `,
      );
      addSurfaceRelief(
        shader,
        "artGrain",
        {
          stone: 0.016,
          limestone: 0.003,
          ashlar: 0.003,
          stucco: 0.004,
          wood: 0.004,
          paving: 0.006,
          asphalt: 0.003,
        }[kind] || 0.002,
      );
    };
    material.customProgramCacheKey = () =>
      kind + scale + strength + ":relief-v2";
    // The kit may share this shader across colours using instance tints.
    material.userData.instanceTint =
      "surface:" + kind + ":" + scale + ":" + strength;
    this.materials.set(key, material);
    return material;
  }
}
