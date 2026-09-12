export interface RectLike {
  left: number;
  top: number;
  width: number;
  height: number;
}

export interface Point {
  x: number;
  y: number;
}

export interface AboutConnectorLayout {
  compact: boolean;
  start: Point;
  label: Point;
  end: Point;
  topPath: string;
  bottomPath: string;
}

interface BuildAboutConnectorLayoutInput {
  contentRect: RectLike;
  startRect: RectLike;
  labelRect: RectLike;
  endRect: RectLike;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function getLocalCenter(rect: RectLike, contentRect: RectLike): Point {
  return {
    x: rect.left + rect.width * 0.5 - contentRect.left,
    y: rect.top + rect.height * 0.5 - contentRect.top,
  };
}

function offsetPointToward(
  source: Point,
  target: Point,
  distance: number,
): Point {
  const dx = target.x - source.x;
  const dy = target.y - source.y;
  const length = Math.hypot(dx, dy);

  if (length === 0) {
    return source;
  }

  return {
    x: source.x + (dx / length) * distance,
    y: source.y + (dy / length) * distance,
  };
}

function toPath(start: Point, control1: Point, control2: Point, end: Point) {
  return `M ${start.x.toFixed(2)} ${start.y.toFixed(2)} C ${control1.x.toFixed(2)} ${control1.y.toFixed(2)}, ${control2.x.toFixed(2)} ${control2.y.toFixed(2)}, ${end.x.toFixed(2)} ${end.y.toFixed(2)}`;
}

function buildDesktopLayout(
  contentRect: RectLike,
  start: Point,
  label: Point,
  labelRect: RectLike,
  end: Point,
): AboutConnectorLayout {
  const labelHeight = labelRect.height;

  const topCurveEnd: Point = {
    x: label.x,
    y: label.y - clamp(labelHeight * 0.76, 24, 34),
  };
  const bottomCurveStart: Point = {
    x: label.x,
    y: label.y + clamp(labelHeight * 0.72, 20, 30),
  };

  const topControl1: Point = {
    x: start.x + Math.max(180, (topCurveEnd.x - start.x) * 0.62),
    y: start.y - 18,
  };
  const topControl2: Point = {
    x: topCurveEnd.x,
    y: start.y + Math.max(48, (topCurveEnd.y - start.y) * 0.18),
  };

  const bottomControl1: Point = {
    x: bottomCurveStart.x,
    y: bottomCurveStart.y + Math.max(175, (end.y - bottomCurveStart.y) * 0.58),
  };
  const bottomControl2: Point = {
    x: end.x - Math.max(205, (end.x - bottomCurveStart.x) * 0.48),
    y: end.y + Math.max(24, (end.y - bottomCurveStart.y) * 0.08),
  };

  return {
    compact: false,
    start,
    label,
    end,
    topPath: toPath(
      offsetPointToward(start, topControl1, 12),
      topControl1,
      topControl2,
      topCurveEnd,
    ),
    bottomPath: toPath(
      bottomCurveStart,
      bottomControl1,
      bottomControl2,
      offsetPointToward(end, bottomControl2, 14),
    ),
  };
}

function buildCompactLayout(
  contentRect: RectLike,
  start: Point,
  label: Point,
  labelRect: RectLike,
  end: Point,
): AboutConnectorLayout {
  const labelHeight = labelRect.height;

  const topCurveEnd: Point = {
    x: label.x,
    y: label.y - clamp(labelHeight * 0.84, 28, 38),
  };
  const bottomCurveStart: Point = {
    x: label.x,
    y: label.y + clamp(labelHeight * 0.84, 20, 28),
  };

  const topControl1: Point = {
    x: start.x + Math.max(60, (topCurveEnd.x - start.x) * 0.52),
    y: start.y - 18,
  };
  const topControl2: Point = {
    x: topCurveEnd.x,
    y: start.y + Math.max(68, (topCurveEnd.y - start.y) * 0.34),
  };

  const bottomControl1: Point = {
    x: bottomCurveStart.x,
    y: bottomCurveStart.y + Math.max(72, (end.y - bottomCurveStart.y) * 0.42),
  };
  const bottomControl2: Point = {
    x: end.x - Math.max(94, (end.x - bottomCurveStart.x) * 0.46),
    y: end.y + Math.max(14, (end.y - bottomCurveStart.y) * 0.03),
  };

  return {
    compact: true,
    start,
    label,
    end,
    topPath: toPath(
      offsetPointToward(start, topControl1, 10),
      topControl1,
      topControl2,
      topCurveEnd,
    ),
    bottomPath: toPath(
      bottomCurveStart,
      bottomControl1,
      bottomControl2,
      offsetPointToward(end, bottomControl2, 12),
    ),
  };
}

export function buildAboutConnectorLayout({
  contentRect,
  startRect,
  labelRect,
  endRect,
}: BuildAboutConnectorLayoutInput): AboutConnectorLayout {
  const start = getLocalCenter(startRect, contentRect);
  const label = getLocalCenter(labelRect, contentRect);
  const end = getLocalCenter(endRect, contentRect);

  if (contentRect.width < 920) {
    return buildCompactLayout(contentRect, start, label, labelRect, end);
  }

  return buildDesktopLayout(contentRect, start, label, labelRect, end);
}
