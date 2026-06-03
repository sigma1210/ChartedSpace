"use client";

import { useMemo, useRef } from "react";
import type { World } from "../../types";
import {
  LAND_BY_ATMO,
  buildDisplayHexes, buildHexGrid, buildWorldMapOverlays, assignTerrain, terrainColor, hexPts, svgDimensions, uwpVal,
} from "../../lib/worldMap";
import type { Terrain, TerrainFeature } from "../../lib/worldMap";

const MAP_BG = "#020c14";

const TERRAIN_LABELS: Record<Terrain, string> = {
  vacuum: "Vacuum", land: "Land", rough: "Rough", woods: "Woods", swamp: "Swamp",
  marsh: "Marsh", lake: "Lake", ocean: "Ocean", oceanDepth: "Ocean Depth",
  oceanAbyss: "Ocean Abyss", fluid: "Fluid Ocean",
  ice: "Ice", frozen: "Frozen", desert: "Desert", baked: "Baked Lands", lava: "Lava",
  wasteland: "Wasteland", exotic: "Exotic",
};

const TERRAIN_ORDER: Terrain[] = [
  "vacuum", "land", "rough", "woods", "swamp", "marsh", "lake", "ocean", "oceanDepth",
  "oceanAbyss", "fluid", "ice", "frozen", "desert", "wasteland", "exotic", "baked", "lava",
];

const FEATURE_LABELS: Record<TerrainFeature, string> = {
  mountain: "Mountain",
  island: "Island",
  crater: "Crater",
  volcano: "Volcano",
  chasm: "Chasm",
  precipice: "Precipice",
  resource: "Resource",
  mine: "Mine",
  oil: "Oil",
  starport: "Starport",
  town: "Town",
  city: "City",
  suburb: "Suburb",
};

const FEATURE_ORDER: TerrainFeature[] = [
  "mountain", "island", "crater", "volcano", "chasm", "precipice", "resource", "mine", "oil",
  "starport", "city", "town", "suburb",
];

interface WorldMapProps { world: World }

