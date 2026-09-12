"use client";

import Image from "next/image";
import { ImageLightbox } from "@/components/ImageLightbox";
import {
  getAdaptiveStoryImagePreviewStyle,
  getDesktopStoryImagePreviewSlot,
  getDesktopStoryImagePreviewStageHeight,
  getNaturalStoryImagePreviewAspectRatio,
} from "@/lib/story-image-preview";
import {
  type CSSProperties,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

interface StoryFloatingVisualsProps {
  title: string;
  mediaSources: string[];
  onLightboxOpenChange?: (isOpen: boolean) => void;
}

interface ActiveVisual {
  mediaSource: string;
}

type ImageAspectRatios = Record<string, number>;

interface DesktopCard {
  key: string;
  leftPercent: number;
  topOffsetPx: number;
  widthPercent: number;
  connectorX: number;
  connectorY: number;
  duration: string;
  delay: string;
}

interface DesktopCardWithMedia extends DesktopCard {
  index: number;
  mediaSource: string;
}

interface FloatPreset {
  x1: string;
  y1: string;
  x2: string;
  y2: string;
}

const anchor = { xPercent: 47, yOffsetPx: 170 };

const floatPresets: FloatPreset[] = [
  { x1: "-10px", y1: "-14px", x2: "7px", y2: "-5px" },
  { x1: "8px", y1: "-12px", x2: "-6px", y2: "-2px" },
  { x1: "-7px", y1: "-16px", x2: "6px", y2: "-4px" },
];

type FloatStyle = CSSProperties & {
  "--float-x-1"?: string;
  "--float-y-1"?: string;
  "--float-x-2"?: string;
  "--float-y-2"?: string;
};

function getFloatMotionStyle(index: number): FloatStyle {
  const preset = floatPresets[index % floatPresets.length];
  return {
    "--float-x-1": preset.x1,
    "--float-y-1": preset.y1,
    "--float-x-2": preset.x2,
    "--float-y-2": preset.y2,
  };
}

export function StoryFloatingVisuals({
  title,
  mediaSources,
  onLightboxOpenChange,
}: StoryFloatingVisualsProps) {
  const [activeVisual, setActiveVisual] = useState<ActiveVisual | null>(null);
  const [imageAspectRatios, setImageAspectRatios] = useState<ImageAspectRatios>(
    {},
  );
  const desktopSvgRef = useRef<SVGSVGElement | null>(null);
  const desktopCardRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const desktopLineRefs = useRef<(SVGLineElement | null)[]>([]);

  const visibleMediaSources = useMemo(
    () =>
      mediaSources.map((item) => item.trim()).filter((item) => item.length > 0),
    [mediaSources],
  );

  const mobileCards = useMemo(
    () =>
      visibleMediaSources.map((mediaSource, index) => ({
        key: `mobile-card-${index}`,
        index,
        mediaSource,
      })),
    [visibleMediaSources],
  );

  const desktopCardsWithMedia = useMemo<DesktopCardWithMedia[]>(
    () =>
      visibleMediaSources.map((mediaSource, index) => ({
        ...getDesktopStoryImagePreviewSlot(index),
        index,
        mediaSource,
      })),
    [visibleMediaSources],
  );

  const desktopStageHeight = useMemo(
    () => getDesktopStoryImagePreviewStageHeight(visibleMediaSources.length),
    [visibleMediaSources.length],
  );

  const hasMedia = visibleMediaSources.length > 0;

  useEffect(() => {
    onLightboxOpenChange?.(Boolean(activeVisual));
  }, [activeVisual, onLightboxOpenChange]);

  useEffect(() => {
    if (desktopCardsWithMedia.length === 0) {
      return;
    }

    let frameId: number | null = null;
    const desktopQuery = window.matchMedia("(min-width: 768px)");

    const syncLineTargets = () => {
      const svgElement = desktopSvgRef.current;
      if (!svgElement || !desktopQuery.matches) {
        frameId = null;
        return;
      }

      const svgRect = svgElement.getBoundingClientRect();
      if (svgRect.width > 0 && svgRect.height > 0) {
        desktopCardsWithMedia.forEach((card) => {
          const cardElement = desktopCardRefs.current[card.index];
          const lineElement = desktopLineRefs.current[card.index];
          if (!cardElement || !lineElement) {
            return;
          }

          const cardRect = cardElement.getBoundingClientRect();
          const pointX =
            cardRect.left + (cardRect.width * card.connectorX) / 100;
          const pointY =
            cardRect.top + (cardRect.height * card.connectorY) / 100;

          const xPercent = ((pointX - svgRect.left) / svgRect.width) * 100;
          const yPercent = ((pointY - svgRect.top) / svgRect.height) * 100;

          lineElement.setAttribute("x2", `${xPercent}%`);
          lineElement.setAttribute("y2", `${yPercent}%`);
        });
      }

      frameId = window.requestAnimationFrame(syncLineTargets);
    };

    const startSync = () => {
      if (!desktopQuery.matches || frameId !== null) {
        return;
      }

      frameId = window.requestAnimationFrame(syncLineTargets);
    };

    const stopSync = () => {
      if (frameId !== null) {
        window.cancelAnimationFrame(frameId);
        frameId = null;
      }
    };

    const onDesktopQueryChange = () => {
      if (desktopQuery.matches) {
        startSync();
        return;
      }

      stopSync();
    };

    onDesktopQueryChange();
    desktopQuery.addEventListener("change", onDesktopQueryChange);

    return () => {
      stopSync();
      desktopQuery.removeEventListener("change", onDesktopQueryChange);
    };
  }, [desktopCardsWithMedia]);

  function openVisual(mediaSource: string) {
    setActiveVisual({ mediaSource });
  }

  function recordImageAspectRatio(
    mediaSource: string,
    naturalWidth: number,
    naturalHeight: number,
  ) {
    const aspectRatio = getNaturalStoryImagePreviewAspectRatio({
      naturalHeight,
      naturalWidth,
    });

    setImageAspectRatios((current) => {
      if (current[mediaSource] === aspectRatio) {
        return current;
      }

      return {
        ...current,
        [mediaSource]: aspectRatio,
      };
    });
  }

  return (
    <div className="relative z-[20] mt-5 min-h-[460px] w-full md:min-h-[700px]">
      <div className="md:hidden">
        <div className="relative mx-auto max-w-md space-y-5 pb-1 pt-7">
          <div className="story-red-node-mobile absolute left-1/2 top-0 z-10 h-3.5 w-3.5 -translate-x-1/2 rounded-full" />

          {hasMedia ? (
            mobileCards.map((item) => {
              const previewLayout = getAdaptiveStoryImagePreviewStyle(
                {
                  key: item.key,
                  connectorX: 50,
                  connectorY: 50,
                  delay: "0s",
                  duration: "8s",
                  leftPercent: 0,
                  topOffsetPx: 0,
                  widthPercent: 100,
                },
                imageAspectRatios[item.mediaSource],
              );

              return (
                <button
                  key={item.key}
                  type="button"
                  aria-label={`Open visual fragment ${item.index + 1}`}
                  onClick={() => openVisual(item.mediaSource)}
                  className="story-visual-card relative w-full cursor-zoom-in appearance-none overflow-hidden bg-[rgba(0,0,0,0.06)] text-left"
                  style={{
                    ...getFloatMotionStyle(item.index),
                    animationDuration: `${8.1 + item.index * 0.9}s`,
                    animationDelay: `${item.index * 0.55}s`,
                    aspectRatio: `${previewLayout.aspectRatio}`,
                    marginInline: "auto",
                    maxWidth: previewLayout.mobileMaxWidth,
                  }}
                >
                  <Image
                    src={`/media/images/${item.mediaSource}`}
                    alt={title}
                    fill
                    sizes="92vw"
                    className="object-contain"
                    onLoad={(event) =>
                      recordImageAspectRatio(
                        item.mediaSource,
                        event.currentTarget.naturalWidth,
                        event.currentTarget.naturalHeight,
                      )
                    }
                  />
                </button>
              );
            })
          ) : (
            <div className="rounded-[2rem] border border-[rgba(228,0,0,0.14)] bg-[rgba(255,255,255,0.62)] px-5 py-10 text-center text-sm text-[var(--story-muted)]">
              Visual material coming soon.
            </div>
          )}
        </div>
      </div>

      <div
        className="relative hidden w-full md:block"
        style={{ minHeight: `${desktopStageHeight}px` }}
      >
        <svg
          ref={desktopSvgRef}
          className="absolute inset-0 h-full w-full"
          aria-hidden="true"
        >
          {desktopCardsWithMedia.map((card, index) => (
            <line
              key={`story-line-${card.key}`}
              x1={`${anchor.xPercent}%`}
              y1={`${anchor.yOffsetPx}`}
              x2={`${anchor.xPercent}%`}
              y2={`${anchor.yOffsetPx}`}
              className="story-link-line"
              style={{ animationDelay: `${index * 0.6}s` }}
              ref={(node) => {
                desktopLineRefs.current[card.index] = node;
              }}
            />
          ))}
        </svg>

        <div
          className="story-red-node absolute z-20 h-4 w-4 rounded-full"
          style={{
            left: `calc(${anchor.xPercent}% - 8px)`,
            top: `${anchor.yOffsetPx - 8}px`,
          }}
        />

        {hasMedia ? (
          desktopCardsWithMedia.map((card) => {
            const previewLayout = getAdaptiveStoryImagePreviewStyle(
              card,
              imageAspectRatios[card.mediaSource],
            );

            return (
              <div
                key={card.key}
                className="absolute"
                style={{
                  aspectRatio: `${previewLayout.aspectRatio}`,
                  left: `${previewLayout.leftPercent}%`,
                  top: `${previewLayout.topOffsetPx}px`,
                  width: `${previewLayout.widthPercent}%`,
                }}
              >
                <button
                  type="button"
                  aria-label={`Open visual fragment ${card.index + 1}`}
                  onClick={() => openVisual(card.mediaSource)}
                  className="story-visual-card relative h-full w-full cursor-zoom-in appearance-none overflow-hidden bg-[rgba(0,0,0,0.06)] text-left"
                  style={{
                    ...getFloatMotionStyle(card.index),
                    animationDuration: card.duration,
                    animationDelay: card.delay,
                  }}
                  ref={(node) => {
                    desktopCardRefs.current[card.index] = node;
                  }}
                >
                  <Image
                    src={`/media/images/${card.mediaSource}`}
                    alt={title}
                    fill
                    sizes="(max-width: 1024px) 40vw, 30vw"
                    className="object-contain"
                    onLoad={(event) =>
                      recordImageAspectRatio(
                        card.mediaSource,
                        event.currentTarget.naturalWidth,
                        event.currentTarget.naturalHeight,
                      )
                    }
                  />
                </button>
              </div>
            );
          })
        ) : (
          <div className="absolute inset-x-0 bottom-[12%] flex justify-center px-6">
            <div className="rounded-[2rem] border border-[rgba(228,0,0,0.14)] bg-[rgba(255,255,255,0.62)] px-6 py-6 text-center text-[var(--story-muted)] shadow-[0_22px_48px_rgba(0,0,0,0.08)]">
              Visual material coming soon.
            </div>
          </div>
        )}
      </div>

      <ImageLightbox
        isOpen={Boolean(activeVisual)}
        onClose={() => setActiveVisual(null)}
        ariaLabel="Fullscreen visual"
        imageSrc={
          activeVisual ? `/media/images/${activeVisual.mediaSource}` : null
        }
        imageAlt={title}
        imageSizes="100vw"
        priority
        overlayClassName="fixed inset-0 z-[80] flex items-center justify-center bg-[rgba(5,5,5,0.9)] p-3 backdrop-blur-[2px] md:p-8"
        dialogClassName="relative flex items-center justify-center"
        frameClassName="relative h-[90vh] w-[94vw] max-w-6xl overflow-hidden border border-white/40 bg-black/60 shadow-[0_26px_60px_rgba(0,0,0,0.55)]"
        imageClassName="object-contain"
        closeButtonClassName="absolute right-3 top-3 rounded-sm px-2 py-1 text-xs uppercase tracking-[0.2em] text-white/86 transition-colors hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/80 focus-visible:ring-offset-2 focus-visible:ring-offset-black"
      />
    </div>
  );
}
