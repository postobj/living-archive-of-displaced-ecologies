import assert from "node:assert/strict";
import test from "node:test";

import {
  deriveStoryType,
  filterStoriesByQuery,
  matchesStoryQuery,
  normalizeSearchQuery,
  parseStoryYear,
  toSearchResultRows,
} from "../lib/search.ts";

const sampleStories = [
  {
    slug: "the-paper-lighthouse",
    title: "The Paper Lighthouse",
    contributor: "The Example Collective",
    slogan: "Letters folded into light, labor folded into paper.",
    themes: ["labor", "migration"],
    emotions: [{ name: "care", intensity: 0.7 }],
    date: "2025-10-07",
  },
  {
    slug: "recipe-for-a-borrowed-sky",
    title: "Recipe for a Borrowed Sky",
    contributor: "Mira Example",
    slogan: "Cooking the weather of memory and elsewhere.",
    themes: ["memory"],
    emotions: [{ name: "reflection", intensity: 0.8 }],
    date: "2025-08-22",
  },
];

test("normalizeSearchQuery trims and lowercases", () => {
  assert.equal(normalizeSearchQuery("  ARCHIVE  "), "archive");
});

test("parseStoryYear returns fallback for invalid dates", () => {
  assert.equal(parseStoryYear("invalid"), "----");
  assert.equal(parseStoryYear("2025-08-22"), "2025");
});

test("deriveStoryType falls back to Story without themes", () => {
  assert.equal(deriveStoryType({ themes: [] }), "Story");
  assert.equal(
    deriveStoryType({ themes: ["digital-memory"] }),
    "Digital Memory",
  );
});

test("matchesStoryQuery checks title, contributor, slogan, themes, and emotions", () => {
  const story = sampleStories[0];
  assert.equal(matchesStoryQuery(story, "lighthouse"), true);
  assert.equal(matchesStoryQuery(story, "collective"), true);
  assert.equal(matchesStoryQuery(story, "migration"), true);
  assert.equal(matchesStoryQuery(story, "care"), true);
  assert.equal(matchesStoryQuery(story, "not-found"), false);
});

test("filterStoriesByQuery returns all stories for empty query", () => {
  const results = filterStoriesByQuery(sampleStories, "");
  assert.equal(results.length, 2);
});

test("toSearchResultRows builds ordered rows with derived fields", () => {
  const rows = toSearchResultRows(sampleStories);
  assert.deepEqual(
    rows.map((row) => ({
      index: row.index,
      slug: row.slug,
      type: row.type,
      year: row.year,
    })),
    [
      {
        index: "01",
        slug: "the-paper-lighthouse",
        type: "Labor",
        year: "2025",
      },
      {
        index: "02",
        slug: "recipe-for-a-borrowed-sky",
        type: "Memory",
        year: "2025",
      },
    ],
  );
});
