import { SITE_CONFIG } from "../content/site.ts";
import type { NewsEvent } from "@/lib/news-types";

function parseEventDate(event: NewsEvent): {
  start: Date;
  end: Date;
} | null {
  const dateMatch = /^(\d{1,2})\/(\d{1,2})$/.exec(event.dateLabel);
  if (!dateMatch || !event.time) return null;

  const month = parseInt(dateMatch[1], 10);
  const day = parseInt(dateMatch[2], 10);
  const year = new Date().getFullYear();

  const timeMatch = /^(\d{1,2}):(\d{2})$/.exec(event.time);
  if (!timeMatch) return null;

  const startHour = parseInt(timeMatch[1], 10);
  const startMin = parseInt(timeMatch[2], 10);

  const start = new Date(year, month - 1, day, startHour, startMin);

  let end: Date;
  if (event.endTime) {
    const endMatch = /^(\d{1,2}):(\d{2})$/.exec(event.endTime);
    if (endMatch) {
      const endHour = parseInt(endMatch[1], 10);
      const endMin = parseInt(endMatch[2], 10);
      end = new Date(year, month - 1, day, endHour, endMin);
    } else {
      end = new Date(start.getTime() + 2 * 60 * 60 * 1000);
    }
  } else {
    end = new Date(start.getTime() + 2 * 60 * 60 * 1000);
  }

  return { start, end };
}

function formatGoogleDate(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return [
    d.getFullYear(),
    pad(d.getMonth() + 1),
    pad(d.getDate()),
    "T",
    pad(d.getHours()),
    pad(d.getMinutes()),
    "00",
  ].join("");
}

export function googleCalendarUrl(event: NewsEvent): string | null {
  const parsed = parseEventDate(event);
  if (!parsed) return null;

  const base = "https://calendar.google.com/calendar/render";
  const search = new URLSearchParams();
  search.set("action", "TEMPLATE");
  search.set("text", event.title);
  search.set(
    "dates",
    `${formatGoogleDate(parsed.start)}/${formatGoogleDate(parsed.end)}`,
  );
  if (event.location) search.set("location", event.location);
  if (event.description.length > 0)
    search.set("details", event.description.join("\n\n"));

  return `${base}?${search.toString()}`;
}

function padICS(n: number): string {
  return String(n).padStart(2, "0");
}

function formatICSDate(d: Date): string {
  return [
    d.getFullYear(),
    padICS(d.getMonth() + 1),
    padICS(d.getDate()),
    "T",
    padICS(d.getHours()),
    padICS(d.getMinutes()),
    "00",
  ].join("");
}

export function icsContent(event: NewsEvent): string | null {
  const parsed = parseEventDate(event);
  if (!parsed) return null;

  const escape = (s: string) =>
    s
      .replace(/\\/g, "\\\\")
      .replace(/;/g, "\\;")
      .replace(/,/g, "\\,")
      .replace(/\n/g, "\\n");

  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    `PRODID:-//${SITE_CONFIG.siteName}//EN`,
    "BEGIN:VEVENT",
    `DTSTART:${formatICSDate(parsed.start)}`,
    `DTEND:${formatICSDate(parsed.end)}`,
    `SUMMARY:${escape(event.title)}`,
  ];

  if (event.location) {
    lines.push(`LOCATION:${escape(event.location)}`);
  }

  if (event.description.length > 0) {
    lines.push(`DESCRIPTION:${escape(event.description.join("\\n\\n"))}`);
  }

  if (event.link) {
    lines.push(`URL:${escape(event.link)}`);
  }

  lines.push("END:VEVENT");
  lines.push("END:VCALENDAR");

  return lines.join("\r\n");
}

export function icsBlobUrl(event: NewsEvent): string | null {
  const content = icsContent(event);
  if (!content) return null;
  return URL.createObjectURL(
    new Blob([content], { type: "text/calendar;charset=utf-8" }),
  );
}
