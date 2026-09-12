import type { Ref } from "react";

/**
 * About-page narrative content.
 *
 * This file is CONTENT: the project description and credits shown on the
 * about page. Replace this component's prose with your archive's own story.
 * The layout, glass-lens effects, and contact form live in
 * app/about/page.tsx; this component only provides the prose.
 *
 * The two refs mark inline phrases that the about page anchors its glass
 * lenses to — attach them to whichever spans should sit behind a lens.
 */
export interface AboutNarrativeStyles {
  inlineAccent: string;
  lensAnchorInline: string;
  driftingCompassAccent: string;
  creditBlock: string;
  creditLink: string;
}

export interface AboutNarrativeProps {
  className?: string;
  /** When true, render links as plain text (used inside decorative lens copies). */
  decorative?: boolean;
  echoesFromRef?: Ref<HTMLSpanElement>;
  orientationRef?: Ref<HTMLSpanElement>;
  styles: AboutNarrativeStyles;
}

export function AboutNarrative({
  className,
  decorative = false,
  echoesFromRef,
  orientationRef,
  styles,
}: AboutNarrativeProps) {
  return (
    <div className={className}>
      <p>
        <span className={styles.inlineAccent}>
          <span ref={echoesFromRef} className={styles.lensAnchorInline}>
            This archive
          </span>
        </span>{" "}
        is built on an open-source platform for community storytelling. It
        transcends the conventional boundaries of a website to emerge as a
        gentle deconstruction of traditional, unidirectional storytelling: texts
        authored by contributors function simultaneously as spatial anchors and
        narrative threads, inviting audiences to move fluidly across nonlinear
        time and through the divergent trajectories of individual lives.
      </p>

      <p>
        In place of a static navigation bar, the interface is guided by a{" "}
        <span className={styles.driftingCompassAccent}>Drifting Compass:</span>{" "}
        a floating element that drifts across the screen, offering{" "}
        <span ref={orientationRef} className={styles.lensAnchorInline}>
          orientation
        </span>{" "}
        not only through time and place, but also through mood, allowing each
        visitor to find their own way in.
      </p>

      <p>
        Replace this narrative with your archive&rsquo;s own story: who it
        gathers, what it safeguards, and why it exists. The three stories it
        ships with are fictional examples — the constellation is waiting for
        real ones.
      </p>

      <p className={styles.creditBlock}>
        built with:{" "}
        {decorative ? (
          <span className={styles.creditLink}>
            the Echoes from Afar platform
          </span>
        ) : (
          <a
            className={styles.creditLink}
            href="https://github.com/echoes-from-afar"
            target="_blank"
            rel="noopener noreferrer"
          >
            the Echoes from Afar platform
          </a>
        )}
      </p>
    </div>
  );
}
