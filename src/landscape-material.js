import * as THREE from "three";
import { addSurfaceRelief } from "./surface-detail.js";

// Terrain has one colour transform. Grass, dry soil and rock are separate
// surfaces, rather than three dark colours multiplied into the same photo.
export function landscapeMaterial(art) {
  const material = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    roughness: 1,
  });
  material.onBeforeCompile = (shader) => {
    shader.uniforms.landRock = { value: art.texture("stone") };
    shader.uniforms.landSand = { value: art.texture("sand") };
    shader.uniforms.landGrass = { value: art.texture("grass") };
    shader.vertexShader = shader.vertexShader.replace(
      "#include <common>",
      "#include <common>\nattribute float verge; varying float vVerge; varying vec3 vLand; varying vec3 vSlope;",
    );
    shader.vertexShader = shader.vertexShader.replace(
      "#include <begin_vertex>",
      "#include <begin_vertex>\nvLand=(modelMatrix*vec4(transformed,1.)).xyz; vSlope=normalize(mat3(modelMatrix)*normal); vVerge=verge;",
    );
    shader.fragmentShader = shader.fragmentShader.replace(
      "#include <common>",
      `
      #include <common>
      uniform sampler2D landRock; uniform sampler2D landSand; uniform sampler2D landGrass;
      varying float vVerge; varying vec3 vLand; varying vec3 vSlope;
      float landHash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
      float landNoise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);
        return mix(mix(landHash(i),landHash(i+vec2(1.,0.)),f.x),
          mix(landHash(i+vec2(0.,1.)),landHash(i+vec2(1.)),f.x),f.y);}
    `,
    );
    shader.fragmentShader = shader.fragmentShader.replace(
      "#include <map_fragment>",
      `
      vec2 p=vLand.xz;
      float large=landNoise(p*.016)*.65+landNoise(p*.043+17.)*.35;
      float fine=landNoise(p*2.3)*.6+landNoise(p*7.1)*.4;
      // Linear-light palette: sage green, sunlit meadow, warm dry-earth pockets.
      vec3 grass=mix(vec3(.045,.095,.038),vec3(.135,.20,.065),large);
      float grassGrain=texture2D(landGrass,p*.35).r*.62+
        texture2D(landGrass,mat2(.8,-.6,.6,.8)*p*1.7).r*.38;
      grass*=.81+fine*.12+grassGrain*.34;
      float dry=smoothstep(.57,.79,landNoise(p*.067+landNoise(p*.021)*3.));
      vec3 soil=mix(vec3(.23,.205,.145),vec3(.31,.275,.195),large);
      grass=mix(grass,soil,dry*.34);
      grass=mix(soil,grass,smoothstep(.1,.9,vVerge));
      float rock=smoothstep(.2,.61,1.-normalize(vSlope).y);
      vec3 weights=pow(abs(normalize(vSlope)),vec3(4.));weights/=dot(weights,vec3(1.));
      vec3 r=texture2D(landRock,vLand.zy*.14).rgb*weights.x+
        texture2D(landRock,vLand.xz*.14).rgb*weights.y+
        texture2D(landRock,vLand.xy*.14).rgb*weights.z;
      float strata=.96+.04*sin(vLand.y*1.8+landNoise(p*.045)*9.);
      vec3 limestone=vec3(.46,.435,.365)*mix(vec3(.72),r*1.5,.42)*strata;
      vec3 terrain=mix(grass,limestone,rock);
      float coast=1.-smoothstep(.4,5.5,vLand.y+landNoise(p*.08)*1.8);
      float sandGrain=texture2D(landSand,p*.38).r;
      vec3 sand=vec3(.49,.43,.32)*(.88+sandGrain*.28);
      float terrainGrain=mix(mix(grassGrain,dot(r,vec3(.333)),rock),sandGrain,coast*(1.-rock));
      diffuseColor.rgb=mix(terrain,sand,coast*(1.-rock));
    `,
    );
    addSurfaceRelief(shader, "terrainGrain", 0.014);
  };
  material.customProgramCacheKey = () => "landscape-layers-v2";
  return material;
}
