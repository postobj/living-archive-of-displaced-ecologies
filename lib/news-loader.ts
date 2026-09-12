import fs from "fs";
import path from "path";
import matter from "gray-matter";
import type { NewsEvent, NewsMonth, NewsYearData } from "@/lib/news-types";

const newsDirectory = path.join(process.cwd(), "content", "news");

function createEmptyMonths(): NewsMonth[] {
  return Array.from({ length: 12 }, (_, index) => ({
    month: index + 1,
    items: [],
  }));
}

interface NewsFrontmatter {
  dateLabel?: string;
  title?: string;
  link?: string;
  linkLabel?: string;
  posterImage?: string;
  posterVideo?: string;
  year?: number;
  time?: string;
  endTime?: string;
  location?: string;
  category?: string;
  admission?: string;
}

function readNewsFromDisk(): NewsYearData[] {
  if (!fs.existsSync(newsDirectory)) {
    return [];
  }

  const files = fs.readdirSync(newsDirectory).filter((f) => /\.mdx?$/.test(f));

  const yearMap = new Map<number, NewsMonth[]>();

  for (const file of files) {
    const slug = file.replace(/\.mdx?$/, "");
    const filePath = path.join(newsDirectory, file);
    const raw = fs.readFileSync(filePath, "utf8");
    const { data, content } = matter(raw);
    const fm = data as NewsFrontmatter;

    const dateLabel = fm.dateLabel?.trim() ?? "";
    const year = fm.year ?? new Date().getFullYear();

    const monthMatch = /^(\d{1,2})\//.exec(dateLabel);
    const month = monthMatch ? parseInt(monthMatch[1], 10) : 1;
    const safeMonth = month >= 1 && month <= 12 ? month : 1;

    const body = content.trim();
    const description = body
      ? body
          .split(/\n{2,}/)
          .map((p) => p.trim())
          .filter(Boolean)
      : [];

    const event: NewsEvent = {
      id: slug,
      dateLabel,
      title: fm.title?.trim() ?? slug,
      description,
      link: fm.link?.trim(),
      linkLabel: fm.linkLabel?.trim(),
      posterImage: fm.posterImage?.trim(),
      posterVideo: fm.posterVideo?.trim(),
      time: fm.time?.trim(),
      endTime: fm.endTime?.trim(),
      location: fm.location?.trim(),
      category: fm.category?.trim(),
      admission: fm.admission?.trim(),
    };

    if (!yearMap.has(year)) {
      yearMap.set(year, createEmptyMonths());
    }

    yearMap.get(year)![safeMonth - 1].items.push(event);
  }

  for (const months of yearMap.values()) {
    for (const monthData of months) {
      monthData.items.sort((a, b) => {
        const aDay = parseInt(a.dateLabel.split("/")[1] ?? "0", 10) || 0;
        const bDay = parseInt(b.dateLabel.split("/")[1] ?? "0", 10) || 0;
        return aDay - bDay;
      });
    }
  }

  return Array.from(yearMap.entries()).map(([year, months]) => ({
    year,
    months,
  }));
}

let cachedNewsData: NewsYearData[] | null = null;

function getAllNewsData(): NewsYearData[] {
  if (process.env.NODE_ENV === "production") {
    if (!cachedNewsData) {
      cachedNewsData = readNewsFromDisk();
    }
    return cachedNewsData;
  }
  return readNewsFromDisk();
}

export function getNewsYear(
  year: number = new Date().getFullYear(),
): NewsYearData {
  const allData = getAllNewsData();
  return (
    allData.find((d) => d.year === year) ?? {
      year,
      months: createEmptyMonths(),
    }
  );
}

function monthDistance(from: number, to: number): number {
  const diff = Math.abs(from - to);
  return Math.min(diff, 12 - diff);
}

export function resolveInitialActiveMonth(
  data: NewsYearData,
  now: Date = new Date(),
): number {
  const currentMonth = now.getMonth() + 1;
  const current = data.months.find((month) => month.month === currentMonth);
  if (current && current.items.length > 0) {
    return currentMonth;
  }

  const nonEmptyMonths = data.months.filter((month) => month.items.length > 0);
  if (nonEmptyMonths.length === 0) {
    return currentMonth;
  }

  const sorted = [...nonEmptyMonths].sort((a, b) => {
    const distanceA = monthDistance(currentMonth, a.month);
    const distanceB = monthDistance(currentMonth, b.month);
    if (distanceA !== distanceB) {
      return distanceA - distanceB;
    }

    const isAPastOrCurrent = a.month <= currentMonth;
    const isBPastOrCurrent = b.month <= currentMonth;
    if (isAPastOrCurrent !== isBPastOrCurrent) {
      return isAPastOrCurrent ? -1 : 1;
    }

    return a.month - b.month;
  });

  return sorted[0]?.month ?? currentMonth;
}
