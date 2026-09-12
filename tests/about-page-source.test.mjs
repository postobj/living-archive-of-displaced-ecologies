import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("buildAboutConnectorLayout converts measured anchors into desktop and compact paths", async () => {
  const connectorLayoutModule =
    await import("../lib/about-connector-layout.ts").catch(() => null);

  assert.notEqual(connectorLayoutModule, null);
  assert.equal(
    typeof connectorLayoutModule.buildAboutConnectorLayout,
    "function",
  );

  const desktopLayout = connectorLayoutModule.buildAboutConnectorLayout({
    contentRect: { left: 100, top: 20, width: 1000, height: 700 },
    startRect: { left: 220, top: 40, width: 20, height: 20 },
    labelRect: { left: 500, top: 280, width: 180, height: 42 },
    endRect: { left: 850, top: 560, width: 20, height: 20 },
  });

  assert.equal(desktopLayout.compact, false);
  assert.deepEqual(desktopLayout.start, { x: 130, y: 30 });
  assert.deepEqual(desktopLayout.label, { x: 490, y: 281 });
  assert.deepEqual(desktopLayout.end, { x: 760, y: 550 });
  assert.equal(desktopLayout.end.x - desktopLayout.label.x >= 240, true);
  assert.equal(desktopLayout.label.x > desktopLayout.start.x, true);
  assert.equal(desktopLayout.label.x < desktopLayout.end.x, true);
  assert.equal(desktopLayout.label.y > desktopLayout.start.y, true);
  assert.equal(desktopLayout.label.y < desktopLayout.end.y, true);
  assert.match(desktopLayout.topPath, /, 490\.00 [0-9.]+$/);
  assert.match(desktopLayout.bottomPath, /^M 490\.00 [0-9.]+ C /);
  assert.match(desktopLayout.topPath, /^M [-0-9. ]+ C [-0-9., ]+$/);
  assert.match(desktopLayout.bottomPath, /^M [-0-9. ]+ C [-0-9., ]+$/);

  const compactLayout = connectorLayoutModule.buildAboutConnectorLayout({
    contentRect: { left: 0, top: 0, width: 640, height: 1100 },
    startRect: { left: 90, top: 60, width: 18, height: 18 },
    labelRect: { left: 180, top: 420, width: 160, height: 38 },
    endRect: { left: 520, top: 900, width: 18, height: 18 },
  });

  assert.equal(compactLayout.compact, true);
  assert.deepEqual(compactLayout.start, { x: 99, y: 69 });
  assert.deepEqual(compactLayout.label, { x: 260, y: 439 });
  assert.deepEqual(compactLayout.end, { x: 529, y: 909 });
  assert.equal(compactLayout.label.y > compactLayout.start.y + 120, true);
  assert.equal(compactLayout.label.y < compactLayout.end.y - 120, true);
  assert.notEqual(compactLayout.topPath, compactLayout.bottomPath);
});

