interface SphereNodeEmphasisState {
  hovered: boolean;
  isActive: boolean;
  isConnected: boolean;
  isSelected: boolean;
}

export function getSentenceNodeScale(
  visibility: number,
  isSelected: boolean,
  hovered: boolean,
): number {
  const baseScale = isSelected ? 1.05 : visibility * 0.42 + 0.72;

  return hovered ? baseScale * 1.06 : baseScale;
}

export function getSphereNodeScale(
  visibility: number,
  isSelected: boolean,
  hovered: boolean,
): number {
  const baseScale = isSelected ? 1.3 : visibility * 0.8 + 0.2;

  return hovered ? baseScale * 1.2 : baseScale;
}

export function getSphereNodeOpacity(visibility: number): number {
  return Math.max(visibility * 0.9 + 0.1, 0.2);
}

export function getSphereNodeEmissiveIntensity({
  hovered,
  isActive,
  isConnected,
  isSelected,
}: SphereNodeEmphasisState): number {
  if (isSelected) {
    return 1;
  }

  if (isConnected) {
    return 0.7;
  }

  if (isActive) {
    return 0.8;
  }

  if (hovered) {
    return 0.5;
  }

  return 0.2;
}

export function getSentenceNodeTextVisuals(
  hovered: boolean,
  isActive: boolean,
): {
  color: string;
  textShadow: string;
} {
  if (hovered || isActive) {
    return {
      color: "var(--page-accent)",
      textShadow: "0 0 22px rgba(228, 0, 0, 0.14)",
    };
  }

  return {
    color: "rgba(40, 30, 30, 0.9)",
    textShadow: "0 0 16px rgba(255, 255, 255, 0.22)",
  };
}
