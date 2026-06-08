"use client";

import { useMemo, useRef } from "react";
import type { World } from "../../types";
import {
  LAND_BY_ATMO,
  assignTerrain,
  buildDisplayHexes,
  buildHexGrid,
  buildWorldMapOverlays,
  hexPts,
  svgDimensions,
  terrainColor,
  uwpVal,
  visibleFeatures,
  type Terrain,
  type TerrainFeature,
} from "../../lib/worldMap";

const MAP_BG = "#020c14";

const TERRAIN_LABELS: Record<Terrain, string> = {
  vacuum: "Vacuum",
  land: "Land",
  rough: "Rough",
  woods: "Woods",
  swamp: "Swamp",
  marsh: "Marsh",
  lake: "Lake",
  ocean: "Ocean",
  oceanDepth: "Ocean Depth",
  oceanAbyss: "Ocean Abyss",
  fluid: "Fluid Ocean",
  ice: "Ice",
  frozen: "Frozen",
  desert: "Desert",
  baked: "Baked Lands",
  lava: "Lava",
  wasteland: "Wasteland",
  exotic: "Exotic",
};

const TERRAIN_ORDER: Terrain[] = [
  "vacuum",
  "land",
  "rough",
  "woods",
  "swamp",
  "marsh",
  "lake",
  "ocean",
  "oceanDepth",
  "oceanAbyss",
  "fluid",
  "ice",
  "frozen",
  "desert",
  "wasteland",
  "exotic",
  "baked",
  "lava",
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
  rural: "Rural",
  crop: "Crop",
  domedCity: "Domed City",
  arcology: "Arcology",
  nobleEstate: "Noble Estate",
  penalSettlement: "Penal Settlement",
};

const FEATURE_ORDER: TerrainFeature[] = [
  "starport",
  "city",
  "town",
  "suburb",
  "rural",
  "crop",
  "domedCity",
  "arcology",
  "nobleEstate",
  "penalSettlement",
  "mine",
  "oil",
  "resource",
  "volcano",
  "chasm",
  "precipice",
  "crater",
  "mountain",
  "island",
];

const filenameFor = (world: World, extension: string) =>
  `${world.name.replace(/[^a-z0-9]+/gi, "_").replace(/^_+|_+$/g, "") || "world"}_map.${extension}`;

const triggerDownload = (blob: Blob, filename: string) => {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
};

