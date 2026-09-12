import assert from "node:assert/strict";
import test from "node:test";

import {
  CORNER_NAVIGATION_LANGUAGES,
  createCornerNavigationLanguageMap,
  getCornerNavigationLabel,
  getCornerNavigationLangTag,
} from "../lib/corner-navigation-language.ts";

const cornerRoutes = ["about", "submit", "archive", "newsletter"];

test("createCornerNavigationLanguageMap assigns each language once", () => {
  const assignments = createCornerNavigationLanguageMap(cornerRoutes, () => 0);
  const assignedLanguages = cornerRoutes.map((route) => assignments[route]);

  assert.equal(assignedLanguages.length, cornerRoutes.length);
  assert.equal(new Set(assignedLanguages).size, cornerRoutes.length);

  assignedLanguages.forEach((language) => {
    assert.ok(CORNER_NAVIGATION_LANGUAGES.includes(language));
  });
});

test("createCornerNavigationLanguageMap keeps route order intact", () => {
  const assignments = createCornerNavigationLanguageMap(cornerRoutes, () => 0);

  assert.deepEqual(assignments, {
    about: "ko",
    submit: "zh",
    archive: "th",
    newsletter: "hi",
  });
});

test("corner navigation labels and lang tags match the assigned language", () => {
  assert.equal(getCornerNavigationLabel("about", "en"), "About");
  assert.equal(getCornerNavigationLabel("about", "ja"), "紹介");
  assert.equal(getCornerNavigationLabel("newsletter", "th"), "จดหมายข่าว");
  assert.equal(getCornerNavigationLabel("submit", "hi"), "काम जमा करें");
  assert.equal(getCornerNavigationLabel("archive", "fa"), "بایگانی");
  assert.equal(getCornerNavigationLabel("submit", "id"), "Kirim karya");
  assert.equal(getCornerNavigationLangTag("en"), "en");
  assert.equal(getCornerNavigationLangTag("zh"), "zh-Hans");
  assert.equal(getCornerNavigationLangTag("ko"), "ko");
  assert.equal(getCornerNavigationLangTag("fa"), "fa");
});
