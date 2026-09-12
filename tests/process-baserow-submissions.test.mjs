import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import fsp from "node:fs/promises";
import path from "node:path";
import { tmpdir } from "node:os";
import test from "node:test";

import {
  buildMetadataPatch,
  mergeFrontmatter,
  normalizeEmail,
  parseStringList,
  parseWeightedTags,
  removeUndefinedEntries,
  slugify,
  toBoolean,
  buildStoryIndex,
  getOwnerEmails,
  isTrustedSubmission,
  buildSubmissionUpdate,
  buildAuditRecord,
  validateSubmission,
  slugIsAvailable,
  coerceFileValue,
  coerceFileArray,
  processNewSubmission,
  processUpdateSubmission,
} from "../scripts/process-baserow-submissions.mjs";

// --- Existing utility tests (unchanged) ---

test("slugify normalizes text for markdown filenames", () => {
  assert.equal(slugify(" Echoes From Afar! "), "echoes-from-afar");
  assert.equal(slugify("Artist's Memory"), "artists-memory");
});

test("parseStringList handles arrays and comma-separated strings", () => {
  assert.deepEqual(parseStringList("a, b , c"), ["a", "b", "c"]);
  assert.deepEqual(parseStringList(["x", "", " y "]), ["x", "y"]);
  assert.deepEqual(parseStringList([{ value: "alpha" }, { value: "beta" }]), [
    "alpha",
    "beta",
  ]);
});

test("toBoolean supports common truthy values", () => {
  assert.equal(toBoolean(true), true);
  assert.equal(toBoolean("yes"), true);
  assert.equal(toBoolean("1"), true);
  assert.equal(toBoolean("no"), false);
});

test("normalizeEmail lowercases and trims", () => {
  assert.equal(normalizeEmail(" Artist@Example.com "), "artist@example.com");
});

test("parseWeightedTags accepts CSV values", () => {
  assert.deepEqual(parseWeightedTags("layered, soft"), [
    { name: "layered", weight: 0.8 },
    { name: "soft", weight: 0.8 },
  ]);
});

test("removeUndefinedEntries strips undefined values", () => {
  const result = removeUndefinedEntries({
    title: "test",
    slogan: undefined,
    contributor: "hello",
  });
  assert.deepEqual(result, { title: "test", contributor: "hello" });
});

test("mergeFrontmatter preserves existing keys when patch omits them", () => {
  const existing = { title: "Old Title", contributor: "Old Author" };
  const patch = { title: "New Title" };
  const merged = mergeFrontmatter(existing, patch);
  assert.equal(merged.title, "New Title");
  assert.equal(merged.contributor, "Old Author");
});

// --- Test helpers ---

function configFixture(overrides = {}) {
  return {
    baserowApiToken: "test-token",
    baserowApiUrl: "https://api.baserow.io",
    submissionsTableId: 123,
    storiesTableId: 456,
    auditTableId: 789,
    trustedArtistEmails: new Set(["trusted@example.com"]),
    maxSubmissionsPerEmail: 5,
    defaultConsentVersion: "v1",
    requireConsentConfirmation: true,
    automationActor: "test-automation@echoes-from-afar",
    dryRun: false,
    statusValues: {
      pending: "pending",
      rejected: "rejected",
      prOpened: "pr_opened",
      queuedAutoPublish: "queued_auto_publish",
      error: "error",
    },
    submissionFields: {
      submissionId: "submission_id",
      submissionType: "submission_type",
      targetStoryId: "target_story_id",
      storyId: "story_id",
      slogan: "slogan",
      title: "title",
      contributor: "author",
      artistLink: "artist_link",
      date: "date",
      geography: "geography",
      attachments: "attachments",
      submitterEmail: "submitter_email",
      verificationToken: "verification_token",
      consentConfirmed: "consent_confirmed",
      consentVersion: "consent_version",
      trustLevel: "trust_level",
      status: "status",
      decisionReason: "decision_reason",
      riskFlags: "risk_flags",
      ownerEmails: "owner_emails",
      coEditors: "co_editors",
    },
    storyFields: {
      storyId: "story_id",
      slug: "slug",
      ownerEmails: "owner_emails",
      coEditors: "co_editors",
      consentVersion: "consent_version",
      status: "status",
    },
    auditFields: {
      submissionId: "submission_id",
      decision: "decision",
      reason: "reason",
      actor: "actor",
      timestamp: "timestamp",
      riskFlags: "risk_flags",
    },
    ...overrides,
  };
}

const TEST_SECRET = "test-secret";

function createTestToken(email, secret = TEST_SECRET) {
  const expiry = Date.now() + 7 * 24 * 60 * 60 * 1000; // 7 days
  const message = `${email.toLowerCase().trim()}:${expiry}`;
  const sig = crypto.createHmac("sha256", secret).update(message).digest("hex");
  return `${expiry}:${sig}`;
}

function tempDir() {
  const dir = fs.mkdtempSync(path.join(tmpdir(), "submissions-test-"));
  return dir;
}

function cleanupDir(dir) {
  fs.rmSync(dir, { recursive: true, force: true });
}

