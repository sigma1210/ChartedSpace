"use client";

import { useEffect, useRef, useState } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import * as THREE from "three";
import type { World } from "../../types";
import {
  RENDER_SIZE, LAND_BY_ATMO,
  buildHexGrid, assignTerrain, terrainColor, svgDimensions, uwpVal,
} from "../../lib/worldMap";

// ─── Texture generation ───────────────────────────────────────────────────────
// Generates an equirectangular texture by Voronoi nearest-neighbor:
// every pixel in the 2:1 map gets the terrain color of its closest hex center.
// A 2D spatial grid cuts the inner loop from 640 to ~30 candidates per pixel.

const TEX_W = 512;
const TEX_H = 256;
const GRID_W = 24;
const GRID_H = 12;

const buildTexture = (world: World): THREE.CanvasTexture => {
  const S = RENDER_SIZE;
  const { svgW, svgH } = svgDimensions(S);

  const baseHexes = buildHexGrid(S, 0, 0);
  const hexes     = assignTerrain(baseHexes, world, svgH);
  const atmoV     = uwpVal(world.uwp.atmosphere);
  const landColor = LAND_BY_ATMO[atmoV] ?? "#2a5818";

  // Pre-parse hex colors and normalized centers
  const centers = hexes.map(h => {
    const col = terrainColor(h.terrain, landColor);
    return {
      nx: (h.left + 16) / svgW,
      ny: (h.top  + 17) / svgH,
      r: parseInt(col.slice(1, 3), 16),
      g: parseInt(col.slice(3, 5), 16),
      b: parseInt(col.slice(5, 7), 16),
    };
  });

  // Spatial grid — each hex inserted into its cell + 8 neighbours
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

// ─── Spinning mesh ────────────────────────────────────────────────────────────

const PlanetMesh = ({ texture }: { texture: THREE.Texture | null }) => {
  const meshRef = useRef<THREE.Mesh>(null);

  useFrame((_, delta) => {
    if (meshRef.current) meshRef.current.rotation.y += delta * 0.18;
  });

  return (
    <mesh ref={meshRef}>
      <icosahedronGeometry args={[1, 3]} />
      <meshStandardMaterial map={texture ?? undefined} color={texture ? undefined : "#1a3a2a"} />
    </mesh>
  );
};

// ─── Component ────────────────────────────────────────────────────────────────

interface PlanetGlobeProps { world: World }

const PlanetGlobe = ({ world }: PlanetGlobeProps) => {
  const [texture, setTexture] = useState<THREE.CanvasTexture | null>(null);

  useEffect(() => {
    const tex = buildTexture(world);
    setTexture(tex);
    return () => tex.dispose();
  }, [world]);

  return (
    <div className="w-full aspect-square border border-(--hud-border)" style={{ background: "#020c14" }}>
      <Canvas camera={{ position: [0, 0, 4.17], fov: 45 }}>
        <ambientLight intensity={0.35} />
        <directionalLight position={[4, 3, 5]} intensity={1.2} />
        <PlanetMesh texture={texture} />
        <OrbitControls enableZoom={false} enablePan={false} />
      </Canvas>
    </div>
  );
};

export default PlanetGlobe;
