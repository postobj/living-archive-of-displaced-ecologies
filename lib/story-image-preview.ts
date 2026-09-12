export const DEFAULT_STORY_IMAGE_PREVIEW_ASPECT_RATIO = 3 / 2;
export const MIN_STORY_IMAGE_PREVIEW_ASPECT_RATIO = 0.68;
export const MAX_STORY_IMAGE_PREVIEW_ASPECT_RATIO = 2.2;

export type StoryImagePreviewOrientation = "portrait" | "square" | "landscape";

export interface StoryImagePreviewSlot {
  key: string;
  leftPercent: number;
  topOffsetPx: number;
  widthPercent: number;
  connectorX: number;
  connectorY: number;
  duration: string;
  delay: string;
}

export interface AdaptiveStoryImagePreviewStyle {
  aspectRatio: number;
  leftPercent: number;
  mobileMaxWidth: string;
  orientation: StoryImagePreviewOrientation;
  topOffsetPx: number;
  widthPercent: number;
}

const desktopStoryImagePreviewSlots: StoryImagePreviewSlot[] = [
  {
    key: "left-primary",
    leftPercent: 8,
    topOffsetPx: 190,
    widthPercent: 36,
    connectorX: 48,
    connectorY: 8,
    duration: "9.2s",
    delay: "0s",
  },
  {
    key: "right-primary",
    leftPercent: 61,
    topOffsetPx: 56,
    widthPercent: 33,
    connectorX: 24,
    connectorY: 60,
    duration: "9.6s",
    delay: "0.55s",
  },
  {
    key: "right-secondary",
    leftPercent: 58,
    topOffsetPx: 430,
    widthPercent: 31,
    connectorX: 24,
    connectorY: 24,
    duration: "10.1s",
    delay: "1.1s",
  },
];

function roundPreviewNumber(value: number): number {
  return Number(value.toFixed(4));
}

export function getBoundedStoryImagePreviewAspectRatio(
  aspectRatio: number | null | undefined,
): number {
  if (!Number.isFinite(aspectRatio) || !aspectRatio || aspectRatio <= 0) {
    return DEFAULT_STORY_IMAGE_PREVIEW_ASPECT_RATIO;
  }

  return Math.min(
    MAX_STORY_IMAGE_PREVIEW_ASPECT_RATIO,
    Math.max(MIN_STORY_IMAGE_PREVIEW_ASPECT_RATIO, aspectRatio),
  );
}

export function getNaturalStoryImagePreviewAspectRatio({
  naturalHeight,
  naturalWidth,
}: {
  naturalHeight: number;
  naturalWidth: number;
}): number {
  if (naturalWidth <= 0 || naturalHeight <= 0) {
    return DEFAULT_STORY_IMAGE_PREVIEW_ASPECT_RATIO;
  }

  return getBoundedStoryImagePreviewAspectRatio(naturalWidth / naturalHeight);
}

export function getStoryImagePreviewOrientation(
  aspectRatio: number | null | undefined,
): StoryImagePreviewOrientation {
  const boundedAspectRatio =
    getBoundedStoryImagePreviewAspectRatio(aspectRatio);

  if (boundedAspectRatio < 0.9) {
    return "portrait";
  }

  if (boundedAspectRatio <= 1.15) {
    return "square";
  }

  return "landscape";
}

function getWidthScale(orientation: StoryImagePreviewOrientation): number {
  if (orientation === "portrait") return 0.68;
  if (orientation === "square") return 0.82;
  return 1;
}

function getMobileMaxWidth(orientation: StoryImagePreviewOrientation): string {
  if (orientation === "portrait") return "19rem";
  if (orientation === "square") return "24rem";
  return "100%";
}

export function getDesktopStoryImagePreviewSlot(
  index: number,
): StoryImagePreviewSlot {
  const preset = desktopStoryImagePreviewSlots[index];
  if (preset) {
    return preset;
  }

  const extraIndex = index - desktopStoryImagePreviewSlots.length;
  const isLeftColumn = extraIndex % 2 === 0;
  const topOffsetPx = 720 + extraIndex * 250;

  return {
    key: `${isLeftColumn ? "left" : "right"}-extra-${extraIndex}`,
    leftPercent: isLeftColumn ? 14 : 62,
    topOffsetPx,
    widthPercent: isLeftColumn ? 32 : 31,
    connectorX: isLeftColumn ? 72 : 18,
    connectorY: extraIndex % 3 === 0 ? 24 : 64,
    duration: `${9.8 + (index % 4) * 0.45}s`,
    delay: `${index * 0.45}s`,
  };
}

export function getDesktopStoryImagePreviewStageHeight(
  mediaCount: number,
): number {
  if (mediaCount <= 0) return 700;
  if (mediaCount <= desktopStoryImagePreviewSlots.length) return 780;

  const lastSlot = getDesktopStoryImagePreviewSlot(mediaCount - 1);
  return lastSlot.topOffsetPx + 430;
}

export function getAdaptiveStoryImagePreviewStyle(
  slot: StoryImagePreviewSlot,
  aspectRatio: number | null | undefined,
): AdaptiveStoryImagePreviewStyle {
  const boundedAspectRatio =
    getBoundedStoryImagePreviewAspectRatio(aspectRatio);
  const orientation = getStoryImagePreviewOrientation(boundedAspectRatio);

  return {
    aspectRatio: roundPreviewNumber(boundedAspectRatio),
    leftPercent: slot.leftPercent,
    mobileMaxWidth: getMobileMaxWidth(orientation),
    orientation,
    topOffsetPx: slot.topOffsetPx,
    widthPercent: roundPreviewNumber(
      slot.widthPercent * getWidthScale(orientation),
    ),
  };
}
