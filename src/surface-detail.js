// A small derivative bump from a height already sampled in the colour pass.
// Keeps native Three lighting/shadows and avoids more texture fetches or render passes.
export function addSurfaceRelief(shader, expression, amount) {
  shader.fragmentShader = shader.fragmentShader.replace(
    "#include <normal_fragment_maps>",
    `#include <normal_fragment_maps>
    float surfaceHeight=(${expression})*${Number(amount).toFixed(5)};
    vec3 surfaceDX=dFdx(-vViewPosition),surfaceDY=dFdy(-vViewPosition);
    vec3 surfaceR1=cross(surfaceDY,normal),surfaceR2=cross(normal,surfaceDX);
    float surfaceDet=dot(surfaceDX,surfaceR1);
    vec3 surfaceGrad=dFdx(surfaceHeight)*surfaceR1+dFdy(surfaceHeight)*surfaceR2;
    normal=normalize(max(abs(surfaceDet),1e-8)*normal-sign(surfaceDet)*surfaceGrad);
    `,
  );
}
