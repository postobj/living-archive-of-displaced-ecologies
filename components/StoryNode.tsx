"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type RefObject,
} from "react";
import { type ThreeEvent, useFrame, useThree } from "@react-three/fiber";
import { Html } from "@react-three/drei";
import * as THREE from "three";
import { ARCHIVE_CONSTELLATION_THEME } from "@/lib/archive-constellation-theme";
import {
  getSentenceNodeScale,
  getSentenceNodeTextVisuals,
  getSphereNodeEmissiveIntensity,
  getSphereNodeOpacity,
  getSphereNodeScale,
} from "@/lib/story-node-visuals";

export interface ConstellationStoryNodeProps {
  position: [number, number, number];
  title: string;
  slug: string;
  color: string;
  displayText?: string;
  isActive?: boolean;
  visibility?: number;
  isSelected?: boolean;
  isConnected?: boolean;
  onOpen: (slug: string) => void;
  onSelect: (slug: string) => void;
}

interface StoryNodeFrameOptions {
  groupRef: RefObject<THREE.Group | null>;
  hovered: boolean;
  isActive: boolean;
  isSelected: boolean;
  labelRef: RefObject<HTMLDivElement | null>;
  meshRef: RefObject<THREE.Mesh | null>;
  position: [number, number, number];
  variant: "sphere" | "sentence";
  visibility: number;
}

function useStoryNodeFrame({
  groupRef,
  hovered,
  isActive,
  isSelected,
  labelRef,
  meshRef,
  position,
  variant,
  visibility,
}: StoryNodeFrameOptions) {
  const { camera } = useThree();
  const frameCount = useRef(0);
  const lastLabelOpacity = useRef(-1);

  const setLabelOpacity = useCallback(
    (nextOpacity: number) => {
      if (!labelRef.current) return;
      if (Math.abs(lastLabelOpacity.current - nextOpacity) < 0.03) return;
      lastLabelOpacity.current = nextOpacity;
      labelRef.current.style.opacity = `${nextOpacity}`;
    },
    [labelRef],
  );

  useFrame((state) => {
    if (!groupRef.current) return;

    if (visibility <= 0.1) {
      setLabelOpacity(0);
      return;
    }

    groupRef.current.position.y =
      position[1] + Math.sin(state.clock.elapsedTime + position[0]) * 0.1;

    if (variant === "sphere" && meshRef.current) {
      meshRef.current.rotation.x =
        Math.sin(state.clock.elapsedTime * 0.3) * 0.1;
      meshRef.current.rotation.y += 0.005;
    }

    if (variant === "sentence") {
      groupRef.current.rotation.z =
        Math.sin(state.clock.elapsedTime * 0.2 + position[0] * 0.15) * 0.05;
    }

    frameCount.current += 1;
    if (frameCount.current % 10 === 0) {
      if (isSelected || hovered || isActive) {
        setLabelOpacity(1);
        return;
      }

      const dist = camera.position.distanceTo(groupRef.current.position);
      const distanceOpacity = Math.max(0, Math.min(1, (20 - dist) / 10));
      setLabelOpacity(
        variant === "sentence"
          ? Math.max(0.5, distanceOpacity * 0.68 + 0.24)
          : distanceOpacity,
      );
    }
  });

  useEffect(() => {
    if (isSelected || hovered || isActive) {
      setLabelOpacity(1);
    }
  }, [hovered, isActive, isSelected, setLabelOpacity]);
}

function useStoryNodeInteraction(
  slug: string,
  onOpen: (slug: string) => void,
  onSelect: (slug: string) => void,
) {
  const handleSelect = (event: ThreeEvent<MouseEvent>) => {
    event.stopPropagation();
    onSelect(slug);
  };

  const handleOpen = (event: ThreeEvent<MouseEvent>) => {
    event.stopPropagation();
    onOpen(slug);
  };

  return { handleOpen, handleSelect };
}

