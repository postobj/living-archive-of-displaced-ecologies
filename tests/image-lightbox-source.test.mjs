import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("shared image lightbox centralizes dialog and escape handling for story and news views", async () => {
  const [
    lightboxSource,
    newsPageSource,
    storyVisualsSource,
    storyVisualStageSource,
  ] = await Promise.all([
    readFile(
      new URL("../components/ImageLightbox.tsx", import.meta.url),
      "utf8",
    ),
    readFile(
      new URL("../app/news/NewsPageClient.tsx", import.meta.url),
      "utf8",
    ),
    readFile(
      new URL("../components/StoryFloatingVisuals.tsx", import.meta.url),
      "utf8",
    ),
    readFile(
      new URL("../components/StoryVisualStage.tsx", import.meta.url),
      "utf8",
    ),
  ]);

  assert.equal(lightboxSource.includes('role="dialog"'), true);
  assert.equal(lightboxSource.includes('aria-modal="true"'), true);
  assert.equal(lightboxSource.includes("document.body.style.overflow"), true);
  assert.equal(lightboxSource.includes('event.key === "Escape"'), true);

  assert.equal(newsPageSource.includes("import { ImageLightbox }"), true);
  assert.equal(newsPageSource.includes("<ImageLightbox"), true);
  assert.equal(newsPageSource.includes('role="dialog"'), false);
  assert.equal(newsPageSource.includes("document.body.style.overflow"), false);

  assert.equal(storyVisualsSource.includes("import { ImageLightbox }"), true);
  assert.equal(storyVisualsSource.includes("<ImageLightbox"), true);
  assert.equal(storyVisualsSource.includes("onLightboxOpenChange"), true);
  assert.equal(storyVisualsSource.includes("Boolean(activeVisual)"), true);
  assert.equal(storyVisualsSource.includes('role="dialog"'), false);
  assert.equal(
    storyVisualsSource.includes("document.body.style.overflow"),
    false,
  );

  assert.equal(storyVisualStageSource.includes("StoryCenteredWordmark"), true);
  assert.equal(storyVisualStageSource.includes("StoryFloatingVisuals"), true);
  assert.equal(storyVisualStageSource.includes("setIsLightboxOpen"), true);
  assert.equal(
    storyVisualStageSource.includes("onLightboxOpenChange={setIsLightboxOpen}"),
    true,
  );
  assert.equal(
    storyVisualStageSource.includes("hidden={isLightboxOpen}"),
    true,
  );
});
