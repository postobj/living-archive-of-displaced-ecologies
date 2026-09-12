import type { GlassProfile } from "./glass";

export interface SampledGlassOpaqueColor {
  r: number;
  g: number;
  b: number;
}

export interface SampledGlassColor extends SampledGlassOpaqueColor {
  a: number;
}

export interface SampledGlassRect {
  left: number;
  top: number;
  width: number;
  height: number;
}

export interface SampledGlassRenderSizeOptions {
  width: number;
  height: number;
  devicePixelRatio: number;
  maxDevicePixelRatio?: number;
}

export interface SampledGlassSourceRectOptions {
  lensRect: SampledGlassRect;
  sourceRect: SampledGlassRect;
  sourcePixelWidth: number;
  sourcePixelHeight: number;
  scale: number;
  shiftX: number;
  shiftY: number;
  sampleBleed?: number;
}

export interface SampledGlassSourceRect {
  sourceX: number;
  sourceY: number;
  sourceWidth: number;
  sourceHeight: number;
}

export interface SampledGlassRenderSize {
  cssWidth: number;
  cssHeight: number;
  pixelWidth: number;
  pixelHeight: number;
  devicePixelRatio: number;
}

export interface SampledGlassFieldPoint {
  x: number;
  y: number;
}

export interface SampledGlassFieldUniforms {
  fieldModel: number;
  dispersionMode: number;
  sideRadialDispersionMix: number;
  sampleBleed: number;
  arcBandOffset: number;
  arcBandWidth: number;
  sideFalloff: number;
  dispersionBias: number;
  rimCenter: number;
  rimWidth: number;
  centerRefraction: number;
  rimRefraction: number;
  rimDispersion: number;
  rimGlow: number;
}

export interface SampledGlassFieldEvaluation {
  radius: number;
  refractionWeight: number;
  dispersionWeight: number;
  directionX: number;
  directionY: number;
  dispersionDirectionX: number;
  dispersionDirectionY: number;
}

export function getSampledGlassElementRect(
  element: HTMLElement,
): SampledGlassRect {
  const rect = element.getBoundingClientRect();
  const width = element.offsetWidth || rect.width;
  const height = element.offsetHeight || rect.height;

  return {
    left: rect.left + (rect.width - width) / 2,
    top: rect.top + (rect.height - height) / 2,
    width,
    height,
  };
}

interface DrawSampledGlassOptions {
  canvas: HTMLCanvasElement;
  sourceCanvas: HTMLCanvasElement;
  lensRect: SampledGlassRect;
  sourceRect: SampledGlassRect;
  profile: GlassProfile;
  backdropColor?: SampledGlassOpaqueColor;
  refractionScale?: number;
  dispersionScale?: number;
  highlightScale?: number;
  fillScale?: number;
  maxDevicePixelRatio?: number;
}

interface SampledGlassRuntime {
  context: WebGLRenderingContext;
  program: WebGLProgram;
  positionBuffer: WebGLBuffer;
  texture: WebGLTexture;
  positionLocation: number;
  uniforms: {
    texture: WebGLUniformLocation | null;
    sourceOrigin: WebGLUniformLocation | null;
    sourceSize: WebGLUniformLocation | null;
    resolution: WebGLUniformLocation | null;
    refraction: WebGLUniformLocation | null;
    dispersion: WebGLUniformLocation | null;
    lightVector: WebGLUniformLocation | null;
    lightIntensity: WebGLUniformLocation | null;
    fillOpacity: WebGLUniformLocation | null;
    edgeSoftness: WebGLUniformLocation | null;
    backdropColor: WebGLUniformLocation | null;
    fieldModel: WebGLUniformLocation | null;
    dispersionMode: WebGLUniformLocation | null;
    sideRadialDispersionMix: WebGLUniformLocation | null;
    arcBandOffset: WebGLUniformLocation | null;
    arcBandWidth: WebGLUniformLocation | null;
    sideFalloff: WebGLUniformLocation | null;
    dispersionBias: WebGLUniformLocation | null;
    rimCenter: WebGLUniformLocation | null;
    rimWidth: WebGLUniformLocation | null;
    centerRefraction: WebGLUniformLocation | null;
    rimRefraction: WebGLUniformLocation | null;
    rimDispersion: WebGLUniformLocation | null;
    rimGlow: WebGLUniformLocation | null;
  };
}

const sampledGlassRuntimes = new WeakMap<
  HTMLCanvasElement,
  SampledGlassRuntime
>();

const vertexShaderSource = `
attribute vec2 a_position;
varying vec2 v_uv;

void main() {
  v_uv = (a_position + 1.0) * 0.5;
  gl_Position = vec4(a_position, 0.0, 1.0);
}
`;

