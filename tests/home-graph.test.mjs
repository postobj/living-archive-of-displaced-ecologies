import assert from "node:assert/strict";
import test from "node:test";

import { buildHomeGraphFrom } from "../lib/home-graph.ts";
import { HOME_GRAPH_LANGUAGES } from "../lib/home-graph-language.ts";

function copyFor(text) {
  return Object.fromEntries(
    HOME_GRAPH_LANGUAGES.map((language) => [
      language,
      language === "en" ? text : `${text} (${language})`,
    ]),
  );
}

function story(slug, overrides = {}) {
  return {
    slug,
    title: overrides.title ?? slug,
    contributor: "anon",
    date: "2026-04-01",
    themes: [],
    posterShortText: overrides.posterShortText,
  };
}

const FIXTURE_CONTENT = {
  nodes: [
    {
      id: "alpha-title",
      copy: copyFor("Alpha"),
      storySlug: "alpha",
      tone: "title",
      position: [-4, 2, -1],
      animationDelayMs: 0,
    },
    {
      id: "alpha-phrase",
      copy: copyFor("Alpha phrase"),
      storySlug: "alpha",
      tone: "phrase",
      position: [0, -2, 1],
      animationDelayMs: 120,
    },
    {
      id: "beta-title",
      copy: copyFor("Beta"),
      storySlug: "beta",
      tone: "title",
      position: [4, 0, 0],
      animationDelayMs: 240,
    },
    {
      id: "fixture-slogan",
      copy: copyFor("A slogan with no story"),
      tone: "phrase",
      position: [0, 0, 2],
      animationDelayMs: 360,
    },
  ],
  edges: [
    { id: "edge-alpha", from: "alpha-title", to: "alpha-phrase" },
    {
      id: "edge-bridge",
      from: "alpha-phrase",
      to: "beta-title",
      opacity: 0.25,
    },
  ],
};

test("buildHomeGraphFrom keeps multilingual copy and links present stories", () => {
  const { nodes, edges } = buildHomeGraphFrom(FIXTURE_CONTENT, [
    story("alpha", {
      title: "Should Not Replace Homepage Copy",
      posterShortText: "Should Not Replace Homepage Copy",
    }),
  ]);

  assert.equal(nodes.length, FIXTURE_CONTENT.nodes.length);
  assert.deepEqual(edges, FIXTURE_CONTENT.edges);

  const alphaTitle = nodes.find((node) => node.id === "alpha-title");
  assert.deepEqual(
    Object.keys(alphaTitle?.copy ?? {}).sort(),
    Array.from(HOME_GRAPH_LANGUAGES).sort(),
  );
  assert.equal(alphaTitle?.copy.en, "Alpha");
  assert.equal(alphaTitle?.slug, "alpha");
  assert.equal(
    nodes.find((node) => node.id === "fixture-slogan")?.slug,
    undefined,
  );
});

test("buildHomeGraphFrom detaches navigation for missing stories without changing copy", () => {
  const { nodes } = buildHomeGraphFrom(FIXTURE_CONTENT, [story("alpha")]);

  const betaTitle = nodes.find((node) => node.id === "beta-title");
  assert.equal(betaTitle?.slug, undefined);
  assert.equal(betaTitle?.copy.en, "Beta");
  assert.equal(betaTitle?.copy.ja, "Beta (ja)");
});

test("buildHomeGraphFrom centers the constellation and applies the layout transform", () => {
  const { nodes } = buildHomeGraphFrom(FIXTURE_CONTENT, []);
  const positions = nodes.map((node) => node.position);
  const averageX =
    positions.reduce((sum, [x]) => sum + x, 0) / positions.length;
  const averageY =
    positions.reduce((sum, [, y]) => sum + y, 0) / positions.length;

  // The transform recenters draft positions, scales x by 1.2 / y by 0.85, and
  // shifts the whole constellation left by 0.92.
  assert.equal(Math.abs(averageX + 0.92) < 0.01, true);
  assert.equal(Math.abs(averageY) < 0.01, true);

  const xValues = positions.map(([x]) => x);
  const yValues = positions.map(([, y]) => y);
  const draftXValues = FIXTURE_CONTENT.nodes.map((node) => node.position[0]);
  const draftYValues = FIXTURE_CONTENT.nodes.map((node) => node.position[1]);
  const xSpan = Math.max(...xValues) - Math.min(...xValues);
  const ySpan = Math.max(...yValues) - Math.min(...yValues);
  const draftXSpan = Math.max(...draftXValues) - Math.min(...draftXValues);
  const draftYSpan = Math.max(...draftYValues) - Math.min(...draftYValues);

  assert.equal(Math.abs(xSpan - draftXSpan * 1.2) < 0.01, true);
  assert.equal(Math.abs(ySpan - draftYSpan * 0.85) < 0.01, true);

  // z passes through untouched.
  assert.deepEqual(
    positions.map(([, , z]) => z),
    FIXTURE_CONTENT.nodes.map((node) => node.position[2]),
  );
});