function writeStories(dir, fixtures) {
  fs.mkdirSync(dir, { recursive: true });
  for (const [name, content] of Object.entries(fixtures)) {
    fs.writeFileSync(path.join(dir, name), content, "utf8");
  }
}

function emptyDeps(storiesDir) {
  return {
    existsSync: (p) => fs.existsSync(p),
    readFile: (p, enc) => fsp.readFile(p, enc ?? "utf8"),
    writeFile: (p, c, enc) => fsp.writeFile(p, c, enc ?? "utf8"),
    storiesDir,
  };
}

// --- buildStoryIndex tests ---

test("buildStoryIndex populates byStoryId and bySlug from active records", () => {
  const config = configFixture();
  const records = [
    {
      story_id: "story-a",
      slug: "alpha",
      status: "active",
    },
    {
      story_id: "story-b",
      slug: "bravo",
      status: "active",
    },
  ];
  const index = buildStoryIndex(records, config);

  assert.equal(index.byStoryId.size, 2);
  assert.equal(index.bySlug.size, 2);
  assert.deepEqual(index.byStoryId.get("story-a"), records[0]);
  assert.deepEqual(index.bySlug.get("bravo"), records[1]);
});

test("buildStoryIndex filters out archived stories", () => {
  const config = configFixture();
  const records = [
    { story_id: "story-a", slug: "alpha", status: "archived" },
    { story_id: "story-b", slug: "bravo", status: "active" },
  ];
  const index = buildStoryIndex(records, config);

  assert.equal(index.byStoryId.size, 1);
  assert.equal(index.bySlug.size, 1);
  assert.equal(index.byStoryId.has("story-a"), false);
  assert.equal(index.byStoryId.has("story-b"), true);
});

test("buildStoryIndex handles empty input", () => {
  const index = buildStoryIndex([], configFixture());
  assert.equal(index.byStoryId.size, 0);
  assert.equal(index.bySlug.size, 0);
});

// --- getOwnerEmails tests ---

test("getOwnerEmails returns union of owner_emails and co_editors", () => {
  const config = configFixture();
  const record = {
    owner_emails: "alice@example.com, bob@example.com",
    co_editors: "charlie@example.com",
  };
  const emails = getOwnerEmails(record, config);
  assert.deepEqual(emails, [
    "alice@example.com",
    "bob@example.com",
    "charlie@example.com",
  ]);
});

test("getOwnerEmails deduplicates overlapping emails", () => {
  const config = configFixture();
  const record = {
    owner_emails: "alice@example.com",
    co_editors: "alice@example.com",
  };
  assert.deepEqual(getOwnerEmails(record, config), ["alice@example.com"]);
});

test("getOwnerEmails normalizes case", () => {
  const config = configFixture();
  const record = {
    owner_emails: "Alice@Example.com",
    co_editors: "",
  };
  assert.deepEqual(getOwnerEmails(record, config), ["alice@example.com"]);
});

test("getOwnerEmails returns empty array when both fields are empty", () => {
  const config = configFixture();
  const record = { owner_emails: "", co_editors: "" };
  assert.deepEqual(getOwnerEmails(record, config), []);
});

// --- isTrustedSubmission tests ---

test("isTrustedSubmission returns true for email in trustedArtistEmails", () => {
  const config = configFixture();
  assert.equal(isTrustedSubmission({}, "trusted@example.com", config), true);
});

test("isTrustedSubmission returns true for trust_level trusted", () => {
  const config = configFixture({ trustedArtistEmails: new Set() });
  assert.equal(
    isTrustedSubmission(
      { trust_level: "trusted" },
      "anyone@example.com",
      config,
    ),
    true,
  );
});

test("isTrustedSubmission returns false for unknown email with standard level", () => {
  const config = configFixture();
  assert.equal(isTrustedSubmission({}, "unknown@example.com", config), false);
});

// --- buildMetadataPatch tests ---

test("buildMetadataPatch builds full patch from complete submission", () => {
  const config = configFixture();
  const patch = buildMetadataPatch(
    {
      title: "New Title",
      author: "Artist Name",
      date: "2026-03-15",
      slogan: "A brief summary",
      geography: "asia",
      attachments: [
        { name: "audio.mp3", url: "https://files.example.com/audio.mp3" },
        { name: "photo.jpg", url: "https://files.example.com/photo.jpg" },
      ],
      consent_version: "v2",
    },
    config,
  );

  assert.equal(patch.title, "New Title");
  assert.equal(patch.contributor, "Artist Name");
  assert.equal(patch.date, "2026-03-15");
  assert.equal(patch.slogan, "A brief summary");
  assert.deepEqual(patch.geography, [{ name: "asia", weight: 0.8 }]);
  assert.deepEqual(patch.imageFiles, ["photo.jpg"]);
  assert.deepEqual(patch.attachments, ["audio.mp3"]);
  assert.equal(patch.consentVersion, "v2");
});

test("buildMetadataPatch returns empty object for all-empty fields", () => {
  const config = configFixture();
  const patch = buildMetadataPatch({}, config);
  assert.deepEqual(Object.keys(patch).length, 0);
});

