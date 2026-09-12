import type { StoryMetadata } from "@/lib/content";

export interface SearchResultRow {
  index: string;
  slug: string;
  title: string;
  contributor: string;
  type: string;
  year: string;
}

export function normalizeSearchQuery(value: string): string {
  return value.trim().toLowerCase();
}

export function parseStoryYear(dateText: string): string {
  const parsedDate = new Date(dateText);
  if (Number.isNaN(parsedDate.getTime())) {
    return "----";
  }

  return String(parsedDate.getFullYear());
}

export function deriveStoryType(story: StoryMetadata): string {
  const theme = story.themes?.[0];
  if (!theme) {
    return "Story";
  }

  return theme
    .split(/[-_\s]+/)
    .map((segment) =>
      segment ? segment[0].toUpperCase() + segment.slice(1).toLowerCase() : "",
    )
    .join(" ");
}

export function matchesStoryQuery(
  story: StoryMetadata,
  normalizedQuery: string,
): boolean {
  if (!normalizedQuery) {
    return true;
  }

  const themes = story.themes.join(" ");
  const emotionTags =
    story.emotions?.map((emotion) => emotion.name).join(" ") ?? "";
  const searchableText = [
    story.title,
    story.contributor,
    story.slogan ?? "",
    themes,
    emotionTags,
  ]
    .join(" ")
    .toLowerCase();

  return searchableText.includes(normalizedQuery);
}

export function filterStoriesByQuery(
  stories: StoryMetadata[],
  normalizedQuery: string,
): StoryMetadata[] {
  return stories.filter((story) => matchesStoryQuery(story, normalizedQuery));
}

export function toSearchResultRows(
  stories: StoryMetadata[],
): SearchResultRow[] {
  return stories.map((story, index) => ({
    index: String(index + 1).padStart(2, "0"),
    slug: story.slug,
    title: story.title,
    contributor: story.contributor,
    type: deriveStoryType(story),
    year: parseStoryYear(story.date),
  }));
}
