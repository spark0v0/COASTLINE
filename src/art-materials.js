import * as THREE from "three";
import { rng } from "./math.js";

// Shared, seamless surface textures. World projection preserves scale on every kit piece.
export class ArtMaterials {
  constructor() {
    this.textures = new Map();
    this.materials = new Map();
  }
  texture(kind) {
    if (this.textures.has(kind)) return this.textures.get(kind);
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
        if (kind === "wood")
          n += 13 * Math.sin(x * 0.6 + Math.sin(y * 0.08) * 0.6);
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
  get(kind, color, roughness = 0.85) {
    const key = kind + color + roughness;
    if (this.materials.has(key)) return this.materials.get(key);
    const material = new THREE.MeshStandardMaterial({
      color,
      map: this.texture(kind),
      roughness,
    });
    const scale =
      {
        stone: 0.22,
        roof: 0.45,
        wood: 0.32,
        grass: 0.14,
        asphalt: 0.8,
        stucco: 0.75,
      }[kind] || 0.35;
    material.onBeforeCompile = (shader) => {
      shader.uniforms.artScale = { value: scale };
      shader.vertexShader = shader.vertexShader.replace(
        "#include <common>",
        "#include <common>\nvarying vec3 vArtWorld; varying vec3 vArtNormal;",
      );
      shader.vertexShader = shader.vertexShader.replace(
        "#include <begin_vertex>",
        `#include <begin_vertex>
        vec4 artLocal=vec4(transformed,1.0); vec3 artNormal=normal;
        #ifdef USE_INSTANCING
          artLocal=instanceMatrix*artLocal; artNormal=mat3(instanceMatrix)*artNormal;
        #endif
        vArtWorld=(modelMatrix*artLocal).xyz;
        vArtNormal=normalize(mat3(modelMatrix)*artNormal);`,
      );
      shader.fragmentShader = shader.fragmentShader.replace(
        "#include <common>",
        "#include <common>\nvarying vec3 vArtWorld; varying vec3 vArtNormal; uniform float artScale;",
      );
      shader.fragmentShader = shader.fragmentShader.replace(
        "#include <map_fragment>",
        `
        vec3 weights=pow(abs(normalize(vArtNormal)),vec3(6.0));weights/=max(dot(weights,vec3(1.0)),.001);
        vec3 p=vArtWorld*artScale;
        vec4 texel=texture2D(map,p.zy)*weights.x+texture2D(map,p.xz)*weights.y+texture2D(map,p.xy)*weights.z;
        diffuseColor*=texel;
      `,
      );
    };
    material.customProgramCacheKey = () => kind + scale;
    this.materials.set(key, material);
    return material;
  }
}
