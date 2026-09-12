import assert from "node:assert/strict";
import test from "node:test";

import {
  DISPLAY_LANGUAGES,
  createDisplayLanguageMap,
  getDisplayLanguageTag,
} from "../lib/display-languages.ts";

const routes = ["about", "submit", "archive", "newsletter"];

test("createDisplayLanguageMap assigns one unique language per key", () => {
  const assignments = createDisplayLanguageMap(routes, () => 0);
  const assignedLanguages = routes.map((route) => assignments[route]);

  assert.equal(assignedLanguages.length, routes.length);
  assert.equal(new Set(assignedLanguages).size, routes.length);

  assignedLanguages.forEach((language) => {
    assert.ok(DISPLAY_LANGUAGES.includes(language));
  });
});

test("display language tags come from the shared registry", () => {
  assert.equal(DISPLAY_LANGUAGES.includes("en"), true);
  assert.equal(DISPLAY_LANGUAGES.includes("id"), true);
  assert.equal(getDisplayLanguageTag("en"), "en");
  assert.equal(getDisplayLanguageTag("zh"), "zh-Hans");
  assert.equal(getDisplayLanguageTag("fa"), "fa");
});
