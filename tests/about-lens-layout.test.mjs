import assert from "node:assert/strict";
import test from "node:test";

test("buildAboutLensLayout maps requested text anchors and centers the large lens over the story body while keeping viewport vertical centering", async () => {
  const lensLayoutModule = await import("../lib/about-lens-layout.ts").catch(
    () => null,
  );

  assert.notEqual(lensLayoutModule, null);
  assert.equal(typeof lensLayoutModule.buildAboutLensLayout, "function");

  const layout = lensLayoutModule.buildAboutLensLayout({
    storyBodyRect: { left: 56, top: 121, width: 542, height: 1911 },
    storyViewportRect: { left: 56, top: 121, width: 581, height: 941 },
    echoesFromRect: { left: 82, top: 126, width: 122, height: 26 },
    orientationRect: { left: 336, top: 403, width: 102, height: 24 },
  });

  assert.deepEqual(layout.echoesFrom, { x: 87, y: 18 });
  assert.deepEqual(layout.orientation, { x: 331, y: 294 });
  assert.deepEqual(layout.fixedCenter, { x: 327, y: 591.5 });
});
