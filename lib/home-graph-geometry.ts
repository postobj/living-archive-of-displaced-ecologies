import * as THREE from "three";
import type {
  HomeGraphEdge,
  HomeGraphNode,
  HomeGraphTone,
} from "@/lib/home-graph";
import type { HomeGraphLine } from "./home-graph-scene.ts";
import { getHomeGraphNodeVisuals } from "./home-graph-scene.ts";

export interface HomeTextBlockSize {
  width: number;
  height: number;
}

export interface HomeScreenTextBox {
  centerX: number;
  centerY: number;
  width: number;
  height: number;
}

interface HomeScreenPoint {
  x: number;
  y: number;
}

export function getHomeTextBlockSize(
  tone: HomeGraphTone,
  isMobile: boolean,
): HomeTextBlockSize {
  const nodeVisuals = getHomeGraphNodeVisuals(tone, isMobile);

  return {
    width: nodeVisuals.blockWidth,
    height: nodeVisuals.blockHeight,
  };
}

export function getHomeTextHitAreaScale(
  tone: HomeGraphTone,
  isMobile: boolean,
): [number, number, number] {
  const nodeVisuals = getHomeGraphNodeVisuals(tone, isMobile);

  return [
    nodeVisuals.blockWidth + nodeVisuals.hitAreaPaddingX,
    nodeVisuals.blockHeight + nodeVisuals.hitAreaPaddingY,
    1,
  ];
}

export function getAnimatedHomeNodePosition(
  node: Pick<HomeGraphNode, "position" | "animationDelayMs">,
  elapsedTime: number,
  reducedMotion: boolean,
): [number, number, number] {
  const [baseX, baseY, baseZ] = node.position;

  if (reducedMotion) {
    return [baseX, baseY, baseZ];
  }

  const seed = node.animationDelayMs * 0.0025;

  return [
    baseX + Math.cos(elapsedTime * 0.2 + seed) * 0.06,
    baseY + Math.sin(elapsedTime * 0.42 + seed) * 0.18,
    baseZ + Math.sin(elapsedTime * 0.28 + seed) * 0.14,
  ];
}

interface TextAnchorInput {
  center: THREE.Vector3;
  target: THREE.Vector3;
  size: HomeTextBlockSize;
  cameraRight: THREE.Vector3;
  cameraUp: THREE.Vector3;
  gap?: number;
}

export function getTextEdgeAnchor({
  center,
  target,
  size,
  cameraRight,
  cameraUp,
  gap = 0,
}: TextAnchorInput): THREE.Vector3 {
  const direction = new THREE.Vector3().subVectors(target, center);
  let localX = direction.dot(cameraRight);
  let localY = direction.dot(cameraUp);

  if (Math.abs(localX) < 1e-4 && Math.abs(localY) < 1e-4) {
    localX = 1;
    localY = 0;
  }

  const halfWidth = size.width / 2;
  const halfHeight = size.height / 2;
  const scaleX =
    Math.abs(localX) > 1e-4 ? halfWidth / Math.abs(localX) : Infinity;
  const scaleY =
    Math.abs(localY) > 1e-4 ? halfHeight / Math.abs(localY) : Infinity;
  const scale = Math.min(scaleX, scaleY);

  const anchor = center.clone();
  anchor.addScaledVector(cameraRight, localX * scale);
  anchor.addScaledVector(cameraUp, localY * scale);

  if (gap > 0) {
    const gapDirection = cameraRight
      .clone()
      .multiplyScalar(localX)
      .addScaledVector(cameraUp, localY)
      .normalize();

    anchor.addScaledVector(gapDirection, gap);
  }

  return anchor;
}

interface HomeEdgeAnchorInput {
  fromCenter: THREE.Vector3;
  toCenter: THREE.Vector3;
  fromTone: HomeGraphTone;
  toTone: HomeGraphTone;
  fromSize?: HomeTextBlockSize;
  toSize?: HomeTextBlockSize;
  isMobile: boolean;
  cameraRight: THREE.Vector3;
  cameraUp: THREE.Vector3;
}

