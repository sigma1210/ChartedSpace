"use client";

import { useEffect, useRef, useState } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import * as THREE from "three";
import type { World } from "../../types";
import {
  RENDER_SIZE, LAND_BY_ATMO, HEX_W,
  buildHexGrid, assignTerrain, terrainColor, svgDimensions, uwpVal, isAsteroid,
} from "../../lib/worldMap";

// ─── Texture generation ───────────────────────────────────────────────────────

const TEX_W = 512;
const TEX_H = 256;
const GRID_W = 24;
const GRID_H = 12;

export const buildTexture = (world: World): THREE.CanvasTexture => {
  const S = RENDER_SIZE;
  const { svgW, svgH } = svgDimensions(S);

  const baseHexes = buildHexGrid(S, 0, 0);
  const hexes     = assignTerrain(baseHexes, world, svgH);
  const atmoV     = uwpVal(world.uwp.atmosphere);
  const landColor = LAND_BY_ATMO[atmoV] ?? "#2a5818";

  // Mirror worldMapping.js reposition(): ghost copies of the left column
  // (triangle IDs 0 and 1) placed at +5 columns to the right so the
  // left and right edges of the Voronoi map carry the same terrain colours.
  const ghostShift = 5 * S * HEX_W;
  const ghosts = hexes
    .filter(h => h.triangleId === 0 || h.triangleId === 1)
    .map(h => ({ ...h, left: h.left + ghostShift }));

  const centers = [...hexes, ...ghosts].map(h => {
    const col = terrainColor(h.terrain, landColor);
    return {
      nx: (h.left + 16) / svgW,
      ny: (h.top  + 17) / svgH,
      r: parseInt(col.slice(1, 3), 16),
      g: parseInt(col.slice(3, 5), 16),
      b: parseInt(col.slice(5, 7), 16),
    };
  });

  const gridCells: number[][] = Array.from({ length: GRID_W * GRID_H }, () => []);
  centers.forEach((c, i) => {
    const gx = Math.min(GRID_W - 1, Math.floor(c.nx * GRID_W));
    const gy = Math.min(GRID_H - 1, Math.floor(c.ny * GRID_H));
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        const nx = ((gx + dx) + GRID_W) % GRID_W;
        const ny = Math.max(0, Math.min(GRID_H - 1, gy + dy));
        gridCells[ny * GRID_W + nx].push(i);
      }
    }
  });

  const canvas  = document.createElement("canvas");
  canvas.width  = TEX_W;
  canvas.height = TEX_H;
  const ctx = canvas.getContext("2d")!;
  const img = ctx.createImageData(TEX_W, TEX_H);
  const data = img.data;

  for (let py = 0; py < TEX_H; py++) {
    const ny = py / (TEX_H - 1);
    const gy = Math.min(GRID_H - 1, Math.floor(ny * GRID_H));
    for (let px = 0; px < TEX_W; px++) {
      const nx = px / (TEX_W - 1);
      const gx = Math.min(GRID_W - 1, Math.floor(nx * GRID_W));
      const candidates = gridCells[gy * GRID_W + gx];

      let minDist = Infinity, r = 2, g = 12, b = 20;
      for (const ci of candidates) {
        const c  = centers[ci];
        let   dx = nx - c.nx;
        if (dx >  0.5) dx -= 1;
        if (dx < -0.5) dx += 1;
        const dy = ny - c.ny;
        const d  = dx * dx + dy * dy;
        if (d < minDist) { minDist = d; r = c.r; g = c.g; b = c.b; }
      }

      const idx = (py * TEX_W + px) * 4;
      data[idx] = r; data[idx + 1] = g; data[idx + 2] = b; data[idx + 3] = 255;
    }
  }

  ctx.putImageData(img, 0, 0);
  const tex = new THREE.CanvasTexture(canvas);
  tex.needsUpdate = true;
  return tex;
};

// ─── Cloud layer config by atmosphere code ────────────────────────────────────
// Returns null for airless/trace worlds, otherwise { opacity, color, speedMult }

