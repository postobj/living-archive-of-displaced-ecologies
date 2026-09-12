# Content directory

Everything under `content/` (plus the media under `public/media/`) is **content, not code**: it is the part of this repository an archive replaces with its own stories. The rendering logic lives in `app/`, `components/`, and `lib/` and never needs to change when content changes.

The files in this directory are **fictional examples** shipped so the site renders a working demonstration out of the box. They are dedicated to the public domain (CC0); replace them with your community's real stories.

```
content/
  stories/<slug>.md     One markdown file per story (frontmatter + body)
  news/<slug>.md        One markdown file per news/calendar event
  home-graph.ts         The homepage constellation (nodes, edges, layout)
  site.ts               Site identity (name, contact, service URLs)
  about.tsx             The about-page narrative (prose as a component)
public/media/
  images/               Story images referenced by imageFiles
  audio/                Story audio referenced by audioFile
  posters/              Event posters referenced by posterImage/posterVideo
```

Two test suites validate content and run in CI — `tests/content-schema.test.mjs` (frontmatter contract) and `tests/home-graph-content.test.mjs` (constellation invariants). Run `npm test` after editing content.

## Stories — `content/stories/<slug>.md`

The filename (minus `.md`) is the story's slug and URL: `/stories/<slug>`.

Required frontmatter:

| Field         | Type   | Notes                                  |
| ------------- | ------ | -------------------------------------- |
| `title`       | string | Story title (any language)             |
| `contributor` | string | Author/artist name as it should appear |
| `date`        | string | Free-form, e.g. `"May 2026"`           |

Optional frontmatter:

| Field                | Type                             | Notes                                                          |
| -------------------- | -------------------------------- | -------------------------------------------------------------- |
| `storyId`            | string                           | Stable internal id (used by the submission pipeline)           |
| `slogan`             | string                           | One-line tagline; used as the meta description                 |
| `excerpt`            | string                           | Short summary for listings                                     |
| `posterShortText`    | string                           | Short label used in compact displays                           |
| `themes`             | string[]                         | Legacy flat tags                                               |
| `emotions`           | `{name, intensity}[]`            | `intensity` between 0 and 1                                    |
| `textures`           | `{name, weight}[]`               | `weight` between 0 and 1                                       |
| `temporality`        | `{name, weight}[]`               | `weight` between 0 and 1                                       |
| `geography`          | `{name, weight}[]`               | `weight` between 0 and 1                                       |
| `artistLinks`        | `{label, url}[]`                 | `url` must be https                                            |
| `imageFiles`         | string[]                         | Filenames in `public/media/images/`                            |
| `audioFile`          | string                           | Filename in `public/media/audio/`                              |
| `videoUrl`           | string                           | External video link                                            |
| `connections`        | string[]                         | Slugs of related stories (must exist)                          |
| `materials`          | string[]                         | Physical materials of the work                                 |
| `visibility`         | `public \| community \| private` | `private` stories are excluded from builds; defaults to public |
| `consentVersion`     | string                           | Version of the consent agreement the contributor confirmed     |
| `consentConfirmedAt` | ISO datetime                     | When consent was confirmed                                     |

The markdown body is the story itself.

The four weighted tag dimensions position stories in the archive's emotional space (filters, 2D/3D constellation placement). Use a handful of tags per dimension; weights express how strongly the tag applies.

## News — `content/news/<slug>.md`

Required: `year` (integer), `dateLabel` (e.g. `"6/4"` for the 4th of June), `title`.
Optional: `description`, `link`/`linkLabel` (https), `posterImage`/`posterVideo` (absolute public paths, e.g. `/media/posters/x.jpg`), `time`, `endTime`, `location`, `category`, `admission`. The body provides the long description.

## Homepage constellation — `content/home-graph.ts`

Exports `HOME_GRAPH_CONTENT` with four blocks:

- `nodes` — floating text fragments. Each has a unique `id`, multilingual `copy` (every language in `lib/display-languages.ts` must be present), a `tone` (`title` | `phrase` | `whisper`), a draft 3D `position` (recentred and scaled at build time), an `animationDelayMs`, and optionally a `storySlug` linking the node to a story page.
- `edges` — connections between node ids (optional `opacity`).
- `layouts` — per-node responsive CSS classes for the 2D fallback layout (one entry per node).
- `staticLines` — desktop and mobile connection lines for the 2D fallback, in viewport percentages.

## Site identity — `content/site.ts`

`SITE_CONFIG` holds the site name, description, tagline, contact email, Instagram URL, and the optional story-submission service URLs. Empty strings disable the related UI. Environment variables (`NEXT_PUBLIC_CONTACT_EMAIL`, `NEXT_PUBLIC_VERIFY_WORKER_URL`, `NEXT_PUBLIC_STORY_UPDATE_FORM_URL`) override per deployment.

## About narrative — `content/about.tsx`

`AboutNarrative` renders the about-page prose. Keep the exported props interface intact (the page passes its CSS-module classes and two lens-anchor refs); rewrite the JSX inside with your archive's story.

## Licensing

The example stories, images, audio, and translations in this directory are dedicated to the public domain under [CC0 1.0](https://creativecommons.org/publicdomain/zero/1.0/). Real stories you add remain the property of their authors — this repository's MIT license covers the code, not your content.
