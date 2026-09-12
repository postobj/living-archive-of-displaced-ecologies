import assert from "node:assert/strict";
import test from "node:test";

import { GLASS_PROFILES, getGlassRenderer } from "../lib/glass.ts";

test("glass profiles preserve the Figma-derived parameters for about lenses and home wordmark", () => {
  assert.deepEqual(GLASS_PROFILES.aboutLens, {
    fillOpacity: 0.06,
    depth: 100,
    refraction: 1,
    dispersion: 0.56,
    dispersionMode: "tangentRim",
    sideRadialDispersionMix: 0.58,
    sampleBleed: 0.1,
    fieldModel: "sphericalRim",
    arcBandOffset: 0.58,
    arcBandWidth: 0.18,
    sideFalloff: 0.28,
    dispersionBias: 1,
    lightAngleDeg: 90,
    lightIntensity: 0.82,
    frostRadius: 0,
    splay: 0,
    scale: 1.01,
    shiftX: 0,
    shiftY: 0,
    rimCenter: 0.74,
    rimWidth: 0.13,
    centerRefraction: 0.04,
    rimRefraction: 1.14,
    rimDispersion: 1.08,
    rimGlow: 0.84,
  });

  assert.deepEqual(GLASS_PROFILES.aboutNarrativeLens, {
    fillOpacity: 0.04,
    depth: 78,
    refraction: 1,
    dispersion: 0.52,
    dispersionMode: "tangentRim",
    sampleBleed: 0.08,
    fieldModel: "sphericalRim",
    arcBandOffset: 0.52,
    arcBandWidth: 0.16,
    sideFalloff: 0.28,
    dispersionBias: 1,
    lightAngleDeg: 90,
    lightIntensity: 0.5,
    frostRadius: 0,
    splay: 0,
    scale: 1.005,
    shiftX: 0,
    shiftY: 0,
    rimCenter: 0.72,
    rimWidth: 0.09,
    centerRefraction: 0.015,
    rimRefraction: 1.28,
    rimDispersion: 1.1,
    rimGlow: 0.46,
  });

  assert.deepEqual(GLASS_PROFILES.homeWordmark, {
    fillOpacity: 0.6,
    depth: 46,
    refraction: 1,
    dispersion: 0.36,
    dispersionMode: "radial",
    fieldModel: "radial",
    arcBandOffset: 0.52,
    arcBandWidth: 0.22,
    sideFalloff: 0.3,
    dispersionBias: 1,
    lightAngleDeg: 90,
    lightIntensity: 1,
    frostRadius: 0,
    splay: 0,
    scale: 1.08,
    shiftX: 0,
    shiftY: -0.02,
  });
});

test("glass renderer prefers sampled refraction when motion and a live canvas source are available", () => {
  assert.equal(
    getGlassRenderer({
      reducedMotion: false,
      hasMaskSupport: true,
      hasBackdropSupport: true,
      hasWebgl: true,
      hasCanvasSource: true,
    }),
    "sampled",
  );
});

test("about lenses use the shared spherical rim model while the home wordmark stays radial", () => {
  assert.equal(GLASS_PROFILES.aboutLens.fieldModel, "sphericalRim");
  assert.equal(GLASS_PROFILES.aboutNarrativeLens.fieldModel, "sphericalRim");
  assert.equal(GLASS_PROFILES.homeWordmark.fieldModel, "radial");
  assert.equal(GLASS_PROFILES.aboutLens.dispersionMode, "tangentRim");
  assert.equal(GLASS_PROFILES.aboutNarrativeLens.dispersionMode, "tangentRim");
  assert.equal(GLASS_PROFILES.homeWordmark.dispersionMode, "radial");
  assert.equal(GLASS_PROFILES.aboutLens.sideRadialDispersionMix, 0.58);
  assert.equal(GLASS_PROFILES.aboutLens.sampleBleed, 0.1);
  assert.equal(
    GLASS_PROFILES.aboutNarrativeLens.sideRadialDispersionMix,
    undefined,
  );
  assert.equal(GLASS_PROFILES.aboutNarrativeLens.sampleBleed, 0.08);
  assert.equal(GLASS_PROFILES.homeWordmark.sideRadialDispersionMix, undefined);
  assert.equal(GLASS_PROFILES.homeWordmark.sampleBleed, undefined);
});

test("glass renderer falls back to DOM lenses when CSS masking is available but sampled refraction is not", () => {
  assert.equal(
    getGlassRenderer({
      reducedMotion: false,
      hasMaskSupport: true,
      hasBackdropSupport: true,
      hasWebgl: false,
      hasCanvasSource: false,
    }),
    "dom",
  );
});

test("glass renderer disables the effect when mask support is missing or motion must be reduced", () => {
  assert.equal(
    getGlassRenderer({
      reducedMotion: true,
      hasMaskSupport: true,
      hasBackdropSupport: true,
      hasWebgl: true,
      hasCanvasSource: true,
    }),
    "disabled",
  );

  assert.equal(
    getGlassRenderer({
      reducedMotion: false,
      hasMaskSupport: false,
      hasBackdropSupport: true,
      hasWebgl: true,
      hasCanvasSource: true,
    }),
    "disabled",
  );
});