export interface CloudConfig { opacity: number; color: string; speedMult: number }

export const cloudConfig = (atmo: number): CloudConfig | null => {
  if (atmo <= 1)  return null;                                              // 0–1: none
  if (atmo <= 3)  return { opacity: 0.25, color: "#ffffff", speedMult: 1.08 }; // very thin
  if (atmo <= 5)  return { opacity: 0.45, color: "#ffffff", speedMult: 1.08 }; // thin
  if (atmo <= 7)  return { opacity: 0.65, color: "#ffffff", speedMult: 1.08 }; // standard
  if (atmo <= 9)  return { opacity: 0.80, color: "#dde8ee", speedMult: 0.97 }; // dense
  if (atmo === 10) return { opacity: 0.55, color: "#c8d4e8", speedMult: 1.05 }; // exotic
  if (atmo === 11) return { opacity: 0.92, color: "#e8e0a0", speedMult: 0.90 }; // corrosive — sulphuric
  return                 { opacity: 0.96, color: "#c8a870", speedMult: 0.85 };  // insidious
};

// ─── Cloud texture (loaded once) ─────────────────────────────────────────────

let _cloudTex: THREE.Texture | null = null;
export const getCloudTex = () => {
  if (!_cloudTex) _cloudTex = new THREE.TextureLoader().load('/textures/earth_clouds.png');
  return _cloudTex;
};

// ─── Spinning planet mesh ─────────────────────────────────────────────────────

export const PLANET_SPEED = 0.18;

const PlanetMesh = ({ texture }: { texture: THREE.Texture | null }) => {
  const ref = useRef<THREE.Mesh>(null);
  useFrame((_, dt) => { if (ref.current) ref.current.rotation.y += dt * PLANET_SPEED; });
  return (
    <mesh ref={ref}>
      <icosahedronGeometry args={[1, 3]} />
      <meshStandardMaterial map={texture ?? undefined} color={texture ? undefined : "#1a3a2a"} />
    </mesh>
  );
};

// ─── Cloud layer mesh ─────────────────────────────────────────────────────────

const CloudMesh = ({ config }: { config: CloudConfig }) => {
  const ref = useRef<THREE.Mesh>(null);
  useFrame((_, dt) => { if (ref.current) ref.current.rotation.y += dt * PLANET_SPEED * config.speedMult; });
  return (
    <mesh ref={ref}>
      <sphereGeometry args={[1.015, 32, 32]} />
      <meshStandardMaterial
        alphaMap={getCloudTex()}
        color={config.color}
        transparent
        opacity={config.opacity}
        depthWrite={false}
      />
    </mesh>
  );
};

// ─── Component ────────────────────────────────────────────────────────────────

interface PlanetGlobeProps { world: World }

const PlanetGlobe = ({ world }: PlanetGlobeProps) => {
  const [texture, setTexture] = useState<THREE.CanvasTexture | null>(null);
  const asteroid = isAsteroid(world);
  const clouds   = cloudConfig(uwpVal(world.uwp.atmosphere));

  useEffect(() => {
    if (asteroid) return;
    const tex = buildTexture(world);
    setTexture(tex);
    return () => tex.dispose();
  }, [world, asteroid]);

  return (
    <div className="w-full aspect-square border border-(--hud-border)" style={{ background: "#020c14" }}>
      {asteroid ? (
        <div className="flex h-full items-center justify-center">
          <span className="font-mono text-[10px] uppercase tracking-widest text-(--hud-text-dim)">Asteroid Belt</span>
        </div>
      ) : (
        <Canvas camera={{ position: [0, 0, 4.17], fov: 45 }}>
          <ambientLight intensity={0.35} />
          <directionalLight position={[4, 3, 5]} intensity={1.2} />
          <PlanetMesh texture={texture} />
          {clouds && <CloudMesh config={clouds} />}
          <OrbitControls enableZoom={false} enablePan={false} />
        </Canvas>
      )}
    </div>
  );
};

export default PlanetGlobe;
