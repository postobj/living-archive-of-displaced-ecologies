import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("news page calendar matches the figma grayscale strip with square edges and slightly smaller month numerals", async () => {
  const cssSource = await readFile(
    new URL("../app/news/news.module.css", import.meta.url),
    "utf8",
  );

  assert.equal(cssSource.includes("--news-calendar-dark: #c3c3c3;"), true);
  assert.equal(cssSource.includes("rgba(217, 217, 217, 0.2)"), true);
  assert.equal(cssSource.includes("--news-accent-strong"), false);
  assert.equal(cssSource.includes("border-radius: 0;"), true);
  assert.equal(
    cssSource.includes("font-size: clamp(2rem, 3.6vw, 4rem);"),
    true,
  );
});

test("news detail poster supports pointer avoidance while keeping the floating motion", async () => {
  const [pageSource, cssSource] = await Promise.all([
    readFile(
      new URL("../app/news/NewsPageClient.tsx", import.meta.url),
      "utf8",
    ),
    readFile(new URL("../app/news/news.module.css", import.meta.url), "utf8"),
  ]);

  assert.equal(pageSource.includes("handleDetailPanelPointerMove"), true);
  assert.equal(pageSource.includes("handleDetailPanelPointerLeave"), true);
  assert.equal(pageSource.includes("activeDetailPosterMotion"), true);
  assert.equal(cssSource.includes("--poster-avoid-x"), true);
  assert.equal(cssSource.includes("--poster-avoid-y"), true);
  assert.equal(cssSource.includes(".activeDetailPosterMotion"), true);
  assert.equal(cssSource.includes("animation: poster-float"), true);
});

test("news page keeps the active month close to the base column width before detail expansion", async () => {
  const pageSource = await readFile(
    new URL("../app/news/NewsPageClient.tsx", import.meta.url),
    "utf8",
  );

  assert.equal(
    pageSource.includes('monthData.month === activeMonth ? "1fr" : "0.94fr"'),
    true,
  );
});

test("news page uses a vertically distributed layout for active months with multiple events", async () => {
  const [pageSource, cssSource] = await Promise.all([
    readFile(
      new URL("../app/news/NewsPageClient.tsx", import.meta.url),
      "utf8",
    ),
    readFile(new URL("../app/news/news.module.css", import.meta.url), "utf8"),
  ]);

  assert.match(
    pageSource,
    /const usesDistributedEventLayout =\s*hasEvents\s*&&\s*isActive\s*&&\s*!isDetailExpanded\s*&&\s*monthData\.items\.length > 1;/,
  );
  assert.match(
    pageSource,
    /usesDistributedEventLayout\s*\?\s*styles\.monthEventsDistributed\s*:\s*""/,
  );
  assert.match(
    pageSource,
    /usesDistributedEventLayout\s*\?\s*styles\.eventTagDistributed\s*:\s*""/,
  );
  assert.equal(pageSource.includes("styles.eventDivider"), true);

  assert.equal(cssSource.includes(".monthEventsDistributed"), true);
  assert.equal(cssSource.includes("justify-content: flex-start;"), true);
  assert.equal(cssSource.includes(".eventTagDistributed"), true);
  assert.equal(cssSource.includes("flex: 0 0 auto;"), true);
  assert.match(
    cssSource,
    /\.eventTagDistributed \.eventTitle\s*\{[^}]*margin-inline:\s*auto;[^}]*text-align:\s*center;[^}]*\}/,
  );
  assert.equal(cssSource.includes(".eventDivider"), true);
  assert.equal(cssSource.includes("flex: 1 1 0;"), true);
  assert.equal(
    cssSource.includes("font-size: clamp(1.15rem, 1.6vw, 1.55rem);"),
    true,
  );
});

