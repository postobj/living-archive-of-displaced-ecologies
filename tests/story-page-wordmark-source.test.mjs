import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

function getCssRuleBody(source, selector) {
  const escapedSelector = selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = source.match(new RegExp(`${escapedSelector}\\s*\\{([^}]*)\\}`));

  return match?.[1] ?? null;
}

function getNumericZIndexFromCss(source, selector) {
  const ruleBody = getCssRuleBody(source, selector);

  if (!ruleBody) {
    return null;
  }

  const zIndexMatch = ruleBody.match(/z-index:\s*(\d+)/);

  return zIndexMatch ? Number(zIndexMatch[1]) : null;
}

test("story page wires the centered glass wordmark overlay from story metadata", async () => {
  const source = await readFile(
    new URL("../app/stories/[slug]/page.tsx", import.meta.url),
    "utf8",
  );

  assert.equal(source.includes("StoryVisualStage"), true);
  assert.equal(source.includes("getStoryWordmarkText"), true);
  assert.equal(source.includes("storyWordmarkText"), true);
  assert.equal(source.includes("story.metadata.posterShortText"), true);
  assert.equal(source.includes("story.metadata.title"), true);
  assert.equal(source.includes("story.metadata.contributor"), true);
  assert.equal(source.includes("story.metadata.slogan"), true);
});

test("story page title and slogan inherit body font, no explicit fontFamily override", async () => {
  const source = await readFile(
    new URL("../app/stories/[slug]/page.tsx", import.meta.url),
    "utf8",
  );

  // Titles no longer carry an explicit fontFamily — they inherit from the body.
  assert.equal(source.includes("fontFamily:"), false);
  // The body font stack includes HuiWenFangSong for CJK fallback.
  const cssSource = await readFile(
    new URL("../app/globals.css", import.meta.url),
    "utf8",
  );
  assert.equal(
    cssSource.includes(
      'var(--font-suwannaphum), "HuiWenFangSong", "Times New Roman", serif;',
    ),
    true,
  );
});

test("sentence navigation preview title and slogan use Segment-first stack with HuiWenFangSong CJK fallback", async () => {
  const source = await readFile(
    new URL("../components/SentenceNavigation.tsx", import.meta.url),
    "utf8",
  );

  assert.equal(
    source.includes(
      'const SENTENCE_DISPLAY_FONT_FAMILY =\n  \'"Segment", "HuiWenFangSong", var(--font-suwannaphum), serif\';',
    ),
    true,
  );
  assert.equal(
    source.includes("fontFamily: SENTENCE_DISPLAY_FONT_FAMILY,"),
    true,
  );
  // Used for both title and slogan in preview
  assert.equal(
    (source.match(/fontFamily: SENTENCE_DISPLAY_FONT_FAMILY,/g) ?? []).length,
    2,
  );
});

test("story centered wordmark uses the story variant and can be hidden while the lightbox is open", async () => {
  const source = await readFile(
    new URL("../components/StoryCenteredWordmark.tsx", import.meta.url),
    "utf8",
  );

  assert.equal(source.includes("GlassWordmark"), true);
  assert.equal(source.includes("StoryWordmarkSourceCanvas"), true);
  assert.equal(source.includes("GLASS_PROFILES.homeWordmark"), true);
  assert.equal(source.includes("useGlassCapability"), true);
  assert.equal(source.includes("getFittedHomeWordmarkFontSize"), true);
  assert.equal(source.includes("splitStoryWordmarkLines"), true);
  assert.equal(source.includes("STORY_WORDMARK_FONT_SCALE"), true);
  assert.equal(source.includes("hidden?: boolean"), true);
  assert.equal(source.includes("if (hidden)"), true);
  assert.equal(source.includes('variant="story"'), true);
  assert.equal(source.includes('className="story-figma-wordmark-line"'), true);
  assert.equal(source.includes('className="story-figma-wordmark"'), true);
  assert.equal(source.includes("pointer-events-none"), true);
  assert.equal(source.includes("aria-hidden"), true);
});

test("story wordmark source canvas stays fixed to the viewport for sampled refraction", async () => {
  const source = await readFile(
    new URL(
      "../components/glass/StoryWordmarkSourceCanvas.tsx",
      import.meta.url,
    ),
    "utf8",
  );

  assert.equal(source.includes("onCanvasReady"), true);
  assert.equal(source.includes("matchMedia"), true);
  assert.equal(source.includes("visualViewport"), true);
  assert.equal(source.includes("MutationObserver"), true);
  assert.equal(source.includes("requestAnimationFrame"), true);
  assert.equal(source.includes("storyWordmarkSourceCanvas"), true);
  assert.equal(source.includes("fillStyle = palette.background"), true);
  assert.equal(source.includes("fillText("), false);
  assert.equal(source.includes("setLineDash"), false);
  assert.equal(source.includes("ellipse("), false);
});

test("story wordmark sits above story visuals but below persistent navigation", async () => {
  const [cssSource, pageSource] = await Promise.all([
    readFile(new URL("../app/globals.css", import.meta.url), "utf8"),
    readFile(
      new URL("../app/stories/[slug]/page.tsx", import.meta.url),
      "utf8",
    ),
  ]);

  const wordmarkZIndex = getNumericZIndexFromCss(
    cssSource,
    ".story-figma-wordmark",
  );
  const sourceCanvasRule = getCssRuleBody(
    cssSource,
    ".storyWordmarkSourceCanvas",
  );
  const backLinkZIndex = getNumericZIndexFromCss(cssSource, ".site-back-link");

  assert.notEqual(wordmarkZIndex, null);
  assert.notEqual(backLinkZIndex, null);
  assert.notEqual(sourceCanvasRule, null);
  assert.equal(wordmarkZIndex > 20, true);
  assert.equal(wordmarkZIndex < 40, true);
  assert.equal(backLinkZIndex > wordmarkZIndex, true);
  assert.equal(sourceCanvasRule.includes("position: fixed;"), true);
  assert.equal(sourceCanvasRule.includes("inset: 0;"), true);
  assert.equal(sourceCanvasRule.includes("pointer-events: none;"), true);
  assert.equal(pageSource.includes("fixed inset-x-0 z-40"), true);
});
