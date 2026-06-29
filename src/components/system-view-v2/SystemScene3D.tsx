"use client";

import { useEffect, useMemo, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import * as THREE from "three";
import type { World } from "@/types";
import { seededRng } from "@/lib/orbitData";
import {
  AtmosphereGlowMesh,
  CloudShadowMesh,
  PLANET_SPEED,
  WorldGlobeVisual,
  atmosphereGlowConfig,
  buildCloudTextureFromKey,
  cloudConfig,
} from "@/components/world/PlanetGlobe";
import { uwpVal } from "@/lib/worldMap";
import type {
  StarSystemOrbitModel,
  StarSystemGasGiantModel,
  StarSystemRenderableBody,
  StarSystemViewModel,
} from "@/lib/starSystemViewModel";
import { buildSystemSceneGraph } from "./sceneGraph";

export interface SystemScene3DProps {
  model: StarSystemViewModel;
  mainWorld?: World | null;
  animationEnabled?: boolean;
  className?: string;
}

let glowTexture: THREE.CanvasTexture | null = null;

const getGlowTexture = () => {
  if (glowTexture) return glowTexture;
  const size = 64;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Unable to build star glow texture.");
  const gradient = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  gradient.addColorStop(0, "rgba(255,255,255,0.85)");
  gradient.addColorStop(0.3, "rgba(255,255,255,0.30)");
  gradient.addColorStop(0.7, "rgba(255,255,255,0.05)");
  gradient.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, size, size);
  glowTexture = new THREE.CanvasTexture(canvas);
  return glowTexture;
};

