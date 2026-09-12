import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("story floating visuals adapt preview shape from natural image dimensions", async () => {
  const source = await readFile(
    new URL("../components/StoryFloatingVisuals.tsx", import.meta.url),
    "utf8",
  );

  assert.equal(source.includes("getAdaptiveStoryImagePreviewStyle"), true);
  assert.equal(source.includes("getNaturalStoryImagePreviewAspectRatio"), true);
  assert.equal(source.includes("getDesktopStoryImagePreviewSlot"), true);
  assert.equal(source.includes("getDesktopStoryImagePreviewStageHeight"), true);
  assert.equal(
    source.includes("visibleMediaSources.map((mediaSource, index)"),
    true,
  );
  assert.equal(source.includes("imageAspectRatios"), true);
  assert.equal(source.includes("onLoad={(event)"), true);
  assert.equal(source.includes("event.currentTarget.naturalWidth"), true);
  assert.equal(source.includes("event.currentTarget.naturalHeight"), true);
  assert.equal(
    source.includes("aspectRatio: `${previewLayout.aspectRatio}`"),
    true,
  );
  assert.equal(source.includes("maxWidth: previewLayout.mobileMaxWidth"), true);
  assert.equal(source.includes("left: `${previewLayout.leftPercent}%`"), true);
  assert.equal(source.includes("top: `${previewLayout.topOffsetPx}px`"), true);
  assert.equal(
    source.includes("width: `${previewLayout.widthPercent}%`"),
    true,
  );
  assert.equal(
    source.includes("style={{ minHeight: `${desktopStageHeight}px` }}"),
    true,
  );
  assert.equal(source.includes('className="object-contain"'), true);
  assert.equal(source.includes('className="object-cover"'), false);
});
