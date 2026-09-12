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

test("homepage fallback graph measures text nodes to derive connector lines", async () => {
  const source = await readFile(
    new URL("../components/HomepageHero.tsx", import.meta.url),
    "utf8",
  );

  assert.equal(source.includes("buildMeasuredHomeGraphLines"), true);
  assert.equal(source.includes("GlassWordmark"), true);
  assert.equal(source.includes("GLASS_PROFILES.homeWordmark"), true);
  assert.equal(source.includes('variant="home"'), true);
  assert.equal(source.includes("ResizeObserver"), true);
});

test("homepage hero schedules per-node language rotation for the main text nodes", async () => {
  const source = await readFile(
    new URL("../components/HomepageHero.tsx", import.meta.url),
    "utf8",
  );

  assert.equal(source.includes("getHomeGraphLanguageRotationIntervalMs"), true);
  assert.equal(source.includes("getNextHomeGraphLanguage"), true);
  assert.equal(source.includes("useGlassCapability"), true);
  assert.equal(source.includes("glassRenderer"), true);
  assert.equal(source.includes("window.setTimeout"), true);
  assert.equal(source.includes("startTransition"), true);
});

test("homepage wordmark stays above the sentence nodes in both render modes", async () => {
  const [cssSource, sceneSource] = await Promise.all([
    readFile(new URL("../app/globals.css", import.meta.url), "utf8"),
    readFile(
      new URL("../components/HomeConstellationScene.tsx", import.meta.url),
      "utf8",
    ),
  ]);

  const wordmarkZIndex = getNumericZIndexFromCss(
    cssSource,
    ".home-figma-wordmark",
  );
  const nodeZIndex = getNumericZIndexFromCss(cssSource, ".home-figma-node");
  const sceneHtmlZIndexRangeMatch = sceneSource.match(
    /zIndexRange=\{\[(\d+),\s*0\]\}/,
  );

  assert.notEqual(wordmarkZIndex, null);
  assert.notEqual(nodeZIndex, null);
  assert.notEqual(sceneHtmlZIndexRangeMatch, null);
  assert.equal(wordmarkZIndex > nodeZIndex, true);
  assert.equal(wordmarkZIndex > Number(sceneHtmlZIndexRangeMatch[1]), true);
});

test("homepage hero renders a layered wordmark for the figma glass treatment", async () => {
  const source = await readFile(
    new URL("../components/HomepageHero.tsx", import.meta.url),
    "utf8",
  );

  assert.equal(source.includes('data-node-id="162:6"'), true);
  assert.equal(source.includes("home-figma-wordmark__layer"), true);
  assert.equal(source.includes("home-figma-wordmark__base"), true);
  assert.equal(source.includes("home-figma-wordmark__sheen"), true);
  assert.equal(source.includes("home-figma-wordmark__outline"), true);
});

test("homepage hero styles preserve the translucent figma wordmark fill", async () => {
  const source = await readFile(
    new URL("../app/globals.css", import.meta.url),
    "utf8",
  );

  assert.equal(source.includes("isolation: isolate;"), true);
  assert.equal(source.includes(".home-figma-wordmark__layer"), true);
  assert.equal(source.includes("color: rgba(255, 255, 255, 0.6);"), true);
  assert.equal(source.includes("-webkit-background-clip: text;"), true);
  assert.equal(source.includes("-webkit-text-stroke: 1px"), true);
});
