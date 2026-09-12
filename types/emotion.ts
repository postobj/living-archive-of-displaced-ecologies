/**
 * Emotional Vector System for Story Positioning
 * Based on PAD (Pleasure-Arousal-Dominance) psychological model
 */

/**
 * 3D emotional vector representing a story's emotional position
 * - valence (X): negative (-1) to positive (+1) emotional tone
 * - arousal (Y): calm (-1) to intense (+1) energy level
 * - dominance (Z): powerless (-1) to empowered (+1) sense of control
 */
export interface EmotionalVector {
  valence: number; // X-axis: -1 (negative) to +1 (positive)
  arousal: number; // Y-axis: -1 (calm) to +1 (intense)
  dominance: number; // Z-axis: -1 (powerless) to +1 (empowered)
}

/**
 * Emotion tag with intensity weight
 */
export interface EmotionTag {
  name: string;
  intensity: number; // 0-1 range
  vector?: EmotionalVector; // Optional pre-computed vector for this emotion
}

/**
 * Texture tag describing narrative quality
 */
export interface TextureTag {
  name: string;
  weight: number; // 0-1 range
}

/**
 * Temporality tag describing time relationship
 */
export interface TemporalityTag {
  name: string;
  weight: number; // 0-1 range
}

/**
 * Geography tag describing place relationship
 */
export interface GeographyTag {
  name: string;
  weight: number; // 0-1 range
}

/**
 * Filter state for the drifting compass
 */
export interface FilterState {
  emotions: string[]; // Selected emotion tags
  textures: string[]; // Selected texture tags
  temporality: string[]; // Selected temporality tags
  geography: string[]; // Selected geography tags
  intensity: number; // Filter intensity (0-1)
}

/**
 * Active compass filter configuration
 */
export interface CompassFilter {
  active: boolean;
  state: FilterState;
}

/**
 * Predefined emotion vectors based on psychological research
 * Each emotion maps to a position in PAD space
 */
export const EMOTION_VECTORS: Record<string, EmotionalVector> = {
  // Positive emotions
  joy: { valence: 0.8, arousal: 0.6, dominance: 0.5 },
  hope: { valence: 0.6, arousal: 0.4, dominance: 0.3 },
  resilience: { valence: 0.5, arousal: 0.3, dominance: 0.6 },

  // Negative emotions
  grief: { valence: -0.7, arousal: 0.2, dominance: -0.6 },
  anger: { valence: -0.5, arousal: 0.8, dominance: 0.4 },
  melancholy: { valence: -0.4, arousal: -0.5, dominance: -0.3 },

  // Mixed/complex emotions
  nostalgia: { valence: -0.3, arousal: -0.2, dominance: -0.4 },
  longing: { valence: -0.2, arousal: 0.3, dominance: -0.2 },

  // Neutral/liminal
  confusion: { valence: 0.0, arousal: 0.4, dominance: -0.3 },
  acceptance: { valence: 0.2, arousal: -0.3, dominance: 0.1 },
};

/**
 * Story connection for weaving mode
 */
export interface StoryConnection {
  targetSlug: string;
  strength: number; // 0-1 range, calculated or explicit
  type: "explicit" | "emotional" | "thematic";
}
