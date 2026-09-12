# Care-Centered Governance and Moderation

This document defines the initial governance operations for moderation, visibility, and consent in Echoes from Afar.

## Objectives

- Preserve author agency and narrative complexity.
- Prevent flattening, stereotyping, and harmful framing.
- Enforce explicit consent and clear ownership for every submission.

## Visibility Policy

Stories support three visibility levels:

- `public`: visible in the public archive and story routes.
- `community`: visible in the public archive and story routes, scoped by community context.
- `private`: not rendered in public archive or public story routes.

Implementation note:

- Public content loaders exclude `visibility: private` by default (`lib/content.ts`).
- Private stories are not included in static params for public story pages.

## Consent Operations

Consent requirements for form submissions:

- OTP verification must pass.
- Consent confirmation must be true.
- Consent version is captured and written to story metadata.
- Consent timestamp (`consentConfirmedAt`) is written on acceptance.

These checks are enforced in `scripts/process-baserow-submissions.mjs` and documented in `docs/artist-submission-pipeline.md`.

## Ownership and Moderation Controls

Submission acceptance requires:

- submitter email is present
- owner/co-editor validation for updates
- rate-limit checks
- valid slug and story reference checks

Risk outcomes are recorded in `risk_flags` and copied into `AuditLog` for review.

## Moderation Workflow

1. Submission enters `pending`.
2. Processor validates identity, consent, ownership, and payload integrity.
3. Outcome:
   - trusted + valid: queued for direct publish
   - standard + valid: PR opened for maintainer review
   - invalid/risky: rejected with reason + risk flags
4. Maintainers review PRs with `consent-review` label when needed.

## Review Heuristics

During manual review, maintainers should check:

- the contributor is represented on their own terms
- metadata and excerpts do not collapse identity into stereotypes
- visibility setting matches contributor intent
- edits do not remove consent metadata

## Incident Handling

- Community behavior incidents: `CODE_OF_CONDUCT.md`
- Security incidents: `SECURITY.md`
- Consent uncertainty: pause publication and request clarification before merge
