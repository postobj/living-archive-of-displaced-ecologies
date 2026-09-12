import assert from "node:assert/strict";
import test from "node:test";
import * as THREE from "three";

import {
  buildMeasuredHomeGraphLines,
  getAnchoredHomeEdgePoints,
  getAnchoredHomeScreenEdgePoints,
  getAnimatedHomeNodePosition,
  getHomeTextBlockSize,
  getTextEdgeAnchor,
} from "../lib/home-graph-geometry.ts";

function roundTriplet(vector) {
  return vector.toArray().map((value) => Number(value.toFixed(3)));
}

function getHorizontalConnectorGap(tone) {
  const edgeDistance = 10;
  const [fromAnchor, toAnchor] = getAnchoredHomeEdgePoints({
    fromCenter: new THREE.Vector3(0, 0, 0),
    toCenter: new THREE.Vector3(edgeDistance, 0, 0),
    fromTone: tone,
    toTone: tone,
    isMobile: false,
    cameraRight: new THREE.Vector3(1, 0, 0),
    cameraUp: new THREE.Vector3(0, 1, 0),
  });
  const halfWidth = getHomeTextBlockSize(tone, false).width / 2;
  const fromGap = Number((fromAnchor.x - halfWidth).toFixed(3));
  const toGap = Number((edgeDistance - toAnchor.x - halfWidth).toFixed(3));

  assert.equal(fromGap, toGap);

  return fromGap;
}

test("getTextEdgeAnchor uses the nearest horizontal text edge", () => {
  const anchor = getTextEdgeAnchor({
    center: new THREE.Vector3(0, 0, 0),
    target: new THREE.Vector3(10, 0, 0),
    size: { width: 4, height: 2 },
    cameraRight: new THREE.Vector3(1, 0, 0),
    cameraUp: new THREE.Vector3(0, 1, 0),
  });

  assert.deepEqual(roundTriplet(anchor), [2, 0, 0]);
});

test("getTextEdgeAnchor uses the nearest vertical text edge", () => {
  const anchor = getTextEdgeAnchor({
    center: new THREE.Vector3(0, 0, 0),
    target: new THREE.Vector3(1, 10, 0),
    size: { width: 4, height: 2 },
    cameraRight: new THREE.Vector3(1, 0, 0),
    cameraUp: new THREE.Vector3(0, 1, 0),
  });

  assert.deepEqual(roundTriplet(anchor), [0.1, 1, 0]);
});

test("getAnchoredHomeEdgePoints keeps matching connector gaps on both ends", () => {
  const titleGap = getHorizontalConnectorGap("title");

  assert.equal(titleGap > 0, true);
  assert.equal(titleGap, 0.1);
});

test("getAnchoredHomeEdgePoints uses the same desktop connector gap for every tone", () => {
  const titleGap = getHorizontalConnectorGap("title");
  const phraseGap = getHorizontalConnectorGap("phrase");
  const whisperGap = getHorizontalConnectorGap("whisper");

  assert.equal(phraseGap, titleGap);
  assert.equal(whisperGap, titleGap);
});

test("getAnimatedHomeNodePosition keeps base position when motion is reduced", () => {
  const position = getAnimatedHomeNodePosition(
    {
      position: [2, -1, 3],
      animationDelayMs: 240,
    },
    4.2,
    true,
  );

  assert.deepEqual(position, [2, -1, 3]);
});

test("getAnchoredHomeScreenEdgePoints keeps a tight equal gap to both text boxes", () => {
  const [fromAnchor, toAnchor] = getAnchoredHomeScreenEdgePoints({
    fromBox: { centerX: 100, centerY: 80, width: 80, height: 36 },
    toBox: { centerX: 300, centerY: 80, width: 120, height: 44 },
    gap: 6,
  });

  assert.deepEqual(fromAnchor, { x: 146, y: 80 });
  assert.deepEqual(toAnchor, { x: 234, y: 80 });
});

test("buildMeasuredHomeGraphLines derives long connectors from real text boxes", () => {
  const lines = buildMeasuredHomeGraphLines({
    edges: [{ id: "edge-a", from: "from-node", to: "to-node" }],
    boxesByNodeId: {
      "from-node": { centerX: 100, centerY: 80, width: 80, height: 36 },
      "to-node": { centerX: 300, centerY: 80, width: 120, height: 44 },
    },
    gap: 6,
  });

  assert.deepEqual(lines, [
    {
      id: "edge-a",
      x1: 146,
      y1: 80,
      x2: 234,
      y2: 80,
    },
  ]);
});
