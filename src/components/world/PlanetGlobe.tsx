"use client";

import { useEffect, useMemo, useRef } from "react";
import { Canvas, useFrame, type ThreeEvent } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import * as THREE from "three";
import type { World } from "../../types";
import {
  LAND_BY_ATMO,
  buildHexGrid, assignTerrain, terrainColor, svgDimensions, uwpVal, isAsteroid, visibleFeatures,
} from "../../lib/worldMap";

// ─── Texture generation ───────────────────────────────────────────────────────

const TEX_W = 1024;
const TEX_H = 512;

type Rgb = { r: number; g: number; b: number };

const TEXTURE_SAMPLE_OFFSETS: Array<[number, number, number]> = [
  [0, 0, 2],
  [0.0045, 0, 1],
  [-0.0045, 0, 1],
  [0, 0.006, 1],
  [0, -0.006, 1],
  [0.0035, 0.004, 1],
  [-0.0035, -0.004, 1],
];

const clamp01 = (value: number) => Math.max(0, Math.min(1, value));

const wrap01 = (value: number) => ((value % 1) + 1) % 1;

const textureSeed = (world: World): number => {
  let hash = 0x811c9dc5;
  const key = `${world.hex}:${world.name}`;
  for (let i = 0; i < key.length; i++) {
    hash ^= key.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
};

const stringSeed = (key: string): number => {
  let hash = 0x811c9dc5;
  for (let i = 0; i < key.length; i++) {
    hash ^= key.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
};

const hexToRgb = (color: string): Rgb => ({
  r: parseInt(color.slice(1, 3), 16),
  g: parseInt(color.slice(3, 5), 16),
  b: parseInt(color.slice(5, 7), 16),
});

const drawWrapped = (
  ctx: CanvasRenderingContext2D,
  x: number,
  draw: (wrappedX: number) => void,
) => {
  draw(x);
  if (x < 24) draw(x + TEX_W);
  if (x > TEX_W - 24) draw(x - TEX_W);
};

export const buildTexture = (world: World): THREE.CanvasTexture => {
  const S = Math.max(1, uwpVal(world.uwp.size));
  const { svgH } = svgDimensions(S);

  const baseHexes = buildHexGrid(S, 0, 0);
  const hexes     = assignTerrain(baseHexes, world, svgH);
  const atmoV     = uwpVal(world.uwp.atmosphere);
  const landColor = LAND_BY_ATMO[atmoV] ?? "#2a5818";
  const maxRow = Math.max(...hexes.map((hex) => hex.rowNumber));
  const rows = Array.from({ length: maxRow + 1 }, (_, rowNumber) =>
    hexes
      .filter((hex) => hex.rowNumber === rowNumber)
      .sort((a, b) => a.columnNumber - b.columnNumber),
  );
  const polarNorth = rows[0]?.[Math.floor((rows[0]?.length ?? 1) / 2)] ?? hexes[0];
  const polarSouth = rows[maxRow]?.[Math.floor((rows[maxRow]?.length ?? 1) / 2)] ?? hexes[hexes.length - 1];
  const seed = textureSeed(world) / 4294967296;

  const sampleTerrain = (lonT: number, latT: number): Rgb => {
    const lon = wrap01(lonT);
    const lat = clamp01(latT);
    const poleDamp = Math.sin(Math.PI * lat);
    const lonWarp = (
      Math.sin((lat * 8.7 + lon * 3.1 + seed * 9.3) * Math.PI * 2) +
      Math.sin((lat * 17.2 - lon * 5.6 + seed * 4.1) * Math.PI * 2) * 0.55
    ) * 0.0065 * poleDamp;
    const latWarp = (
      Math.sin((lon * 10.4 + lat * 2.3 + seed * 7.7) * Math.PI * 2) +
      Math.sin((lon * 21.1 - lat * 4.8 + seed * 2.9) * Math.PI * 2) * 0.45
    ) * 0.0045 * poleDamp;
    const warpedLon = wrap01(lon + lonWarp);
    const warpedLat = clamp01(lat + latWarp);
    const rowIndex = Math.max(0, Math.min(maxRow, Math.round(warpedLat * maxRow)));
    const row = rows[rowIndex];
    const sampleHex = row.length > 0
      ? row[Math.min(row.length - 1, Math.floor(warpedLon * row.length))]
      : warpedLat < 0.5 ? polarNorth : polarSouth;
    return hexToRgb(terrainColor(sampleHex.terrain, landColor));
  };

  const canvas  = document.createElement("canvas");
  canvas.width  = TEX_W;
  canvas.height = TEX_H;
  const ctx = canvas.getContext("2d")!;
  const img = ctx.createImageData(TEX_W, TEX_H);
  const data = img.data;

  for (let py = 0; py < TEX_H; py++) {
    const latT = py / (TEX_H - 1);
    for (let px = 0; px < TEX_W; px++) {
      const lonT = px / TEX_W;
      let r = 0;
      let g = 0;
      let b = 0;
      let weight = 0;

      TEXTURE_SAMPLE_OFFSETS.forEach(([dx, dy, sampleWeight]) => {
        const color = sampleTerrain(lonT + dx, latT + dy);
        r += color.r * sampleWeight;
        g += color.g * sampleWeight;
        b += color.b * sampleWeight;
        weight += sampleWeight;
      });

      const idx = (py * TEX_W + px) * 4;
      data[idx] = Math.round(r / weight);
      data[idx + 1] = Math.round(g / weight);
      data[idx + 2] = Math.round(b / weight);
      data[idx + 3] = 255;
    }
  }

  ctx.putImageData(img, 0, 0);

  hexes.forEach((hex) => {
    const row = rows[hex.rowNumber];
    if (!row || row.length === 0 || hex.features.length === 0) return;
    const features = visibleFeatures(hex);
    if (features.length === 0) return;

    const rowIndex = row.findIndex((rowHex) => rowHex.columnNumber === hex.columnNumber);
    if (rowIndex < 0) return;

    const x = ((rowIndex + 0.5) / row.length) * TEX_W;
    const y = (hex.rowNumber / Math.max(1, maxRow)) * (TEX_H - 1);

    if (features.includes("island")) {
      drawWrapped(ctx, x, (wrappedX) => {
        ctx.beginPath();
        ctx.arc(wrappedX, y, 3.6, 0, Math.PI * 2);
        ctx.fillStyle = landColor;
        ctx.fill();
        ctx.strokeStyle = "rgba(2,12,20,0.75)";
        ctx.lineWidth = 0.8;
        ctx.stroke();
      });
    }

    if (features.includes("mountain")) {
      drawWrapped(ctx, x, (wrappedX) => {
        ctx.beginPath();
        ctx.moveTo(wrappedX - 4.2, y + 3.8);
        ctx.lineTo(wrappedX - 0.8, y - 4.2);
        ctx.lineTo(wrappedX + 4.2, y + 3.8);
        ctx.moveTo(wrappedX - 0.8, y - 4.2);
        ctx.lineTo(wrappedX + 1.6, y + 3.8);
        ctx.strokeStyle = "rgba(0,0,0,0.85)";
        ctx.lineWidth = 1.2;
        ctx.lineCap = "round";
        ctx.lineJoin = "round";
        ctx.stroke();
      });
    }

    if (features.includes("crater")) {
      drawWrapped(ctx, x, (wrappedX) => {
        ctx.beginPath();
        ctx.ellipse(wrappedX, y, 4.4, 3.1, 0.15, 0, Math.PI * 2);
        ctx.strokeStyle = "rgba(0,0,0,0.82)";
        ctx.lineWidth = 1.1;
        ctx.stroke();

        ctx.beginPath();
        ctx.arc(wrappedX + 1.1, y - 0.4, 1.4, 0, Math.PI * 2);
        ctx.strokeStyle = "rgba(255,255,255,0.18)";
        ctx.lineWidth = 0.7;
        ctx.stroke();
      });
    }

    if (features.includes("volcano")) {
      drawWrapped(ctx, x, (wrappedX) => {
        ctx.beginPath();
        ctx.moveTo(wrappedX - 4.7, y + 4);
        ctx.lineTo(wrappedX, y - 5);
        ctx.lineTo(wrappedX + 4.7, y + 4);
        ctx.closePath();
        ctx.fillStyle = "rgba(18,6,3,0.95)";
        ctx.fill();
        ctx.strokeStyle = "rgba(0,0,0,0.9)";
        ctx.lineWidth = 0.9;
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(wrappedX - 1.5, y - 1.4);
        ctx.lineTo(wrappedX, y - 5);
        ctx.lineTo(wrappedX + 1.5, y - 1.4);
        ctx.strokeStyle = "rgba(255,86,24,0.9)";
        ctx.lineWidth = 1.1;
        ctx.lineCap = "round";
        ctx.lineJoin = "round";
        ctx.stroke();
      });
    }

    if (features.includes("chasm")) {
      drawWrapped(ctx, x, (wrappedX) => {
        ctx.beginPath();
        ctx.moveTo(wrappedX - 4, y - 5);
        ctx.lineTo(wrappedX - 1.5, y - 1.5);
        ctx.lineTo(wrappedX - 2.8, y + 1.2);
        ctx.lineTo(wrappedX + 1.8, y + 4.8);
        ctx.lineTo(wrappedX + 0.8, y + 7.2);
        ctx.strokeStyle = "rgba(0,0,0,0.86)";
        ctx.lineWidth = 1.25;
        ctx.lineCap = "round";
        ctx.lineJoin = "round";
        ctx.stroke();
      });
    }

    if (features.includes("precipice")) {
      drawWrapped(ctx, x, (wrappedX) => {
        ctx.beginPath();
        ctx.moveTo(wrappedX - 4.8, y - 3.6);
        ctx.lineTo(wrappedX + 4.8, y - 3.6);
        ctx.moveTo(wrappedX - 3.2, y - 3.2);
        ctx.lineTo(wrappedX - 4.4, y + 1.2);
        ctx.moveTo(wrappedX, y - 3.2);
        ctx.lineTo(wrappedX - 1.2, y + 2.8);
        ctx.moveTo(wrappedX + 3.2, y - 3.2);
        ctx.lineTo(wrappedX + 2, y + 1.2);
        ctx.strokeStyle = "rgba(0,0,0,0.86)";
        ctx.lineWidth = 1.1;
        ctx.lineCap = "round";
        ctx.lineJoin = "round";
        ctx.stroke();
      });
    }

    if (features.includes("resource")) {
      drawWrapped(ctx, x, (wrappedX) => {
        ctx.beginPath();
        ctx.moveTo(wrappedX, y - 4.5);
        ctx.lineTo(wrappedX + 4, y);
        ctx.lineTo(wrappedX, y + 4.5);
        ctx.lineTo(wrappedX - 4, y);
        ctx.closePath();
        ctx.fillStyle = "rgba(255,209,102,0.95)";
        ctx.fill();
        ctx.strokeStyle = "rgba(0,0,0,0.86)";
        ctx.lineWidth = 0.9;
        ctx.stroke();
      });
    }

    if (features.includes("mine")) {
      drawWrapped(ctx, x, (wrappedX) => {
        ctx.beginPath();
        ctx.moveTo(wrappedX - 4.2, y + 4.5);
        ctx.lineTo(wrappedX + 3.8, y - 4.5);
        ctx.moveTo(wrappedX - 2.6, y - 3.8);
        ctx.lineTo(wrappedX + 4.4, y + 3.6);
        ctx.strokeStyle = "rgba(0,0,0,0.9)";
        ctx.lineWidth = 1.15;
        ctx.lineCap = "round";
        ctx.lineJoin = "round";
        ctx.stroke();
      });
    }

    if (features.includes("oil")) {
      drawWrapped(ctx, x, (wrappedX) => {
        ctx.beginPath();
        ctx.moveTo(wrappedX, y - 5);
        ctx.bezierCurveTo(wrappedX + 4.2, y, wrappedX + 3.6, y + 5, wrappedX, y + 5.8);
        ctx.bezierCurveTo(wrappedX - 3.6, y + 5, wrappedX - 4.2, y, wrappedX, y - 5);
        ctx.closePath();
        ctx.fillStyle = "rgba(3,3,3,0.92)";
        ctx.fill();
        ctx.strokeStyle = "rgba(38,166,220,0.8)";
        ctx.lineWidth = 0.75;
        ctx.stroke();
      });
    }

    if (features.includes("starport")) {
      drawWrapped(ctx, x, (wrappedX) => {
        ctx.beginPath();
        ctx.arc(wrappedX, y, 4.8, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(2,12,20,0.92)";
        ctx.fill();
        ctx.strokeStyle = "rgba(255,255,255,0.95)";
        ctx.lineWidth = 1;
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(wrappedX, y - 4.1);
        ctx.lineTo(wrappedX, y + 4.1);
        ctx.moveTo(wrappedX - 4.1, y);
        ctx.lineTo(wrappedX + 4.1, y);
        ctx.strokeStyle = "rgba(255,255,255,0.95)";
        ctx.lineWidth = 0.9;
        ctx.lineCap = "round";
        ctx.stroke();
      });
    }

    if (features.includes("city")) {
      drawWrapped(ctx, x, (wrappedX) => {
        ctx.fillStyle = "rgba(6,6,6,0.94)";
        ctx.fillRect(wrappedX - 3.8, y - 3.8, 7.6, 7.6);
        ctx.strokeStyle = "rgba(255,255,255,0.78)";
        ctx.lineWidth = 0.75;
        ctx.strokeRect(wrappedX - 3.8, y - 3.8, 7.6, 7.6);
      });
    }

    if (features.includes("town")) {
      drawWrapped(ctx, x, (wrappedX) => {
        ctx.beginPath();
        ctx.arc(wrappedX, y, 3.2, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(6,6,6,0.92)";
        ctx.fill();
        ctx.strokeStyle = "rgba(255,255,255,0.75)";
        ctx.lineWidth = 0.65;
        ctx.stroke();
      });
    }

    if (features.includes("suburb")) {
      drawWrapped(ctx, x, (wrappedX) => {
        ctx.beginPath();
        ctx.arc(wrappedX, y, 3, 0, Math.PI * 2);
        ctx.strokeStyle = "rgba(255,255,255,0.74)";
        ctx.lineWidth = 0.8;
        ctx.stroke();
      });
    }

    if (features.includes("rural")) {
      drawWrapped(ctx, x, (wrappedX) => {
        ctx.beginPath();
        ctx.moveTo(wrappedX - 4, y + 3.5);
        ctx.lineTo(wrappedX, y - 3.8);
        ctx.lineTo(wrappedX + 4, y + 3.5);
        ctx.moveTo(wrappedX - 2.4, y + 3.5);
        ctx.lineTo(wrappedX - 2.4, y + 6);
        ctx.lineTo(wrappedX + 2.4, y + 6);
        ctx.lineTo(wrappedX + 2.4, y + 3.5);
        ctx.strokeStyle = "rgba(0,0,0,0.82)";
        ctx.lineWidth = 0.9;
        ctx.lineCap = "round";
        ctx.lineJoin = "round";
        ctx.stroke();
      });
    }

    if (features.includes("crop")) {
      drawWrapped(ctx, x, (wrappedX) => {
        ctx.beginPath();
        for (let line = -3; line <= 3; line += 3) {
          ctx.moveTo(wrappedX - 4.5, y + line);
          ctx.lineTo(wrappedX + 4.5, y + line);
        }
        ctx.strokeStyle = "rgba(0,0,0,0.72)";
        ctx.lineWidth = 0.7;
        ctx.lineCap = "round";
        ctx.stroke();
      });
    }

    if (features.includes("domedCity")) {
      drawWrapped(ctx, x, (wrappedX) => {
        ctx.beginPath();
        ctx.arc(wrappedX, y + 2.8, 4.6, Math.PI, Math.PI * 2);
        ctx.lineTo(wrappedX + 4.6, y + 4.2);
        ctx.lineTo(wrappedX - 4.6, y + 4.2);
        ctx.closePath();
        ctx.fillStyle = "rgba(6,6,6,0.92)";
        ctx.fill();
        ctx.strokeStyle = "rgba(255,255,255,0.78)";
        ctx.lineWidth = 0.8;
        ctx.stroke();
      });
    }

    if (features.includes("arcology")) {
      drawWrapped(ctx, x, (wrappedX) => {
        ctx.beginPath();
        ctx.moveTo(wrappedX, y - 5.4);
        ctx.lineTo(wrappedX + 5, y + 5);
        ctx.lineTo(wrappedX - 5, y + 5);
        ctx.closePath();
        ctx.fillStyle = "rgba(6,6,6,0.92)";
        ctx.fill();
        ctx.strokeStyle = "rgba(255,255,255,0.78)";
        ctx.lineWidth = 0.8;
        ctx.stroke();
      });
    }

    if (features.includes("nobleEstate")) {
      drawWrapped(ctx, x, (wrappedX) => {
        ctx.beginPath();
        for (let point = 0; point < 10; point++) {
          const radius = point % 2 === 0 ? 5 : 2.4;
          const angle = -Math.PI / 2 + (point * Math.PI) / 5;
          const px = wrappedX + Math.cos(angle) * radius;
          const py = y + Math.sin(angle) * radius;
          if (point === 0) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
        }
        ctx.closePath();
        ctx.fillStyle = "rgba(255,209,102,0.9)";
        ctx.fill();
        ctx.strokeStyle = "rgba(0,0,0,0.8)";
        ctx.lineWidth = 0.75;
        ctx.stroke();
      });
    }

    if (features.includes("penalSettlement")) {
      drawWrapped(ctx, x, (wrappedX) => {
        ctx.strokeStyle = "rgba(0,0,0,0.86)";
        ctx.lineWidth = 0.9;
        ctx.strokeRect(wrappedX - 4, y - 4, 8, 8);
        ctx.beginPath();
        ctx.moveTo(wrappedX - 1.5, y - 4);
        ctx.lineTo(wrappedX - 1.5, y + 4);
        ctx.moveTo(wrappedX + 1.5, y - 4);
        ctx.lineTo(wrappedX + 1.5, y + 4);
        ctx.stroke();
      });
    }
  });

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.ClampToEdgeWrapping;
  tex.minFilter = THREE.LinearFilter;
  tex.magFilter = THREE.LinearFilter;
  tex.needsUpdate = true;
  return tex;
};

// ─── Cloud layer config by atmosphere/hydrographics code ─────────────────────
// Returns null for airless/trace worlds, otherwise layered cloud settings.

export interface CloudLayerConfig {
  opacity: number;
  color: string;
  speedMult: number;
  radiusMult: number;
  thresholdShift: number;
  scale: number;
}

export interface CloudConfig {
  opacity: number;
  color: string;
  speedMult: number;
  coverage: number;
  shadowOpacity: number;
  layers: CloudLayerConfig[];
}

export interface AtmosphereGlowConfig {
  color: string;
  opacity: number;
  radiusMult: number;
}

export const cloudConfig = (atmo: number, hydro = 5): CloudConfig | null => {
  if (atmo <= 1) return null;

  const hydroV = Math.max(0, Math.min(10, hydro));
  const hydroCoverage = 0.12 + hydroV * 0.055;
  const densityBonus = atmo >= 8 ? 0.12 : atmo >= 6 ? 0.06 : 0;
  const coverage = clamp01(hydroCoverage + densityBonus);

  let base: Pick<CloudConfig, "opacity" | "color" | "speedMult">;
  if (atmo <= 3)       base = { opacity: 0.22, color: "#ffffff", speedMult: 1.12 };
  else if (atmo <= 5)  base = { opacity: 0.36, color: "#ffffff", speedMult: 1.09 };
  else if (atmo <= 7)  base = { opacity: 0.52, color: "#ffffff", speedMult: 1.05 };
  else if (atmo <= 9)  base = { opacity: 0.66, color: "#dde8ee", speedMult: 0.98 };
  else if (atmo === 10) base = { opacity: 0.48, color: "#c8d4e8", speedMult: 1.04 };
  else if (atmo === 11) base = { opacity: 0.74, color: "#e8e0a0", speedMult: 0.92 };
  else                  base = { opacity: 0.78, color: "#c8a870", speedMult: 0.88 };

  return {
    ...base,
    coverage,
    shadowOpacity: Math.min(0.16, 0.035 + coverage * 0.12),
    layers: [
      {
        opacity: base.opacity,
        color: base.color,
        speedMult: base.speedMult,
        radiusMult: 1.015,
        thresholdShift: 0,
        scale: 1,
      },
      {
        opacity: base.opacity * 0.42,
        color: "#ffffff",
        speedMult: base.speedMult * 1.22,
        radiusMult: 1.028,
        thresholdShift: 0.12,
        scale: 1.8,
      },
    ],
  };
};

export const atmosphereGlowConfig = (atmo: number): AtmosphereGlowConfig | null => {
  if (atmo <= 1) return null;
  if (atmo <= 3) return { color: "#b8ddff", opacity: 0.16, radiusMult: 1.045 };
  if (atmo <= 5) return { color: "#a9d7ff", opacity: 0.22, radiusMult: 1.055 };
  if (atmo <= 7) return { color: "#8ecbff", opacity: 0.28, radiusMult: 1.065 };
  if (atmo <= 9) return { color: "#b7d8ee", opacity: 0.34, radiusMult: 1.08 };
  if (atmo === 10) return { color: "#aab8ff", opacity: 0.28, radiusMult: 1.075 };
  if (atmo === 11) return { color: "#ffe28a", opacity: 0.38, radiusMult: 1.09 };
  return { color: "#e0aa66", opacity: 0.42, radiusMult: 1.1 };
};

const CLOUD_TEX_W = 512;
const CLOUD_TEX_H = 256;

const smoothstep = (edge0: number, edge1: number, value: number) => {
  const t = clamp01((value - edge0) / (edge1 - edge0));
  return t * t * (3 - 2 * t);
};

const cloudNoise = (lon: number, lat: number, seed: number, scale: number) => {
  const a = Math.PI * 2;
  const band =
    Math.sin(lon * a * (2.1 * scale) + seed * 6.7 + Math.sin(lat * a * 1.8 + seed) * 1.3) * 0.35 +
    Math.sin(lon * a * (4.4 * scale) - lat * a * 1.7 + seed * 11.3) * 0.24 +
    Math.sin(lon * a * (8.2 * scale) + lat * a * 4.5 + seed * 17.1) * 0.15 +
    Math.sin(lon * a * (15.0 * scale) - lat * a * 7.0 + seed * 23.9) * 0.08;
  const storm =
    Math.sin((Math.cos(lon * a + seed) * 2.4 + Math.sin(lat * a * 2.2 - seed)) * Math.PI) * 0.12;
  return 0.5 + band + storm;
};

export const buildCloudTextureFromKey = (
  seedKey: string,
  config: CloudConfig,
  layer: CloudLayerConfig,
): THREE.CanvasTexture => {
  const seed = stringSeed(seedKey) / 4294967296;
  const canvas = document.createElement("canvas");
  canvas.width = CLOUD_TEX_W;
  canvas.height = CLOUD_TEX_H;
  const ctx = canvas.getContext("2d")!;
  const img = ctx.createImageData(CLOUD_TEX_W, CLOUD_TEX_H);
  const data = img.data;
  const threshold = 0.74 - config.coverage * 0.34 + layer.thresholdShift;

  for (let py = 0; py < CLOUD_TEX_H; py++) {
    const lat = py / (CLOUD_TEX_H - 1);
    const poleFade = Math.pow(Math.sin(Math.PI * lat), 0.33);
    const polarHaze = smoothstep(0.74, 1, Math.abs(lat - 0.5) * 2) * 0.18 * config.coverage;

    for (let px = 0; px < CLOUD_TEX_W; px++) {
      const lon = px / CLOUD_TEX_W;
      const noise = cloudNoise(lon, lat, seed + layer.thresholdShift * 3.1, layer.scale);
      const largeMask = cloudNoise(lon + 0.17, lat + 0.09, seed + 0.43, 0.48);
      const alpha = clamp01(
        smoothstep(threshold, threshold + 0.28, noise + largeMask * 0.2) * poleFade +
        polarHaze,
      );
      const value = Math.round(alpha * 255);
      const idx = (py * CLOUD_TEX_W + px) * 4;
      data[idx] = value;
      data[idx + 1] = value;
      data[idx + 2] = value;
      data[idx + 3] = 255;
    }
  }

  ctx.putImageData(img, 0, 0);
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.ClampToEdgeWrapping;
  tex.minFilter = THREE.LinearFilter;
  tex.magFilter = THREE.LinearFilter;
  tex.needsUpdate = true;
  return tex;
};

export const buildCloudTexture = (
  world: World,
  config: CloudConfig,
  layer: CloudLayerConfig,
): THREE.CanvasTexture => buildCloudTextureFromKey(`${world.hex}:${world.name}`, config, layer);

// ─── Spinning planet mesh ─────────────────────────────────────────────────────

export const PLANET_SPEED = 0.18;

// ─── Cloud layer mesh ─────────────────────────────────────────────────────────

const ATMOSPHERE_VERTEX_SHADER = `
  varying vec3 vNormal;
  varying vec3 vWorldPosition;

  void main() {
    vNormal = normalize(normalMatrix * normal);
    vec4 worldPosition = modelMatrix * vec4(position, 1.0);
    vWorldPosition = worldPosition.xyz;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const ATMOSPHERE_FRAGMENT_SHADER = `
  uniform vec3 glowColor;
  uniform float opacity;
  varying vec3 vNormal;
  varying vec3 vWorldPosition;

  void main() {
    vec3 viewDir = normalize(cameraPosition - vWorldPosition);
    float rim = 1.0 - max(dot(normalize(vNormal), viewDir), 0.0);
    float alpha = pow(rim, 2.1) * opacity;
    gl_FragColor = vec4(glowColor, alpha);
  }
`;

export const AtmosphereGlowMesh = ({
  radius,
  config,
}: {
  radius: number;
  config: AtmosphereGlowConfig;
}) => {
  const uniforms = useMemo(
    () => ({
      glowColor: { value: new THREE.Color(config.color) },
      opacity: { value: config.opacity },
    }),
    [config.color, config.opacity],
  );

  return (
    <mesh>
      <sphereGeometry args={[radius * config.radiusMult, 64, 32]} />
      <shaderMaterial
        uniforms={uniforms}
        vertexShader={ATMOSPHERE_VERTEX_SHADER}
        fragmentShader={ATMOSPHERE_FRAGMENT_SHADER}
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
        side={THREE.BackSide}
      />
    </mesh>
  );
};

export const CloudShadowMesh = ({
  radius,
  layer,
  texture,
  opacity,
}: {
  radius: number;
  layer: CloudLayerConfig;
  texture: THREE.Texture;
  opacity: number;
}) => {
  const ref = useRef<THREE.Mesh>(null);
  useFrame((_, dt) => { if (ref.current) ref.current.rotation.y += dt * PLANET_SPEED * layer.speedMult; });
  return (
    <mesh ref={ref}>
      <sphereGeometry args={[radius * 1.006, 48, 24]} />
      <meshBasicMaterial
        alphaMap={texture}
        color="#05070a"
        transparent
        opacity={opacity}
        depthWrite={false}
        alphaTest={0.02}
      />
    </mesh>
  );
};

export interface WorldGlobeVisualProps {
  world: World;
  radius?: number;
  segments?: [number, number];
  onSurfaceClick?: (event: ThreeEvent<MouseEvent>) => void;
}

export const WorldGlobeVisual = ({
  world,
  radius = 1,
  segments = [64, 32],
  onSurfaceClick,
}: WorldGlobeVisualProps) => {
  const asteroid = isAsteroid(world);
  const atmo = uwpVal(world.uwp.atmosphere);
  const clouds = useMemo(
    () => asteroid ? null : cloudConfig(atmo, uwpVal(world.uwp.hydrographics)),
    [asteroid, atmo, world.uwp.hydrographics],
  );
  const atmosphereGlow = useMemo(
    () => asteroid ? null : atmosphereGlowConfig(atmo),
    [asteroid, atmo],
  );
  const texture = useMemo(
    () => asteroid ? null : buildTexture(world),
    [world, asteroid],
  );
  const cloudRefs = useRef<Array<THREE.Mesh | null>>([]);
  const spinRef = useRef<THREE.Mesh | null>(null);

  useEffect(() => () => texture?.dispose(), [texture]);

  const cloudTextures = useMemo(
    () => clouds ? clouds.layers.map((layer) => buildCloudTexture(world, clouds, layer)) : [],
    [world, clouds],
  );
  useEffect(
    () => () => cloudTextures.forEach((cloudTexture) => cloudTexture.dispose()),
    [cloudTextures],
  );

  useFrame((_, dt) => {
    if (spinRef.current) spinRef.current.rotation.y += dt * PLANET_SPEED;
    if (clouds) {
      clouds.layers.forEach((layer, index) => {
        const cloudRef = cloudRefs.current[index];
        if (cloudRef) cloudRef.rotation.y += dt * PLANET_SPEED * layer.speedMult;
      });
    }
  });

  if (asteroid || !texture) return null;

  return (
    <>
      <mesh
        ref={spinRef}
        onClick={onSurfaceClick}
      >
        <sphereGeometry args={[radius, ...segments]} />
        <meshStandardMaterial map={texture} />
      </mesh>
      {clouds && cloudTextures[0] && (
        <CloudShadowMesh
          radius={radius}
          layer={clouds.layers[0]}
          texture={cloudTextures[0]}
          opacity={clouds.shadowOpacity}
        />
      )}
      {clouds && (
        <>
          {clouds.layers.map((layer, index) => (
            <mesh
              key={`${layer.radiusMult}-${index}`}
              ref={(node) => { cloudRefs.current[index] = node; }}
            >
              <sphereGeometry args={[radius * layer.radiusMult, ...segments]} />
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
      {atmosphereGlow && <AtmosphereGlowMesh radius={radius} config={atmosphereGlow} />}
    </>
  );
};

// ─── Component ────────────────────────────────────────────────────────────────

interface PlanetGlobeProps {
  world: World;
  enableControls?: boolean;
  className?: string;
}

const PlanetGlobe = ({ world, enableControls = true, className = "" }: PlanetGlobeProps) => {
  const asteroid = isAsteroid(world);

  return (
    <div className={`w-full aspect-square border border-(--hud-border) ${className}`} style={{ background: "#020c14" }}>
      {asteroid ? (
        <div className="flex h-full items-center justify-center">
          <span className="font-mono text-[10px] uppercase tracking-widest text-(--hud-text-dim)">Asteroid Belt</span>
        </div>
      ) : (
        <Canvas camera={{ position: [0, 0, 4.17], fov: 45 }}>
          <ambientLight intensity={0.35} />
          <directionalLight position={[4, 3, 5]} intensity={1.2} />
          <WorldGlobeVisual world={world} />
          {enableControls && (
            <OrbitControls enableZoom minDistance={1.8} maxDistance={6} enablePan={false} />
          )}
        </Canvas>
      )}
    </div>
  );
};

export default PlanetGlobe;
