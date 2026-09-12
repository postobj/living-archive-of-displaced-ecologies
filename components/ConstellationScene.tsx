"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  type ComponentType,
} from "react";
import { Canvas } from "@react-three/fiber";
import { Line, OrbitControls } from "@react-three/drei";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";
import type { StoryMetadata, Story } from "@/lib/content";
import { ARCHIVE_CONSTELLATION_THEME } from "@/lib/archive-constellation-theme";
import type { FilterState } from "@/types/emotion";
import {
  calculateEmotionalVector,
  generateConstellationPositions,
  getConstellationEdges,
  getTopConnections,
} from "@/lib/positioning";
import { SphereStoryNode, type ConstellationStoryNodeProps } from "./StoryNode";

interface ConstellationSceneProps {
  activeSlug?: string;
  filterState: FilterState;
  nodeComponent?: ComponentType<ConstellationStoryNodeProps>;
  onStoryOpen: (slug: string) => void;
  onThreadSelect: (slug: string | null) => void;
  resetSignal?: number;
  selectedThread: string | null;
  stories: StoryMetadata[];
}

export function ConstellationScene({
  activeSlug,
  filterState,
  nodeComponent: NodeComponent = SphereStoryNode,
  onStoryOpen,
  onThreadSelect,
  resetSignal = 0,
  selectedThread,
  stories,
}: ConstellationSceneProps) {
  const controlsRef = useRef<OrbitControlsImpl>(null);
  const fullStories: Story[] = useMemo(
    () =>
      stories.map((metadata) => ({
        metadata,
        content: "",
      })),
    [stories],
  );
  const positions = useMemo(
    () =>
      generateConstellationPositions(
        fullStories,
        filterState,
        selectedThread,
        10,
      ),
    [filterState, fullStories, selectedThread],
  );
  const selectedStory = useMemo(
    () =>
      fullStories.find((story) => story.metadata.slug === selectedThread) ??
      null,
    [fullStories, selectedThread],
  );
  const connections = useMemo(() => {
    if (!selectedStory) {
      return [];
    }

    return getTopConnections(selectedStory, fullStories, 5);
  }, [fullStories, selectedStory]);
  const connectedSet = useMemo(() => new Set(connections), [connections]);
  const ambientEdges = useMemo(() => {
    if (selectedThread) {
      return [];
    }

    return getConstellationEdges(fullStories, 2);
  }, [fullStories, selectedThread]);
  const selectedPosition = selectedThread
    ? positions.get(selectedThread)?.position
    : undefined;
  const storyColors = useMemo(() => {
    const colors = new Map<string, string>();

    stories.forEach((story) => {
      const vector = calculateEmotionalVector(story.emotions);
      const hue = ((vector.valence + 1) / 2) * 180 + 180;
      const saturation = ((vector.arousal + 1) / 2) * 60 + 40;
      const lightness = ((vector.dominance + 1) / 2) * 30 + 40;
      colors.set(story.slug, `hsl(${hue}, ${saturation}%, ${lightness}%)`);
    });

    return colors;
  }, [stories]);

  useEffect(() => {
    controlsRef.current?.reset();
  }, [resetSignal]);

  const handleNodeSelect = useCallback(
    (slug: string) => {
      onThreadSelect(selectedThread === slug ? null : slug);
    },
    [onThreadSelect, selectedThread],
  );

  if (stories.length === 0) {
    return (
      <div
        className="flex h-screen w-full items-center justify-center"
        style={{
          background: ARCHIVE_CONSTELLATION_THEME.canvasBackground,
          color: ARCHIVE_CONSTELLATION_THEME.overlayText,
        }}
      >
        <div className="text-center">
          <p className="mb-4 text-xl">No stories found</p>
          <p
            className="text-sm"
            style={{ color: ARCHIVE_CONSTELLATION_THEME.overlayMuted }}
          >
            Please add stories to the archive
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative h-screen w-full">
      <Canvas
        camera={{ position: [0, 5, 15], fov: 60 }}
        gl={{
          alpha: false,
          antialias: true,
          powerPreference: "high-performance",
        }}
      >
        <color
          attach="background"
          args={[ARCHIVE_CONSTELLATION_THEME.canvasBackground]}
        />
        <ambientLight intensity={0.45} />
        <pointLight position={[10, 10, 10]} intensity={1} />
        <pointLight
          position={[-10, -10, -10]}
          intensity={0.3}
          color="#f59e0b"
        />

        {stories.map((story) => {
          const posData = positions.get(story.slug);
          if (!posData) {
            return null;
          }

          return (
            <NodeComponent
              key={story.slug}
              color={storyColors.get(story.slug) ?? "#ffffff"}
              displayText={story.title}
              isActive={story.slug === activeSlug}
              isConnected={connectedSet.has(story.slug)}
              isSelected={story.slug === selectedThread}
              onOpen={onStoryOpen}
              onSelect={handleNodeSelect}
              position={posData.position}
              slug={story.slug}
              title={story.title}
              visibility={posData.visibility}
            />
          );
        })}

        {!selectedThread &&
          ambientEdges.map(([fromSlug, toSlug]) => {
            const fromPosition = positions.get(fromSlug)?.position;
            const toPosition = positions.get(toSlug)?.position;

            if (!fromPosition || !toPosition) {
              return null;
            }

            return (
              <Line
                key={`${fromSlug}-${toSlug}`}
                points={[fromPosition, toPosition]}
                color={ARCHIVE_CONSTELLATION_THEME.ambientLine}
                lineWidth={1}
                opacity={0.12}
                transparent
              />
            );
          })}

        {selectedThread &&
          connections.map((connectedSlug) => {
            const connectedPos = positions.get(connectedSlug)?.position;

            if (!selectedPosition || !connectedPos) {
              return null;
            }

            return (
              <Line
                key={`${selectedThread}-${connectedSlug}`}
                points={[selectedPosition, connectedPos]}
                color={ARCHIVE_CONSTELLATION_THEME.connectionLine}
                lineWidth={1}
                opacity={0.45}
                transparent
              />
            );
          })}

        <OrbitControls
          ref={controlsRef}
          enablePan
          enableRotate
          enableZoom
          maxDistance={30}
          minDistance={5}
        />
      </Canvas>
    </div>
  );
}