test("news page centers event title copy in the active month column", async () => {
  const cssSource = await readFile(
    new URL("../app/news/news.module.css", import.meta.url),
    "utf8",
  );

  assert.match(
    cssSource,
    /\.monthEventsCentered \.eventTagInActiveMonth\s*\{[^}]*text-align:\s*center;[^}]*\}/,
  );
  assert.match(
    cssSource,
    /\.monthEventsCentered \.eventTitle\s*\{[^}]*margin-inline:\s*auto;[^}]*text-align:\s*center;[^}]*\}/,
  );
});

test("news page uses a red active-month overlay with soft figma-style edges", async () => {
  const cssSource = await readFile(
    new URL("../app/news/news.module.css", import.meta.url),
    "utf8",
  );

  assert.equal(
    cssSource.includes("--news-calendar-signal: rgba(228, 0, 0, 0.84);"),
    true,
  );
  assert.equal(cssSource.includes(".monthColumn::before"), true);
  assert.equal(cssSource.includes(".monthColumnActive::before"), true);
  assert.equal(cssSource.includes(".monthColumnDetailExpanded::before"), true);
  assert.equal(
    cssSource.includes(
      "inset 2px 2px 20px 2px var(--news-calendar-signal-highlight)",
    ),
    true,
  );
});

test("news page only applies expanded event styling after detail is open", async () => {
  const pageSource = await readFile(
    new URL("../app/news/NewsPageClient.tsx", import.meta.url),
    "utf8",
  );

  assert.match(
    pageSource,
    /const isExpandedSelection =\s*isDetailExpanded && selectedIndex === index;/,
  );
  assert.match(
    pageSource,
    /isExpandedSelection\s*\?\s*styles\.eventTagExpanded\s*:\s*""/,
  );
});

test("news page uses black text for the expanded event and smaller gray header circles", async () => {
  const cssSource = await readFile(
    new URL("../app/news/news.module.css", import.meta.url),
    "utf8",
  );

  assert.match(
    cssSource,
    /\.monthColumnDetailExpanded \.eventTagInActiveMonth\s*\{[^}]*color:\s*var\(--news-calendar-ink\);[^}]*\}/,
  );
  assert.match(
    cssSource,
    /\.detailNavCircleLeft,\s*\.detailNavCircleRight\s*\{[\s\S]*width:\s*34px;[\s\S]*height:\s*34px;/,
  );
});

test("news page reserves readable detail text space and lets the poster open in a lightbox", async () => {
  const [pageSource, cssSource] = await Promise.all([
    readFile(
      new URL("../app/news/NewsPageClient.tsx", import.meta.url),
      "utf8",
    ),
    readFile(new URL("../app/news/news.module.css", import.meta.url), "utf8"),
  ]);

  assert.equal(pageSource.includes("isPosterLightboxOpen"), true);
  assert.equal(pageSource.includes("handlePosterLightboxOpen"), true);
  assert.equal(pageSource.includes("handlePosterLightboxClose"), true);
  assert.equal(pageSource.includes("ImageLightbox"), true);
  assert.equal(pageSource.includes("lightboxAspectRatio"), true);
  assert.equal(pageSource.includes("new window.Image()"), true);
  assert.equal(pageSource.includes("activeDetailPosterButton"), true);

  assert.equal(cssSource.includes("--news-shell-height"), true);
  assert.equal(cssSource.includes("--news-poster-safe-space"), true);
  assert.equal(
    cssSource.includes("min-height: var(--news-shell-height);"),
    true,
  );
  assert.equal(cssSource.includes(".activeDetailPosterButton"), true);
  assert.equal(cssSource.includes(".newsLightbox"), true);
  assert.equal(cssSource.includes(".newsLightboxDialog"), true);
  assert.equal(cssSource.includes(".newsLightboxClose"), true);
  assert.equal(cssSource.includes("--news-lightbox-aspect-ratio"), true);
  assert.equal(
    cssSource.includes(
      "width: min(94vw, calc(90vh * var(--news-lightbox-aspect-ratio)));",
    ),
    true,
  );
  assert.equal(cssSource.includes("background: rgba(0, 0, 0, 0.6);"), false);
});
