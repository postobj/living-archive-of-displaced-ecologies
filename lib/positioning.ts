/**
 * Positioning and Clustering Algorithms for Story Navigation
 * Implements emotional vector positioning and similarity-based constellation generation
 */

import type { EmotionalVector, EmotionTag, FilterState } from "@/types/emotion";
import type { Story } from "@/lib/content";

// Import emotion vectors
const emotionVectors: Record<string, EmotionalVector> = {
  joy: { valence: 0.8, arousal: 0.6, dominance: 0.5 },
  hope: { valence: 0.6, arousal: 0.4, dominance: 0.3 },
  resilience: { valence: 0.5, arousal: 0.3, dominance: 0.6 },
  grief: { valence: -0.7, arousal: 0.2, dominance: -0.6 },
  anger: { valence: -0.5, arousal: 0.8, dominance: 0.4 },
  melancholy: { valence: -0.4, arousal: -0.5, dominance: -0.3 },
  nostalgia: { valence: -0.3, arousal: -0.2, dominance: -0.4 },
  longing: { valence: -0.2, arousal: 0.3, dominance: -0.2 },
  confusion: { valence: 0.0, arousal: 0.4, dominance: -0.3 },
  acceptance: { valence: 0.2, arousal: -0.3, dominance: 0.1 },
};

/**
 * Calculate emotional vector from emotion tags
 * Computes weighted average of emotion vectors based on intensity
 */
export function calculateEmotionalVector(
  emotions?: EmotionTag[],
): EmotionalVector {
  if (!emotions || emotions.length === 0) {
    return { valence: 0, arousal: 0, dominance: 0 };
  }

  let totalValence = 0;
  let totalArousal = 0;
  let totalDominance = 0;
  let totalWeight = 0;

  emotions.forEach((emotion) => {
    const vector = emotionVectors[emotion.name.toLowerCase()];
    if (vector) {
      const weight = emotion.intensity;
      totalValence += vector.valence * weight;
      totalArousal += vector.arousal * weight;
      totalDominance += vector.dominance * weight;
      totalWeight += weight;
    }
  });

  if (totalWeight === 0) {
    return { valence: 0, arousal: 0, dominance: 0 };
  }

  return {
    valence: totalValence / totalWeight,
    arousal: totalArousal / totalWeight,
    dominance: totalDominance / totalWeight,
  };
}

/**
 * Map emotional vector to 3D position coordinates
 * Scales PAD dimensions to visible 3D space
 */
export function emotionalVectorToPosition(
  vector: EmotionalVector,
  scale: number = 10,
): [number, number, number] {
  return [
    vector.valence * scale,
    vector.arousal * scale,
    vector.dominance * scale,
  ];
}

/**
 * Calculate Euclidean distance between two emotional vectors
 */
function emotionalDistance(v1: EmotionalVector, v2: EmotionalVector): number {
  const dx = v1.valence - v2.valence;
  const dy = v1.arousal - v2.arousal;
  const dz = v1.dominance - v2.dominance;
  return Math.sqrt(dx * dx + dy * dy + dz * dz);
}

/**
 * Calculate tag overlap between two stories
 */
function calculateTagOverlap(story1: Story, story2: Story): number {
  let overlap = 0;
  let total = 0;

  // Check emotion overlap
  const emotions1 = new Set(story1.metadata.emotions?.map((e) => e.name) || []);
  const emotions2 = new Set(story2.metadata.emotions?.map((e) => e.name) || []);
  emotions1.forEach((e) => {
    total++;
    if (emotions2.has(e)) overlap++;
  });

  // Check texture overlap
  const textures1 = new Set(story1.metadata.textures?.map((t) => t.name) || []);
  const textures2 = new Set(story2.metadata.textures?.map((t) => t.name) || []);
  textures1.forEach((t) => {
    total++;
    if (textures2.has(t)) overlap++;
  });

  // Check temporality overlap
  const temp1 = new Set(story1.metadata.temporality?.map((t) => t.name) || []);
  const temp2 = new Set(story2.metadata.temporality?.map((t) => t.name) || []);
  temp1.forEach((t) => {
    total++;
    if (temp2.has(t)) overlap++;
  });

  // Check geography overlap
  const geo1 = new Set(story1.metadata.geography?.map((g) => g.name) || []);
  const geo2 = new Set(story2.metadata.geography?.map((g) => g.name) || []);
  geo1.forEach((g) => {
    total++;
    if (geo2.has(g)) overlap++;
  });

  return total > 0 ? overlap / total : 0;
}

