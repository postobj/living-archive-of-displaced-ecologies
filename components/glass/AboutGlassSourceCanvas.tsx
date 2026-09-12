"use client";

import { type RefObject, useEffect, useRef } from "react";
import {
  getSampledGlassRenderSize,
  resolveSampledGlassBackdropColor,
} from "@/lib/sampled-glass";

interface AboutGlassSourceCanvasProps {
  className?: string;
  contentRef: RefObject<HTMLDivElement | null>;
  storyBodyRef: RefObject<HTMLDivElement | null>;
  storyScrollRef: RefObject<HTMLDivElement | null>;
  submitLabelRef?: RefObject<HTMLAnchorElement | null>;
  onCanvasReady?: (canvas: HTMLCanvasElement | null) => void;
}

interface AboutStorySourcePadding {
  inline: number;
  block: number;
}

function parsePx(value: string, fallback: number) {
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export function getAboutStorySourcePadding(): AboutStorySourcePadding {
  return {
    inline: 64,
    block: 160,
  };
}

function getLineHeightPx(style: CSSStyleDeclaration, fontSizePx: number) {
  return parsePx(style.lineHeight, fontSizePx * 1.55);
}

function getLetterSpacingPx(style: CSSStyleDeclaration) {
  return parsePx(style.letterSpacing, 0);
}

function getCanvasFont(style: CSSStyleDeclaration) {
  const fontStyle = style.fontStyle || "normal";
  const fontWeight = style.fontWeight || "400";
  const fontSize = style.fontSize || "16px";
  const fontFamily =
    style.fontFamily || '"Segment", "HuiWenFangSong", "Courier New", monospace';

  return `${fontStyle} ${fontWeight} ${fontSize} ${fontFamily}`;
}

function applyTextStyle(
  context: CanvasRenderingContext2D,
  style: CSSStyleDeclaration,
) {
  context.font = getCanvasFont(style);
  context.fillStyle = style.color || "rgba(19, 17, 15, 0.96)";
  context.strokeStyle =
    style.webkitTextStrokeColor || style.color || "rgba(19, 17, 15, 0.96)";
  context.lineWidth = parsePx(style.webkitTextStrokeWidth, 0);
  context.textBaseline = "alphabetic";
}

function drawTrackedText(
  context: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  letterSpacingPx: number,
) {
  for (let index = 0; index < text.length; index += 1) {
    const glyph = text[index];
    context.fillText(glyph, x, y);
    x += context.measureText(glyph).width + letterSpacingPx;
  }
}

function strokeTrackedText(
  context: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  letterSpacingPx: number,
) {
  for (let index = 0; index < text.length; index += 1) {
    const glyph = text[index];
    context.strokeText(glyph, x, y);
    x += context.measureText(glyph).width + letterSpacingPx;
  }
}

function getTrackedWidth(
  context: CanvasRenderingContext2D,
  text: string,
  letterSpacingPx: number,
) {
  return text.split("").reduce((width, glyph, index) => {
    const nextWidth = width + context.measureText(glyph).width;
    return index === text.length - 1 ? nextWidth : nextWidth + letterSpacingPx;
  }, 0);
}

function drawStoryText(
  context: CanvasRenderingContext2D,
  storyBody: HTMLElement,
  contentRect: DOMRect,
  sourcePadding: AboutStorySourcePadding,
) {
  const walker = document.createTreeWalker(storyBody, NodeFilter.SHOW_TEXT);

  while (walker.nextNode()) {
    const textNode = walker.currentNode;
    const value = textNode.textContent ?? "";

    if (!value.trim()) {
      continue;
    }

    const parentElement = textNode.parentElement;

    if (!parentElement) {
      continue;
    }

    const style = window.getComputedStyle(parentElement);
    const letterSpacingPx = getLetterSpacingPx(style);
    const fontSizePx = parsePx(style.fontSize, 16);
    const lineHeightPx = getLineHeightPx(style, fontSizePx);

    applyTextStyle(context, style);

    for (const match of value.matchAll(/\S+/g)) {
      const token = match[0];
      const startOffset = match.index ?? 0;
      const range = document.createRange();
      range.setStart(textNode, startOffset);
      range.setEnd(textNode, startOffset + token.length);

      for (const rect of Array.from(range.getClientRects())) {
        if (rect.width <= 0 || rect.height <= 0) {
          continue;
        }

        const x = rect.left - contentRect.left;
        const y =
          rect.top -
          contentRect.top +
          rect.height -
          Math.max(1, (lineHeightPx - fontSizePx) * 0.35);

        drawTrackedText(
          context,
          token,
          x + sourcePadding.inline,
          y + sourcePadding.block,
          letterSpacingPx,
        );
      }
    }
  }
}

function drawSubmitLabel(
  context: CanvasRenderingContext2D,
  submitLabel: HTMLAnchorElement,
  contentRect: DOMRect,
  sourcePadding: AboutStorySourcePadding,
) {
  const rect = submitLabel.getBoundingClientRect();

  if (rect.width <= 0 || rect.height <= 0) {
    return;
  }

  const style = window.getComputedStyle(submitLabel);
  const text = submitLabel.textContent?.trim() ?? "";

  if (!text) {
    return;
  }

  applyTextStyle(context, style);

  const fontSizePx = parsePx(style.fontSize, 16);
  const letterSpacingPx = getLetterSpacingPx(style);
  const trackedWidth = getTrackedWidth(context, text, letterSpacingPx);
  const x =
    rect.left -
    contentRect.left +
    sourcePadding.inline +
    (rect.width - trackedWidth) / 2;
  const y =
    rect.top -
    contentRect.top +
    sourcePadding.block +
    rect.height / 2 +
    fontSizePx * 0.34;

  if (context.lineWidth > 0) {
    strokeTrackedText(context, text, x, y, letterSpacingPx);
  }

  context.fillStyle = "rgba(225, 6, 0, 0.08)";
  drawTrackedText(context, text, x, y, letterSpacingPx);

  const interactiveStyle = window.getComputedStyle(
    submitLabel.parentElement ?? submitLabel,
  );
  const orbitX = parsePx(
    interactiveStyle.getPropertyValue("--submit-orbit-offset-x"),
    24,
  );
  const orbitY = parsePx(
    interactiveStyle.getPropertyValue("--submit-orbit-offset-y"),
    22,
  );
  const dotColor =
    interactiveStyle.getPropertyValue("--about-marker-muted").trim() ||
    "rgba(197, 193, 186, 0.96)";
  const centerX =
    rect.left - contentRect.left + sourcePadding.inline + rect.width / 2;
  const centerY =
    rect.top - contentRect.top + sourcePadding.block + rect.height / 2;
  const dotRadius = Math.max(5, Math.min(rect.height * 0.12, 8));
  const orbitPoints = [
    [centerX - rect.width / 2 - orbitX, centerY - orbitY],
    [centerX - rect.width / 2 - orbitX, centerY + orbitY],
    [centerX + rect.width / 2 + orbitX, centerY - orbitY],
    [centerX + rect.width / 2 + orbitX, centerY + orbitY],
  ];

  context.fillStyle = dotColor;

  orbitPoints.forEach(([xPoint, yPoint]) => {
    context.beginPath();
    context.arc(xPoint, yPoint, dotRadius, 0, Math.PI * 2);
    context.fill();
  });
}

export function AboutGlassSourceCanvas({
  className,
  contentRef,
  storyBodyRef,
  storyScrollRef,
  submitLabelRef,
  onCanvasReady,
}: AboutGlassSourceCanvasProps) {
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

    let frameId: number | null = null;

    const draw = () => {
      frameId = null;

      const content = contentRef.current;
      const storyBody = storyBodyRef.current;
      const submitLabel = submitLabelRef?.current;

      if (!content || !storyBody) {
        return;
      }

      const contentRect = content.getBoundingClientRect();
      const backdropColor = resolveSampledGlassBackdropColor(content);
      const sourcePadding = getAboutStorySourcePadding();

      if (contentRect.width <= 0 || contentRect.height <= 0) {
        return;
      }

      const renderSize = getSampledGlassRenderSize({
        width: contentRect.width + sourcePadding.inline * 2,
        height: contentRect.height + sourcePadding.block * 2,
        devicePixelRatio: window.devicePixelRatio || 1,
        maxDevicePixelRatio: window.innerWidth < 768 ? 1.2 : 1.6,
      });

      if (
        canvas.width !== renderSize.pixelWidth ||
        canvas.height !== renderSize.pixelHeight
      ) {
        canvas.width = renderSize.pixelWidth;
        canvas.height = renderSize.pixelHeight;
        canvas.style.width = `${renderSize.cssWidth}px`;
        canvas.style.height = `${renderSize.cssHeight}px`;
        canvas.style.transform = `translate(${-sourcePadding.inline}px, ${-sourcePadding.block}px)`;
      }

      const context = canvas.getContext("2d");

      if (!context) {
        return;
      }

      context.setTransform(
        renderSize.devicePixelRatio,
        0,
        0,
        renderSize.devicePixelRatio,
        0,
        0,
      );
      context.clearRect(0, 0, renderSize.cssWidth, renderSize.cssHeight);
      context.fillStyle = backdropColor;
      context.fillRect(0, 0, renderSize.cssWidth, renderSize.cssHeight);

      drawStoryText(context, storyBody, contentRect, sourcePadding);

      if (submitLabel) {
        drawSubmitLabel(context, submitLabel, contentRect, sourcePadding);
      }
    };

    const scheduleDraw = () => {
      if (frameId !== null) {
        window.cancelAnimationFrame(frameId);
      }

      frameId = window.requestAnimationFrame(draw);
    };

    const storyScroll = storyScrollRef.current;
    const resizeObserver =
      typeof ResizeObserver === "undefined"
        ? null
        : new ResizeObserver(scheduleDraw);

    scheduleDraw();
    window.addEventListener("resize", scheduleDraw);
    window.addEventListener("scroll", scheduleDraw, { passive: true });
    storyScroll?.addEventListener("scroll", scheduleDraw, { passive: true });

    if (contentRef.current) {
      resizeObserver?.observe(contentRef.current);
    }

    if (storyBodyRef.current) {
      resizeObserver?.observe(storyBodyRef.current);
    }

    if (submitLabelRef?.current) {
      resizeObserver?.observe(submitLabelRef.current);
    }

    const fontSet = document.fonts;
    fontSet.ready.then(scheduleDraw).catch(() => {});
    fontSet.addEventListener("loadingdone", scheduleDraw);

    return () => {
      window.removeEventListener("resize", scheduleDraw);
      window.removeEventListener("scroll", scheduleDraw);
      storyScroll?.removeEventListener("scroll", scheduleDraw);
      fontSet.removeEventListener("loadingdone", scheduleDraw);
      resizeObserver?.disconnect();

      if (frameId !== null) {
        window.cancelAnimationFrame(frameId);
      }
    };
  }, [contentRef, storyBodyRef, storyScrollRef, submitLabelRef]);

  return <canvas ref={canvasRef} className={className} aria-hidden="true" />;
}
