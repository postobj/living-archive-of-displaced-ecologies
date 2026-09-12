import type { EmotionalVector } from "./emotion";

export interface StoryNode {
  id: string;
  title: string;
  position: [number, number, number];
  color: string;
  themes: string[];
  emotionalVector?: EmotionalVector;
  visibility?: number; // 0-1 range for filtering
  isSelected?: boolean;
  isConnected?: boolean;
}

export interface NavigationState {
  activeStory: string | null;
  hoveredStory: string | null;
}