const buildStarLayer = ({
  count,
  seed,
  minRadius,
  maxRadius,
  size,
  opacity,
  palette,
}: {
  count: number;
  seed: string;
  minRadius: number;
  maxRadius: number;
  size: number;
  opacity: number;
  palette: string[];
}) => {
  const rng = seededRng(seed);
  const positions = new Float32Array(count * 3);
  const colors = new Float32Array(count * 3);

  for (let i = 0; i < count; i++) {
    const theta = rng() * Math.PI * 2;
    const phi = Math.acos(2 * rng() - 1);
    const radius = minRadius + rng() * (maxRadius - minRadius);
    const color = new THREE.Color(palette[Math.floor(rng() * palette.length)]);
    const intensity = 0.55 + rng() * 0.45;

    positions[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
    positions[i * 3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
    positions[i * 3 + 2] = radius * Math.cos(phi);
    colors[i * 3] = color.r * intensity;
    colors[i * 3 + 1] = color.g * intensity;
    colors[i * 3 + 2] = color.b * intensity;
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));

  const material = new THREE.PointsMaterial({
    size,
    vertexColors: true,
    sizeAttenuation: true,
    transparent: true,
    opacity,
    depthWrite: false,
  });

  return new THREE.Points(geometry, material);
};

const buildSpaceHaze = () => {
  const geometry = new THREE.SphereGeometry(96, 48, 24);
  const material = new THREE.MeshBasicMaterial({
    color: "#0e7490",
    side: THREE.BackSide,
    transparent: true,
    opacity: 0.1,
    depthWrite: false,
  });
  return new THREE.Mesh(geometry, material);
};

const buildBackgroundGlowStars = () => {
  const rng = seededRng("system-starfield-glow-stars");
  const group = new THREE.Group();
  const texture = getGlowTexture();
  const palette = ["#ffffff", "#7ddcff", "#d9f7ff", "#ffd8a8", "#b8c8ff"];

  for (let i = 0; i < 34; i++) {
    const theta = rng() * Math.PI * 2;
    const phi = Math.acos(2 * rng() - 1);
    const radius = 66 + rng() * 34;
    const scale = 0.55 + rng() * 1.25;
    const color = new THREE.Color(palette[Math.floor(rng() * palette.length)]);
    const sprite = new THREE.Sprite(new THREE.SpriteMaterial({
      map: texture,
      color,
      transparent: true,
      opacity: 0.2 + rng() * 0.28,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      toneMapped: false,
    }));

    sprite.position.set(
      radius * Math.sin(phi) * Math.cos(theta),
      radius * Math.sin(phi) * Math.sin(theta),
      radius * Math.cos(phi),
    );
    sprite.scale.set(scale, scale, 1);
    group.add(sprite);
  }

  return group;
};

const Starfield = () => {
  const object = useMemo(() => {
    const group = new THREE.Group();
    group.add(buildSpaceHaze());
    group.add(buildBackgroundGlowStars());
    group.add(buildStarLayer({
      count: 4200,
      seed: "system-starfield-dim",
      minRadius: 50,
      maxRadius: 104,
      size: 0.055,
      opacity: 0.72,
      palette: ["#d8f7ff", "#b9d6ff", "#ffffff", "#b8e8ff"],
    }));
    group.add(buildStarLayer({
      count: 1300,
      seed: "system-starfield-mid",
      minRadius: 48,
      maxRadius: 98,
      size: 0.11,
      opacity: 0.9,
      palette: ["#ffffff", "#dff9ff", "#7ddcff", "#ffe3b0"],
    }));
    group.add(buildStarLayer({
      count: 220,
      seed: "system-starfield-bright",
      minRadius: 46,
      maxRadius: 92,
      size: 0.24,
      opacity: 1,
      palette: ["#ffffff", "#67e8f9", "#d7f7ff", "#ffd18a"],
    }));
    return group;
  }, []);

  useEffect(() => () => {
    object.traverse((child) => {
      if (child instanceof THREE.Points || child instanceof THREE.Mesh) {
        child.geometry.dispose();
        if (Array.isArray(child.material)) child.material.forEach((material) => material.dispose());
        else child.material.dispose();
      } else if (child instanceof THREE.Sprite) {
        if (Array.isArray(child.material)) child.material.forEach((material) => material.dispose());
        else child.material.dispose();
      }
    });
  }, [object]);

  return <primitive object={object} />;
};

const SURFACE_COLOR: Record<string, string> = {
  barren: "#78716c",
  vacuum: "#4b5563",
  desert: "#a16207",
  arid: "#8b6f56",
  terran: "#256f5a",
  ocean: "#1d4ed8",
  ice: "#bfdbfe",
  exotic: "#6d5aa8",
  corrosive: "#8a6a2f",
  insidious: "#7f1d1d",
  hellworld: "#991b1b",
};

const orbitColor = (orbitKind: string) => {
  if (orbitKind === "companion") return "#0f3f55";
  if (orbitKind === "satellite") return "#123141";
  return "#0e3a50";
};

const orbitOpacity = (orbitKind: StarSystemOrbitModel["orbitKind"]) => {
  if (orbitKind === "satellite") return 0.28;
  if (orbitKind === "companion") return 0.34;
  return 0.32;
};

const orbitAngularSpeed = (orbit: StarSystemOrbitModel | undefined) => {
  if (!orbit) return 0;
  const radius = Math.max(0.5, orbit.sceneRadius);
  if (orbit.orbitKind === "satellite") return 0.72 / Math.sqrt(radius);
  if (orbit.orbitKind === "companion") return 0.18 / Math.pow(radius, 1.35);
  return 0.12 / Math.pow(radius, 1.5);
};

const orbitPlaneRotation = (seed: string, orbitId: number, subtle = false): [number, number, number] => {
  const rng = seededRng(`${seed}:orbit-plane:${orbitId}`);
  const maxInclination = subtle ? 0.055 : THREE.MathUtils.degToRad(13);
  const inclination = (rng() * 2 - 1) * maxInclination;
  const node = rng() * Math.PI * 2;
  return [inclination, node, 0];
};

const sizeCodeValue = (sizeCode: string | null | undefined) => {
  if (!sizeCode) return 5;
  const value = Number.parseInt(sizeCode, 16);
  return Number.isFinite(value) ? value : 5;
};

const worldRadius = (body: StarSystemRenderableBody) => {
  if (body.kind !== "world") return 0.1;
  const size = sizeCodeValue(body.sizeCode);
  return THREE.MathUtils.clamp(0.1 * (0.72 + size * 0.065), 0.068, 0.132);
};

type GasGiantVisualType = "hot" | "jovian" | "saturn" | "ice";

const gasGiantTypeForOrbit = (orbitId: number): GasGiantVisualType => {
  if (orbitId <= 3) return "hot";
  if (orbitId <= 7) return "jovian";
  return "ice";
};

const visualGasGiantType = (
  orbitId: number,
  classification?: StarSystemGasGiantModel["classification"] | null,
): GasGiantVisualType => {
  if (classification === "IG") return "ice";
  if (classification === "SGG") return "saturn";
  if (classification === "LGG") return orbitId <= 3 ? "hot" : "jovian";
  return gasGiantTypeForOrbit(orbitId);
};

const HOT_BANDS = ["#7c2d12", "#b45309", "#d97706", "#1e3a8a", "#0f172a", "#f59e0b"];
const JOVIAN_BANDS = ["#8a5b35", "#d8b384", "#6f4a2e", "#ead4aa", "#a66b39", "#f2dfc1"];
const SATURN_BANDS = ["#8b7350", "#d8c298", "#6f6044", "#efe1bd", "#b69a6a", "#f5e9cd"];
const ICE_BANDS = ["#0f3b4a", "#155e75", "#0891b2", "#67e8f9", "#164e63", "#a5f3fc"];
const JOVIAN_RING_BANDS = ["#2f2419", "#8a7356", "#d7c19a", "#f1e2c3", "#9d825d", "#443322"];
const ICE_RING_BANDS = ["#071b24", "#1f6f86", "#8de8f7", "#d6fbff", "#2d91a8", "#092f3d"];

const colorToRgb = (color: string) => new THREE.Color(color);

const mixBandColor = (colors: string[], value: number) => {
  const scaled = THREE.MathUtils.clamp(value, 0, 0.999) * (colors.length - 1);
  const index = Math.floor(scaled);
  const mix = scaled - index;
  const a = colorToRgb(colors[index]);
  const b = colorToRgb(colors[Math.min(colors.length - 1, index + 1)]);
  return a.lerp(b, mix);
};

const buildGasGiantTex = (colors: string[], seed: number): THREE.CanvasTexture => {
  const width = 768;
  const height = 384;
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Unable to build gas giant texture.");
  const image = ctx.createImageData(width, height);
  const data = image.data;
  const seedA = seed * 1.73 + 0.31;
  const seedB = seed * 2.41 + 1.19;

  for (let y = 0; y < height; y++) {
    const lat = y / (height - 1);
    const band =
      Math.sin(lat * Math.PI * 18 + seedA) * 0.18 +
      Math.sin(lat * Math.PI * 7 + seedB) * 0.16 +
      Math.sin(lat * Math.PI * 35 + seed * 0.77) * 0.06;

    for (let x = 0; x < width; x++) {
      const lon = x / width;
      const shear = Math.sin(lat * Math.PI * 12 + seed) * 0.035;
      const turbulence =
        Math.sin((lon + shear) * Math.PI * 20 + lat * Math.PI * 5 + seedA) * 0.055 +
        Math.sin((lon - shear) * Math.PI * 43 - lat * Math.PI * 9 + seedB) * 0.035 +
        Math.sin((lon + lat * 0.35) * Math.PI * 82 + seed * 4.1) * 0.015;
      const storm =
        Math.sin((lon * 2.4 + seed * 0.17) * Math.PI * 2) *
        Math.exp(-Math.pow((lat - (0.38 + Math.sin(seed) * 0.08)) * 16, 2)) * 0.07;
      const value = THREE.MathUtils.clamp(0.5 + band + turbulence + storm, 0, 1);
      const shade = 0.9 + Math.sin(lat * Math.PI * 46 + turbulence * 12) * 0.045;
      const color = mixBandColor(colors, value);
      const i = (y * width + x) * 4;

      data[i] = Math.round(color.r * 255 * shade);
      data[i + 1] = Math.round(color.g * 255 * shade);
      data[i + 2] = Math.round(color.b * 255 * shade);
      data[i + 3] = 255;
    }
  }

  ctx.putImageData(image, 0, 0);
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.ClampToEdgeWrapping;
  tex.minFilter = THREE.LinearMipmapLinearFilter;
  tex.magFilter = THREE.LinearFilter;
  tex.anisotropy = 4;
  tex.needsUpdate = true;
  return tex;
};

const buildGasGiantRingTex = (colors: string[], seed: number): THREE.CanvasTexture => {
  const width = 768;
  const height = 96;
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Unable to build gas giant ring texture.");
  const image = ctx.createImageData(width, height);
  const data = image.data;

  for (let x = 0; x < width; x++) {
    const radial = x / (width - 1);
    const band =
      Math.sin(radial * Math.PI * 18 + seed * 1.7) * 0.2 +
      Math.sin(radial * Math.PI * 51 + seed * 0.6) * 0.08 +
      Math.sin(radial * Math.PI * 127 + seed * 2.2) * 0.035;
    const gapA = Math.exp(-Math.pow((radial - (0.36 + Math.sin(seed) * 0.06)) * 48, 2));
    const gapB = Math.exp(-Math.pow((radial - (0.67 + Math.cos(seed) * 0.04)) * 70, 2));
    const edgeFade = Math.sin(Math.PI * radial);
    const alpha = THREE.MathUtils.clamp((0.42 + band) * edgeFade - gapA * 0.34 - gapB * 0.22, 0, 0.72);
    const color = mixBandColor(colors, THREE.MathUtils.clamp(0.52 + band * 1.8, 0, 1));

    for (let y = 0; y < height; y++) {
      const grain = 0.93 + Math.sin((x * 13.1 + y * 7.7 + seed * 31) * 0.08) * 0.035;
      const i = (y * width + x) * 4;
      data[i] = Math.round(color.r * 255 * grain);
      data[i + 1] = Math.round(color.g * 255 * grain);
      data[i + 2] = Math.round(color.b * 255 * grain);
      data[i + 3] = Math.round(alpha * 255);
    }
  }

  ctx.putImageData(image, 0, 0);
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.ClampToEdgeWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.minFilter = THREE.LinearMipmapLinearFilter;
  tex.magFilter = THREE.LinearFilter;
  tex.anisotropy = 4;
  tex.needsUpdate = true;
  return tex;
};

const buildRingGeo = (inner: number, outer: number): THREE.BufferGeometry => {
  const geo = new THREE.RingGeometry(inner, outer, 128);
  const pos = geo.attributes.position as THREE.BufferAttribute;
  const uv = geo.attributes.uv as THREE.BufferAttribute;
  const vertex = new THREE.Vector3();
  for (let i = 0; i < pos.count; i++) {
    vertex.fromBufferAttribute(pos, i);
    uv.setXY(i, (vertex.length() - inner) / (outer - inner), 1);
  }
  uv.needsUpdate = true;
  return geo;
};

const bodyColor = (body: StarSystemRenderableBody) => {
  if (body.kind === "belt") return "#94a3b8";
  if (body.kind !== "world") return "#6b7280";
  return SURFACE_COLOR[body.surfaceType ?? "barren"] ?? "#6b7280";
};

const StarVisual = ({ star }: { star: StarSystemViewModel["stars"][number] }) => {
  const texture = useMemo(() => getGlowTexture(), []);
  const glowColor = useMemo(() => new THREE.Color(star.colors.glow), [star.colors.glow]);
  const radius = Math.max(0.16, star.sceneRadius);
  const glowRadius = radius * 4.5;

  return (
    <>
      <sprite scale={[glowRadius * 2.4, glowRadius * 2.4, 1]}>
        <spriteMaterial
          map={texture}
          color={glowColor}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
          transparent
          opacity={0.35}
        />
      </sprite>
      <sprite scale={[glowRadius * 1.3, glowRadius * 1.3, 1]}>
        <spriteMaterial
          map={texture}
          color={glowColor}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
          transparent
          opacity={0.65}
        />
      </sprite>
      <mesh>
        <sphereGeometry args={[radius, 32, 32]} />
        <meshBasicMaterial color={star.colors.mid} toneMapped={false} />
      </mesh>
    </>
  );
};

const GasGiantVisual = ({
  body,
  gasGiantIndex,
  animationEnabled,
}: {
  body: StarSystemRenderableBody;
  gasGiantIndex: number;
  animationEnabled: boolean;
}) => {
  const sphereRef = useRef<THREE.Mesh>(null);
  const hazeRef = useRef<THREE.Mesh>(null);
  const orbitId = body.orbitId ?? 0;
  const type = body.kind === "gasGiant" ? visualGasGiantType(orbitId, body.classification) : "jovian";
  const hasRing = type !== "hot" && (type === "saturn" || (type === "jovian" && gasGiantIndex % 3 === 0) || (type === "ice" && gasGiantIndex % 2 === 0));
  const radius = type === "hot" ? 0.22 : type === "jovian" ? 0.22 : type === "saturn" ? 0.19 : 0.17;
  const seed = gasGiantIndex + orbitId * 0.27;

  useFrame((_, delta) => {
    if (!animationEnabled) return;
    if (sphereRef.current) sphereRef.current.rotation.y += delta * (type === "hot" ? 0.16 : type === "ice" ? 0.08 : 0.11);
    if (hazeRef.current) hazeRef.current.rotation.y -= delta * (type === "hot" ? 0.08 : 0.045);
  });

  const sphereTex = useMemo(() => {
    if (hasRing) return buildGasGiantTex(SATURN_BANDS, seed);
    if (type === "jovian") return buildGasGiantTex(JOVIAN_BANDS, seed);
    return buildGasGiantTex(type === "hot" ? HOT_BANDS : ICE_BANDS, seed);
  }, [hasRing, seed, type]);

  useEffect(() => () => sphereTex.dispose(), [sphereTex]);

  const ringGeo = useMemo(
    () => hasRing ? buildRingGeo(radius * 1.35, radius * (type === "ice" ? 2.35 : type === "saturn" ? 2.85 : 2.55)) : null,
    [hasRing, radius, type],
  );
  useEffect(() => () => ringGeo?.dispose(), [ringGeo]);

  const ringShadowGeo = useMemo(
    () => hasRing ? new THREE.TorusGeometry(radius * 1.018, radius * 0.012, 6, 96) : null,
    [hasRing, radius],
  );
  useEffect(() => () => ringShadowGeo?.dispose(), [ringShadowGeo]);

  const ringTexture = useMemo(
    () => hasRing ? buildGasGiantRingTex(type === "ice" ? ICE_RING_BANDS : JOVIAN_RING_BANDS, seed) : null,
    [hasRing, seed, type],
  );
  useEffect(() => () => ringTexture?.dispose(), [ringTexture]);

  const ringRotation = useMemo(
    (): [number, number, number] => [
      Math.PI / (2.55 + Math.sin(seed * 1.7) * 0.32),
      Math.sin(seed * 2.3) * 0.18,
      Math.cos(seed * 1.9) * 0.7,
    ],
    [seed],
  );

  return (
    <>
      <mesh ref={sphereRef}>
        <sphereGeometry args={[radius, 48, 32]} />
        <meshStandardMaterial
          map={sphereTex}
          roughness={0.78}
          metalness={0}
          emissive={type === "hot" ? "#2a0f12" : type === "ice" ? "#062f3b" : "#1f160e"}
          emissiveIntensity={type === "hot" ? 0.28 : 0.12}
        />
      </mesh>
      <mesh ref={hazeRef}>
        <sphereGeometry args={[radius * 1.012, 48, 24]} />
        <meshBasicMaterial
          color={type === "hot" ? "#f59e0b" : type === "ice" ? "#67e8f9" : "#f5deb3"}
          transparent
          opacity={type === "hot" ? 0.16 : 0.1}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </mesh>
      {hasRing && ringGeo && ringTexture && (
        <>
          <mesh geometry={ringGeo} rotation={ringRotation}>
            <meshStandardMaterial
              map={ringTexture}
              side={THREE.DoubleSide}
              transparent
              opacity={0.9}
              roughness={0.86}
              metalness={0}
              emissive={type === "ice" ? "#164e63" : "#6b5a3d"}
              emissiveIntensity={0.09}
              depthWrite={false}
            />
          </mesh>
          {ringShadowGeo && (
            <mesh geometry={ringShadowGeo} rotation={ringRotation}>
              <meshBasicMaterial color="#02040a" transparent opacity={0.22} depthWrite={false} />
            </mesh>
          )}
        </>
      )}
    </>
  );
};

const WorldVisual = ({
  body,
  animationEnabled,
}: {
  body: StarSystemRenderableBody;
  animationEnabled: boolean;
}) => {
  const cloudRefs = useRef<Array<THREE.Mesh | null>>([]);
  const radius = worldRadius(body);
  const atmoVal = body.kind === "world" ? uwpVal(body.atmosphereCode ?? "0") : 0;
  const hydroVal = body.kind === "world" ? uwpVal(body.hydrographicsCode ?? "0") : 0;
  const clouds = useMemo(
    () => body.kind === "world" ? cloudConfig(atmoVal, hydroVal) : null,
    [atmoVal, body.kind, hydroVal],
  );
  const atmosphereGlow = useMemo(
    () => body.kind === "world" ? atmosphereGlowConfig(atmoVal) : null,
    [atmoVal, body.kind],
  );
  const cloudTextures = useMemo(
    () => clouds
      ? clouds.layers.map((layer) => buildCloudTextureFromKey(
        `${body.orbitId ?? "unplaced"}:${body.label ?? "world"}:${body.kind === "world" ? body.sizeCode ?? "x" : "x"}:${body.kind === "world" ? body.atmosphereCode ?? "0" : "0"}:${body.kind === "world" ? body.hydrographicsCode ?? "0" : "0"}`,
        clouds,
        layer,
      ))
      : [],
    [body, clouds],
  );

  useEffect(
    () => () => cloudTextures.forEach((cloudTexture) => cloudTexture.dispose()),
    [cloudTextures],
  );

  useFrame((_, delta) => {
    if (!animationEnabled) return;
    if (!clouds) return;
    clouds.layers.forEach((layer, index) => {
      const cloudRef = cloudRefs.current[index];
      if (cloudRef) cloudRef.rotation.y += delta * PLANET_SPEED * layer.speedMult;
    });
  });

  return (
    <>
      <mesh>
        <sphereGeometry args={[radius, 24, 16]} />
        <meshStandardMaterial
          color={bodyColor(body)}
          roughness={0.84}
          emissive={body.kind === "world" && (body.surfaceType === "hellworld" || body.surfaceType === "exotic") ? bodyColor(body) : "#000000"}
          emissiveIntensity={body.kind === "world" && body.surfaceType === "hellworld" ? 0.18 : body.kind === "world" && body.surfaceType === "exotic" ? 0.1 : 0}
        />
      </mesh>
      {clouds && cloudTextures[0] && (
        <CloudShadowMesh
          radius={radius}
          layer={clouds.layers[0]}
          texture={cloudTextures[0]}
          opacity={clouds.shadowOpacity}
          animationEnabled={animationEnabled}
        />
      )}
      {clouds && (
        <>
          {clouds.layers.map((layer, index) => (
            <mesh
              key={`${layer.radiusMult}-${index}`}
              ref={(node) => { cloudRefs.current[index] = node; }}
            >
              <sphereGeometry args={[radius * layer.radiusMult, 24, 16]} />
              <meshStandardMaterial
                alphaMap={cloudTextures[index]}
                color={layer.color}
                transparent
                opacity={layer.opacity}
                depthWrite={false}
                alphaTest={0.015}
              />
            </mesh>
          ))}
        </>
      )}
      {atmosphereGlow && (
        <AtmosphereGlowMesh
          radius={radius}
          config={atmosphereGlow}
        />
      )}
    </>
  );
};

const MainWorldVisual = ({
  world,
  animationEnabled,
}: {
  world: World;
  animationEnabled: boolean;
}) => (
  <WorldGlobeVisual world={world} radius={0.1} segments={[64, 32]} animationEnabled={animationEnabled} />
);

const AsteroidBeltVisual = ({
  body,
  orbit,
  animationEnabled,
}: {
  body: StarSystemRenderableBody;
  orbit: StarSystemOrbitModel;
  animationEnabled: boolean;
}) => {
  const beltRef = useRef<THREE.Group>(null);
  const rocksRef = useRef<THREE.InstancedMesh>(null);
  const isMainWorldBelt = body.kind === "belt" && body.isMainWorld;
  const rockData = useMemo(() => {
    const rng = seededRng(`${body.label ?? "belt"}:${orbit.orbitId}:${orbit.sceneRadius}:${isMainWorldBelt ? "main" : "ordinary"}`);
    const count = isMainWorldBelt ? 170 : 110;
    return Array.from({ length: count }, () => {
      const angle = rng() * Math.PI * 2;
      const radialJitter = (rng() - 0.5) * 0.55;
      const radius = orbit.sceneRadius + radialJitter;
      const y = (rng() - 0.5) * (isMainWorldBelt ? 0.18 : 0.11);
      const scale = (isMainWorldBelt ? 0.028 : 0.02) * (0.55 + rng() * 1.25);
      return {
        position: new THREE.Vector3(Math.cos(angle) * radius, y, Math.sin(angle) * radius),
        rotation: new THREE.Euler(rng() * Math.PI, rng() * Math.PI, rng() * Math.PI),
        scale,
      };
    });
  }, [body.label, isMainWorldBelt, orbit.orbitId, orbit.sceneRadius]);

  useEffect(() => {
    const mesh = rocksRef.current;
    if (!mesh) return;
    const matrix = new THREE.Matrix4();
    const quaternion = new THREE.Quaternion();
    const scale = new THREE.Vector3();

    rockData.forEach((rock, index) => {
      quaternion.setFromEuler(rock.rotation);
      scale.setScalar(rock.scale);
      matrix.compose(rock.position, quaternion, scale);
      mesh.setMatrixAt(index, matrix);
    });
    mesh.instanceMatrix.needsUpdate = true;
  }, [rockData]);

  useFrame((_, delta) => {
    if (!animationEnabled) return;
    if (beltRef.current) beltRef.current.rotation.y += delta * (isMainWorldBelt ? 0.006 : 0.0035);
  });

  return (
    <group ref={beltRef}>
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[orbit.sceneRadius, 0.08, 3, 160]} />
        <meshBasicMaterial
          color={isMainWorldBelt ? "#a8a29e" : "#78716c"}
          transparent
          opacity={isMainWorldBelt ? 0.2 : 0.12}
          depthWrite={false}
        />
      </mesh>
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[orbit.sceneRadius * 1.035, 0.04, 3, 160]} />
        <meshBasicMaterial
          color={isMainWorldBelt ? "#a8a29e" : "#78716c"}
          transparent
          opacity={isMainWorldBelt ? 0.2 : 0.12}
          depthWrite={false}
        />
      </mesh>
      <instancedMesh ref={rocksRef} args={[undefined, undefined, rockData.length]}>
        <dodecahedronGeometry args={[1, 0]} />
        <meshStandardMaterial
          color={isMainWorldBelt ? "#a8a29e" : "#78716c"}
          roughness={0.92}
          metalness={0.02}
          emissive={isMainWorldBelt ? "#1c1917" : "#0c0a09"}
          emissiveIntensity={0.08}
        />
      </instancedMesh>
      {isMainWorldBelt && (
        <group position={[orbit.sceneRadius, 0.04, 0]}>
          <mesh>
            <sphereGeometry args={[0.055, 12, 8]} />
            <meshStandardMaterial
              color="#d6d3d1"
              roughness={0.82}
              emissive="#164e63"
              emissiveIntensity={0.22}
            />
          </mesh>
          <mesh position={[0.09, 0.015, 0.02]} rotation={[0.35, 0.2, 0.15]}>
            <boxGeometry args={[0.12, 0.035, 0.045]} />
            <meshStandardMaterial color="#94a3b8" roughness={0.68} metalness={0.18} emissive="#0f172a" emissiveIntensity={0.18} />
          </mesh>
          <mesh position={[-0.08, -0.01, -0.025]} rotation={[0.1, -0.4, -0.25]}>
            <boxGeometry args={[0.09, 0.03, 0.04]} />
            <meshStandardMaterial color="#64748b" roughness={0.72} metalness={0.16} emissive="#0f172a" emissiveIntensity={0.14} />
          </mesh>
          <mesh position={[0.02, 0.065, -0.055]} rotation={[0.4, 0.7, 0.2]}>
            <dodecahedronGeometry args={[0.045, 0]} />
            <meshStandardMaterial color="#78716c" roughness={0.9} emissive="#1c1917" emissiveIntensity={0.12} />
          </mesh>
          <mesh rotation={[Math.PI / 2, 0, 0]}>
            <torusGeometry args={[0.15, 0.004, 4, 48]} />
            <meshBasicMaterial color="#22d3ee" transparent opacity={0.28} depthWrite={false} />
          </mesh>
        </group>
      )}
    </group>
  );
};

