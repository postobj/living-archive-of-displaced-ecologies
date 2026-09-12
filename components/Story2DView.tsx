"use client";

import Image from "next/image";
import { useEffect, useId, useMemo, useRef, useState } from "react";
import type { Story } from "@/lib/content";
import { matchesStoryQuery, normalizeSearchQuery } from "@/lib/search";

interface Story2DViewProps {
  stories: Story[];
  onStoryClick: (slug: string) => void;
}

interface StoryRow {
  slug: string;
  title: string;
  artist: string;
  year: string;
}

interface Point2D {
  x: number;
  y: number;
}

const ARCHIVE_DISPLAY_FONT_FAMILY =
  '"Segment", "HuiWenFangSong", var(--font-suwannaphum), serif';

function parseYear(dateText: string): string {
  const match = /(\d{4})/.exec(dateText);
  return match ? match[1] : "----";
}

function getPrimaryStoryImage(story: Story | null): string | null {
  if (!story) {
    return null;
  }

  const arrayImage =
    Array.isArray(story.metadata.imageFiles) &&
    story.metadata.imageFiles.length > 0
      ? story.metadata.imageFiles
          .map((item) => item.trim())
          .find((item) => item.length > 0)
      : null;

  if (arrayImage) {
    return arrayImage;
  }

  const singleImage = story.metadata.imageFile?.trim();
  if (singleImage && singleImage.length > 0) {
    return singleImage;
  }

  return null;
}

function createPosterLines(text: string | undefined): string[] {
  if (!text) {
    return [];
  }

  const cleaned = text
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toUpperCase();
  if (!cleaned) {
    return [];
  }

  const maxLineLength = 22;
  const words = cleaned.split(" ");
  const lines: string[] = [];
  let current = "";

  for (const word of words) {
    if (!current) {
      current = word;
      continue;
    }

    const next = `${current} ${word}`;
    if (next.length <= maxLineLength) {
      current = next;
      continue;
    }

    lines.push(current);
    if (lines.length === 4) {
      return lines;
    }
    current = word;
  }

  if (current) {
    lines.push(current);
  }

  return lines.slice(0, 4);
}

const RED_PANEL_GEOMETRY = {
  topLeft: { x: 6.8, y: 10.5 },
  topRight: { x: 93.2, y: 10.5 },
  bottomLeft: { x: 6.8, y: 89.5 },
  bottomRight: { x: 93.2, y: 89.5 },
  center: { x: 50, y: 26 },
} as const;

function createLineWithGap(
  from: Point2D,
  to: Point2D,
  startGap: number,
  endGap: number,
) {
  const deltaX = to.x - from.x;
  const deltaY = to.y - from.y;
  const distance = Math.hypot(deltaX, deltaY);
  if (distance <= 0.0001) {
    return { x1: from.x, y1: from.y, x2: to.x, y2: to.y };
  }

  const unitX = deltaX / distance;
  const unitY = deltaY / distance;

  return {
    x1: from.x + unitX * startGap,
    y1: from.y + unitY * startGap,
    x2: to.x - unitX * endGap,
    y2: to.y - unitY * endGap,
  };
}