const FeatureMark = ({
  feature,
  left,
  top,
}: {
  feature: TerrainFeature;
  left: number;
  top: number;
}) => {
  const cx = left + 16;
  const cy = top + 17;

  switch (feature) {
    case "starport":
      return (
        <g>
          <circle cx={cx} cy={cy} r={7} fill="#020c14" stroke="#ffffff" strokeWidth={1.5} />
          <path d={`M ${cx} ${cy - 7} L ${cx} ${cy + 7} M ${cx - 7} ${cy} L ${cx + 7} ${cy}`} stroke="#ffffff" strokeWidth={1.4} strokeLinecap="round" />
        </g>
      );
    case "city":
      return <rect x={cx - 6} y={cy - 6} width={12} height={12} fill="#111111" stroke="#ffffff" strokeWidth={1} />;
    case "town":
      return <circle cx={cx} cy={cy} r={4.8} fill="#111111" stroke="#ffffff" strokeWidth={1} />;
    case "suburb":
      return <circle cx={cx} cy={cy} r={4.8} fill="none" stroke="#ffffff" strokeWidth={1.2} />;
    case "mountain":
      return <path d={`M ${left + 6} ${top + 25} L ${left + 15} ${top + 9} L ${left + 22} ${top + 25} M ${left + 13} ${top + 17} L ${left + 18} ${top + 25}`} fill="none" stroke="#000000" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />;
    case "island":
      return <circle cx={cx} cy={cy} r={4.5} fill="#5c7052" stroke="#001018" strokeWidth={1} />;
    case "crater":
      return <ellipse cx={cx} cy={cy} rx={7} ry={4.8} fill="none" stroke="#000000" strokeWidth={1.4} />;
    case "volcano":
      return <path d={`M ${left + 7} ${top + 25} L ${cx} ${top + 8} L ${left + 25} ${top + 25} Z`} fill="#1a0804" stroke="#ff5a1f" strokeWidth={1.2} strokeLinejoin="round" />;
    case "chasm":
      return <path d={`M ${left + 8} ${top + 9} L ${left + 13} ${top + 15} L ${left + 11} ${top + 20} L ${left + 18} ${top + 25} L ${left + 16} ${top + 31} L ${left + 23} ${top + 35}`} fill="none" stroke="#000000" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round" />;
    case "precipice":
      return <path d={`M ${left + 8} ${top + 12} L ${left + 24} ${top + 12} M ${left + 11} ${top + 12} L ${left + 8} ${top + 19} M ${cx} ${top + 12} L ${left + 13} ${top + 22} M ${left + 21} ${top + 12} L ${left + 18} ${top + 19}`} fill="none" stroke="#000000" strokeWidth={1.5} strokeLinecap="round" />;
    case "resource":
      return <path d={`M ${cx} ${top + 9} L ${left + 22} ${cy} L ${cx} ${top + 25} L ${left + 10} ${cy} Z`} fill="#ffd166" stroke="#000000" strokeWidth={1.1} strokeLinejoin="round" />;
    case "mine":
      return <path d={`M ${left + 9} ${top + 24} L ${left + 22} ${top + 11} M ${left + 18} ${top + 10} Q ${left + 23} ${top + 10} ${left + 25} ${top + 15}`} fill="none" stroke="#000000" strokeWidth={1.6} strokeLinecap="round" />;
    case "oil":
      return <path d={`M ${cx} ${top + 8} C ${left + 22} ${top + 16} ${left + 22} ${top + 25} ${cx} ${top + 27} C ${left + 10} ${top + 25} ${left + 10} ${top + 16} ${cx} ${top + 8} Z`} fill="#050505" stroke="#1f9bd1" strokeWidth={1} />;
    default:
      return <text x={cx} y={cy + 3} textAnchor="middle" className="fill-white font-mono text-[10px]">{FEATURE_LABELS[feature].slice(0, 1)}</text>;
  }
};

