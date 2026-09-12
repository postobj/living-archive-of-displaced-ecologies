import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("homepage 3D text nodes wrap naturally into horizontal balanced lines", async () => {
  const source = await readFile(
    new URL("../components/HomeConstellationScene.tsx", import.meta.url),
    "utf8",
  );

  assert.equal(source.includes("WebkitLineClamp"), false);
  assert.equal(source.includes('overflow: "hidden"'), false);
  assert.equal(source.includes('overflowWrap: "anywhere"'), false);
  assert.equal(source.includes('overflowWrap: "normal"'), true);
  assert.equal(source.includes('wordBreak: "normal"'), true);
  assert.equal(source.includes('textWrap: "balance"'), true);
});

test("homepage 3D text nodes measure rendered copy for connector sizing", async () => {
  const source = await readFile(
    new URL("../components/HomeConstellationScene.tsx", import.meta.url),
    "utf8",
  );

  assert.equal(source.includes("useEffectEvent"), false);
  assert.equal(source.includes("buildMeasuredHomeGraphLines"), true);
  assert.equal(source.includes("requestAnimationFrame"), true);
  assert.equal(source.includes("nodeRef"), true);
  assert.equal(source.includes("<Line"), false);
});
