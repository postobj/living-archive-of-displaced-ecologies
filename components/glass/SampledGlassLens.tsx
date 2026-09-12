"use client";

import { type CSSProperties, type ReactNode, useEffect, useRef } from "react";
import { type GlassProfile, type GlassRenderer } from "@/lib/glass";
import {
  drawSampledGlass,
  getSampledGlassElementRect,
  parseSampledGlassCssColor,
  releaseSampledGlass,
  resolveSampledGlassBackdropColor,
} from "@/lib/sampled-glass";
import { GlassLens } from "./GlassLens";
import styles from "./glass.module.css";

type GlassShape = "ellipse" | "rounded";
type GlassChromeVariant = "default" | "softSpherical";

interface SampledGlassLensProps {
  profile: GlassProfile;
  renderer: GlassRenderer;
  sourceCanvas?: HTMLCanvasElement | null;
  fallbackSource: ReactNode;
  className?: string;
  sourceClassName?: string;
  shape?: GlassShape;
  rotationDeg?: number;
  style?: CSSProperties;
  refractionScale?: number;
  dispersionScale?: number;
  highlightScale?: number;
  fillScale?: number;
  chromeVariant?: GlassChromeVariant;
}

function cx(...classNames: Array<string | false | null | undefined>) {
  return classNames.filter(Boolean).join(" ");
}

function getLensStyle(
  profile: GlassProfile,
  rotationDeg: number,
  style?: CSSProperties,
) {
  return {
    ...style,
    "--glass-fill-opacity": profile.fillOpacity.toString(),
    "--glass-scale": profile.scale.toString(),
    "--glass-shift-x": `${profile.shiftX * 100}%`,
    "--glass-shift-y": `${profile.shiftY * 100}%`,
    "--glass-dispersion-shift": `${0.6 + profile.dispersion * 0.9}%`,
    "--glass-frost": `${profile.frostRadius}px`,
    "--glass-rotation": `${rotationDeg}deg`,
  } as CSSProperties;
}

export function SampledGlassLens({
  profile,
  renderer,
  sourceCanvas,
  fallbackSource,
  className,
  sourceClassName,
  shape = "ellipse",
  rotationDeg = 0,
  style,
  refractionScale = 1,
  dispersionScale = 1,
  highlightScale = 1,
  fillScale = 1,
  chromeVariant = "default",
}: SampledGlassLensProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (renderer !== "sampled" || !sourceCanvas) {
      return;
    }

    const canvas = canvasRef.current;

    if (!canvas) {
      return;
    }

    let frameId = 0;

    const draw = () => {
      const host = hostRef.current;

      if (!canvas || !host) {
        frameId = window.requestAnimationFrame(draw);
        return;
      }

      const parsedBackdropColor = parseSampledGlassCssColor(
        resolveSampledGlassBackdropColor(host),
      );

      drawSampledGlass({
        canvas,
        sourceCanvas,
        lensRect: getSampledGlassElementRect(host),
        sourceRect: getSampledGlassElementRect(sourceCanvas),
        profile,
        backdropColor: parsedBackdropColor ?? { r: 1, g: 1, b: 1, a: 1 },
        refractionScale,
        dispersionScale,
        highlightScale,
        fillScale,
        maxDevicePixelRatio: window.innerWidth < 768 ? 1.25 : 1.75,
      });

      frameId = window.requestAnimationFrame(draw);
    };

    frameId = window.requestAnimationFrame(draw);

    return () => {
      window.cancelAnimationFrame(frameId);
      releaseSampledGlass(canvas);
    };
  }, [
    dispersionScale,
    fillScale,
    highlightScale,
    profile,
    refractionScale,
    renderer,
    sourceCanvas,
  ]);

  if (renderer !== "sampled" || !sourceCanvas) {
    return (
      <GlassLens
        profile={profile}
        renderer="dom"
        source={fallbackSource}
        className={className}
        sourceClassName={sourceClassName}
        shape={shape}
        rotationDeg={rotationDeg}
        style={style}
      />
    );
  }

  const lensStyle = getLensStyle(profile, rotationDeg, style);
  const shapeClassName =
    shape === "ellipse" ? styles.glassLensEllipse : styles.glassLensRounded;
  const chromeClassName =
    profile.fieldModel === "sphericalRim" && chromeVariant === "softSpherical"
      ? styles.sampledGlassChromeSphericalSoft
      : profile.fieldModel === "sphericalRim"
        ? styles.sampledGlassChromeSpherical
        : undefined;

  return (
    <div
      ref={hostRef}
      className={cx(styles.sampledGlassLens, shapeClassName, className)}
      style={lensStyle}
    >
      <div className={styles.sampledGlassCanvasShell}>
        <canvas
          ref={canvasRef}
          className={styles.sampledGlassCanvas}
          aria-hidden="true"
        />
      </div>
      <div
        className={cx(styles.sampledGlassChrome, chromeClassName)}
        aria-hidden="true"
      />
    </div>
  );
}
