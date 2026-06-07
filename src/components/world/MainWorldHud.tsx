"use client";

import { useEffect, useRef } from "react";
import type { World } from "../../types";
import { isAsteroid, uwpVal } from "../../lib/worldMap";
import { buildCloudTexture, buildTexture, cloudConfig, PLANET_SPEED } from "./PlanetGlobe";

const wrap01 = (value: number) => ((value % 1) + 1) % 1;
const textureTurnsPerSecond = PLANET_SPEED / (Math.PI * 2);
const PREVIEW_CANVAS_SIZE = 352;
const hexToRgb = (color: string) => ({
  r: parseInt(color.slice(1, 3), 16),
  g: parseInt(color.slice(3, 5), 16),
  b: parseInt(color.slice(5, 7), 16),
});

const sampleBilinear = (
  data: Uint8ClampedArray,
  width: number,
  height: number,
  lon: number,
  lat: number,
) => {
  const px = wrap01(lon) * width;
  const py = Math.max(0, Math.min(1, lat)) * (height - 1);
  const x0 = Math.floor(px) % width;
  const x1 = (x0 + 1) % width;
  const y0 = Math.max(0, Math.min(height - 1, Math.floor(py)));
  const y1 = Math.max(0, Math.min(height - 1, y0 + 1));
  const tx = px - Math.floor(px);
  const ty = py - y0;
  const i00 = (y0 * width + x0) * 4;
  const i10 = (y0 * width + x1) * 4;
  const i01 = (y1 * width + x0) * 4;
  const i11 = (y1 * width + x1) * 4;
  const top = 1 - ty;
  const left = 1 - tx;

  return {
    r: (data[i00] * left + data[i10] * tx) * top + (data[i01] * left + data[i11] * tx) * ty,
    g: (data[i00 + 1] * left + data[i10 + 1] * tx) * top + (data[i01 + 1] * left + data[i11 + 1] * tx) * ty,
    b: (data[i00 + 2] * left + data[i10 + 2] * tx) * top + (data[i01 + 2] * left + data[i11 + 2] * tx) * ty,
    a: (data[i00 + 3] * left + data[i10 + 3] * tx) * top + (data[i01 + 3] * left + data[i11 + 3] * tx) * ty,
  };
};

const MainWorldGlobePreview = ({ world }: { world: World }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (isAsteroid(world)) return;

    const surfaceTexture = buildTexture(world);
    const source = surfaceTexture.image as HTMLCanvasElement;
    const sourceCtx = source.getContext("2d");
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");

    if (!sourceCtx || !canvas || !ctx) {
      surfaceTexture.dispose();
      return;
    }

    const clouds = cloudConfig(uwpVal(world.uwp.atmosphere), uwpVal(world.uwp.hydrographics));
    const cloudTextures = clouds
      ? clouds.layers.map((layer) => ({
          layer,
          color: hexToRgb(layer.color),
          texture: buildCloudTexture(world, clouds, layer),
        }))
      : [];
    const cloudData = cloudTextures.map(({ texture }) => {
      const cloudCanvas = texture.image as HTMLCanvasElement;
      return {
        data: cloudCanvas.getContext("2d")?.getImageData(0, 0, cloudCanvas.width, cloudCanvas.height).data,
        width: cloudCanvas.width,
        height: cloudCanvas.height,
      };
    });
    const sourceData = sourceCtx.getImageData(0, 0, source.width, source.height).data;
    const size = canvas.width;
    const center = size / 2;
    const radius = size * 0.42;
    const image = ctx.createImageData(size, size);
    let raf = 0;
    let startTime = 0;

    const draw = (time: number) => {
      if (!startTime) startTime = time;
      const elapsed = (time - startTime) / 1000;
      const pixels = image.data;
      pixels.fill(0);
      const rotation = -elapsed * textureTurnsPerSecond;

      for (let y = 0; y < size; y++) {
        const ny = (y - center) / radius;
        for (let x = 0; x < size; x++) {
          const nx = (x - center) / radius;
          const rr = nx * nx + ny * ny;
          const out = (y * size + x) * 4;

          if (rr > 1) continue;

          const nz = Math.sqrt(1 - rr);
          const lon = wrap01(Math.atan2(nx, nz) / (Math.PI * 2) + 0.5 + rotation);
          const lat = Math.max(0, Math.min(1, 0.5 - Math.asin(ny) / Math.PI));
          const surfaceSample = sampleBilinear(sourceData, source.width, source.height, lon, lat);
          const rim = Math.max(0, Math.min(1, (1 - rr) * 4));
          const light = Math.max(0.28, Math.min(1.08, 0.42 + nz * 0.55 - nx * 0.12 - ny * 0.08));
          let red = surfaceSample.r * light;
          let green = surfaceSample.g * light;
          let blue = surfaceSample.b * light;

          cloudTextures.forEach(({ layer, color }, index) => {
            const cloud = cloudData[index];
            if (!cloud.data) return;

            const cloudLon = wrap01(lon - elapsed * textureTurnsPerSecond * layer.speedMult);
            const cloudSample = sampleBilinear(cloud.data, cloud.width, cloud.height, cloudLon, lat);
            const density = (cloudSample.r / 255) * layer.opacity * 0.95 * nz;

            red = red * (1 - density) + color.r * density;
            green = green * (1 - density) + color.g * density;
            blue = blue * (1 - density) + color.b * density;
          });

          pixels[out] = red;
          pixels[out + 1] = green;
          pixels[out + 2] = blue;
          pixels[out + 3] = Math.floor(255 * Math.min(1, rim));
        }
      }

      ctx.clearRect(0, 0, size, size);
      ctx.putImageData(image, 0, 0);
      raf = requestAnimationFrame(draw);
    };

    raf = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(raf);
      surfaceTexture.dispose();
      cloudTextures.forEach(({ texture }) => texture.dispose());
    };
  }, [world]);

  if (isAsteroid(world)) {
    return (
      <div className="grid aspect-square w-44 place-items-center border border-(--hud-border) bg-[#020c14]">
        <span className="text-[8px] tracking-widest text-(--hud-text-dim)">Asteroid Belt</span>
      </div>
    );
  }

  return (
    <canvas
      ref={canvasRef}
      width={PREVIEW_CANVAS_SIZE}
      height={PREVIEW_CANVAS_SIZE}
      className="aspect-square w-44 border border-(--hud-border) bg-[#020c14]"
    />
  );
};

export const MainWorldHud = ({ world }: { world: World | null }) => {
  if (!world) {
    return (
      <div className="w-48 font-mono text-[8px] uppercase tracking-wider text-(--hud-text-dim)">
        No world selected
      </div>
    );
  }

  return (
    <div className="w-52 font-mono text-[8px] uppercase tracking-wider text-(--hud-text)">
      <div className="mb-1 flex items-center justify-between gap-2 border-b border-(--hud-border) pb-1">
        <span className="truncate text-(--hud-accent)">{world.name}</span>
        <span className="shrink-0 text-(--hud-text-dim)">UPP {world.uwp.raw}</span>
      </div>
      <div className="mx-auto w-44">
        <MainWorldGlobePreview world={world} />
      </div>
    </div>
  );
};
