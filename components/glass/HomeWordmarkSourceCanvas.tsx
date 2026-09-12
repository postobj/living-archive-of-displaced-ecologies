"use client";

import { useEffect, useRef } from "react";

interface HomeWordmarkSourceCanvasProps {
  className?: string;
  onCanvasReady?: (canvas: HTMLCanvasElement | null) => void;
}

// A warm dark tone that gives the glass refraction engine
// enough contrast to produce visible letterforms on the white
// home-page background, mirroring what --story-bg-top does on
// dark-themed story pages.
const HOME_GLASS_SOURCE_COLOR = "#161210";

function drawHomeWordmarkField({ canvas }: { canvas: HTMLCanvasElement }) {
  const viewportWidth = window.visualViewport?.width ?? window.innerWidth;
  const viewportHeight = window.visualViewport?.height ?? window.innerHeight;
  const devicePixelRatio = Math.min(window.devicePixelRatio || 1, 1.6);
  const cssWidth = Math.max(1, viewportWidth);
  const cssHeight = Math.max(1, viewportHeight);
  const pixelWidth = Math.max(1, Math.round(cssWidth * devicePixelRatio));
  const pixelHeight = Math.max(1, Math.round(cssHeight * devicePixelRatio));

  if (canvas.width !== pixelWidth || canvas.height !== pixelHeight) {
    canvas.width = pixelWidth;
    canvas.height = pixelHeight;
    canvas.style.width = `${cssWidth}px`;
    canvas.style.height = `${cssHeight}px`;
  }

  const context = canvas.getContext("2d");

  if (!context) {
    return;
  }

  context.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0);
  context.clearRect(0, 0, cssWidth, cssHeight);
  context.fillStyle = HOME_GLASS_SOURCE_COLOR;
  context.fillRect(0, 0, cssWidth, cssHeight);
}

export function HomeWordmarkSourceCanvas({
  className = "homeWordmarkSourceCanvas",
  onCanvasReady,
}: HomeWordmarkSourceCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    onCanvasReady?.(canvasRef.current);

    return () => {
      onCanvasReady?.(null);
    };
  }, [onCanvasReady]);

  useEffect(() => {
    const canvas = canvasRef.current;

    if (!canvas) {
      return;
    }

    let frameId = 0;

    const draw = () => {
      frameId = 0;
      drawHomeWordmarkField({ canvas });
    };

    const scheduleDraw = () => {
      if (frameId !== 0) {
        return;
      }
      frameId = window.requestAnimationFrame(draw);
    };

    const onResize = () => {
      scheduleDraw();
    };

    scheduleDraw();

    window.addEventListener("resize", onResize);
    window.visualViewport?.addEventListener("resize", onResize);

    const fontSet = document.fonts;
    fontSet.ready
      .then(() => {
        scheduleDraw();
      })
      .catch(() => {});

    return () => {
      window.removeEventListener("resize", onResize);
      window.visualViewport?.removeEventListener("resize", onResize);

      if (frameId !== 0) {
        window.cancelAnimationFrame(frameId);
      }
    };
  }, []);

  return <canvas ref={canvasRef} className={className} aria-hidden="true" />;
}