test("buildMetadataPatch handles partial data", () => {
  const config = configFixture();
  const patch = buildMetadataPatch({ title: "Only Title" }, config);
  assert.deepEqual(patch, { title: "Only Title" });
});

test("buildMetadataPatch drops empty fields so existing frontmatter is preserved", () => {
  const config = configFixture();
  assert.equal("slogan" in buildMetadataPatch({ slogan: "" }, config), false);
  assert.equal(
    "slogan" in buildMetadataPatch({ slogan: undefined }, config),
    false,
  );
  const patch = buildMetadataPatch({ slogan: "A summary" }, config);
  assert.equal(patch.slogan, "A summary");
});

// --- mergeFrontmatter tests ---

test("mergeFrontmatter patch keys override existing keys", () => {
  const existing = { title: "Old", contributor: "Old Author" };
  const patch = { title: "New" };
  assert.deepEqual(mergeFrontmatter(existing, patch), {
    title: "New",
    contributor: "Old Author",
  });
});

test("mergeFrontmatter preserves keys not in patch", () => {
  const existing = { title: "Story", themes: ["art"], excerpt: "Summary" };
  const patch = { title: "Updated" };
  assert.deepEqual(mergeFrontmatter(existing, patch), {
    title: "Updated",
    themes: ["art"],
    excerpt: "Summary",
  });
});

test("mergeFrontmatter does not mutate original objects", () => {
  const existing = { title: "Original" };
  const patch = { title: "Changed" };
  mergeFrontmatter(existing, patch);
  assert.equal(existing.title, "Original");
  assert.equal(patch.title, "Changed");
});

// --- buildSubmissionUpdate tests ---

test("buildSubmissionUpdate builds status and reason payload", () => {
  const config = configFixture();
  const result = {
    recordId: 42,
    status: "accepted",
    reason: "looks good",
    riskFlags: [],
  };
  const update = buildSubmissionUpdate(result, config);
  assert.deepEqual(update, {
    id: 42,
    fields: { status: "accepted", decision_reason: "looks good" },
  });
});

test("buildSubmissionUpdate includes risk_flags when present", () => {
  const config = configFixture();
  const result = {
    recordId: 5,
    status: "rejected",
    reason: "nope",
    riskFlags: ["otp_not_verified", "rate_limited"],
  };
  const update = buildSubmissionUpdate(result, config);
  assert.equal(update.fields.risk_flags, "otp_not_verified, rate_limited");
});

test("buildSubmissionUpdate omits risk_flags when empty", () => {
  const config = configFixture();
  const result = {
    recordId: 1,
    status: "accepted",
    reason: "ok",
    riskFlags: [],
  };
  const update = buildSubmissionUpdate(result, config);
  assert.equal("risk_flags" in update.fields, false);
});

// --- buildAuditRecord tests ---

test("buildAuditRecord includes all required fields", () => {
  const config = configFixture();
  const result = {
    submissionId: "sub-abc",
    status: "pr_opened",
    reason: "standard submission",
    riskFlags: [],
  };
  const record = buildAuditRecord(result, config);
  const f = record.fields;
  assert.equal(f.submission_id, "sub-abc");
  assert.equal(f.decision, "pr_opened");
  assert.equal(f.reason, "standard submission");
  assert.equal(f.actor, "test-automation@echoes-from-afar");
  assert.ok(typeof f.timestamp === "string");
  assert.equal(f.risk_flags, "");
});

test("buildAuditRecord joins riskFlags into string", () => {
  const config = configFixture();
  const result = {
    submissionId: "sub-xyz",
    status: "rejected",
    reason: "bad",
    riskFlags: ["otp_not_verified"],
  };
  const record = buildAuditRecord(result, config);
  assert.equal(record.fields.risk_flags, "otp_not_verified");
});

// --- validateSubmission tests ---

// Set the secret the production code reads via process.env.
process.env.BASEROW_API_TOKEN = TEST_SECRET;

test("validateSubmission rejects missing submitter_email", () => {
  const config = configFixture();
  const result = validateSubmission({
    recordId: 1,
    submissionFields: {},
    submitterEmail: "",
    submissionsByEmail: new Map(),
    config,
  });
  assert.notEqual(result, null);
  assert.equal(result.riskFlags[0], "missing_submitter_email");
});

test("validateSubmission rejects when rate limited", () => {
  const config = configFixture({ maxSubmissionsPerEmail: 1 });
  const map = new Map();
  const fields = {
    verification_token: createTestToken("a@b.com"),
    consent_confirmed: true,
  };

  // First call passes
  assert.equal(
    validateSubmission({
      recordId: 1,
      submissionFields: fields,
      submitterEmail: "a@b.com",
      submissionsByEmail: map,
      config,
    }),
    null,
  );

  // Second call with same email exceeds limit
  const result = validateSubmission({
    recordId: 2,
    submissionFields: fields,
    submitterEmail: "a@b.com",
    submissionsByEmail: map,
    config,
  });
  assert.notEqual(result, null);
  assert.equal(result.riskFlags[0], "rate_limited");
});

