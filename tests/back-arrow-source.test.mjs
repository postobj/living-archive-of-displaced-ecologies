import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("left/back navigation uses a shared figma-inspired back-arrow icon", async () => {
  const [iconSource, homeButtonSource, archiveButtonSource, cssSource] =
    await Promise.all([
      readFile(
        new URL("../components/BackArrowIcon.tsx", import.meta.url),
        "utf8",
      ).catch(() => null),
      readFile(
        new URL("../components/HomeBackWaveButton.tsx", import.meta.url),
        "utf8",
      ),
      readFile(
        new URL("../components/BackToArchiveArrow.tsx", import.meta.url),
        "utf8",
      ),
      readFile(new URL("../app/globals.css", import.meta.url), "utf8"),
    ]);

  assert.notEqual(iconSource, null);
  assert.equal(iconSource.includes('viewBox="0 0 111 46"'), true);
  assert.equal(iconSource.includes("currentColor"), true);
  assert.equal(homeButtonSource.includes("BackArrowIcon"), true);
  assert.equal(archiveButtonSource.includes("BackArrowIcon"), true);
  assert.equal(homeButtonSource.includes("home-arrow-svg"), false);
  assert.equal(archiveButtonSource.includes('viewBox="0 0 112 24"'), false);
  assert.equal(cssSource.includes(".back-arrow-icon"), true);
  assert.equal(cssSource.includes(".home-arrow-svg"), false);
  assert.equal(cssSource.includes("@keyframes arrow-left-flow"), false);
});

test("story pages keep the dedicated back-to-top arrow treatment", async () => {
  const [storyPageSource, cssSource] = await Promise.all([
    readFile(
      new URL("../app/stories/[slug]/page.tsx", import.meta.url),
      "utf8",
    ),
    readFile(new URL("../app/globals.css", import.meta.url), "utf8"),
  ]);

  assert.equal(storyPageSource.includes("story-back-top-link"), true);
  assert.equal(storyPageSource.includes("story-up-svg"), true);
  assert.equal(cssSource.includes(".story-up-svg"), true);
  assert.equal(cssSource.includes("@keyframes arrow-up-flow"), true);
});
