"use client";

import { SITE_CONFIG } from "@/content/site";
import { useState } from "react";
import type { StoryMetadata } from "@/lib/content";
import { ARCHIVE_CONSTELLATION_THEME } from "@/lib/archive-constellation-theme";
import type { FilterState } from "@/types/emotion";
import { ConstellationScene } from "./ConstellationScene";
import DriftingCompass from "./DriftingCompass";

interface ArchiveConstellationViewProps {
  activeSlug?: string;
  allEmotions: string[];
  allGeography: string[];
  allTemporality: string[];
  allTextures: string[];
  filterState: FilterState;
  onFilterChange: (filter: FilterState) => void;
  onStoryOpen: (slug: string) => void;
  onThreadSelect: (slug: string | null) => void;
  onViewToggle: () => void;
  selectedThread: string | null;
  stories: StoryMetadata[];
}

const EMPTY_FILTER_STATE: FilterState = {
  emotions: [],
  geography: [],
  intensity: 0.7,
  temporality: [],
  textures: [],
};

export function ArchiveConstellationView({
  activeSlug,
  allEmotions,
  allGeography,
  allTemporality,
  allTextures,
  filterState,
  onFilterChange,
  onStoryOpen,
  onThreadSelect,
  onViewToggle,
  selectedThread,
  stories,
}: ArchiveConstellationViewProps) {
  const [resetSignal, setResetSignal] = useState(0);

  const resetView = () => {
    onThreadSelect(null);
    onFilterChange(EMPTY_FILTER_STATE);
    setResetSignal((value) => value + 1);
  };

  return (
    <div className="relative h-screen w-full">
      <ConstellationScene
        activeSlug={activeSlug}
        filterState={filterState}
        onStoryOpen={onStoryOpen}
        onThreadSelect={onThreadSelect}
        resetSignal={resetSignal}
        selectedThread={selectedThread}
        stories={stories}
      />

      <div
        className="absolute left-8 top-8 max-w-md"
        style={{ color: ARCHIVE_CONSTELLATION_THEME.overlayText }}
      >
        <h1 className="mb-2 text-4xl font-light">{SITE_CONFIG.siteName}</h1>
        <p
          className="mb-3 text-sm"
          style={{ color: ARCHIVE_CONSTELLATION_THEME.overlayMuted }}
        >
          {selectedThread
            ? "Weaving mode • Click story again to deselect • Explore connections"
            : "Constellation edges show story relationships • Click spheres to weave threads • Use compass to filter"}
        </p>
        <p
          className="text-xs"
          style={{ color: ARCHIVE_CONSTELLATION_THEME.overlayMuted }}
        >
          Tip: Click to weave. Double-click a sphere to open its story.
        </p>
      </div>

      {selectedThread && (
        <button
          onClick={() => onStoryOpen(selectedThread)}
          className="absolute bottom-8 left-8 min-h-11 cursor-pointer rounded-lg border px-4 py-2 backdrop-blur-sm transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--page-accent)] focus-visible:ring-offset-2"
          style={{
            background: ARCHIVE_CONSTELLATION_THEME.buttonBackground,
            borderColor: ARCHIVE_CONSTELLATION_THEME.buttonBorder,
            color: ARCHIVE_CONSTELLATION_THEME.buttonText,
          }}
        >
          Open Story
        </button>
      )}

      <DriftingCompass
        emotions={allEmotions}
        filterState={filterState}
        geography={allGeography}
        onFilterChange={onFilterChange}
        temporality={allTemporality}
        textures={allTextures}
      />

      <button
        onClick={onViewToggle}
        className="absolute right-8 top-8 flex min-h-11 cursor-pointer items-center gap-2 rounded-lg border px-4 py-2 backdrop-blur-sm transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--page-accent)] focus-visible:ring-offset-2"
        style={{
          background: ARCHIVE_CONSTELLATION_THEME.buttonBackground,
          borderColor: ARCHIVE_CONSTELLATION_THEME.buttonBorder,
          color: ARCHIVE_CONSTELLATION_THEME.buttonText,
        }}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-4 w-4"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"
          />
        </svg>
        <span>List View</span>
      </button>

      <button
        onClick={resetView}
        className="absolute bottom-8 right-8 min-h-11 cursor-pointer rounded-lg border px-4 py-2 backdrop-blur-sm transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--page-accent)] focus-visible:ring-offset-2"
        style={{
          background: ARCHIVE_CONSTELLATION_THEME.buttonBackground,
          borderColor: ARCHIVE_CONSTELLATION_THEME.buttonBorder,
          color: ARCHIVE_CONSTELLATION_THEME.buttonText,
        }}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="mr-2 inline-block h-5 w-5"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
          />
        </svg>
        Reset All
      </button>
    </div>
  );
}
