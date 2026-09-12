function env(name, fallback = "") {
  const value = process.env[name];
  if (value == null || String(value).trim() === "") {
    return fallback;
  }
  return String(value).trim();
}

const SITE_NAME = env("SITE_NAME", "Echoes from Afar");
const CONTACT_EMAIL = env("CONTACT_EMAIL");

const FORM_TITLE = "Share or Update Your Story";
const FORM_DESCRIPTION = `${SITE_NAME} is a community archive of personal stories. Anyone is welcome to share their work here.

New story? Choose "new" for submission_type, then fill in your title, name, and story below. Updating an existing story? Choose "update" and provide the Story ID — or even easier, click "Update this story" on the website and those details fill in for you.

A few things to keep in mind:
• Please verify your email through the verification page on the website before submitting. You'll be redirected back here with your email pre-filled — then just fill in your story and submit.
• Upload your story as a file (PDF, Word document, images, or audio) using the Attachments field above.
• After submitting, our editors will review your work. Trusted authors go straight to the archive.
• Make sure you have the author's permission before submitting on their behalf.

Questions? Reach us through the contact form on the About page${CONTACT_EMAIL ? `, or email ${CONTACT_EMAIL}` : ""}. Thank you for sharing your story.`;
const FORM_SUBMIT_MESSAGE =
  "Thank you. Your submission has been received and will be processed by our editors. Accepted works typically go live within one week.";

