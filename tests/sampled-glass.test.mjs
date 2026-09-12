import assert from "node:assert/strict";
import test from "node:test";

import { GLASS_PROFILES } from "../lib/glass.ts";
import * as sampledGlass from "../lib/sampled-glass.ts";

test("getSampledGlassRenderSize clamps device pixel ratio for mobile-safe rendering", () => {
  assert.deepEqual(
    sampledGlass.getSampledGlassRenderSize({
      width: 900,
      height: 320,
      devicePixelRatio: 3,
    }),
    {
      cssWidth: 900,
      cssHeight: 320,
      pixelWidth: 1800,
      pixelHeight: 640,
      devicePixelRatio: 2,
    },
  );
});

test("getSampledGlassSourceRect maps a lens rect into source-canvas sampling coordinates", () => {
  const sourceRect = sampledGlass.getSampledGlassSourceRect({
    lensRect: { left: 300, top: 150, width: 200, height: 100 },
    sourceRect: { left: 100, top: 50, width: 800, height: 400 },
    sourcePixelWidth: 1600,
    sourcePixelHeight: 800,
    scale: 1.1,
    shiftX: 0.1,
    shiftY: -0.05,
  });

  assert.equal(Number(sourceRect.sourceX.toFixed(2)), 458.18);
  assert.equal(Number(sourceRect.sourceY.toFixed(2)), 199.09);
  assert.equal(Number(sourceRect.sourceWidth.toFixed(2)), 363.64);
  assert.equal(Number(sourceRect.sourceHeight.toFixed(2)), 181.82);
});

test("getSampledGlassSourceRect clamps the sample window inside the source canvas near the edges", () => {
  const leftTop = sampledGlass.getSampledGlassSourceRect({
    lensRect: { left: 0, top: 0, width: 300, height: 200 },
    sourceRect: { left: 100, top: 50, width: 800, height: 400 },
    sourcePixelWidth: 1600,
    sourcePixelHeight: 800,
    scale: 1,
    shiftX: 0,
    shiftY: 0,
  });
  const rightBottom = sampledGlass.getSampledGlassSourceRect({
    lensRect: { left: 800, top: 350, width: 300, height: 200 },
    sourceRect: { left: 100, top: 50, width: 800, height: 400 },
    sourcePixelWidth: 1600,
    sourcePixelHeight: 800,
    scale: 1,
    shiftX: 0,
    shiftY: 0,
  });

  assert.equal(leftTop.sourceX, 0);
  assert.equal(leftTop.sourceY, 0);
  assert.equal(rightBottom.sourceX + rightBottom.sourceWidth, 1600);
  assert.equal(rightBottom.sourceY + rightBottom.sourceHeight, 800);
});

test("getSampledGlassSourceRect expands the sampled window when sample bleed is requested", () => {
  const sourceRect = sampledGlass.getSampledGlassSourceRect({
    lensRect: { left: 300, top: 150, width: 200, height: 100 },
    sourceRect: { left: 100, top: 50, width: 800, height: 400 },
    sourcePixelWidth: 1600,
    sourcePixelHeight: 800,
    scale: 1.1,
    shiftX: 0.1,
    shiftY: -0.05,
    sampleBleed: 0.1,
  });

  assert.equal(Number(sourceRect.sourceX.toFixed(2)), 421.82);
  assert.equal(Number(sourceRect.sourceY.toFixed(2)), 180.91);
  assert.equal(Number(sourceRect.sourceWidth.toFixed(2)), 436.36);
  assert.equal(Number(sourceRect.sourceHeight.toFixed(2)), 218.18);
});

test("fragment shader flips sampled lens UVs so source text stays upright", () => {
  assert.equal(typeof sampledGlass.sampledGlassFragmentShaderSource, "string");

  if (typeof sampledGlass.sampledGlassFragmentShaderSource !== "string") {
    return;
  }

  assert.match(
    sampledGlass.sampledGlassFragmentShaderSource,
    /vec2 redSourceUv = vec2\(redSampleUv\.x, 1\.0 - redSampleUv\.y\);/,
  );
  assert.match(
    sampledGlass.sampledGlassFragmentShaderSource,
    /vec2 greenSourceUv = vec2\(sampleUv\.x, 1\.0 - sampleUv\.y\);/,
  );
  assert.match(
    sampledGlass.sampledGlassFragmentShaderSource,
    /vec2 blueSourceUv = vec2\(blueSampleUv\.x, 1\.0 - blueSampleUv\.y\);/,
  );
  assert.match(
    sampledGlass.sampledGlassFragmentShaderSource,
    /uniform float u_dispersion_mode;/,
  );
  assert.match(
    sampledGlass.sampledGlassFragmentShaderSource,
    /uniform float u_side_radial_dispersion_mix;/,
  );
  assert.match(
    sampledGlass.sampledGlassFragmentShaderSource,
    /safeNormalize\(vec2\(-radialDirection\.y, radialDirection\.x\)\)/,
  );
  assert.match(
    sampledGlass.sampledGlassFragmentShaderSource,
    /vec2 channelOffset = dispersionDirection \* dispersionWeight \* u_dispersion \* dispersionScale;/,
  );
});

