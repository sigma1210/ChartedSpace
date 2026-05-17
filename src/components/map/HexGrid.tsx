"use client";

import { HEX_RADIUS, hexSvgWidth, hexSvgHeight, hexCenter } from "./hexGeometry";

interface HexWorld {
  id: string;
  hex: string;
  hexX: number;
  hexY: number;
  name: string;
  starport: string;
  techLevel: string;
  travelZone: string | null;
  allegiance: string | null;
  hasCharacter?: boolean;
}

interface HexGridProps {
  worlds: HexWorld[];
  /** Number of hex columns in this grid (32 for sector, 8 for subsector) */
  cols: number;
  /** Number of hex rows in this grid (40 for sector, 10 for subsector) */
  rows: number;
  onSelectWorld: (worldId: string) => void;
  /** Called when the pointer enters a hex that has a world. */
  onHoverWorld?: (worldId: string) => void;
  /** Called when the pointer leaves the grid entirely. */
  onLeaveGrid?: () => void;
  /** Uniform scale applied to the rendered SVG dimensions; viewBox unchanged so aspect ratio is preserved. Defaults to 1. */
  scale?: number;
  /** World id that is currently selected — renders an accent selection ring. */
  selectedWorldId?: string;
}


const hexPoints = (cx: number, cy: number, r: number): string => {
  return Array.from({ length: 6 }, (_, i) => {
    const angle = (Math.PI / 180) * (60 * i);           // 0° start → flat-top orientation
    return `${cx + r * Math.cos(angle)},${cy + r * Math.sin(angle)}`;
  }).join(" ");
}

const travelZoneColor = (zone: string | null): string => {
  if (zone === "A") return "var(--hud-warning)";
  if (zone === "R") return "var(--hud-error)";
  return "transparent";
}

const selectionColor = (zone: string | null): string => {
  if (zone === "A") return "var(--hud-warning)";
  if (zone === "R") return "var(--hud-error)";
  return "var(--hud-accent)";
}

const selectionFill = (zone: string | null): string => {
  if (zone === "A") return "rgba(245,158,11,0.2)";
  if (zone === "R") return "rgba(239,68,68,0.2)";
  return "rgba(6,182,212,0.25)";
}

const HexGrid = ({
  worlds,
  cols,
  rows,
  onSelectWorld,
  onHoverWorld,
  onLeaveGrid,
  scale = 1,
  selectedWorldId,
}: HexGridProps) => {
  const worldMap = new Map(worlds.map((w) => [`${w.hexX},${w.hexY}`, w]));

  const svgWidth = hexSvgWidth(cols);
  const svgHeight = hexSvgHeight(rows);

  const hexElements: React.ReactNode[] = [];

  for (let col = 1; col <= cols; col++) {
    for (let row = 1; row <= rows; row++) {
      const { cx, cy } = hexCenter(col, row);
      const world = worldMap.get(`${col},${row}`);
      const zone = world?.travelZone ?? null;
      const zoneColor = travelZoneColor(zone);
      const isSelected = !!world && world.id === selectedWorldId;
      const hexId = `${col}-${row}`;

      hexElements.push(
        <g
          key={hexId}
          onClick={() => world && onSelectWorld(world.id)}
          onMouseEnter={() => world ? onHoverWorld?.(world.id) : onLeaveGrid?.()}
          style={{ cursor: world ? "pointer" : "default" }}
        >
          {/* Hex cell */}
          <polygon
            points={hexPoints(cx, cy, HEX_RADIUS - 1)}
            fill={isSelected ? selectionFill(zone) : "#1a3a5c"}
            stroke={isSelected ? selectionColor(zone) : world ? "var(--hud-border)" : "var(--hud-border-subtle)"}
            strokeWidth={isSelected ? 1.5 : world ? 0.8 : 0.4}
          />
          {/* Travel zone ring */}
          {zoneColor !== "transparent" && (
            <polygon
              points={hexPoints(cx, cy, HEX_RADIUS - 1)}
              fill="none"
              stroke={zoneColor}
              strokeWidth={isSelected ? 2.5 : 1.5}
            />
          )}
          {/* Selection ring */}
          {isSelected && (
            <polygon
              points={hexPoints(cx, cy, HEX_RADIUS - 3)}
              fill="none"
              stroke={selectionColor(zone)}
              strokeWidth={0.8}
              opacity={0.5}
            />
          )}
          {world && (
            <>
              {/* World dot */}
              <circle
                cx={cx}
                cy={cy - 4}
                r={world.hasCharacter ? 3.5 : 2.5}
                fill={
                  world.hasCharacter
                    ? "var(--hud-accent)"
                    : "var(--hud-text-dim)"
                }
              />
              {/* World name (clipped) */}
              <text
                x={cx}
                y={cy + 8}
                textAnchor="middle"
                fontSize={5}
                fill={isSelected ? "white" : "var(--hud-text)"}
                fontFamily="monospace"
              >
                {world.name.length > 7 ? world.name.slice(0, 7) : world.name}
              </text>
              {/* Starport */}
              <text
                x={cx}
                y={cy + 14}
                textAnchor="middle"
                fontSize={4.5}
                fill={isSelected ? "var(--hud-text)" : "var(--hud-text-dim)"}
                fontFamily="monospace"
              >
                {world.starport}
              </text>
            </>
          )}
        </g>,
      );
    }
  }

  return (
    <div className="overflow-auto">
      <svg
        width={svgWidth * scale}
        height={svgHeight * scale}
        viewBox={`0 0 ${svgWidth} ${svgHeight}`}
        className="block"
        onMouseLeave={() => onLeaveGrid?.()}
      >
        {hexElements}
      </svg>
    </div>
  );
}
export default HexGrid