test("validateSubmission rejects when email not verified (missing token)", () => {
  const config = configFixture();
  const fields = { consent_confirmed: true };
  const result = validateSubmission({
    recordId: 1,
    submissionFields: fields,
    submitterEmail: "a@b.com",
    submissionsByEmail: new Map(),
    config,
  });
  assert.notEqual(result, null);
  assert.equal(result.riskFlags[0], "email_not_verified");
});

test("validateSubmission rejects when email not verified (invalid token)", () => {
  const config = configFixture();
  const fields = { verification_token: "garbage", consent_confirmed: true };
  const result = validateSubmission({
    recordId: 1,
    submissionFields: fields,
    submitterEmail: "a@b.com",
    submissionsByEmail: new Map(),
    config,
  });
  assert.notEqual(result, null);
  assert.equal(result.riskFlags[0], "email_not_verified");
});

test("validateSubmission skips token check for update submissions", () => {
  const config = configFixture();
  const fields = { consent_confirmed: true }; // no verification_token
  const result = validateSubmission({
    recordId: 1,
    submissionFields: fields,
    submitterEmail: "a@b.com",
    submissionType: "update",
    submissionsByEmail: new Map(),
    config,
  });
  assert.equal(result, null);
});

test("validateSubmission rejects when consent not confirmed", () => {
  const config = configFixture({ requireConsentConfirmation: true });
  const fields = {
    verification_token: createTestToken("a@b.com"),
    consent_confirmed: false,
  };
  const result = validateSubmission({
    recordId: 1,
    submissionFields: fields,
    submitterEmail: "a@b.com",
    submissionsByEmail: new Map(),
    config,
  });
  assert.notEqual(result, null);
  assert.equal(result.riskFlags[0], "consent_not_confirmed");
});

test("validateSubmission accepts when requireConsentConfirmation is false", () => {
  const config = configFixture({ requireConsentConfirmation: false });
  const fields = {
    verification_token: createTestToken("a@b.com"),
    consent_confirmed: false,
  };
  const result = validateSubmission({
    recordId: 1,
    submissionFields: fields,
    submitterEmail: "a@b.com",
    submissionsByEmail: new Map(),
    config,
  });
  assert.equal(result, null);
});

test("validateSubmission returns null when all checks pass", () => {
  const config = configFixture();
  const fields = {
    verification_token: createTestToken("artist@example.com"),
    consent_confirmed: true,
  };
  const result = validateSubmission({
    recordId: 1,
    submissionFields: fields,
    submitterEmail: "artist@example.com",
    submissionsByEmail: new Map(),
    config,
  });
  assert.equal(result, null);
});

test("validateSubmission mutates submissionsByEmail map", () => {
  const config = configFixture();
  const map = new Map();
  const fields = {
    verification_token: createTestToken("a@b.com"),
    consent_confirmed: true,
  };

  validateSubmission({
    recordId: 1,
    submissionFields: fields,
    submitterEmail: "a@b.com",
    submissionsByEmail: map,
    config,
  });

  assert.equal(map.get("a@b.com"), 1);
});

test("validateSubmission tracks different emails independently in rate limit", () => {
  const config = configFixture({ maxSubmissionsPerEmail: 1 });
  const map = new Map();
  const fieldsA = {
    verification_token: createTestToken("a@b.com"),
    consent_confirmed: true,
  };
  const fieldsC = {
    verification_token: createTestToken("c@d.com"),
    consent_confirmed: true,
  };

  assert.equal(
    validateSubmission({
      recordId: 1,
      submissionFields: fieldsA,
      submitterEmail: "a@b.com",
      submissionsByEmail: map,
      config,
    }),
    null,
  );

  assert.equal(
    validateSubmission({
      recordId: 2,
      submissionFields: fieldsC,
      submitterEmail: "c@d.com",
      submissionsByEmail: map,
      config,
    }),
    null,
  );
});

// --- slugIsAvailable tests ---

test("slugIsAvailable returns true when slug is not in the set", () => {
  const existingFiles = new Set(["existing-story.md", "other.md"]);
  assert.equal(slugIsAvailable("new-story", existingFiles), true);
});

test("slugIsAvailable returns false when .md version exists", () => {
  const existingFiles = new Set(["existing-story.md"]);
  assert.equal(slugIsAvailable("existing-story", existingFiles), false);
});

test("slugIsAvailable returns false when .mdx version exists", () => {
  const existingFiles = new Set(["existing-story.mdx"]);
  assert.equal(slugIsAvailable("existing-story", existingFiles), false);
});

// --- coerceFileValue tests ---

test("coerceFileValue returns undefined for null/undefined", () => {
  assert.equal(coerceFileValue(null), undefined);
  assert.equal(coerceFileValue(undefined), undefined);
});

test("coerceFileValue returns trimmed string for plain string input", () => {
  assert.equal(coerceFileValue("audio.mp3"), "audio.mp3");
  assert.equal(coerceFileValue("  photo.jpg  "), "photo.jpg");
  assert.equal(coerceFileValue(""), undefined);
});