test("compositeSampledGlassColor resolves transparent samples against the page backdrop instead of black", () => {
  assert.equal(typeof sampledGlass.compositeSampledGlassColor, "function");

  if (typeof sampledGlass.compositeSampledGlassColor !== "function") {
    return;
  }

  assert.deepEqual(
    sampledGlass.compositeSampledGlassColor(
      { r: 0, g: 0, b: 0, a: 0 },
      { r: 1, g: 1, b: 1 },
    ),
    { r: 1, g: 1, b: 1 },
  );

  assert.deepEqual(
    sampledGlass.compositeSampledGlassColor(
      { r: 0.2, g: 0.1, b: 0.0, a: 0.25 },
      { r: 1, g: 1, b: 1 },
    ),
    { r: 0.95, g: 0.85, b: 0.75 },
  );
});

test("spherical rim field weights stay left-right and top-bottom symmetric while keeping the center gentler than the rim", () => {
  assert.equal(typeof sampledGlass.evaluateSampledGlassField, "function");

  if (typeof sampledGlass.evaluateSampledGlassField !== "function") {
    return;
  }

  const leftRim = sampledGlass.evaluateSampledGlassField(
    { x: -0.7, y: 0 },
    GLASS_PROFILES.aboutLens,
  );
  const rightRim = sampledGlass.evaluateSampledGlassField(
    { x: 0.7, y: 0 },
    GLASS_PROFILES.aboutLens,
  );
  const topRim = sampledGlass.evaluateSampledGlassField(
    { x: 0, y: -0.7 },
    GLASS_PROFILES.aboutLens,
  );
  const bottomRim = sampledGlass.evaluateSampledGlassField(
    { x: 0, y: 0.7 },
    GLASS_PROFILES.aboutLens,
  );
  const center = sampledGlass.evaluateSampledGlassField(
    { x: 0, y: 0 },
    GLASS_PROFILES.aboutLens,
  );

  assert.equal(
    Number(leftRim.refractionWeight.toFixed(4)),
    Number(rightRim.refractionWeight.toFixed(4)),
  );
  assert.equal(
    Number(leftRim.dispersionWeight.toFixed(4)),
    Number(rightRim.dispersionWeight.toFixed(4)),
  );
  assert.equal(
    Number(topRim.refractionWeight.toFixed(4)),
    Number(bottomRim.refractionWeight.toFixed(4)),
  );
  assert.equal(
    Number(topRim.dispersionWeight.toFixed(4)),
    Number(bottomRim.dispersionWeight.toFixed(4)),
  );
  assert.equal(
    Number(leftRim.dispersionWeight.toFixed(4)),
    Number(topRim.dispersionWeight.toFixed(4)),
  );
  assert.ok(center.refractionWeight < leftRim.refractionWeight);
  assert.ok(center.dispersionWeight < leftRim.dispersionWeight);
});

test("spherical rim field directions stay axis-aligned instead of drifting toward the lower right", () => {
  assert.equal(typeof sampledGlass.evaluateSampledGlassField, "function");

  if (typeof sampledGlass.evaluateSampledGlassField !== "function") {
    return;
  }

  const topRim = sampledGlass.evaluateSampledGlassField(
    { x: 0, y: -0.7 },
    GLASS_PROFILES.aboutLens,
  );
  const bottomRim = sampledGlass.evaluateSampledGlassField(
    { x: 0, y: 0.7 },
    GLASS_PROFILES.aboutLens,
  );
  const leftRim = sampledGlass.evaluateSampledGlassField(
    { x: -0.7, y: 0 },
    GLASS_PROFILES.aboutLens,
  );
  const rightRim = sampledGlass.evaluateSampledGlassField(
    { x: 0.7, y: 0 },
    GLASS_PROFILES.aboutLens,
  );
  const center = sampledGlass.evaluateSampledGlassField(
    { x: 0, y: 0 },
    GLASS_PROFILES.aboutLens,
  );

  assert.equal(topRim.directionX, 0);
  assert.equal(bottomRim.directionX, 0);
  assert.equal(leftRim.directionY, 0);
  assert.equal(rightRim.directionY, 0);
  assert.equal(center.directionX, 0);
  assert.equal(center.directionY, 0);
});