export const sampledGlassFragmentShaderSource = `
precision mediump float;

uniform sampler2D u_texture;
uniform vec2 u_source_origin;
uniform vec2 u_source_size;
uniform vec2 u_resolution;
uniform float u_refraction;
uniform float u_dispersion;
uniform vec2 u_light_vector;
uniform float u_light_intensity;
uniform float u_fill_opacity;
uniform float u_edge_softness;
uniform vec3 u_backdrop_color;
uniform float u_field_model;
uniform float u_dispersion_mode;
uniform float u_side_radial_dispersion_mix;
uniform float u_arc_band_offset;
uniform float u_arc_band_width;
uniform float u_side_falloff;
uniform float u_dispersion_bias;
uniform float u_rim_center;
uniform float u_rim_width;
uniform float u_center_refraction;
uniform float u_rim_refraction;
uniform float u_rim_dispersion;
uniform float u_rim_glow;

varying vec2 v_uv;

vec3 compositeSample(vec4 sampleColor) {
  return sampleColor.rgb + (1.0 - sampleColor.a) * u_backdrop_color;
}

vec2 safeNormalize(vec2 value) {
  float magnitude = length(value);

  if (magnitude <= 0.0001) {
    return vec2(0.0);
  }

  return value / magnitude;
}

float safeSign(float value) {
  return value < 0.0 ? -1.0 : 1.0;
}

void main() {
  vec2 centered = v_uv * 2.0 - 1.0;
  vec2 ellipse = u_field_model > 1.5
    ? centered
    : vec2(centered.x, centered.y * 1.1);
  float radius = clamp(length(ellipse), 0.0, 1.0);
  float edge = smoothstep(0.12, 0.96, radius);
  float rim = smoothstep(0.58, 1.02, radius);
  vec2 radialDirection = safeNormalize(ellipse);
  vec2 refractionDirection = radialDirection;
  vec2 dispersionDirection = radialDirection;
  float refractionWeight = pow(edge, 1.85);
  float dispersionWeight = pow(edge, 2.15);
  float glint = 0.0;
  float fill = u_fill_opacity * (0.18 + rim * 0.22);

  if (u_field_model > 1.5) {
    float rimOuter = min(1.02, u_rim_center + u_rim_width);
    float normalizedRadius = clamp(radius / max(rimOuter, 0.001), 0.0, 0.999);
    float sphereHeight = sqrt(max(0.0, 1.0 - normalizedRadius * normalizedRadius));
    float sphereSlope = normalizedRadius / max(sphereHeight, 0.18);
    float sphereField = 1.0 - exp(-0.75 * sphereSlope);
    float wholeField = pow(
      mix(pow(normalizedRadius, 1.9), sphereField, 0.55),
      1.65
    );
    float boundaryFade = 1.0 - smoothstep(
      rimOuter + u_rim_width * 0.6,
      1.0,
      radius
    );
    float edgeLift = smoothstep(
      max(0.0, u_rim_center - u_rim_width * 1.15),
      rimOuter,
      radius
    );
    float unifiedField = wholeField * boundaryFade;
    float verticalArc = 0.92 + 0.16 * smoothstep(0.12, 0.96, abs(centered.y));
    float fresnel = pow(clamp(radius, 0.0, 1.0), 3.8);
    vec2 tangentDirection = safeNormalize(vec2(-radialDirection.y, radialDirection.x));
    float sideMask = smoothstep(0.18, 0.92, abs(centered.x));
    float sideRimWeight = pow(edgeLift, 0.5);
    float tangentToRadialBlend = clamp(
      u_side_radial_dispersion_mix * sideMask * sideRimWeight,
      0.0,
      1.0
    );

    refractionWeight =
      u_center_refraction + unifiedField * u_rim_refraction * verticalArc;
    dispersionWeight =
      pow(unifiedField, 1.35) *
      mix(0.18, u_rim_dispersion, edgeLift) *
      u_dispersion_bias;
    dispersionDirection =
      u_dispersion_mode > 0.5
        ? safeNormalize(mix(tangentDirection, radialDirection, tangentToRadialBlend))
        : radialDirection;
    glint =
      (pow(unifiedField, 0.95) * 0.44 + fresnel * 0.18) *
      u_light_intensity *
      u_rim_glow;
    fill = u_fill_opacity * (0.045 + unifiedField * 0.04 + fresnel * 0.02);
  } else if (u_field_model > 0.5) {
    float bandCenter = u_arc_band_offset - 0.3 * centered.x * centered.x;
    float bandDistance = abs(abs(centered.y) - bandCenter);
    float band = 1.0 - smoothstep(
      u_arc_band_width,
      u_arc_band_width + 0.12,
      bandDistance
    );
    float sideFade = 1.0 - smoothstep(u_side_falloff, 0.98, abs(centered.x));
    float verticalLift = smoothstep(0.28, 0.9, abs(centered.y));
    float arcWeight = pow(band, 1.12) * sideFade * verticalLift * edge;
    vec2 arcNormal = safeNormalize(
      vec2(0.6 * centered.x, safeSign(centered.y) * (1.0 + 0.3 * bandCenter))
    );
    float blend = clamp(arcWeight * 1.65, 0.0, 1.0);

    refractionDirection = safeNormalize(mix(radialDirection, arcNormal, blend));
    dispersionDirection = refractionDirection;
    refractionWeight = max(pow(edge, 2.25) * 0.14, pow(arcWeight, 1.26));
    dispersionWeight = pow(arcWeight, 1.72) * u_dispersion_bias;
  }

  float bend = refractionWeight * u_refraction * (u_field_model > 1.5 ? 0.05 : 0.085);
  vec2 offset = refractionDirection * bend;
  float dispersionScale = u_field_model > 1.5 ? 0.019 : (u_field_model > 0.5 ? 0.014 : 0.02);
  vec2 channelOffset = dispersionDirection * dispersionWeight * u_dispersion * dispersionScale;

  vec2 sampleUv = clamp(v_uv + offset, 0.0, 1.0);
  vec2 redSampleUv = clamp(sampleUv - channelOffset, 0.0, 1.0);
  vec2 blueSampleUv = clamp(sampleUv + channelOffset, 0.0, 1.0);
  vec2 redSourceUv = vec2(redSampleUv.x, 1.0 - redSampleUv.y);
  vec2 greenSourceUv = vec2(sampleUv.x, 1.0 - sampleUv.y);
  vec2 blueSourceUv = vec2(blueSampleUv.x, 1.0 - blueSampleUv.y);
  vec2 redUv = u_source_origin + redSourceUv * u_source_size;
  vec2 greenUv = u_source_origin + greenSourceUv * u_source_size;
  vec2 blueUv = u_source_origin + blueSourceUv * u_source_size;

  vec4 redSample = texture2D(u_texture, redUv);
  vec4 greenSample = texture2D(u_texture, greenUv);
  vec4 blueSample = texture2D(u_texture, blueUv);
  vec3 color = vec3(
    compositeSample(redSample).r,
    compositeSample(greenSample).g,
    compositeSample(blueSample).b
  );

  if (u_field_model <= 1.5) {
    float diagonal = dot(normalize(vec2(centered.x, -centered.y)), normalize(u_light_vector));
    glint = pow(max(0.0, diagonal * 0.5 + 0.5), 6.0) * rim * u_light_intensity;
  }

  color = mix(color, vec3(1.0), fill);
  color += vec3(glint * (u_field_model > 1.5 ? 0.18 : 0.24));

  float alpha = 1.0 - smoothstep(1.0 - u_edge_softness, 1.04, radius);
  gl_FragColor = vec4(color, alpha);
}
`;

