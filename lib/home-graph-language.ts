import type {
  HomeGraphLanguage,
  HomeGraphNode,
  HomeGraphTone,
  ResolvedHomeGraphNode,
} from "@/lib/home-graph";
import {
  DISPLAY_LANGUAGES,
  getDisplayLanguageTag,
} from "./display-languages.ts";

type HomeGraphLanguageGroup = "cjk" | "latin" | "complex";

export const HOME_GRAPH_LANGUAGES = DISPLAY_LANGUAGES;
export const HOME_GRAPH_DEFAULT_LANGUAGE: HomeGraphLanguage = "zh";
const HOME_GRAPH_LANGUAGE_ROTATION_MIN_MS = 4000;
const HOME_GRAPH_LANGUAGE_ROTATION_RANGE_MS = 3000;
const ENGLISH_BIAS = 0.3;
const ENGLISH_DURATION_MULTIPLIER = 2;

export type HomeGraphLanguageMap = Partial<Record<string, HomeGraphLanguage>>;

interface HomeGraphTextPresentation {
  fontFamily: string;
  lang: string;
  letterSpacing: string;
  lineHeight: number;
  textTransform: "none";
}

const HOME_GRAPH_LANGUAGE_GROUPS: Record<
  HomeGraphLanguage,
  HomeGraphLanguageGroup
> = {
  ja: "cjk",
  ko: "cjk",
  zh: "cjk",
  th: "complex",
  hi: "complex",
  vi: "latin",
  id: "latin",
  fa: "complex",
  en: "latin",
};

const HOME_GRAPH_FONT_FAMILIES: Record<HomeGraphLanguage, string> = {
  ja: '"Hiragino Mincho ProN", "Yu Mincho", "Noto Serif JP", serif',
  ko: '"Apple SD Gothic Neo", "Malgun Gothic", "Noto Serif KR", serif',
  zh: '"Noto Serif SC", "Source Han Serif SC", "Songti SC", "STSong", serif',
  th: '"Noto Serif Thai", "Thonburi", "Leelawadee UI", serif',
  hi: '"Noto Serif Devanagari", "Kohinoor Devanagari", "Nirmala UI", serif',
  vi: '"Iowan Old Style", "Palatino Linotype", "Times New Roman", serif',
  id: '"Iowan Old Style", "Palatino Linotype", "Times New Roman", serif',
  fa: '"Noto Naskh Arabic", "Geeza Pro", "Times New Roman", serif',
  en: '"Iowan Old Style", "Palatino Linotype", "Times New Roman", serif',
};
const HOME_GRAPH_PRIMARY_FONT_FAMILY = '"Segment", "HuiWenFangSong"';

function getHomeGraphFontFamily(language: HomeGraphLanguage): string {
  return `${HOME_GRAPH_PRIMARY_FONT_FAMILY}, ${HOME_GRAPH_FONT_FAMILIES[language]}`;
}

function getRandomHomeGraphLanguage(
  random: () => number = Math.random,
): HomeGraphLanguage {
  const index = Math.floor(random() * HOME_GRAPH_LANGUAGES.length);

  return HOME_GRAPH_LANGUAGES[index] ?? HOME_GRAPH_DEFAULT_LANGUAGE;
}

export function getNextHomeGraphLanguage(
  currentLanguage: HomeGraphLanguage,
  random: () => number = Math.random,
): HomeGraphLanguage {
  if (currentLanguage !== "en" && random() < ENGLISH_BIAS) {
    return "en";
  }

  const nextLanguages = HOME_GRAPH_LANGUAGES.filter(
    (language) => language !== currentLanguage,
  );
  const index = Math.floor(random() * nextLanguages.length);

  return nextLanguages[index] ?? currentLanguage;
}

export function getHomeGraphLanguageRotationIntervalMs(
  animationDelayMs: number,
  maxAnimationDelayMs: number,
  language?: HomeGraphLanguage,
): number {
  const safeMaxDelayMs = Math.max(maxAnimationDelayMs, 0);
  let baseMs: number;

  if (safeMaxDelayMs === 0) {
    baseMs = HOME_GRAPH_LANGUAGE_ROTATION_MIN_MS;
  } else {
    const clampedDelayMs = Math.min(
      Math.max(animationDelayMs, 0),
      safeMaxDelayMs,
    );
    const progress = clampedDelayMs / safeMaxDelayMs;

    baseMs =
      HOME_GRAPH_LANGUAGE_ROTATION_MIN_MS +
      Math.round(progress * HOME_GRAPH_LANGUAGE_ROTATION_RANGE_MS);
  }

  return language === "en" ? baseMs * ENGLISH_DURATION_MULTIPLIER : baseMs;
}

function getHomeGraphLanguageGroup(
  language: HomeGraphLanguage,
): HomeGraphLanguageGroup {
  return HOME_GRAPH_LANGUAGE_GROUPS[language];
}

function getHomeGraphLetterSpacing(
  language: HomeGraphLanguage,
  tone: HomeGraphTone,
): string {
  const group = getHomeGraphLanguageGroup(language);

  if (group === "cjk") {
    return tone === "whisper" ? "0.05em" : "0.03em";
  }

  if (group === "latin") {
    return tone === "whisper" ? "0.07em" : "0.04em";
  }

  return tone === "whisper" ? "0.02em" : "0.01em";
}

function getHomeGraphLineHeight(
  language: HomeGraphLanguage,
  tone: HomeGraphTone,
): number {
  const group = getHomeGraphLanguageGroup(language);

  if (group === "cjk") {
    return tone === "whisper" ? 1.45 : 1.24;
  }

  if (group === "latin") {
    return tone === "whisper" ? 1.36 : 1.18;
  }

  return tone === "whisper" ? 1.58 : 1.38;
}

export function createHomeGraphNodeLanguageMap(
  nodes: readonly Pick<HomeGraphNode, "id">[],
  random: () => number = Math.random,
): HomeGraphLanguageMap {
  return nodes.reduce<HomeGraphLanguageMap>((assignments, node) => {
    assignments[node.id] = getRandomHomeGraphLanguage(random);
    return assignments;
  }, {});
}

export function resolveHomeGraphNodes(
  nodes: HomeGraphNode[],
  languageByNode: HomeGraphLanguageMap = {},
): ResolvedHomeGraphNode[] {
  return nodes.map((node) => {
    const activeLanguage =
      languageByNode[node.id] ?? HOME_GRAPH_DEFAULT_LANGUAGE;

    return {
      ...node,
      activeLanguage,
      activeText: node.copy[activeLanguage],
    };
  });
}

export function getHomeGraphTextPresentation(
  language: HomeGraphLanguage,
  tone: HomeGraphTone,
): HomeGraphTextPresentation {
  return {
    fontFamily: getHomeGraphFontFamily(language),
    lang: getDisplayLanguageTag(language),
    letterSpacing: getHomeGraphLetterSpacing(language, tone),
    lineHeight: getHomeGraphLineHeight(language, tone),
    textTransform: "none",
  };
}