test("coerceFileValue extracts name from Baserow file array", () => {
  const fileArray = [
    {
      url: "https://files.baserow.io/123.mp3",
      name: "recording.mp3",
      size: 5000,
      mime_type: "audio/mpeg",
    },
  ];
  assert.equal(coerceFileValue(fileArray), "recording.mp3");
});

test("coerceFileValue falls back to url when name is missing from file array", () => {
  const fileArray = [
    {
      url: "https://files.baserow.io/123.jpg",
      size: 3000,
      mime_type: "image/jpeg",
    },
  ];
  assert.equal(coerceFileValue(fileArray), "https://files.baserow.io/123.jpg");
});

test("coerceFileValue returns undefined for empty file array", () => {
  assert.equal(coerceFileValue([]), undefined);
});

test("coerceFileValue extracts name from single file object", () => {
  assert.equal(
    coerceFileValue({ name: "image.png", url: "https://..." }),
    "image.png",
  );
});

test("coerceFileValue falls back to url from single file object", () => {
  assert.equal(
    coerceFileValue({ url: "https://example.com/file.mp3" }),
    "https://example.com/file.mp3",
  );
});

// --- coerceFileArray tests ---

test("coerceFileArray extracts all file names from Baserow file array", () => {
  const fileArray = [
    { name: "recording.mp3", url: "https://files.example.com/1.mp3" },
    { name: "photo.jpg", url: "https://files.example.com/2.jpg" },
  ];
  assert.deepEqual(coerceFileArray(fileArray), ["recording.mp3", "photo.jpg"]);
});

test("coerceFileArray falls back to url when name is missing", () => {
  const fileArray = [
    { url: "https://files.example.com/1.mp3" },
    { name: "photo.jpg", url: "https://files.example.com/2.jpg" },
  ];
  assert.deepEqual(coerceFileArray(fileArray), [
    "https://files.example.com/1.mp3",
    "photo.jpg",
  ]);
});

test("coerceFileArray returns undefined for null/undefined", () => {
  assert.equal(coerceFileArray(null), undefined);
  assert.equal(coerceFileArray(undefined), undefined);
});

test("coerceFileArray returns undefined for empty array", () => {
  assert.equal(coerceFileArray([]), undefined);
});

test("coerceFileArray handles plain string input", () => {
  assert.deepEqual(coerceFileArray("audio.mp3"), ["audio.mp3"]);
  assert.equal(coerceFileArray(""), undefined);
});

test("coerceFileArray handles single file object", () => {
  assert.deepEqual(coerceFileArray({ name: "image.png", url: "https://..." }), [
    "image.png",
  ]);
});

// --- processNewSubmission integration tests ---

test("processNewSubmission successfully creates a story file", async () => {
  const dir = tempDir();
  try {
    const config = configFixture();
    const deps = emptyDeps(dir);
    const submissionFields = {
      submission_id: "sub-001",
      title: "My New Story",
      author: "Test Artist",
      attachments: [{ name: "story-manuscript.pdf" }],
      submitter_email: "artist@example.com",
      owner_emails: "artist@example.com",
    };

    const result = await processNewSubmission({
      record: { id: 10 },
      submissionFields,
      submitterEmail: "artist@example.com",
      config,
      context: deps,
    });

    assert.equal(result.accepted, true);
    assert.equal(result.changedFiles, 1);
    assert.ok(result.storyRegistration);
    assert.equal(
      result.storyRegistration.fields.story_id,
      "story-my-new-story",
    );
    assert.equal(result.storyRegistration.fields.slug, "my-new-story");

    // Verify file was written
    const filePath = path.join(dir, "my-new-story.md");
    const contents = await fsp.readFile(filePath, "utf8");
    assert.ok(contents.includes("storyId: story-my-new-story"));
    assert.ok(contents.includes("title: My New Story"));
    assert.ok(contents.includes("- story-manuscript.pdf"));
  } finally {
    cleanupDir(dir);
  }
});

test("processNewSubmission rejects duplicate slug", async () => {
  const dir = tempDir();
  try {
    writeStories(dir, { "my-story.md": "---\ntitle: Existing\n---\nBody\n" });
    const config = configFixture();
    const deps = emptyDeps(dir);
    const submissionFields = {
      submission_id: "sub-002",
      slogan: "my-story",
      title: "My Story",
      attachments: [{ name: "story.pdf" }],
      submitter_email: "a@b.com",
    };

    const result = await processNewSubmission({
      record: { id: 11 },
      submissionFields,
      submitterEmail: "a@b.com",
      config,
      context: deps,
    });

    assert.equal(result.accepted, false);
    assert.equal(result.riskFlags[0], "duplicate_slug");
  } finally {
    cleanupDir(dir);
  }
});

test("processNewSubmission rejects missing title", async () => {
  const dir = tempDir();
  try {
    const config = configFixture();
    const deps = emptyDeps(dir);
    const result = await processNewSubmission({
      record: { id: 12 },
      submissionFields: {
        attachments: [{ name: "story.pdf" }],
        submitter_email: "a@b.com",
      },
      submitterEmail: "a@b.com",
      config,
      context: deps,
    });

    assert.equal(result.accepted, false);
    assert.equal(result.riskFlags[0], "missing_required_fields");
  } finally {
    cleanupDir(dir);
  }
});

