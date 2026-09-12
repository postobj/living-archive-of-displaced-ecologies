"use client";

import { useState } from "react";
import { StoryCenteredWordmark } from "@/components/StoryCenteredWordmark";
import { StoryFloatingVisuals } from "@/components/StoryFloatingVisuals";

interface StoryVisualStageProps {
  wordmarkText: string;
  title: string;
  contributor: string;
  year?: string;
  slogan?: string;
  mediaSources: string[];
}

export function StoryVisualStage({
  wordmarkText,
  title,
  contributor,
  year,
  slogan,
  mediaSources,
}: StoryVisualStageProps) {
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);

  return (
    <>
      <StoryCenteredWordmark
        wordmarkText={wordmarkText}
        title={title}
        contributor={contributor}
        year={year}
        slogan={slogan}
        hidden={isLightboxOpen}
      />
      <StoryFloatingVisuals
        title={title}
        mediaSources={mediaSources}
        onLightboxOpenChange={setIsLightboxOpen}
      />
    </>
  );
}
