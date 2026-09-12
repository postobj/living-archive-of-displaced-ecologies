import type { Point, RectLike } from "./about-connector-layout";

export interface AboutLensLayout {
  echoesFrom: Point;
  orientation: Point;
  fixedCenter: Point;
}

interface BuildAboutLensLayoutInput {
  storyBodyRect: RectLike;
  storyViewportRect: RectLike;
  echoesFromRect: RectLike;
  orientationRect: RectLike;
}

function getLocalCenter(rect: RectLike, containerRect: RectLike): Point {
  return {
    x: rect.left + rect.width * 0.5 - containerRect.left,
    y: rect.top + rect.height * 0.5 - containerRect.top,
  };
}

function getViewportCenter(rect: RectLike): Point {
  return {
    x: rect.left + rect.width * 0.5,
    y: rect.top + rect.height * 0.5,
  };
}

export function buildAboutLensLayout({
  storyBodyRect,
  storyViewportRect,
  echoesFromRect,
  orientationRect,
}: BuildAboutLensLayoutInput): AboutLensLayout {
  const bodyCenter = getViewportCenter(storyBodyRect);
  const viewportCenter = getViewportCenter(storyViewportRect);

  return {
    echoesFrom: getLocalCenter(echoesFromRect, storyBodyRect),
    orientation: getLocalCenter(orientationRect, storyBodyRect),
    fixedCenter: {
      x: bodyCenter.x,
      y: viewportCenter.y,
    },
  };
}