function clamp(value: number, minimum: number, maximum: number) {
  return Math.min(maximum, Math.max(minimum, value));
}

function mix(start: number, end: number, amount: number) {
  return start + (end - start) * amount;
}

function smoothstep(minimum: number, maximum: number, value: number) {
  if (minimum === maximum) {
    return value < minimum ? 0 : 1;
  }

  const progress = clamp((value - minimum) / (maximum - minimum), 0, 1);
  return progress * progress * (3 - 2 * progress);
}

function normalizeVector(x: number, y: number) {
  const magnitude = Math.hypot(x, y);

  if (magnitude <= 0.0001) {
    return { x: 0, y: 0 };
  }

  return { x: x / magnitude, y: y / magnitude };
}

function roundSampledGlassChannel(value: number) {
  return Number(clamp(value, 0, 1).toFixed(4));
}

export function getSampledGlassFieldUniforms(
  profile: GlassProfile,
): SampledGlassFieldUniforms {
  return {
    fieldModel:
      profile.fieldModel === "symmetricArc"
        ? 1
        : profile.fieldModel === "sphericalRim"
          ? 2
          : 0,
    dispersionMode: profile.dispersionMode === "tangentRim" ? 1 : 0,
    sideRadialDispersionMix: clamp(profile.sideRadialDispersionMix ?? 0, 0, 1),
    sampleBleed: clamp(profile.sampleBleed ?? 0, 0, 0.25),
    arcBandOffset: clamp(profile.arcBandOffset, 0.2, 0.92),
    arcBandWidth: clamp(profile.arcBandWidth, 0.08, 0.48),
    sideFalloff: clamp(profile.sideFalloff, 0.08, 0.88),
    dispersionBias: clamp(profile.dispersionBias, 0.4, 1.8),
    rimCenter: clamp(profile.rimCenter ?? 0.7, 0.35, 0.92),
    rimWidth: clamp(profile.rimWidth ?? 0.16, 0.04, 0.32),
    centerRefraction: clamp(profile.centerRefraction ?? 0.08, 0, 0.8),
    rimRefraction: clamp(profile.rimRefraction ?? 1, 0, 2.5),
    rimDispersion: clamp(profile.rimDispersion ?? 1, 0, 2.5),
    rimGlow: clamp(profile.rimGlow ?? 0.5, 0, 1.5),
  };
}

