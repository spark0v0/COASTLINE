import * as THREE from "three";
import { SUN_DIRECTION, DAYLIGHT } from "./daylight.js";

// Reflection capture uses open sky and a ground hemisphere, not a white room.
export function outdoorEnvironment(renderer) {
  const scene = new THREE.Scene();
  const material = new THREE.ShaderMaterial({
    side: THREE.BackSide,
    uniforms: {
      sunDirection: { value: SUN_DIRECTION },
      skyTop: { value: new THREE.Color(DAYLIGHT.skyTop) },
      horizon: { value: new THREE.Color(DAYLIGHT.horizon) },
    },
    vertexShader:
      "varying vec3 ray;void main(){ray=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}",
    fragmentShader: `varying vec3 ray;uniform vec3 sunDirection;uniform vec3 skyTop;uniform vec3 horizon;void main(){
      vec3 d=normalize(ray);
      vec3 sky=mix(horizon,skyTop,pow(max(d.y,0.),.48));
      vec3 ground=mix(vec3(.16,.20,.105),vec3(.39,.38,.27),pow(1.-max(-d.y,0.),5.));
      vec3 c=mix(ground,sky,smoothstep(-.03,.05,d.y));
      float sun=pow(max(dot(d,sunDirection),0.),800.);
      c+=vec3(1.,.86,.65)*sun*3.;
      gl_FragColor=vec4(c,1.);
    }`,
  });
  const geo = new THREE.SphereGeometry(30, 32, 16);
  scene.add(new THREE.Mesh(geo, material));
  const pmrem = new THREE.PMREMGenerator(renderer),
    map = pmrem.fromScene(scene, 0.035, 0.1, 100);
  geo.dispose();
  material.dispose();
  pmrem.dispose();
  return map;
}
