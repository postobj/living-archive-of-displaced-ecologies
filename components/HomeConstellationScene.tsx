"use client";

import { useEffect, useRef, useState } from "react";
import {
  Canvas,
  type ThreeEvent,
  useFrame,
  useThree,
} from "@react-three/fiber";
import { Html, OrbitControls } from "@react-three/drei";
import * as THREE from "three";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";
import type { HomeGraphEdge, ResolvedHomeGraphNode } from "@/lib/home-graph";
import {
  getAnimatedHomeNodePosition,
  buildMeasuredHomeGraphLines,
  getHomeTextHitAreaScale,
} from "@/lib/home-graph-geometry";
import { getHomeGraphTextPresentation } from "@/lib/home-graph-language";
import { getHomeGraphNodeVisuals } from "@/lib/home-graph-scene";

interface HomeConstellationSceneProps {
  nodes: ResolvedHomeGraphNode[];
  edges: HomeGraphEdge[];
  onStoryOpen: (slug: string) => void;
  onReady?: () => void;
  onCanvasReady?: (canvas: HTMLCanvasElement | null) => void;
}

interface HomeTextNodeProps {
  node: ResolvedHomeGraphNode;
  isMobile: boolean;
  viewportWidth: number;
  reducedMotion: boolean;
  onStoryOpen: (slug: string) => void;
  nodeRef?: (nodeId: string, element: HTMLDivElement | null) => void;
}

const CAMERA_DESKTOP = {
  position: [0, 0, 18.5] as const,
  fov: 34,
  distanceFactor: 10.2,
  minDistance: 14,
  maxDistance: 24,
};

const CAMERA_MOBILE = {
  position: [0, 0, 24.5] as const,
  fov: 42,
  distanceFactor: 11.6,
  minDistance: 20,
  maxDistance: 30,
};

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * Math.max(0, Math.min(1, t));
}

function getCameraConfig(viewportWidth: number) {
  const t = (viewportWidth - 375) / (1440 - 375);
  return {
    position: [
      0,
      0,
      lerp(CAMERA_MOBILE.position[2], CAMERA_DESKTOP.position[2], t),
    ] as const,
    fov: lerp(CAMERA_MOBILE.fov, CAMERA_DESKTOP.fov, t),
    distanceFactor: lerp(
      CAMERA_MOBILE.distanceFactor,
      CAMERA_DESKTOP.distanceFactor,
      t,
    ),
    minDistance: lerp(CAMERA_MOBILE.minDistance, CAMERA_DESKTOP.minDistance, t),
    maxDistance: lerp(CAMERA_MOBILE.maxDistance, CAMERA_DESKTOP.maxDistance, t),
  };
}

function ResponsiveCamera({ viewportWidth }: { viewportWidth: number }) {
  const { camera } = useThree();
  const cameraRef = useRef(camera);
  const config = getCameraConfig(viewportWidth);
  const [posX, posY, posZ] = config.position;
  const fov = config.fov;

  useEffect(() => {
    cameraRef.current = camera;
    const cam = cameraRef.current;
    cam.position.set(posX, posY, posZ);

    if (cam instanceof THREE.PerspectiveCamera) {
      cam.fov = fov;
    }

    cam.updateProjectionMatrix();
  }, [camera, posX, posY, posZ, fov]);

  return null;
}

function WireframeGlobe({ reducedMotion }: { reducedMotion: boolean }) {
  const meshRef = useRef<THREE.Mesh>(null);

  useFrame((_, delta) => {
    if (!meshRef.current || reducedMotion) {
      return;
    }

    meshRef.current.rotation.y += 0.042 * delta;
  });

  return (
    <group position={[-8, 5, -26]} rotation={[0.41, 0, 0.12]}>
      <mesh ref={meshRef}>
        <sphereGeometry args={[6, 48, 24]} />
        <meshBasicMaterial
          wireframe
          transparent
          opacity={0.18}
          color="#1b140f"
        />
      </mesh>
    </group>
  );
}