/**
 * Calculate similarity score between two stories
 * Combines emotional distance and tag overlap
 */
export function calculateSimilarity(
  story1: Story,
  story2: Story,
  emotionalWeight: number = 0.6,
): number {
  const vector1 = calculateEmotionalVector(story1.metadata.emotions);
  const vector2 = calculateEmotionalVector(story2.metadata.emotions);

  // Normalize emotional distance to 0-1 range (max distance in PAD space is ~3.46)
  const emotionalSim =
    1 - Math.min(emotionalDistance(vector1, vector2) / 3.46, 1);

  const tagSim = calculateTagOverlap(story1, story2);

  // Check explicit connections
  const hasExplicitConnection =
    story1.metadata.connections?.includes(story2.metadata.slug) ||
    story2.metadata.connections?.includes(story1.metadata.slug);

  const explicitBonus = hasExplicitConnection ? 0.3 : 0;

  return Math.min(
    emotionalSim * emotionalWeight +
      tagSim * (1 - emotionalWeight) +
      explicitBonus,
    1,
  );
}

/**
 * Apply compass filter to determine story visibility
 * Returns visibility score (0-1) based on filter match
 */
export function applyCompassFilter(story: Story, filter: FilterState): number {
  if (
    filter.emotions.length === 0 &&
    filter.textures.length === 0 &&
    filter.temporality.length === 0 &&
    filter.geography.length === 0
  ) {
    return 1; // No filters active, full visibility
  }

  let matchScore = 0;
  let filterCount = 0;

  // Check emotion matches
  if (filter.emotions.length > 0) {
    filterCount++;
    const storyEmotions = story.metadata.emotions?.map((e) => e.name) || [];
    const matches = filter.emotions.filter((e) =>
      storyEmotions.includes(e),
    ).length;
    matchScore += matches / filter.emotions.length;
  }

  // Check texture matches
  if (filter.textures.length > 0) {
    filterCount++;
    const storyTextures = story.metadata.textures?.map((t) => t.name) || [];
    const matches = filter.textures.filter((t) =>
      storyTextures.includes(t),
    ).length;
    matchScore += matches / filter.textures.length;
  }

  // Check temporality matches
  if (filter.temporality.length > 0) {
    filterCount++;
    const storyTemp = story.metadata.temporality?.map((t) => t.name) || [];
    const matches = filter.temporality.filter((t) =>
      storyTemp.includes(t),
    ).length;
    matchScore += matches / filter.temporality.length;
  }

  // Check geography matches
  if (filter.geography.length > 0) {
    filterCount++;
    const storyGeo = story.metadata.geography?.map((g) => g.name) || [];
    const matches = filter.geography.filter((g) => storyGeo.includes(g)).length;
    matchScore += matches / filter.geography.length;
  }

  const baseVisibility = filterCount > 0 ? matchScore / filterCount : 1;

  // Apply filter intensity
  return baseVisibility * filter.intensity + (1 - filter.intensity);
}

/**
 * Generate constellation positions for stories
 * Handles both default emotional clustering and weaving mode
 */
