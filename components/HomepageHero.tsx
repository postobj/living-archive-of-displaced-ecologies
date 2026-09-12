"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { startTransition, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { StoryMetadata } from "@/lib/content";
import { buildMeasuredHomeGraphLines } from "@/lib/home-graph-geometry";
import { buildHomeGraph } from "@/lib/home-graph";
import {
  createHomeGraphNodeLanguageMap,
  getHomeGraphLanguageRotationIntervalMs,
  getNextHomeGraphLanguage,
  getHomeGraphTextPresentation,
  type HomeGraphLanguageMap,
} from "@/lib/home-graph-language";
import {
  createHomeGraphScene,
  getHomeGraphNodeToneClassName,
  type HomeGraphSceneNode,
} from "@/lib/home-graph-scene";
import {
  HOME_WORDMARK_MAX_FONT_SIZE_PX,
  HOME_WORDMARK_TOP_PERCENT,
  getFittedHomeWordmarkFontSize,
} from "@/lib/homepage-wordmark";
import { GLASS_PROFILES } from "@/lib/glass";
import { isWebGLSupported } from "@/lib/webgl";
import { GlassWordmark } from "./glass/GlassWordmark";
import { HomeWordmarkSourceCanvas } from "./glass/HomeWordmarkSourceCanvas";
import { useGlassCapability } from "./glass/useGlassCapability";
import { CornerNavigation } from "./CornerNavigation";

const HomeConstellationScene = dynamic(
  () =>
    import("./HomeConstellationScene").then((mod) => ({
      default: mod.HomeConstellationScene,
    })),
  { ssr: false },
);

interface HomepageHeroProps {
  stories: StoryMetadata[];
}

type HomepageView = "checking" | "3d" | "fallback";

function HomeStaticGraphNode({
  className,
  node,
  nodeRef,
  onStoryOpen,
}: {
  className: string;
  node: HomeGraphSceneNode;
  nodeRef?: (element: HTMLButtonElement | HTMLParagraphElement | null) => void;
  onStoryOpen: (slug: string) => void;
}) {
  const toneClassName = getHomeGraphNodeToneClassName(node.tone);
  const textPresentation = getHomeGraphTextPresentation(
    node.activeLanguage,
    node.tone,
  );
  const languageStyle = {
    animationDelay: `${node.animationDelayMs}ms`,
    fontFamily: textPresentation.fontFamily,
    letterSpacing: textPresentation.letterSpacing,
    lineHeight: textPresentation.lineHeight,
    textTransform: textPresentation.textTransform,
  } as const;

  if (node.slug) {
    const slug = node.slug;

    return (
      <button
        ref={nodeRef}
        type="button"
        onClick={() => onStoryOpen(slug)}
        className={`home-figma-node home-figma-node-button ${toneClassName} ${className}`}
        style={languageStyle}
        lang={textPresentation.lang}
      >
        {node.activeText}
      </button>
    );
  }

  return (
    <p
      ref={nodeRef}
      className={`home-figma-node ${toneClassName} ${className}`}
      style={languageStyle}
      lang={textPresentation.lang}
    >
      {node.activeText}
    </p>
  );
}

