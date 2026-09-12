# Echoes from Afar — open-source community archive platform

A non-linear, decentralized digital archive platform for community storytelling, with interactive 3D constellation navigation. Built with Next.js (static export) and Three.js.

Echoes from Afar began as a research project exploring how digital platforms can become spaces where migrant communities reclaim authorship and visibility for their own stories. This repository is the platform that grew out of that work, open-sourced so any community can build its own living archive on it.

The repository ships with **three fictional example stories** so it renders a working demonstration out of the box. Your archive replaces them with real ones.

## What it does

- **Non-linear navigation** — stories are nodes in a 3D constellation, connected by themes and feelings rather than chronology
- **Multi-dimensional tagging** — stories carry weighted emotions, textures, temporality, and geography that position them in the archive's space
- **Self-authored narratives** — community members share stories on their own terms, in any language
- **Care-centered consent** — per-story visibility (`public` / `community` / `private`) and consent tracking in the content format
- **Static export** — the whole site builds to plain files; host it anywhere for free

## Quickstart

Prerequisites: Node.js 22+.

```bash
git clone <this-repo>
cd <repo>
npm ci
npm run dev      # development server at http://localhost:3000
```

```bash
npm test         # node:test suite, includes content validation
npm run lint     # ESLint
npm run build    # static export to ./out
```

## Make it your archive

All content lives under `content/` and `public/media/` — the code never needs to change:

1. **Stories** — replace the example markdown files in `content/stories/`. The full frontmatter format is documented in [`content/README.md`](./content/README.md).
2. **Homepage constellation** — edit `content/home-graph.ts` (node copy, story links, positions, connection lines).
3. **Site identity** — edit `content/site.ts` (name, contact email, social links) and `content/about.tsx` (the about-page narrative).
4. **Media** — drop images/audio/posters into `public/media/`.
5. **Fonts** — the shipped fonts are open-licensed stand-ins; see [`assets/fonts/README.md`](./assets/fonts/README.md) to use your own.

`npm test` validates your content against the format (frontmatter contract, constellation invariants) — run it after editing.

## Deployment

`npm run build` produces a complete static site in `out/` that works on Cloudflare Pages, Netlify, Vercel, GitHub Pages, or any static host.

Environment variables (all optional):

| Variable                            | Purpose                                            |
| ----------------------------------- | -------------------------------------------------- |
| `NEXT_BASE_PATH`                    | Base path when hosting under a sub-path            |
| `NEXT_PUBLIC_CONTACT_EMAIL`         | Overrides the contact email from `content/site.ts` |
| `NEXT_PUBLIC_VERIFY_WORKER_URL`     | OTP verification endpoint for story submissions    |
| `NEXT_PUBLIC_STORY_UPDATE_FORM_URL` | Baserow form for story submissions/updates         |

## Optional: story submission pipeline

The platform includes an optional pipeline that lets contributors submit and update stories through a form, without GitHub access:

- A Baserow form collects submissions (`scripts/setup-baserow-form.mjs`, `scripts/bootstrap-baserow-schema.mjs`)
- A Cloudflare Worker verifies contributor emails via one-time codes (`workers/verify-otp/` — configure `wrangler.toml` with your own domain and KV namespace)
- A script validates submissions and writes story markdown files (`scripts/process-baserow-submissions.mjs`), typically run from a scheduled GitHub Action

All of it is configured through environment variables; nothing runs unless you set it up.

## Architecture

```
app/              Next.js App Router pages (home, archive, news, stories/[slug], about, verify)
components/       React components (3D constellation, glass effects, story views)
lib/              Pure logic (content loading, geometry, language, positioning)
content/          YOUR content: stories, news, constellation, site identity   ← replace
public/media/     YOUR media: images, audio, posters                          ← replace
assets/fonts/     Fonts (stand-ins shipped; bring your own)                   ← replace
tests/            node:test suite, including content validation
scripts/          Optional Baserow submission pipeline
workers/          Optional OTP verification Cloudflare Worker
```

Constraints worth knowing before contributing:

- **Static export only** — `output: "export"`; no server-side Next.js features
- **Node test runner** — tests use `node:test`, not Jest/Vitest
- **Strict TypeScript** — all props have typed interfaces
- **Content/code boundary** — story data, site identity, and constellation data live under `content/`; please keep new features on the right side of that line

## Contributing

Bug reports, feature requests, and pull requests are welcome — see [CONTRIBUTING.md](./CONTRIBUTING.md). Please remember this platform serves real communities archiving personal, sometimes vulnerable, stories; design changes should preserve the project's care-centered values ([CODE_OF_CONDUCT.md](./CODE_OF_CONDUCT.md)).

## License

Code is [MIT](./LICENSE). Example content is CC0. Stories published by archives built on this platform remain the property of their authors.
