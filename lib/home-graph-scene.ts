import { HOME_GRAPH_CONTENT } from "../content/home-graph.ts";
import type { StoryMetadata } from "@/lib/content";
import {
  buildHomeGraph,
  buildHomeGraphFrom,
  type HomeGraphContent,
  type HomeGraphEdge,
  type HomeGraphLine,
  type HomeGraphNode,
  type HomeGraphNodeLayout,
  type HomeGraphTone,
  type ResolvedHomeGraphNode,
} from "./home-graph.ts";
import {
  resolveHomeGraphNodes,
  type HomeGraphLanguageMap,
} from "./home-graph-language.ts";

export type { HomeGraphLine } from "./home-graph.ts";

export interface HomeGraphSceneNode extends ResolvedHomeGraphNode {
  desktopClassName: string;
  mobileClassName: string;
}

interface HomeGraphNodeVisualSpec {
  baseOpacity: number;
  desktopWidthRem: number;
  mobileWidthRem: number;
  desktopFontSize: string;
  mobileFontSize: string;
  blockWidth: number;
  blockHeight: number;
}

export interface HomeGraphNodeVisuals {
  baseOpacity: number;
  fontSize: string;
  widthClassName: string;
  widthRem: number;
  blockWidth: number;
  blockHeight: number;
  connectorGap: number;
  hitAreaPaddingX: number;
  hitAreaPaddingY: number;
}

export interface HomeGraphScene {
  edges: HomeGraphEdge[];
  nodes: HomeGraphSceneNode[];
  staticLines: {
    desktop: HomeGraphLine[];
    mobile: HomeGraphLine[];
  };
}

const HOME_GRAPH_NODE_VISUAL_SPECS: Record<
  HomeGraphTone,
  HomeGraphNodeVisualSpec
> = {
  title: {
    desktopWidthRem: 15.5,
    mobileWidthRem: 11.75,
    desktopFontSize: "1.28rem",
    mobileFontSize: "1.02rem",
    blockWidth: 4.8,
    blockHeight: 1.28,
    baseOpacity: 0.96,
  },
  phrase: {
    desktopWidthRem: 16.75,
    mobileWidthRem: 14,
    desktopFontSize: "1.08rem",
    mobileFontSize: "0.88rem",
    blockWidth: 5.7,
    blockHeight: 1.4,
    baseOpacity: 0.96,
  },
  whisper: {
    desktopWidthRem: 18.5,
    mobileWidthRem: 15.5,
    desktopFontSize: "0.82rem",
    mobileFontSize: "0.7rem",
    blockWidth: 6.55,
    blockHeight: 1.76,
    baseOpacity: 0.82,
  },
};

const HOME_GRAPH_MOBILE_BLOCK_SCALE = 0.94;
const HOME_GRAPH_CONNECTOR_GAP = {
  desktop: 0.1,
  mobile: 0.08,
} as const;
const HOME_GRAPH_HIT_AREA_PADDING = {
  x: 0.95,
  y: 0.98,
} as const;

export function getHomeGraphNodeToneClassName(tone: HomeGraphTone): string {
  return tone === "title"
    ? "home-figma-node-title"
    : tone === "phrase"
      ? "home-figma-node-phrase"
      : "home-figma-node-whisper";
}

export function getHomeGraphNodeVisuals(
  tone: HomeGraphTone,
  isMobile: boolean,
): HomeGraphNodeVisuals {
  const spec = HOME_GRAPH_NODE_VISUAL_SPECS[tone];
  const blockScale = isMobile ? HOME_GRAPH_MOBILE_BLOCK_SCALE : 1;

  return {
    widthClassName: `max-w-[${spec.mobileWidthRem}rem] md:max-w-[${spec.desktopWidthRem}rem]`,
    widthRem: isMobile ? spec.mobileWidthRem : spec.desktopWidthRem,
    fontSize: isMobile ? spec.mobileFontSize : spec.desktopFontSize,
    baseOpacity: spec.baseOpacity,
    blockWidth: Number((spec.blockWidth * blockScale).toFixed(3)),
    blockHeight: Number((spec.blockHeight * blockScale).toFixed(3)),
    connectorGap: isMobile
      ? HOME_GRAPH_CONNECTOR_GAP.mobile
      : HOME_GRAPH_CONNECTOR_GAP.desktop,
    hitAreaPaddingX: HOME_GRAPH_HIT_AREA_PADDING.x,
    hitAreaPaddingY: HOME_GRAPH_HIT_AREA_PADDING.y,
  };
}

export function resolveHomeGraphSceneNodes(
  nodes: readonly ResolvedHomeGraphNode[],
  layouts: Record<string, HomeGraphNodeLayout> = HOME_GRAPH_CONTENT.layouts,
): HomeGraphSceneNode[] {
  return nodes.map((node) => {
    const layout = layouts[node.id];

    if (!layout) {
      throw new RangeError(`Missing home graph scene layout for "${node.id}".`);
    }

    return {
      ...node,
      ...layout,
    };
  });
}

export function createHomeGraphScene(
  graph: { edges: HomeGraphEdge[]; nodes: HomeGraphNode[] },
  languageByNode: HomeGraphLanguageMap = {},
  content: Pick<
    HomeGraphContent,
    "layouts" | "staticLines"
  > = HOME_GRAPH_CONTENT,
): HomeGraphScene {
  return {
    nodes: resolveHomeGraphSceneNodes(
      resolveHomeGraphNodes(graph.nodes, languageByNode),
      content.layouts,
    ),
    edges: graph.edges,
    staticLines: content.staticLines,
  };
}

export function buildHomeGraphSceneFrom(
  content: HomeGraphContent,
  stories: StoryMetadata[],
  languageByNode: HomeGraphLanguageMap = {},
): HomeGraphScene {
  return createHomeGraphScene(
    buildHomeGraphFrom(content, stories),
    languageByNode,
    content,
  );
}

export function buildHomeGraphScene(
  stories: StoryMetadata[],
  languageByNode: HomeGraphLanguageMap = {},
): HomeGraphScene {
  return createHomeGraphScene(buildHomeGraph(stories), languageByNode);
}
