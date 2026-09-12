import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

function getCssRuleBody(source, selector) {
  const escapedSelector = selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = source.match(new RegExp(`${escapedSelector}\\s*\\{([^}]*)\\}`));

  return match?.[1] ?? null;
}

test("glass wordmark supports distinct home and story variants outside sampled mode", async () => {
  const source = await readFile(
    new URL("../components/glass/GlassWordmark.tsx", import.meta.url),
    "utf8",
  );
  const cssSource = await readFile(
    new URL("../components/glass/glass.module.css", import.meta.url),
    "utf8",
  );

  assert.equal(source.includes('renderer === "sampled"'), true);
  assert.equal(source.includes("drawSampledGlass"), true);
  assert.equal(source.includes('variant = "home"'), true);
  assert.equal(source.includes('variant === "home"'), true);
  assert.equal(source.includes('variant === "story"'), true);
  assert.equal(source.includes("glassWordmarkFallbackBase"), true);
  assert.equal(source.includes("glassWordmarkFallbackOverlay"), true);
  assert.equal(source.includes("glassWordmarkFallbackStory"), true);
  assert.equal(cssSource.includes(".glassWordmarkFallbackBase"), true);
  assert.equal(cssSource.includes(".glassWordmarkFallbackOverlay"), true);
  assert.equal(cssSource.includes(".glassWordmarkFallbackStory"), true);
  assert.equal(cssSource.includes(".glassWordmarkFallbackOverlayDom"), true);
  assert.equal(cssSource.includes("display: inline-grid;"), true);
  assert.equal(cssSource.includes("place-items: center;"), true);
  assert.equal(cssSource.includes("grid-area: 1 / 1;"), true);
  assert.equal(cssSource.includes("text-align: center;"), true);
});

test("glass wordmark uses a bounds highlight only for the homepage variant", async () => {
  const source = await readFile(
    new URL("../components/glass/GlassWordmark.tsx", import.meta.url),
    "utf8",
  );

  assert.equal(
    /if\s*\(variant === "home"\)\s*\{[\s\S]*fillRect\(0,\s*0,\s*measureRect\.width,\s*measureRect\.height\)/.test(
      source,
    ),
    true,
  );
  assert.equal(
    /else\s*\{[\s\S]*drawTrackedText\(context,\s*text,\s*font,\s*x,\s*y,\s*letterSpacingPx\)/.test(
      source,
    ),
    true,
  );
});

test("shared glass styles avoid standalone tinted wash layers", async () => {
  const cssSource = await readFile(
    new URL("../components/glass/glass.module.css", import.meta.url),
    "utf8",
  );

  assert.equal(cssSource.includes("rgba(98, 201, 255"), false);
  assert.equal(cssSource.includes("rgba(255, 166, 166"), false);
  assert.equal(cssSource.includes("rgba(145, 225, 255"), false);
});

test("glass wordmark scene highlight stays neutral", async () => {
  const source = await readFile(
    new URL("../components/glass/GlassWordmark.tsx", import.meta.url),
    "utf8",
  );

  assert.equal(source.includes("createLinearGradient"), true);
  assert.equal(source.includes("rgba(164, 227, 255"), false);
  assert.equal(source.includes("rgba(255, 168, 168"), false);
  assert.equal(source.includes("rgba(255,255,255,0.28)"), false);
});

test("glass wordmark shell leaves viewport placement to the caller", async () => {
  const cssSource = await readFile(
    new URL("../components/glass/glass.module.css", import.meta.url),
    "utf8",
  );
  const glassWordmarkRule = getCssRuleBody(cssSource, ".glassWordmark");

  assert.notEqual(glassWordmarkRule, null);
  assert.equal(glassWordmarkRule.includes("position:"), false);
});

test("glass wordmark composites the scene canvas onto a backdrop staging canvas before refraction", async () => {
  const source = await readFile(
    new URL("../components/glass/GlassWordmark.tsx", import.meta.url),
    "utf8",
  );

  assert.equal(source.includes("resolveSampledGlassBackdropColor"), true);
  assert.equal(
    source.includes('const stagingCanvas = document.createElement("canvas")'),
    true,
  );
  assert.equal(
    source.includes("stagingContext.fillStyle = backdropColor;"),
    true,
  );
  assert.equal(
    source.includes(
      "stagingContext.fillRect(0, 0, sourceRect.width, sourceRect.height);",
    ),
    true,
  );
  assert.equal(
    /stagingContext\.drawImage\(\s*sourceCanvas,\s*0,\s*0/.test(source),
    true,
  );
  assert.equal(source.includes("sourceCanvas: stagingCanvas"), true);
});

test("glass wordmark fallback does not use a transparent backdrop panel", async () => {
  const cssSource = await readFile(
    new URL("../components/glass/glass.module.css", import.meta.url),
    "utf8",
  );

  const fallbackRule = getCssRuleBody(cssSource, ".glassWordmarkFallbackStory");

  assert.notEqual(fallbackRule, null);
  assert.equal(fallbackRule.includes("backdrop-filter"), false);
  assert.equal(fallbackRule.includes("-webkit-backdrop-filter"), false);
  assert.equal(fallbackRule.includes("display: grid;"), true);
});
