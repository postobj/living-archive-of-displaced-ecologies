import {
  DISPLAY_LANGUAGES,
  createDisplayLanguageMap,
  getDisplayLanguageTag,
  shuffleDisplayLanguages,
  type DisplayLanguage,
} from "./display-languages.ts";

export type CornerRoute = "about" | "archive" | "submit" | "newsletter";
export const CORNER_NAVIGATION_LANGUAGES = DISPLAY_LANGUAGES;

export type CornerNavigationLanguage = DisplayLanguage;

export const CORNER_NAVIGATION_LABELS: Record<
  CornerRoute,
  Record<CornerNavigationLanguage, string>
> = {
  about: {
    en: "About",
    ja: "紹介",
    ko: "소개",
    zh: "关于",
    th: "เกี่ยวกับ",
    hi: "परिचय",
    vi: "Giới thiệu",
    id: "Tentang",
    fa: "درباره",
  },
  submit: {
    en: "Submit your work",
    ja: "作品を投稿",
    ko: "작품 제출",
    zh: "提交作品",
    th: "ส่งผลงาน",
    hi: "काम जमा करें",
    vi: "Gửi tác phẩm",
    id: "Kirim karya",
    fa: "ارسال اثر",
  },
  archive: {
    en: "Archive",
    ja: "記録庫",
    ko: "아카이브",
    zh: "档案",
    th: "คลัง",
    hi: "अभिलेख",
    vi: "Lưu trữ",
    id: "Arsip",
    fa: "بایگانی",
  },
  newsletter: {
    en: "Newsletter",
    ja: "便り",
    ko: "뉴스레터",
    zh: "通讯",
    th: "จดหมายข่าว",
    hi: "समाचार पत्र",
    vi: "Bản tin",
    id: "Buletin",
    fa: "خبرنامه",
  },
};

export function shuffleCornerNavigationLanguages(
  random: () => number = Math.random,
): CornerNavigationLanguage[] {
  return shuffleDisplayLanguages(random);
}

export function createCornerNavigationLanguageMap(
  routes: readonly CornerRoute[],
  random: () => number = Math.random,
): Partial<Record<CornerRoute, CornerNavigationLanguage>> {
  return createDisplayLanguageMap(routes, random);
}

export function getCornerNavigationLabel(
  route: CornerRoute,
  language: CornerNavigationLanguage,
): string {
  return CORNER_NAVIGATION_LABELS[route][language];
}

export function getCornerNavigationLangTag(
  language: CornerNavigationLanguage,
): string {
  return getDisplayLanguageTag(language);
}
