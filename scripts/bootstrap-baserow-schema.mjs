#!/usr/bin/env node

const API_URL = (
  process.env.BASEROW_API_URL ?? "https://api.baserow.io"
).replace(/\/+$/, "");
const WORKSPACE_ID = process.env.BASEROW_WORKSPACE_ID;
const WORKSPACE_NAME = process.env.BASEROW_WORKSPACE_NAME;
const DATABASE_NAME = process.env.BASEROW_DATABASE_NAME ?? "Echoes From Afar";
const BASEROW_JWT = process.env.BASEROW_JWT;
const BASEROW_EMAIL = process.env.BASEROW_EMAIL;
const BASEROW_PASSWORD = process.env.BASEROW_PASSWORD;

function required(name, value) {
  if (!value || String(value).trim() === "") {
    throw new Error(`Missing required env var: ${name}`);
  }
  return String(value).trim();
}

function normalizeJwt(value) {
  return value.replace(/^(jwt|bearer)\s+/i, "").trim();
}

async function request(path, { method = "GET", token, body } = {}) {
  const response = await fetch(`${API_URL}${path}`, {
    method,
    headers: {
      Authorization: `JWT ${token}`,
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`${method} ${path} failed: ${response.status} ${text}`);
  }

  if (response.status === 204) {
    return null;
  }

  return response.json();
}

async function getJwt() {
  if (BASEROW_JWT) {
    return normalizeJwt(BASEROW_JWT);
  }

  const email = required("BASEROW_EMAIL", BASEROW_EMAIL);
  const password = required("BASEROW_PASSWORD", BASEROW_PASSWORD);

  const response = await fetch(`${API_URL}/api/user/token-auth/`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ email, password }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Token auth failed: ${response.status} ${text}`);
  }

  const data = await response.json();
  if (!data.access_token) {
    throw new Error(
      "No access_token returned. If your account uses 2FA, provide BASEROW_JWT manually.",
    );
  }

  return data.access_token;
}

async function resolveWorkspaceId(token) {
  if (WORKSPACE_ID) {
    const parsed = Number.parseInt(WORKSPACE_ID, 10);
    if (!Number.isInteger(parsed) || parsed <= 0) {
      throw new Error("BASEROW_WORKSPACE_ID must be a positive integer.");
    }
    return parsed;
  }

  const workspaceName = required("BASEROW_WORKSPACE_NAME", WORKSPACE_NAME);
  const workspaces = await request("/api/workspaces/", { token });
  const matches = workspaces.filter(
    (workspace) => workspace.name === workspaceName,
  );

  if (matches.length === 0) {
    const available = workspaces
      .map((workspace) => `${workspace.id}:${workspace.name}`)
      .join(", ");
    throw new Error(
      `Workspace \"${workspaceName}\" not found. Available workspaces: ${available}`,
    );
  }

  if (matches.length > 1) {
    throw new Error(
      `Multiple workspaces named \"${workspaceName}\" found. Set BASEROW_WORKSPACE_ID instead.`,
    );
  }

  return matches[0].id;
}

async function createDatabase(token, workspaceId, name) {
  return request(`/api/applications/workspace/${workspaceId}/`, {
    method: "POST",
    token,
    body: {
      name,
      type: "database",
    },
  });
}

async function createTable(token, databaseId, name) {
  return request(`/api/database/tables/database/${databaseId}/`, {
    method: "POST",
    token,
    body: { name },
  });
}

async function createField(token, tableId, field) {
  return request(`/api/database/fields/table/${tableId}/`, {
    method: "POST",
    token,
    body: field,
  });
}

async function listFields(token, tableId) {
  return request(`/api/database/fields/table/${tableId}/`, {
    method: "GET",
    token,
  });
}

async function changePrimaryField(token, tableId, newPrimaryFieldId) {
  return request(
    `/api/database/fields/table/${tableId}/change-primary-field/`,
    {
      method: "POST",
      token,
      body: { new_primary_field_id: newPrimaryFieldId },
    },
  );
}

async function deleteField(token, fieldId) {
  return request(`/api/database/fields/${fieldId}/`, {
    method: "DELETE",
    token,
  });
}

async function switchPrimaryField(token, tableId, desiredPrimaryFieldId) {
  const fields = await listFields(token, tableId);
  const currentPrimary = fields.find((field) => field.primary);

  if (!currentPrimary) {
    throw new Error(`No primary field found for table ${tableId}`);
  }

  if (currentPrimary.id === desiredPrimaryFieldId) {
    return;
  }

  await changePrimaryField(token, tableId, desiredPrimaryFieldId);
  await deleteField(token, currentPrimary.id);
}

const COLOR_CYCLE = [
  "blue",
  "green",
  "yellow",
  "orange",
  "red",
  "purple",
  "brown",
];

function toSelectOptions(values) {
  return values.map((value, index) => ({
    value,
    color: COLOR_CYCLE[index % COLOR_CYCLE.length],
  }));
}

