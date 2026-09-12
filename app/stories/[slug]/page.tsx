import { SITE_CONFIG } from "@/content/site";
import { getAllStories, getStoryBySlug } from "@/lib/content";
import type { StoryArtistLink } from "@/lib/content";
import { BackToArchiveArrow } from "@/components/BackToArchiveArrow";
import { SmartBackArrow } from "@/components/SmartBackArrow";
import { StoryNextConnectorLine } from "@/components/StoryNextConnectorLine";
import { StoryVisualStage } from "@/components/StoryVisualStage";
import { getStoryWordmarkText } from "@/lib/story-wordmark";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { cache, Suspense } from "react";

interface StoryPageProps {
  params: Promise<{ slug: string }>;
}

export const dynamic = "force-static";
export const dynamicParams = false;

function audioMimeType(filename: string): string {
  const ext = filename.split(".").pop()?.toLowerCase() ?? "";
  const map: Record<string, string> = {
    mp3: "audio/mpeg",
    wav: "audio/wav",
    ogg: "audio/ogg",
    m4a: "audio/mp4",
    aac: "audio/mp4",
  };
  return map[ext] ?? "audio/mpeg";
}

const getStory = cache((slug: string) => getStoryBySlug(slug));
const fallbackStoryUpdateFormUrl = SITE_CONFIG.storyUpdateFormUrl;
function isValidBaserowFormUrl(value: string): boolean {
  try {
    const url = new URL(value);
    const isAllowedHost =
      url.hostname === "baserow.io" || url.hostname === "www.baserow.io";
    const isAllowedPath = /^\/form\/[A-Za-z0-9_-]+\/?$/.test(url.pathname);
    return url.protocol === "https:" && isAllowedHost && isAllowedPath;
  } catch {
    return false;
  }
}

const configuredStoryUpdateFormBaseUrl =
  process.env.NEXT_PUBLIC_STORY_UPDATE_FORM_URL?.trim();
const storyUpdateFormBaseUrl =
  configuredStoryUpdateFormBaseUrl &&
  configuredStoryUpdateFormBaseUrl.length > 0
    ? configuredStoryUpdateFormBaseUrl
    : fallbackStoryUpdateFormUrl;

function buildStoryUpdateHref(storyId: string, slug: string): string | null {
  if (
    !storyUpdateFormBaseUrl ||
    !isValidBaserowFormUrl(storyUpdateFormBaseUrl)
  ) {
    return null;
  }

  try {
    const url = new URL(storyUpdateFormBaseUrl);
    // Baserow form prefill uses prefill_<field_name>. Keep legacy params too.
    url.searchParams.set("prefill_story_id", storyId);
    url.searchParams.set("prefill_slug", slug);
    url.searchParams.set("story_id", storyId);
    url.searchParams.set("slug", slug);
    return url.toString();
  } catch {
    // Fallback for malformed URLs to avoid breaking page rendering.
    const separator = storyUpdateFormBaseUrl.includes("?") ? "&" : "?";
    return `${storyUpdateFormBaseUrl}${separator}prefill_story_id=${encodeURIComponent(storyId)}&prefill_slug=${encodeURIComponent(slug)}&story_id=${encodeURIComponent(storyId)}&slug=${encodeURIComponent(slug)}`;
  }
}

export function generateStaticParams() {
  const stories = getAllStories();
  return stories.map((story) => ({
    slug: story.metadata.slug,
  }));
}

export async function generateMetadata({
  params,
}: StoryPageProps): Promise<Metadata> {
  const { slug } = await params;
  const story = getStory(slug);

  if (!story) {
    return {
      title: `Story Not Found | ${SITE_CONFIG.siteName}`,
    };
  }

  return {
    title: `${story.metadata.title} | ${SITE_CONFIG.siteName}`,
    description:
      story.metadata.slogan ??
      `Story from the ${SITE_CONFIG.siteName} archive.`,
  };
}

function getStoryMediaSources(metadata: {
  imageFile?: string;
  imageFiles?: string[];
}): string[] {
  const fromArray =
    Array.isArray(metadata.imageFiles) && metadata.imageFiles.length > 0
      ? metadata.imageFiles
      : [];

  const fromSingle = metadata.imageFile ? [metadata.imageFile] : [];

  return Array.from(
    new Set(
      [...fromArray, ...fromSingle]
        .map((item) => item.trim())
        .filter((item) => item.length > 0),
    ),
  );
}

