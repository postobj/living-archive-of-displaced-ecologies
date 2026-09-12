export const DISPLAY_LANGUAGES = [
  "ja",
  "ko",
  "zh",
  "th",
  "hi",
  "vi",
  "id",
  "fa",
  "en",
] as const;

export type DisplayLanguage = (typeof DISPLAY_LANGUAGES)[number];

const DISPLAY_LANGUAGE_TAGS: Record<DisplayLanguage, string> = {
  ja: "ja",
  ko: "ko",
  zh: "zh-Hans",
  th: "th",
  hi: "hi",
  vi: "vi",
  id: "id",
  fa: "fa",
  en: "en",
};

export function getDisplayLanguageTag(language: DisplayLanguage): string {
  return DISPLAY_LANGUAGE_TAGS[language];
}

export function shuffleDisplayLanguages(
  random: () => number = Math.random,
): DisplayLanguage[] {
  const shuffled = [...DISPLAY_LANGUAGES];

  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(random() * (index + 1));
    const current = shuffled[index];

    shuffled[index] = shuffled[swapIndex];
    shuffled[swapIndex] = current;
  }

  return shuffled;
}

export function createDisplayLanguageMap<Key extends string>(
  keys: readonly Key[],
  random: () => number = Math.random,
): Partial<Record<Key, DisplayLanguage>> {
  if (keys.length > DISPLAY_LANGUAGES.length) {
    throw new RangeError(
      "Display language assignment needs at least as many languages as keys.",
    );
  }

  const shuffledLanguages = shuffleDisplayLanguages(random);

  return keys.reduce<Partial<Record<Key, DisplayLanguage>>>(
    (assignments, key, index) => {
      const language = shuffledLanguages[index];

      if (!language) {
        throw new RangeError(
          "Display language assignment can only assign one unique language per key.",
        );
      }

      assignments[key] = language;
      return assignments;
    },
    {},
  );
}
