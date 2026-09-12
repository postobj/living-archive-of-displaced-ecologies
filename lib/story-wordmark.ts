function normalizeDisplayCopy(value: string): string {
  return value.trim().replace(/\s+/g, " ").toUpperCase();
}

export const STORY_WORDMARK_FONT_SCALE = 1.3;

export function getStoryWordmarkText(input: {
  posterShortText?: string;
  title: string;
}): string {
  const posterShortText = input.posterShortText?.trim();

  if (posterShortText) {
    return normalizeDisplayCopy(posterShortText);
  }

  return normalizeDisplayCopy(input.title);
}

export function getStoryWordmarkFontSize(input: {
  baseFittedFontSizePx: number;
  measuredLineWidthAtMaxFontSize: number;
  availableWidthPx: number;
  maxFontSizePx?: number;
  minFontSizePx?: number;
}): number {
  const {
    baseFittedFontSizePx,
    measuredLineWidthAtMaxFontSize,
    availableWidthPx,
    maxFontSizePx = 184,
    minFontSizePx = 28,
  } = input;

  const scaledFontSizePx = baseFittedFontSizePx * STORY_WORDMARK_FONT_SCALE;

  if (measuredLineWidthAtMaxFontSize <= 0 || availableWidthPx <= 0) {
    return Number(Math.max(minFontSizePx, scaledFontSizePx).toFixed(2));
  }

  const measuredLineWidthAtScaledFontSize =
    (measuredLineWidthAtMaxFontSize * scaledFontSizePx) / maxFontSizePx;

  if (measuredLineWidthAtScaledFontSize <= availableWidthPx) {
    return Number(scaledFontSizePx.toFixed(2));
  }

  return Number(
    Math.max(
      minFontSizePx,
      (availableWidthPx / measuredLineWidthAtMaxFontSize) * maxFontSizePx,
    ).toFixed(2),
  );
}

export function splitStoryWordmarkLines(text: string): string[] {
  const words = text.trim().split(/\s+/).filter(Boolean);

  if (words.length <= 1) {
    return [words[0] ?? text];
  }

  let bestLines = [text];
  let bestDelta = Number.POSITIVE_INFINITY;

  for (let index = 1; index < words.length; index += 1) {
    const left = words.slice(0, index).join(" ");
    const right = words.slice(index).join(" ");
    const delta = Math.abs(left.length - right.length);

    if (delta < bestDelta) {
      bestDelta = delta;
      bestLines = [left, right];
    }
  }

  return bestLines;
}
