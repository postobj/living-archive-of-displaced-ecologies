import {
  measureNaturalWidth,
  prepareWithSegments,
  type PreparedTextWithSegments,
} from "@chenglou/pretext";

interface CacheEntry {
  prepared: PreparedTextWithSegments;
}

const cache = new Map<string, CacheEntry>();
const MAX_CACHE_SIZE = 50;

function cacheKey(
  text: string,
  font: string,
  letterSpacingPx?: number,
): string {
  return `${text}|${font}|${letterSpacingPx ?? 0}`;
}

function getOrPrepare(
  text: string,
  font: string,
  letterSpacingPx?: number,
): PreparedTextWithSegments {
  const key = cacheKey(text, font, letterSpacingPx);

  const entry = cache.get(key);
  if (entry) return entry.prepared;

  if (cache.size >= MAX_CACHE_SIZE) {
    const firstKey = cache.keys().next().value;
    if (firstKey) cache.delete(firstKey);
  }

  const prepared = prepareWithSegments(text, font, {
    letterSpacing: letterSpacingPx,
  });
  cache.set(key, { prepared });
  return prepared;
}

/**
 * Measure the natural (single-line, unwrapped) width of text at a given font.
 * Uses pretext's canvas-based measurement — no DOM reflow.
 */
export function measureTextNaturalWidth(
  text: string,
  font: string,
  letterSpacingPx?: number,
): number {
  if (!text) return 0;
  const prepared = getOrPrepare(text, font, letterSpacingPx);
  return measureNaturalWidth(prepared);
}

/** Clear the measurement cache (call after fonts finish loading). */
export function clearTextMeasureCache(): void {
  cache.clear();
}