export function generateConstellationPositions(
  stories: Story[],
  filter: FilterState,
  selectedThread: string | null = null,
  scale: number = 10,
): Map<string, { position: [number, number, number]; visibility: number }> {
  const positions = new Map<
    string,
    { position: [number, number, number]; visibility: number }
  >();

  if (!selectedThread) {
    // Default mode: emotional clustering
    stories.forEach((story) => {
      const vector = calculateEmotionalVector(story.metadata.emotions);
      const position = emotionalVectorToPosition(vector, scale);
      const visibility = applyCompassFilter(story, filter);
      positions.set(story.metadata.slug, { position, visibility });
    });
  } else {
    // Weaving mode: reorganize around selected thread
    const selectedStory = stories.find(
      (s) => s.metadata.slug === selectedThread,
    );
    if (!selectedStory) return positions;

    // Selected story at center
    positions.set(selectedThread, { position: [0, 0, 0], visibility: 1 });

    // Calculate similarities and position other stories
    const similarities = stories
      .filter((s) => s.metadata.slug !== selectedThread)
      .map((story) => ({
        story,
        similarity: calculateSimilarity(selectedStory, story),
      }))
      .sort((a, b) => b.similarity - a.similarity);

    // Position stories in concentric rings based on similarity
    similarities.forEach((item, index) => {
      const { story, similarity } = item;

      // Distance from center inversely proportional to similarity
      const distance = scale * (1 - similarity * 0.7);

      // Angle based on index to distribute evenly
      const angle = (index / similarities.length) * Math.PI * 2;

      // Add some vertical variation based on emotional arousal
      const vector = calculateEmotionalVector(story.metadata.emotions);
      const height = vector.arousal * scale * 0.3;

      const position: [number, number, number] = [
        Math.cos(angle) * distance,
        height,
        Math.sin(angle) * distance,
      ];

      const visibility = applyCompassFilter(story, filter);
      positions.set(story.metadata.slug, { position, visibility });
    });
  }

  return positions;
}

/**
 * Get top N most similar stories for connection lines
 */
export function getTopConnections(
  selectedStory: Story,
  allStories: Story[],
  count: number = 5,
): string[] {
  const selectedSlug = selectedStory.metadata.slug;
  const bySlug = new Map(
    allStories.map((story) => [story.metadata.slug, story] as const),
  );
  const explicitConnections = new Set<string>();

  // Keep author-defined connections first.
  selectedStory.metadata.connections?.forEach((slug) => {
    if (slug !== selectedSlug && bySlug.has(slug)) {
      explicitConnections.add(slug);
    }
  });

  // Treat inbound references as valid constellation edges too.
  allStories.forEach((story) => {
    if (
      story.metadata.slug !== selectedSlug &&
      story.metadata.connections?.includes(selectedSlug)
    ) {
      explicitConnections.add(story.metadata.slug);
    }
  });

  const rankedBySimilarity = allStories
    .filter(
      (story) =>
        story.metadata.slug !== selectedSlug &&
        !explicitConnections.has(story.metadata.slug),
    )
    .map((story) => ({
      slug: story.metadata.slug,
      similarity: calculateSimilarity(selectedStory, story),
    }))
    .sort((a, b) => b.similarity - a.similarity)
    .map((item) => item.slug);

  return [...explicitConnections, ...rankedBySimilarity].slice(0, count);
}

export function getConstellationEdges(
  allStories: Story[],
  maxConnectionsPerStory: number = 2,
): Array<[string, string]> {
  const edges = new Set<string>();
  const bySlug = new Map(
    allStories.map((story) => [story.metadata.slug, story] as const),
  );

  allStories.forEach((story) => {
    const from = story.metadata.slug;

    getTopConnections(story, allStories, maxConnectionsPerStory).forEach(
      (to) => {
        if (!bySlug.has(to) || from === to) {
          return;
        }

        const edgeKey = [from, to].sort().join("::");
        edges.add(edgeKey);
      },
    );
  });

  return Array.from(edges).map((edgeKey) => {
    const [from, to] = edgeKey.split("::");
    return [from, to];
  });
}
