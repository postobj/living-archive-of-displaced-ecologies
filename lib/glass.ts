export type GlassRenderer = "sampled" | "dom" | "disabled";
export type GlassFieldModel = "radial" | "symmetricArc" | "sphericalRim";
export type GlassDispersionMode = "radial" | "tangentRim";

export interface GlassProfile {
  fillOpacity: number;
  depth: number;
  refraction: number;
  dispersion: number;
  dispersionMode: GlassDispersionMode;
  sideRadialDispersionMix?: number;
  sampleBleed?: number;
  fieldModel: GlassFieldModel;
  arcBandOffset: number;
  arcBandWidth: number;
  sideFalloff: number;
  dispersionBias: number;
  rimCenter?: number;
  rimWidth?: number;
  centerRefraction?: number;
  rimRefraction?: number;
  rimDispersion?: number;
  rimGlow?: number;
  lightAngleDeg: number;
  lightIntensity: number;
  frostRadius: number;
  splay: number;
  scale: number;
  shiftX: number;
  shiftY: number;
}

export interface GlassRendererOptions {
  reducedMotion: boolean;
  hasMaskSupport: boolean;
  hasBackdropSupport: boolean;
  hasWebgl: boolean;
  hasCanvasSource: boolean;
}

export const GLASS_PROFILES: Record<
  "aboutLens" | "aboutNarrativeLens" | "homeWordmark",
  GlassProfile
> = {
  aboutLens: {
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
    rimCenter: 0.74,
    rimWidth: 0.13,
    centerRefraction: 0.04,
    rimRefraction: 1.14,
    rimDispersion: 1.08,
    rimGlow: 0.84,
    lightAngleDeg: 90,
    lightIntensity: 0.82,
    frostRadius: 0,
    splay: 0,
    scale: 1.01,
    shiftX: 0,
    shiftY: 0,
  },
  aboutNarrativeLens: {
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
    rimCenter: 0.72,
    rimWidth: 0.09,
    centerRefraction: 0.015,
    rimRefraction: 1.28,
    rimDispersion: 1.1,
    rimGlow: 0.46,
    lightAngleDeg: 90,
    lightIntensity: 0.5,
    frostRadius: 0,
    splay: 0,
    scale: 1.005,
    shiftX: 0,
    shiftY: 0,
  },
  homeWordmark: {
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
  },
};

export function getGlassRenderer({
  reducedMotion,
  hasMaskSupport,
  hasBackdropSupport,
  hasWebgl,
  hasCanvasSource,
}: GlassRendererOptions): GlassRenderer {
  if (reducedMotion || !hasMaskSupport) {
    return "disabled";
  }

  if (hasWebgl && hasCanvasSource) {
    return "sampled";
  }

  if (hasBackdropSupport) {
    return "dom";
  }

  return "disabled";
}