export function getAnchoredHomeEdgePoints({
  fromCenter,
  toCenter,
  fromTone,
  toTone,
  fromSize,
  toSize,
  isMobile,
  cameraRight,
  cameraUp,
}: HomeEdgeAnchorInput): [THREE.Vector3, THREE.Vector3] {
  const fromVisuals = getHomeGraphNodeVisuals(fromTone, isMobile);
  const toVisuals = getHomeGraphNodeVisuals(toTone, isMobile);
  const fromAnchor = getTextEdgeAnchor({
    center: fromCenter,
    target: toCenter,
    size: fromSize ?? {
      width: fromVisuals.blockWidth,
      height: fromVisuals.blockHeight,
    },
    cameraRight,
    cameraUp,
    gap: fromVisuals.connectorGap,
  });

  const toAnchor = getTextEdgeAnchor({
    center: toCenter,
    target: fromCenter,
    size: toSize ?? {
      width: toVisuals.blockWidth,
      height: toVisuals.blockHeight,
    },
    cameraRight,
    cameraUp,
    gap: toVisuals.connectorGap,
  });

  return [fromAnchor, toAnchor];
}

interface HomeScreenAnchorInput {
  centerX: number;
  centerY: number;
  targetX: number;
  targetY: number;
  size: HomeTextBlockSize;
  gap?: number;
}

export function getHomeScreenTextEdgeAnchor({
  centerX,
  centerY,
  targetX,
  targetY,
  size,
  gap = 0,
}: HomeScreenAnchorInput): HomeScreenPoint {
  let localX = targetX - centerX;
  let localY = targetY - centerY;

  if (Math.abs(localX) < 1e-4 && Math.abs(localY) < 1e-4) {
    localX = 1;
    localY = 0;
  }

  const halfWidth = size.width / 2;
  const halfHeight = size.height / 2;
  const scaleX =
    Math.abs(localX) > 1e-4 ? halfWidth / Math.abs(localX) : Infinity;
  const scaleY =
    Math.abs(localY) > 1e-4 ? halfHeight / Math.abs(localY) : Infinity;
  const scale = Math.min(scaleX, scaleY);
  const distance = Math.hypot(localX, localY);
  const gapScale = distance > 1e-4 ? gap / distance : 0;

  return {
    x: centerX + localX * (scale + gapScale),
    y: centerY + localY * (scale + gapScale),
  };
}

interface HomeScreenEdgeAnchorInput {
  fromBox: HomeScreenTextBox;
  toBox: HomeScreenTextBox;
  gap?: number;
}

export function getAnchoredHomeScreenEdgePoints({
  fromBox,
  toBox,
  gap = 0,
}: HomeScreenEdgeAnchorInput): [HomeScreenPoint, HomeScreenPoint] {
  const fromAnchor = getHomeScreenTextEdgeAnchor({
    centerX: fromBox.centerX,
    centerY: fromBox.centerY,
    targetX: toBox.centerX,
    targetY: toBox.centerY,
    size: {
      width: fromBox.width,
      height: fromBox.height,
    },
    gap,
  });
  const toAnchor = getHomeScreenTextEdgeAnchor({
    centerX: toBox.centerX,
    centerY: toBox.centerY,
    targetX: fromBox.centerX,
    targetY: fromBox.centerY,
    size: {
      width: toBox.width,
      height: toBox.height,
    },
    gap,
  });

  return [fromAnchor, toAnchor];
}

interface BuildMeasuredHomeGraphLinesInput {
  edges: readonly HomeGraphEdge[];
  boxesByNodeId: Partial<Record<string, HomeScreenTextBox>>;
  gap?: number;
}

export function buildMeasuredHomeGraphLines({
  edges,
  boxesByNodeId,
  gap = 0,
}: BuildMeasuredHomeGraphLinesInput): HomeGraphLine[] {
  return edges.flatMap((edge) => {
    const fromBox = boxesByNodeId[edge.from];
    const toBox = boxesByNodeId[edge.to];

    if (!fromBox || !toBox) {
      return [];
    }

    const [fromAnchor, toAnchor] = getAnchoredHomeScreenEdgePoints({
      fromBox,
      toBox,
      gap,
    });

    return [
      {
        id: edge.id,
        x1: Number(fromAnchor.x.toFixed(3)),
        y1: Number(fromAnchor.y.toFixed(3)),
        x2: Number(toAnchor.x.toFixed(3)),
        y2: Number(toAnchor.y.toFixed(3)),
      },
    ];
  });
}
