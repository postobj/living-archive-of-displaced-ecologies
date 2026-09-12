import assert from "node:assert/strict";
import { readdir } from "node:fs/promises";
import test from "node:test";

import { HOME_GRAPH_CONTENT } from "../content/home-graph.ts";
import { buildHomeGraph } from "../lib/home-graph.ts";
import { buildHomeGraphScene } from "../lib/home-graph-scene.ts";

// End-to-end smoke test against whatever content this checkout ships: the
// homepage constellation must build and resolve a scene without throwing,
// regardless of which stories exist.
async function listStorySlugs() {
  const entries = await readdir(
    new URL("../content/stories/", import.meta.url),
  );

  return entries
    .filter((entry) => entry.endsWith(".md"))
    .map((entry) => entry.replace(/\.md$/, ""));
}

test("homepage constellation builds a complete scene from the shipped content", async () => {
  const slugs = await listStorySlugs();
  const stories = slugs.map((slug) => ({
    slug,
    title: slug,
    contributor: "anon",
    date: "2026-01-01",
    themes: [],
  }));

  const graph = buildHomeGraph(stories);
  assert.equal(graph.nodes.length, HOME_GRAPH_CONTENT.nodes.length);
  assert.equal(graph.edges.length, HOME_GRAPH_CONTENT.edges.length);

  // Scene resolution throws if any node is missing a layout entry.
  const scene = buildHomeGraphScene(stories);
  assert.equal(scene.nodes.length, HOME_GRAPH_CONTENT.nodes.length);

  // Every story-linked node resolves its slug when the story exists.
  const linkedNodes = HOME_GRAPH_CONTENT.nodes.filter((node) => node.storySlug);
  for (const contentNode of linkedNodes) {
    const built = graph.nodes.find((node) => node.id === contentNode.id);
    assert.equal(built?.slug, contentNode.storySlug);
  }
});

test("homepage constellation detaches story links when no stories are present", () => {
  const { nodes } = buildHomeGraph([]);

  for (const node of nodes) {
    assert.equal(node.slug, undefined);
  }
});
