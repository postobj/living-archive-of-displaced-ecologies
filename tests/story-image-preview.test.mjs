import assert from "node:assert/strict";
import test from "node:test";

import {
  DEFAULT_STORY_IMAGE_PREVIEW_ASPECT_RATIO,
  getAdaptiveStoryImagePreviewStyle,
  getBoundedStoryImagePreviewAspectRatio,
  getDesktopStoryImagePreviewSlot,
  getDesktopStoryImagePreviewStageHeight,
  getNaturalStoryImagePreviewAspectRatio,
  getStoryImagePreviewOrientation,
  MAX_STORY_IMAGE_PREVIEW_ASPECT_RATIO,
  MIN_STORY_IMAGE_PREVIEW_ASPECT_RATIO,
} from "../lib/story-image-preview.ts";

function assertClose(actual, expected) {
  assert.ok(Math.abs(actual - expected) < 1e-9);
}

test("story image preview aspect ratios default and stay bounded", () => {
  assert.equal(
    getBoundedStoryImagePreviewAspectRatio(null),
    DEFAULT_STORY_IMAGE_PREVIEW_ASPECT_RATIO,
  );
  assert.equal(
    getBoundedStoryImagePreviewAspectRatio(Number.NaN),
    DEFAULT_STORY_IMAGE_PREVIEW_ASPECT_RATIO,
  );
  assert.equal(
    getBoundedStoryImagePreviewAspectRatio(0.25),
    MIN_STORY_IMAGE_PREVIEW_ASPECT_RATIO,
  );
  assert.equal(
    getBoundedStoryImagePreviewAspectRatio(4),
    MAX_STORY_IMAGE_PREVIEW_ASPECT_RATIO,
  );
});

test("story image preview orientation follows portrait, square, and landscape thresholds", () => {
  assert.equal(getStoryImagePreviewOrientation(0.89), "portrait");
  assert.equal(getStoryImagePreviewOrientation(0.9), "square");
  assert.equal(getStoryImagePreviewOrientation(1), "square");
  assert.equal(getStoryImagePreviewOrientation(1.15), "square");
  assert.equal(getStoryImagePreviewOrientation(1.16), "landscape");
});

test("story image preview derives natural image ratios", () => {
  assertClose(
    getNaturalStoryImagePreviewAspectRatio({
      naturalHeight: 1438,
      naturalWidth: 1106,
    }),
    1106 / 1438,
  );

  assert.equal(
    getNaturalStoryImagePreviewAspectRatio({
      naturalHeight: 0,
      naturalWidth: 1106,
    }),
    DEFAULT_STORY_IMAGE_PREVIEW_ASPECT_RATIO,
  );
});

test("adaptive story image preview style narrows portrait cards without changing their row", () => {
  assert.deepEqual(
    getAdaptiveStoryImagePreviewStyle(
      {
        connectorX: 24,
        connectorY: 24,
        delay: "1.1s",
        duration: "10.1s",
        key: "right-secondary",
        leftPercent: 58,
        topOffsetPx: 430,
        widthPercent: 31,
      },
      0.4,
    ),
    {
      aspectRatio: MIN_STORY_IMAGE_PREVIEW_ASPECT_RATIO,
      leftPercent: 58,
      mobileMaxWidth: "19rem",
      orientation: "portrait",
      topOffsetPx: 430,
      widthPercent: 21.08,
    },
  );
});

test("adaptive story image preview style preserves landscape scale", () => {
  assert.deepEqual(
    getAdaptiveStoryImagePreviewStyle(
      {
        connectorX: 24,
        connectorY: 60,
        delay: "0.55s",
        duration: "9.6s",
        key: "right-primary",
        leftPercent: 61,
        topOffsetPx: 56,
        widthPercent: 33,
      },
      1.5,
    ),
    {
      aspectRatio: 1.5,
      leftPercent: 61,
      mobileMaxWidth: "100%",
      orientation: "landscape",
      topOffsetPx: 56,
      widthPercent: 33,
    },
  );
});

test("desktop story image preview slots continue after the first three images", () => {
  assert.deepEqual(getDesktopStoryImagePreviewSlot(4), {
    connectorX: 18,
    connectorY: 64,
    delay: "1.8s",
    duration: "9.8s",
    key: "right-extra-1",
    leftPercent: 62,
    topOffsetPx: 970,
    widthPercent: 31,
  });

  assert.equal(getDesktopStoryImagePreviewStageHeight(3), 780);
  assert.equal(getDesktopStoryImagePreviewStageHeight(5), 1400);
});