test("processNewSubmission accepts title-only submission with empty body", async () => {
  const dir = tempDir();
  try {
    const config = configFixture();
    const deps = emptyDeps(dir);
    const result = await processNewSubmission({
      record: { id: 13 },
      submissionFields: {
        title: "Title Only",
        submitter_email: "a@b.com",
      },
      submitterEmail: "a@b.com",
      config,
      context: deps,
    });

    assert.equal(result.accepted, true);
    const contents = await fsp.readFile(
      path.join(dir, "title-only.md"),
      "utf8",
    );
    assert.ok(contents.includes("title: Title Only"));
  } finally {
    cleanupDir(dir);
  }
});

test("processNewSubmission generates slug from title when none provided", async () => {
  const dir = tempDir();
  try {
    const config = configFixture();
    const deps = emptyDeps(dir);
    const result = await processNewSubmission({
      record: { id: 14 },
      submissionFields: {
        title: "Hello World: Part 2!",
        attachments: [{ name: "story.pdf" }],
        submitter_email: "a@b.com",
      },
      submitterEmail: "a@b.com",
      config,
      context: deps,
    });

    assert.equal(result.accepted, true);
    assert.equal(result.storyRegistration.fields.slug, "hello-world-part-2");
  } finally {
    cleanupDir(dir);
  }
});

test("processNewSubmission trusts submitter in trustedArtistEmails", async () => {
  const dir = tempDir();
  try {
    const config = configFixture();
    const deps = emptyDeps(dir);
    const result = await processNewSubmission({
      record: { id: 15 },
      submissionFields: {
        title: "Trusted Story",
        attachments: [{ name: "story.pdf" }],
        submitter_email: "trusted@example.com",
      },
      submitterEmail: "trusted@example.com",
      config,
      context: deps,
    });

    assert.equal(result.trusted, true);
    assert.equal(result.status, "queued_auto_publish");
  } finally {
    cleanupDir(dir);
  }
});

test("processNewSubmission marks standard submitter as pr_opened", async () => {
  const dir = tempDir();
  try {
    const config = configFixture();
    const deps = emptyDeps(dir);
    const result = await processNewSubmission({
      record: { id: 16 },
      submissionFields: {
        title: "Standard Story",
        attachments: [{ name: "story.pdf" }],
        submitter_email: "unknown@example.com",
      },
      submitterEmail: "unknown@example.com",
      config,
      context: deps,
    });

    assert.equal(result.trusted, false);
    assert.equal(result.status, "pr_opened");
  } finally {
    cleanupDir(dir);
  }
});

test("processNewSubmission does not write file in dry run mode", async () => {
  const dir = tempDir();
  try {
    const config = configFixture({ dryRun: true });
    const deps = emptyDeps(dir);
    const result = await processNewSubmission({
      record: { id: 17 },
      submissionFields: {
        title: "Dry Run Story",
        attachments: [{ name: "story.pdf" }],
        submitter_email: "a@b.com",
      },
      submitterEmail: "a@b.com",
      config,
      context: deps,
    });

    assert.equal(result.accepted, true);
    assert.equal(fs.existsSync(path.join(dir, "dry-run-story.md")), false);
  } finally {
    cleanupDir(dir);
  }
});

test("processNewSubmission adds submitter to owner_emails if not already present", async () => {
  const dir = tempDir();
  try {
    const config = configFixture();
    const deps = emptyDeps(dir);
    const result = await processNewSubmission({
      record: { id: 18 },
      submissionFields: {
        title: "Owner Test",
        attachments: [{ name: "story.pdf" }],
        submitter_email: "newartist@example.com",
        owner_emails: "existing@example.com",
      },
      submitterEmail: "newartist@example.com",
      config,
      context: deps,
    });

    const ownerEmails = result.storyRegistration.fields.owner_emails;
    assert.ok(ownerEmails.includes("newartist@example.com"));
    assert.ok(ownerEmails.includes("existing@example.com"));
  } finally {
    cleanupDir(dir);
  }
});

test("processNewSubmission uses existingFiles set via context for slug check", async () => {
  const dir = tempDir();
  try {
    const config = configFixture();
    const deps = emptyDeps(dir);
    const result = await processNewSubmission({
      record: { id: 19 },
      submissionFields: {
        title: "Existing Slug",
        attachments: [{ name: "story.pdf" }],
        submitter_email: "a@b.com",
      },
      submitterEmail: "a@b.com",
      config,
      context: { ...deps, existingFiles: new Set(["existing-slug.md"]) },
    });

    assert.equal(result.accepted, false);
    assert.equal(result.riskFlags[0], "duplicate_slug");
  } finally {
    cleanupDir(dir);
  }
});

// --- processUpdateSubmission integration tests ---

