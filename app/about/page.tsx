"use client";

import {
  type CSSProperties,
  type FormEvent,
  type Ref,
  startTransition,
  useEffect,
  useRef,
  useState,
} from "react";
import Image from "next/image";

import { AboutGlassSourceCanvas } from "@/components/glass/AboutGlassSourceCanvas";
import { SampledGlassLens } from "@/components/glass/SampledGlassLens";
import { useGlassCapability } from "@/components/glass/useGlassCapability";
import { useGhostStampFilter } from "@/components/GhostStampFilter";
import { HomeBackWaveButton } from "@/components/HomeBackWaveButton";
import { AboutNarrative } from "@/content/about";
import { SITE_CONFIG } from "@/content/site";
import {
  type AboutLensLayout,
  buildAboutLensLayout,
} from "@/lib/about-lens-layout";
import { GLASS_PROFILES } from "@/lib/glass";
import styles from "./about.module.css";

const EMPTY_LENS_LAYOUT: AboutLensLayout = {
  echoesFrom: { x: 0, y: 0 },
  orientation: { x: 0, y: 0 },
  fixedCenter: { x: 0, y: 0 },
};

function createStoryLensStyle(point: AboutLensLayout["echoesFrom"]) {
  return {
    "--lens-left": `calc(${point.x}px - (var(--lens-width) / 2))`,
    "--lens-top": `calc(${point.y}px - (var(--lens-height) / 2))`,
  } as CSSProperties;
}

function StoryNarrative({
  className,
  decorative = false,
  echoesFromRef,
  orientationRef,
}: {
  className?: string;
  decorative?: boolean;
  echoesFromRef?: Ref<HTMLSpanElement>;
  orientationRef?: Ref<HTMLSpanElement>;
}) {
  return (
    <AboutNarrative
      className={className}
      decorative={decorative}
      echoesFromRef={echoesFromRef}
      orientationRef={orientationRef}
      styles={{
        inlineAccent: styles.inlineAccent,
        lensAnchorInline: styles.lensAnchorInline,
        driftingCompassAccent: styles.driftingCompassAccent,
        creditBlock: styles.creditBlock,
        creditLink: styles.creditLink,
      }}
    />
  );
}

