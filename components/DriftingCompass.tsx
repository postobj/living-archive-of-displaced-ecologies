"use client";

import { useState, type ChangeEvent } from "react";
import FilterPetal from "./FilterPetal";
import type { FilterState } from "@/types/emotion";
import { ARCHIVE_CONSTELLATION_THEME } from "@/lib/archive-constellation-theme";

interface DriftingCompassProps {
  emotions: string[];
  textures: string[];
  temporality: string[];
  geography: string[];
  filterState: FilterState;
  onFilterChange: (newState: FilterState) => void;
}

export default function DriftingCompass({
  emotions,
  textures,
  temporality,
  geography,
  filterState,
  onFilterChange,
}: DriftingCompassProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const toggleTag = (dimension: keyof FilterState, tag: string) => {
    if (dimension === "intensity") return;

    const currentTags = filterState[dimension] as string[];
    const newTags = currentTags.includes(tag)
      ? currentTags.filter((t) => t !== tag)
      : [...currentTags, tag];

    onFilterChange({
      ...filterState,
      [dimension]: newTags,
    });
  };

  const handleIntensityChange = (e: ChangeEvent<HTMLInputElement>) => {
    onFilterChange({
      ...filterState,
      intensity: parseFloat(e.target.value),
    });
  };

  const hasActiveFilters =
    filterState.emotions.length > 0 ||
    filterState.textures.length > 0 ||
    filterState.temporality.length > 0 ||
    filterState.geography.length > 0;

  return (
    <div
      className="fixed z-50 compass-drift"
      style={{
        left: "32px",
        bottom: "100px",
      }}
    >
      {/* Compass button */}
      <div className="relative">
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="w-16 h-16 cursor-pointer rounded-full backdrop-blur-md border-2 transition-all duration-300 flex items-center justify-center group relative focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--page-accent)] focus-visible:ring-offset-2"
          style={{
            background: hasActiveFilters
              ? ARCHIVE_CONSTELLATION_THEME.activeButtonBackground
              : ARCHIVE_CONSTELLATION_THEME.cardBackground,
            borderColor: hasActiveFilters
              ? ARCHIVE_CONSTELLATION_THEME.activeButtonBackground
              : ARCHIVE_CONSTELLATION_THEME.panelBorder,
            color: hasActiveFilters
              ? ARCHIVE_CONSTELLATION_THEME.activeButtonText
              : ARCHIVE_CONSTELLATION_THEME.buttonText,
          }}
          aria-label="Toggle filter compass"
          title="Filter stories"
        >
          {/* Tooltip */}
          <span
            className="absolute left-full ml-3 px-3 py-1 text-sm rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none"
            style={{
              background: ARCHIVE_CONSTELLATION_THEME.tooltipBackground,
              color: ARCHIVE_CONSTELLATION_THEME.panelText,
            }}
          >
            Filter Stories
          </span>
          <svg
            className="w-8 h-8"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            {/* Compass icon */}
            <circle cx="12" cy="12" r="10" strokeWidth={2} />
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 2v4m0 12v4M2 12h4m12 0h4"
            />
            <path fill="currentColor" d="M12 8l2 4-4 2-2-4 4-2z" />
          </svg>
        </button>

        {/* Filter petals */}
        <FilterPetal
          title="Mood"
          tags={emotions}
          selectedTags={filterState.emotions}
          onTagToggle={(tag) => toggleTag("emotions", tag)}
          position="top"
          isExpanded={isExpanded}
        />
        <FilterPetal
          title="Texture"
          tags={textures}
          selectedTags={filterState.textures}
          onTagToggle={(tag) => toggleTag("textures", tag)}
          position="right"
          isExpanded={isExpanded}
        />
        <FilterPetal
          title="Time"
          tags={temporality}
          selectedTags={filterState.temporality}
          onTagToggle={(tag) => toggleTag("temporality", tag)}
          position="bottom"
          isExpanded={isExpanded}
        />
        <FilterPetal
          title="Place"
          tags={geography}
          selectedTags={filterState.geography}
          onTagToggle={(tag) => toggleTag("geography", tag)}
          position="left"
          isExpanded={isExpanded}
        />

        {/* Filter intensity slider */}
        {isExpanded && hasActiveFilters && (
          <div
            className="absolute left-full ml-4 bottom-32 backdrop-blur-sm rounded-lg p-3 border w-[200px] shadow-xl"
            style={{
              background: ARCHIVE_CONSTELLATION_THEME.panelBackground,
              borderColor: ARCHIVE_CONSTELLATION_THEME.panelBorder,
            }}
          >
            <label
              className="text-xs uppercase tracking-wider mb-2 block"
              style={{ color: ARCHIVE_CONSTELLATION_THEME.panelText }}
            >
              Intensity
            </label>
            <input
              type="range"
              min="0"
              max="1"
              step="0.1"
              value={filterState.intensity}
              onChange={handleIntensityChange}
              className="w-full accent-[var(--page-accent)]"
            />
            <div
              className="text-xs mt-1 text-center"
              style={{ color: ARCHIVE_CONSTELLATION_THEME.panelMuted }}
            >
              {Math.round(filterState.intensity * 100)}%
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
