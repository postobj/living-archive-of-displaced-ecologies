import type { HomeGraphContent } from "../lib/home-graph.ts";

/**
 * Homepage constellation.
 *
 * This file is DATA, not logic: the multilingual copy, story links, 3D
 * positions, responsive layout classes, and static connection lines that make
 * up the homepage constellation. The three main places — Akbelen, Latmos, and
 * Bosphorus — link to their stories; the remaining place names float as
 * unlinked whispers. Place names are proper nouns and remain in their original
 * script across all display languages. Add real translations where desired.
 *
 * Invariants (enforced by tests/home-graph-content.test.mjs):
 * - node ids are unique; every edge endpoint references an existing node
 * - every node has a layout entry and vice versa
 * - every node's copy covers all HOME_GRAPH_LANGUAGES
 * - every storySlug resolves to a file in content/stories/
 */

function placeName(name: string) {
  return {
    en: name,
    ja: name,
    ko: name,
    zh: name,
    th: name,
    hi: name,
    vi: name,
    id: name,
    fa: name,
  };
}

export const HOME_GRAPH_CONTENT: HomeGraphContent = {
  nodes: [
    {
      id: "akbelen",
      copy: placeName("Akbelen"),
      storySlug: "akbelen",
      tone: "title",
      position: [-5.0, 2.2, 0.8],
      animationDelayMs: 120,
    },
    {
      id: "latmos",
      copy: placeName("Latmos"),
      storySlug: "latmos-and-dd",
      tone: "title",
      position: [0.0, 0.0, 0.0],
      animationDelayMs: 240,
    },
    {
      id: "bosphorus",
      copy: placeName("Bosphorus"),
      storySlug: "bosphorus",
      tone: "title",
      position: [5.0, -2.2, -0.8],
      animationDelayMs: 360,
    },
    {
      id: "ikizdere-rize",
      copy: placeName("İkizdere (Rize)"),
      tone: "whisper",
      position: [-7.5, 4.5, -1.5],
      animationDelayMs: 0,
    },
    {
      id: "kirazli-canakkale",
      copy: placeName("Kirazlı (Çanakkale)"),
      tone: "whisper",
      position: [-8.0, -1.0, 2.0],
      animationDelayMs: 60,
    },
    {
      id: "efemcukuru-izmir",
      copy: placeName("Efemçukuru (İzmir)"),
      tone: "whisper",
      position: [-6.5, -4.5, 1.5],
      animationDelayMs: 120,
    },
    {
      id: "ovacik-izmir",
      copy: placeName("Ovacık (İzmir)"),
      tone: "whisper",
      position: [-3.0, 5.5, -2.0],
      animationDelayMs: 180,
    },
    {
      id: "kisladag-usak",
      copy: placeName("Kışladağ (Uşak)"),
      tone: "whisper",
      position: [2.5, 5.0, 1.5],
      animationDelayMs: 240,
    },
    {
      id: "cerattepe-artvin",
      copy: placeName("Cerattepe (Artvin)"),
      tone: "whisper",
      position: [7.5, 4.0, -1.0],
      animationDelayMs: 300,
    },
    {
      id: "aybasti-ordu",
      copy: placeName("Aybastı (Ordu)"),
      tone: "whisper",
      position: [8.0, 0.5, 1.5],
      animationDelayMs: 360,
    },
    {
      id: "kure-kastamonu",
      copy: placeName("Küre (Kastamonu)"),
      tone: "whisper",
      position: [7.0, -4.0, 2.0],
      animationDelayMs: 420,
    },
    {
      id: "ilic-erzincan",
      copy: placeName("İliç (Erzincan)"),
      tone: "whisper",
      position: [4.0, 6.0, -2.5],
      animationDelayMs: 480,
    },
    {
      id: "soma-manisa",
      copy: placeName("Soma (Manisa)"),
      tone: "whisper",
      position: [0.5, -5.5, 1.0],
      animationDelayMs: 540,
    },
    {
      id: "salda-golu-burdur",
      copy: placeName("Salda Gölü (Burdur)"),
      tone: "whisper",
      position: [-1.5, 4.0, 3.0],
      animationDelayMs: 600,
    },
    {
      id: "beylikova-eskisehir",
      copy: placeName("Beylikova (Eskişehir)"),
      tone: "whisper",
      position: [6.0, 2.5, -3.0],
      animationDelayMs: 660,
    },
  ],
  edges: [
    { id: "edge-akbelen-latmos", from: "akbelen", to: "latmos" },
    { id: "edge-latmos-bosphorus", from: "latmos", to: "bosphorus" },
    {
      id: "edge-bosphorus-akbelen",
      from: "bosphorus",
      to: "akbelen",
      opacity: 0.25,
    },
    { id: "edge-akbelen-ikizdere", from: "akbelen", to: "ikizdere-rize", opacity: 0.28 },
    { id: "edge-akbelen-kirazli", from: "akbelen", to: "kirazli-canakkale", opacity: 0.28 },
    { id: "edge-akbelen-efemcukuru", from: "akbelen", to: "efemcukuru-izmir", opacity: 0.28 },
    { id: "edge-akbelen-ovacik", from: "akbelen", to: "ovacik-izmir", opacity: 0.28 },
    { id: "edge-latmos-kisladag", from: "latmos", to: "kisladag-usak", opacity: 0.28 },
    { id: "edge-latmos-ilic", from: "latmos", to: "ilic-erzincan", opacity: 0.28 },
    { id: "edge-latmos-soma", from: "latmos", to: "soma-manisa", opacity: 0.28 },
    { id: "edge-latmos-salda", from: "latmos", to: "salda-golu-burdur", opacity: 0.28 },
    { id: "edge-bosphorus-cerattepe", from: "bosphorus", to: "cerattepe-artvin", opacity: 0.28 },
    { id: "edge-bosphorus-aybasti", from: "bosphorus", to: "aybasti-ordu", opacity: 0.28 },
    { id: "edge-bosphorus-kure", from: "bosphorus", to: "kure-kastamonu", opacity: 0.28 },
    { id: "edge-bosphorus-beylikova", from: "bosphorus", to: "beylikova-eskisehir", opacity: 0.28 },
    { id: "edge-ikizdere-ovacik", from: "ikizdere-rize", to: "ovacik-izmir", opacity: 0.2 },
    { id: "edge-ovacik-kisladag", from: "ovacik-izmir", to: "kisladag-usak", opacity: 0.2 },
    { id: "edge-kisladag-ilic", from: "kisladag-usak", to: "ilic-erzincan", opacity: 0.2 },
    { id: "edge-ilic-cerattepe", from: "ilic-erzincan", to: "cerattepe-artvin", opacity: 0.2 },
    { id: "edge-cerattepe-aybasti", from: "cerattepe-artvin", to: "aybasti-ordu", opacity: 0.2 },
    { id: "edge-aybasti-kure", from: "aybasti-ordu", to: "kure-kastamonu", opacity: 0.2 },
    { id: "edge-kure-soma", from: "kure-kastamonu", to: "soma-manisa", opacity: 0.2 },
    { id: "edge-soma-efemcukuru", from: "soma-manisa", to: "efemcukuru-izmir", opacity: 0.2 },
    { id: "edge-efemcukuru-kirazli", from: "efemcukuru-izmir", to: "kirazli-canakkale", opacity: 0.2 },
    { id: "edge-kirazli-ikizdere", from: "kirazli-canakkale", to: "ikizdere-rize", opacity: 0.2 },
  ],
  layouts: {
    akbelen: {
      desktopClassName:
        "left-[18%] top-[30%] max-w-[18rem] -translate-x-1/2 text-center",
      mobileClassName:
        "left-[20%] top-[28%] max-w-[12rem] -translate-x-1/2 text-center",
    },
    latmos: {
      desktopClassName:
        "left-[50%] top-[46%] max-w-[18rem] -translate-x-1/2 text-center",
      mobileClassName:
        "left-[50%] top-[45%] max-w-[12rem] -translate-x-1/2 text-center",
    },
    bosphorus: {
      desktopClassName:
        "left-[78%] top-[68%] max-w-[20rem] -translate-x-1/2 text-center",
      mobileClassName:
        "left-[70%] top-[68%] max-w-[14rem] -translate-x-1/2 text-center",
    },
    "ikizdere-rize": {
      desktopClassName:
        "left-[11%] top-[11%] max-w-[16rem] -translate-x-1/2 text-center",
      mobileClassName:
        "left-[10%] top-[8%] max-w-[10rem] -translate-x-1/2 text-center",
    },
    "kirazli-canakkale": {
      desktopClassName:
        "left-[7%] top-[40%] max-w-[16rem] -translate-x-1/2 text-center",
      mobileClassName:
        "left-[6%] top-[40%] max-w-[10rem] -translate-x-1/2 text-center",
    },
    "efemcukuru-izmir": {
      desktopClassName:
        "left-[13%] top-[80%] max-w-[16rem] -translate-x-1/2 text-center",
      mobileClassName:
        "left-[10%] top-[82%] max-w-[10rem] -translate-x-1/2 text-center",
    },
    "ovacik-izmir": {
      desktopClassName:
        "left-[29%] top-[8%] max-w-[16rem] -translate-x-1/2 text-center",
      mobileClassName:
        "left-[30%] top-[6%] max-w-[10rem] -translate-x-1/2 text-center",
    },
    "kisladag-usak": {
      desktopClassName:
        "left-[55%] top-[7%] max-w-[16rem] -translate-x-1/2 text-center",
      mobileClassName:
        "left-[58%] top-[6%] max-w-[10rem] -translate-x-1/2 text-center",
    },
    "cerattepe-artvin": {
      desktopClassName:
        "left-[86%] top-[14%] max-w-[16rem] -translate-x-1/2 text-center",
      mobileClassName:
        "left-[88%] top-[14%] max-w-[10rem] -translate-x-1/2 text-center",
    },
    "aybasti-ordu": {
      desktopClassName:
        "left-[90%] top-[44%] max-w-[16rem] -translate-x-1/2 text-center",
      mobileClassName:
        "left-[90%] top-[46%] max-w-[10rem] -translate-x-1/2 text-center",
    },
    "kure-kastamonu": {
      desktopClassName:
        "left-[86%] top-[80%] max-w-[16rem] -translate-x-1/2 text-center",
      mobileClassName:
        "left-[86%] top-[82%] max-w-[10rem] -translate-x-1/2 text-center",
    },
    "ilic-erzincan": {
      desktopClassName:
        "left-[62%] top-[90%] max-w-[16rem] -translate-x-1/2 text-center",
      mobileClassName:
        "left-[62%] top-[92%] max-w-[10rem] -translate-x-1/2 text-center",
    },
    "soma-manisa": {
      desktopClassName:
        "left-[36%] top-[93%] max-w-[16rem] -translate-x-1/2 text-center",
      mobileClassName:
        "left-[34%] top-[94%] max-w-[10rem] -translate-x-1/2 text-center",
    },
    "salda-golu-burdur": {
      desktopClassName:
        "left-[22%] top-[52%] max-w-[16rem] -translate-x-1/2 text-center",
      mobileClassName:
        "left-[20%] top-[54%] max-w-[10rem] -translate-x-1/2 text-center",
    },
    "beylikova-eskisehir": {
      desktopClassName:
        "left-[74%] top-[34%] max-w-[16rem] -translate-x-1/2 text-center",
      mobileClassName:
        "left-[76%] top-[34%] max-w-[10rem] -translate-x-1/2 text-center",
    },
  },
  staticLines: {
    desktop: [
      { id: "line-akbelen-latmos", x1: 18, y1: 32, x2: 50, y2: 45 },
      { id: "line-latmos-bosphorus", x1: 50, y1: 48, x2: 78, y2: 66 },
      { id: "line-bosphorus-akbelen", x1: 76, y1: 66, x2: 20, y2: 30 },
    ],
    mobile: [
      { id: "m-line-akbelen-latmos", x1: 20, y1: 30, x2: 50, y2: 44 },
      { id: "m-line-latmos-bosphorus", x1: 50, y1: 47, x2: 70, y2: 66 },
      { id: "m-line-bosphorus-akbelen", x1: 68, y1: 66, x2: 22, y2: 29 },
    ],
  },
};