const WorldMap = ({ world }: WorldMapProps) => {
  const svgRef  = useRef<SVGSVGElement>(null);
  const realSize = uwpVal(world.uwp.size);
  const S = realSize;
  const { svgW, svgH } = svgDimensions(S);

  const baseHexes = useMemo(() => buildHexGrid(S, 0, 0), [S]);
  const assignedHexes = useMemo(() => {
    if (realSize === 0) return [];
    return assignTerrain(baseHexes, world, svgH);
  }, [baseHexes, world, realSize, svgH]);
  const hexes = useMemo(() => buildDisplayHexes(assignedHexes, S), [assignedHexes, S]);
  const overlays = useMemo(() => buildWorldMapOverlays(assignedHexes, S), [assignedHexes, S]);

  const atmoV    = uwpVal(world.uwp.atmosphere);
  const landColor = LAND_BY_ATMO[atmoV] ?? "#2a5818";
  const tColor    = (t: Terrain) => terrainColor(t, landColor);

  const presentTerrains = useMemo(() => {
    const seen = new Set<Terrain>();
    hexes.forEach(h => seen.add(h.terrain));
    return TERRAIN_ORDER.filter(t => seen.has(t));
  }, [hexes]);

  const presentFeatures = useMemo(() => {
    const seen = new Set<TerrainFeature>();
    hexes.forEach(h => h.features.forEach((feature) => seen.add(feature)));
    return FEATURE_ORDER.filter((feature) => seen.has(feature));
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
        style={{ display: "block", background: MAP_BG }}
      >
        {hexes.map((h, i) => (
          <polygon key={i} points={hexPts(h.left, h.top)} fill={tColor(h.terrain)} stroke="#000" strokeWidth={0.8} />
        ))}
        {hexes.map((h, i) => h.features.includes("island") && (
          <circle
            key={`island-${i}`}
            cx={h.left + 16}
            cy={h.top + 17}
            r={4.5}
            fill={LAND_BY_ATMO[atmoV] ?? "#2a5818"}
            stroke="#001018"
            strokeWidth={1}
          />
        ))}
        {hexes.map((h, i) => h.features.includes("mountain") && (
          <path
            key={`mountain-${i}`}
            d={`M ${h.left + 6} ${h.top + 25} L ${h.left + 15} ${h.top + 9} L ${h.left + 22} ${h.top + 25} M ${h.left + 13} ${h.top + 17} L ${h.left + 18} ${h.top + 25}`}
            fill="none"
            stroke="#000000"
            strokeWidth={1.8}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        ))}
        {hexes.map((h, i) => h.features.includes("crater") && (
          <g key={`crater-${i}`}>
            <ellipse
              cx={h.left + 16}
              cy={h.top + 17}
              rx={7}
              ry={4.8}
              fill="none"
              stroke="#000000"
              strokeWidth={1.4}
            />
            <path
              d={`M ${h.left + 10.5} ${h.top + 16.5} Q ${h.left + 16} ${h.top + 20.5} ${h.left + 21.5} ${h.top + 16.5}`}
              fill="none"
              stroke="#000000"
              strokeWidth={0.9}
              strokeLinecap="round"
            />
          </g>
        ))}
        {hexes.map((h, i) => h.features.includes("volcano") && (
          <g key={`volcano-${i}`}>
            <path
              d={`M ${h.left + 7} ${h.top + 25} L ${h.left + 16} ${h.top + 8} L ${h.left + 25} ${h.top + 25} Z`}
              fill="#1a0804"
              stroke="#000000"
              strokeWidth={1.1}
              strokeLinejoin="round"
            />
            <path
              d={`M ${h.left + 13} ${h.top + 13} L ${h.left + 16} ${h.top + 8} L ${h.left + 19} ${h.top + 13}`}
              fill="none"
              stroke="#ff5a1f"
              strokeWidth={1.5}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </g>
        ))}
        {hexes.map((h, i) => h.features.includes("chasm") && (
          <path
            key={`chasm-${i}`}
            d={`M ${h.left + 8} ${h.top + 9} L ${h.left + 13} ${h.top + 15} L ${h.left + 11} ${h.top + 20} L ${h.left + 18} ${h.top + 25} L ${h.left + 16} ${h.top + 31} L ${h.left + 23} ${h.top + 35}`}
            fill="none"
            stroke="#000000"
            strokeWidth={1.7}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        ))}
        {hexes.map((h, i) => h.features.includes("precipice") && (
          <path
            key={`precipice-${i}`}
            d={`M ${h.left + 8} ${h.top + 12} L ${h.left + 24} ${h.top + 12} M ${h.left + 11} ${h.top + 12} L ${h.left + 8} ${h.top + 19} M ${h.left + 16} ${h.top + 12} L ${h.left + 13} ${h.top + 22} M ${h.left + 21} ${h.top + 12} L ${h.left + 18} ${h.top + 19}`}
            fill="none"
            stroke="#000000"
            strokeWidth={1.5}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        ))}
        {hexes.map((h, i) => h.features.includes("resource") && (
          <path
            key={`resource-${i}`}
            d={`M ${h.left + 16} ${h.top + 9} L ${h.left + 22} ${h.top + 17} L ${h.left + 16} ${h.top + 25} L ${h.left + 10} ${h.top + 17} Z`}
            fill="#ffd166"
            stroke="#000000"
            strokeWidth={1.1}
            strokeLinejoin="round"
          />
        ))}
        {hexes.map((h, i) => h.features.includes("mine") && (
          <g key={`mine-${i}`}>
            <path
              d={`M ${h.left + 9} ${h.top + 24} L ${h.left + 22} ${h.top + 11} M ${h.left + 18} ${h.top + 10} Q ${h.left + 23} ${h.top + 10} ${h.left + 25} ${h.top + 15}`}
              fill="none"
              stroke="#000000"
              strokeWidth={1.6}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path
              d={`M ${h.left + 12} ${h.top + 12} L ${h.left + 23} ${h.top + 23}`}
              fill="none"
              stroke="#000000"
              strokeWidth={1.3}
              strokeLinecap="round"
            />
          </g>
        ))}
        {hexes.map((h, i) => h.features.includes("oil") && (
          <path
            key={`oil-${i}`}
            d={`M ${h.left + 16} ${h.top + 8} C ${h.left + 22} ${h.top + 16} ${h.left + 22} ${h.top + 25} ${h.left + 16} ${h.top + 27} C ${h.left + 10} ${h.top + 25} ${h.left + 10} ${h.top + 16} ${h.left + 16} ${h.top + 8} Z`}
            fill="#050505"
            stroke="#1f9bd1"
            strokeWidth={1}
          />
        ))}
        {hexes.map((h, i) => h.features.includes("starport") && (
          <g key={`starport-${i}`}>
            <circle
              cx={h.left + 16}
              cy={h.top + 17}
              r={7}
              fill="#020c14"
              stroke="#ffffff"
              strokeWidth={1.5}
            />
            <path
              d={`M ${h.left + 16} ${h.top + 10} L ${h.left + 16} ${h.top + 24} M ${h.left + 9} ${h.top + 17} L ${h.left + 23} ${h.top + 17}`}
              stroke="#ffffff"
              strokeWidth={1.4}
              strokeLinecap="round"
            />
          </g>
        ))}
        {hexes.map((h, i) => h.features.includes("city") && (
          <rect
            key={`city-${i}`}
            x={h.left + 10}
            y={h.top + 11}
            width={12}
            height={12}
            fill="#111111"
            stroke="#ffffff"
            strokeWidth={1}
          />
        ))}
        {hexes.map((h, i) => h.features.includes("town") && (
          <circle
            key={`town-${i}`}
            cx={h.left + 16}
            cy={h.top + 17}
            r={4.5}
            fill="#111111"
            stroke="#ffffff"
            strokeWidth={0.9}
          />
        ))}
        {hexes.map((h, i) => h.features.includes("suburb") && (
          <circle
            key={`suburb-${i}`}
            cx={h.left + 16}
            cy={h.top + 17}
            r={4}
            fill="none"
            stroke="#ffffff"
            strokeWidth={1.1}
          />
        ))}
        {overlays.map((overlay, i) => (
          <polygon
            key={`overlay-${i}`}
            points={overlay.points.map((p) => `${p.x},${p.y}`).join(" ")}
            fill={MAP_BG}
            stroke="none"
          />
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
          {presentFeatures.map((feature) => (
            <div key={feature} className="flex items-center gap-1">
              <span className="inline-block w-2.5 h-2.5 shrink-0 border border-(--hud-border) bg-(--hud-text-dim)" />
              <span className="font-mono text-[9px] uppercase tracking-wider text-(--hud-text-dim)">{FEATURE_LABELS[feature]}</span>
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