const AnimatedSystemPrimitives = ({
  model,
  mainWorld,
  animationEnabled,
}: {
  model: StarSystemViewModel;
  mainWorld?: World | null;
  animationEnabled: boolean;
}) => {
  const graph = useMemo(() => buildSystemSceneGraph(model), [model]);
  const bodyById = useMemo(() => new Map(model.bodies.map((body) => [body.id, body])), [model.bodies]);
  const orbitPlaneRotationById = useMemo(() => {
    const rotations = new Map<string, [number, number, number]>();
    for (const orbit of model.orbits) {
      const body = orbit.bodyId ? bodyById.get(orbit.bodyId) : null;
      rotations.set(
        orbit.id,
        orbitPlaneRotation(orbit.id, orbit.orbitId, body?.isMainWorld === true),
      );
    }
    return rotations;
  }, [bodyById, model.orbits]);
  const orbitPlaneEulerById = useMemo(() => {
    const eulers = new Map<string, THREE.Euler>();
    for (const [id, rotation] of orbitPlaneRotationById) {
      eulers.set(id, new THREE.Euler(...rotation));
    }
    return eulers;
  }, [orbitPlaneRotationById]);
  const gasGiantIndexById = useMemo(() => {
    const nextIndexByParent = new Map<string, number>();
    const indexById = new Map<string, number>();
    for (const body of model.bodies) {
      if (body.kind !== "gasGiant") continue;
      const nextIndex = nextIndexByParent.get(body.parentId) ?? 0;
      indexById.set(body.id, nextIndex);
      nextIndexByParent.set(body.parentId, nextIndex + 1);
    }
    return indexById;
  }, [model.bodies]);
  const orbitByBodyId = useMemo(
    () => new Map(model.orbits.flatMap((orbit) => orbit.bodyId ? [[orbit.bodyId, orbit] as const] : [])),
    [model.orbits],
  );
  const starRefs = useRef(new Map<string, THREE.Group>());
  const orbitRefs = useRef(new Map<string, THREE.Group>());
  const bodyRefs = useRef(new Map<string, THREE.Group>());

  useFrame(({ clock }) => {
    const elapsed = animationEnabled ? clock.getElapsedTime() : 0;
    const anchors = new Map<string, THREE.Vector3>([
      ["system:center", new THREE.Vector3(0, 0, 0)],
    ]);

    for (const star of model.stars) {
      const angle = star.orbit.angle0 + elapsed * star.orbit.angularVelocity * 0.18;
      const position = new THREE.Vector3(
        Math.cos(angle) * star.orbit.sceneRadius,
        0,
        Math.sin(angle) * star.orbit.sceneRadius,
      );
      anchors.set(star.id, position);
      starRefs.current.get(star.id)?.position.copy(position);
    }

    for (const body of model.bodies) {
      const parent = anchors.get(body.parentId) ?? anchors.get("system:center")!;
      const orbit = orbitByBodyId.get(body.id);
      const angle = body.scene.angle0 + elapsed * orbitAngularSpeed(orbit);
      const offset = new THREE.Vector3(
        Math.cos(angle) * body.scene.orbitRadius,
        0,
        Math.sin(angle) * body.scene.orbitRadius,
      );
      const orbitPlane = orbit ? orbitPlaneEulerById.get(orbit.id) : null;
      if (orbitPlane) offset.applyEuler(orbitPlane);
      const position = parent.clone().add(offset);
      anchors.set(body.id, position);
      const bodyRef = bodyRefs.current.get(body.id);
      if (bodyRef) {
        bodyRef.position.copy(position);
        if (orbitPlane) bodyRef.rotation.copy(orbitPlane);
        else bodyRef.rotation.set(0, 0, 0);
      }
    }

    for (const orbit of model.orbits) {
      const parent = anchors.get(orbit.parentId) ?? anchors.get("system:center")!;
      orbitRefs.current.get(orbit.id)?.position.copy(parent);
    }
  });

  return (
    <group>
      <mesh position={[0, 0, 0]}>
        <sphereGeometry args={[0.08, 12, 8]} />
        <meshBasicMaterial color="#e2e8f0" transparent opacity={0.34} />
      </mesh>

      {graph.orbits.map(({ orbit, x, y, z }) => {
        const body = orbit.bodyId ? bodyById.get(orbit.bodyId) : null;
        const isBelt = body?.kind === "belt";
        const tube = orbit.orbitKind === "satellite" ? 0.0035 : orbit.orbitKind === "companion" ? 0.007 : 0.006;
        const planeRotation = orbitPlaneRotationById.get(orbit.id) ?? [0, 0, 0];
        return (
          <group
            key={orbit.id}
            ref={(node) => {
              if (node) orbitRefs.current.set(orbit.id, node);
              else orbitRefs.current.delete(orbit.id);
            }}
            position={[x, y, z]}
            rotation={planeRotation}
          >
            <mesh rotation={[Math.PI / 2, 0, 0]}>
              <torusGeometry args={[orbit.sceneRadius, tube, 8, 128]} />
              <meshBasicMaterial
                color={isBelt ? "#3f3f46" : orbitColor(orbit.orbitKind)}
                transparent
                opacity={isBelt ? body.isMainWorld ? 0.2 : 0.1 : orbitOpacity(orbit.orbitKind)}
              />
            </mesh>
            {isBelt && <AsteroidBeltVisual body={body} orbit={orbit} animationEnabled={animationEnabled} />}
          </group>
        );
      })}

      {graph.stars.map(({ star, x, y, z }) => (
        <group
          key={star.id}
          ref={(node) => {
            if (node) starRefs.current.set(star.id, node);
            else starRefs.current.delete(star.id);
          }}
          position={[x, y, z]}
        >
          <StarVisual star={star} />
        </group>
      ))}

      {graph.bodies.map(({ body, x, y, z }) => {
        if (body.kind === "belt") return null;
        const orbit = orbitByBodyId.get(body.id);
        const planeRotation = orbit ? orbitPlaneRotationById.get(orbit.id) : undefined;
        return (
          <group
            key={body.id}
            ref={(node) => {
              if (node) bodyRefs.current.set(body.id, node);
              else bodyRefs.current.delete(body.id);
            }}
            position={[x, y, z]}
            rotation={planeRotation}
          >
            {body.kind === "gasGiant" ? (
              <GasGiantVisual
                body={body}
                gasGiantIndex={gasGiantIndexById.get(body.id) ?? 0}
                animationEnabled={animationEnabled}
              />
            ) : body.isMainWorld && mainWorld ? (
              <MainWorldVisual world={mainWorld} animationEnabled={animationEnabled} />
            ) : (
              <WorldVisual body={body} animationEnabled={animationEnabled} />
            )}
          </group>
        );
      })}
    </group>
  );
};

export const SystemScene3D = ({
  model,
  mainWorld = null,
  animationEnabled = false,
  className = "",
}: SystemScene3DProps) => {
  const cameraDistance = model.scene.cameraDistance;

  return (
    <div className={`relative ${className}`}>
      <Canvas
        camera={{ position: [0, cameraDistance * 0.4, cameraDistance], fov: 50, far: 200 }}
        gl={{ antialias: true, alpha: false }}
      >
        <color attach="background" args={["#020617"]} />
        <ambientLight intensity={0.6} />
        <directionalLight position={[2, 3, 4]} intensity={1.4} />

        <Starfield />
        <AnimatedSystemPrimitives
          model={model}
          mainWorld={mainWorld}
          animationEnabled={animationEnabled}
        />

        <OrbitControls enablePan={false} minDistance={2} maxDistance={80} makeDefault />
      </Canvas>
    </div>
  );
};

export default SystemScene3D;
