"use client";

import { SITE_CONFIG } from "@/content/site";
import type { StoryMetadata } from "@/lib/content";

interface FallbackViewProps {
  stories: StoryMetadata[];
  onBackTo3D: () => void;
  onStoryClick: (slug: string) => void;
}

export default function FallbackView({
  stories,
  onBackTo3D,
  onStoryClick,
}: FallbackViewProps) {
  const surfaceBg = "#ffffff";
  const foreground = "var(--foreground)";
  const muted = "var(--page-muted)";
  const cardBg = "rgba(255,255,255,0.94)";
  const cardBorder = "rgba(48,35,29,0.14)";
  const titleBySlug = new Map(
    stories.map((story) => [story.slug, story.title]),
  );

  return (
    <div
      className="w-full min-h-screen p-8 transition-colors duration-500"
      style={{ background: surfaceBg, color: foreground }}
    >
      <div className="editorial-shell max-w-5xl">
        <div className="mb-8 flex flex-wrap items-center justify-between gap-3">
          <button
            onClick={onBackTo3D}
            className="editorial-pill-button cursor-pointer text-xs uppercase tracking-[0.2em]"
            style={{ borderColor: cardBorder }}
          >
            Retry 3D
          </button>
        </div>

        <p className="editorial-kicker mb-3">Fallback View</p>
        <h1 className="editorial-title mb-4 text-4xl">
          {SITE_CONFIG.siteName}
        </h1>
        <p className="editorial-copy mb-8 max-w-2xl">
          3D view unavailable. Showing list view instead.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {stories.map((story) => (
            <button
              key={story.slug}
              onClick={() => onStoryClick(story.slug)}
              className="cursor-pointer p-6 rounded-lg border transition-all text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--page-accent)] focus-visible:ring-offset-2"
              style={{ background: cardBg, borderColor: cardBorder }}
            >
              <h2 className="text-xl font-medium mb-2">{story.title}</h2>
              <p className="text-sm mb-3" style={{ color: muted }}>
                {story.contributor}
              </p>
              {story.slogan && (
                <p className="text-sm" style={{ color: muted }}>
                  {story.slogan}
                </p>
              )}
              <div className="mt-4 flex flex-wrap gap-2">
                {story.emotions?.map((emotion) => (
                  <span
                    key={emotion.name}
                    className="text-xs px-2 py-1 rounded-full border"
                    style={{ borderColor: cardBorder, color: muted }}
                  >
                    {emotion.name}
                  </span>
                ))}
              </div>
              {story.connections && story.connections.length > 0 && (
                <div className="mt-3">
                  <p
                    className="mb-2 text-[10px] uppercase tracking-[0.2em]"
                    style={{ color: muted }}
                  >
                    Connected stories
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {story.connections.slice(0, 4).map((slug) => (
                      <span
                        key={slug}
                        className="text-[10px] px-2 py-1 rounded-full border"
                        style={{ borderColor: cardBorder, color: muted }}
                      >
                        {titleBySlug.get(slug) ?? slug}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
