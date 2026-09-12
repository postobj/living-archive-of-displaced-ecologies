"use client";

import { useId } from "react";

interface GhostStampFilterProps {
  /** Optional override for the filter ID. One is auto-generated via useId() if omitted. */
  id?: string;
}

/**
 * Invisible SVG that provides a turbulence + displacement + grain stamp filter
 * for ghost headings. Place it anywhere in the component tree and apply the
 * filter with:  style={{ filter: `url("#${id}")` }}
 */
export function GhostStampFilter({ id }: GhostStampFilterProps) {
  const generatedId = useId().replaceAll(":", "");
  const filterId = id ?? generatedId;

  return (
    <svg
      width="0"
      height="0"
      style={{ position: "absolute" }}
      aria-hidden="true"
    >
      <defs>
        <filter
          id={filterId}
          x="-15%"
          y="-15%"
          width="130%"
          height="130%"
          colorInterpolationFilters="sRGB"
        >
          <feTurbulence
            type="fractalNoise"
            baseFrequency="0.18"
            numOctaves="5"
            seed="13"
            result="edgeNoise"
          />
          <feDisplacementMap
            in="SourceGraphic"
            in2="edgeNoise"
            scale="10"
            xChannelSelector="R"
            yChannelSelector="G"
            result="roughGlyph"
          />
          <feTurbulence
            type="fractalNoise"
            baseFrequency="0.4"
            numOctaves="3"
            seed="11"
            result="fineGrain"
          />
          <feColorMatrix
            in="fineGrain"
            type="matrix"
            values="0 0 0 0 1
                    0 0 0 0 1
                    0 0 0 0 1
                    0 0 0 3.5 -1.8"
            result="grainMask"
          />
          <feComposite
            in="grainMask"
            in2="SourceAlpha"
            operator="in"
            result="grainInGlyph"
          />
          <feMerge>
            <feMergeNode in="roughGlyph" />
            <feMergeNode in="grainInGlyph" />
          </feMerge>
        </filter>
      </defs>
    </svg>
  );
}

/**
 * Hook that returns a stable filter ID and the <GhostStampFilter> element,
 * so callers don't need to manage useId themselves.
 */
export function useGhostStampFilter() {
  const id = useId().replaceAll(":", "");

  return {
    id,
    GhostStampFilter: () => <GhostStampFilter id={id} />,
  };
}
