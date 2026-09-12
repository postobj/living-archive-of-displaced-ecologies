"use client";

import {
  type CSSProperties,
  type ReactNode,
  forwardRef,
  useEffect,
  useRef,
} from "react";
import { type GlassProfile, type GlassRenderer } from "@/lib/glass";
import {
  drawSampledGlass,
  getSampledGlassElementRect,
  getSampledGlassRenderSize,
  parseSampledGlassCssColor,
  releaseSampledGlass,
  resolveSampledGlassBackdropColor,
} from "@/lib/sampled-glass";
import { measureTextNaturalWidth } from "@/lib/text-measurement";
import styles from "./glass.module.css";

const WORDMARK_FONT_FAMILY =
  '"Segment", "HuiWenFangSong", "Courier New", monospace';
const WORDMARK_LETTER_SPACING_EM = 0.12;
const WORDMARK_LINE_HEIGHT = 0.9;

interface GlassWordmarkProps {
  text: string;
  profile: GlassProfile;
  renderer: GlassRenderer;
  sourceCanvas?: HTMLCanvasElement | null;
  variant?: "home" | "story";
  className?: string;
  style?: CSSProperties;
  children?: ReactNode;
}

function drawTrackedText(
  context: CanvasRenderingContext2D,
  text: string,
  font: string,
  x: number,
  y: number,
  letterSpacingPx: number,
) {
  context.font = font;

  for (let index = 0; index < text.length; index += 1) {
    const glyph = text[index];
    context.fillText(glyph, x, y);
    x += context.measureText(glyph).width + letterSpacingPx;
  }
}

function strokeTrackedText(
  context: CanvasRenderingContext2D,
  text: string,
  font: string,
  x: number,
  y: number,
  letterSpacingPx: number,
) {
  context.font = font;

  for (let index = 0; index < text.length; index += 1) {
    const glyph = text[index];
    context.strokeText(glyph, x, y);
    x += context.measureText(glyph).width + letterSpacingPx;
  }
}

function resolveFontSizePx(style?: CSSProperties): number {
  if (!style?.fontSize) return 16;
  const raw = style.fontSize;
  if (typeof raw === "number") return raw;
  const parsed = Number.parseFloat(String(raw));
  return Number.isFinite(parsed) ? parsed : 16;
}

