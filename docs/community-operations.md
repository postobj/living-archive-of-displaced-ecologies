# Community Operations Baseline

This document defines the minimum operating pattern for open-source collaboration in Echoes from Afar.

## Maintainer Responsibilities

- Keep issue/PR response times predictable.
- Protect contributor safety and consent.
- Enforce repository standards consistently.
- Keep documentation current as workflows evolve.

## Triage Cadence

- Review new issues and PRs at least twice per week.
- Label and route work on first review.
- Close stale items only with a clear explanation and reopen path.

## Suggested Labels

- `content`: story/cultural material changes
- `design`: UX/UI and interaction work
- `engineering`: implementation and architecture
- `good first issue`: onboarding-friendly task
- `needs-triage`: awaiting initial maintainer review
- `needs-review`: ready for maintainer/peer review
- `consent-review`: requires consent/privacy validation

## Merge Standards

A PR should merge only when:

- CI passes (`lint`, `format:check`, `test`).
- Scope matches linked issue or rationale is documented.
- Any consent/visibility changes are explicitly reviewed.
- User-facing behavior changes include docs updates.

## Incident and Safety Handling

- Behavioral issues: follow [CODE_OF_CONDUCT.md](../CODE_OF_CONDUCT.md).
- Security issues: follow [SECURITY.md](../SECURITY.md).
- Consent/privacy concerns: pause merge and require explicit maintainer signoff.
- Governance policy reference: [care-centered-governance.md](./care-centered-governance.md).

## New Contributor Onboarding

- Start with [README.md](../README.md) and [CONTRIBUTING.md](../CONTRIBUTING.md).
- Encourage first contributions via `good first issue`.
- Provide concrete, actionable review feedback.