test("processUpdateSubmission successfully updates an existing story", async () => {
  const dir = tempDir();
  try {
    const config = configFixture();
    writeStories(dir, {
      "my-story.md": [
        "---",
        "storyId: story-my-story",
        "title: Original Title",
        "contributor: Original Artist",
        "date: '2025-01-01'",
        "themes:",
        "  - art",
        "---",
        "Original body content.",
        "",
      ].join("\n"),
    });

    const storyIndex = buildStoryIndex(
      [
        {
          story_id: "story-my-story",
          slug: "my-story",
          owner_emails: "owner@example.com",
          co_editors: "",
          status: "active",
        },
      ],
      config,
    );

    const deps = emptyDeps(dir);
    const result = await processUpdateSubmission({
      record: { id: 20 },
      submissionFields: {
        submission_id: "sub-upd-001",
        target_story_id: "story-my-story",
        title: "Updated Title",
        attachments: [{ name: "updated-story.pdf" }],
        owner_emails: "owner@example.com",
      },
      submitterEmail: "owner@example.com",
      storyIndex,
      config,
      context: deps,
    });

    assert.equal(result.accepted, true);
    assert.equal(result.changedFiles, 1);

    const contents = await fsp.readFile(path.join(dir, "my-story.md"), "utf8");
    assert.ok(contents.includes("title: Updated Title"));
    assert.ok(contents.includes("- updated-story.pdf"));
    // Original fields preserved
    assert.ok(contents.includes("contributor: Original Artist"));
  } finally {
    cleanupDir(dir);
  }
});

test("processUpdateSubmission rejects unknown story", async () => {
  const dir = tempDir();
  try {
    const config = configFixture();
    const storyIndex = buildStoryIndex([], config);
    const deps = emptyDeps(dir);

    const result = await processUpdateSubmission({
      record: { id: 21 },
      submissionFields: {
        target_story_id: "nonexistent",
        owner_emails: "a@b.com",
      },
      submitterEmail: "a@b.com",
      storyIndex,
      config,
      context: deps,
    });

    assert.equal(result.accepted, false);
    assert.equal(result.riskFlags[0], "unknown_story");
  } finally {
    cleanupDir(dir);
  }
});

test("processUpdateSubmission rejects owner email mismatch", async () => {
  const dir = tempDir();
  try {
    const config = configFixture();
    writeStories(dir, {
      "private-story.md": [
        "---",
        "storyId: story-private",
        "title: Private Story",
        "---",
        "Body.",
        "",
      ].join("\n"),
    });

    const storyIndex = buildStoryIndex(
      [
        {
          story_id: "story-private",
          slug: "private-story",
          owner_emails: "owner@example.com",
          co_editors: "",
          status: "active",
        },
      ],
      config,
    );

    const deps = emptyDeps(dir);
    const result = await processUpdateSubmission({
      record: { id: 22 },
      submissionFields: {
        target_story_id: "story-private",
        owner_emails: "intruder@example.com",
      },
      submitterEmail: "intruder@example.com",
      storyIndex,
      config,
      context: deps,
    });

    assert.equal(result.accepted, false);
    assert.equal(result.riskFlags[0], "owner_email_mismatch");
  } finally {
    cleanupDir(dir);
  }
});

test("processUpdateSubmission rejects when story file is missing on disk", async () => {
  const dir = tempDir();
  try {
    const config = configFixture();
    const storyIndex = buildStoryIndex(
      [
        {
          story_id: "story-orphan",
          slug: "orphan-story",
          owner_emails: "owner@example.com",
          co_editors: "",
          status: "active",
        },
      ],
      config,
    );

    const deps = emptyDeps(dir);
    const result = await processUpdateSubmission({
      record: { id: 23 },
      submissionFields: {
        target_story_id: "story-orphan",
        owner_emails: "owner@example.com",
      },
      submitterEmail: "owner@example.com",
      storyIndex,
      config,
      context: deps,
    });

    assert.equal(result.accepted, false);
    assert.equal(result.riskFlags[0], "missing_story_file");
  } finally {
    cleanupDir(dir);
  }
});

test("processUpdateSubmission rejects when no changes are detected", async () => {
  const dir = tempDir();
  try {
    const config = configFixture();

    // Use a flat frontmatter with no multi-line values so YAML round-trips cleanly.
    const storyContent =
      [
        "---",
        "storyId: story-same",
        "title: Same Title",
        "---",
        "Same body.",
      ].join("\n") + "\n";

    writeStories(dir, { "same-story.md": storyContent });

    const storyIndex = buildStoryIndex(
      [
        {
          story_id: "story-same",
          slug: "same-story",
          owner_emails: "owner@example.com",
          co_editors: "",
          status: "active",
        },
      ],
      config,
    );

    const deps = emptyDeps(dir);
    const result = await processUpdateSubmission({
      record: { id: 24 },
      submissionFields: {
        target_story_id: "story-same",
        title: "Same Title",
        owner_emails: "owner@example.com",
      },
      submitterEmail: "owner@example.com",
      storyIndex,
      config,
      context: deps,
    });

    assert.equal(result.accepted, false);
    assert.equal(result.riskFlags[0], "no_changes");
  } finally {
    cleanupDir(dir);
  }
});