export const GlassWordmark = forwardRef<HTMLDivElement, GlassWordmarkProps>(
  function GlassWordmark(
    {
      text,
      profile,
      renderer,
      sourceCanvas,
      variant = "home",
      className,
      style,
      children,
    },
    ref,
  ) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const measureRef = useRef<HTMLSpanElement>(null);

    useEffect(() => {
      if (renderer !== "sampled" || !sourceCanvas) {
        return;
      }

      const canvas = canvasRef.current;
      const measureElement = measureRef.current;

      if (!canvas || !measureElement) {
        return;
      }

      const context = canvas.getContext("2d");

      if (!context) {
        return;
      }

      const sampledCanvas = document.createElement("canvas");
      const stagingCanvas = document.createElement("canvas");
      const stagingContext = stagingCanvas.getContext("2d");
      let frameId = 0;

      if (!stagingContext) {
        return;
      }

      const draw = () => {
        const measureRect = getSampledGlassElementRect(measureElement);
        const sourceRect = getSampledGlassElementRect(sourceCanvas);

        if (
          measureRect.width <= 0 ||
          measureRect.height <= 0 ||
          sourceRect.width <= 0 ||
          sourceRect.height <= 0
        ) {
          frameId = window.requestAnimationFrame(draw);
          return;
        }

        const renderSize = getSampledGlassRenderSize({
          width: measureRect.width,
          height: measureRect.height,
          devicePixelRatio: window.devicePixelRatio || 1,
          maxDevicePixelRatio: window.innerWidth < 768 ? 1.3 : 1.8,
        });

        if (
          canvas.width !== renderSize.pixelWidth ||
          canvas.height !== renderSize.pixelHeight
        ) {
          canvas.width = renderSize.pixelWidth;
          canvas.height = renderSize.pixelHeight;
        }

        if (
          stagingCanvas.width !== sourceCanvas.width ||
          stagingCanvas.height !== sourceCanvas.height
        ) {
          stagingCanvas.width = sourceCanvas.width;
          stagingCanvas.height = sourceCanvas.height;
        }

        const backdropColor = resolveSampledGlassBackdropColor(
          sourceCanvas.parentElement ?? measureElement,
        );
        const parsedBackdropColor = parseSampledGlassCssColor(backdropColor);
        const sourceScaleX =
          sourceRect.width > 0 ? stagingCanvas.width / sourceRect.width : 1;
        const sourceScaleY =
          sourceRect.height > 0 ? stagingCanvas.height / sourceRect.height : 1;

        stagingContext.setTransform(sourceScaleX, 0, 0, sourceScaleY, 0, 0);
        stagingContext.clearRect(0, 0, sourceRect.width, sourceRect.height);
        stagingContext.fillStyle = backdropColor;
        stagingContext.fillRect(0, 0, sourceRect.width, sourceRect.height);
        stagingContext.drawImage(
          sourceCanvas,
          0,
          0,
          sourceRect.width,
          sourceRect.height,
        );

        context.setTransform(
          renderSize.devicePixelRatio,
          0,
          0,
          renderSize.devicePixelRatio,
          0,
          0,
        );
        context.clearRect(0, 0, measureRect.width, measureRect.height);

        const glassDrawn = drawSampledGlass({
          canvas: sampledCanvas,
          sourceCanvas: stagingCanvas,
          lensRect: measureRect,
          sourceRect,
          profile,
          backdropColor: parsedBackdropColor ?? { r: 1, g: 1, b: 1, a: 1 },
          refractionScale: 0.44,
          dispersionScale: 0.32,
          // Home: keep dark glass dark on white bg — reduce fill/glint
          highlightScale: variant === "home" ? 0.2 : 0.88,
          fillScale: variant === "home" ? 0.12 : 0.72,
          maxDevicePixelRatio: window.innerWidth < 768 ? 1.3 : 1.8,
        });

        // Derive font specs from the style prop and CSS constants instead of
        // reading computedStyle on the measure element — avoids forced layout.
        const fontSizePx = resolveFontSizePx(style);
        const font = `400 ${fontSizePx}px ${WORDMARK_FONT_FAMILY}`;
        const letterSpacingPx = WORDMARK_LETTER_SPACING_EM * fontSizePx;

        const trackedWidth = measureTextNaturalWidth(
          text,
          font,
          letterSpacingPx,
        );
        const x = Math.max(0, (measureRect.width - trackedWidth) / 2);
        const lineHeight = fontSizePx * WORDMARK_LINE_HEIGHT;
        const y = Math.max(
          lineHeight,
          (measureRect.height + fontSizePx * 0.56) / 2,
        );

        if (!glassDrawn) {
          // WebGL failed — draw a plain visible fallback and skip the glass compositing path.
          context.globalCompositeOperation = "source-over";
          context.fillStyle =
            variant === "home"
              ? "rgba(255,255,255,0.85)"
              : "rgba(245,244,239,0.5)";
          drawTrackedText(context, text, font, x, y, letterSpacingPx);
        } else {
          // WebGL succeeded — composite the sampled glass output then clip to letterforms.
          context.drawImage(
            sampledCanvas,
            0,
            0,
            measureRect.width,
            measureRect.height,
          );

          // Home variant: lay down a fill BEFORE the destination-in text-shape clip.
          // source-over gives pixels non-zero alpha even when the glass output was
          // fully transparent, so destination-in will preserve them inside the
          // letterforms and the text will always be visible on white.
          if (variant === "home") {
            context.globalCompositeOperation = "source-over";
            context.fillStyle = "rgba(255,255,255,0.82)";
            context.fillRect(0, 0, measureRect.width, measureRect.height);
          }

          // Clip everything drawn so far to the text letterforms.
          context.globalCompositeOperation = "destination-in";
          context.fillStyle = "#ffffff";
          drawTrackedText(context, text, font, x, y, letterSpacingPx);

          context.globalCompositeOperation = "source-over";
          // Story: light glass on dark page — glyph-shaped white fill + stroke + screen highlight
          context.fillStyle = `rgba(255,255,255,${Math.min(0.14, profile.fillOpacity * 0.14)})`;
          drawTrackedText(context, text, font, x, y, letterSpacingPx);
          context.strokeStyle = "rgba(255,255,255,0.12)";
          context.lineWidth = 0.85;
          strokeTrackedText(context, text, font, x, y, letterSpacingPx);

          const highlight = context.createLinearGradient(
            0,
            0,
            measureRect.width,
            measureRect.height,
          );
          highlight.addColorStop(0, "rgba(255,255,255,0.08)");
          highlight.addColorStop(0.5, "rgba(255,255,255,0.02)");
          highlight.addColorStop(1, "rgba(255,255,255,0.06)");
          context.fillStyle = highlight;
          context.globalCompositeOperation = "screen";
          drawTrackedText(context, text, font, x, y, letterSpacingPx);

          // Home: guarantee the text is visible on white background regardless of
          // how transparent the glass pipeline output was.
          if (variant === "home") {
            context.globalCompositeOperation = "source-over";
            context.fillStyle = "rgba(255,255,255,0.88)";
            drawTrackedText(context, text, font, x, y, letterSpacingPx);
          }
        }

        frameId = window.requestAnimationFrame(draw);
      };

      const readyPromise = document.fonts?.ready ?? Promise.resolve();
      readyPromise.then(() => {
        frameId = window.requestAnimationFrame(draw);
      });

      return () => {
        window.cancelAnimationFrame(frameId);
        releaseSampledGlass(sampledCanvas);
      };
    }, [profile, renderer, sourceCanvas, text, style, variant]);

    return (
      <div
        ref={ref}
        className={`${styles.glassWordmark} ${className ?? ""}`}
        style={style}
      >
        <span ref={measureRef} className={styles.glassWordmarkMeasure}>
          {text}
        </span>
        {children}
        {renderer !== "sampled" && variant === "home" ? (
          <>
            <p className={styles.glassWordmarkFallbackBase} aria-hidden="true">
              {text}
            </p>
            <p
              className={`${styles.glassWordmarkFallbackOverlay} ${
                renderer === "dom" ? styles.glassWordmarkFallbackOverlayDom : ""
              }`}
              aria-hidden="true"
            >
              {text}
            </p>
          </>
        ) : null}
        {renderer !== "sampled" && variant === "story" ? (
          <p className={styles.glassWordmarkFallbackStory} aria-hidden="true">
            {text}
          </p>
        ) : null}
        {renderer === "sampled" ? (
          <canvas
            ref={canvasRef}
            className={styles.glassWordmarkCanvas}
            aria-hidden="true"
          />
        ) : null}
      </div>
    );
  },
);