test("about page routes connector updates through the extracted layout helper", async () => {
  const source = await readFile(
    new URL("../app/about/page.tsx", import.meta.url),
    "utf8",
  );
  const cssSource = await readFile(
    new URL("../app/about/about.module.css", import.meta.url),
    "utf8",
  );
  const glassCssSource = await readFile(
    new URL("../components/glass/glass.module.css", import.meta.url),
    "utf8",
  );

  assert.equal(source.includes("buildAboutConnectorLayout"), false);
  assert.equal(source.includes("buildAboutLensLayout"), true);
  assert.equal(source.includes("useEffectEvent"), false);
  assert.equal(source.includes("startTransition"), true);
  assert.equal(source.includes("ResizeObserver"), true);
  assert.equal(source.includes("mailto:"), true);
  // Site identity and narrative are content, not code: the page must pull them
  // from content/ modules and contain no hardcoded contact email.
  assert.equal(source.includes('from "@/content/site"'), true);
  assert.equal(source.includes('from "@/content/about"'), true);
  assert.equal(source.includes("SITE_CONFIG.contactEmail"), true);
  const emailLiterals = source.match(/[\w.+-]+@[\w-]+\.[\w.]+/g) ?? [];
  assert.deepEqual(
    emailLiterals.filter((email) => !email.endsWith("@example.com")),
    [],
  );
  assert.equal(source.includes("Email:"), false);
  assert.equal(
    source.includes("Reach out with questions, context, or story leads."),
    false,
  );
  assert.equal(
    source.includes("Opens your email app with a prefilled draft."),
    false,
  );
  assert.equal(source.includes("contactHelper"), false);
  assert.equal(source.includes("labelAnchorRef"), false);
  assert.equal(source.includes("storyScrollRef"), true);
  assert.equal(source.includes("storyBodyRef"), true);
  assert.equal(source.includes("echoesFromRef"), true);
  assert.equal(source.includes("orientationRef"), true);
  assert.equal(source.includes("submitColumn"), false);
  assert.equal(source.includes("submitInteractive"), false);
  assert.equal(source.includes("submitOrbitDot"), false);
  assert.equal(source.includes("submitOrbitTopLeft"), false);
  assert.equal(source.includes("submitOrbitBottomRight"), false);
  assert.equal(source.includes("storyScroll"), true);
  assert.equal(source.includes("fixedEffectsLayer"), false);
  assert.equal(source.includes("SampledGlassLens"), true);
  assert.equal(source.includes("AboutGlassSourceCanvas"), true);
  assert.equal(source.includes("AboutFixedGlassSourceCanvas"), false);
  assert.equal(source.includes("GLASS_PROFILES.aboutLens"), false);
  assert.equal(source.includes("useGlassCapability"), true);
  assert.equal(source.includes("aboutSourceCanvas"), true);
  assert.equal(source.includes("setAboutSourceCanvas"), true);
  assert.equal(source.includes("aboutFixedSourceCanvas"), false);
  assert.equal(source.includes("setAboutFixedSourceCanvas"), false);
  assert.equal(
    /hasCanvasSource:\s*aboutSourceCanvas !== null && aboutFixedSourceCanvas !== null/.test(
      source,
    ),
    false,
  );
  assert.equal(source.includes("preferScene: true"), true);
  assert.equal(source.includes("fixedTextEffect"), false);
  assert.equal(source.includes("fixedLensContent"), false);
  assert.equal(source.includes("fixedLensViewport"), false);
  assert.equal(source.includes("fixedTextEffectStyle"), false);
  assert.equal(source.includes("var(--fixed-lens-size) / 2"), false);
  assert.equal(source.includes("var(--fixed-lens-width) / 2"), false);
  assert.equal(source.includes("var(--fixed-lens-height) / 2"), false);
  assert.equal(source.includes("storyEffectsLayer"), true);
  assert.equal(source.includes("submitPreviewActive"), false);
  assert.equal(source.includes("setSubmitLensHoverActive"), false);
  assert.equal(source.includes("setSubmitLensTouchActive"), false);
  assert.equal(source.includes("onPointerDown"), false);
  assert.equal(source.includes("onMouseEnter"), false);
  assert.equal(source.includes("onFocus"), false);
  assert.equal(source.includes("storyLensContent"), true);
  assert.equal(source.includes("storyNarrative"), true);
  assert.equal(source.includes("driftingCompassAccent"), true);
  const narrativeSource = await readFile(
    new URL("../content/about.tsx", import.meta.url),
    "utf8",
  );
  assert.equal(narrativeSource.includes(">Drifting Compass:</span>"), true);
  assert.equal(narrativeSource.includes("Drifting Compass</span>:"), false);
  assert.equal(source.includes("renderer={glassRenderer}"), true);
  assert.equal(source.includes("refractionScale={0.72}"), true);
  assert.equal(source.includes("dispersionScale={1.28}"), true);
  assert.equal(source.includes("highlightScale={0.24}"), true);
  assert.equal(source.includes("fillScale={0.06}"), true);
  assert.equal(source.includes("sourceCanvas={aboutFixedSourceCanvas}"), false);
  assert.equal(source.includes("sourceCanvas={aboutSourceCanvas}"), true);
  assert.equal(source.includes("refractionScale={0.9}"), false);
  assert.equal(source.includes('chromeVariant="softSpherical"'), false);
  assert.equal(source.includes("dispersionScale={1.65}"), false);
  assert.equal(source.includes("highlightScale={0.5}"), false);
  assert.equal(source.includes("fillScale={0.16}"), false);
  assert.equal(source.includes("rotationDeg={0}"), true);
  assert.equal(source.includes("storyBodyRef={storyBodyRef}"), true);
  assert.equal(source.includes("storyScrollRef={storyScrollRef}"), true);
  assert.equal(source.includes("fixedSceneRef"), false);
  assert.equal(source.includes("className={styles.brandLine}"), false);
  assert.equal(source.includes("textEffectTop"), true);
  assert.equal(source.includes("textEffectBottom"), true);
  assert.equal(source.includes("inlineHalo"), false);
  assert.equal(source.includes("ringPhrase"), false);
  assert.equal(cssSource.includes(".storyEffectsLayer"), true);
  assert.equal(cssSource.includes(".fixedEffectsLayer"), false);
  assert.equal(cssSource.includes(".fixedTextEffect"), false);
  assert.equal(
    cssSource.includes("background-color: rgba(255, 255, 255, 0.03);"),
    false,
  );
  assert.equal(
    cssSource.includes(
      "filter: drop-shadow(0 0 8px rgba(255, 255, 255, 0.03));",
    ),
    false,
  );
  assert.equal(cssSource.includes(".aboutGlassSourceCanvas"), true);
  assert.equal(cssSource.includes(".fixedLensContent"), false);
  assert.equal(cssSource.includes(".fixedLensViewport"), false);
  assert.equal(cssSource.includes(".fixedLensScene"), false);
  assert.equal(
    cssSource.includes("--fixed-lens-size: clamp(13.2rem, 25.1vw, 16.1rem);"),
    false,
  );
  assert.equal(cssSource.includes("width: var(--fixed-lens-size);"), false);
  assert.equal(cssSource.includes("height: var(--fixed-lens-size);"), false);
  assert.equal(cssSource.includes(".textEffectEchoes"), true);
  assert.equal(cssSource.includes(".textEffectOrientation"), true);
  assert.equal(
    cssSource.includes("background-color: rgba(255, 255, 255, 0.035);"),
    true,
  );
  assert.equal(
    cssSource.includes(
      "filter: drop-shadow(0 0 5px rgba(255, 255, 255, 0.03));",
    ),
    true,
  );
  assert.equal(cssSource.includes(".submitColumn"), false);
  assert.equal(cssSource.includes(".submitInteractive"), false);
  assert.equal(cssSource.includes(".submitOrbitDot"), false);
  assert.equal(cssSource.includes(".storyScroll"), true);
  assert.equal(cssSource.includes(".textEffect"), true);
  assert.equal(cssSource.includes(".submitPreviewActive .textEffect"), false);
  assert.equal(cssSource.includes(".storyLensContent"), true);
  assert.equal(cssSource.includes(".storyLensViewport"), true);
  assert.equal(cssSource.includes(".storyNarrative"), true);
  assert.equal(
    cssSource.includes("font-size: clamp(1.02rem, 1.33vw, 1.52rem);"),
    true,
  );
  assert.equal(cssSource.includes("line-height: 1.84;"), true);
  assert.equal(
    cssSource.includes("font-size: clamp(0.88rem, 1vw, 1.05rem);"),
    true,
  );
  assert.equal(cssSource.includes(".driftingCompassAccent"), true);
  assert.equal(
    cssSource.includes("--lens-width: clamp(8.9rem, 11.3vw, 10.6rem);"),
    true,
  );
  assert.equal(
    cssSource.includes("--lens-height: clamp(2.45rem, 2.75vw, 2.7rem);"),
    true,
  );
  assert.equal(cssSource.includes("/about/ellipse-9.svg"), true);
  assert.equal(cssSource.includes("/about/ellipse-15.svg"), true);
  assert.equal(cssSource.includes("/about/ellipse-20.svg"), false);
  assert.equal(cssSource.includes("/about/ellipse-20-mask.svg"), false);
  assert.equal(cssSource.includes("-webkit-mask"), true);
  assert.equal(cssSource.includes("mask: url("), true);
  assert.equal(cssSource.includes(".fixedTextEffect::before"), false);
  assert.equal(cssSource.includes(".fixedTextEffect::after"), false);
  assert.equal(cssSource.includes(".textEffect::before"), false);
  assert.equal(cssSource.includes(".textEffect::after"), false);
  assert.equal(cssSource.includes(".brandLine"), false);
  assert.equal(cssSource.includes(".contactHelper"), false);
  assert.equal(
    glassCssSource.includes(".sampledGlassChromeSphericalSoft::before"),
    true,
  );
  assert.equal(
    glassCssSource.includes(".sampledGlassChromeSphericalSoft::after"),
    true,
  );
  assert.equal(
    glassCssSource.includes(
      ".sampledGlassCanvasShell {\n  position: absolute;\n  inset: -10%;\n  display: grid;\n  place-items: center;\n  transform: rotate(calc(var(--glass-rotation) * -1)) scale(1.08);\n  transform-origin: center;\n}",
    ),
    true,
  );
  assert.equal(glassCssSource.includes(".glassLensEllipse"), true);
  assert.equal(glassCssSource.includes("border-radius: 999px;"), true);
  assert.equal(
    cssSource.includes("--about-column-width: minmax(0, 1fr);"),
    false,
  );
  assert.equal(
    cssSource.includes("--about-center-column-width: minmax(0, 0.84fr);"),
    false,
  );
  assert.equal(
    /grid-template-columns:\s*var\(--about-column-width\)\s+var\(\s*--about-center-column-width\s*\)\s+var\(--about-column-width\);/.test(
      cssSource,
    ),
    false,
  );
  assert.equal(
    cssSource.includes(
      ".storyColumn,\n.contactColumn {\n  position: relative;\n  z-index: 2;\n  width: 100%;",
    ),
    true,
  );
  assert.equal(cssSource.includes("max-width: 42rem;"), false);
  assert.equal(
    cssSource.includes("--about-stack-width: min(100%, 40rem);"),
    true,
  );
  assert.equal(cssSource.includes("width: min(100%, 20rem);"), false);
  assert.equal(cssSource.includes("width: min(100%, 19rem);"), false);
  assert.equal(cssSource.includes("width: min(100%, 17.75rem);"), false);
  assert.equal(cssSource.includes("width: min(100%, 35.5rem);"), true);
  assert.equal(cssSource.includes("font-size: 0.92rem;"), false);
  assert.equal(cssSource.includes("font-size: 1.18rem;"), true);
  assert.equal(cssSource.includes("font-size: 1rem;"), false);
  assert.equal(cssSource.includes("font-size: 1.2rem;"), true);
  assert.equal(cssSource.includes("font-size: 1.3rem;"), true);
  assert.equal(cssSource.includes(".submitPreviewActive .sectionDot,"), false);
  assert.equal(cssSource.includes(".submitPreviewActive .endDot {"), false);
  assert.equal(
    cssSource.includes(
      ".submitPreviewActive .endDot {\n  background: var(--about-marker-muted);\n  box-shadow: none;",
    ),
    false,
  );
  assert.equal(
    cssSource.includes(".submitPreviewActive .submitOrbitDot"),
    false,
  );
  assert.equal(
    cssSource.includes(".submitOrbitDot {\n  width: clamp(0.84rem"),
    false,
  );
  assert.equal(cssSource.includes(".submitOrbitColumn"), false);
  assert.equal(cssSource.includes("box-shadow: none;"), false);
  assert.equal(
    cssSource.includes(
      "--submit-orbit-offset-x: clamp(2.31rem, 3.5vw, 3.04rem);",
    ),
    false,
  );
  assert.equal(
    cssSource.includes(
      "--submit-orbit-offset-y: clamp(1.05rem, 1.6vw, 1.45rem);",
    ),
    false,
  );
  assert.equal(cssSource.includes("--submit-orbit-offset-x: 1.85rem;"), false);
  assert.equal(cssSource.includes("--submit-orbit-offset-y: 0.85rem;"), false);
  assert.equal(cssSource.includes("scale(0.72)"), false);
  assert.equal(cssSource.includes("-webkit-text-stroke-width: 0;"), false);
  assert.equal(
    cssSource.includes("-webkit-text-stroke-color: transparent;"),
    false,
  );
  assert.equal(cssSource.includes("text-shadow: none;"), false);
  assert.equal(cssSource.includes("backdrop-filter: blur(2px)"), false);
  assert.equal(cssSource.includes("backdrop-filter: blur(14px)"), false);
  assert.equal(cssSource.includes("radial-gradient("), false);
  assert.equal(cssSource.includes("drop-shadow("), true);
  assert.equal(cssSource.includes("scrollbar-width: none;"), false);
  assert.equal(cssSource.includes("-ms-overflow-style: none;"), false);
  assert.equal(cssSource.includes(".storyScroll::-webkit-scrollbar"), false);
  assert.equal(cssSource.includes("rgba(98, 201, 255"), false);
  assert.equal(cssSource.includes("rgba(255, 166, 166"), false);
  assert.equal(cssSource.includes("filter: saturate(1.03)"), false);
  assert.equal(cssSource.includes("mix-blend-mode: screen;"), false);
  assert.equal(
    cssSource.includes("grid-template-rows: auto minmax(0, 1fr);"),
    false,
  );
  assert.equal(cssSource.includes("place-self: center;"), false);
  assert.equal(cssSource.includes("place-self: start center;"), false);
  assert.equal(cssSource.includes("justify-content: center;"), true);
  assert.equal(cssSource.includes("width: min(100%, 34rem);"), false);
  assert.equal(cssSource.includes("overflow-y: auto;"), false);
  assert.equal(cssSource.includes("left: 50%;"), false);
  assert.equal(
    cssSource.includes("margin-top: clamp(7rem, 15vh, 9.2rem);"),
    false,
  );
  assert.equal(
    cssSource.includes("padding-top: clamp(9.5rem, 18vw, 13rem);"),
    false,
  );
  assert.equal(
    cssSource.includes("--fixed-lens-size: clamp(12.1rem, 23.4vw, 14.6rem);"),
    false,
  );
  assert.equal(
    cssSource.includes("--fixed-lens-size: clamp(10.8rem, 34.5vw, 12.8rem);"),
    false,
  );
  assert.equal(
    cssSource.includes("--fixed-lens-size: clamp(8.4rem, 35.2vw, 9.8rem);"),
    false,
  );
  assert.equal(
    cssSource.includes("font-size: clamp(0.96rem, 1.2vw, 1.24rem);"),
    true,
  );
  assert.equal(
    cssSource.includes("--lens-width: clamp(8.6rem, 11vw, 10rem);"),
    true,
  );
  assert.equal(cssSource.includes("font-size: 0.96rem;"), true);
  assert.equal(cssSource.includes("--lens-width: 8.35rem;"), true);
  assert.equal(cssSource.includes("--lens-height: 2.4rem;"), true);
});