test("processUpdateSubmission updates only metadata, preserving body", async () => {
  const dir = tempDir();
  try {
    const config = configFixture();
    writeStories(dir, {
      "meta-story.md": [
        "---",
        "storyId: story-meta",
        "title: Old Title",
        "contributor: Old Artist",
        "---",
        "Preserved body.",
        "",
      ].join("\n"),
    });

    const storyIndex = buildStoryIndex(
      [
        {
          story_id: "story-meta",
          slug: "meta-story",
          owner_emails: "owner@example.com",
          co_editors: "",
          status: "active",
        },
      ],
      config,
    );

    const deps = emptyDeps(dir);
    const result = await processUpdateSubmission({
      record: { id: 25 },
      submissionFields: {
        target_story_id: "story-meta",
        title: "New Title Only",
        owner_emails: "owner@example.com",
      },
      submitterEmail: "owner@example.com",
      storyIndex,
      config,
      context: deps,
    });

    assert.equal(result.accepted, true);
    const contents = await fsp.readFile(
      path.join(dir, "meta-story.md"),
      "utf8",
    );
    assert.ok(contents.includes("title: New Title Only"));
    assert.ok(contents.includes("Preserved body."));
    assert.ok(contents.includes("contributor: Old Artist"));
  } finally {
    cleanupDir(dir);
  }
});

test("processUpdateSubmission allows co_editor to update", async () => {
  const dir = tempDir();
  try {
    const config = configFixture();
    writeStories(dir, {
      "shared-story.md": [
        "---",
        "storyId: story-shared",
        "title: Shared Story",
        "---",
        "Body.",
        "",
      ].join("\n"),
    });

    const storyIndex = buildStoryIndex(
      [
        {
          story_id: "story-shared",
          slug: "shared-story",
          owner_emails: "primary@example.com",
          co_editors: "coeditor@example.com",
          status: "active",
        },
      ],
      config,
    );

    const deps = emptyDeps(dir);
    const result = await processUpdateSubmission({
      record: { id: 26 },
      submissionFields: {
        target_story_id: "story-shared",
        title: "Co-edited Title",
        owner_emails: "primary@example.com",
      },
      submitterEmail: "coeditor@example.com",
      storyIndex,
      config,
      context: deps,
    });

    assert.equal(result.accepted, true);
  } finally {
    cleanupDir(dir);
  }
});

// --- Edge case tests ---

test("processNewSubmission handles special characters in title for slug generation", async () => {
  const dir = tempDir();
  try {
    const config = configFixture();
    const deps = emptyDeps(dir);
    const result = await processNewSubmission({
      record: { id: 27 },
      submissionFields: {
        title: "   Héllo Wörld: Part 1!?   ",
        attachments: [{ name: "story.pdf" }],
        submitter_email: "a@b.com",
      },
      submitterEmail: "a@b.com",
      config,
      context: deps,
    });

    assert.equal(result.accepted, true);
    // slugify lowercases, strips special chars, replaces with hyphens
    assert.ok(result.storyRegistration.fields.slug.startsWith("h"));
  } finally {
    cleanupDir(dir);
  }
});

test("processNewSubmission normalizes Windows line endings in body", async () => {
  const dir = tempDir();
  try {
    const config = configFixture();
    const deps = emptyDeps(dir);
    await processNewSubmission({
      record: { id: 28 },
      submissionFields: {
        title: "Windows Story",
        attachments: [{ name: "story.pdf" }],
        submitter_email: "a@b.com",
      },
      submitterEmail: "a@b.com",
      config,
      context: deps,
    });

    const contents = await fsp.readFile(
      path.join(dir, "windows-story.md"),
      "utf8",
    );
    assert.equal(contents.includes("\r\n"), false);
    assert.ok(contents.includes("- story.pdf"));
  } finally {
    cleanupDir(dir);
  }
});

test("processUpdateSubmission handles frontmatter-only files", async () => {
  const dir = tempDir();
  try {
    const config = configFixture();
    writeStories(dir, {
      "frontmatter-only.md": "---\nstoryId: story-fm\ntitle: FM Only\n---\n",
    });

    const storyIndex = buildStoryIndex(
      [
        {
          story_id: "story-fm",
          slug: "frontmatter-only",
          owner_emails: "owner@example.com",
          co_editors: "",
          status: "active",
        },
      ],
      config,
    );

    const deps = emptyDeps(dir);
    const result = await processUpdateSubmission({
      record: { id: 29 },
      submissionFields: {
        target_story_id: "story-fm",
        title: "FM Updated",
        attachments: [{ name: "new-story.pdf" }],
        owner_emails: "owner@example.com",
      },
      submitterEmail: "owner@example.com",
      storyIndex,
      config,
      context: deps,
    });

    assert.equal(result.accepted, true);
    const contents = await fsp.readFile(
      path.join(dir, "frontmatter-only.md"),
      "utf8",
    );
    assert.ok(contents.includes("title: FM Updated"));
    assert.ok(contents.includes("- new-story.pdf"));
  } finally {
    cleanupDir(dir);
  }
});