function getArtistWebsiteUrl(artistLinks?: StoryArtistLink[]): string | null {
  if (!artistLinks || artistLinks.length === 0) return null;
  return artistLinks[0].url;
}

function formatStoryDate(dateValue: string): string {
  const normalized = dateValue.trim();
  if (!normalized) {
    return "";
  }

  const yearMatch = /(\d{4})/.exec(normalized);
  if (yearMatch) {
    return yearMatch[1];
  }

  const parsedDate = new Date(normalized);
  if (Number.isNaN(parsedDate.getTime())) {
    return normalized;
  }

  return String(parsedDate.getFullYear());
}

function formatVisibility(value: "public" | "community" | "private"): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function toDisplayParagraphs(content: string): string[] {
  return content
    .replace(/\r\n/g, "\n")
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.replace(/\n+/g, " ").trim())
    .filter((paragraph) => paragraph.length > 0);
}

export default async function StoryPage({ params }: StoryPageProps) {
  const { slug } = await params;
  const story = getStory(slug);

  if (!story) {
    notFound();
  }

  const storyId = story.metadata.storyId ?? story.metadata.slug;
  const updateStoryHref = buildStoryUpdateHref(storyId, story.metadata.slug);
  const mediaSources = getStoryMediaSources(story.metadata);
  const videoUrl = story.metadata.videoUrl ?? null;
  const artistWebsiteHref = getArtistWebsiteUrl(story.metadata.artistLinks);
  const formattedDate = formatStoryDate(story.metadata.date);
  const materialsMeta =
    Array.isArray(story.metadata.materials) &&
    story.metadata.materials.length > 0
      ? `Materials: ${story.metadata.materials.join(", ")}`
      : null;
  const visibilityMeta = story.metadata.visibility
    ? `Visibility: ${formatVisibility(story.metadata.visibility)}`
    : null;
  const consentVersionMeta = story.metadata.consentVersion
    ? `Consent: ${story.metadata.consentVersion}`
    : null;
  const storyParagraphs = toDisplayParagraphs(story.content);
  const storyWordmarkText = getStoryWordmarkText({
    posterShortText: story.metadata.posterShortText,
    title: story.metadata.title,
  });

  return (
    <div
      className="min-h-screen transition-colors duration-500"
      style={{
        background: "var(--story-bg-top)",
        color: "var(--story-text)",
      }}
    >
      <Suspense fallback={<BackToArchiveArrow />}>
        <SmartBackArrow />
      </Suspense>

      <section id="story-top" className="relative">
        <div className="story-container">
          <main className="story-content">
            <header
              className="border-b story-header-spacing"
              style={{ borderColor: "var(--story-border)" }}
            >
              <p className="editorial-kicker mb-4">Story Entry</p>
              <h1
                className="story-title"
                style={{
                  color: "var(--story-text)",
                }}
              >
                {story.metadata.title}
              </h1>
              <div className="mt-5 flex flex-wrap items-center gap-3">
                <p className="text-sm uppercase tracking-[0.2em] text-[var(--story-muted)] md:text-base">
                  {story.metadata.contributor}
                </p>
                {formattedDate && (
                  <span className="text-sm uppercase tracking-[0.2em] text-[var(--story-muted)] md:text-base">
                    {formattedDate}
                  </span>
                )}
              </div>
              {materialsMeta && (
                <p className="mt-3 text-sm tracking-[0.08em] text-[var(--story-muted)]">
                  {materialsMeta}
                </p>
              )}
              {story.metadata.slogan && (
                <p
                  className="text-base leading-relaxed text-[var(--story-muted)] md:text-lg"
                  style={{ marginTop: "1.5rem" }}
                >
                  {story.metadata.slogan}
                </p>
              )}
            </header>

            {/* Audio player if available */}
            {story.metadata.audioFile && (
              <div
                className="rounded-lg border"
                style={{
                  background: "var(--page-surface)",
                  borderColor: "var(--story-border)",
                  marginBottom: "2.5rem",
                  padding: "1rem",
                }}
              >
                <audio controls className="w-full">
                  <source
                    src={`/media/audio/${story.metadata.audioFile}`}
                    type={audioMimeType(story.metadata.audioFile)}
                  />
                  Your browser does not support the audio element.
                </audio>
              </div>
            )}

            {/* Story content */}
            <article style={{ color: "var(--story-text)" }}>
              <div className="story-body-text">
                {storyParagraphs.map((paragraph, index) => (
                  <p
                    key={`${story.metadata.slug}-paragraph-${index}`}
                    className={index > 0 ? "story-para-spacing" : undefined}
                  >
                    {paragraph}
                  </p>
                ))}
              </div>
            </article>

            {videoUrl && (
              <div
                className="story-video-embed"
                style={{ marginTop: "2.5rem" }}
              >
                <div
                  style={{
                    position: "relative",
                    width: "100%",
                    paddingBottom: "56.25%",
                  }}
                >
                  <iframe
                    src={videoUrl}
                    title="Video embed"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                    referrerPolicy="strict-origin-when-cross-origin"
                    allowFullScreen
                    style={{
                      position: "absolute",
                      top: 0,
                      left: 0,
                      width: "100%",
                      height: "100%",
                      border: 0,
                    }}
                  />
                </div>
              </div>
            )}
          </main>
        </div>

        <div className="story-container" style={{ paddingBottom: "0.5rem" }}>
          <StoryVisualStage
            wordmarkText={storyWordmarkText}
            title={story.metadata.title}
            contributor={story.metadata.contributor}
            year={formattedDate || undefined}
            slogan={story.metadata.slogan}
            mediaSources={mediaSources}
          />
        </div>

        <footer
          className="story-container pt-8"
          style={{ marginTop: "1.5rem", paddingBottom: "1.5rem" }}
        >
          <div className="px-4 py-4">
            <div className="grid justify-items-center gap-y-2 text-center text-[11px] sm:flex sm:flex-wrap sm:items-center sm:justify-center sm:gap-x-6 sm:gap-y-2 sm:text-xs">
              {updateStoryHref && (
                <a
                  href={updateStoryHref}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 rounded-sm text-sm transition-colors hover:text-[var(--story-text)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--story-text)] focus-visible:ring-offset-2"
                  style={{ color: "var(--story-muted)" }}
                >
                  <span>Update this story</span>
                  <span aria-hidden>↗</span>
                </a>
              )}

              <span
                className="break-all sm:break-normal"
                style={{ color: "var(--story-muted)" }}
              >
                Story ID: {storyId}
              </span>
              {visibilityMeta && (
                <span style={{ color: "var(--story-muted)" }}>
                  {visibilityMeta}
                </span>
              )}
              {consentVersionMeta && (
                <span style={{ color: "var(--story-muted)" }}>
                  {consentVersionMeta}
                </span>
              )}
            </div>
          </div>
        </footer>
      </section>

      <StoryNextConnectorLine
        enabled={Boolean(artistWebsiteHref)}
        toSelector="#story-artist-link"
      />

      <div
        className="pointer-events-none fixed inset-x-0 z-40"
        style={{ bottom: "max(env(safe-area-inset-bottom), 0px)" }}
      >
        <div
          style={{
            paddingLeft: "max(env(safe-area-inset-left), 0px)",
            paddingRight: "max(env(safe-area-inset-right), 0px)",
          }}
        >
          <div className="flex items-end justify-between story-bottom-bar">
            <a
              href="#story-top"
              className="story-back-top-link story-bottom-back-link pointer-events-auto inline-flex shrink-0 flex-col items-start rounded-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--page-accent)] focus-visible:ring-offset-2"
            >
              <span className="story-up-icon" aria-hidden="true">
                <svg
                  className="story-up-svg"
                  viewBox="0 0 24 112"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                >
                  <path
                    d="M12 108V8"
                    stroke="currentColor"
                    strokeWidth="1.6"
                    strokeLinecap="butt"
                    strokeLinejoin="miter"
                  />
                  <path
                    d="M4 22L12 8L20 22"
                    stroke="currentColor"
                    strokeWidth="1.6"
                    strokeLinecap="butt"
                    strokeLinejoin="miter"
                  />
                </svg>
              </span>
              <span className="mt-2">Back to Top</span>
            </a>

            {artistWebsiteHref && (
              <a
                id="story-artist-link"
                href={artistWebsiteHref}
                target="_blank"
                rel="noreferrer"
                aria-label={`Visit ${story.metadata.contributor}'s website`}
                className="story-bottom-artist-link pointer-events-auto inline-flex items-end rounded-sm text-right transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--page-accent)] focus-visible:ring-offset-2"
              >
                Artist Website ↗
              </a>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
