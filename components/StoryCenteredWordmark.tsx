"use client";

import { useEffect, useMemo, useState } from "react";
import { GlassWordmark } from "@/components/glass/GlassWordmark";
import { StoryWordmarkSourceCanvas } from "@/components/glass/StoryWordmarkSourceCanvas";
import { useGlassCapability } from "@/components/glass/useGlassCapability";
import { GLASS_PROFILES } from "@/lib/glass";
import {
  HOME_WORDMARK_MAX_FONT_SIZE_PX,
  getFittedHomeWordmarkFontSize,
} from "@/lib/homepage-wordmark";
import {
  STORY_WORDMARK_FONT_SCALE,
  getStoryWordmarkFontSize,
  splitStoryWordmarkLines,
} from "@/lib/story-wordmark";
import {
  clearTextMeasureCache,
  measureTextNaturalWidth,
} from "@/lib/text-measurement";

const WORDMARK_FONT_FAMILY =
  '"Segment", "HuiWenFangSong", "Courier New", monospace';
const WORDMARK_LETTER_SPACING_EM = 0.12;

function makeFontString(fontSizePx: number): string {
  return `400 ${fontSizePx}px ${WORDMARK_FONT_FAMILY}`;
}

interface StoryCenteredWordmarkProps {
  wordmarkText: string;
  title: string;
  contributor: string;
  year?: string;
  slogan?: string;
  hidden?: boolean;
}

function getStoryWordmarkHorizontalPadding(viewportWidthPx: number): number {
  if (viewportWidthPx < 640) {
    return 52;
  }

  if (viewportWidthPx < 1024) {
    return 88;
  }

  return 124;
}

export function StoryCenteredWordmark({
  wordmarkText,
  title,
  contributor,
  year,
  slogan,
  hidden = false,
}: StoryCenteredWordmarkProps) {
  const [sourceCanvas, setSourceCanvas] = useState<HTMLCanvasElement | null>(
    null,
  );
  const [wordmarkLines, setWordmarkLines] = useState<string[]>([wordmarkText]);
  const [wordmarkFontSize, setWordmarkFontSize] = useState<number | null>(null);
  const splitCandidateLines = useMemo(
    () => splitStoryWordmarkLines(wordmarkText),
    [wordmarkText],
  );

  const glassRenderer = useGlassCapability({
    hasCanvasSource: sourceCanvas !== null,
    preferScene: true,
  });

  useEffect(() => {
    const updateWordmarkSize = () => {
      const viewportWidthPx = window.visualViewport?.width ?? window.innerWidth;
      const horizontalPaddingPx =
        getStoryWordmarkHorizontalPadding(viewportWidthPx);
      const availableWidthPx = Math.max(
        0,
        viewportWidthPx - horizontalPaddingPx,
      );

      if (viewportWidthPx <= 0) {
        return;
      }

      const maxFont = makeFontString(HOME_WORDMARK_MAX_FONT_SIZE_PX);
      const maxLetterSpacingPx =
        WORDMARK_LETTER_SPACING_EM * HOME_WORDMARK_MAX_FONT_SIZE_PX;

      const measuredWidthAtMaxFontSize = measureTextNaturalWidth(
        wordmarkText,
        maxFont,
        maxLetterSpacingPx,
      );

      if (measuredWidthAtMaxFontSize <= 0) {
        return;
      }

      const baseFittedFontSizePx = getFittedHomeWordmarkFontSize({
        measuredWidthAtMaxFontSize,
        viewportWidthPx,
        horizontalPaddingPx,
      });
      const scaledSingleLineFontSizePx = Number(
        (baseFittedFontSizePx * STORY_WORDMARK_FONT_SCALE).toFixed(2),
      );
      const measuredWidthAtScaledSingleLine =
        (measuredWidthAtMaxFontSize * scaledSingleLineFontSizePx) /
        HOME_WORDMARK_MAX_FONT_SIZE_PX;

      if (
        measuredWidthAtScaledSingleLine <= availableWidthPx ||
        splitCandidateLines.length === 1
      ) {
        setWordmarkLines([wordmarkText]);
        setWordmarkFontSize(
          getStoryWordmarkFontSize({
            baseFittedFontSizePx,
            measuredLineWidthAtMaxFontSize: measuredWidthAtMaxFontSize,
            availableWidthPx,
          }),
        );
        return;
      }

      const splitLineWidths = splitCandidateLines.map((line) =>
        measureTextNaturalWidth(line, maxFont, maxLetterSpacingPx),
      );
      const longestSplitLineWidth = Math.max(...splitLineWidths, 0);

      setWordmarkLines(splitCandidateLines);
      setWordmarkFontSize(
        getStoryWordmarkFontSize({
          baseFittedFontSizePx,
          measuredLineWidthAtMaxFontSize: longestSplitLineWidth,
          availableWidthPx,
        }),
      );
    };

    updateWordmarkSize();

    window.addEventListener("resize", updateWordmarkSize);
    window.visualViewport?.addEventListener("resize", updateWordmarkSize);

    const fontSet = document.fonts;

    fontSet.ready
      .then(() => {
        clearTextMeasureCache();
        updateWordmarkSize();
      })
      .catch(() => {});
    fontSet.addEventListener("loadingdone", () => {
      clearTextMeasureCache();
      updateWordmarkSize();
    });

    return () => {
      window.removeEventListener("resize", updateWordmarkSize);
      window.visualViewport?.removeEventListener("resize", updateWordmarkSize);
      fontSet.removeEventListener("loadingdone", updateWordmarkSize);
    };
  }, [splitCandidateLines, wordmarkText]);

  if (hidden) {
    return null;
  }

  return (
    <div className="pointer-events-none" aria-hidden="true">
      <StoryWordmarkSourceCanvas
        title={title}
        contributor={contributor}
        year={year}
        slogan={slogan}
        onCanvasReady={setSourceCanvas}
      />
      <div className="story-figma-wordmark">
        {wordmarkLines.map((line, index) => (
          <GlassWordmark
            key={`${line}-${index}`}
            text={line}
            profile={GLASS_PROFILES.homeWordmark}
            renderer={glassRenderer}
            sourceCanvas={sourceCanvas}
            variant="story"
            className="story-figma-wordmark-line"
            style={
              wordmarkFontSize === null
                ? undefined
                : { fontSize: `${wordmarkFontSize}px` }
            }
          />
        ))}
      </div>
    </div>
  );
}
