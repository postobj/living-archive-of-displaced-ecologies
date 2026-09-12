"use client";

import Image from "next/image";
import {
  Fragment,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
} from "react";
import { HomeBackWaveButton } from "@/components/HomeBackWaveButton";
import {
  CalendarIcon,
  ClockIcon,
  PinIcon,
  TagIcon,
  TicketIcon,
} from "@/components/icons";
import { ImageLightbox } from "@/components/ImageLightbox";
import { type NewsMonth, type NewsYearData } from "@/lib/news-types";
import { googleCalendarUrl, icsBlobUrl } from "@/lib/calendar-links";
import styles from "./news.module.css";

interface NewsPageClientProps {
  newsYear: NewsYearData;
}

interface ExpandedNewsEvent {
  month: number;
  index: number;
}

interface EventDateDisplay {
  monthShort: string;
  dayLabel: string;
  isoDate?: string;
}

const MONTH_SHORT_LABELS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
] as const;

const POSTER_AVOIDANCE_RADIUS_MULTIPLIER = 0.94;
const POSTER_AVOIDANCE_MAX_X = 48;
const POSTER_AVOIDANCE_MAX_Y = 24;
const NEWS_LIGHTBOX_FALLBACK_ASPECT_RATIO = 3 / 4;

function isExternalLink(value: string): boolean {
  return /^https?:\/\//i.test(value);
}

function getEventDateDisplay(
  dateLabel: string,
  fallbackMonth: number,
  year: number,
): EventDateDisplay {
  const normalizedLabel = dateLabel.trim();
  const match = /^(\d{1,2})\/(\d{1,2})$/.exec(normalizedLabel);
  const fallbackMonthSafe =
    fallbackMonth >= 1 && fallbackMonth <= 12 ? fallbackMonth : 1;

  if (!match) {
    return {
      monthShort: MONTH_SHORT_LABELS[fallbackMonthSafe - 1] ?? "Month",
      dayLabel: normalizedLabel,
    };
  }

  const parsedMonth = Number(match[1]);
  const parsedDay = Number(match[2]);
  const month =
    parsedMonth >= 1 && parsedMonth <= 12 ? parsedMonth : fallbackMonthSafe;
  const dayIsValid = parsedDay >= 1 && parsedDay <= 31;

  return {
    monthShort: MONTH_SHORT_LABELS[month - 1] ?? String(month),
    dayLabel: dayIsValid ? String(parsedDay).padStart(2, "0") : match[2],
    isoDate: dayIsValid
      ? `${year}-${String(month).padStart(2, "0")}-${String(parsedDay).padStart(2, "0")}`
      : undefined,
  };
}

