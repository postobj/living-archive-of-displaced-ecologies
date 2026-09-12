import crypto from "node:crypto";
import fs from "node:fs";
import fsp from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import matter from "gray-matter";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "..");
const storiesDirectory = path.join(repoRoot, "content", "stories");

function env(name, fallback = "") {
  const value = process.env[name];
  if (value == null || String(value).trim() === "") {
    return fallback;
  }
  return value;
}

function nowIso() {
  return new Date().toISOString();
}

function verifyToken(email, token, secret) {
  if (!token || !email || !secret) return false;
  try {
    const [expiryStr, sigHex] = token.split(":");
    const expiry = Number.parseInt(expiryStr, 10);
    if (!Number.isInteger(expiry) || Date.now() > expiry) return false;
    const message = `${email.toLowerCase().trim()}:${expiry}`;
    const expectedSig = crypto
      .createHmac("sha256", secret)
      .update(message)
      .digest("hex");
    return crypto.timingSafeEqual(
      Buffer.from(sigHex, "hex"),
      Buffer.from(expectedSig, "hex"),
    );
  } catch {
    return false;
  }
}

function isNonEmptyString(value) {
  return typeof value === "string" && value.trim().length > 0;
}

function safeTrim(value) {
  if (value == null) {
    return "";
  }
  return String(value).trim();
}

function extractOptionValue(value) {
  if (value == null) {
    return undefined;
  }

  if (typeof value === "string" || typeof value === "number") {
    return safeTrim(value);
  }

  if (typeof value === "object") {
    const preferred = value.value ?? value.name ?? value.label ?? value.email;
    if (preferred == null) {
      return undefined;
    }

    return safeTrim(preferred);
  }

  return undefined;
}

export function normalizeEmail(value) {
  return safeTrim(value).toLowerCase();
}

export function toBoolean(value) {
  if (typeof value === "boolean") {
    return value;
  }

  if (typeof value === "number") {
    return value !== 0;
  }

  const normalized = safeTrim(value).toLowerCase();
  return ["true", "1", "yes", "y", "on"].includes(normalized);
}

export function parseStringList(value) {
  if (Array.isArray(value)) {
    return value
      .map((entry) => extractOptionValue(entry))
      .filter((entry) => typeof entry === "string" && entry.length > 0);
  }

  if (!isNonEmptyString(value)) {
    return [];
  }

  return value
    .split(",")
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0);
}

function parseNumber(value, fallback) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (isNonEmptyString(value)) {
    const parsed = Number.parseFloat(value);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }

  return fallback;
}

