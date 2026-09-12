"use client";

import { useEffect, useRef } from "react";

interface StoryNextConnectorLineProps {
  enabled: boolean;
  toSelector?: string;
}

interface LineCoords {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

function isVisibleElement(element: HTMLElement): boolean {
  const rect = element.getBoundingClientRect();
  if (rect.width === 0 || rect.height === 0) {
    return false;
  }

  const style = window.getComputedStyle(element);
  return style.display !== "none" && style.visibility !== "hidden";
}

function isInViewport(rect: DOMRect): boolean {
  return (
    rect.bottom >= 0 &&
    rect.right >= 0 &&
    rect.top <= window.innerHeight &&
    rect.left <= window.innerWidth
  );
}

function getActiveAnchorDot(): HTMLElement | null {
  const candidates = document.querySelectorAll<HTMLElement>(
    ".story-red-node, .story-red-node-mobile",
  );

  for (const candidate of candidates) {
    if (isVisibleElement(candidate)) {
      return candidate;
    }
  }

  return null;
}

function createLineWithGap(
  fromX: number,
  fromY: number,
  toX: number,
  toY: number,
  fromGap: number,
  toGap: number,
): LineCoords | null {
  const dx = toX - fromX;
  const dy = toY - fromY;
  const distance = Math.hypot(dx, dy);
  const totalGap = fromGap + toGap;

  if (distance <= totalGap + 2) {
    return null;
  }

  const unitX = dx / distance;
  const unitY = dy / distance;

  return {
    x1: fromX + unitX * fromGap,
    y1: fromY + unitY * fromGap,
    x2: toX - unitX * toGap,
    y2: toY - unitY * toGap,
  };
}

export function StoryNextConnectorLine({
  enabled,
  toSelector = "#story-next-link",
}: StoryNextConnectorLineProps) {
  const lineRef = useRef<SVGLineElement | null>(null);
  const renderedCoordsRef = useRef<LineCoords | null>(null);

  useEffect(() => {
    if (!enabled) {
      renderedCoordsRef.current = null;
      if (lineRef.current) {
        lineRef.current.style.opacity = "0";
      }
      return;
    }

    let frameId: number | null = null;
    const smoothing = 0.18;

    const hideLine = () => {
      renderedCoordsRef.current = null;
      if (lineRef.current) {
        lineRef.current.style.opacity = "0";
      }
    };

    const drawLine = (target: LineCoords) => {
      const line = lineRef.current;
      if (!line) return;

      const previous = renderedCoordsRef.current;
      let next = target;

      if (previous) {
        next = {
          // Keep the red-circle anchor exact, and smooth only the far endpoint.
          x1: target.x1,
          y1: target.y1,
          x2: previous.x2 + (target.x2 - previous.x2) * smoothing,
          y2: previous.y2 + (target.y2 - previous.y2) * smoothing,
        };
      }

      renderedCoordsRef.current = next;
      line.setAttribute("x1", next.x1.toFixed(2));
      line.setAttribute("y1", next.y1.toFixed(2));
      line.setAttribute("x2", next.x2.toFixed(2));
      line.setAttribute("y2", next.y2.toFixed(2));
      line.style.opacity = "0.92";
    };

    const sync = () => {
      const fromElement = getActiveAnchorDot();
      const toElement = document.querySelector<HTMLElement>(toSelector);

      if (!fromElement || !toElement || !isVisibleElement(toElement)) {
        hideLine();
        frameId = window.requestAnimationFrame(sync);
        return;
      }

      const fromRect = fromElement.getBoundingClientRect();
      const toRect = toElement.getBoundingClientRect();

      if (!isInViewport(fromRect) || !isInViewport(toRect)) {
        hideLine();
        frameId = window.requestAnimationFrame(sync);
        return;
      }

      const fromX = fromRect.left + fromRect.width / 2;
      const fromY = fromRect.top + fromRect.height / 2;
      const toX = toRect.left;
      const toY = toRect.top + toRect.height / 2;
      // Use layout size so CSS pulse transform does not shift the anchor gap.
      const fromGap =
        Math.max(fromElement.offsetWidth, fromElement.offsetHeight) / 2 + 2;

      const targetCoords = createLineWithGap(
        fromX,
        fromY,
        toX,
        toY,
        fromGap,
        8,
      );
      if (!targetCoords) {
        hideLine();
        frameId = window.requestAnimationFrame(sync);
        return;
      }

      drawLine(targetCoords);
      frameId = window.requestAnimationFrame(sync);
    };

    frameId = window.requestAnimationFrame(sync);

    return () => {
      if (frameId !== null) {
        window.cancelAnimationFrame(frameId);
      }
    };
  }, [enabled, toSelector]);

  if (!enabled) {
    return null;
  }

  return (
    <svg
      className="pointer-events-none fixed inset-0 z-[12] h-full w-full"
      width="100%"
      height="100%"
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      <line
        ref={lineRef}
        x1="0"
        y1="0"
        x2="0"
        y2="0"
        stroke="var(--page-accent)"
        strokeWidth="1.8"
        strokeLinecap="round"
        opacity="0"
      />
    </svg>
  );
}