function HomeTextNode({
  node,
  isMobile,
  viewportWidth,
  reducedMotion,
  onStoryOpen,
  nodeRef,
}: HomeTextNodeProps) {
  const groupRef = useRef<THREE.Group>(null);
  const [hovered, setHovered] = useState(false);
  const isInteractive = Boolean(node.slug);
  const cameraConfig = getCameraConfig(viewportWidth);
  const textPresentation = getHomeGraphTextPresentation(
    node.activeLanguage,
    node.tone,
  );
  const nodeVisuals = getHomeGraphNodeVisuals(node.tone, isMobile);

  useFrame((state) => {
    if (!groupRef.current) {
      return;
    }

    const [animatedX, animatedY, animatedZ] = getAnimatedHomeNodePosition(
      node,
      state.clock.elapsedTime,
      reducedMotion,
    );
    groupRef.current.position.set(animatedX, animatedY, animatedZ);

    if (reducedMotion) {
      groupRef.current.rotation.z = 0;
      return;
    }

    const seed = node.animationDelayMs * 0.0025;
    groupRef.current.rotation.z =
      Math.sin(state.clock.elapsedTime * 0.18 + seed) * 0.028;
  });

  const handleClick = (event: ThreeEvent<MouseEvent>) => {
    if (!node.slug) {
      return;
    }

    event.stopPropagation();
    onStoryOpen(node.slug);
  };

  const baseColor =
    node.tone === "whisper"
      ? "rgba(63, 48, 39, 0.76)"
      : "rgba(27, 20, 16, 0.92)";
  const textColor = hovered && isInteractive ? "var(--page-accent)" : baseColor;
  const hitAreaScale = getHomeTextHitAreaScale(node.tone, isMobile);

  return (
    <group ref={groupRef} position={node.position}>
      {isInteractive && (
        <mesh
          onClick={handleClick}
          onPointerOver={() => setHovered(true)}
          onPointerOut={() => setHovered(false)}
          scale={hitAreaScale}
        >
          <planeGeometry args={[1, 1]} />
          <meshBasicMaterial transparent opacity={0.001} />
        </mesh>
      )}

      <Html
        center
        distanceFactor={cameraConfig.distanceFactor}
        zIndexRange={[30, 0]}
        style={{ pointerEvents: "none", userSelect: "none" }}
      >
        <div
          ref={(element) => {
            nodeRef?.(node.id, element);
          }}
          aria-hidden="true"
          className={`inline-block w-max ${nodeVisuals.widthClassName} text-center transition-all duration-300`}
          style={{
            opacity: hovered && isInteractive ? 1 : nodeVisuals.baseOpacity,
            transform:
              hovered && isInteractive
                ? "translate3d(0,-5px,0)"
                : "translate3d(0,0,0)",
          }}
        >
          <p
            lang={textPresentation.lang}
            style={{
              margin: 0,
              color: textColor,
              fontFamily: textPresentation.fontFamily,
              fontSize: nodeVisuals.fontSize,
              letterSpacing: textPresentation.letterSpacing,
              lineHeight: textPresentation.lineHeight,
              textTransform: textPresentation.textTransform,
              textShadow:
                hovered && isInteractive
                  ? "0 0 18px rgba(228, 0, 0, 0.16)"
                  : "0 0 24px rgba(255, 251, 245, 0.7)",
              whiteSpace: "normal",
              overflowWrap: "normal",
              wordBreak: "normal",
              textWrap: "balance",
              cursor: isInteractive ? "pointer" : "default",
            }}
          >
            {node.activeText}
          </p>
        </div>
      </Html>
    </group>
  );
}

