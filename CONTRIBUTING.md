# Contributing

Thanks for your interest in improving the Echoes from Afar platform. This repository contains the open-source archive **platform**; the stories it displays belong to the communities that deploy it. Contributions here are code, documentation, and design.

## Ways to contribute

- **Bug reports** — open an issue with steps to reproduce, expected vs. actual behavior, and your browser/OS if it's a rendering issue.
- **Feature requests** — open an issue describing the need. This platform serves community archives of personal stories, so features are weighed against the project's care-centered values, not just utility.
- **Pull requests** — fixes and features are welcome. For anything non-trivial, open an issue first so we can agree on the approach.
- **Adapting it for your community** — you don't need permission (it's MIT), but we'd love to hear about it. Open a discussion to share what you built or what got in your way.

## Development setup

```bash
npm ci
npm run dev        # http://localhost:3000
```

Before opening a PR, make sure all of these pass:

```bash
npm run lint
npm run format:check
npm test
npm run build
```

CI runs the same four checks.

## Project conventions

- **Static export only.** `next.config.ts` sets `output: "export"`. No server-side features (`cookies`, `headers`, ISR, middleware, rewrites). Interactivity needs `"use client"`.
- **Tests use `node:test`** + `node:assert/strict`, run with `npm test`. Pure-logic tests are named `<module>.test.mjs`; source-verification tests are named `<source-file>-source.test.mjs`. Runtime imports in lib/tests use relative paths with `.ts` extensions (the `@/` alias is for type-only imports and app code bundled by Next).
- **Strict TypeScript.** All component props have typed, exported interfaces.
- **Content/code boundary.** Everything an archive customizes lives under `content/`, `public/media/`, and `assets/fonts/` — story markdown, the homepage constellation (`content/home-graph.ts`), site identity (`content/site.ts`), and the about narrative (`content/about.tsx`). Code in `app/`, `components/`, and `lib/` must not hardcode story data, names, or deployment-specific URLs. The tests in `tests/home-graph-content.test.mjs` and `tests/content-schema.test.mjs` validate any content that ships.
- **Styling** uses Tailwind CSS v4 with theme CSS variables defined in `app/globals.css` (`var(--page-accent)` etc.) — no hardcoded hex values in components.

## Content contributions

The stories in this repository are fictional examples. If you want to share a real story, find an archive built on this platform (or build one!) — story submissions go to deployments, not to this repository. The content format is documented in [`content/README.md`](./content/README.md).

## Code of conduct

Be kind. This project exists to make space for stories that are often flattened or erased; the same care applies to how we treat each other. See [CODE_OF_CONDUCT.md](./CODE_OF_CONDUCT.md).
