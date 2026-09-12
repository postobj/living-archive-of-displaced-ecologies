import { HOME_GRAPH_CONTENT } from "../content/home-graph.ts";
import type { StoryMetadata } from "@/lib/content";
import type { DisplayLanguage } from "@/lib/display-languages";

export type HomeGraphTone = "title" | "phrase" | "whisper";
export type HomeGraphLanguage = DisplayLanguage;
export type HomeGraphCopy = Record<HomeGraphLanguage, string>;

export interface HomeGraphNode {
  id: string;
  copy: HomeGraphCopy;
  slug?: string;
  tone: HomeGraphTone;
  position: [number, number, number];
  animationDelayMs: number;
}

export interface ResolvedHomeGraphNode extends HomeGraphNode {
  activeLanguage: HomeGraphLanguage;
  activeText: string;
}

export interface HomeGraphEdge {
  id: string;
  from: string;
  to: string;
  opacity?: number;
}

export interface HomeGraphContentNode {
  id: string;
  copy: HomeGraphCopy;
  storySlug?: string;
  tone: HomeGraphTone;
  position: [number, number, number];
  animationDelayMs: number;
}

export interface HomeGraphLine {
  id: string;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

export interface HomeGraphNodeLayout {
  desktopClassName: string;
  mobileClassName: string;
}

export interface HomeGraphContent {
  nodes: HomeGraphContentNode[];
  edges: HomeGraphEdge[];
  layouts: Record<string, HomeGraphNodeLayout>;
  staticLines: {
    desktop: HomeGraphLine[];
    mobile: HomeGraphLine[];
  };
}

const HOME_GRAPH_POSITION_SCALE_X = 1.2;
const HOME_GRAPH_POSITION_SCALE_Y = 0.85;
const HOME_GRAPH_POSITION_X_OFFSET = -0.92;

function getHomeGraphCenter(
  nodes: readonly HomeGraphContentNode[],
): [number, number] {
  const [totalX, totalY] = nodes.reduce(
    ([sumX, sumY], node) => [sumX + node.position[0], sumY + node.position[1]],
    [0, 0],
  );

  return [totalX / nodes.length, totalY / nodes.length];
}

function transformHomeGraphPosition(
  position: [number, number, number],
  center: [number, number],
): [number, number, number] {
  const [centerX, centerY] = center;
  const [x, y, z] = position;

  return [
    Number(
      (
        (x - centerX) * HOME_GRAPH_POSITION_SCALE_X +
        HOME_GRAPH_POSITION_X_OFFSET
      ).toFixed(2),
    ),
    Number(((y - centerY) * HOME_GRAPH_POSITION_SCALE_Y).toFixed(2)),
    z,
  ];
}

export function buildHomeGraphFrom(
  content: Pick<HomeGraphContent, "nodes" | "edges">,
  stories: StoryMetadata[],
): {
  nodes: HomeGraphNode[];
  edges: HomeGraphEdge[];
} {
  const storyBySlug = new Map(stories.map((story) => [story.slug, story]));
  const center = getHomeGraphCenter(content.nodes);

  const nodes = content.nodes.map((node) => {
    const story = node.storySlug ? storyBySlug.get(node.storySlug) : undefined;

    return {
      id: node.id,
      copy: node.copy,
      slug: story?.slug,
      tone: node.tone,
      position: transformHomeGraphPosition(node.position, center),
      animationDelayMs: node.animationDelayMs,
    };
  });

  return {
    nodes,
    edges: content.edges,
  };
}

export function buildHomeGraph(stories: StoryMetadata[]): {
  nodes: HomeGraphNode[];
  edges: HomeGraphEdge[];
} {
  return buildHomeGraphFrom(HOME_GRAPH_CONTENT, stories);
}
