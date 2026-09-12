import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("Segment fallback stack loads HuiWenFangSong before system monospace", async () => {
  const css = await readFile("app/globals.css", "utf8");

  assert.match(
    css,
    /font-family:\s*"HuiWenFangSong";[\s\S]*汇文仿宋v1\.001\.ttf/,
  );
  assert.equal(
    css.includes(
      '--font-segment-stack: "Segment", "HuiWenFangSong", "Courier New", monospace;',
    ),
    true,
  );
  assert.match(
    css,
    /--font-segment-serif-stack:\s*"Segment", "HuiWenFangSong", var\(--font-suwannaphum\),\s+serif;/,
  );
});

test("canvas and generated Segment font stacks include HuiWenFangSong fallback", async () => {
  const [storyWordmark, glassWordmark, homeGraphLanguage, story2dView] =
    await Promise.all([
      readFile("components/StoryCenteredWordmark.tsx", "utf8"),
      readFile("components/glass/GlassWordmark.tsx", "utf8"),
      readFile("lib/home-graph-language.ts", "utf8"),
      readFile("components/Story2DView.tsx", "utf8"),
    ]);

  assert.equal(
    storyWordmark.includes(
      '"Segment", "HuiWenFangSong", "Courier New", monospace',
    ),
    true,
  );
  assert.equal(
    glassWordmark.includes(
      '"Segment", "HuiWenFangSong", "Courier New", monospace',
    ),
    true,
  );
  assert.equal(
    homeGraphLanguage.includes(
      'const HOME_GRAPH_PRIMARY_FONT_FAMILY = \'"Segment", "HuiWenFangSong"\';',
    ),
    true,
  );
  assert.equal(
    story2dView.includes(
      '"Segment", "HuiWenFangSong", var(--font-suwannaphum), serif',
    ),
    true,
  );
});
