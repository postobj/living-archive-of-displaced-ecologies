"use client";

import { SITE_CONFIG } from "@/content/site";
import React, { useEffect, useRef, useState } from "react";
import type { Story } from "@/lib/content";
import type { FilterState } from "@/types/emotion";

interface SentenceNavigationProps {
  stories: Story[];
  onEnter3DSpace: (filter?: Partial<FilterState>) => void;
}

const SENTENCE_DISPLAY_FONT_FAMILY =
  '"Segment", "HuiWenFangSong", var(--font-suwannaphum), serif';

export default function SentenceNavigation({
  stories,
  onEnter3DSpace,
}: SentenceNavigationProps) {
  const [hoveredEmotion, setHoveredEmotion] = useState<string | null>(null);
  const hidePreviewTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );
  const surfaceBg = "#ffffff";
  const foreground = "var(--foreground)";
  const muted = "var(--page-muted)";
  const line = "rgba(58, 42, 35, 0.28)";
  const previewBg = "rgba(255, 255, 255, 0.92)";
  const previewBorder = "rgba(48, 35, 29, 0.12)";

  // Group stories by primary emotion
  const emotionGroups = new Map<string, Story[]>();
  stories.forEach((story) => {
    const primaryEmotion = story.metadata.emotions?.[0]?.name;
    if (primaryEmotion) {
      if (!emotionGroups.has(primaryEmotion)) {
        emotionGroups.set(primaryEmotion, []);
      }
      emotionGroups.get(primaryEmotion)!.push(story);
    }
  });

  const emotions = Array.from(emotionGroups.keys());

  const clearHidePreviewTimeout = () => {
    if (hidePreviewTimeoutRef.current) {
      clearTimeout(hidePreviewTimeoutRef.current);
      hidePreviewTimeoutRef.current = null;
    }
  };

  const handleEmotionHover = (emotion: string) => {
    clearHidePreviewTimeout();
    setHoveredEmotion(emotion);
  };

  const schedulePreviewHide = () => {
    clearHidePreviewTimeout();
    hidePreviewTimeoutRef.current = setTimeout(() => {
      setHoveredEmotion(null);
    }, 160);
  };

  useEffect(() => {
    return () => {
      clearHidePreviewTimeout();
    };
  }, []);

  const handleEmotionClick = (emotion: string) => {
    onEnter3DSpace({ emotions: [emotion] });
  };

  const handleDimensionClick = () => {
    // Enter 3D space with no filters (user can use compass to filter)
    onEnter3DSpace({});
  };

  return (
    <div
      className="relative min-h-screen flex flex-col items-center justify-center p-8 transition-colors duration-500"
      style={{ background: surfaceBg, color: foreground }}
    >
      <div className="editorial-panel-strong max-w-5xl rounded-[2rem] px-6 py-8 sm:px-10 sm:py-10">
        <div className="mb-8 text-center">
          <p className="editorial-kicker">Discovery Mode</p>
        </div>

        {/* Poetic sentence */}
        <div className="text-center text-2xl leading-relaxed md:text-4xl">
          <p className="mb-8 text-[clamp(2rem,4vw,3.35rem)] leading-[1.28]">
            Stories of{" "}
            {emotions.map((emotion, index) => (
              <React.Fragment key={emotion}>
                <button
                  className="relative inline-block underline transition-all duration-200 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--page-accent)] focus-visible:ring-offset-2 rounded-sm"
                  style={{ textDecorationColor: line, color: foreground }}
                  onMouseEnter={() => handleEmotionHover(emotion)}
                  onMouseLeave={schedulePreviewHide}
                  onClick={() => handleEmotionClick(emotion)}
                >
                  {emotion}
                </button>
                {index < emotions.length - 2 && ", "}
                {index === emotions.length - 2 && ", and "}
              </React.Fragment>
            ))}{" "}
            from diaspora voices.
          </p>

          <p className="text-xl md:text-2xl" style={{ color: muted }}>
            Navigate by{" "}
            <button
              className="underline transition-all duration-200 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--page-accent)] focus-visible:ring-offset-2 rounded-sm"
              style={{ textDecorationColor: line, color: foreground }}
              onClick={handleDimensionClick}
            >
              mood
            </button>
            ,{" "}
            <button
              className="underline transition-all duration-200 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--page-accent)] focus-visible:ring-offset-2 rounded-sm"
              style={{ textDecorationColor: line, color: foreground }}
              onClick={handleDimensionClick}
            >
              texture
            </button>
            ,{" "}
            <button
              className="underline transition-all duration-200 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--page-accent)] focus-visible:ring-offset-2 rounded-sm"
              style={{ textDecorationColor: line, color: foreground }}
              onClick={handleDimensionClick}
            >
              time
            </button>
            , or{" "}
            <button
              className="underline transition-all duration-200 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--page-accent)] focus-visible:ring-offset-2 rounded-sm"
              style={{ textDecorationColor: line, color: foreground }}
              onClick={handleDimensionClick}
            >
              place
            </button>
            .
          </p>
        </div>

        {/* Hover preview */}
        <div className="min-h-[220px] pt-2">
          {hoveredEmotion && (
            <div
              className="rounded-[1.6rem] border p-6 transition-all duration-300 backdrop-blur-sm"
              style={{ background: previewBg, borderColor: previewBorder }}
              onMouseEnter={clearHidePreviewTimeout}
              onMouseLeave={schedulePreviewHide}
            >
              <h3
                className="text-sm uppercase tracking-wider mb-4"
                style={{ color: muted }}
              >
                Stories with {hoveredEmotion}
              </h3>
              <div className="space-y-3">
                {emotionGroups
                  .get(hoveredEmotion)
                  ?.slice(0, 3)
                  .map((story) => (
                    <div key={story.metadata.slug}>
                      <p
                        className="font-medium"
                        style={{
                          fontFamily: SENTENCE_DISPLAY_FONT_FAMILY,
                        }}
                      >
                        {story.metadata.title}
                      </p>
                      {story.metadata.slogan && (
                        <p
                          className="text-sm mt-1"
                          style={{
                            color: muted,
                            fontFamily: SENTENCE_DISPLAY_FONT_FAMILY,
                          }}
                        >
                          {story.metadata.slogan}
                        </p>
                      )}
                    </div>
                  ))}
              </div>
            </div>
          )}
        </div>

        {/* Enter 3D Space button */}
        <div className="text-center">
          <button
            onClick={() => onEnter3DSpace()}
            className="editorial-pill-button cursor-pointer px-8 py-4 text-lg"
            style={{
              background: "rgba(23, 17, 16, 0.94)",
              color: "#fff7f2",
              borderColor: line,
            }}
          >
            Enter Story Space
          </button>
        </div>

        {/* Project info */}
        <div className="pt-8 text-center text-sm" style={{ color: muted }}>
          <p>
            {SITE_CONFIG.siteName} — {SITE_CONFIG.siteTagline}
          </p>
        </div>
      </div>
    </div>
  );
}