function HomeStaticGraph({
  nodes,
  edges,
  staticLines,
  onStoryOpen,
}: {
  nodes: HomeGraphSceneNode[];
  edges: ReturnType<typeof createHomeGraphScene>["edges"];
  staticLines: ReturnType<typeof createHomeGraphScene>["staticLines"];
  onStoryOpen: (slug: string) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const desktopNodeRefs = useRef<
    Partial<Record<string, HTMLButtonElement | HTMLParagraphElement | null>>
  >({});
  const mobileNodeRefs = useRef<
    Partial<Record<string, HTMLButtonElement | HTMLParagraphElement | null>>
  >({});
  const [measuredLineLayers, setMeasuredLineLayers] = useState<{
    desktop: {
      width: number;
      height: number;
      lines: typeof staticLines.desktop;
    } | null;
    mobile: {
      width: number;
      height: number;
      lines: typeof staticLines.mobile;
    } | null;
  }>({
    desktop: null,
    mobile: null,
  });

  useEffect(() => {
    const container = containerRef.current;

    if (!container || typeof ResizeObserver === "undefined") {
      return;
    }

    const measureLayer = (
      refs: typeof desktopNodeRefs,
      gap: number,
    ): {
      width: number;
      height: number;
      lines: typeof staticLines.desktop;
    } | null => {
      const containerRect = container.getBoundingClientRect();

      if (containerRect.width <= 0 || containerRect.height <= 0) {
        return null;
      }

      const boxesByNodeId = nodes.reduce<
        Partial<
          Record<
            string,
            {
              centerX: number;
              centerY: number;
              width: number;
              height: number;
            }
          >
        >
      >((boxes, node) => {
        const element = refs.current[node.id];

        if (!element || element.offsetParent === null) {
          return boxes;
        }

        const rect = element.getBoundingClientRect();

        if (rect.width <= 0 || rect.height <= 0) {
          return boxes;
        }

        boxes[node.id] = {
          centerX: rect.left - containerRect.left + rect.width / 2,
          centerY: rect.top - containerRect.top + rect.height / 2,
          width: rect.width,
          height: rect.height,
        };

        return boxes;
      }, {});
      const lines = buildMeasuredHomeGraphLines({
        edges,
        boxesByNodeId,
        gap,
      });

      if (lines.length === 0) {
        return null;
      }

      return {
        width: containerRect.width,
        height: containerRect.height,
        lines,
      };
    };

    const updateMeasuredLines = () => {
      setMeasuredLineLayers({
        desktop: measureLayer(desktopNodeRefs, 6),
        mobile: measureLayer(mobileNodeRefs, 5),
      });
    };

    updateMeasuredLines();

    const resizeObserver = new ResizeObserver(updateMeasuredLines);
    resizeObserver.observe(container);

    nodes.forEach((node) => {
      const desktopElement = desktopNodeRefs.current[node.id];
      const mobileElement = mobileNodeRefs.current[node.id];

      if (desktopElement) {
        resizeObserver.observe(desktopElement);
      }

      if (mobileElement) {
        resizeObserver.observe(mobileElement);
      }
    });

    window.addEventListener("resize", updateMeasuredLines);

    return () => {
      resizeObserver.disconnect();
      window.removeEventListener("resize", updateMeasuredLines);
    };
  }, [edges, nodes, staticLines]);

  return (
    <div ref={containerRef} className="absolute inset-0 z-20">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 hidden md:block"
      >
        <svg
          className="home-figma-line-layer"
          viewBox={
            measuredLineLayers.desktop
              ? `0 0 ${measuredLineLayers.desktop.width} ${measuredLineLayers.desktop.height}`
              : "0 0 100 100"
          }
          preserveAspectRatio="none"
        >
          {(measuredLineLayers.desktop?.lines ?? staticLines.desktop).map(
            (line) => (
              <line
                key={line.id}
                className="home-figma-line"
                x1={line.x1}
                y1={line.y1}
                x2={line.x2}
                y2={line.y2}
              />
            ),
          )}
        </svg>
      </div>

      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 md:hidden"
      >
        <svg
          className="home-figma-line-layer"
          viewBox={
            measuredLineLayers.mobile
              ? `0 0 ${measuredLineLayers.mobile.width} ${measuredLineLayers.mobile.height}`
              : "0 0 100 100"
          }
          preserveAspectRatio="none"
        >
          {(measuredLineLayers.mobile?.lines ?? staticLines.mobile).map(
            (line) => (
              <line
                key={line.id}
                className="home-figma-line"
                x1={line.x1}
                y1={line.y1}
                x2={line.x2}
                y2={line.y2}
              />
            ),
          )}
        </svg>
      </div>

      <div className="absolute inset-0 z-20 hidden md:block">
        {nodes.map((node) => (
          <HomeStaticGraphNode
            key={node.id}
            className={node.desktopClassName}
            node={node}
            nodeRef={(element) => {
              desktopNodeRefs.current[node.id] = element;
            }}
            onStoryOpen={onStoryOpen}
          />
        ))}
      </div>

      <div className="absolute inset-0 z-20 md:hidden">
        {nodes.map((node) => (
          <HomeStaticGraphNode
            key={`${node.id}-mobile`}
            className={node.mobileClassName}
            node={node}
            nodeRef={(element) => {
              mobileNodeRefs.current[node.id] = element;
            }}
            onStoryOpen={onStoryOpen}
          />
        ))}
      </div>
    </div>
  );
}

export function HomepageHero({ stories }: HomepageHeroProps) {
  const router = useRouter();
  const [view, setView] = useState<HomepageView>("checking");
  const [sceneReady, setSceneReady] = useState(false);
  const [, setSceneCanvas] = useState<HTMLCanvasElement | null>(null);
  const [homeWordmarkCanvas, setHomeWordmarkCanvas] =
    useState<HTMLCanvasElement | null>(null);
  const [wordmarkFontSize, setWordmarkFontSize] = useState<number | null>(null);
  const wordmarkRef = useRef<HTMLDivElement>(null);

  const [languageByNode, setLanguageByNode] = useState<HomeGraphLanguageMap>(
    {},
  );
  const graph = useMemo(() => buildHomeGraph(stories), [stories]);
  const scene = useMemo(
    () => createHomeGraphScene(graph, languageByNode),
    [graph, languageByNode],
  );
  const maxAnimationDelayMs = useMemo(
    () =>
      graph.nodes.reduce(
        (maxDelayMs, node) => Math.max(maxDelayMs, node.animationDelayMs),
        0,
      ),
    [graph.nodes],
  );
  const featuredStories = useMemo(() => {
    const featuredSlugs = new Set(
      graph.nodes.flatMap((node) => (node.slug ? [node.slug] : [])),
    );

    return stories.filter((story) => featuredSlugs.has(story.slug));
  }, [graph.nodes, stories]);

  useEffect(() => {
    let cancelled = false;
    requestAnimationFrame(() => {
      if (!cancelled) {
        startTransition(() => {
          setView(isWebGLSupported() ? "3d" : "fallback");
        });
      }
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const glassRenderer = useGlassCapability({
    hasCanvasSource: homeWordmarkCanvas !== null,
    preferScene: true,
  });

  useEffect(() => {
    if (view !== "3d") {
      startTransition(() => {
        setSceneReady(false);
      });
    }
  }, [view]);

  useEffect(() => {
    const initialLanguageByNode = createHomeGraphNodeLanguageMap(graph.nodes);

    startTransition(() => {
      setLanguageByNode(initialLanguageByNode);
    });

    const timeoutIds = graph.nodes.map((node) => {
      let timeoutId = 0;

      const queueRefresh = (
        currentLanguage: (typeof initialLanguageByNode)[string],
      ) => {
        if (!currentLanguage) return;

        const nextLanguage = getNextHomeGraphLanguage(currentLanguage);
        const intervalMs = getHomeGraphLanguageRotationIntervalMs(
          node.animationDelayMs,
          maxAnimationDelayMs,
          currentLanguage,
        );

        timeoutId = window.setTimeout(() => {
          startTransition(() => {
            setLanguageByNode((prev) => ({
              ...prev,
              [node.id]: nextLanguage,
            }));
          });
          queueRefresh(nextLanguage);
        }, intervalMs);
      };

      const initialLang = initialLanguageByNode[node.id];
      if (initialLang) {
        queueRefresh(initialLang);
      }
      return () => window.clearTimeout(timeoutId);
    });

    return () => {
      timeoutIds.forEach((clearTimeoutId) => {
        clearTimeoutId();
      });
    };
  }, [graph.nodes, maxAnimationDelayMs]);

  useEffect(() => {
    featuredStories.forEach((story) => {
      router.prefetch(`/stories/${story.slug}`);
    });
  }, [featuredStories, router]);

  useEffect(() => {
    const updateWordmarkSize = () => {
      const element = wordmarkRef.current;
      const viewportWidthPx = window.visualViewport?.width ?? window.innerWidth;

      if (!element || viewportWidthPx <= 0) {
        return;
      }

      const previousInlineFontSize = element.style.fontSize;

      element.style.fontSize = `${HOME_WORDMARK_MAX_FONT_SIZE_PX}px`;

      const measuredWidthAtMaxFontSize = element.getBoundingClientRect().width;

      element.style.fontSize = previousInlineFontSize;

      setWordmarkFontSize(
        getFittedHomeWordmarkFontSize({
          measuredWidthAtMaxFontSize,
          viewportWidthPx,
        }),
      );
    };

    updateWordmarkSize();

    window.addEventListener("resize", updateWordmarkSize);
    window.visualViewport?.addEventListener("resize", updateWordmarkSize);

    const fontSet = document.fonts;

    fontSet.ready.then(updateWordmarkSize).catch(() => {});
    fontSet.addEventListener("loadingdone", updateWordmarkSize);

    return () => {
      window.removeEventListener("resize", updateWordmarkSize);
      window.visualViewport?.removeEventListener("resize", updateWordmarkSize);
      fontSet.removeEventListener("loadingdone", updateWordmarkSize);
    };
  }, []);

  const handleStoryOpen = (slug: string) => {
    router.push(`/stories/${slug}?from=home`);
  };
  const showStaticGraph = view !== "3d" || !sceneReady;
  const wordmarkLabel = "Living Archive of Displaced Ecologies";

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#ffffff] text-[#171110]">
      <HomeWordmarkSourceCanvas onCanvasReady={setHomeWordmarkCanvas} />
      <GlassWordmark
        ref={wordmarkRef}
        text="Living Archive of Displaced Ecologies"
        profile={GLASS_PROFILES.homeWordmark}
        renderer={glassRenderer}
        sourceCanvas={homeWordmarkCanvas}
        variant="home"
        className="home-figma-wordmark"
        data-node-id="162:6"
        style={
          wordmarkFontSize === null
            ? { top: `${HOME_WORDMARK_TOP_PERCENT}%` }
            : {
                fontSize: `${wordmarkFontSize}px`,
                top: `${HOME_WORDMARK_TOP_PERCENT}%`,
              }
        }
      >
        <span className="home-figma-wordmark__layer home-figma-wordmark__base">
          {wordmarkLabel}
        </span>
        <span className="home-figma-wordmark__layer home-figma-wordmark__sheen">
          {wordmarkLabel}
        </span>
        <span className="home-figma-wordmark__layer home-figma-wordmark__outline">
          {wordmarkLabel}
        </span>
      </GlassWordmark>

      {showStaticGraph ? (
        <HomeStaticGraph
          nodes={scene.nodes}
          edges={scene.edges}
          staticLines={scene.staticLines}
          onStoryOpen={handleStoryOpen}
        />
      ) : null}

      {view === "3d" ? (
        <HomeConstellationScene
          nodes={scene.nodes}
          edges={scene.edges}
          onStoryOpen={handleStoryOpen}
          onCanvasReady={setSceneCanvas}
          onReady={() => setSceneReady(true)}
        />
      ) : null}

      <nav aria-label="Featured stories" className="sr-only">
        <ul>
          {featuredStories.map((story) => (
            <li key={story.slug}>
              <Link href={`/stories/${story.slug}?from=home`}>
                {story.title}
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      <p className="sr-only">Select a sentence to open a story.</p>
      <CornerNavigation />
    </main>
  );
}
