"use client";

import { useEffect, useState } from "react";
import { getGlassRenderer, type GlassRenderer } from "@/lib/glass";
import { isWebGLSupported } from "@/lib/webgl";

interface UseGlassCapabilityOptions {
  hasCanvasSource: boolean;
  preferScene?: boolean;
}

function supportsDeclaration(property: string, value: string): boolean {
  if (typeof CSS === "undefined" || typeof CSS.supports !== "function") {
    return false;
  }

  return CSS.supports(property, value);
}

export function useGlassCapability({
  hasCanvasSource,
  preferScene = true,
}: UseGlassCapabilityOptions): GlassRenderer {
  const [renderer, setRenderer] = useState<GlassRenderer>("disabled");

  useEffect(() => {
    const reducedMotionQuery = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    );

    const updateRenderer = () => {
      const hasMaskSupport =
        supportsDeclaration("mask-image", "linear-gradient(#000,#000)") ||
        supportsDeclaration("-webkit-mask-image", "linear-gradient(#000,#000)");
      const hasBackdropSupport =
        supportsDeclaration("backdrop-filter", "blur(1px)") ||
        supportsDeclaration("-webkit-backdrop-filter", "blur(1px)");

      setRenderer(
        getGlassRenderer({
          reducedMotion: reducedMotionQuery.matches,
          hasMaskSupport,
          hasBackdropSupport,
          hasWebgl: preferScene ? isWebGLSupported() : false,
          hasCanvasSource,
        }),
      );
    };

    updateRenderer();
    reducedMotionQuery.addEventListener("change", updateRenderer);

    return () => {
      reducedMotionQuery.removeEventListener("change", updateRenderer);
    };
  }, [hasCanvasSource, preferScene]);

  return renderer;
}
