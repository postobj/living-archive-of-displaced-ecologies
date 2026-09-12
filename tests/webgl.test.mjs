import assert from "node:assert/strict";
import test from "node:test";

import { isWebGLSupported } from "../lib/webgl.ts";

test("isWebGLSupported returns true when webgl context is available", () => {
  const createCanvas = () => ({
    getContext: (contextId) => (contextId === "webgl" ? {} : null),
  });

  assert.equal(isWebGLSupported(createCanvas), true);
});

test("isWebGLSupported falls back to experimental-webgl", () => {
  const createCanvas = () => ({
    getContext: (contextId) => (contextId === "experimental-webgl" ? {} : null),
  });

  assert.equal(isWebGLSupported(createCanvas), true);
});

test("isWebGLSupported returns false when no contexts are available", () => {
  const createCanvas = () => ({
    getContext: () => null,
  });

  assert.equal(isWebGLSupported(createCanvas), false);
});

test("isWebGLSupported returns false when canvas factory throws", () => {
  const createCanvas = () => {
    throw new Error("boom");
  };

  assert.equal(isWebGLSupported(createCanvas), false);
});

test("isWebGLSupported returns false when getContext throws", () => {
  const createCanvas = () => ({
    getContext: () => {
      throw new Error("boom");
    },
  });

  assert.equal(isWebGLSupported(createCanvas), false);
});

test("isWebGLSupported returns false when createCanvas returns null", () => {
  const createCanvas = () => null;

  assert.equal(isWebGLSupported(createCanvas), false);
});
