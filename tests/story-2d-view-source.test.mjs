import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("archive poster text scales font size dynamically for long or multi-line text", async () => {
  const source = await readFile(
    new URL("../components/Story2DView.tsx", import.meta.url),
    "utf8",
  );

  assert.equal(source.includes("posterFontScale"), true);
  assert.equal(
    source.includes(
      "fontSize: `clamp(${1.83 * posterFontScale}rem, ${4.5 * posterFontScale}vw, ${3.375 * posterFontScale}rem)`",
    ),
    true,
  );
  assert.equal(
    source.includes("uppercase leading-[1.02] tracking-[0.08em] text-white"),
    true,
  );
});

test("archive poster text sanitizer preserves non-Latin posterShortText", async () => {
  const source = await readFile(
    new URL("../components/Story2DView.tsx", import.meta.url),
    "utf8",
  );

  assert.equal(source.includes("[^\\p{L}\\p{N}\\s]"), true);
});

test("archive display text uses Segment-first stack with HuiWenFangSong CJK fallback", async () => {
  const source = await readFile(
    new URL("../components/Story2DView.tsx", import.meta.url),
    "utf8",
  );

  assert.equal(
    source.includes(
      'const ARCHIVE_DISPLAY_FONT_FAMILY =\n  \'"Segment", "HuiWenFangSong", var(--font-suwannaphum), serif\';',
    ),
    true,
  );
  assert.equal(
    source.includes("fontFamily: ARCHIVE_DISPLAY_FONT_FAMILY,"),
    true,
  );
});