test("narrative spherical rim dispersion stays tangent around the rim", () => {
  assert.equal(typeof sampledGlass.evaluateSampledGlassField, "function");

  if (typeof sampledGlass.evaluateSampledGlassField !== "function") {
    return;
  }

  const topRim = sampledGlass.evaluateSampledGlassField(
    { x: 0, y: -0.7 },
    GLASS_PROFILES.aboutNarrativeLens,
  );
  const bottomRim = sampledGlass.evaluateSampledGlassField(
    { x: 0, y: 0.7 },
    GLASS_PROFILES.aboutNarrativeLens,
  );
  const leftRim = sampledGlass.evaluateSampledGlassField(
    { x: -0.7, y: 0 },
    GLASS_PROFILES.aboutNarrativeLens,
  );
  const rightRim = sampledGlass.evaluateSampledGlassField(
    { x: 0.7, y: 0 },
    GLASS_PROFILES.aboutNarrativeLens,
  );
  const center = sampledGlass.evaluateSampledGlassField(
    { x: 0, y: 0 },
    GLASS_PROFILES.aboutNarrativeLens,
  );

  assert.equal(topRim.dispersionDirectionX, 1);
  assert.equal(Math.abs(topRim.dispersionDirectionY), 0);
  assert.equal(bottomRim.dispersionDirectionX, -1);
  assert.equal(Math.abs(bottomRim.dispersionDirectionY), 0);
  assert.equal(Math.abs(leftRim.dispersionDirectionX), 0);
  assert.equal(leftRim.dispersionDirectionY, -1);
  assert.equal(Math.abs(rightRim.dispersionDirectionX), 0);
  assert.equal(rightRim.dispersionDirectionY, 1);
  assert.equal(Math.abs(center.dispersionDirectionX), 0);
  assert.equal(Math.abs(center.dispersionDirectionY), 0);
});

test("fixed about lens blends side-rim dispersion outward while narrative lenses stay tangent", () => {
  assert.equal(typeof sampledGlass.evaluateSampledGlassField, "function");

  if (typeof sampledGlass.evaluateSampledGlassField !== "function") {
    return;
  }

  const fixedLeftRim = sampledGlass.evaluateSampledGlassField(
    { x: -0.7, y: 0 },
    GLASS_PROFILES.aboutLens,
  );
  const fixedRightRim = sampledGlass.evaluateSampledGlassField(
    { x: 0.7, y: 0 },
    GLASS_PROFILES.aboutLens,
  );
  const storyLeftRim = sampledGlass.evaluateSampledGlassField(
    { x: -0.7, y: 0 },
    GLASS_PROFILES.aboutNarrativeLens,
  );
  const storyRightRim = sampledGlass.evaluateSampledGlassField(
    { x: 0.7, y: 0 },
    GLASS_PROFILES.aboutNarrativeLens,
  );

  assert.ok(fixedLeftRim.dispersionDirectionX < -0.25);
  assert.ok(fixedRightRim.dispersionDirectionX > 0.25);
  assert.ok(Math.abs(fixedLeftRim.dispersionDirectionY) < 0.97);
  assert.ok(Math.abs(fixedRightRim.dispersionDirectionY) < 0.97);
  assert.equal(Math.abs(storyLeftRim.dispersionDirectionX), 0);
  assert.equal(Math.abs(storyRightRim.dispersionDirectionX), 0);
  assert.equal(storyLeftRim.dispersionDirectionY, -1);
  assert.equal(storyRightRim.dispersionDirectionY, 1);
});

test("spherical rim field stays continuous from the center into the rim instead of jumping at the inner edge", () => {
  assert.equal(typeof sampledGlass.evaluateSampledGlassField, "function");

  if (typeof sampledGlass.evaluateSampledGlassField !== "function") {
    return;
  }

  const samples = [];

  for (let radius = 0; radius <= 0.85 + 0.0001; radius += 0.05) {
    samples.push(
      sampledGlass.evaluateSampledGlassField(
        { x: radius, y: 0 },
        GLASS_PROFILES.aboutNarrativeLens,
      ),
    );
  }

  let maxRefractionJump = 0;
  let maxDispersionJump = 0;

  for (let index = 1; index < samples.length; index += 1) {
    maxRefractionJump = Math.max(
      maxRefractionJump,
      Math.abs(
        samples[index].refractionWeight - samples[index - 1].refractionWeight,
      ),
    );
    maxDispersionJump = Math.max(
      maxDispersionJump,
      Math.abs(
        samples[index].dispersionWeight - samples[index - 1].dispersionWeight,
      ),
    );
  }

  assert.ok(maxRefractionJump < 0.35);
  assert.ok(maxDispersionJump < 0.5);
});

test("spherical rim field keeps the about lenses on the dedicated symmetric model path", () => {
  assert.equal(typeof sampledGlass.getSampledGlassFieldUniforms, "function");

  if (typeof sampledGlass.getSampledGlassFieldUniforms !== "function") {
    return;
  }

  const fieldUniforms = sampledGlass.getSampledGlassFieldUniforms(
    GLASS_PROFILES.aboutLens,
  );
  const homeFieldUniforms = sampledGlass.getSampledGlassFieldUniforms(
    GLASS_PROFILES.homeWordmark,
  );

  assert.equal(fieldUniforms.fieldModel, 2);
  assert.equal(fieldUniforms.dispersionMode, 1);
  assert.equal(fieldUniforms.sideRadialDispersionMix, 0.58);
  assert.equal(fieldUniforms.sampleBleed, 0.1);
  assert.equal(homeFieldUniforms.dispersionMode, 0);
  assert.equal(homeFieldUniforms.sideRadialDispersionMix, 0);
  assert.equal(homeFieldUniforms.sampleBleed, 0);
});
