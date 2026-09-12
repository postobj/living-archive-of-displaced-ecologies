import assert from "node:assert/strict";
import test from "node:test";

import {
  getConstellationEdges,
  getTopConnections,
} from "../lib/positioning.ts";

function story(slug, options = {}) {
  return {
    metadata: {
      slug,
      title: slug,
      contributor: "anon",
      date: "2026-03-14",
      themes: [],
      connections: options.connections,
      emotions: options.emotions,
      textures: options.textures,
      temporality: options.temporality,
      geography: options.geography,
    },
    content: "",
  };
}

test("getTopConnections prioritizes explicit and inbound links", () => {
  const a = story("a", { connections: ["b"] });
  const b = story("b");
  const c = story("c", { connections: ["a"] });
  const d = story("d");

  const ranked = getTopConnections(a, [a, b, c, d], 4);

  assert.equal(ranked[0], "b");
  assert.ok(ranked.includes("c"));
});

test("getConstellationEdges returns deduplicated undirected pairs", () => {
  const a = story("a", { connections: ["b"] });
  const b = story("b", { connections: ["a"] });
  const c = story("c");

  const edges = getConstellationEdges([a, b, c], 1);
  const normalized = edges.map(([left, right]) =>
    [left, right].sort().join("-"),
  );

  assert.equal(new Set(normalized).size, normalized.length);
  assert.ok(normalized.includes("a-b"));
});