const WorldMap = ({ world }: { world: World }) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const size = uwpVal(world.uwp.size);
  const { svgW, svgH } = svgDimensions(size);

  const baseHexes = useMemo(() => buildHexGrid(size, 0, 0), [size]);
  const assignedHexes = useMemo(() => {
    if (size === 0) return [];
    return assignTerrain(baseHexes, world, svgH);
  }, [baseHexes, size, svgH, world]);
  const hexes = useMemo(() => buildDisplayHexes(assignedHexes, size), [assignedHexes, size]);
  const overlays = useMemo(() => buildWorldMapOverlays(assignedHexes, size), [assignedHexes, size]);

  const atmo = uwpVal(world.uwp.atmosphere);
  const landColor = LAND_BY_ATMO[atmo] ?? "#2a5818";
  const colorForTerrain = (terrain: Terrain) => terrainColor(terrain, landColor);

  const presentTerrains = useMemo(() => {
    const seen = new Set<Terrain>();
    hexes.forEach((hex) => seen.add(hex.terrain));
    return TERRAIN_ORDER.filter((terrain) => seen.has(terrain));
  }, [hexes]);

  const presentFeatures = useMemo(() => {
    const seen = new Set<TerrainFeature>();
    hexes.forEach((hex) => visibleFeatures(hex).forEach((feature) => seen.add(feature)));
    return FEATURE_ORDER.filter((feature) => seen.has(feature));
  }, [hexes]);

  const downloadSVG = () => {
    const el = svgRef.current;
    if (!el) return;
    const data = new XMLSerializer().serializeToString(el);
    triggerDownload(new Blob([data], { type: "image/svg+xml" }), filenameFor(world, "svg"));
  };

  const downloadPNG = () => {
    const el = svgRef.current;
    if (!el) return;

    const data = new XMLSerializer().serializeToString(el);
    const url = URL.createObjectURL(new Blob([data], { type: "image/svg+xml" }));
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      const scale = 3;
      canvas.width = svgW * scale;
      canvas.height = svgH * scale;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        URL.revokeObjectURL(url);
        return;
      }
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(url);
      canvas.toBlob((blob) => {
        if (blob) triggerDownload(blob, filenameFor(world, "png"));
      }, "image/png");
    };
    img.onerror = () => URL.revokeObjectURL(url);
    img.src = url;
  };

  if (size === 0) {
    return (
      <div className="border border-(--hud-border) bg-(--hud-bg)/45 p-4 font-mono text-xs uppercase tracking-wider text-(--hud-text-dim)">
        No 2D world map for asteroid or planetoid belts
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 w-full flex-col gap-2">
      <div className="flex min-h-0 flex-1 items-center justify-center overflow-hidden">
        <div
          className="h-full max-h-full max-w-full border border-(--hud-border)"
          style={{ aspectRatio: `${svgW} / ${svgH}` }}
        >
          <svg
            ref={svgRef}
            viewBox={`0 0 ${svgW} ${svgH}`}
            className="block h-full w-full"
            style={{ background: MAP_BG }}
            role="img"
            aria-label={`${world.name} 2D world map`}
          >
            {hexes.map((hex, index) => (
              <polygon
                key={`hex-${index}`}
                points={hexPts(hex.left, hex.top)}
                fill={colorForTerrain(hex.terrain)}
                stroke="#000000"
                strokeWidth={0.8}
              />
            ))}
            {hexes.map((hex, index) =>
              visibleFeatures(hex).map((feature) => (
                <FeatureMark key={`feature-${index}-${feature}`} feature={feature} left={hex.left} top={hex.top} />
              )),
            )}
            {overlays.map((overlay, index) => (
              <polygon
                key={`overlay-${index}`}
                points={overlay.points.map((point) => `${point.x},${point.y}`).join(" ")}
                fill={MAP_BG}
                stroke="none"
              />
            ))}
          </svg>
        </div>
      </div>

      <div className="flex shrink-0 flex-wrap items-start justify-between gap-3">
        <div className="flex max-h-20 flex-wrap gap-x-3 gap-y-1 overflow-auto">
          {presentTerrains.map((terrain) => (
            <div key={terrain} className="flex items-center gap-1">
              <span className="inline-block h-2.5 w-2.5 shrink-0 border border-black/40" style={{ background: colorForTerrain(terrain) }} />
              <span className="font-mono text-[9px] uppercase tracking-wider text-(--hud-text-dim)">
                {TERRAIN_LABELS[terrain]}
              </span>
            </div>
          ))}
          {presentFeatures.map((feature) => (
            <div key={feature} className="flex items-center gap-1">
              <span className="inline-block h-2.5 w-2.5 shrink-0 border border-(--hud-border) bg-(--hud-text-dim)" />
              <span className="font-mono text-[9px] uppercase tracking-wider text-(--hud-text-dim)">
                {FEATURE_LABELS[feature]}
              </span>
            </div>
          ))}
        </div>

        <div className="flex shrink-0 gap-2">
          <button
            type="button"
            onClick={downloadSVG}
            className="border border-(--hud-border) px-2 py-1 font-mono text-[9px] uppercase tracking-wider text-(--hud-text-dim) transition-colors hover:border-(--hud-accent) hover:text-(--hud-accent)"
          >
            SVG
          </button>
          <button
            type="button"
            onClick={downloadPNG}
            className="border border-(--hud-border) px-2 py-1 font-mono text-[9px] uppercase tracking-wider text-(--hud-text-dim) transition-colors hover:border-(--hud-accent) hover:text-(--hud-accent)"
          >
            PNG
          </button>
        </div>
      </div>
    </div>
  );
};

export default WorldMap;
