"use client";

import { type CSSProperties, useEffect, useId, useState } from "react";
import Link from "next/link";
import {
  createCornerNavigationLanguageMap,
  getCornerNavigationLabel,
  getCornerNavigationLangTag,
  type CornerNavigationLanguage,
  type CornerRoute,
} from "@/lib/corner-navigation-language";
type CornerLayout = "home" | "inner";

interface CornerNavigationProps {
  current?: CornerRoute;
  layout?: CornerLayout;
}

const cornerItems: {
  href: string;
  label: string;
  key: CornerRoute;
  positionClass: string;
}[] = [
  {
    href: "/about",
    label: "About",
    key: "about",
    positionClass: "left-5 top-5 md:left-12 md:top-8",
  },
  {
    href: "/verify",
    label: "Submit your work",
    key: "submit",
    positionClass: "right-5 top-5 md:right-12 md:top-8",
  },
  {
    href: "/archive",
    label: "Archive",
    key: "archive",
    positionClass: "bottom-5 left-5 md:bottom-8 md:left-12",
  },
  {
    href: "/newsletter",
    label: "Newsletter",
    key: "newsletter",
    positionClass: "bottom-5 right-5 md:bottom-8 md:right-12",
  },
];

const cornerRouteOrder = cornerItems.map((item) => item.key);

export function CornerNavigation({ current, layout }: CornerNavigationProps) {
  const resolvedLayout: CornerLayout = layout ?? (current ? "inner" : "home");
  const [languageByRoute, setLanguageByRoute] = useState<Partial<
    Record<CornerRoute, CornerNavigationLanguage>
  > | null>(null);
  const textureFilterId = useId().replaceAll(":", "");

  useEffect(() => {
    let cancelled = false;
    requestAnimationFrame(() => {
      if (!cancelled) {
        setLanguageByRoute(createCornerNavigationLanguageMap(cornerRouteOrder));
      }
    });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <nav
      aria-label="Primary navigation"
      className="pointer-events-none absolute inset-0 z-30"
    >
      <svg
        aria-hidden="true"
        className="absolute w-0 h-0 overflow-hidden pointer-events-none"
        focusable="false"
        width="0"
        height="0"
      >
        <defs>
          <filter
            id={textureFilterId}
            x="-15%"
            y="-15%"
            width="130%"
            height="130%"
            colorInterpolationFilters="sRGB"
          >
            {/*
              Solid stamp: jagged/liquid edge distortion + mottled interior.
              Pipeline:
                turbulence → displace edges (rippling liquid feel)
                fine turbulence → threshold → clip to glyph → overlaid as grain
            */}
            <feTurbulence
              type="fractalNoise"
              baseFrequency="0.18"
              numOctaves="5"
              seed="3"
              result="edgeNoise"
            />
            <feDisplacementMap
              in="SourceGraphic"
              in2="edgeNoise"
              scale="16"
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
      {cornerItems.map((item) => {
        const isActive = current === item.key;
        const assignedLanguage = languageByRoute?.[item.key];
        const positionClass =
          resolvedLayout === "inner" && item.key === "about"
            ? "left-1/2 top-5 -translate-x-1/2 md:top-8"
            : item.positionClass;
        const label = assignedLanguage
          ? getCornerNavigationLabel(item.key, assignedLanguage)
          : item.label;
        const linkStyle = {
          "--corner-nav-color": isActive
            ? "var(--page-accent)"
            : "var(--foreground)",
          "--corner-nav-texture-opacity": isActive ? "0.72" : "0.62",
        } as CSSProperties;

        return (
          <Link
            key={item.key}
            href={item.href}
            aria-current={isActive ? "page" : undefined}
            className={`corner-nav-link pointer-events-auto absolute ${positionClass} rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--page-accent)] focus-visible:ring-offset-4 focus-visible:ring-offset-[var(--background)]`}
            style={linkStyle}
            lang={
              assignedLanguage
                ? getCornerNavigationLangTag(assignedLanguage)
                : undefined
            }
          >
            <span className="corner-nav-link__label">
              <span
                className="corner-nav-link__ink"
                style={{ filter: `url("#${textureFilterId}")` }}
              >
                {label}
              </span>
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