export function slugify(value) {
  return safeTrim(value)
    .toLowerCase()
    .replace(/['’]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");
}

export function parseWeightedTags(value, defaultWeight = 0.8) {
  if (value == null || value === "") {
    return undefined;
  }

  if (Array.isArray(value)) {
    return value
      .map((entry) => {
        if (typeof entry === "string") {
          const name = safeTrim(entry);
          return name ? { name, weight: defaultWeight } : null;
        }

        if (entry && typeof entry === "object") {
          const name = extractOptionValue(entry);
          if (!name) {
            return null;
          }

          return {
            name,
            weight: parseNumber(entry.weight, defaultWeight),
          };
        }

        return null;
      })
      .filter(Boolean);
  }

  const names = parseStringList(value);
  if (names.length === 0) {
    return undefined;
  }

  return names.map((name) => ({ name, weight: defaultWeight }));
}

export function removeUndefinedEntries(input) {
  return Object.fromEntries(
    Object.entries(input).filter(([, value]) => value !== undefined),
  );
}

function normalizeStoryBody(value) {
  if (!isNonEmptyString(value)) {
    return "";
  }

  return value.replace(/\r\n/g, "\n").trimEnd() + "\n";
}

export function slugIsAvailable(slug, existingFiles) {
  return !existingFiles.has(`${slug}.md`) && !existingFiles.has(`${slug}.mdx`);
}

function findStoryFileBySlug(slug, storiesDir = storiesDirectory) {
  const candidates = [
    path.join(storiesDir, `${slug}.md`),
    path.join(storiesDir, `${slug}.mdx`),
  ];

  return candidates.find((candidate) => fs.existsSync(candidate)) ?? null;
}

function coerceString(value) {
  const extracted = extractOptionValue(value);
  if (extracted != null) {
    return extracted.length > 0 ? extracted : undefined;
  }

  if (value == null) {
    return undefined;
  }

  const str = safeTrim(value);
  return str.length > 0 ? str : undefined;
}

export function coerceFileValue(value) {
  if (value == null) {
    return undefined;
  }

  // Backward-compat: plain string (legacy text field)
  if (typeof value === "string") {
    const trimmed = safeTrim(value);
    return trimmed.length > 0 ? trimmed : undefined;
  }

  // Baserow file field returns an array of file objects
  if (Array.isArray(value)) {
    if (value.length === 0) {
      return undefined;
    }
    const first = value[0];
    if (first && typeof first === "object") {
      // Prefer the original filename (name), fall back to URL
      return first.name ?? first.url ?? undefined;
    }
    return undefined;
  }

  // Single file object
  if (typeof value === "object") {
    return value.name ?? value.url ?? undefined;
  }

  return undefined;
}

export function coerceFileArray(value) {
  if (value == null) {
    return undefined;
  }

  // Baserow file field returns an array of file objects
  if (Array.isArray(value)) {
    const files = value
      .map((entry) => {
        if (entry && typeof entry === "object") {
          return entry.name ?? entry.url ?? null;
        }
        if (typeof entry === "string") {
          const trimmed = safeTrim(entry);
          return trimmed.length > 0 ? trimmed : null;
        }
        return null;
      })
      .filter(Boolean);
    return files.length > 0 ? files : undefined;
  }

  // Single file object
  if (typeof value === "object") {
    const name = value.name ?? value.url;
    return name ? [name] : undefined;
  }

  // Backward-compat: plain string (legacy text field)
  if (typeof value === "string") {
    const trimmed = safeTrim(value);
    return trimmed.length > 0 ? [trimmed] : undefined;
  }

  return undefined;
}

const IMAGE_EXTENSIONS = new Set([
  ".jpg",
  ".jpeg",
  ".png",
  ".gif",
  ".webp",
  ".svg",
  ".avif",
]);

function isImageFile(name) {
  if (!name) return false;
  const ext = path.extname(name).toLowerCase();
  return IMAGE_EXTENSIONS.has(ext);
}

/**
 * Like coerceFileArray but returns {name, url} objects for richer body rendering.
 */
function coerceFileObjects(value) {
  if (value == null) {
    return undefined;
  }

  if (Array.isArray(value)) {
    const files = value
      .map((entry) => {
        if (entry && typeof entry === "object") {
          const name = entry.name ?? entry.url ?? null;
          if (!name) return null;
          return { name, url: entry.url ?? name };
        }
        if (typeof entry === "string") {
          const trimmed = safeTrim(entry);
          return trimmed.length > 0 ? { name: trimmed, url: trimmed } : null;
        }
        return null;
      })
      .filter(Boolean);
    return files.length > 0 ? files : undefined;
  }

  if (typeof value === "object") {
    const name = value.name ?? value.url;
    return name ? [{ name, url: value.url ?? name }] : undefined;
  }

  return undefined;
}

function splitByImage(files) {
  const images = [];
  const others = [];
  for (const f of files) {
    if (isImageFile(f.name)) {
      images.push(f.name);
    } else {
      others.push(f.name);
    }
  }
  return {
    imageFiles: images.length > 0 ? images : undefined,
    attachmentFiles: others.length > 0 ? others : undefined,
  };
}

function buildArtistLinks(urlValue) {
  const url = coerceString(urlValue);
  if (!url) return undefined;
  let label;
  try {
    label = new URL(url).hostname.replace(/^www\./, "");
  } catch {
    label = url;
  }
  return [{ label, url }];
}

function buildStoryBody(files) {
  if (!files || files.length === 0) return "";
  return files
    .map((f) => {
      if (isImageFile(f.name)) {
        return `![${f.name}](${f.localPath ?? f.url})`;
      }
      return `- [${f.name}](${f.localPath ?? f.url})`;
    })
    .join("\n");
}

async function downloadAttachments(fileObjects, slug, config) {
  if (!fileObjects || fileObjects.length === 0) return fileObjects;

  const mediaRoot = path.join(repoRoot, "public", "media");

  const results = await Promise.all(
    fileObjects.map(async (f) => {
      if (!f.url || f.url === f.name) return f;

      const subdir = isImageFile(f.name) ? "images" : "files";
      const destDir = path.join(mediaRoot, subdir, slug);
      const destPath = path.join(destDir, f.name);

      try {
        if (!config.dryRun) {
          await fsp.mkdir(destDir, { recursive: true });

          // Only download if file doesn't already exist
          if (!fs.existsSync(destPath)) {
            const response = await fetch(f.url);
            if (!response.ok) {
              console.warn(`Failed to download ${f.name}: ${response.status}`);
              return f;
            }
            const buffer = Buffer.from(await response.arrayBuffer());
            await fsp.writeFile(destPath, buffer);
          }
        }

        return {
          ...f,
          localPath: `/media/${subdir}/${slug}/${f.name}`,
        };
      } catch (err) {
        console.warn(`Error downloading ${f.name}:`, err.message);
        return f;
      }
    }),
  );

  return results;
}

function setGithubOutput(name, value) {
  const outputPath = process.env.GITHUB_OUTPUT;
  if (!outputPath) {
    return;
  }

  fs.appendFileSync(outputPath, `${name}=${value}\n`, "utf8");
}

function parseTrustedEmails(raw) {
  return new Set(
    parseStringList(raw)
      .map((email) => normalizeEmail(email))
      .filter((email) => email.length > 0),
  );
}

function isValidTableId(value) {
  return Number.isInteger(value) && value > 0;
}

function getConfig() {
  return {
    baserowApiToken: env("BASEROW_API_TOKEN"),
    baserowApiUrl: env("BASEROW_API_URL", "https://api.baserow.io"),
    submissionsTableId: Number.parseInt(
      env("BASEROW_SUBMISSIONS_TABLE_ID", ""),
      10,
    ),
    storiesTableId: Number.parseInt(env("BASEROW_STORIES_TABLE_ID", ""), 10),
    auditTableId: Number.parseInt(env("BASEROW_AUDIT_TABLE_ID", ""), 10),
    trustedArtistEmails: parseTrustedEmails(env("TRUSTED_ARTIST_EMAILS")),
    maxSubmissionsPerEmail: Math.max(
      Number.parseInt(env("MAX_SUBMISSIONS_PER_EMAIL", "5"), 10) || 5,
      1,
    ),
    defaultConsentVersion: env("DEFAULT_CONSENT_VERSION", "v1"),
    requireConsentConfirmation: toBoolean(
      env("REQUIRE_CONSENT_CONFIRMATION", "true"),
    ),
    automationActor: env("AUTOMATION_ACTOR", "automation@echoes-from-afar"),
    dryRun: toBoolean(env("DRY_RUN", "false")),
    statusValues: {
      pending: env("SUBMISSION_STATUS_PENDING", "pending"),
      rejected: env("SUBMISSION_STATUS_REJECTED", "rejected"),
      prOpened: env("SUBMISSION_STATUS_PR_OPENED", "pr_opened"),
      queuedAutoPublish: env(
        "SUBMISSION_STATUS_QUEUED_AUTO",
        "queued_auto_publish",
      ),
      error: env("SUBMISSION_STATUS_ERROR", "error"),
    },
    submissionFields: {
      submissionId: env("FIELD_SUBMISSION_ID", "submission_id"),
      submissionType: env("FIELD_SUBMISSION_TYPE", "submission_type"),
      targetStoryId: env("FIELD_TARGET_STORY_ID", "target_story_id"),
      storyId: env("FIELD_STORY_ID", "story_id"),
      slogan: env("FIELD_SLOGAN", "slogan"),
      title: env("FIELD_TITLE", "title"),
      contributor: env("FIELD_AUTHOR", "author"),
      artistLink: env("FIELD_ARTIST_LINK", "artist_link"),
      date: env("FIELD_DATE", "date"),
      geography: env("FIELD_GEOGRAPHY", "geography"),
      attachments: env("FIELD_ATTACHMENTS", "attachments"),
      submitterEmail: env("FIELD_SUBMITTER_EMAIL", "submitter_email"),
      otpVerified: env("FIELD_OTP_VERIFIED", "otp_verified"),
      verificationToken: env("FIELD_VERIFICATION_TOKEN", "verification_token"),
      consentConfirmed: env("FIELD_CONSENT_CONFIRMED", "consent_confirmed"),
      consentVersion: env("FIELD_CONSENT_VERSION", "consent_version"),
      trustLevel: env("FIELD_TRUST_LEVEL", "trust_level"),
      status: env("FIELD_STATUS", "status"),
      decisionReason: env("FIELD_DECISION_REASON", "decision_reason"),
      riskFlags: env("FIELD_RISK_FLAGS", "risk_flags"),
      ownerEmails: env("FIELD_OWNER_EMAILS", "owner_emails"),
      coEditors: env("FIELD_CO_EDITORS", "co_editors"),
    },
    storyFields: {
      storyId: env("STORIES_FIELD_STORY_ID", "story_id"),
      slug: env("STORIES_FIELD_SLUG", "slug"),
      ownerEmails: env("STORIES_FIELD_OWNER_EMAILS", "owner_emails"),
      coEditors: env("STORIES_FIELD_CO_EDITORS", "co_editors"),
      consentVersion: env("STORIES_FIELD_CONSENT_VERSION", "consent_version"),
      status: env("STORIES_FIELD_STATUS", "status"),
    },
    auditFields: {
      submissionId: env("AUDIT_FIELD_SUBMISSION_ID", "submission_id"),
      decision: env("AUDIT_FIELD_DECISION", "decision"),
      reason: env("AUDIT_FIELD_REASON", "reason"),
      actor: env("AUDIT_FIELD_ACTOR", "actor"),
      timestamp: env("AUDIT_FIELD_TIMESTAMP", "timestamp"),
      riskFlags: env("AUDIT_FIELD_RISK_FLAGS", "risk_flags"),
    },
  };
}

export class BaserowClient {
  constructor({ apiToken, apiUrl }) {
    this.apiToken = apiToken;
    this.apiUrl = apiUrl.replace(/\/+$/, "");
  }

  async request(method, endpoint, { query = {}, body } = {}) {
    const url = new URL(`${this.apiUrl}${endpoint}`);

    for (const [key, value] of Object.entries(query)) {
      if (value != null && value !== "") {
        url.searchParams.set(key, String(value));
      }
    }

    const response = await fetch(url, {
      method,
      headers: {
        Authorization: `Token ${this.apiToken}`,
        "Content-Type": "application/json",
      },
      body: body ? JSON.stringify(body) : undefined,
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(
        `Baserow request failed (${method} ${endpoint}): ${response.status} ${text}`,
      );
    }

    if (response.status === 204) {
      return {};
    }

    return response.json();
  }

  async listRows(tableId) {
    const records = [];
    let page = 1;
    let next = true;

    while (next) {
      const response = await this.request(
        "GET",
        `/api/database/rows/table/${tableId}/`,
        {
          query: {
            user_field_names: "true",
            page,
            size: 200,
          },
        },
      );
      const pageRecords = response.results ?? [];
      records.push(...pageRecords);

      const totalCount =
        typeof response.count === "number" ? response.count : records.length;
      next = records.length < totalCount;
      page += 1;
    }

    return records;
  }

  async updateRows(tableId, updates) {
    if (updates.length === 0) {
      return;
    }

    for (const update of updates) {
      await this.request(
        "PATCH",
        `/api/database/rows/table/${tableId}/${update.id}/`,
        {
          query: {
            user_field_names: "true",
          },
          body: update.fields,
        },
      );
    }
  }

  async createRows(tableId, rows) {
    if (rows.length === 0) {
      return;
    }

    for (const row of rows) {
      const payload = row.fields ?? row;
      await this.request("POST", `/api/database/rows/table/${tableId}/`, {
        query: {
          user_field_names: "true",
        },
        body: payload,
      });
    }
  }
}

export function buildStoryIndex(records, config) {
  const byStoryId = new Map();
  const bySlug = new Map();

  for (const record of records) {
    const fields = record;
    const status = (
      extractOptionValue(fields[config.storyFields.status]) ?? ""
    ).toLowerCase();
    if (status === "archived") {
      continue;
    }

    const storyId = coerceString(fields[config.storyFields.storyId]);
    const slug = coerceString(fields[config.storyFields.slug]);

    if (storyId) {
      byStoryId.set(storyId, record);
    }

    if (slug) {
      bySlug.set(slug, record);
    }
  }

  return { byStoryId, bySlug };
}

export function getOwnerEmails(storyRecord, config) {
  const fields = storyRecord;
  const ownerEmails = parseStringList(
    fields[config.storyFields.ownerEmails],
  ).map((value) => normalizeEmail(value));
  const coEditors = parseStringList(fields[config.storyFields.coEditors]).map(
    (value) => normalizeEmail(value),
  );

  return Array.from(new Set([...ownerEmails, ...coEditors]));
}

export function isTrustedSubmission(submissionFields, submitterEmail, config) {
  if (config.trustedArtistEmails.has(submitterEmail)) {
    return true;
  }

  const trustLevel = (
    extractOptionValue(submissionFields[config.submissionFields.trustLevel]) ??
    ""
  ).toLowerCase();
  return trustLevel === "trusted";
}

export function buildMetadataPatch(submissionFields, config) {
  const fileObjects = coerceFileObjects(
    submissionFields[config.submissionFields.attachments],
  );
  const { imageFiles, attachmentFiles } = splitByImage(fileObjects ?? []);

  const patch = {
    title: coerceString(submissionFields[config.submissionFields.title]),
    contributor:
      coerceString(submissionFields[config.submissionFields.contributor]) ??
      coerceString(submissionFields["contributor"]),
    artistLinks: buildArtistLinks(
      submissionFields[config.submissionFields.artistLink],
    ),
    date: coerceString(submissionFields[config.submissionFields.date]),
    slogan: coerceString(submissionFields[config.submissionFields.slogan]),
    geography: parseWeightedTags(
      submissionFields[config.submissionFields.geography],
    ),
    imageFiles,
    attachments: attachmentFiles,
    consentVersion:
      coerceString(submissionFields[config.submissionFields.consentVersion]) ??
      undefined,
  };

  return removeUndefinedEntries(patch);
}

export function mergeFrontmatter(existingData, patch) {
  return {
    ...existingData,
    ...patch,
  };
}

async function writeIfChanged(filePath, nextContents, dryRun, deps = {}) {
  const existsSync = deps.existsSync ?? fs.existsSync;
  const writeFile = deps.writeFile ?? fsp.writeFile;
  let current = null;
  if (existsSync(filePath)) {
    const readFile = deps.readFile ?? fsp.readFile;
    current = await readFile(filePath, "utf8");
  }

  if (current === nextContents) {
    return false;
  }

  if (!dryRun) {
    await writeFile(filePath, nextContents, "utf8");
  }

  return true;
}

export function buildSubmissionUpdate(result, config) {
  const updateFields = {
    [config.submissionFields.status]: result.status,
    [config.submissionFields.decisionReason]: result.reason,
  };

  if (result.riskFlags.length > 0) {
    updateFields[config.submissionFields.riskFlags] =
      result.riskFlags.join(", ");
  }

  return {
    id: result.recordId,
    fields: updateFields,
  };
}

export function buildAuditRecord(result, config) {
  return {
    fields: {
      [config.auditFields.submissionId]: result.submissionId,
      [config.auditFields.decision]: result.status,
      [config.auditFields.reason]: result.reason,
      [config.auditFields.actor]: config.automationActor,
      [config.auditFields.timestamp]: nowIso(),
      [config.auditFields.riskFlags]: result.riskFlags.join(", "),
    },
  };
}

function acceptedStatusFromTrust(isTrusted, config) {
  return isTrusted
    ? config.statusValues.queuedAutoPublish
    : config.statusValues.prOpened;
}

function buildBranchName() {
  return `automation/submissions-${new Date()
    .toISOString()
    .replace(/[:.]/g, "-")}`;
}

function summarizeDecision(results) {
  const accepted = results.filter((result) => result.accepted).length;
  const rejected = results.filter((result) => !result.accepted).length;
  return `${accepted} accepted, ${rejected} rejected`;
}

export async function processUpdateSubmission({
  record,
  submissionFields,
  submitterEmail,
  storyIndex,
  config,
  context = {},
}) {
  const storiesDir = context.storiesDir ?? storiesDirectory;
  const deps = {
    existsSync: context.existsSync ?? fs.existsSync,
    readFile: context.readFile ?? fsp.readFile,
    writeFile: context.writeFile ?? fsp.writeFile,
  };
  const submissionId =
    coerceString(submissionFields[config.submissionFields.submissionId]) ??
    record.id;

  const targetStoryId =
    coerceString(submissionFields[config.submissionFields.targetStoryId]) ??
    coerceString(submissionFields[config.submissionFields.storyId]);

  const storyRecord = targetStoryId
    ? storyIndex.byStoryId.get(targetStoryId)
    : null;

  if (!storyRecord) {
    return {
      recordId: record.id,
      submissionId,
      accepted: false,
      status: config.statusValues.rejected,
      reason: "Story lookup failed: unknown story_id/slug",
      trusted: false,
      riskFlags: ["unknown_story"],
      changedFiles: 0,
    };
  }

  const allowedEmails = getOwnerEmails(storyRecord, config);
  if (allowedEmails.length === 0) {
    return {
      recordId: record.id,
      submissionId,
      accepted: false,
      status: config.statusValues.rejected,
      reason: "Owner validation failed: story has no owner_emails",
      trusted: false,
      riskFlags: ["missing_owner_registry"],
      changedFiles: 0,
    };
  }

  if (!allowedEmails.includes(submitterEmail)) {
    return {
      recordId: record.id,
      submissionId,
      accepted: false,
      status: config.statusValues.rejected,
      reason: "Owner validation failed: submitter is not the story owner",
      trusted: false,
      riskFlags: ["owner_email_mismatch"],
      changedFiles: 0,
    };
  }

  const storySlug =
    coerceString(storyRecord?.[config.storyFields.slug]) ?? targetSlug;

  if (!storySlug) {
    return {
      recordId: record.id,
      submissionId,
      accepted: false,
      status: config.statusValues.rejected,
      reason: "Story lookup failed: missing slug on canonical story record",
      trusted: false,
      riskFlags: ["missing_story_slug"],
      changedFiles: 0,
    };
  }

  const filePath = findStoryFileBySlug(storySlug, storiesDir);
  if (!filePath) {
    return {
      recordId: record.id,
      submissionId,
      accepted: false,
      status: config.statusValues.rejected,
      reason: `Story file not found for slug ${storySlug}`,
      trusted: false,
      riskFlags: ["missing_story_file"],
      changedFiles: 0,
    };
  }

  const existingRaw = await deps.readFile(filePath, "utf8");
  const parsed = matter(existingRaw);
  const fileObjects = coerceFileObjects(
    submissionFields[config.submissionFields.attachments],
  );
  const downloadedFiles = fileObjects?.length
    ? await downloadAttachments(fileObjects, storySlug, config)
    : fileObjects;
  const patch = buildMetadataPatch(submissionFields, config);
  const bodyPatch = downloadedFiles?.length
    ? buildStoryBody(downloadedFiles)
    : undefined;

  const canonicalStoryId =
    coerceString(storyRecord?.[config.storyFields.storyId]) ??
    targetStoryId ??
    storySlug;

  const mergedData = mergeFrontmatter(parsed.data ?? {}, {
    storyId: canonicalStoryId,
    ...patch,
  });
  const nextBody = bodyPatch
    ? normalizeStoryBody(bodyPatch)
    : normalizeStoryBody(parsed.content);
  const nextContentsWithoutConsent = matter.stringify(nextBody, mergedData);
  if (nextContentsWithoutConsent === existingRaw) {
    return {
      recordId: record.id,
      submissionId,
      accepted: false,
      status: config.statusValues.rejected,
      reason: "No changes detected in update submission",
      trusted: false,
      riskFlags: ["no_changes"],
      changedFiles: 0,
    };
  }

  const nextContents = matter.stringify(nextBody, {
    ...mergedData,
    consentConfirmedAt: nowIso(),
  });

  const changed = await writeIfChanged(
    filePath,
    nextContents,
    config.dryRun,
    deps,
  );
  if (!changed) {
    return {
      recordId: record.id,
      submissionId,
      accepted: false,
      status: config.statusValues.rejected,
      reason: "No changes detected in update submission",
      trusted: false,
      riskFlags: ["no_changes"],
      changedFiles: 0,
    };
  }

  const trusted = isTrustedSubmission(submissionFields, submitterEmail, config);
  return {
    recordId: record.id,
    submissionId,
    accepted: true,
    status: acceptedStatusFromTrust(trusted, config),
    reason: `Accepted update for slug ${storySlug}`,
    trusted,
    riskFlags: [],
    changedFiles: 1,
  };
}

export async function processNewSubmission({
  record,
  submissionFields,
  submitterEmail,
  config,
  context = {},
}) {
  const storiesDir = context.storiesDir ?? storiesDirectory;
  const deps = {
    existsSync: context.existsSync ?? fs.existsSync,
    readFile: context.readFile ?? fsp.readFile,
    writeFile: context.writeFile ?? fsp.writeFile,
  };

  const submissionId =
    coerceString(submissionFields[config.submissionFields.submissionId]) ??
    record.id;

  const title = coerceString(submissionFields[config.submissionFields.title]);
  const contributor =
    coerceString(submissionFields[config.submissionFields.contributor]) ??
    coerceString(submissionFields["contributor"]) ??
    "Anonymous";
  const slogan = coerceString(submissionFields[config.submissionFields.slogan]);
  const fileObjects = coerceFileObjects(
    submissionFields[config.submissionFields.attachments],
  );

  if (!title) {
    return {
      recordId: record.id,
      submissionId,
      accepted: false,
      status: config.statusValues.rejected,
      reason: "New story rejected: title is required",
      trusted: false,
      riskFlags: ["missing_required_fields"],
      changedFiles: 0,
    };
  }

  const slug = slugify(title);

  if (!slug) {
    return {
      recordId: record.id,
      submissionId,
      accepted: false,
      status: config.statusValues.rejected,
      reason: "New story rejected: unable to compute a valid slug",
      trusted: false,
      riskFlags: ["invalid_slug"],
      changedFiles: 0,
    };
  }

  const existingFiles = context.existingFiles;
  if (existingFiles) {
    if (!slugIsAvailable(slug, existingFiles)) {
      return {
        recordId: record.id,
        submissionId,
        accepted: false,
        status: config.statusValues.rejected,
        reason: `New story rejected: slug already exists (${slug})`,
        trusted: false,
        riskFlags: ["duplicate_slug"],
        changedFiles: 0,
      };
    }
  } else {
    const filePathCheck = path.join(storiesDir, `${slug}.md`);
    if (
      deps.existsSync(filePathCheck) ||
      deps.existsSync(path.join(storiesDir, `${slug}.mdx`))
    ) {
      return {
        recordId: record.id,
        submissionId,
        accepted: false,
        status: config.statusValues.rejected,
        reason: `New story rejected: slug already exists (${slug})`,
        trusted: false,
        riskFlags: ["duplicate_slug"],
        changedFiles: 0,
      };
    }
  }

  const filePath = path.join(storiesDir, `${slug}.md`);

  const storyId =
    coerceString(submissionFields[config.submissionFields.storyId]) ??
    `story-${slug}`;

  const geography = parseWeightedTags(
    submissionFields[config.submissionFields.geography],
  );

  const downloadedFiles = await downloadAttachments(fileObjects, slug, config);
  const { imageFiles, attachmentFiles } = splitByImage(downloadedFiles ?? []);

  const frontmatter = removeUndefinedEntries({
    storyId,
    title,
    contributor,
    artistLinks: buildArtistLinks(
      submissionFields[config.submissionFields.artistLink],
    ),
    date:
      coerceString(submissionFields[config.submissionFields.date]) ??
      nowIso().slice(0, 10),
    slogan,
    geography,
    imageFiles,
    attachments: attachmentFiles,
    consentVersion:
      coerceString(submissionFields[config.submissionFields.consentVersion]) ??
      config.defaultConsentVersion,
    consentConfirmedAt: nowIso(),
  });

  const body = buildStoryBody(downloadedFiles);
  const storyContents = matter.stringify(body, frontmatter);
  const changed = await writeIfChanged(
    filePath,
    storyContents,
    config.dryRun,
    deps,
  );

  if (!changed) {
    return {
      recordId: record.id,
      submissionId,
      accepted: false,
      status: config.statusValues.rejected,
      reason: "New story rejected: generated content produced no file changes",
      trusted: false,
      riskFlags: ["no_changes"],
      changedFiles: 0,
    };
  }

  const ownerEmails = parseStringList(
    submissionFields[config.submissionFields.ownerEmails],
  )
    .map((entry) => normalizeEmail(entry))
    .filter(Boolean);

  if (!ownerEmails.includes(submitterEmail)) {
    ownerEmails.push(submitterEmail);
  }

  const coEditors = parseStringList(
    submissionFields[config.submissionFields.coEditors],
  )
    .map((entry) => normalizeEmail(entry))
    .filter(Boolean)
    .filter((entry) => !ownerEmails.includes(entry));

  const trusted = isTrustedSubmission(submissionFields, submitterEmail, config);
  return {
    recordId: record.id,
    submissionId,
    accepted: true,
    status: acceptedStatusFromTrust(trusted, config),
    reason: `Accepted new story with slug ${slug}`,
    trusted,
    riskFlags: [],
    changedFiles: 1,
    storyRegistration: {
      fields: {
        [config.storyFields.storyId]: storyId,
        [config.storyFields.slug]: slug,
        [config.storyFields.ownerEmails]: ownerEmails.join(", "),
        [config.storyFields.coEditors]: coEditors.join(", "),
        [config.storyFields.status]: "active",
      },
    },
  };
}

/**
 * Validates a submission's gate checks (email, rate limit, OTP, consent).
 * Mutates `submissionsByEmail` to track per-email counts across a batch.
 * Returns `null` when all checks pass; otherwise returns a rejection result object.
 */
export function validateSubmission({
  recordId,
  submissionFields,
  submitterEmail,
  submissionType,
  submissionsByEmail,
  config,
}) {
  const submissionId =
    coerceString(submissionFields[config.submissionFields.submissionId]) ??
    recordId;

  if (!submitterEmail) {
    return {
      recordId,
      submissionId,
      accepted: false,
      status: config.statusValues.rejected,
      reason: "Rejected: submitter_email is required",
      trusted: false,
      riskFlags: ["missing_submitter_email"],
      changedFiles: 0,
    };
  }

  const currentCount = (submissionsByEmail.get(submitterEmail) ?? 0) + 1;
  submissionsByEmail.set(submitterEmail, currentCount);

  if (currentCount > config.maxSubmissionsPerEmail) {
    return {
      recordId,
      submissionId,
      accepted: false,
      status: config.statusValues.rejected,
      reason: `Rejected: rate limit exceeded (${config.maxSubmissionsPerEmail} per run)`,
      trusted: false,
      riskFlags: ["rate_limited"],
      changedFiles: 0,
    };
  }

  // Update submissions authenticate via owner email matching, not via
  // the /verify page flow — they bypass the verification token gate.
  if (submissionType !== "update") {
    const token =
      submissionFields[config.submissionFields.verificationToken] ?? "";
    if (
      !verifyToken(submitterEmail, String(token), env("BASEROW_API_TOKEN", ""))
    ) {
      return {
        recordId,
        submissionId,
        accepted: false,
        status: config.statusValues.rejected,
        reason: "Rejected: email verification required",
        trusted: false,
        riskFlags: ["email_not_verified"],
        changedFiles: 0,
      };
    }
  }

  if (
    config.requireConsentConfirmation &&
    !toBoolean(submissionFields[config.submissionFields.consentConfirmed])
  ) {
    return {
      recordId,
      submissionId,
      accepted: false,
      status: config.statusValues.rejected,
      reason: "Rejected: consent confirmation required",
      trusted: false,
      riskFlags: ["consent_not_confirmed"],
      changedFiles: 0,
    };
  }

  return null;
}

async function processSubmissionRecord({
  record,
  storyIndex,
  config,
  submissionsByEmail,
}) {
  const submissionFields = record;
  const submitterEmail = normalizeEmail(
    submissionFields[config.submissionFields.submitterEmail],
  );

  const submissionType = (
    extractOptionValue(
      submissionFields[config.submissionFields.submissionType],
    ) ?? ""
  ).toLowerCase();

  const validationResult = validateSubmission({
    recordId: record.id,
    submissionFields,
    submitterEmail,
    submissionType,
    submissionsByEmail,
    config,
  });

  if (validationResult !== null) {
    return validationResult;
  }

  const submissionId =
    coerceString(submissionFields[config.submissionFields.submissionId]) ??
    record.id;

  if (submissionType === "update") {
    return processUpdateSubmission({
      record,
      submissionFields,
      submitterEmail,
      storyIndex,
      config,
    });
  }

  if (submissionType === "new") {
    return processNewSubmission({
      record,
      submissionFields,
      submitterEmail,
      config,
    });
  }

  return {
    recordId: record.id,
    submissionId,
    accepted: false,
    status: config.statusValues.rejected,
    reason: `Rejected: unsupported submission_type '${submissionType || "(empty)"}'`,
    trusted: false,
    riskFlags: ["invalid_submission_type"],
    changedFiles: 0,
  };
}

export async function run() {
  const config = getConfig();

  if (!fs.existsSync(storiesDirectory)) {
    throw new Error(`Stories directory does not exist: ${storiesDirectory}`);
  }

  if (
    !config.baserowApiToken ||
    !isValidTableId(config.submissionsTableId) ||
    !isValidTableId(config.storiesTableId) ||
    !isValidTableId(config.auditTableId)
  ) {
    console.log(
      "Skipping submission processing because BASEROW_API_TOKEN or table IDs are not set.",
    );
    setGithubOutput("has_changes", "false");
    setGithubOutput("auto_merge_safe", "false");
    setGithubOutput("pr_title", "No pending artist submissions");
    setGithubOutput(
      "commit_message",
      "chore(content): no artist submission changes",
    );
    setGithubOutput("branch_name", buildBranchName());
    return;
  }

  const client = new BaserowClient({
    apiToken: config.baserowApiToken,
    apiUrl: config.baserowApiUrl,
  });

  const submissionRows = await client.listRows(config.submissionsTableId);
  console.log(`Found ${submissionRows.length} total rows in submissions table`);
  if (submissionRows.length > 0) {
    const sampleRow = submissionRows[0];
    console.log(
      "Sample row fields:",
      JSON.stringify(
        Object.keys(sampleRow).filter((k) => k !== "id" && k !== "order"),
        null,
        2,
      ),
    );
    const statusField = config.submissionFields.status;
    console.log(
      "Status values across rows:",
      submissionRows.map((r) => JSON.stringify(r[statusField])).join(", "),
    );
  }
  const pendingSubmissions = submissionRows.filter((row) => {
    const status = (
      extractOptionValue(row[config.submissionFields.status]) ?? ""
    ).toLowerCase();
    // Treat empty/missing status as pending (form submissions don't set status)
    return !status || status === config.statusValues.pending.toLowerCase();
  });

  if (pendingSubmissions.length === 0) {
    console.log("No pending submissions found.");
    setGithubOutput("has_changes", "false");
    setGithubOutput("auto_merge_safe", "false");
    setGithubOutput("pr_title", "No pending artist submissions");
    setGithubOutput(
      "commit_message",
      "chore(content): no artist submission changes",
    );
    setGithubOutput("branch_name", buildBranchName());
    return;
  }

  const storyRecords = await client.listRows(config.storiesTableId);
  const storyIndex = buildStoryIndex(storyRecords, config);
  const results = [];
  const submissionsByEmail = new Map();

  for (const record of pendingSubmissions) {
    try {
      const result = await processSubmissionRecord({
        record,
        storyIndex,
        config,
        submissionsByEmail,
      });
      results.push(result);
    } catch (error) {
      const submissionFields = record;
      const submissionId =
        coerceString(submissionFields[config.submissionFields.submissionId]) ??
        record.id;

      results.push({
        recordId: record.id,
        submissionId,
        accepted: false,
        status: config.statusValues.error,
        reason:
          error instanceof Error
            ? `Processing error: ${error.message}`
            : "Processing error",
        trusted: false,
        riskFlags: ["processing_error"],
        changedFiles: 0,
      });
    }
  }

  const storyRegistrations = results
    .filter((result) => result.accepted && result.storyRegistration)
    .map((result) => result.storyRegistration);

  if (!config.dryRun) {
    await client.updateRows(
      config.submissionsTableId,
      results.map((result) => buildSubmissionUpdate(result, config)),
    );

    await client.createRows(
      config.auditTableId,
      results.map((result) => buildAuditRecord(result, config)),
    );

    if (storyRegistrations.length > 0) {
      await client.createRows(config.storiesTableId, storyRegistrations);
    }
  }

  const accepted = results.filter((result) => result.accepted);
  const hasChanges = accepted.some((result) => result.changedFiles > 0);
  const autoMergeSafe =
    accepted.length > 0 && accepted.every((result) => result.trusted);

  const summary = summarizeDecision(results);
  const prTitle = `chore(content): process artist submissions (${summary})`;
  const commitMessage = `chore(content): process ${accepted.length} artist submissions`;

  console.log(`Submission processing complete: ${summary}`);
  setGithubOutput("has_changes", hasChanges ? "true" : "false");
  setGithubOutput("auto_merge_safe", autoMergeSafe ? "true" : "false");
  setGithubOutput("pr_title", prTitle);
  setGithubOutput("commit_message", commitMessage);
  setGithubOutput("branch_name", buildBranchName());
}

const isDirectExecution =
  process.argv[1] &&
  import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href;

if (isDirectExecution) {
  run().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}
