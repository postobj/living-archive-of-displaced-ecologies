export const HOME_WORDMARK_MAX_FONT_SIZE_PX = 184;
export const HOME_WORDMARK_MIN_FONT_SIZE_PX = 28;
export const HOME_WORDMARK_HORIZONTAL_PADDING_PX = 32;
export const HOME_WORDMARK_TOP_PERCENT = 50;

interface HomeWordmarkFontSizeOptions {
  measuredWidthAtMaxFontSize: number;
  viewportWidthPx: number;
  horizontalPaddingPx?: number;
  maxFontSizePx?: number;
  minFontSizePx?: number;
}

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(maximum, Math.max(minimum, value));
}

export function getFittedHomeWordmarkFontSize({
  measuredWidthAtMaxFontSize,
  viewportWidthPx,
  horizontalPaddingPx = HOME_WORDMARK_HORIZONTAL_PADDING_PX,
  maxFontSizePx = HOME_WORDMARK_MAX_FONT_SIZE_PX,
  minFontSizePx = HOME_WORDMARK_MIN_FONT_SIZE_PX,
}: HomeWordmarkFontSizeOptions): number {
  if (measuredWidthAtMaxFontSize <= 0) {
    return maxFontSizePx;
  }

  const availableWidthPx = Math.max(0, viewportWidthPx - horizontalPaddingPx);

  if (availableWidthPx <= 0) {
    return minFontSizePx;
  }

  return Number(
    clamp(
      (availableWidthPx / measuredWidthAtMaxFontSize) * maxFontSizePx,
      minFontSizePx,
      maxFontSizePx,
    ).toFixed(2),
  );
}