export function SentenceStoryNode({
  position,
  title,
  slug,
  displayText,
  isActive = false,
  visibility = 1,
  isSelected = false,
  onOpen,
  onSelect,
}: ConstellationStoryNodeProps) {
  const groupRef = useRef<THREE.Group>(null);
  const meshRef = useRef<THREE.Mesh>(null);
  const labelRef = useRef<HTMLDivElement>(null);
  const [hovered, setHovered] = useState(false);
  const sentenceText = displayText ?? title;
  const scale = getSentenceNodeScale(visibility, isSelected, hovered);
  const textVisuals = getSentenceNodeTextVisuals(hovered, isActive);
  const { handleOpen, handleSelect } = useStoryNodeInteraction(
    slug,
    onOpen,
    onSelect,
  );

  useStoryNodeFrame({
    groupRef,
    hovered,
    isActive,
    isSelected,
    labelRef,
    meshRef,
    position,
    variant: "sentence",
    visibility,
  });

  return (
    <group ref={groupRef} position={position} scale={scale}>
      <mesh
        ref={meshRef}
        onClick={handleSelect}
        onDoubleClick={handleOpen}
        onPointerOver={() => setHovered(true)}
        onPointerOut={() => setHovered(false)}
        scale={[4.2, 1.95, 1]}
      >
        <planeGeometry args={[1, 1]} />
        <meshBasicMaterial transparent opacity={0.001} />
      </mesh>

      <Html
        center
        distanceFactor={9}
        zIndexRange={[0, 0]}
        style={{
          pointerEvents: "none",
          userSelect: "none",
        }}
      >
        <div
          ref={labelRef}
          className="w-[11rem] text-center transition-all duration-300 md:w-[13rem]"
          style={{
            opacity: isSelected || hovered || isActive ? 1 : 0.72,
            transform:
              hovered || isActive
                ? "translate3d(0,-4px,0)"
                : "translate3d(0,0,0)",
          }}
        >
          <p
            className="text-[1rem] leading-[1.28] md:text-[1.08rem]"
            style={{
              color: textVisuals.color,
              textShadow: textVisuals.textShadow,
              display: "-webkit-box",
              WebkitLineClamp: 2,
              WebkitBoxOrient: "vertical",
              overflow: "hidden",
            }}
          >
            {sentenceText}
          </p>
        </div>
      </Html>
    </group>
  );
}

export function SphereStoryNode({
  color,
  isActive = false,
  isConnected = false,
  isSelected = false,
  onOpen,
  onSelect,
  position,
  slug,
  title,
  visibility = 1,
}: ConstellationStoryNodeProps) {
  const groupRef = useRef<THREE.Group>(null);
  const meshRef = useRef<THREE.Mesh>(null);
  const labelRef = useRef<HTMLDivElement>(null);
  const [hovered, setHovered] = useState(false);
  const scale = getSphereNodeScale(visibility, isSelected, hovered);
  const opacity = getSphereNodeOpacity(visibility);
  const { handleOpen, handleSelect } = useStoryNodeInteraction(
    slug,
    onOpen,
    onSelect,
  );

  useStoryNodeFrame({
    groupRef,
    hovered,
    isActive,
    isSelected,
    labelRef,
    meshRef,
    position,
    variant: "sphere",
    visibility,
  });

  return (
    <group ref={groupRef} position={position} scale={scale}>
      <mesh
        ref={meshRef}
        onClick={handleSelect}
        onDoubleClick={handleOpen}
        onPointerOver={() => setHovered(true)}
        onPointerOut={() => setHovered(false)}
      >
        <sphereGeometry args={[0.5, 24, 24]} />
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={getSphereNodeEmissiveIntensity({
            hovered,
            isActive,
            isConnected,
            isSelected,
          })}
          metalness={0.7}
          opacity={opacity}
          roughness={0.3}
          transparent={visibility < 1}
        />
      </mesh>

      {(isSelected || isConnected) && (
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.6, 0.7, 32]} />
          <meshBasicMaterial
            color={isSelected ? "#ffffff" : color}
            transparent
            opacity={0.6}
          />
        </mesh>
      )}

      <Html
        center
        distanceFactor={8}
        zIndexRange={[0, 0]}
        style={{
          pointerEvents: "none",
          userSelect: "none",
          transform: "translate3d(0, -60px, 0)",
        }}
      >
        <div
          ref={labelRef}
          className="rounded border px-3 py-1 text-sm whitespace-nowrap backdrop-blur-sm transition-opacity duration-300"
          style={{
            opacity: isSelected || hovered || isActive ? 1 : 0.6,
            background: ARCHIVE_CONSTELLATION_THEME.labelBackground,
            color: ARCHIVE_CONSTELLATION_THEME.labelText,
            borderColor: ARCHIVE_CONSTELLATION_THEME.labelBorder,
          }}
        >
          {title}
        </div>
      </Html>
    </group>
  );
}
