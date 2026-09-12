"use client";

import { SITE_CONFIG } from "@/content/site";
import { useState, useEffect, type CSSProperties } from "react";
import dynamic from "next/dynamic";
import type { StoryMetadata, Story } from "@/lib/content";
import type { FilterState } from "@/types/emotion";
import { isWebGLSupported } from "@/lib/webgl";
import { HomeBackWaveButton } from "./HomeBackWaveButton";
import SentenceNavigation from "./SentenceNavigation";
import FallbackView from "./FallbackView";
import { Story2DView } from "./Story2DView";
import { useRouter } from "next/navigation";
import { ARCHIVE_CONSTELLATION_THEME } from "@/lib/archive-constellation-theme";

const ArchiveConstellationView = dynamic(
  () =>
    import("./ArchiveConstellationView").then((mod) => ({
      default: mod.ArchiveConstellationView,
    })),
  {
    ssr: false,
    loading: () => (
      <div
        className="w-full h-screen flex items-center justify-center"
        style={{ background: "var(--background)", color: "var(--foreground)" }}
      >
        <div className="text-center">
          <div className="text-2xl mb-4">Loading {SITE_CONFIG.siteName}...</div>
          <div className="animate-pulse" style={{ color: "var(--page-muted)" }}>
            Preparing 3D space
          </div>
        </div>
      </div>
    ),
  },
);

interface StorySpaceClientProps {
  stories: StoryMetadata[];
  fullStories: Story[];
  allEmotions: string[];
  allTextures: string[];
  allTemporality: string[];
  allGeography: string[];
  initialView?: "sentence" | "3d" | "2d-list";
}

type StorySpaceView = "sentence" | "3d" | "2d-list" | "fallback";

const lightArchiveThemeVars: CSSProperties = {
  "--background": ARCHIVE_CONSTELLATION_THEME.canvasBackground,
  "--foreground": "#000000",
  "--page-surface": "#ffffff",
  "--page-border": ARCHIVE_CONSTELLATION_THEME.buttonBorder,
  "--page-muted": "rgba(0, 0, 0, 0.62)",
  "--page-accent": "#bb3a2d",
  "--back-arrow-default": "#000000",
} as CSSProperties;

export function StorySpaceClient({
  stories,
  fullStories,
  allEmotions,
  allTextures,
  allTemporality,
  allGeography,
  initialView = "sentence",
}: StorySpaceClientProps) {
  const [view, setView] = useState<StorySpaceView>(initialView);
  const [webglSupported, setWebglSupported] = useState(true);
  const router = useRouter();

  // Lifted state for sharing between 3D and 2D views
  const [selectedThread, setSelectedThread] = useState<string | null>(null);
  const [filterState, setFilterState] = useState<FilterState>({
    emotions: [],
    textures: [],
    temporality: [],
    geography: [],
    intensity: 0.7,
  });

  // Resolve view from URL params — deferred to client-only to avoid hydration mismatch
  useEffect(() => {
    let cancelled = false;
    requestAnimationFrame(() => {
      if (cancelled) return;

      const params = new URLSearchParams(window.location.search);
      const requestedView = params.get("view");
      if (
        requestedView === "sentence" ||
        requestedView === "3d" ||
        requestedView === "2d-list"
      ) {
        setView(requestedView);
      }
    });
    return () => {
      cancelled = true;
    };
  }, []);

  // Check WebGL support — deferred to client-only; propagate to view state
  useEffect(() => {
    let cancelled = false;
    requestAnimationFrame(() => {
      if (cancelled) return;

      const supported = isWebGLSupported();
      setWebglSupported(supported);
      if (!supported) {
        setView((prev) => (prev === "3d" ? "fallback" : prev));
      }
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const effectiveView: StorySpaceView =
    view === "3d" && !webglSupported ? "fallback" : view;

  const handleEnter3DSpace = (filter?: Partial<FilterState>) => {
    // Initialize filter state from sentence navigation
    if (filter) {
      setFilterState({
        emotions: filter.emotions || [],
        textures: filter.textures || [],
        temporality: filter.temporality || [],
        geography: filter.geography || [],
        intensity: filter.intensity || 0.7,
      });
    }
    setView("3d");
  };

  const handleStoryClick = (slug: string) => {
    const returnView =
      effectiveView === "fallback" ? initialView : effectiveView;
    router.push(`/stories/${slug}?from=${encodeURIComponent(returnView)}`);
  };

  useEffect(() => {
    fullStories.forEach((story) => {
      router.prefetch(`/stories/${story.metadata.slug}`);
    });
  }, [fullStories, router]);

  if (effectiveView === "sentence") {
    return (
      <>
        <HomeBackWaveButton />
        <SentenceNavigation
          stories={fullStories}
          onEnter3DSpace={handleEnter3DSpace}
        />
      </>
    );
  }

  if (effectiveView === "fallback") {
    return (
      <>
        <HomeBackWaveButton />
        <FallbackView
          stories={stories}
          onStoryClick={handleStoryClick}
          onBackTo3D={() => {
            setWebglSupported(isWebGLSupported());
            setView("3d");
          }}
        />
      </>
    );
  }

  if (effectiveView === "2d-list") {
    return (
      <div style={lightArchiveThemeVars}>
        <HomeBackWaveButton />
        <Story2DView stories={fullStories} onStoryClick={handleStoryClick} />
      </div>
    );
  }

  return (
    <>
      <HomeBackWaveButton />
      <ArchiveConstellationView
        stories={stories}
        onStoryOpen={handleStoryClick}
        filterState={filterState}
        onFilterChange={setFilterState}
        selectedThread={selectedThread}
        onThreadSelect={setSelectedThread}
        onViewToggle={() => setView("2d-list")}
        allEmotions={allEmotions}
        allTextures={allTextures}
        allTemporality={allTemporality}
        allGeography={allGeography}
      />
    </>
  );
}
