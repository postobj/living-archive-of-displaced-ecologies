"use client";

import { useEffect, useRef } from "react";

interface StoryWordmarkSourceCanvasProps {
  title: string;
  contributor: string;
  year?: string;
  slogan?: string;
  className?: string;
  onCanvasReady?: (canvas: HTMLCanvasElement | null) => void;
}

function getPalette() {
  const rootStyle = window.getComputedStyle(document.documentElement);

  return {
    background: rootStyle.getPropertyValue("--story-text").trim() || "#000000",
  };
}

function drawStoryWordmarkField({ canvas }: { canvas: HTMLCanvasElement }) {
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

  const palette = getPalette();

  context.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0);
  context.clearRect(0, 0, cssWidth, cssHeight);
  context.fillStyle = palette.background;
  context.fillRect(0, 0, cssWidth, cssHeight);
}

export function StoryWordmarkSourceCanvas({
  className = "storyWordmarkSourceCanvas",
  onCanvasReady,
}: StoryWordmarkSourceCanvasProps) {
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

    const colorSchemeQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const themeObserver = new MutationObserver(() => {
      scheduleDraw();
    });
    let frameId = 0;

    const draw = () => {
      frameId = 0;
      drawStoryWordmarkField({
        canvas,
      });
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
    colorSchemeQuery.addEventListener("change", onResize);
    themeObserver.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-theme", "class", "style"],
    });

    const fontSet = document.fonts;
    fontSet.ready
      .then(() => {
        scheduleDraw();
      })
      .catch(() => {});
    fontSet.addEventListener("loadingdone", onResize);

    return () => {
      window.removeEventListener("resize", onResize);
      window.visualViewport?.removeEventListener("resize", onResize);
      colorSchemeQuery.removeEventListener("change", onResize);
      themeObserver.disconnect();
      fontSet.removeEventListener("loadingdone", onResize);

      if (frameId !== 0) {
        window.cancelAnimationFrame(frameId);
      }
    };
  }, []);

  return <canvas ref={canvasRef} className={className} aria-hidden="true" />;
}