export function evaluateSampledGlassField(
  point: SampledGlassFieldPoint,
  profile: GlassProfile,
): SampledGlassFieldEvaluation {
  const centeredX = clamp(point.x, -1.2, 1.2);
  const centeredY = clamp(point.y, -1.2, 1.2);
  const fieldUniforms = getSampledGlassFieldUniforms(profile);
  const ellipseX = centeredX;
  const ellipseY = fieldUniforms.fieldModel > 1.5 ? centeredY : centeredY * 1.1;
  const radius = clamp(Math.hypot(ellipseX, ellipseY), 0, 1);
  const edge = smoothstep(0.12, 0.96, radius);
  const radialDirection = normalizeVector(ellipseX, ellipseY);

  if (fieldUniforms.fieldModel < 0.5) {
    return {
      radius,
      refractionWeight: Math.pow(edge, 1.85),
      dispersionWeight: Math.pow(edge, 2.15),
      directionX: radialDirection.x,
      directionY: radialDirection.y,
      dispersionDirectionX: radialDirection.x,
      dispersionDirectionY: radialDirection.y,
    };
  }

  if (fieldUniforms.fieldModel > 1.5) {
    const rimOuter = Math.min(
      1.02,
      fieldUniforms.rimCenter + fieldUniforms.rimWidth,
    );
    const normalizedRadius = clamp(
      radius / Math.max(rimOuter, 0.001),
      0,
      0.999,
    );
    const sphereHeight = Math.sqrt(
      Math.max(0, 1 - normalizedRadius * normalizedRadius),
    );
    const sphereSlope = normalizedRadius / Math.max(sphereHeight, 0.18);
    const sphereField = 1 - Math.exp(-0.75 * sphereSlope);
    const wholeField = Math.pow(
      mix(Math.pow(normalizedRadius, 1.9), sphereField, 0.55),
      1.65,
    );
    const boundaryFade =
      1 - smoothstep(rimOuter + fieldUniforms.rimWidth * 0.6, 1, radius);
    const edgeLift = smoothstep(
      Math.max(0, fieldUniforms.rimCenter - fieldUniforms.rimWidth * 1.15),
      rimOuter,
      radius,
    );
    const unifiedField = wholeField * boundaryFade;
    const verticalArc =
      0.92 + 0.16 * smoothstep(0.12, 0.96, Math.abs(centeredY));
    const tangentDirection = normalizeVector(
      -radialDirection.y,
      radialDirection.x,
    );
    const sideMask = smoothstep(0.18, 0.92, Math.abs(centeredX));
    const sideRimWeight = Math.pow(edgeLift, 0.5);
    const tangentToRadialBlend = clamp(
      fieldUniforms.sideRadialDispersionMix * sideMask * sideRimWeight,
      0,
      1,
    );
    const dispersionDirection =
      fieldUniforms.dispersionMode > 0.5
        ? normalizeVector(
            mix(tangentDirection.x, radialDirection.x, tangentToRadialBlend),
            mix(tangentDirection.y, radialDirection.y, tangentToRadialBlend),
          )
        : radialDirection;

    return {
      radius,
      refractionWeight:
        fieldUniforms.centerRefraction +
        unifiedField * fieldUniforms.rimRefraction * verticalArc,
      dispersionWeight:
        Math.pow(unifiedField, 1.35) *
        mix(0.18, fieldUniforms.rimDispersion, edgeLift) *
        fieldUniforms.dispersionBias,
      directionX: radialDirection.x,
      directionY: radialDirection.y,
      dispersionDirectionX: dispersionDirection.x,
      dispersionDirectionY: dispersionDirection.y,
    };
  }

  const bandCenter = fieldUniforms.arcBandOffset - 0.3 * centeredX * centeredX;
  const bandDistance = Math.abs(Math.abs(centeredY) - bandCenter);
  const band =
    1 -
    smoothstep(
      fieldUniforms.arcBandWidth,
      fieldUniforms.arcBandWidth + 0.12,
      bandDistance,
    );
  const sideFade =
    1 - smoothstep(fieldUniforms.sideFalloff, 0.98, Math.abs(centeredX));
  const verticalLift = smoothstep(0.28, 0.9, Math.abs(centeredY));
  const arcWeight = Math.pow(band, 1.12) * sideFade * verticalLift * edge;
  const arcNormal = normalizeVector(
    0.6 * centeredX,
    (centeredY < 0 ? -1 : 1) * (1 + 0.3 * bandCenter),
  );
  const blend = clamp(arcWeight * 1.65, 0, 1);
  const direction = normalizeVector(
    mix(radialDirection.x, arcNormal.x, blend),
    mix(radialDirection.y, arcNormal.y, blend),
  );

  return {
    radius,
    refractionWeight: Math.max(
      Math.pow(edge, 2.25) * 0.14,
      Math.pow(arcWeight, 1.26),
    ),
    dispersionWeight: Math.pow(arcWeight, 1.72) * fieldUniforms.dispersionBias,
    directionX: direction.x,
    directionY: direction.y,
    dispersionDirectionX: direction.x,
    dispersionDirectionY: direction.y,
  };
}

