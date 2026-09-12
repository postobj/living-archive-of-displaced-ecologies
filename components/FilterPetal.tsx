"use client";

import { ARCHIVE_CONSTELLATION_THEME } from "@/lib/archive-constellation-theme";

interface FilterPetalProps {
  title: string;
  tags: string[];
  selectedTags: string[];
  onTagToggle: (tag: string) => void;
  position: "top" | "right" | "bottom" | "left";
  isExpanded: boolean;
}

export default function FilterPetal({
  title,
  tags,
  selectedTags,
  onTagToggle,
  position,
  isExpanded,
}: FilterPetalProps) {
  if (!isExpanded) return null;

  // Position styles for each petal - all expand upward and rightward from bottom-left compass
  const positionStyles = {
    top: "bottom-full mb-4 left-0", // Mood: directly above
    right: "bottom-full mb-4 left-20", // Texture: above and slightly right
    bottom: "left-full ml-4 bottom-0", // Time: to the right
    left: "left-full ml-4 bottom-16", // Place: to the right and slightly up
  };

  return (
    <div
      className={`absolute ${positionStyles[position]} backdrop-blur-sm rounded-lg p-3 max-w-[280px] border transition-all duration-300 shadow-xl`}
      style={{
        background: ARCHIVE_CONSTELLATION_THEME.panelBackground,
        borderColor: ARCHIVE_CONSTELLATION_THEME.panelBorder,
      }}
    >
      <h3
        className="text-xs font-medium mb-2 uppercase tracking-wider"
        style={{ color: ARCHIVE_CONSTELLATION_THEME.panelText }}
      >
        {title}
      </h3>
      <div className="flex flex-wrap gap-1.5">
        {tags.map((tag) => {
          const isSelected = selectedTags.includes(tag);
          return (
            <button
              key={tag}
              onClick={() => onTagToggle(tag)}
              className="cursor-pointer px-2.5 py-1 rounded-full text-xs transition-all duration-200 border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--page-accent)] focus-visible:ring-offset-1"
              style={
                isSelected
                  ? {
                      background:
                        ARCHIVE_CONSTELLATION_THEME.activeButtonBackground,
                      color: ARCHIVE_CONSTELLATION_THEME.activeButtonText,
                      borderColor:
                        ARCHIVE_CONSTELLATION_THEME.activeButtonBackground,
                      fontWeight: 500,
                    }
                  : {
                      background: "transparent",
                      color: ARCHIVE_CONSTELLATION_THEME.tagIdleText,
                      borderColor: ARCHIVE_CONSTELLATION_THEME.tagIdleBorder,
                    }
              }
            >
              {tag}
            </button>
          );
        })}
      </div>
    </div>
  );
}
