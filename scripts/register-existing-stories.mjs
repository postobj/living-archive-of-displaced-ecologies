import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import matter from "gray-matter";
import { BaserowClient } from "./process-baserow-submissions.mjs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "..");
const storiesDir = path.join(repoRoot, "content", "stories");

function env(name, fallback = "") {
  const value = process.env[name];
  if (value == null || String(value).trim() === "") {
    return fallback;
  }
  return value;
}

function parseBooleanEnv(name, fallback = false) {
  const value = env(name, String(fallback)).toLowerCase();
  return ["true", "1", "yes"].includes(value);
}

function parseContributorEmailMap(raw) {
  if (!raw) return new Map();
  try {
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return new Map();
    return new Map(Object.entries(parsed));
  } catch {
    console.warn("Failed to parse CONTRIBUTOR_EMAIL_MAP as JSON, ignoring.");
    return new Map();
  }
}

function parseStringList(value) {
  if (Array.isArray(value)) {
    return value
      .map((entry) => {
        if (typeof entry === "string") return entry.trim();
        if (entry && typeof entry === "object")
          return String(entry.value ?? entry.name ?? "").trim();
        return "";
      })
      .filter(Boolean);
  }
  if (!value || typeof value !== "string") return [];
  return value
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

function getConfig() {
  return {
    apiToken: env("BASEROW_API_TOKEN"),
    apiUrl: env("BASEROW_API_URL", "https://api.baserow.io"),
    storiesTableId: Number.parseInt(env("BASEROW_STORIES_TABLE_ID", ""), 10),
    defaultOwnerEmails: parseStringList(env("DEFAULT_OWNER_EMAILS", "")),
    contributorEmailMap: parseContributorEmailMap(
      env("CONTRIBUTOR_EMAIL_MAP", ""),
    ),
    defaultConsentVersion: env("DEFAULT_CONSENT_VERSION", "v1"),
    dryRun: parseBooleanEnv("DRY_RUN", true),
  };
}

function resolveOwnerEmails(contributor, frontmatter, config) {
  const contributorTrimmed = (contributor ?? "").trim();

  if (config.contributorEmailMap.has(contributorTrimmed)) {
    return [config.contributorEmailMap.get(contributorTrimmed)];
  }

  if (contributorTrimmed.includes("@")) {
    return parseStringList(contributorTrimmed);
  }

  const frontmatterOwners = parseStringList(frontmatter.owner_emails ?? "");
  if (frontmatterOwners.length > 0) {
    return frontmatterOwners;
  }

  return config.defaultOwnerEmails;
}

async function main() {
  const config = getConfig();

  if (!config.apiToken) {
    console.error("BASEROW_API_TOKEN is required. Set it in your environment.");
    process.exitCode = 1;
    return;
  }

  if (!Number.isInteger(config.storiesTableId) || config.storiesTableId <= 0) {
    console.error(
      "BASEROW_STORIES_TABLE_ID is required. Set it in your environment.",
    );
    process.exitCode = 1;
    return;
  }

  if (config.dryRun) {
    console.log("=== DRY RUN MODE === (set DRY_RUN=false to apply changes)\n");
  }

  const client = new BaserowClient({
    apiToken: config.apiToken,
    apiUrl: config.apiUrl,
  });

  // Read all story files
  const files = fs
    .readdirSync(storiesDir)
    .filter((f) => f.endsWith(".md") || f.endsWith(".mdx"))
    .sort();

  if (files.length === 0) {
    console.log("No story files found in content/stories/.");
    return;
  }

  // Parse each file
  const candidates = [];
  for (const filename of files) {
    const slug = filename.replace(/\.(md|mdx)$/, "");
    const raw = fs.readFileSync(path.join(storiesDir, filename), "utf8");
    const parsed = matter(raw);
    const data = parsed.data ?? {};

    const storyId =
      (data.storyId ?? `story-${slug}`).toString().trim() || `story-${slug}`;

    const contributor = (data.contributor ?? "").toString().trim();
    const ownerEmails = resolveOwnerEmails(contributor, data, config);

    const consentVersion =
      (data.consentVersion ?? config.defaultConsentVersion).toString().trim() ||
      config.defaultConsentVersion;

    candidates.push({
      filename,
      slug,
      storyId,
      contributor,
      ownerEmails,
      consentVersion,
      title: data.title ?? "",
    });
  }

  // Fetch existing stories for idempotency check
  let existingRows = [];
  if (!config.dryRun) {
    existingRows = await client.listRows(config.storiesTableId);
  }

  const existingByStoryId = new Set();
  const existingBySlug = new Set();
  for (const row of existingRows) {
    const sid = (row["story_id"] ?? "").toString().trim();
    const sl = (row["slug"] ?? "").toString().trim();
    if (sid) existingByStoryId.add(sid);
    if (sl) existingBySlug.add(sl);
  }

  // Determine which candidates need registration
  const toRegister = [];
  const alreadyExisted = [];
  const skipped = [];

  for (const c of candidates) {
    const existsById = existingByStoryId.has(c.storyId);
    const existsBySlug = existingBySlug.has(c.slug);

    if (existsById || existsBySlug) {
      const reasons = [];
      if (existsById) reasons.push(`story_id=${c.storyId}`);
      if (existsBySlug) reasons.push(`slug=${c.slug}`);
      alreadyExisted.push({ ...c, reasons: reasons.join(", ") });
    } else if (c.ownerEmails.length === 0) {
      skipped.push({ ...c, reason: "no owner email could be resolved" });
    } else {
      toRegister.push(c);
    }
  }

  // Report candidates
  console.log(`Found ${files.length} story file(s) in content/stories/.\n`);

  if (toRegister.length > 0) {
    console.log(`To register (${toRegister.length}):`);
    for (const c of toRegister) {
      console.log(
        `  ${c.storyId.padEnd(24)} → ${c.slug.padEnd(20)} → ${c.contributor || "(no contributor)"}`,
      );
    }
    console.log();
  }

  if (alreadyExisted.length > 0) {
    console.log(`Already existed (${alreadyExisted.length}):`);
    for (const c of alreadyExisted) {
      console.log(
        `  ${c.storyId.padEnd(24)} → ${c.slug.padEnd(20)} → ${c.reasons}`,
      );
    }
    console.log();
  }

  if (skipped.length > 0) {
    console.log(`Skipped (${skipped.length}):`);
    for (const c of skipped) {
      console.log(
        `  ${c.storyId.padEnd(24)} → ${c.slug.padEnd(20)} → ${c.reason}`,
      );
    }
    console.log();
  }

  if (toRegister.length === 0) {
    console.log("Nothing to register.");
    return;
  }

  if (config.dryRun) {
    console.log(
      `Dry run: would register ${toRegister.length} story entries. Set DRY_RUN=false to apply.`,
    );
    return;
  }

  // Create rows
  const rows = toRegister.map((c) => ({
    fields: {
      story_id: c.storyId,
      slug: c.slug,
      owner_emails: c.ownerEmails.join(", "),
      co_editors: "",
      consent_version: c.consentVersion,
      status: "active",
    },
  }));

  await client.createRows(config.storiesTableId, rows);
  console.log(
    `Registered ${toRegister.length} story entries in Baserow Stories table.`,
  );
}

const isDirectExecution =
  process.argv[1] &&
  import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href;

if (isDirectExecution) {
  main().catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
}
