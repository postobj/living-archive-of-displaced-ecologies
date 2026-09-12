"use client";

import type { CSSProperties, ReactNode } from "react";
import { type GlassProfile, type GlassRenderer } from "@/lib/glass";
import styles from "./glass.module.css";

type GlassShape = "ellipse" | "rounded";

interface GlassLensProps {
  profile: GlassProfile;
  renderer: GlassRenderer;
  source: ReactNode;
  className?: string;
  sourceClassName?: string;
  shape?: GlassShape;
  rotationDeg?: number;
  style?: CSSProperties;
}

function cx(...classNames: Array<string | false | null | undefined>) {
  return classNames.filter(Boolean).join(" ");
}

export function GlassLens({
  profile,
  renderer,
  source,
  className,
  sourceClassName,
  shape = "ellipse",
  rotationDeg = 0,
  style,
}: GlassLensProps) {
  if (renderer === "disabled") {
    return null;
  }

  const lensStyle = {
    ...style,
    "--glass-fill-opacity": profile.fillOpacity.toString(),
    "--glass-scale": profile.scale.toString(),
    "--glass-shift-x": `${profile.shiftX * 100}%`,
    "--glass-shift-y": `${profile.shiftY * 100}%`,
    "--glass-dispersion-shift": `${0.6 + profile.dispersion * 0.9}%`,
    "--glass-frost": `${profile.frostRadius}px`,
    "--glass-rotation": `${rotationDeg}deg`,
  } as CSSProperties;

  const shapeClassName =
    shape === "ellipse" ? styles.glassLensEllipse : styles.glassLensRounded;

  const renderSourceNode = () => (
    <div className={cx(styles.glassContentShell, sourceClassName)}>
      {source}
    </div>
  );

  return (
    <div
      className={cx(styles.glassLens, shapeClassName, className)}
      style={lensStyle}
    >
      <div className={styles.glassLayer}>
        <div className={styles.glassSource}>{renderSourceNode()}</div>
      </div>
      <div className={cx(styles.glassLayer, styles.glassChromaBlue)}>
        <div className={styles.glassSource}>{renderSourceNode()}</div>
      </div>
      <div className={cx(styles.glassLayer, styles.glassChromaRed)}>
        <div className={styles.glassSource}>{renderSourceNode()}</div>
      </div>
    </div>
  );
}