export function Story2DView({ stories, onStoryClick }: Story2DViewProps) {
  const stampFilterId = useId().replaceAll(":", "");
  const [query, setQuery] = useState("");
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [activeSlug, setActiveSlug] = useState<string | null>(
    stories[0]?.metadata.slug ?? null,
  );
  const searchInputRef = useRef<HTMLInputElement | null>(null);

  const normalizedQuery = normalizeSearchQuery(query);
  const filteredStories = useMemo(
    () =>
      stories.filter((story) =>
        matchesStoryQuery(story.metadata, normalizedQuery),
      ),
    [normalizedQuery, stories],
  );

  const rows = useMemo<StoryRow[]>(
    () =>
      filteredStories.map((story) => ({
        slug: story.metadata.slug,
        title: story.metadata.title,
        artist: story.metadata.contributor,
        year: parseYear(story.metadata.date),
      })),
    [filteredStories],
  );

  const storyBySlug = useMemo(
    () => new Map(filteredStories.map((story) => [story.metadata.slug, story])),
    [filteredStories],
  );

  const effectiveSlug =
    filteredStories.length === 0
      ? null
      : activeSlug && storyBySlug.has(activeSlug)
        ? activeSlug
        : filteredStories[0].metadata.slug;

  const activeStory = effectiveSlug
    ? (storyBySlug.get(effectiveSlug) ?? null)
    : null;
  const posterLines = createPosterLines(
    activeStory?.metadata.posterShortText ?? activeStory?.metadata.title,
  );
  const posterFontScale = Math.min(
    1,
    18 / Math.max(...posterLines.map((l) => l.length), 1),
    3.5 / Math.max(posterLines.length, 1),
  );
  const activeStoryImage = useMemo(
    () =>
      effectiveSlug
        ? getPrimaryStoryImage(storyBySlug.get(effectiveSlug) ?? null)
        : null,
    [effectiveSlug, storyBySlug],
  );

  const pageBackground = "#ffffff";
  const panelSurface = "#ffffff";
  const panelBorder = "rgba(0,0,0,0.14)";
  const panelText = "rgba(0,0,0,0.92)";
  const panelMuted = "rgba(0,0,0,0.6)";
  const activeRowBackground = "#050000";
  const inactiveHover =
    "linear-gradient(90deg, rgba(228,0,0,0.07) 0%, rgba(0,0,0,0.035) 100%)";
  const topLeftConnector = createLineWithGap(
    RED_PANEL_GEOMETRY.topLeft,
    RED_PANEL_GEOMETRY.center,
    2.7,
    3.2,
  );
  const topRightConnector = createLineWithGap(
    RED_PANEL_GEOMETRY.topRight,
    RED_PANEL_GEOMETRY.center,
    2.7,
    3.2,
  );
  const showSearchBar = isSearchOpen || normalizedQuery.length > 0;

  useEffect(() => {
    if (!showSearchBar) {
      return;
    }

    window.requestAnimationFrame(() => {
      searchInputRef.current?.focus();
    });
  }, [showSearchBar]);

  return (
    <section
      className="relative min-h-screen overflow-hidden"
      style={{ background: pageBackground, color: panelText }}
    >
      <svg
        aria-hidden="true"
        className="absolute w-0 h-0 overflow-hidden pointer-events-none"
        focusable="false"
        width="0"
        height="0"
      >
        <defs>
          <filter
            id={stampFilterId}
            x="-15%"
            y="-15%"
            width="130%"
            height="130%"
            colorInterpolationFilters="sRGB"
          >
            <feTurbulence
              type="fractalNoise"
              baseFrequency="0.18"
              numOctaves="5"
              seed="13"
              result="edgeNoise"
            />
            <feDisplacementMap
              in="SourceGraphic"
              in2="edgeNoise"
              scale="10"
              xChannelSelector="R"
              yChannelSelector="G"
              result="roughGlyph"
            />
            <feTurbulence
              type="fractalNoise"
              baseFrequency="0.4"
              numOctaves="3"
              seed="11"
              result="fineGrain"
            />
            <feColorMatrix
              in="fineGrain"
              type="matrix"
              values="0 0 0 0 1
                      0 0 0 0 1
                      0 0 0 0 1
                      0 0 0 3.5 -1.8"
              result="grainMask"
            />
            <feComposite
              in="grainMask"
              in2="SourceAlpha"
              operator="in"
              result="grainInGlyph"
            />
            <feMerge>
              <feMergeNode in="roughGlyph" />
              <feMergeNode in="grainInGlyph" />
            </feMerge>
          </filter>
        </defs>
      </svg>
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-transparent"
      />

      <main className="editorial-shell relative z-10 min-h-screen w-full">
        <div className="editorial-panel-strong grid min-h-screen grid-cols-1 overflow-hidden rounded-[2rem] lg:grid-cols-[minmax(360px,0.82fr)_minmax(520px,1fr)]">
          <section
            className="border-b backdrop-blur-[1px] lg:border-b-0 lg:border-r"
            style={{ borderColor: panelBorder, background: panelSurface }}
          >
            <header
              className="grid h-14 grid-cols-[1fr_auto_1fr] items-center border-b px-4 sm:px-6"
              style={{ borderColor: panelBorder }}
            >
              <span />
              <div className="text-center">
                <span
                  className="archive-panel-title"
                  style={{
                    filter: `url("#${stampFilterId}")`,
                  }}
                >
                  Archive
                </span>
              </div>
              <button
                type="button"
                onClick={() => {
                  if (normalizedQuery.length > 0) {
                    setQuery("");
                  }
                  setIsSearchOpen((current) => !current);
                }}
                aria-expanded={showSearchBar}
                aria-controls="archive-search-panel"
                className="justify-self-end text-[10px] uppercase tracking-[0.24em] transition-colors hover:text-[var(--foreground)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--page-accent)] focus-visible:ring-offset-2"
                style={{ color: "var(--page-accent)" }}
              >
                Search
              </button>
            </header>

            <div className="grid min-h-0 grid-cols-1 grid-rows-[auto_1fr]">
              <div className="relative">
                <div className="relative aspect-[16/9] w-full bg-black">
                  {activeStoryImage ? (
                    <>
                      <Image
                        src={`/media/images/${activeStoryImage}`}
                        alt={activeStory?.metadata.title ?? "Story image"}
                        fill
                        sizes="(max-width: 1024px) 100vw, 36vw"
                        className="object-cover"
                      />
                    </>
                  ) : (
                    <div className="absolute inset-0 bg-[linear-gradient(118deg,rgba(32,32,32,0.86)_0%,rgba(80,80,80,0.28)_34%,rgba(28,28,28,0.84)_100%)]" />
                  )}
                </div>
              </div>

              <div className="relative flex min-h-[300px] flex-col overflow-hidden bg-[var(--page-accent)] p-6 text-white sm:p-8 lg:min-h-[420px]">
                <svg
                  className="pointer-events-none absolute inset-0 h-full w-full"
                  aria-hidden="true"
                >
                  <line
                    x1={`${topLeftConnector.x1}%`}
                    y1={`${topLeftConnector.y1}%`}
                    x2={`${topLeftConnector.x2}%`}
                    y2={`${topLeftConnector.y2}%`}
                    stroke="rgba(255,255,255,0.84)"
                    strokeWidth="1.4"
                    strokeLinecap="round"
                  />
                  <line
                    x1={`${topRightConnector.x1}%`}
                    y1={`${topRightConnector.y1}%`}
                    x2={`${topRightConnector.x2}%`}
                    y2={`${topRightConnector.y2}%`}
                    stroke="rgba(255,255,255,0.84)"
                    strokeWidth="1.4"
                    strokeLinecap="round"
                  />
                </svg>
                <div
                  className="absolute h-6 w-6 -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/85 bg-[rgba(255,255,255,0.82)]"
                  style={{
                    left: `${RED_PANEL_GEOMETRY.topLeft.x}%`,
                    top: `${RED_PANEL_GEOMETRY.topLeft.y}%`,
                  }}
                />
                <div
                  className="absolute h-6 w-6 -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/85 bg-[rgba(255,255,255,0.82)]"
                  style={{
                    left: `${RED_PANEL_GEOMETRY.topRight.x}%`,
                    top: `${RED_PANEL_GEOMETRY.topRight.y}%`,
                  }}
                />
                <div
                  className="absolute h-6 w-6 -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/85 bg-[rgba(255,255,255,0.82)]"
                  style={{
                    left: `${RED_PANEL_GEOMETRY.bottomLeft.x}%`,
                    top: `${RED_PANEL_GEOMETRY.bottomLeft.y}%`,
                  }}
                />
                <div
                  className="absolute h-6 w-6 -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/85 bg-[rgba(255,255,255,0.82)]"
                  style={{
                    left: `${RED_PANEL_GEOMETRY.bottomRight.x}%`,
                    top: `${RED_PANEL_GEOMETRY.bottomRight.y}%`,
                  }}
                />
                <div
                  className="absolute h-7 w-7 -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/85 bg-[rgba(255,255,255,0.82)]"
                  style={{
                    left: `${RED_PANEL_GEOMETRY.center.x}%`,
                    top: `${RED_PANEL_GEOMETRY.center.y}%`,
                  }}
                />

                <div className="absolute inset-x-0 top-1/2 z-10 -translate-y-1/2 px-6 text-center sm:px-8">
                  {posterLines.map((line) => (
                    <p
                      key={line}
                      className="uppercase leading-[1.02] tracking-[0.08em] text-white"
                      style={{
                        fontFamily: ARCHIVE_DISPLAY_FONT_FAMILY,
                        fontSize: `clamp(${1.83 * posterFontScale}rem, ${4.5 * posterFontScale}vw, ${3.375 * posterFontScale}rem)`,
                      }}
                    >
                      {line}
                    </p>
                  ))}
                </div>
                <div className="relative z-10 mt-auto flex justify-center pt-8">
                  {activeStory ? (
                    <button
                      type="button"
                      onClick={() => onStoryClick(activeStory.metadata.slug)}
                      className="min-h-11 cursor-pointer rounded-full border border-white/80 bg-white/8 px-4 py-2 text-xs uppercase tracking-[0.2em] text-white transition-colors hover:bg-white/14 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--page-accent)]"
                    >
                      Open Story
                    </button>
                  ) : (
                    <p className="text-sm text-white/80">
                      No stories available.
                    </p>
                  )}
                </div>
              </div>
            </div>
          </section>

          <section
            className="min-h-0 border-t backdrop-blur-[1px] lg:border-l-0 lg:border-t-0"
            style={{ borderColor: panelBorder, background: panelSurface }}
          >
            <div
              id="archive-search-panel"
              className="overflow-hidden border-b transition-[max-height,opacity,padding] duration-200 ease-out"
              style={{
                borderColor: panelBorder,
                maxHeight: showSearchBar ? "9rem" : "0rem",
                opacity: showSearchBar ? 1 : 0,
                padding: showSearchBar ? "1rem 1.5rem" : "0 1.5rem",
              }}
            >
              <label htmlFor="archive-search" className="sr-only">
                Search archive
              </label>
              <input
                ref={searchInputRef}
                id="archive-search"
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search by title, artist, theme, or emotion"
                className="editorial-search-input text-base"
              />
              <p
                className="mt-3 text-[11px] uppercase tracking-[0.2em]"
                style={{ color: panelMuted }}
              >
                {rows.length} {rows.length === 1 ? "story" : "stories"}
              </p>
            </div>

            <header
              className="grid h-14 grid-cols-[minmax(0,1fr)_9rem_5rem] items-center border-b px-4 text-[11px] uppercase tracking-[0.18em] sm:px-6"
              style={{ borderColor: panelBorder, color: "var(--page-accent)" }}
            >
              <span>Title</span>
              <span className="text-right">Artist</span>
              <span className="text-right">Year</span>
            </header>

            <div className="min-h-0 overflow-y-auto py-2">
              {rows.length === 0 ? (
                <div className="px-2 py-8 sm:px-3">
                  <div
                    className="rounded-[1.8rem] border px-5 py-8 text-center text-sm"
                    style={{ borderColor: panelBorder, color: panelMuted }}
                  >
                    No stories match this search.
                  </div>
                </div>
              ) : (
                rows.map((row) => {
                  const isActive = row.slug === effectiveSlug;

                  return (
                    <button
                      key={row.slug}
                      type="button"
                      onClick={() => {
                        if (isActive) {
                          onStoryClick(row.slug);
                          return;
                        }
                        setActiveSlug(row.slug);
                      }}
                      className="group relative grid min-h-11 w-full grid-cols-[minmax(0,1fr)_9rem_5rem] items-center px-5 py-3 text-left text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--page-accent)] focus-visible:ring-inset sm:px-6"
                      style={{ color: isActive ? "#ffffff" : panelText }}
                      aria-pressed={isActive}
                      aria-label={
                        isActive ? `Open ${row.title}` : `Select ${row.title}`
                      }
                    >
                      <span
                        aria-hidden
                        className="pointer-events-none absolute inset-0 rounded-[4px] transition-opacity"
                        style={{
                          background: isActive
                            ? activeRowBackground
                            : inactiveHover,
                          boxShadow: isActive
                            ? "inset 2px 2px 20px 2px rgba(255,255,255,0.8)"
                            : "none",
                          opacity: isActive ? 0.9 : 0,
                        }}
                      />
                      <span
                        aria-hidden
                        className="pointer-events-none absolute inset-0 rounded-[4px] opacity-0 transition-opacity group-hover:opacity-100"
                        style={{
                          background: isActive ? "transparent" : inactiveHover,
                        }}
                      />

                      <span className="relative z-10 min-w-0 pr-3">
                        <span className="block truncate text-[1.02rem] leading-snug sm:text-[1.12rem]">
                          {row.title}
                        </span>
                      </span>
                      <span
                        className="relative z-10 truncate pr-3 text-right text-[12px] uppercase tracking-[0.08em]"
                        style={{
                          color: isActive
                            ? "rgba(255,255,255,0.82)"
                            : panelMuted,
                        }}
                      >
                        {row.artist}
                      </span>
                      <span
                        className="relative z-10 text-right text-[11px]"
                        style={{
                          color: isActive
                            ? "rgba(255,255,255,0.82)"
                            : panelMuted,
                        }}
                      >
                        {row.year}
                      </span>
                    </button>
                  );
                })
              )}
            </div>
          </section>
        </div>
      </main>
    </section>
  );
}
