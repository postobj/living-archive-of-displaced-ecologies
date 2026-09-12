import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("corner navigation renders solid stamp filter with displacement + grain", async () => {
  const source = await readFile(
    new URL("../components/CornerNavigation.tsx", import.meta.url),
    "utf8",
  );

  assert.equal(source.includes("corner-nav-link__label"), true);
  assert.equal(source.includes("corner-nav-link__ink"), true);
  // Solid stamp: feDisplacementMap for jagged edges + grain for mottled interior
  assert.equal(source.includes("feDisplacementMap"), true);
  assert.equal(source.includes("feTurbulence"), true);
  assert.equal(source.includes('baseFrequency="0.18"'), true);
  assert.equal(source.includes('baseFrequency="0.4"'), true);
  assert.equal(source.includes('scale="16"'), true);
  assert.equal(source.includes("feMerge"), true);
  assert.equal(source.includes("feColorMatrix"), true);
  assert.equal(source.includes("feComposite"), true);
  assert.equal(source.includes('operator="in"'), true);
  // Old aggressive filter elements removed
  assert.equal(source.includes("feMorphology"), false);
  assert.equal(source.includes('operator="dilate"'), false);
  assert.equal(source.includes('operator="out"'), false);
});

test("corner navigation styles use clean typography", async () => {
  const source = await readFile(
    new URL("../app/globals.css", import.meta.url),
    "utf8",
  );

  assert.equal(source.includes("--corner-nav-color"), true);
  assert.equal(source.includes("--corner-nav-hover-lift"), true);
  assert.equal(
    source.includes("font-size: clamp(2.45rem, 5.5vw, 3.5rem);"),
    true,
  );
  assert.equal(
    source.includes("filter: var(--corner-nav-texture-filter)"),
    false,
  );
  assert.equal(source.includes("corner-nav-link__texture"), false);
});
