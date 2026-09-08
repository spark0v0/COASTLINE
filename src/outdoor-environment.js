import * as THREE from "three";

// Reflection capture uses open sky and a ground hemisphere, not a white room.
export function outdoorEnvironment(renderer) {
  const scene = new THREE.Scene();
  const material = new THREE.ShaderMaterial({
    side: THREE.BackSide,
    vertexShader:
      "varying vec3 ray;void main(){ray=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}",
    fragmentShader: `varying vec3 ray;void main(){
      vec3 d=normalize(ray);
      vec3 sky=mix(vec3(.58,.70,.76),vec3(.13,.36,.60),pow(max(d.y,0.),.48));
      vec3 ground=mix(vec3(.16,.20,.105),vec3(.39,.38,.27),pow(1.-max(-d.y,0.),5.));
      vec3 c=mix(ground,sky,smoothstep(-.03,.05,d.y));
      float sun=pow(max(dot(d,normalize(vec3(-.7,.54,.47))),0.),800.);
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
