import fs from "fs";
import path from "path";
import matter from "gray-matter";
import type {
  EmotionTag,
  TextureTag,
  TemporalityTag,
  GeographyTag,
  EmotionalVector,
} from "@/types/emotion";
import { calculateEmotionalVector } from "./positioning";

const contentDirectory = path.join(process.cwd(), "content");
const storiesDirectory = path.join(contentDirectory, "stories");

export interface StoryMetadata {
  storyId?: string; // Stable external identifier for artist update workflows
  title: string;
  contributor: string;
  date: string;
  excerpt?: string; // One-sentence summary for homepage
  slogan?: string; // Tagline shown on the homepage constellation network
  posterShortText?: string; // Short phrase used in archive red panel
  artistLinks?: StoryArtistLink[]; // Optional artist website / social links
  materials?: string[]; // Optional materials list shown in story header
  visibility?: "public" | "community" | "private";
  consentVersion?: string;
  consentConfirmedAt?: string;

  // Multi-dimensional tags
  emotions?: EmotionTag[];
  textures?: TextureTag[];
  temporality?: TemporalityTag[];
  geography?: GeographyTag[];

  // Legacy themes (keep for backward compatibility)
  themes: string[];

  // Optional media
  audioFile?: string;
  imageFile?: string;
  imageFiles?: string[];
  videoUrl?: string;

  // Explicit story connections
  connections?: string[];

  slug: string;
}

export interface Story {
  metadata: StoryMetadata;
  content: string;
}

export interface StoryArtistLink {
  label: string;
  url: string;
}

export interface StoryFilters {
  emotions: string[];
  textures: string[];
  temporality: string[];
  geography: string[];
}

export interface StoryQueryOptions {
  includePrivate?: boolean;
}

let cachedStories: Story[] | null = null;
let cachedStoryIndex: Map<string, Story> | null = null;

function isPubliclyVisibleStory(story: Story): boolean {
  return story.metadata.visibility !== "private";
}

function isValidArtistLinkUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

function normalizeStoryMetadata(
  slug: string,
  data: Partial<StoryMetadata>,
): StoryMetadata {
  const materials =
    Array.isArray(data.materials) && data.materials.length > 0
      ? data.materials
          .map((item) => (typeof item === "string" ? item.trim() : ""))
          .filter((item): item is string => item.length > 0)
      : undefined;

  const imageFiles =
    Array.isArray(data.imageFiles) && data.imageFiles.length > 0
      ? data.imageFiles.filter(
          (item): item is string =>
            typeof item === "string" && item.trim().length > 0,
        )
      : undefined;

  const artistLinks =
    Array.isArray(data.artistLinks) && data.artistLinks.length > 0
      ? data.artistLinks.flatMap((item) => {
          if (
            !item ||
            typeof item !== "object" ||
            typeof item.label !== "string" ||
            typeof item.url !== "string"
          ) {
            return [];
          }

          const label = item.label.trim();
          const url = item.url.trim();
          if (!label || !url || !isValidArtistLinkUrl(url)) {
            return [];
          }

          return [{ label, url }];
        })
      : undefined;

  return {
    storyId: data.storyId ?? slug,
    title: data.title ?? slug,
    contributor: data.contributor ?? "Anonymous",
    date: data.date ?? "",
    excerpt: data.excerpt,
    slogan: data.slogan ?? data.excerpt,
    posterShortText: data.posterShortText,
    artistLinks,
    materials,
    visibility:
      data.visibility === "public" ||
      data.visibility === "community" ||
      data.visibility === "private"
        ? data.visibility
        : undefined,
    consentVersion:
      typeof data.consentVersion === "string" ? data.consentVersion : undefined,
    consentConfirmedAt:
      typeof data.consentConfirmedAt === "string"
        ? data.consentConfirmedAt
        : undefined,
    emotions: data.emotions,
    textures: data.textures,
    temporality: data.temporality,
    geography: data.geography,
    themes: data.themes ?? [],
    audioFile: data.audioFile,
    imageFile: data.imageFile,
    imageFiles,
    videoUrl: typeof data.videoUrl === "string" ? data.videoUrl : undefined,
    connections: data.connections,
    slug,
  };
}