function parseIntEnv(name) {
  const raw = env(name, "");
  if (!raw) {
    return null;
  }
  const parsed = Number.parseInt(raw, 10);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

function parseBooleanEnv(name, fallback = false) {
  const raw = env(name, String(fallback));
  const normalized = raw.toLowerCase();
  return ["1", "true", "yes", "y", "on"].includes(normalized);
}

function requiredEnvInt(name) {
  const value = parseIntEnv(name);
  if (!value) {
    throw new Error(`${name} is required and must be a positive integer.`);
  }
  return value;
}

function getConfig() {
  const apiUrl = env("BASEROW_API_URL", "https://api.baserow.io").replace(
    /\/+$/,
    "",
  );

  return {
    apiToken: env("BASEROW_API_TOKEN"),
    jwtToken: env("BASEROW_JWT"),
    email: env("BASEROW_EMAIL"),
    password: env("BASEROW_PASSWORD"),
    apiUrl,
    publicBaseUrl: env(
      "BASEROW_PUBLIC_BASE_URL",
      apiUrl.includes("api.baserow.io")
        ? "https://baserow.io"
        : apiUrl.replace(/\/api$/, ""),
    ).replace(/\/+$/, ""),
    submissionsTableId: requiredEnvInt("BASEROW_SUBMISSIONS_TABLE_ID"),
    storiesTableId: parseIntEnv("BASEROW_STORIES_TABLE_ID"),
    auditTableId: parseIntEnv("BASEROW_AUDIT_TABLE_ID"),
    dryRun: parseBooleanEnv("DRY_RUN", false),
  };
}

class BaserowClient {
  constructor({ authHeader, apiUrl, dryRun }) {
    if (!authHeader) {
      throw new Error(
        "Auth is required. Provide BASEROW_JWT or BASEROW_EMAIL/BASEROW_PASSWORD.",
      );
    }

    this.authHeader = authHeader;
    this.apiUrl = apiUrl;
    this.dryRun = dryRun;
  }

  async request(method, endpoint, { query = {}, body } = {}) {
    const url = new URL(`${this.apiUrl}${endpoint}`);
    for (const [key, value] of Object.entries(query)) {
      if (value != null && value !== "") {
        url.searchParams.set(key, String(value));
      }
    }

    if (this.dryRun && method !== "GET") {
      console.log(`[dry-run] ${method} ${url.pathname}`, body ?? "");
      return {};
    }

    const response = await fetch(url, {
      method,
      headers: {
        Authorization: this.authHeader,
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

  listFields(tableId) {
    return this.request("GET", `/api/database/fields/table/${tableId}/`);
  }

  createField(tableId, body) {
    return this.request("POST", `/api/database/fields/table/${tableId}/`, {
      body,
    });
  }

  listViews(tableId) {
    return this.request("GET", `/api/database/views/table/${tableId}/`);
  }

  createView(tableId, body) {
    return this.request("POST", `/api/database/views/table/${tableId}/`, {
      body,
    });
  }

  updateView(viewId, body) {
    return this.request("PATCH", `/api/database/views/${viewId}/`, { body });
  }

  updateViewFieldOptions(viewId, body) {
    return this.request(
      "PATCH",
      `/api/database/views/${viewId}/field-options/`,
      { body },
    );
  }

  updateField(fieldId, body) {
    return this.request("PATCH", `/api/database/fields/${fieldId}/`, { body });
  }
}

function normalizeJwtToken(value) {
  return value.replace(/^(jwt|bearer)\s+/i, "").trim();
}

async function resolveAuthHeader(config) {
  if (config.jwtToken) {
    return `JWT ${normalizeJwtToken(config.jwtToken)}`;
  }

  if (config.email && config.password) {
    const response = await fetch(`${config.apiUrl}/api/user/token-auth/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: config.email,
        password: config.password,
      }),
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Token auth failed: ${response.status} ${text}`);
    }

    const data = await response.json();
    if (!data.access_token) {
      throw new Error(
        "Token auth succeeded but no access_token returned. Use BASEROW_JWT.",
      );
    }

    return `JWT ${data.access_token}`;
  }

  if (config.apiToken) {
    throw new Error(
      "BASEROW_API_TOKEN alone cannot configure views/forms. Use BASEROW_JWT or BASEROW_EMAIL/BASEROW_PASSWORD.",
    );
  }

  throw new Error(
    "Missing auth. Provide BASEROW_JWT or BASEROW_EMAIL/BASEROW_PASSWORD.",
  );
}

function colorForOption(index) {
  const colors = ["blue", "green", "orange", "red", "purple", "yellow"];
  return colors[index % colors.length];
}

function makeSelectOptions(values) {
  return values.map((value, index) => ({
    value,
    color: colorForOption(index),
  }));
}

function normalizeName(value) {
  return value.trim().toLowerCase();
}

function fieldSpec(name, type, extra = {}) {
  return { name, type, ...extra };
}

const submissionsFieldSpecs = [
  fieldSpec("submission_id", "text"),
  fieldSpec("submission_type", "single_select", {
    select_options: makeSelectOptions(["new", "update"]),
  }),
  fieldSpec("target_story_id", "text"),
  fieldSpec("story_id", "text"),
  fieldSpec("slogan", "text"),
  fieldSpec("title", "text"),
  fieldSpec("author", "text"),
  fieldSpec("social_link", "url"),
  fieldSpec("date", "text"),
  fieldSpec("geography", "long_text"),
  fieldSpec("attachments", "file"),
  fieldSpec("submitter_email", "email"),
  fieldSpec("otp_verified", "boolean", { boolean_default: false }),
  fieldSpec("otp_code", "text"),
  fieldSpec("otp_expires_at", "text"),
  fieldSpec("verification_token", "text"),
  fieldSpec("consent_confirmed", "boolean", { boolean_default: false }),
  fieldSpec("consent_version", "text"),
  fieldSpec("trust_level", "single_select", {
    select_options: makeSelectOptions(["trusted", "standard"]),
  }),
  fieldSpec("status", "single_select", {
    select_options: makeSelectOptions([
      "pending",
      "rejected",
      "pr_opened",
      "queued_auto_publish",
      "error",
    ]),
  }),
  fieldSpec("decision_reason", "long_text"),
  fieldSpec("risk_flags", "long_text"),
  fieldSpec("owner_emails", "long_text"),
  fieldSpec("co_editors", "long_text"),
];

const storiesFieldSpecs = [
  fieldSpec("story_id", "text"),
  fieldSpec("slug", "text"),
  fieldSpec("owner_emails", "long_text"),
  fieldSpec("co_editors", "long_text"),
  fieldSpec("consent_version", "text"),
  fieldSpec("status", "single_select", {
    select_options: makeSelectOptions(["active", "archived"]),
  }),
];

const auditFieldSpecs = [
  fieldSpec("submission_id", "text"),
  fieldSpec("decision", "text"),
  fieldSpec("reason", "long_text"),
  fieldSpec("actor", "text"),
  fieldSpec("timestamp", "text"),
  fieldSpec("risk_flags", "long_text"),
];

async function ensureFields(client, tableId, specs, tableLabel) {
  const existing = await client.listFields(tableId);
  const byName = new Map(
    existing.map((field) => [normalizeName(field.name), field]),
  );

  for (const spec of specs) {
    const key = normalizeName(spec.name);
    const existingField = byName.get(key);

    if (!existingField) {
      const created = await client.createField(tableId, spec);
      if (created?.name) {
        byName.set(key, created);
      }
      console.log(`Created ${tableLabel} field: ${spec.name}`);
      continue;
    }

    if (existingField.type !== spec.type) {
      console.log(
        `Migrating ${tableLabel} field "${spec.name}" from ${existingField.type} to ${spec.type}`,
      );
      const updated = await client.updateField(existingField.id, {
        type: spec.type,
      });
      if (updated?.name) {
        byName.set(key, updated);
      }
    }
  }

  const refreshed = await client.listFields(tableId);
  return new Map(refreshed.map((field) => [normalizeName(field.name), field]));
}

async function ensureFormView(client, tableId) {
  const desiredName = "Artist Story Submission";
  const views = await client.listViews(tableId);

  let formView = views.find(
    (view) =>
      view.type === "form" &&
      normalizeName(view.name) === normalizeName(desiredName),
  );

  if (!formView) {
    formView = views.find((view) => view.type === "form");
  }

  if (!formView) {
    formView = await client.createView(tableId, {
      name: desiredName,
      type: "form",
      public: true,
      title: FORM_TITLE,
      description: FORM_DESCRIPTION,
      submit_text: "Submit story",
      submit_action: "MESSAGE",
      submit_action_message: FORM_SUBMIT_MESSAGE,
      mode: "form",
    });
    console.log(`Created form view: ${desiredName}`);
  }

  const updated = await client.updateView(formView.id, {
    public: true,
    title: FORM_TITLE,
    description: FORM_DESCRIPTION,
    submit_text: "Submit story",
    submit_action: "MESSAGE",
    submit_action_message: FORM_SUBMIT_MESSAGE,
    mode: "form",
  });

  return updated?.id ? updated : formView;
}

function buildFormFieldOptions(fieldMap) {
  const enabledOrder = [
    "submission_type",
    "target_story_id",
    "title",
    "slogan",
    "author",
    "social_link",
    "date",
    "geography",
    "attachments",
    "submitter_email",
    "consent_confirmed",
    "consent_version",
    "owner_emails",
    "co_editors",
    "verification_token",
  ];

  const required = new Set([
    "submission_type",
    "submitter_email",
    "consent_confirmed",
  ]);

  const descriptions = {
    submission_type:
      'Choose "new" if you are contributing a brand new story, or "update" if you are editing an existing one.',
    target_story_id:
      "Required for updates. This is pre-filled automatically when you use the Update this story link on a story page.",
    title:
      "The story title as it will appear in the archive. Required for new stories.",
    slogan:
      "One sentence that appears on the main page of the website, serving as the portal to your work pages. Auto-generated from the title if left empty.",
    author:
      "Name of the person who created this work. Displayed publicly alongside the story.",
    social_link:
      "Optional. A link to your personal website, portfolio, or social media profile.",
    date: "When the story was created or first told. Use any readable format (e.g. May 2026, 2026-05, or Spring 2026).",
    geography:
      "Geographic regions or places referenced (e.g. east-asia, latin-america, global).",
    attachments:
      "Optional. Upload files that accompany your story — images, audio recordings, PDFs, or Word documents. You can upload multiple files at once.",
    submitter_email:
      "Your email address. Required — used for ownership verification and communication. For updates, must match the registered owner or co-editor email.",
    otp_verified:
      "Required. Check this box after your one-time verification code is confirmed.",
    consent_confirmed:
      "Required. Check to confirm the story contributor has agreed to having their work published in the archive.",
    consent_version:
      "Optional. Policy version label (e.g. v1, 2026-03) — tracks which terms the contributor agreed to.",
    owner_emails:
      "Comma-separated email addresses of the story owner(s). The editorial team may contact owners for verification.",
    co_editors:
      "Optional. Comma-separated email addresses of co-editors who are also allowed to update this story.",
    verification_token:
      "Automatically filled during email verification. Do not edit.",
  };

  const enabledSet = new Set(enabledOrder);
  const fieldOptions = {};
  const byName = new Map(
    Array.from(fieldMap.values()).map((field) => [
      normalizeName(field.name),
      field,
    ]),
  );
  const seen = new Set();
  const orderedFields = [];

  for (const name of enabledOrder) {
    const field = byName.get(name);
    if (!field) {
      continue;
    }
    orderedFields.push(field);
    seen.add(field.id);
  }

  for (const field of fieldMap.values()) {
    if (seen.has(field.id)) {
      continue;
    }
    orderedFields.push(field);
  }

  orderedFields.forEach((field, index) => {
    const key = normalizeName(field.name);

    fieldOptions[String(field.id)] = {
      enabled: enabledSet.has(key),
      required: required.has(key),
      order: index + 1,
      description: descriptions[key] ?? "",
    };
  });

  return { field_options: fieldOptions };
}

async function main() {
  const config = getConfig();
  const authHeader = await resolveAuthHeader(config);
  const client = new BaserowClient({
    authHeader,
    apiUrl: config.apiUrl,
    dryRun: config.dryRun,
  });

  const submissionsFields = await ensureFields(
    client,
    config.submissionsTableId,
    submissionsFieldSpecs,
    "submissions",
  );

  if (config.storiesTableId) {
    await ensureFields(
      client,
      config.storiesTableId,
      storiesFieldSpecs,
      "stories",
    );
  }

  if (config.auditTableId) {
    await ensureFields(client, config.auditTableId, auditFieldSpecs, "audit");
  }

  const formView = await ensureFormView(client, config.submissionsTableId);
  const fieldOptionsPayload = buildFormFieldOptions(submissionsFields);
  await client.updateViewFieldOptions(formView.id, fieldOptionsPayload);

  const slug = formView.slug;
  const formUrl = slug
    ? `${config.publicBaseUrl}/form/${slug}`
    : "(slug unavailable from API response)";

  console.log("\nBaserow form setup complete.");
  console.log(`Submissions table ID: ${config.submissionsTableId}`);
  console.log(`Form view ID: ${formView.id}`);
  console.log(`Form URL: ${formUrl}`);
  console.log("\nSet this in Cloudflare Pages (optional override):");
  console.log(`NEXT_PUBLIC_STORY_UPDATE_FORM_URL=${formUrl}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
