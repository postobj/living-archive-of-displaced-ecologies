import assert from "node:assert/strict";
import test from "node:test";

import {
  HOME_GRAPH_DEFAULT_LANGUAGE,
  HOME_GRAPH_LANGUAGES,
  createHomeGraphNodeLanguageMap,
  getHomeGraphLanguageRotationIntervalMs,
  getNextHomeGraphLanguage,
  getHomeGraphTextPresentation,
  resolveHomeGraphNodes,
} from "../lib/home-graph-language.ts";

function createSequenceRandom(values) {
  let index = 0;

  return () => {
    const value = values[index];
    index += 1;
    return value ?? 0;
  };
}

const baseNode = {
  id: "home-slogan",
  copy: {
    en: "We live in different realities",
    ja: "私たちは異なる現実を生きている",
    ko: "우리는 서로 다른 현실을 산다",
    zh: "我们生活在不同的现实里",
    th: "เราอาศัยอยู่ในความจริงที่ต่างกัน",
    hi: "हम अलग-अलग वास्तविकताओं में जीते हैं",
    vi: "Chúng ta sống trong những thực tại khác nhau",
    id: "Kita hidup dalam realitas yang berbeda",
    fa: "ما در واقعیت های متفاوتی زندگی می کنیم",
  },
  tone: "phrase",
  position: [0, 0, 0],
  desktopClassName: "",
  mobileClassName: "",
  animationDelayMs: 0,
};

test("createHomeGraphNodeLanguageMap assigns languages from the shared pool", () => {
  const random = createSequenceRandom([0, 0.26, 0.51]);
  const languageByNode = createHomeGraphNodeLanguageMap(
    [{ id: "one" }, { id: "two" }, { id: "three" }],
    random,
  );

  assert.deepEqual(languageByNode, {
    one: "ja",
    two: "zh",
    three: "hi",
  });
});

test("createHomeGraphNodeLanguageMap can reuse languages across nodes", () => {
  const languageByNode = createHomeGraphNodeLanguageMap(
    [{ id: "one" }, { id: "two" }],
    () => 0,
  );

  assert.equal(languageByNode.one, "ja");
  assert.equal(languageByNode.two, "ja");
});

test("resolveHomeGraphNodes uses the mapped language and text", () => {
  const [resolvedNode] = resolveHomeGraphNodes([baseNode], {
    "home-slogan": "fa",
  });

  assert.equal(resolvedNode.activeLanguage, "fa");
  assert.equal(
    resolvedNode.activeText,
    "ما در واقعیت های متفاوتی زندگی می کنیم",
  );
});

test("resolveHomeGraphNodes falls back to the default homepage language", () => {
  const [resolvedNode] = resolveHomeGraphNodes([baseNode]);

  assert.equal(resolvedNode.activeLanguage, HOME_GRAPH_DEFAULT_LANGUAGE);
  assert.equal(
    resolvedNode.activeText,
    baseNode.copy[HOME_GRAPH_DEFAULT_LANGUAGE],
  );
});

test("getHomeGraphTextPresentation returns the right lang tags and Segment-first font stacks", () => {
  const enText = getHomeGraphTextPresentation("en", "phrase");
  const zhText = getHomeGraphTextPresentation("zh", "phrase");
  const faText = getHomeGraphTextPresentation("fa", "whisper");
  const hiText = getHomeGraphTextPresentation("hi", "phrase");
  const idText = getHomeGraphTextPresentation("id", "phrase");

  assert.equal(enText.lang, "en");
  assert.match(enText.fontFamily, /^"Segment", /);
  assert.match(enText.fontFamily, /Iowan Old Style/);
  assert.equal(zhText.lang, "zh-Hans");
  assert.match(zhText.fontFamily, /^"Segment", /);
  assert.match(zhText.fontFamily, /Noto Serif SC/);
  assert.equal(zhText.textTransform, "none");
  assert.equal(faText.lang, "fa");
  assert.match(faText.fontFamily, /Noto Naskh Arabic|Geeza Pro/);
  assert.equal(idText.lang, "id");
  assert.equal(hiText.lang, "hi");
  assert.match(hiText.fontFamily, /^"Segment", /);
  assert.match(hiText.fontFamily, /Noto Serif Devanagari/);
  assert.equal(HOME_GRAPH_LANGUAGES.includes("en"), true);
  assert.equal(HOME_GRAPH_LANGUAGES.includes("id"), true);
});

test("getNextHomeGraphLanguage biases toward English and picks a different language", () => {
  // current = "ja", random = 0 → 0 < 0.3 bias → returns "en"
  assert.equal(
    getNextHomeGraphLanguage("ja", () => 0),
    "en",
  );
  // current = "ja", random = 0.5 ≥ bias, falls through
  // second random = 0.9 → index 7 of non-ja languages = "en" (en is last)
  const seq = createSequenceRandom([0.5, 0.9]);
  assert.equal(getNextHomeGraphLanguage("ja", seq), "en");
  // current = "en", no bias → random = 0.9999 → index 7 of non-en = "fa"
  assert.equal(
    getNextHomeGraphLanguage("en", () => 0.9999),
    "fa",
  );
});

test("getHomeGraphLanguageRotationIntervalMs maps node delay into a 4-7 second window", () => {
  assert.equal(getHomeGraphLanguageRotationIntervalMs(0, 540), 4000);
  assert.equal(getHomeGraphLanguageRotationIntervalMs(240, 540), 5333);
  assert.equal(getHomeGraphLanguageRotationIntervalMs(540, 540), 7000);
});

test("getHomeGraphLanguageRotationIntervalMs doubles duration for English", () => {
  assert.equal(getHomeGraphLanguageRotationIntervalMs(0, 540, "en"), 8000);
  assert.equal(getHomeGraphLanguageRotationIntervalMs(540, 540, "en"), 14000);
  assert.equal(getHomeGraphLanguageRotationIntervalMs(0, 540, "ja"), 4000);
  assert.equal(getHomeGraphLanguageRotationIntervalMs(0, 540, "zh"), 4000);
});
