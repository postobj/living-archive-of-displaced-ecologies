import assert from "node:assert/strict";
import { access } from "node:fs/promises";
import test from "node:test";

import { HOME_GRAPH_CONTENT } from "../content/home-graph.ts";
import { HOME_GRAPH_LANGUAGES } from "../lib/home-graph-language.ts";

// Invariant validation for content/home-graph.ts. These tests are
// content-agnostic: they must pass for any constellation an archive ships,
// so they double as CI validation when content is swapped in.

test("home graph nodes have unique ids and well-formed fields", () => {
  const ids = new Set();

  for (const node of HOME_GRAPH_CONTENT.nodes) {
    assert.equal(typeof node.id, "string");
    assert.equal(node.id.length > 0, true);
    assert.equal(ids.has(node.id), false, `duplicate node id "${node.id}"`);
    ids.add(node.id);

    assert.equal(["title", "phrase", "whisper"].includes(node.tone), true);
    assert.equal(Array.isArray(node.position), true);
    assert.equal(node.position.length, 3);
    node.position.forEach((coordinate) =>
      assert.equal(Number.isFinite(coordinate), true),
    );
    assert.equal(Number.isFinite(node.animationDelayMs), true);
    assert.equal(node.animationDelayMs >= 0, true);
  }

  assert.equal(HOME_GRAPH_CONTENT.nodes.length > 0, true);
});

test("home graph copy covers every display language with non-empty text", () => {
  for (const node of HOME_GRAPH_CONTENT.nodes) {
    assert.deepEqual(
      Object.keys(node.copy).sort(),
      Array.from(HOME_GRAPH_LANGUAGES).sort(),
      `node "${node.id}" copy must cover all display languages`,
    );

    for (const [language, text] of Object.entries(node.copy)) {
      assert.equal(
        typeof text === "string" && text.trim().length > 0,
        true,
        `node "${node.id}" has empty copy for language "${language}"`,
      );
    }
  }
});

test("home graph edges connect existing nodes and have unique ids", () => {
  const nodeIds = new Set(HOME_GRAPH_CONTENT.nodes.map((node) => node.id));
  const edgeIds = new Set();

  for (const edge of HOME_GRAPH_CONTENT.edges) {
    assert.equal(edgeIds.has(edge.id), false, `duplicate edge id "${edge.id}"`);
    edgeIds.add(edge.id);

    assert.equal(
      nodeIds.has(edge.from),
      true,
      `edge "${edge.id}" references missing node "${edge.from}"`,
    );
    assert.equal(
      nodeIds.has(edge.to),
      true,
      `edge "${edge.id}" references missing node "${edge.to}"`,
    );

    if (edge.opacity !== undefined) {
      assert.equal(edge.opacity > 0 && edge.opacity <= 1, true);
    }
  }
});

test("home graph layouts and nodes match one-to-one", () => {
  const nodeIds = new Set(HOME_GRAPH_CONTENT.nodes.map((node) => node.id));
  const layoutIds = new Set(Object.keys(HOME_GRAPH_CONTENT.layouts));

  for (const id of nodeIds) {
    assert.equal(layoutIds.has(id), true, `node "${id}" has no layout entry`);
  }

  for (const id of layoutIds) {
    assert.equal(nodeIds.has(id), true, `layout "${id}" has no matching node`);
  }

  for (const [id, layout] of Object.entries(HOME_GRAPH_CONTENT.layouts)) {
    assert.equal(
      typeof layout.desktopClassName === "string" &&
        layout.desktopClassName.length > 0,
      true,
      `layout "${id}" is missing desktopClassName`,
    );
    assert.equal(
      typeof layout.mobileClassName === "string" &&
        layout.mobileClassName.length > 0,
      true,
      `layout "${id}" is missing mobileClassName`,
    );
  }
});

test("home graph static lines have unique ids and finite coordinates", () => {
  for (const variant of ["desktop", "mobile"]) {
    const lineIds = new Set();

    for (const line of HOME_GRAPH_CONTENT.staticLines[variant]) {
      assert.equal(
        lineIds.has(line.id),
        false,
        `duplicate ${variant} line id "${line.id}"`,
      );
      lineIds.add(line.id);

      for (const coordinate of [line.x1, line.y1, line.x2, line.y2]) {
        assert.equal(Number.isFinite(coordinate), true);
      }
    }
  }
});

test("every storySlug resolves to a file in content/stories/", async () => {
  const slugs = new Set(
    HOME_GRAPH_CONTENT.nodes
      .map((node) => node.storySlug)
      .filter((slug) => slug !== undefined),
  );

  for (const slug of slugs) {
    await assert.doesNotReject(
      () => access(new URL(`../content/stories/${slug}.md`, import.meta.url)),
      `storySlug "${slug}" has no matching content/stories/${slug}.md`,
    );
  }
});