export function compositeSampledGlassColor(
  sampleColor: SampledGlassColor,
  backdropColor: SampledGlassOpaqueColor,
): SampledGlassOpaqueColor {
  const alpha = clamp(sampleColor.a, 0, 1);

  return {
    r: roundSampledGlassChannel(sampleColor.r + backdropColor.r * (1 - alpha)),
    g: roundSampledGlassChannel(sampleColor.g + backdropColor.g * (1 - alpha)),
    b: roundSampledGlassChannel(sampleColor.b + backdropColor.b * (1 - alpha)),
  };
}

export function parseSampledGlassCssColor(
  value: string,
): SampledGlassColor | null {
  const normalizedValue = value.trim().toLowerCase();

  if (!normalizedValue || normalizedValue === "transparent") {
    return { r: 0, g: 0, b: 0, a: 0 };
  }

  // Handles both legacy comma syntax (rgb(r, g, b)) and CSS Color Level 4
  // space-with-slash syntax (rgb(r g b / a)) returned by getComputedStyle in
  // modern Chrome.
  const rgbMatch = normalizedValue.match(
    /^rgba?\(([\d.]+)[,\s]+([\d.]+)[,\s]+([\d.]+)(?:\s*[,/]\s*([\d.]+))?\)$/,
  );

  if (rgbMatch) {
    return {
      r: clamp(Number(rgbMatch[1]) / 255, 0, 1),
      g: clamp(Number(rgbMatch[2]) / 255, 0, 1),
      b: clamp(Number(rgbMatch[3]) / 255, 0, 1),
      a: rgbMatch[4] === undefined ? 1 : clamp(Number(rgbMatch[4]), 0, 1),
    };
  }

  const hexMatch = normalizedValue.match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/i);

  if (hexMatch) {
    const hex =
      hexMatch[1].length === 3
        ? hexMatch[1]
            .split("")
            .map((part) => `${part}${part}`)
            .join("")
        : hexMatch[1];

    return {
      r: Number.parseInt(hex.slice(0, 2), 16) / 255,
      g: Number.parseInt(hex.slice(2, 4), 16) / 255,
      b: Number.parseInt(hex.slice(4, 6), 16) / 255,
      a: 1,
    };
  }

  return null;
}

function toSampledGlassCssColor(color: SampledGlassOpaqueColor) {
  return `rgb(${Math.round(clamp(color.r, 0, 1) * 255)}, ${Math.round(
    clamp(color.g, 0, 1) * 255,
  )}, ${Math.round(clamp(color.b, 0, 1) * 255)})`;
}

function resolveOpaqueBackdropColor(
  colorValue: string,
): SampledGlassOpaqueColor | null {
  const parsedColor = parseSampledGlassCssColor(colorValue);

  if (!parsedColor || parsedColor.a <= 0) {
    return null;
  }

  return compositeSampledGlassColor(parsedColor, { r: 1, g: 1, b: 1 });
}

