import assert from "node:assert/strict";
import test from "node:test";

import {
  getSentenceNodeScale,
  getSentenceNodeTextVisuals,
  getSphereNodeEmissiveIntensity,
  getSphereNodeOpacity,
  getSphereNodeScale,
} from "../lib/story-node-visuals.ts";

function assertClose(actual, expected) {
  assert.ok(Math.abs(actual - expected) < 1e-9);
}

test("sentence node scale keeps current visibility and hover behavior", () => {
  assertClose(getSentenceNodeScale(0.5, false, false), 0.93);
  assertClose(getSentenceNodeScale(0.5, false, true), 0.9858);
  assertClose(getSentenceNodeScale(0.2, true, false), 1.05);
});

test("sphere node visuals keep current emphasis rules", () => {
  assertClose(getSphereNodeScale(0.5, false, true), 0.72);
  assertClose(getSphereNodeScale(0.2, true, false), 1.3);
  assertClose(getSphereNodeOpacity(0.05), 0.2);
  assertClose(getSphereNodeOpacity(1), 1);
  assert.equal(
    getSphereNodeEmissiveIntensity({
      hovered: false,
      isActive: false,
      isConnected: false,
      isSelected: true,
    }),
    1,
  );
  assert.equal(
    getSphereNodeEmissiveIntensity({
      hovered: false,
      isActive: true,
      isConnected: false,
      isSelected: false,
    }),
    0.8,
  );
});

test("sentence node text visuals keep active and idle styling", () => {
  assert.deepEqual(getSentenceNodeTextVisuals(false, false), {
    color: "rgba(40, 30, 30, 0.9)",
    textShadow: "0 0 16px rgba(255, 255, 255, 0.22)",
  });

  assert.deepEqual(getSentenceNodeTextVisuals(true, false), {
    color: "var(--page-accent)",
    textShadow: "0 0 22px rgba(228, 0, 0, 0.14)",
  });
});
