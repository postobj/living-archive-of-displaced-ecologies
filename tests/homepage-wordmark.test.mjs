import assert from "node:assert/strict";
import test from "node:test";

import {
  HOME_WORDMARK_TOP_PERCENT,
  HOME_WORDMARK_MAX_FONT_SIZE_PX,
  HOME_WORDMARK_MIN_FONT_SIZE_PX,
  getFittedHomeWordmarkFontSize,
} from "../lib/homepage-wordmark.ts";

test("getFittedHomeWordmarkFontSize shrinks the wordmark to fit the safe viewport width", () => {
  assert.equal(
    getFittedHomeWordmarkFontSize({
      measuredWidthAtMaxFontSize: 900,
      viewportWidthPx: 320,
    }),
    58.88,
  );
});

test("getFittedHomeWordmarkFontSize keeps the configured maximum on wide screens", () => {
  assert.equal(
    getFittedHomeWordmarkFontSize({
      measuredWidthAtMaxFontSize: 420,
      viewportWidthPx: 1440,
    }),
    HOME_WORDMARK_MAX_FONT_SIZE_PX,
  );
});

test("getFittedHomeWordmarkFontSize never drops below the configured minimum", () => {
  assert.equal(
    getFittedHomeWordmarkFontSize({
      measuredWidthAtMaxFontSize: 2400,
      viewportWidthPx: 240,
    }),
    HOME_WORDMARK_MIN_FONT_SIZE_PX,
  );
});

test("homepage wordmark sits on the vertical centerline", () => {
  assert.equal(HOME_WORDMARK_TOP_PERCENT, 50);
});