export function resolveSampledGlassBackdropColor(
  element: HTMLElement | null,
): string {
  if (typeof window === "undefined") {
    return "rgb(255, 255, 255)";
  }

  let current: HTMLElement | null = element;

  while (current) {
    const resolvedColor = resolveOpaqueBackdropColor(
      window.getComputedStyle(current).backgroundColor,
    );

    if (resolvedColor) {
      return toSampledGlassCssColor(resolvedColor);
    }

    current = current.parentElement;
  }

  const bodyColor = resolveOpaqueBackdropColor(
    window.getComputedStyle(document.body).backgroundColor,
  );

  if (bodyColor) {
    return toSampledGlassCssColor(bodyColor);
  }

  const rootColor = resolveOpaqueBackdropColor(
    window.getComputedStyle(document.documentElement).backgroundColor,
  );

  if (rootColor) {
    return toSampledGlassCssColor(rootColor);
  }

  return "rgb(255, 255, 255)";
}

function compileShader(
  context: WebGLRenderingContext,
  type: number,
  source: string,
) {
  const shader = context.createShader(type);

  if (!shader) {
    return null;
  }

  context.shaderSource(shader, source);
  context.compileShader(shader);

  if (context.getShaderParameter(shader, context.COMPILE_STATUS)) {
    return shader;
  }

  context.deleteShader(shader);
  return null;
}

function createProgram(context: WebGLRenderingContext) {
  const vertexShader = compileShader(
    context,
    context.VERTEX_SHADER,
    vertexShaderSource,
  );
  const fragmentShader = compileShader(
    context,
    context.FRAGMENT_SHADER,
    sampledGlassFragmentShaderSource,
  );

  if (!vertexShader || !fragmentShader) {
    return null;
  }

  const program = context.createProgram();

  if (!program) {
    context.deleteShader(vertexShader);
    context.deleteShader(fragmentShader);
    return null;
  }

  context.attachShader(program, vertexShader);
  context.attachShader(program, fragmentShader);
  context.linkProgram(program);
  context.deleteShader(vertexShader);
  context.deleteShader(fragmentShader);

  if (context.getProgramParameter(program, context.LINK_STATUS)) {
    return program;
  }

  context.deleteProgram(program);
  return null;
}

function createSampledGlassRuntime(
  canvas: HTMLCanvasElement,
): SampledGlassRuntime | null {
  const context = canvas.getContext("webgl", {
    alpha: true,
    antialias: true,
    premultipliedAlpha: true,
  });

  if (!context) {
    return null;
  }

  const program = createProgram(context);

  if (!program) {
    return null;
  }

  const positionBuffer = context.createBuffer();
  const texture = context.createTexture();

  if (!positionBuffer || !texture) {
    context.deleteProgram(program);
    return null;
  }

  context.bindBuffer(context.ARRAY_BUFFER, positionBuffer);
  context.bufferData(
    context.ARRAY_BUFFER,
    new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]),
    context.STATIC_DRAW,
  );

  context.bindTexture(context.TEXTURE_2D, texture);
  context.texParameteri(
    context.TEXTURE_2D,
    context.TEXTURE_WRAP_S,
    context.CLAMP_TO_EDGE,
  );
  context.texParameteri(
    context.TEXTURE_2D,
    context.TEXTURE_WRAP_T,
    context.CLAMP_TO_EDGE,
  );
  context.texParameteri(
    context.TEXTURE_2D,
    context.TEXTURE_MIN_FILTER,
    context.LINEAR,
  );
  context.texParameteri(
    context.TEXTURE_2D,
    context.TEXTURE_MAG_FILTER,
    context.LINEAR,
  );

  return {
    context,
    program,
    positionBuffer,
    texture,
    positionLocation: context.getAttribLocation(program, "a_position"),
    uniforms: {
      texture: context.getUniformLocation(program, "u_texture"),
      sourceOrigin: context.getUniformLocation(program, "u_source_origin"),
      sourceSize: context.getUniformLocation(program, "u_source_size"),
      resolution: context.getUniformLocation(program, "u_resolution"),
      refraction: context.getUniformLocation(program, "u_refraction"),
      dispersion: context.getUniformLocation(program, "u_dispersion"),
      lightVector: context.getUniformLocation(program, "u_light_vector"),
      lightIntensity: context.getUniformLocation(program, "u_light_intensity"),
      fillOpacity: context.getUniformLocation(program, "u_fill_opacity"),
      edgeSoftness: context.getUniformLocation(program, "u_edge_softness"),
      backdropColor: context.getUniformLocation(program, "u_backdrop_color"),
      fieldModel: context.getUniformLocation(program, "u_field_model"),
      dispersionMode: context.getUniformLocation(program, "u_dispersion_mode"),
      sideRadialDispersionMix: context.getUniformLocation(
        program,
        "u_side_radial_dispersion_mix",
      ),
      arcBandOffset: context.getUniformLocation(program, "u_arc_band_offset"),
      arcBandWidth: context.getUniformLocation(program, "u_arc_band_width"),
      sideFalloff: context.getUniformLocation(program, "u_side_falloff"),
      dispersionBias: context.getUniformLocation(program, "u_dispersion_bias"),
      rimCenter: context.getUniformLocation(program, "u_rim_center"),
      rimWidth: context.getUniformLocation(program, "u_rim_width"),
      centerRefraction: context.getUniformLocation(
        program,
        "u_center_refraction",
      ),
      rimRefraction: context.getUniformLocation(program, "u_rim_refraction"),
      rimDispersion: context.getUniformLocation(program, "u_rim_dispersion"),
      rimGlow: context.getUniformLocation(program, "u_rim_glow"),
    },
  };
}