export default function AboutPage() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [lensLayout, setLensLayout] =
    useState<AboutLensLayout>(EMPTY_LENS_LAYOUT);
  const [aboutSourceCanvas, setAboutSourceCanvas] =
    useState<HTMLCanvasElement | null>(null);
  const contentLayerRef = useRef<HTMLDivElement | null>(null);
  const storyScrollRef = useRef<HTMLDivElement | null>(null);
  const storyBodyRef = useRef<HTMLDivElement | null>(null);
  const echoesFromRef = useRef<HTMLSpanElement | null>(null);
  const orientationRef = useRef<HTMLSpanElement | null>(null);
  const { id: stampFilterId, GhostStampFilter } = useGhostStampFilter();

  const configuredContactRecipient =
    process.env.NEXT_PUBLIC_CONTACT_EMAIL?.trim();
  const contactRecipient =
    configuredContactRecipient || SITE_CONFIG.contactEmail;
  const submitDisabled = contactRecipient.length === 0;
  const glassRenderer = useGlassCapability({
    hasCanvasSource: aboutSourceCanvas !== null,
    preferScene: true,
  });
  const echoesLensStyle =
    lensLayout.echoesFrom.x > 0
      ? createStoryLensStyle(lensLayout.echoesFrom)
      : undefined;
  const orientationLensStyle =
    lensLayout.orientation.x > 0
      ? createStoryLensStyle(lensLayout.orientation)
      : undefined;

  useEffect(() => {
    let frameId: number | null = null;

    const updateLensLayout = () => {
      const storyScroll = storyScrollRef.current;
      const storyBody = storyBodyRef.current;
      const echoesFrom = echoesFromRef.current;
      const orientation = orientationRef.current;

      let nextLensLayout = EMPTY_LENS_LAYOUT;

      if (storyScroll && storyBody && echoesFrom && orientation) {
        const storyViewportRect = storyScroll.getBoundingClientRect();
        const storyBodyRect = storyBody.getBoundingClientRect();
        const echoesFromRect = echoesFrom.getBoundingClientRect();
        const orientationRect = orientation.getBoundingClientRect();
        const availableViewportHeight =
          window.innerHeight - storyViewportRect.top - 24;
        const visibleStoryViewportRect =
          availableViewportHeight > 0 &&
          availableViewportHeight < storyViewportRect.height
            ? {
                ...storyViewportRect,
                height: availableViewportHeight,
              }
            : storyViewportRect;

        if (
          storyViewportRect.width > 0 &&
          storyViewportRect.height > 0 &&
          storyBodyRect.width > 0 &&
          storyBodyRect.height > 0 &&
          echoesFromRect.width > 0 &&
          echoesFromRect.height > 0 &&
          orientationRect.width > 0 &&
          orientationRect.height > 0
        ) {
          nextLensLayout = buildAboutLensLayout({
            storyBodyRect,
            storyViewportRect: visibleStoryViewportRect,
            echoesFromRect,
            orientationRect,
          });
        }
      }

      startTransition(() => {
        setLensLayout(nextLensLayout);
      });
    };

    const scheduleUpdate = () => {
      if (frameId !== null) {
        window.cancelAnimationFrame(frameId);
      }

      frameId = window.requestAnimationFrame(() => {
        frameId = null;
        updateLensLayout();
      });
    };

    scheduleUpdate();
    window.addEventListener("resize", scheduleUpdate);

    let observer: ResizeObserver | null = null;

    if (typeof ResizeObserver !== "undefined") {
      observer = new ResizeObserver(scheduleUpdate);

      if (contentLayerRef.current) {
        observer.observe(contentLayerRef.current);
      }

      if (storyScrollRef.current) {
        observer.observe(storyScrollRef.current);
      }

      if (storyBodyRef.current) {
        observer.observe(storyBodyRef.current);
      }

      if (echoesFromRef.current) {
        observer.observe(echoesFromRef.current);
      }

      if (orientationRef.current) {
        observer.observe(orientationRef.current);
      }
    }

    return () => {
      window.removeEventListener("resize", scheduleUpdate);

      if (frameId !== null) {
        window.cancelAnimationFrame(frameId);
      }

      observer?.disconnect();
    };
  }, []);

  const handleContactSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!contactRecipient) {
      return;
    }

    const trimmedEmail = email.trim();
    const trimmedMessage = message.trim();

    if (!trimmedEmail || !trimmedMessage) {
      return;
    }

    const subject = `${SITE_CONFIG.siteName} Contact`;
    const body = `From: ${trimmedEmail}\n\n${trimmedMessage}`;
    const href = `mailto:${contactRecipient}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;

    window.location.assign(href);
  };

  return (
    <main className={styles.aboutPage}>
      <GhostStampFilter />
      <HomeBackWaveButton className={styles.aboutBackButton} />

      <section className={styles.canvas}>
        <div ref={contentLayerRef} className={styles.contentLayer}>
          <AboutGlassSourceCanvas
            className={styles.aboutGlassSourceCanvas}
            contentRef={contentLayerRef}
            storyBodyRef={storyBodyRef}
            storyScrollRef={storyScrollRef}
            onCanvasReady={setAboutSourceCanvas}
          />

          <article className={styles.storyColumn}>
            <div className={styles.sectionHeader}>
              <h1
                className={styles.ghostHeading}
                style={{ filter: `url("#${stampFilterId}")` }}
              >
                About
              </h1>
            </div>

            <div ref={storyScrollRef} className={styles.storyScroll}>
              <div ref={storyBodyRef} className={styles.storyBody}>
                <div className={styles.storyEffectsLayer} aria-hidden="true">
                  <SampledGlassLens
                    renderer={glassRenderer}
                    sourceCanvas={aboutSourceCanvas}
                    profile={GLASS_PROFILES.aboutNarrativeLens}
                    className={`${styles.textEffect} ${styles.textEffectEchoes} ${styles.textEffectTop}`}
                    style={echoesLensStyle}
                    rotationDeg={0}
                    refractionScale={0.72}
                    dispersionScale={1.28}
                    highlightScale={0.24}
                    fillScale={0.06}
                    fallbackSource={
                      <div className={styles.storyLensContent}>
                        <div className={styles.storyLensViewport}>
                          <StoryNarrative
                            className={styles.storyNarrative}
                            decorative
                          />
                        </div>
                      </div>
                    }
                  />
                  <SampledGlassLens
                    renderer={glassRenderer}
                    sourceCanvas={aboutSourceCanvas}
                    profile={GLASS_PROFILES.aboutNarrativeLens}
                    className={`${styles.textEffect} ${styles.textEffectOrientation} ${styles.textEffectBottom}`}
                    style={orientationLensStyle}
                    rotationDeg={0}
                    refractionScale={0.72}
                    dispersionScale={1.28}
                    highlightScale={0.24}
                    fillScale={0.06}
                    fallbackSource={
                      <div className={styles.storyLensContent}>
                        <div className={styles.storyLensViewport}>
                          <StoryNarrative
                            className={styles.storyNarrative}
                            decorative
                          />
                        </div>
                      </div>
                    }
                  />
                </div>

                <StoryNarrative
                  className={styles.storyNarrative}
                  echoesFromRef={echoesFromRef}
                  orientationRef={orientationRef}
                />
              </div>
            </div>
          </article>

          <aside className={styles.contactColumn}>
            <h2
              className={styles.ghostHeading}
              style={{ filter: `url("#${stampFilterId}")` }}
            >
              Contact
            </h2>

            <p className={styles.contactIntro}>
              {SITE_CONFIG.instagramUrl ? (
                <>
                  <a
                    className={styles.contactInstagramLink}
                    href={SITE_CONFIG.instagramUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <Image
                      className={styles.contactInstagramIcon}
                      src="/instagram.svg"
                      width={16}
                      height={16}
                      alt=""
                      aria-hidden="true"
                    />
                    Follow us on Instagram
                  </a>
                  , or leave us a message.
                </>
              ) : (
                "Leave us a message."
              )}
            </p>

            <form className={styles.contactForm} onSubmit={handleContactSubmit}>
              <label
                className={styles.contactField}
                htmlFor="about-contact-email"
              >
                <span className={styles.contactLabel}>Your email</span>
                <input
                  id="about-contact-email"
                  type="email"
                  name="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  required
                  autoComplete="email"
                  className={styles.contactInput}
                  placeholder="you@example.com"
                />
              </label>

              <label
                className={styles.contactField}
                htmlFor="about-contact-message"
              >
                <span className={styles.contactLabel}>Message</span>
                <textarea
                  id="about-contact-message"
                  name="message"
                  value={message}
                  onChange={(event) => setMessage(event.target.value)}
                  required
                  rows={5}
                  className={styles.contactTextarea}
                  placeholder="Write a note"
                />
              </label>

              <button
                type="submit"
                className={styles.contactSubmit}
                disabled={submitDisabled}
              >
                Send
              </button>
            </form>
          </aside>
        </div>
      </section>
    </main>
  );
}