function readStoriesFromDisk(): Story[] {
  if (!fs.existsSync(storiesDirectory)) {
    return [];
  }

  const fileNames = fs.readdirSync(storiesDirectory);
  const stories = fileNames
    .filter((fileName) => fileName.endsWith(".md") || fileName.endsWith(".mdx"))
    .map((fileName) => {
      const slug = fileName.replace(/\.mdx?$/, "");
      const fullPath = path.join(storiesDirectory, fileName);
      const fileContents = fs.readFileSync(fullPath, "utf8");
      const { data, content } = matter(fileContents);

      return {
        metadata: normalizeStoryMetadata(slug, data as Partial<StoryMetadata>),
        content,
      };
    });

  stories.sort((a, b) => a.metadata.slug.localeCompare(b.metadata.slug));
  return stories;
}

function readStoryBySlugFromDisk(slug: string): Story | null {
  if (!fs.existsSync(storiesDirectory)) {
    return null;
  }

  const candidatePaths = [
    path.join(storiesDirectory, `${slug}.md`),
    path.join(storiesDirectory, `${slug}.mdx`),
  ];

  const fullPath = candidatePaths.find((candidate) => fs.existsSync(candidate));
  if (!fullPath) {
    return null;
  }

  const fileContents = fs.readFileSync(fullPath, "utf8");
  const { data, content } = matter(fileContents);

  return {
    metadata: normalizeStoryMetadata(slug, data as Partial<StoryMetadata>),
    content,
  };
}

export function getAllStories(options: StoryQueryOptions = {}): Story[] {
  const { includePrivate = false } = options;

  if (process.env.NODE_ENV === "development") {
    const stories = readStoriesFromDisk();
    return includePrivate
      ? stories
      : stories.filter((story) => isPubliclyVisibleStory(story));
  }

  if (!cachedStories) {
    cachedStories = readStoriesFromDisk();
    cachedStoryIndex = new Map(
      cachedStories.map((story) => [story.metadata.slug, story]),
    );
  }

  return includePrivate
    ? cachedStories
    : cachedStories.filter((story) => isPubliclyVisibleStory(story));
}

export function getStoryBySlug(
  slug: string,
  options: StoryQueryOptions = {},
): Story | null {
  const { includePrivate = false } = options;
  if (process.env.NODE_ENV === "development") {
    const story = readStoryBySlugFromDisk(slug);
    if (!story) {
      return null;
    }

    if (!includePrivate && !isPubliclyVisibleStory(story)) {
      return null;
    }

    return story;
  }

  if (!cachedStoryIndex) {
    const stories = getAllStories({ includePrivate: true });
    cachedStoryIndex = new Map(
      stories.map((story) => [story.metadata.slug, story]),
    );
  }

  const story = cachedStoryIndex.get(slug) ?? null;
  if (!story) {
    return null;
  }

  if (!includePrivate && !isPubliclyVisibleStory(story)) {
    return null;
  }

  return story;
}

export function getAllThemes(): string[] {
  const stories = getAllStories();
  const themes = new Set<string>();

  stories.forEach((story) => {
    story.metadata.themes?.forEach((theme) => themes.add(theme));
  });

  return Array.from(themes).sort((a, b) => a.localeCompare(b));
}

function sortedSetValues(input: Set<string>): string[] {
  return Array.from(input).sort((a, b) => a.localeCompare(b));
}

export function getStoryFilters(
  stories: Story[] = getAllStories(),
): StoryFilters {
  const emotions = new Set<string>();
  const textures = new Set<string>();
  const temporality = new Set<string>();
  const geography = new Set<string>();

  stories.forEach((story) => {
    story.metadata.emotions?.forEach((emotion) => emotions.add(emotion.name));
    story.metadata.textures?.forEach((texture) => textures.add(texture.name));
    story.metadata.temporality?.forEach((temp) => temporality.add(temp.name));
    story.metadata.geography?.forEach((geo) => geography.add(geo.name));
  });

  return {
    emotions: sortedSetValues(emotions),
    textures: sortedSetValues(textures),
    temporality: sortedSetValues(temporality),
    geography: sortedSetValues(geography),
  };
}

/**
 * Get all unique emotion tags across all stories
 */
export function getAllEmotions(): string[] {
  return getStoryFilters().emotions;
}

/**
 * Get all unique texture tags across all stories
 */
export function getAllTextures(): string[] {
  return getStoryFilters().textures;
}

/**
 * Get all unique temporality tags across all stories
 */
export function getAllTemporality(): string[] {
  return getStoryFilters().temporality;
}

/**
 * Get all unique geography tags across all stories
 */
export function getAllGeography(): string[] {
  return getStoryFilters().geography;
}

/**
 * Get emotional vector for a story
 */
export function getStoryEmotionalVector(story: Story): EmotionalVector {
  return calculateEmotionalVector(story.metadata.emotions);
}