function getOrCreateSampledGlassRuntime(canvas: HTMLCanvasElement) {
  const existingRuntime = sampledGlassRuntimes.get(canvas);

  if (existingRuntime) {
    return existingRuntime;
  }

  const createdRuntime = createSampledGlassRuntime(canvas);

  if (!createdRuntime) {
    return null;
  }

  sampledGlassRuntimes.set(canvas, createdRuntime);
  return createdRuntime;
}

export function getSampledGlassRenderSize({
  width,
  height,
  devicePixelRatio,
  maxDevicePixelRatio = 2,
}: SampledGlassRenderSizeOptions): SampledGlassRenderSize {
  const nextWidth = Math.max(1, width);
  const nextHeight = Math.max(1, height);
  const nextDevicePixelRatio = clamp(
    devicePixelRatio || 1,
    1,
    maxDevicePixelRatio,
  );

  return {
    cssWidth: nextWidth,
    cssHeight: nextHeight,
    pixelWidth: Math.max(1, Math.round(nextWidth * nextDevicePixelRatio)),
    pixelHeight: Math.max(1, Math.round(nextHeight * nextDevicePixelRatio)),
    devicePixelRatio: nextDevicePixelRatio,
  };
}

export function getSampledGlassSourceRect({
  lensRect,
  sourceRect,
  sourcePixelWidth,
  sourcePixelHeight,
  scale,
  shiftX,
  shiftY,
  sampleBleed = 0,
}: SampledGlassSourceRectOptions): SampledGlassSourceRect {
  const ratioX = sourcePixelWidth / sourceRect.width;
  const ratioY = sourcePixelHeight / sourceRect.height;
  const centerX =
    (lensRect.left - sourceRect.left + lensRect.width / 2) * ratioX +
    shiftX * lensRect.width * ratioX;
  const centerY =
    (lensRect.top - sourceRect.top + lensRect.height / 2) * ratioY +
    shiftY * lensRect.height * ratioY;
  const bleedScale = 1 + clamp(sampleBleed, 0, 0.25) * 2;
  const sourceWidth = (lensRect.width * ratioX * bleedScale) / scale;
  const sourceHeight = (lensRect.height * ratioY * bleedScale) / scale;
  const maxSourceX = Math.max(0, sourcePixelWidth - sourceWidth);
  const maxSourceY = Math.max(0, sourcePixelHeight - sourceHeight);

  return {
    sourceX: clamp(centerX - sourceWidth / 2, 0, maxSourceX),
    sourceY: clamp(centerY - sourceHeight / 2, 0, maxSourceY),
    sourceWidth,
    sourceHeight,
  };
}

