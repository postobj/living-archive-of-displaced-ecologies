import assert from "node:assert/strict";
import test from "node:test";

import {
  STORY_WORDMARK_FONT_SCALE,
  getStoryWordmarkFontSize,
  getStoryWordmarkText,
  splitStoryWordmarkLines,
} from "../lib/story-wordmark.ts";

test("getStoryWordmarkText prefers posterShortText over title", () => {
  assert.equal(
    getStoryWordmarkText({
      posterShortText: "Two kitchens, one survival",
      title: "Double Shifts",
    }),
    "TWO KITCHENS, ONE SURVIVAL",
  );
});

test("getStoryWordmarkText falls back to title when posterShortText is blank", () => {
  assert.equal(
    getStoryWordmarkText({
      posterShortText: "   ",
      title: "Imaginary Rescripting",
    }),
    "IMAGINARY RESCRIPTING",
  );
});

test("getStoryWordmarkText trims and uppercases the final display copy", () => {
  assert.equal(
    getStoryWordmarkText({
      posterShortText: "  Language tastes like labor  ",
      title: "Superposed Tongue",
    }),
    "LANGUAGE TASTES LIKE LABOR",
  );
});

test("story wordmark font scale enlarges the fitted size by 30 percent when space allows", () => {
  assert.equal(STORY_WORDMARK_FONT_SCALE, 1.3);
  assert.equal(
    getStoryWordmarkFontSize({
      baseFittedFontSizePx: 100,
      measuredLineWidthAtMaxFontSize: 120,
      availableWidthPx: 400,
    }),
    130,
  );
});

test("story wordmark font size shrinks the enlarged line back to fit when needed", () => {
  assert.equal(
    getStoryWordmarkFontSize({
      baseFittedFontSizePx: 100,
      measuredLineWidthAtMaxFontSize: 700,
      availableWidthPx: 400,
    }),
    105.14,
  );
});

test("splitStoryWordmarkLines returns a balanced two-line split for longer slogans", () => {
  assert.deepEqual(splitStoryWordmarkLines("LANGUAGE TASTES LIKE LABOR"), [
    "LANGUAGE TASTES",
    "LIKE LABOR",
  ]);
});

test("splitStoryWordmarkLines keeps single-word or unsplittable copy on one line", () => {
  assert.deepEqual(splitStoryWordmarkLines("ECHOES"), ["ECHOES"]);
});