async function createStoriesFields(token, tableId) {
  const storyIdField = await createField(token, tableId, {
    name: "story_id",
    type: "text",
  });
  await createField(token, tableId, { name: "slug", type: "text" });
  await createField(token, tableId, {
    name: "owner_emails",
    type: "long_text",
  });
  await createField(token, tableId, { name: "co_editors", type: "long_text" });
  await createField(token, tableId, {
    name: "consent_version",
    type: "text",
  });
  await createField(token, tableId, {
    name: "status",
    type: "single_select",
    select_options: toSelectOptions(["active", "archived"]),
  });

  return storyIdField.id;
}

async function createSubmissionsFields(token, tableId) {
  const submissionIdField = await createField(token, tableId, {
    name: "submission_id",
    type: "text",
  });
  await createField(token, tableId, {
    name: "submission_type",
    type: "single_select",
    select_options: toSelectOptions(["new", "update"]),
  });
  await createField(token, tableId, { name: "target_story_id", type: "text" });
  await createField(token, tableId, { name: "story_id", type: "text" });
  await createField(token, tableId, { name: "slogan", type: "text" });
  await createField(token, tableId, { name: "title", type: "text" });
  await createField(token, tableId, { name: "author", type: "text" });
  await createField(token, tableId, { name: "social_link", type: "url" });
  await createField(token, tableId, {
    name: "date",
    type: "date",
    date_format: "ISO",
  });
  await createField(token, tableId, { name: "geography", type: "long_text" });
  await createField(token, tableId, { name: "attachments", type: "file" });
  await createField(token, tableId, { name: "submitter_email", type: "email" });
  await createField(token, tableId, {
    name: "otp_verified",
    type: "boolean",
    boolean_default: false,
  });
  await createField(token, tableId, { name: "otp_code", type: "text" });
  await createField(token, tableId, {
    name: "otp_expires_at",
    type: "text",
  });
  await createField(token, tableId, {
    name: "verification_token",
    type: "text",
  });
  await createField(token, tableId, {
    name: "consent_confirmed",
    type: "boolean",
    boolean_default: false,
  });
  await createField(token, tableId, {
    name: "consent_version",
    type: "text",
  });
  await createField(token, tableId, {
    name: "trust_level",
    type: "single_select",
    select_options: toSelectOptions(["standard", "trusted"]),
  });
  await createField(token, tableId, {
    name: "status",
    type: "single_select",
    select_options: toSelectOptions([
      "pending",
      "rejected",
      "pr_opened",
      "queued_auto_publish",
      "error",
    ]),
  });
  await createField(token, tableId, {
    name: "decision_reason",
    type: "long_text",
  });
  await createField(token, tableId, { name: "risk_flags", type: "long_text" });
  await createField(token, tableId, {
    name: "owner_emails",
    type: "long_text",
  });
  await createField(token, tableId, { name: "co_editors", type: "long_text" });

  return submissionIdField.id;
}

async function createAuditLogFields(token, tableId) {
  const submissionIdField = await createField(token, tableId, {
    name: "submission_id",
    type: "text",
  });
  await createField(token, tableId, { name: "decision", type: "text" });
  await createField(token, tableId, { name: "reason", type: "long_text" });
  await createField(token, tableId, { name: "actor", type: "text" });
  await createField(token, tableId, {
    name: "timestamp",
    type: "date",
    date_format: "ISO",
    date_include_time: true,
    date_time_format: "24",
  });
  await createField(token, tableId, { name: "risk_flags", type: "long_text" });

  return submissionIdField.id;
}

async function main() {
  const token = await getJwt();
  const workspaceId = await resolveWorkspaceId(token);

  const database = await createDatabase(token, workspaceId, DATABASE_NAME);
  const databaseId = database.id;

  const storiesTable = await createTable(token, databaseId, "Stories");
  const submissionsTable = await createTable(token, databaseId, "Submissions");
  const auditLogTable = await createTable(token, databaseId, "AuditLog");

  const storiesPrimaryFieldId = await createStoriesFields(
    token,
    storiesTable.id,
  );
  const submissionsPrimaryFieldId = await createSubmissionsFields(
    token,
    submissionsTable.id,
  );
  const auditLogPrimaryFieldId = await createAuditLogFields(
    token,
    auditLogTable.id,
  );

  await switchPrimaryField(token, storiesTable.id, storiesPrimaryFieldId);
  await switchPrimaryField(
    token,
    submissionsTable.id,
    submissionsPrimaryFieldId,
  );
  await switchPrimaryField(token, auditLogTable.id, auditLogPrimaryFieldId);

  const output = {
    workspaceId,
    databaseId,
    tables: {
      stories: storiesTable.id,
      submissions: submissionsTable.id,
      auditLog: auditLogTable.id,
    },
  };

  console.log("Created Baserow schema:");
  console.log(JSON.stringify(output, null, 2));

  console.log("\nSet these GitHub repository variables:");
  console.log(`BASEROW_SUBMISSIONS_TABLE_ID=${submissionsTable.id}`);
  console.log(`BASEROW_STORIES_TABLE_ID=${storiesTable.id}`);
  console.log(`BASEROW_AUDIT_TABLE_ID=${auditLogTable.id}`);
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
