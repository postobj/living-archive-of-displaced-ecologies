# Artist Submission Pipeline (Baserow Form)

This pipeline lets artists submit and update stories without using GitHub directly, while protecting ownership and keeping maintainer effort low.

For governance decisions around visibility, consent, and moderation review, see [care-centered-governance.md](./care-centered-governance.md).

## Architecture

- Artist submits via **Baserow Form**.
- Submission lands in Baserow `Submissions` table.
- Baserow automation/webhook triggers GitHub `repository_dispatch` (`artist_submission`) or maintainers run workflow manually.
- GitHub workflow runs `scripts/process-baserow-submissions.mjs`.
- Script validates OTP + owner email match, updates `content/stories/*.md`, and either:
  - pushes directly to `main` for trusted submissions, or
  - opens a PR for review.
- Cloudflare Pages deploys from GitHub automatically.

## Security Model

- OTP must be verified (`otp_verified=true`) before processing.
- Consent must be confirmed (`consent_confirmed=true`) before processing.
- Submitter email must match `owner_emails` or `co_editors` in canonical `Stories` records.
- Rate limit protects against spam bursts (`MAX_SUBMISSIONS_PER_EMAIL`, default `5` per workflow run).
- Every decision is logged in `AuditLog` for rollback/auditability.

## Required Baserow Tables

### 1) `Stories`

Required fields (recommended names):

- `story_id` (text, immutable id)
- `slug` (text, markdown filename without extension)
- `owner_emails` (multi-value text)
- `co_editors` (multi-value text, optional)
- `visibility` (`public`, `community`, or `private`, optional)
- `consent_version` (text, optional)
- `status` (`active` or `archived`)

### 2) `Submissions`

Required fields (recommended names):

- `submission_id`
- `submission_type` (`new` or `update`)
- `target_story_id` (required for updates)
- `story_id` (optional for new submissions)
- `slug` (optional)
- `title`
- `contributor`
- `date`
- `excerpt`
- `themes`
- `emotions`
- `textures`
- `temporality`
- `geography`
- `audio_file`
- `image_file`
- `content_markdown`
- `submitter_email`
- `otp_verified` (boolean)
- `consent_confirmed` (boolean)
- `consent_version` (optional text; default supported)
- `visibility` (`public`, `community`, or `private`)
- `trust_level` (`trusted` or `standard`)
- `status` (starts as `pending`)
- `decision_reason`
- `risk_flags`
- `owner_emails` (optional for new story ownership registration)
- `co_editors` (optional)

### 3) `AuditLog`

Required fields (recommended names):

- `submission_id`
- `decision`
- `reason`
- `actor`
- `timestamp`
- `risk_flags`

## Bootstrap Schema via Node Script

To create the database and required tables/fields automatically:

```bash
npm run bootstrap:baserow
```

Script file:

- `scripts/bootstrap-baserow-schema.mjs`

Required environment variables:

- `BASEROW_EMAIL` and `BASEROW_PASSWORD` (or `BASEROW_JWT`)
- `BASEROW_WORKSPACE_ID` (preferred) or `BASEROW_WORKSPACE_NAME`

Optional:

- `BASEROW_API_URL` (default `https://api.baserow.io`)
- `BASEROW_DATABASE_NAME` (default `Echoes From Afar`)

On success, the script prints:

- `BASEROW_SUBMISSIONS_TABLE_ID`
- `BASEROW_STORIES_TABLE_ID`
- `BASEROW_AUDIT_TABLE_ID`

Copy these into your GitHub repository variables.

## Baserow Form Notes

Use one form (or separate new/update forms) with `submission_type` and required IDs.

Recommended update form fields:

- `submission_type=update`
- `target_story_id`
- `content_markdown` and editable metadata fields
- `submitter_email`
- `otp_verified`
- `consent_confirmed`
- `consent_version` (optional)
- `visibility` (optional override)

For best UX, use prefilled links from the story page:

- Set `NEXT_PUBLIC_STORY_UPDATE_FORM_URL`
- Story page appends Baserow prefill params automatically (`prefill_story_id`, `prefill_slug`).

## Form Setup via Code

If the form page is empty, run this one-time setup script to create missing fields and configure a public form view:

```bash
BASEROW_JWT=... \
BASEROW_SUBMISSIONS_TABLE_ID=... \
BASEROW_STORIES_TABLE_ID=... \
BASEROW_AUDIT_TABLE_ID=... \
npm run setup:baserow-form
```

Script file:

- `scripts/setup-baserow-form.mjs`

What it does:

- ensures required fields exist in `Submissions`, `Stories`, and `AuditLog`
- creates or updates the `Artist Story Submission` form view on `Submissions`
- enables artist-facing fields and hides internal automation fields
- prints the final public form URL

Dry run:

```bash
DRY_RUN=true BASEROW_JWT=... BASEROW_SUBMISSIONS_TABLE_ID=... npm run setup:baserow-form
```

Auth note:

- For this setup script, Baserow view APIs require user auth (`BASEROW_JWT` or `BASEROW_EMAIL` + `BASEROW_PASSWORD`).
- A database token (`BASEROW_API_TOKEN`) is not enough to create/update form views.

## GitHub Setup

### Secrets

Add repository secrets:

- `BASEROW_API_TOKEN`

### Variables

Add repository variables:

- `BASEROW_API_URL` (optional, default `https://api.baserow.io`)
- `BASEROW_SUBMISSIONS_TABLE_ID`
- `BASEROW_STORIES_TABLE_ID`
- `BASEROW_AUDIT_TABLE_ID`

Optional policy/schema variables:

- `TRUSTED_ARTIST_EMAILS` (comma-separated)
- `MAX_SUBMISSIONS_PER_EMAIL` (default `5`)
- `DEFAULT_THEME` (default `community`)
- `DEFAULT_VISIBILITY` (default `community`)
- `DEFAULT_CONSENT_VERSION` (default `v1`)
- `REQUIRE_CONSENT_CONFIRMATION` (default `true`)
- `SUBMISSION_STATUS_PENDING` (default `pending`)
- `SUBMISSION_STATUS_REJECTED` (default `rejected`)
- `SUBMISSION_STATUS_PR_OPENED` (default `pr_opened`)
- `SUBMISSION_STATUS_QUEUED_AUTO` (default `queued_auto_publish`)
- `SUBMISSION_STATUS_ERROR` (default `error`)

Field mapping variables are supported when your column names differ:

- `FIELD_*`, `STORIES_FIELD_*`, `AUDIT_FIELD_*`

Workflow file:

- `.github/workflows/process-artist-submissions.yml`

## Story File Behavior

Processor writes markdown files under `content/stories/`.

- New submissions create `<slug>.md`.
- Update submissions patch frontmatter and optionally replace body.
- `storyId` is persisted in frontmatter for stable mapping.
- `visibility`, `consentVersion`, and `consentConfirmedAt` are written to frontmatter for consent-aware publishing.

## Manual Run

Run workflow manually from GitHub Actions:

- `Process Artist Submissions` -> `Run workflow`

Run locally:

```bash
npm run process:submissions
```

Dry run:

```bash
DRY_RUN=true npm run process:submissions
```

## Decision Outcomes

- Reject if OTP not verified.
- Reject if consent is not confirmed.
- Reject if owner email mismatch.
- Reject if unknown story id/slug.
- Reject if rate-limited.
- Accept trusted submissions for direct publish.
- Accept untrusted submissions for PR review.