test("about glass source canvas composites against the page background before drawing text and connectors", async () => {
  const source = await readFile(
    new URL("../components/glass/AboutGlassSourceCanvas.tsx", import.meta.url),
    "utf8",
  );

  assert.equal(
    source.includes("export function getAboutStorySourcePadding"),
    true,
  );
  assert.equal(
    source.includes("const sourcePadding = getAboutStorySourcePadding();"),
    true,
  );
  assert.equal(
    source.includes("width: contentRect.width + sourcePadding.inline * 2,"),
    true,
  );
  assert.equal(
    source.includes("height: contentRect.height + sourcePadding.block * 2,"),
    true,
  );
  assert.equal(
    source.includes(
      "canvas.style.transform = `translate(${-sourcePadding.inline}px, ${-sourcePadding.block}px)`;",
    ),
    true,
  );
  assert.equal(source.includes("resolveSampledGlassBackdropColor"), true);
  assert.equal(source.includes("context.fillStyle = backdropColor;"), true);
  assert.equal(
    source.includes(
      "context.fillRect(0, 0, renderSize.cssWidth, renderSize.cssHeight);",
    ),
    true,
  );
  assert.equal(
    source.includes(
      "drawStoryText(context, storyBody, contentRect, sourcePadding);",
    ),
    true,
  );
  assert.equal(
    source.includes(
      "drawConnectors(context, content, connectorLayout, sourcePadding);",
    ),
    false,
  );
  assert.equal(
    source.includes(
      "drawSubmitLabel(context, submitLabel, contentRect, sourcePadding);",
    ),
    true,
  );
  assert.equal(
    source.includes("export function AboutFixedGlassSourceCanvas"),
    false,
  );
  assert.equal(source.includes("fixedCenter"), false);
  assert.equal(source.includes("storyBodyRef"), true);
  assert.equal(source.includes("storyScrollRef"), true);
  assert.equal(source.includes("onCanvasReady"), true);
  assert.equal(source.includes("context.bezierCurveTo"), false);
  assert.equal(source.includes("drawCenteredSubmitReplica"), false);
  assert.equal(
    source.includes(
      'storyScroll?.addEventListener("scroll", scheduleDraw, { passive: true });',
    ),
    true,
  );
  assert.equal(
    source.includes("export function getAboutFixedSourcePadding"),
    false,
  );
  assert.equal(
    source.includes("const sourcePadding = getAboutFixedSourcePadding();"),
    false,
  );
  assert.equal(
    source.includes("width: contentRect.width + sourcePadding.inline * 2,"),
    true,
  );
  assert.equal(
    source.includes("height: contentRect.height + sourcePadding.block * 2,"),
    true,
  );
  assert.equal(
    source.includes(
      "drawStoryText(context, storyBody, contentRect, sourcePadding);",
    ),
    true,
  );
  assert.equal(
    source.includes(
      "drawFixedSphereReplica(\n        context,\n        content,\n        submitLabel,\n        contentRect,\n        fixedCenter,\n        sourcePadding,",
    ),
    false,
  );
  assert.equal(
    source.includes(
      "canvas.style.transform = `translate(${-sourcePadding.inline}px, ${-sourcePadding.block}px)`;",
    ),
    true,
  );
});
