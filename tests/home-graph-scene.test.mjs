import assert from "node:assert/strict";
import test from "node:test";

import {
  buildHomeGraphSceneFrom,
  getHomeGraphNodeVisuals,
} from "../lib/home-graph-scene.ts";
import { HOME_GRAPH_LANGUAGES } from "../lib/home-graph-language.ts";

function copyFor(text) {
  return Object.fromEntries(
    HOME_GRAPH_LANGUAGES.map((language) => [
      language,
      language === "en" ? text : `${text} (${language})`,
    ]),
  );
}

function story(slug) {
  return {
    slug,
    title: slug,
    contributor: "anon",
    date: "2026-04-01",
    themes: [],
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
  ],
  edges: [{ id: "edge-alpha", from: "alpha-title", to: "alpha-phrase" }],
  layouts: {
    "alpha-title": {
      desktopClassName: "left-[30%] top-[40%] -translate-x-1/2 text-center",
      mobileClassName: "left-[50%] top-[40%] -translate-x-1/2 text-center",
    },
    "alpha-phrase": {
      desktopClassName: "left-[60%] top-[70%] -translate-x-1/2 text-center",
      mobileClassName: "left-[50%] top-[75%] -translate-x-1/2 text-center",
    },
  },
  staticLines: {
    desktop: [{ id: "line-alpha", x1: 30, y1: 42, x2: 60, y2: 68 }],
    mobile: [{ id: "m-line-alpha", x1: 50, y1: 42, x2: 50, y2: 73 }],
  },
};

test("buildHomeGraphSceneFrom merges layouts and passes static lines through", () => {
  const scene = buildHomeGraphSceneFrom(FIXTURE_CONTENT, [story("alpha")]);

  assert.equal(scene.nodes.length, 2);
  assert.deepEqual(scene.edges, FIXTURE_CONTENT.edges);
  assert.deepEqual(scene.staticLines, FIXTURE_CONTENT.staticLines);

  scene.nodes.forEach((node) => {
    assert.equal(typeof node.desktopClassName, "string");
    assert.equal(node.desktopClassName.length > 0, true);
    assert.equal(typeof node.mobileClassName, "string");
    assert.equal(node.mobileClassName.length > 0, true);
    assert.equal(typeof node.activeText, "string");
    assert.equal(node.activeText.length > 0, true);
  });

  assert.equal(
    scene.nodes.find((node) => node.id === "alpha-title")?.desktopClassName,
    FIXTURE_CONTENT.layouts["alpha-title"].desktopClassName,
  );
  assert.equal(
    scene.nodes.find((node) => node.id === "alpha-title")?.mobileClassName,
    FIXTURE_CONTENT.layouts["alpha-title"].mobileClassName,
  );
});

test("buildHomeGraphSceneFrom throws when a node has no layout entry", () => {
  const contentWithMissingLayout = {
    ...FIXTURE_CONTENT,
    layouts: {
      "alpha-title": FIXTURE_CONTENT.layouts["alpha-title"],
    },
  };

  assert.throws(
    () => buildHomeGraphSceneFrom(contentWithMissingLayout, [story("alpha")]),
    /Missing home graph scene layout for "alpha-phrase"/,
  );
});

test("getHomeGraphNodeVisuals returns shared tone defaults for scene renderers", () => {
  const desktopTitle = getHomeGraphNodeVisuals("title", false);
  const mobilePhrase = getHomeGraphNodeVisuals("phrase", true);
  const mobileWhisper = getHomeGraphNodeVisuals("whisper", true);

  assert.equal(
    desktopTitle.widthClassName,
    "max-w-[11.75rem] md:max-w-[15.5rem]",
  );
  assert.equal(desktopTitle.widthRem, 15.5);
  assert.equal(desktopTitle.fontSize, "1.28rem");
  assert.equal(desktopTitle.blockWidth, 4.8);
  assert.equal(desktopTitle.blockHeight, 1.28);
  assert.equal(desktopTitle.connectorGap, 0.1);
  assert.equal(desktopTitle.baseOpacity, 0.96);

  assert.equal(
    mobilePhrase.widthClassName,
    "max-w-[14rem] md:max-w-[16.75rem]",
  );
  assert.equal(mobilePhrase.widthRem, 14);
  assert.equal(mobilePhrase.fontSize, "0.88rem");
  assert.equal(mobilePhrase.blockWidth, 5.358);
  assert.equal(mobilePhrase.blockHeight, 1.316);
  assert.equal(mobilePhrase.connectorGap, 0.08);
  assert.equal(mobilePhrase.baseOpacity, 0.96);

  assert.equal(
    mobileWhisper.widthClassName,
    "max-w-[15.5rem] md:max-w-[18.5rem]",
  );
  assert.equal(mobileWhisper.widthRem, 15.5);
  assert.equal(mobileWhisper.fontSize, "0.7rem");
  assert.equal(mobileWhisper.blockWidth, 6.157);
  assert.equal(mobileWhisper.blockHeight, 1.654);
  assert.equal(mobileWhisper.connectorGap, 0.08);
  assert.equal(mobileWhisper.baseOpacity, 0.82);
});
