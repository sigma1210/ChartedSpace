"use client";

import { useMemo, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { parseStar, type StarColors } from "../../lib/stellar";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const hexToRgb = (hex: string): [number, number, number] => [
  parseInt(hex.slice(1, 3), 16),
  parseInt(hex.slice(3, 5), 16),
  parseInt(hex.slice(5, 7), 16),
];

const rgba = (hex: string, a: number) => {
  const [r, g, b] = hexToRgb(hex);
  return `rgba(${r},${g},${b},${a})`;
};

// ─── Procedural sun texture ───────────────────────────────────────────────────

const buildSunTexture = (colors: StarColors): THREE.CanvasTexture => {
  const W = 512;
  const H = 256;
  const canvas = document.createElement("canvas");
  canvas.width  = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d")!;

  const base = ctx.createRadialGradient(W / 2, H / 2, 0, W / 2, H / 2, W / 2);
  base.addColorStop(0.0, colors.core);
  base.addColorStop(0.3, colors.mid);
  base.addColorStop(0.7, colors.mid);
  base.addColorStop(1.0, colors.limb);
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, W, H);

  // Granulation — convection cell speckles derived from star colors
  const rng = (() => {
    let s = 42;
    return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 0xffffffff; };
  })();
  for (let i = 0; i < 2400; i++) {
    const x = rng() * W;
    const y = rng() * H;
    const r = rng() * 6 + 2;
    const bright = rng() > 0.5;
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, bright ? rgba(colors.core, 0.35) : rgba(colors.limb, 0.25));
    g.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
};

// ─── Glow halo texture ────────────────────────────────────────────────────────

const buildGlowTexture = (glowColor: string): THREE.CanvasTexture => {
  const S = 128;
  const canvas = document.createElement("canvas");
  canvas.width  = S;
  canvas.height = S;
  const ctx = canvas.getContext("2d")!;
  const g = ctx.createRadialGradient(S / 2, S / 2, 0, S / 2, S / 2, S / 2);
  g.addColorStop(0.0, rgba(glowColor, 0.6));
  g.addColorStop(0.3, rgba(glowColor, 0.3));
  g.addColorStop(0.7, rgba(glowColor, 0.08));
  g.addColorStop(1.0, "rgba(0,0,0,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, S, S);
  return new THREE.CanvasTexture(canvas);
};

// ─── Default colors (G2 V — Sol-like fallback) ────────────────────────────────

const DEFAULT_COLORS: StarColors = {
  core: "#fff5a0", mid: "#ffcc00", limb: "#cc2200", glow: "#ff8800",
};

// ─── Scene ────────────────────────────────────────────────────────────────────

const SunScene = ({ colors, scale }: { colors: StarColors; scale: number }) => {
  const mesh    = useRef<THREE.Mesh>(null);
  const sunTex  = useMemo(() => buildSunTexture(colors), [colors]);
  const glowTex = useMemo(() => buildGlowTexture(colors.glow), [colors.glow]);

  const r     = 1.6 * scale;
  const glow1 = 6.4 * scale;
  const glow2 = 4.4 * scale;

  useFrame((_, delta) => {
    if (mesh.current) mesh.current.rotation.y += delta * 0.08;
  });

  return (
    <>
      <sprite scale={[glow1, glow1, 1]}>
        <spriteMaterial map={glowTex} blending={THREE.AdditiveBlending} depthWrite={false} transparent opacity={0.5} />
      </sprite>
      <sprite scale={[glow2, glow2, 1]}>
        <spriteMaterial map={glowTex} blending={THREE.AdditiveBlending} depthWrite={false} transparent opacity={0.7} />
      </sprite>
      <mesh ref={mesh}>
        <sphereGeometry args={[r, 64, 64]} />
        <meshBasicMaterial map={sunTex} toneMapped={false} />
      </mesh>
    </>
  );
};

// ─── Component ────────────────────────────────────────────────────────────────

const StellarView = ({ starStr, scale = 1 }: { starStr: string; scale?: number }) => {
  const colors = useMemo(() => parseStar(starStr)?.colors ?? DEFAULT_COLORS, [starStr]);

  return (
    <div className="w-full aspect-square border border-(--hud-border)" style={{ background: "#020c14" }}>
      <Canvas camera={{ position: [0, 0, 4.5], fov: 45 }}>
        <SunScene colors={colors} scale={scale} />
      </Canvas>
    </div>
  );
};

export default StellarView;
