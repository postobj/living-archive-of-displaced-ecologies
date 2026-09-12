import assert from "node:assert/strict";
import { access, readdir, readFile } from "node:fs/promises";
import test from "node:test";

import matter from "gray-matter";

// Frontmatter validation for content/stories/ and content/news/. These tests
// are content-agnostic: they encode the contract content authors follow, and
// must pass for any set of stories an archive ships.

const STORIES_DIR = new URL("../content/stories/", import.meta.url);
const NEWS_DIR = new URL("../content/news/", import.meta.url);
const IMAGES_DIR = new URL("../public/media/images/", import.meta.url);
const AUDIO_DIR = new URL("../public/media/audio/", import.meta.url);
const PUBLIC_DIR = new URL("../public/", import.meta.url);

async function listMarkdownFiles(dir) {
  try {
    const entries = await readdir(dir);
    return entries.filter((entry) => entry.endsWith(".md"));
  } catch (error) {
    if (error.code === "ENOENT") {
      return [];
    }
    throw error;
  }
}

function assertWeightedTags(tags, field, file, weightKey) {
  if (tags === undefined) {
    return;
  }

  assert.equal(Array.isArray(tags), true, `${file}: ${field} must be a list`);

  for (const tag of tags) {
    assert.equal(
      typeof tag.name === "string" && tag.name.trim().length > 0,
      true,
      `${file}: every ${field} entry needs a non-empty name`,
    );
    const weight = tag[weightKey];
    assert.equal(
      typeof weight === "number" && weight >= 0 && weight <= 1,
      true,
      `${file}: ${field} "${tag.name}" needs ${weightKey} between 0 and 1`,
    );
  }
}

test("story frontmatter satisfies the content contract", async () => {
  const files = await listMarkdownFiles(STORIES_DIR);
  assert.equal(files.length > 0, true, "content/stories/ must not be empty");

  for (const file of files) {
    const source = await readFile(new URL(file, STORIES_DIR), "utf8");
    const { data, content } = matter(source);

    for (const field of ["title", "contributor", "date"]) {
      assert.equal(
        typeof data[field] === "string" && data[field].trim().length > 0,
        true,
        `${file}: frontmatter needs a non-empty "${field}"`,
      );
    }

    assert.equal(
      content.trim().length > 0,
      true,
      `${file}: story body must not be empty`,
    );

    if (data.visibility !== undefined) {
      assert.equal(
        ["public", "community", "private"].includes(data.visibility),
        true,
        `${file}: visibility must be public, community, or private`,
      );
    }

    assertWeightedTags(data.emotions, "emotions", file, "intensity");
    assertWeightedTags(data.textures, "textures", file, "weight");
    assertWeightedTags(data.temporality, "temporality", file, "weight");
    assertWeightedTags(data.geography, "geography", file, "weight");

    if (data.artistLinks !== undefined) {
      assert.equal(Array.isArray(data.artistLinks), true);
      for (const link of data.artistLinks) {
        assert.equal(
          typeof link.label === "string" && link.label.trim().length > 0,
          true,
          `${file}: every artistLinks entry needs a label`,
        );
        assert.equal(
          typeof link.url === "string" && link.url.startsWith("https://"),
          true,
          `${file}: artistLinks url must be https`,
        );
      }
    }

    for (const image of data.imageFiles ?? []) {
      await assert.doesNotReject(
        () => access(new URL(image, IMAGES_DIR)),
        `${file}: imageFiles entry "${image}" not found in public/media/images/`,
      );
    }

    if (data.audioFile !== undefined) {
      await assert.doesNotReject(
        () => access(new URL(data.audioFile, AUDIO_DIR)),
        `${file}: audioFile "${data.audioFile}" not found in public/media/audio/`,
      );
    }

    for (const connection of data.connections ?? []) {
      await assert.doesNotReject(
        () => access(new URL(`${connection}.md`, STORIES_DIR)),
        `${file}: connection "${connection}" has no matching story`,
      );
    }
  }
});

test("news frontmatter satisfies the content contract", async () => {
  const files = await listMarkdownFiles(NEWS_DIR);

  for (const file of files) {
    const source = await readFile(new URL(file, NEWS_DIR), "utf8");
    const { data } = matter(source);

    assert.equal(
      Number.isInteger(data.year),
      true,
      `${file}: frontmatter needs an integer "year"`,
    );

    for (const field of ["dateLabel", "title"]) {
      assert.equal(
        typeof data[field] === "string" && data[field].trim().length > 0,
        true,
        `${file}: frontmatter needs a non-empty "${field}"`,
      );
    }

    if (data.link !== undefined) {
      assert.equal(
        data.link.startsWith("https://"),
        true,
        `${file}: link must be https`,
      );
    }

    for (const field of ["posterImage", "posterVideo"]) {
      const value = data[field];
      if (value === undefined) {
        continue;
      }
      assert.equal(
        value.startsWith("/"),
        true,
        `${file}: ${field} must be an absolute public path`,
      );
      await assert.doesNotReject(
        () => access(new URL(`.${value}`, PUBLIC_DIR)),
        `${file}: ${field} "${value}" not found under public/`,
      );
    }
  }
});