export default function NewsPageClient({ newsYear }: NewsPageClientProps) {
  const activeDetailPosterRef = useRef<HTMLButtonElement | null>(null);
  const posterTriggerFocusRef = useRef<HTMLButtonElement | null>(null);
  const posterAvoidanceFrameRef = useRef<number | null>(null);

  const [currentDate] = useState<Date>(() => new Date());
  const currentMonth = currentDate.getMonth() + 1;

  const [activeMonth, setActiveMonth] = useState<number>(currentMonth);
  const [selectedEventIndexByMonth, setSelectedEventIndexByMonth] = useState<
    Record<number, number>
  >({});
  const [expandedEvent, setExpandedEvent] = useState<ExpandedNewsEvent | null>(
    null,
  );
  const [isPosterLightboxOpen, setIsPosterLightboxOpen] = useState(false);
  const [measuredAspectRatio, setMeasuredAspectRatio] = useState<number | null>(
    null,
  );

  function handleMonthClick(monthData: NewsMonth) {
    if (monthData.month !== activeMonth) {
      setExpandedEvent(null);
      setIsPosterLightboxOpen(false);
    }

    setActiveMonth(monthData.month);
    if (monthData.items.length === 0) {
      return;
    }

    setSelectedEventIndexByMonth((previous) =>
      previous[monthData.month] !== undefined
        ? previous
        : { ...previous, [monthData.month]: 0 },
    );
  }

  function handleEventClick(month: number, index: number) {
    setIsPosterLightboxOpen(false);
    setActiveMonth(month);
    setSelectedEventIndexByMonth((previous) => ({
      ...previous,
      [month]: index,
    }));
    setExpandedEvent({ month, index });
  }

  function handlePosterLightboxOpen(trigger: HTMLButtonElement) {
    posterTriggerFocusRef.current = trigger;
    handleDetailPanelPointerLeave();
    setIsPosterLightboxOpen(true);
  }

  function handlePosterLightboxClose() {
    setIsPosterLightboxOpen(false);
  }

  function queuePosterOffset(nextX: number, nextY: number) {
    if (posterAvoidanceFrameRef.current !== null) {
      window.cancelAnimationFrame(posterAvoidanceFrameRef.current);
    }

    posterAvoidanceFrameRef.current = window.requestAnimationFrame(() => {
      const poster = activeDetailPosterRef.current;
      if (!poster) {
        posterAvoidanceFrameRef.current = null;
        return;
      }

      poster.style.setProperty("--poster-avoid-x", `${nextX.toFixed(2)}px`);
      poster.style.setProperty("--poster-avoid-y", `${nextY.toFixed(2)}px`);
      posterAvoidanceFrameRef.current = null;
    });
  }

  function handleDetailPanelPointerLeave() {
    queuePosterOffset(0, 0);
  }

  function handleDetailPanelPointerMove(event: ReactPointerEvent<HTMLElement>) {
    if (
      event.pointerType !== "mouse" ||
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      handleDetailPanelPointerLeave();
      return;
    }

    const poster = activeDetailPosterRef.current;
    if (!poster) {
      return;
    }

    const posterRect = poster.getBoundingClientRect();
    const centerX = posterRect.left + posterRect.width / 2;
    const centerY = posterRect.top + posterRect.height / 2;
    const deltaX = event.clientX - centerX;
    const deltaY = event.clientY - centerY;
    const distance = Math.hypot(deltaX, deltaY);
    const radius =
      Math.max(posterRect.width, posterRect.height) *
      POSTER_AVOIDANCE_RADIUS_MULTIPLIER;

    if (!Number.isFinite(distance) || distance > radius) {
      handleDetailPanelPointerLeave();
      return;
    }

    const intensity = (radius - distance) / radius;
    const nextX = (deltaX > 0 ? 0.6 : 1) * POSTER_AVOIDANCE_MAX_X * intensity;
    const nextY =
      (deltaY > 0 ? -1 : -0.38) * POSTER_AVOIDANCE_MAX_Y * intensity;

    queuePosterOffset(nextX, nextY);
  }

  useEffect(() => {
    if (posterAvoidanceFrameRef.current !== null) {
      window.cancelAnimationFrame(posterAvoidanceFrameRef.current);
      posterAvoidanceFrameRef.current = null;
    }

    const poster = activeDetailPosterRef.current;
    if (!poster) {
      return;
    }

    poster.style.setProperty("--poster-avoid-x", "0px");
    poster.style.setProperty("--poster-avoid-y", "0px");
  }, [expandedEvent]);

  useEffect(() => {
    return () => {
      if (posterAvoidanceFrameRef.current !== null) {
        window.cancelAnimationFrame(posterAvoidanceFrameRef.current);
      }
    };
  }, []);

  const expandedMonth = expandedEvent?.month ?? null;
  const expandedMonthData =
    expandedMonth === null
      ? null
      : (newsYear.months.find(
          (monthData) => monthData.month === expandedMonth,
        ) ?? null);
  const expandedSelectedIndex =
    expandedMonthData === null
      ? null
      : (selectedEventIndexByMonth[expandedMonthData.month] ?? 0);
  const expandedDetailEvent =
    expandedMonthData !== null && expandedSelectedIndex !== null
      ? (expandedMonthData.items[expandedSelectedIndex] ?? null)
      : null;
  const expandedDetailDate =
    expandedDetailEvent !== null && expandedMonthData !== null
      ? getEventDateDisplay(
          expandedDetailEvent.dateLabel,
          expandedMonthData.month,
          newsYear.year,
        )
      : null;

  useEffect(() => {
    const posterImage = expandedDetailEvent?.posterImage;
    if (!posterImage) {
      return;
    }

    let isCancelled = false;
    const posterProbe = new window.Image();

    posterProbe.onload = () => {
      if (isCancelled) {
        return;
      }

      const { naturalWidth, naturalHeight } = posterProbe;
      if (naturalWidth > 0 && naturalHeight > 0) {
        setMeasuredAspectRatio(naturalWidth / naturalHeight);
        return;
      }

      setMeasuredAspectRatio(NEWS_LIGHTBOX_FALLBACK_ASPECT_RATIO);
    };

    posterProbe.onerror = () => {
      if (!isCancelled) {
        setMeasuredAspectRatio(NEWS_LIGHTBOX_FALLBACK_ASPECT_RATIO);
      }
    };

    posterProbe.src = posterImage;

    return () => {
      isCancelled = true;
      posterProbe.onload = null;
      posterProbe.onerror = null;
    };
  }, [expandedDetailEvent?.posterImage]);

  const lightboxAspectRatio =
    expandedDetailEvent?.posterImage && measuredAspectRatio !== null
      ? measuredAspectRatio
      : NEWS_LIGHTBOX_FALLBACK_ASPECT_RATIO;

  const monthGridTemplate = useMemo(() => {
    if (expandedMonth === null) {
      return newsYear.months
        .map((monthData) =>
          monthData.month === activeMonth ? "1fr" : "0.94fr",
        )
        .join(" ");
    }

    return newsYear.months
      .map((monthData) =>
        monthData.month === expandedMonth ? "10fr" : "0.25fr",
      )
      .join(" ");
  }, [activeMonth, expandedMonth, newsYear.months]);

  return (
    <main
      className={`relative min-h-screen overflow-hidden bg-[var(--background)] text-[var(--foreground)] ${styles.newsPage}`}
    >
      <HomeBackWaveButton />

      <section className={styles.newsShell}>
        <div className={styles.monthGridScroller}>
          <div className={styles.monthGridStage}>
            <div
              className={styles.monthGrid}
              style={{ gridTemplateColumns: monthGridTemplate }}
            >
              {newsYear.months.map((monthData) => {
                const hasEvents = monthData.items.length > 0;
                const isActive = monthData.month === activeMonth;
                const isDetailExpanded = expandedMonth === monthData.month;
                const usesDistributedEventLayout =
                  hasEvents &&
                  isActive &&
                  !isDetailExpanded &&
                  monthData.items.length > 1;
                const usesCenteredEventLayout =
                  hasEvents &&
                  isActive &&
                  !isDetailExpanded &&
                  monthData.items.length === 1;
                const selectedIndex =
                  selectedEventIndexByMonth[monthData.month] ?? 0;
                const detailEvent =
                  isDetailExpanded && hasEvents ? expandedDetailEvent : null;
                const detailDate =
                  isDetailExpanded && detailEvent !== null
                    ? expandedDetailDate
                    : null;

                return (
                  <article
                    key={`month-${monthData.month}`}
                    onClick={() => handleMonthClick(monthData)}
                    className={`${styles.monthColumn} ${
                      isActive ? styles.monthColumnActive : ""
                    } ${isDetailExpanded ? styles.monthColumnDetailExpanded : ""} ${
                      hasEvents && isDetailExpanded
                        ? styles.monthColumnHasDetail
                        : ""
                    } ${hasEvents ? "" : styles.monthColumnEmpty}`}
                  >
                    <button
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        handleMonthClick(monthData);
                      }}
                      className={`${styles.monthHeader} display-font`}
                      aria-pressed={isActive}
                    >
                      {isDetailExpanded && (
                        <>
                          <span
                            className={styles.detailNavCircleLeft}
                            aria-hidden
                          />
                          <span
                            className={styles.detailNavCircleRight}
                            aria-hidden
                          />
                        </>
                      )}
                      {monthData.month}
                      {monthData.month === currentMonth && (
                        <span className={styles.currentMonthDot} aria-hidden />
                      )}
                    </button>

                    <div
                      className={`${styles.monthEvents} ${
                        hasEvents && isActive ? styles.monthEventsActive : ""
                      } ${
                        hasEvents && isDetailExpanded
                          ? styles.monthEventsDetailExpanded
                          : ""
                      } ${
                        usesDistributedEventLayout
                          ? styles.monthEventsDistributed
                          : ""
                      } ${
                        usesCenteredEventLayout
                          ? styles.monthEventsCentered
                          : ""
                      }`}
                    >
                      {hasEvents ? (
                        monthData.items.map((item, index) => {
                          const isExpandedSelection =
                            isDetailExpanded && selectedIndex === index;

                          return (
                            <Fragment key={item.id}>
                              <button
                                type="button"
                                onClick={(event) => {
                                  event.stopPropagation();
                                  handleEventClick(monthData.month, index);
                                }}
                                className={`${styles.eventTag} ${
                                  isActive ? styles.eventTagInActiveMonth : ""
                                } ${
                                  usesDistributedEventLayout
                                    ? styles.eventTagDistributed
                                    : ""
                                } ${isExpandedSelection ? styles.eventTagActive : ""} ${
                                  isExpandedSelection
                                    ? styles.eventTagExpanded
                                    : ""
                                }`}
                              >
                                <span
                                  className={`display-font ${styles.eventDate}`}
                                >
                                  {item.dateLabel}
                                </span>
                                <span className={styles.eventTitle}>
                                  {item.title}
                                </span>
                              </button>

                              {usesDistributedEventLayout &&
                              index < monthData.items.length - 1 ? (
                                <span
                                  aria-hidden
                                  className={styles.eventDivider}
                                />
                              ) : null}
                            </Fragment>
                          );
                        })
                      ) : (
                        <span className={styles.monthEmptyIndicator}>
                          No event
                        </span>
                      )}
                    </div>

                    {detailEvent ? (
                      <section
                        className={styles.activeColumnDetailPanel}
                        onClick={(event) => event.stopPropagation()}
                        onPointerMove={handleDetailPanelPointerMove}
                        onPointerLeave={handleDetailPanelPointerLeave}
                      >
                        <div className={styles.activeDetailMetaRow}>
                          <span className={styles.activeDetailMetaLabel}>
                            Event Date
                          </span>
                          {detailDate?.isoDate ? (
                            <time
                              dateTime={detailDate.isoDate}
                              className={`display-font ${styles.activeDetailDateBadge}`}
                            >
                              <span className={styles.activeDetailDateMonth}>
                                {detailDate.monthShort}
                              </span>
                              <span className={styles.activeDetailDateDay}>
                                {detailDate.dayLabel}
                              </span>
                              <span className={styles.activeDetailDateYear}>
                                {newsYear.year}
                              </span>
                            </time>
                          ) : (
                            <span
                              className={`display-font ${styles.activeDetailDateBadge}`}
                            >
                              {detailEvent.dateLabel}
                            </span>
                          )}
                        </div>

                        <h2 className={styles.activeDetailTitle}>
                          {detailEvent.title}
                        </h2>

                        <div className={styles.activeDetailBody}>
                          <div className={styles.activeDetailText}>
                            {detailEvent.description.map((paragraph, index) => (
                              <p key={`${detailEvent.id}-detail-${index}`}>
                                {paragraph}
                              </p>
                            ))}
                          </div>

                          <figure className={styles.activeDetailPoster}>
                            <button
                              ref={activeDetailPosterRef}
                              type="button"
                              className={styles.activeDetailPosterButton}
                              aria-controls="news-poster-lightbox"
                              aria-expanded={isPosterLightboxOpen}
                              aria-haspopup="dialog"
                              aria-label={`Open poster for ${detailEvent.title}`}
                              onClick={(event) => {
                                handlePosterLightboxOpen(event.currentTarget);
                              }}
                            >
                              <div className={styles.activeDetailPosterMotion}>
                                {detailEvent.posterVideo ? (
                                  <video
                                    src={detailEvent.posterVideo}
                                    autoPlay
                                    loop
                                    muted
                                    playsInline
                                    className={styles.activeDetailPosterVideo}
                                  />
                                ) : detailEvent.posterImage ? (
                                  <Image
                                    src={detailEvent.posterImage}
                                    alt={detailEvent.title}
                                    fill
                                    sizes="(max-width: 1100px) 32vw, 22vw"
                                    className={styles.activeDetailPosterImage}
                                  />
                                ) : (
                                  <div
                                    className={
                                      styles.activeDetailPosterPlaceholder
                                    }
                                  >
                                    {detailDate?.isoDate ? (
                                      <time
                                        dateTime={detailDate.isoDate}
                                        className={`display-font ${styles.activeDetailPosterDate}`}
                                      >
                                        {detailDate.monthShort}{" "}
                                        {detailDate.dayLabel}
                                      </time>
                                    ) : (
                                      <span
                                        className={`display-font ${styles.activeDetailPosterDate}`}
                                      >
                                        {detailEvent.dateLabel}
                                      </span>
                                    )}
                                    <p
                                      className={styles.activeDetailPosterTitle}
                                    >
                                      {detailEvent.title}
                                    </p>
                                  </div>
                                )}
                              </div>
                            </button>
                          </figure>
                        </div>

                        {(detailEvent.time ||
                          detailEvent.location ||
                          detailEvent.category ||
                          detailEvent.admission) && (
                          <div className={styles.eventMetaSection}>
                            {detailEvent.time &&
                              (() => {
                                const gCal = googleCalendarUrl(detailEvent);
                                const icsUrl = icsBlobUrl(detailEvent);
                                return (
                                  <p className={styles.eventMetaRow}>
                                    <ClockIcon
                                      size={15}
                                      className={styles.eventMetaIcon}
                                    />
                                    <span className={styles.eventMetaValue}>
                                      {detailEvent.time}
                                    </span>
                                    {gCal && (
                                      <span
                                        className={styles.eventMetaCalLinks}
                                      >
                                        <a
                                          href={gCal}
                                          target="_blank"
                                          rel="noreferrer"
                                          className={styles.eventMetaCalButton}
                                          title="Add to Google Calendar"
                                        >
                                          <CalendarIcon size={13} />
                                          Google
                                        </a>
                                        {icsUrl && (
                                          <a
                                            href={icsUrl}
                                            download={`${detailEvent.id}.ics`}
                                            className={
                                              styles.eventMetaCalButton
                                            }
                                            title="Download for Apple Calendar"
                                          >
                                            ics
                                          </a>
                                        )}
                                      </span>
                                    )}
                                  </p>
                                );
                              })()}
                            {detailEvent.location && (
                              <p className={styles.eventMetaRow}>
                                <PinIcon
                                  size={15}
                                  className={styles.eventMetaIcon}
                                />
                                <span className={styles.eventMetaValue}>
                                  {detailEvent.location}
                                </span>
                              </p>
                            )}
                            {detailEvent.category && (
                              <p className={styles.eventMetaRow}>
                                <TagIcon
                                  size={15}
                                  className={styles.eventMetaIcon}
                                />
                                <span className={styles.eventMetaValue}>
                                  {detailEvent.category}
                                </span>
                              </p>
                            )}
                            {detailEvent.admission && (
                              <p className={styles.eventMetaRow}>
                                <TicketIcon
                                  size={15}
                                  className={styles.eventMetaIcon}
                                />
                                <span className={styles.eventMetaValue}>
                                  {detailEvent.admission}
                                  {detailEvent.link && (
                                    <a
                                      href={detailEvent.link}
                                      target={
                                        isExternalLink(detailEvent.link)
                                          ? "_blank"
                                          : undefined
                                      }
                                      rel={
                                        isExternalLink(detailEvent.link)
                                          ? "noreferrer"
                                          : undefined
                                      }
                                      className={styles.eventMetaTicketLink}
                                    >
                                      Tickets
                                    </a>
                                  )}
                                </span>
                              </p>
                            )}
                          </div>
                        )}

                        {!detailEvent.admission && detailEvent.link && (
                          <p className={styles.activeDetailLinkRow}>
                            <span>Link:</span>
                            <a
                              href={detailEvent.link}
                              target={
                                isExternalLink(detailEvent.link)
                                  ? "_blank"
                                  : undefined
                              }
                              rel={
                                isExternalLink(detailEvent.link)
                                  ? "noreferrer"
                                  : undefined
                              }
                              className={styles.activeDetailLink}
                            >
                              {detailEvent.linkLabel ?? detailEvent.link}
                            </a>
                          </p>
                        )}
                      </section>
                    ) : null}
                  </article>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      <ImageLightbox
        dialogId="news-poster-lightbox"
        isOpen={Boolean(expandedDetailEvent && isPosterLightboxOpen)}
        onClose={handlePosterLightboxClose}
        ariaLabel={
          expandedDetailEvent
            ? `${expandedDetailEvent.title} poster`
            : "Event poster"
        }
        imageSrc={
          expandedDetailEvent?.posterVideo
            ? undefined
            : expandedDetailEvent?.posterImage
        }
        imageAlt={expandedDetailEvent?.title ?? "Event poster"}
        imageSizes="(max-width: 900px) 88vw, 70vw"
        overlayClassName={styles.newsLightbox}
        dialogClassName={styles.newsLightboxDialog}
        frameClassName={styles.newsLightboxPoster}
        frameStyle={
          {
            "--news-lightbox-aspect-ratio": String(lightboxAspectRatio),
          } as CSSProperties
        }
        contentClassName={styles.newsLightboxPosterMotion}
        imageClassName={styles.newsLightboxPosterImage}
        closeButtonClassName={styles.newsLightboxClose}
        onAfterCloseFocus={() => {
          posterTriggerFocusRef.current?.focus();
        }}
      >
        {expandedDetailEvent?.posterVideo ? (
          <video
            src={expandedDetailEvent.posterVideo}
            autoPlay
            loop
            muted
            playsInline
            className={styles.newsLightboxPosterVideo}
          />
        ) : expandedDetailEvent ? (
          <div className={styles.newsLightboxPosterPlaceholder}>
            {expandedDetailDate?.isoDate ? (
              <time
                dateTime={expandedDetailDate.isoDate}
                className={`display-font ${styles.newsLightboxPosterDate}`}
              >
                {expandedDetailDate.monthShort} {expandedDetailDate.dayLabel}
              </time>
            ) : (
              <span className={`display-font ${styles.newsLightboxPosterDate}`}>
                {expandedDetailEvent.dateLabel}
              </span>
            )}
            <p className={styles.newsLightboxPosterTitle}>
              {expandedDetailEvent.title}
            </p>
          </div>
        ) : null}
      </ImageLightbox>
    </main>
  );
}
