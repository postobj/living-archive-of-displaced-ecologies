import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

function getCssRuleBody(source, selector) {
  const matcher = new RegExp(`\\${selector}\\s*\\{([\\s\\S]*?)\\n\\}`, "m");
  const match = source.match(matcher);

  assert.notEqual(match, null, `Expected CSS rule for ${selector}`);

  return match[1];
}

test("site-level page canvases resolve to pure white", async () => {
  const globalsCss = await readFile(
    new URL("../app/globals.css", import.meta.url),
    "utf8",
  );
  const aboutCss = await readFile(
    new URL("../app/about/about.module.css", import.meta.url),
    "utf8",
  );
  const newsCss = await readFile(
    new URL("../app/news/news.module.css", import.meta.url),
    "utf8",
  );
  const archiveThemeSource = await readFile(
    new URL("../lib/archive-constellation-theme.ts", import.meta.url),
    "utf8",
  );

  assert.equal(globalsCss.includes("--background: #ffffff;"), true);
  assert.equal(
    archiveThemeSource.includes('canvasBackground: "#ffffff"'),
    true,
  );

  const aboutPageRule = getCssRuleBody(aboutCss, ".aboutPage");
  assert.equal(aboutPageRule.includes("background: #ffffff;"), true);
  assert.equal(aboutPageRule.includes("linear-gradient("), false);
  assert.equal(aboutPageRule.includes("radial-gradient("), false);

  const newsPageRule = getCssRuleBody(newsCss, ".newsPage");
  assert.equal(newsPageRule.includes("background: #ffffff;"), true);
  assert.equal(newsPageRule.includes("linear-gradient("), false);
  assert.equal(newsPageRule.includes("radial-gradient("), false);
});