export function HomeConstellationScene({
  nodes,
  edges,
  onStoryOpen,
  onReady,
  onCanvasReady,
}: HomeConstellationSceneProps) {
  const [viewportWidth, setViewportWidth] = useState(
    typeof window !== "undefined" ? window.innerWidth : 1440,
  );
  const isMobile = viewportWidth < 768;
  const [reducedMotion, setReducedMotion] = useState(false);
  const [lineLayer, setLineLayer] = useState<{
    width: number;
    height: number;
    lines: ReturnType<typeof buildMeasuredHomeGraphLines>;
  } | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const nodeElementRefs = useRef<
    Partial<Record<string, HTMLDivElement | null>>
  >({});
  const controlsRef = useRef<OrbitControlsImpl>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const observer = new ResizeObserver((entries) => {
      const width = entries[0]?.contentRect.width;
      if (width && width > 0) {
        setViewportWidth(width);
      }
    });

    observer.observe(container);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const updateMotionPreference = () => setReducedMotion(media.matches);

    updateMotionPreference();
    media.addEventListener("change", updateMotionPreference);

    return () => {
      media.removeEventListener("change", updateMotionPreference);
    };
  }, []);

  useEffect(() => {
    return () => {
      onCanvasReady?.(null);
    };
  }, [onCanvasReady]);

  useEffect(() => {
    const container = containerRef.current;

    if (!container || typeof window === "undefined") {
      return;
    }

    let frameId = 0;

    const updateLines = () => {
      const containerRect = container.getBoundingClientRect();

      if (containerRect.width > 0 && containerRect.height > 0) {
        const boxesByNodeId = nodes.reduce<
          Partial<
            Record<
              string,
              {
                centerX: number;
                centerY: number;
                width: number;
                height: number;
              }
            >
          >
        >((boxes, node) => {
          const element = nodeElementRefs.current[node.id];

          if (!element) {
            return boxes;
          }

          const rect = element.getBoundingClientRect();

          if (rect.width <= 0 || rect.height <= 0) {
            return boxes;
          }

          boxes[node.id] = {
            centerX: rect.left - containerRect.left + rect.width / 2,
            centerY: rect.top - containerRect.top + rect.height / 2,
            width: rect.width,
            height: rect.height,
          };

          return boxes;
        }, {});

        setLineLayer({
          width: containerRect.width,
          height: containerRect.height,
          lines: buildMeasuredHomeGraphLines({
            edges,
            boxesByNodeId,
            gap: isMobile ? 5 : 6,
          }),
        });
      }

      frameId = window.requestAnimationFrame(updateLines);
    };

    frameId = window.requestAnimationFrame(updateLines);

    return () => {
      window.cancelAnimationFrame(frameId);
    };
  }, [edges, isMobile, nodes]);

  const cameraConfig = getCameraConfig(viewportWidth);

  return (
    <div ref={containerRef} className="absolute inset-0 z-20">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 z-10"
      >
        <svg
          className="home-figma-line-layer"
          viewBox={
            lineLayer
              ? `0 0 ${lineLayer.width} ${lineLayer.height}`
              : "0 0 100 100"
          }
          preserveAspectRatio="none"
        >
          {(lineLayer?.lines ?? []).map((line) => (
            <line
              key={line.id}
              className="home-figma-line"
              x1={line.x1}
              y1={line.y1}
              x2={line.x2}
              y2={line.y2}
            />
          ))}
        </svg>
      </div>

      <Canvas
        dpr={[1, 1.5]}
        camera={{
          position: [...CAMERA_DESKTOP.position],
          fov: CAMERA_DESKTOP.fov,
        }}
        gl={{
          alpha: true,
          antialias: true,
          powerPreference: "high-performance",
        }}
        onCreated={(state) => {
          onCanvasReady?.(state.gl.domElement);
          onReady?.();
        }}
      >
        <ResponsiveCamera viewportWidth={viewportWidth} />
        <ambientLight intensity={0.65} />
        <directionalLight position={[0, 5, 8]} intensity={0.4} />

        <WireframeGlobe reducedMotion={reducedMotion} />

        {nodes.map((node) => (
          <HomeTextNode
            key={node.id}
            node={node}
            isMobile={isMobile}
            viewportWidth={viewportWidth}
            reducedMotion={reducedMotion}
            onStoryOpen={onStoryOpen}
            nodeRef={(nodeId, element) => {
              nodeElementRefs.current[nodeId] = element;
            }}
          />
        ))}

        <OrbitControls
          ref={controlsRef}
          enableDamping
          dampingFactor={0.08}
          enablePan={false}
          minDistance={cameraConfig.minDistance}
          maxDistance={cameraConfig.maxDistance}
          minPolarAngle={Math.PI / 2.55}
          maxPolarAngle={Math.PI / 1.82}
          minAzimuthAngle={-Math.PI / 6}
          maxAzimuthAngle={Math.PI / 6}
          target={[0, 0, 0]}
        />
      </Canvas>
    </div>
  );
}
