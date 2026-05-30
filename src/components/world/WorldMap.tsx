"use client";

import { useMemo, useRef } from "react";
import type { World } from "../../types";
import {
  RENDER_SIZE,
  LAND_BY_ATMO,
  buildHexGrid, assignTerrain, terrainColor, hexPts, svgDimensions, uwpVal,
} from "../../lib/worldMap";
import type { Terrain } from "../../lib/worldMap";

const TERRAIN_LABELS: Record<Terrain, string> = {
  vacuum: "Vacuum", land: "Land", ocean: "Ocean", fluid: "Fluid Ocean",
  ice: "Ice", frozen: "Frozen", desert: "Desert", baked: "Baked Lands", lava: "Lava",
};

const TERRAIN_ORDER: Terrain[] = ["vacuum", "land", "ocean", "fluid", "ice", "frozen", "desert", "baked", "lava"];

interface WorldMapProps { world: World }

const WorldMap = ({ world }: WorldMapProps) => {
  const svgRef  = useRef<SVGSVGElement>(null);
  const realSize = uwpVal(world.uwp.size);
  const S = RENDER_SIZE;
  const { svgW, svgH } = svgDimensions(S);

  const baseHexes = useMemo(() => buildHexGrid(S, 0, 0), []);
  const hexes     = useMemo(() => {
    if (realSize === 0) return [];
    return assignTerrain(baseHexes, world, svgH);
  }, [baseHexes, world, realSize, svgH]);

  const atmoV    = uwpVal(world.uwp.atmosphere);
  const landColor = LAND_BY_ATMO[atmoV] ?? "#2a5818";
  const tColor    = (t: Terrain) => terrainColor(t, landColor);

  const presentTerrains = useMemo(() => {
    const seen = new Set<Terrain>();
    hexes.forEach(h => seen.add(h.terrain));
    return TERRAIN_ORDER.filter(t => seen.has(t));
  }, [hexes]);

  const triggerDownload = (blob: Blob, filename: string) => {
    const url = URL.createObjectURL(blob);
    const a   = document.createElement("a");
    a.href = url; a.download = filename; a.click();
    URL.revokeObjectURL(url);
  };

  const downloadSVG = () => {
    const el = svgRef.current;
    if (!el) return;
    const data = new XMLSerializer().serializeToString(el);
    triggerDownload(new Blob([data], { type: "image/svg+xml" }), `${world.name.replace(/\s+/g, "_")}.svg`);
  };

  const downloadPNG = () => {
    const el = svgRef.current;
    if (!el) return;
    const data = new XMLSerializer().serializeToString(el);
    const url  = URL.createObjectURL(new Blob([data], { type: "image/svg+xml" }));
    const img  = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = svgW * 3; canvas.height = svgH * 3;
      canvas.getContext("2d")!.drawImage(img, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(url);
      canvas.toBlob(b => { if (b) triggerDownload(b, `${world.name.replace(/\s+/g, "_")}.png`); }, "image/png");
    };
    img.src = url;
  };

  if (realSize === 0) {
    return <div className="font-mono text-xs text-(--hud-text-dim) py-2">No world map — asteroid / planetoid belt</div>;
  }

  return (
    <div className="w-full flex flex-col gap-1.5">
      <svg
        ref={svgRef}
        viewBox={`0 0 ${svgW} ${svgH}`}
        className="w-full border border-(--hud-border)"
        style={{ display: "block", background: "#020c14" }}
      >
        {hexes.map((h, i) => (
          <polygon key={i} points={hexPts(h.left, h.top)} fill={tColor(h.terrain)} stroke="#000" strokeWidth={0.8} />
        ))}
      </svg>

      <div className="flex items-center justify-between gap-2">
        <div className="flex flex-wrap gap-x-3 gap-y-1">
          {presentTerrains.map(t => (
            <div key={t} className="flex items-center gap-1">
              <span className="inline-block w-2.5 h-2.5 shrink-0 border border-black/40" style={{ background: tColor(t) }} />
              <span className="font-mono text-[9px] uppercase tracking-wider text-(--hud-text-dim)">{TERRAIN_LABELS[t]}</span>
            </div>
          ))}
        </div>
        <div className="flex gap-2 shrink-0">
          <button onClick={downloadSVG} className="font-mono text-[9px] uppercase tracking-wider text-(--hud-text-dim) hover:text-(--hud-accent) transition-colors">SVG</button>
          <button onClick={downloadPNG} className="font-mono text-[9px] uppercase tracking-wider text-(--hud-text-dim) hover:text-(--hud-accent) transition-colors">PNG</button>
        </div>
      </div>
    </div>
  );
};

export default WorldMap;