export function drawSampledGlass({
  canvas,
  sourceCanvas,
  lensRect,
  sourceRect,
  profile,
  backdropColor = { r: 1, g: 1, b: 1 },
  refractionScale = 1,
  dispersionScale = 1,
  highlightScale = 1,
  fillScale = 1,
  maxDevicePixelRatio = 2,
}: DrawSampledGlassOptions) {
  if (
    lensRect.width <= 0 ||
    lensRect.height <= 0 ||
    sourceRect.width <= 0 ||
    sourceRect.height <= 0 ||
    sourceCanvas.width <= 0 ||
    sourceCanvas.height <= 0
  ) {
    return false;
  }

  const runtime = getOrCreateSampledGlassRuntime(canvas);

  if (!runtime) {
    return false;
  }

  const {
    context,
    program,
    positionBuffer,
    texture,
    positionLocation,
    uniforms,
  } = runtime;
  const renderSize = getSampledGlassRenderSize({
    width: lensRect.width,
    height: lensRect.height,
    devicePixelRatio: window.devicePixelRatio || 1,
    maxDevicePixelRatio,
  });
  const fieldUniforms = getSampledGlassFieldUniforms(profile);
  const sourceSampleRect = getSampledGlassSourceRect({
    lensRect,
    sourceRect,
    sourcePixelWidth: sourceCanvas.width,
    sourcePixelHeight: sourceCanvas.height,
    scale: profile.scale,
    shiftX: profile.shiftX,
    shiftY: profile.shiftY,
    sampleBleed: profile.sampleBleed ?? 0,
  });

  if (
    canvas.width !== renderSize.pixelWidth ||
    canvas.height !== renderSize.pixelHeight
  ) {
    canvas.width = renderSize.pixelWidth;
    canvas.height = renderSize.pixelHeight;
    canvas.style.width = `${renderSize.cssWidth}px`;
    canvas.style.height = `${renderSize.cssHeight}px`;
  }

  context.viewport(0, 0, canvas.width, canvas.height);
  context.clearColor(0, 0, 0, 0);
  context.clear(context.COLOR_BUFFER_BIT);
  context.useProgram(program);

  context.bindBuffer(context.ARRAY_BUFFER, positionBuffer);
  context.enableVertexAttribArray(positionLocation);
  context.vertexAttribPointer(positionLocation, 2, context.FLOAT, false, 0, 0);

  context.activeTexture(context.TEXTURE0);
  context.bindTexture(context.TEXTURE_2D, texture);
  context.pixelStorei(context.UNPACK_PREMULTIPLY_ALPHA_WEBGL, 1);
  context.texImage2D(
    context.TEXTURE_2D,
    0,
    context.RGBA,
    context.RGBA,
    context.UNSIGNED_BYTE,
    sourceCanvas,
  );

  context.uniform1i(uniforms.texture, 0);
  context.uniform2f(
    uniforms.sourceOrigin,
    sourceSampleRect.sourceX / sourceCanvas.width,
    sourceSampleRect.sourceY / sourceCanvas.height,
  );
  context.uniform2f(
    uniforms.sourceSize,
    sourceSampleRect.sourceWidth / sourceCanvas.width,
    sourceSampleRect.sourceHeight / sourceCanvas.height,
  );
  context.uniform2f(uniforms.resolution, canvas.width, canvas.height);
  context.uniform1f(
    uniforms.refraction,
    Math.max(0, profile.refraction * refractionScale),
  );
  context.uniform1f(
    uniforms.dispersion,
    Math.max(0, profile.dispersion * dispersionScale),
  );
  context.uniform2f(
    uniforms.lightVector,
    Math.cos((profile.lightAngleDeg * Math.PI) / 180),
    Math.sin((profile.lightAngleDeg * Math.PI) / 180),
  );
  context.uniform1f(
    uniforms.lightIntensity,
    Math.max(0, profile.lightIntensity * highlightScale),
  );
  context.uniform1f(
    uniforms.fillOpacity,
    Math.max(0, profile.fillOpacity * fillScale),
  );
  context.uniform1f(uniforms.edgeSoftness, 0.06);
  context.uniform3f(
    uniforms.backdropColor,
    clamp(backdropColor.r, 0, 1),
    clamp(backdropColor.g, 0, 1),
    clamp(backdropColor.b, 0, 1),
  );
  context.uniform1f(uniforms.fieldModel, fieldUniforms.fieldModel);
  context.uniform1f(uniforms.dispersionMode, fieldUniforms.dispersionMode);
  context.uniform1f(
    uniforms.sideRadialDispersionMix,
    fieldUniforms.sideRadialDispersionMix,
  );
  context.uniform1f(uniforms.arcBandOffset, fieldUniforms.arcBandOffset);
  context.uniform1f(uniforms.arcBandWidth, fieldUniforms.arcBandWidth);
  context.uniform1f(uniforms.sideFalloff, fieldUniforms.sideFalloff);
  context.uniform1f(uniforms.dispersionBias, fieldUniforms.dispersionBias);
  context.uniform1f(uniforms.rimCenter, fieldUniforms.rimCenter);
  context.uniform1f(uniforms.rimWidth, fieldUniforms.rimWidth);
  context.uniform1f(uniforms.centerRefraction, fieldUniforms.centerRefraction);
  context.uniform1f(uniforms.rimRefraction, fieldUniforms.rimRefraction);
  context.uniform1f(uniforms.rimDispersion, fieldUniforms.rimDispersion);
  context.uniform1f(uniforms.rimGlow, fieldUniforms.rimGlow);
  context.drawArrays(context.TRIANGLE_STRIP, 0, 4);

  return true;
}

export function releaseSampledGlass(canvas: HTMLCanvasElement) {
  const runtime = sampledGlassRuntimes.get(canvas);

  if (!runtime) {
    return;
  }

  runtime.context.deleteTexture(runtime.texture);
  runtime.context.deleteBuffer(runtime.positionBuffer);
  runtime.context.deleteProgram(runtime.program);
  sampledGlassRuntimes.delete(canvas);
}
