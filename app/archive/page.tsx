import { getAllStories, getStoryFilters } from "@/lib/content";
import { StorySpaceClient } from "@/components/StorySpaceClient";

export default function ArchivePage() {
  const stories = getAllStories();
  const storyMetadata = stories.map((s) => s.metadata);
  const filters = getStoryFilters(stories);

  return (
    <StorySpaceClient
      stories={storyMetadata}
      fullStories={stories}
      allEmotions={filters.emotions}
      allTextures={filters.textures}
      allTemporality={filters.temporality}
      allGeography={filters.geography}
      initialView="2d-list"
    />
  );
}
