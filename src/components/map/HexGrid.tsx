"use client";

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
}

const HEX_W = 40;
const HEX_H = 44;
const HEX_VERT_SPACING = HEX_H * 0.75;

function hexPoints(cx: number, cy: number, r: number): string {
  return Array.from({ length: 6 }, (_, i) => {
    const angle = (Math.PI / 180) * (60 * i - 30);
    return `${cx + r * Math.cos(angle)},${cy + r * Math.sin(angle)}`;
  }).join(" ");
}

function travelZoneColor(zone: string | null): string {
  if (zone === "A") return "var(--hud-warning)";
  if (zone === "R") return "var(--hud-error)";
  return "transparent";
}

export default function HexGrid({ worlds, cols, rows, onSelectWorld }: HexGridProps) {
  const worldMap = new Map(worlds.map((w) => [`${w.hexX},${w.hexY}`, w]));

  const r = HEX_W / 2;
  const svgWidth = cols * HEX_W + HEX_W / 2 + 4;
  const svgHeight = rows * HEX_VERT_SPACING + HEX_H * 0.25 + 4;

  const hexElements: React.ReactNode[] = [];

  for (let col = 1; col <= cols; col++) {
    for (let row = 1; row <= rows; row++) {
      const cx = (col - 1) * HEX_W + r + 2 + (row % 2 === 0 ? r : 0);
      const cy = (row - 1) * HEX_VERT_SPACING + r * 1.15 + 2;
      const world = worldMap.get(`${col},${row}`);
      const zoneColor = travelZoneColor(world?.travelZone ?? null);
      const hexId = `${col}-${row}`;

      hexElements.push(
        <g
          key={hexId}
          onClick={() => world && onSelectWorld(world.id)}
          style={{ cursor: world ? "pointer" : "default" }}
        >
          {/* Hex cell */}
          <polygon
            points={hexPoints(cx, cy, r - 1)}
            fill="var(--hud-surface)"
            stroke={world ? "var(--hud-border)" : "var(--hud-border-subtle)"}
            strokeWidth={world ? 0.8 : 0.4}
          />
          {/* Travel zone ring */}
          {zoneColor !== "transparent" && (
            <polygon
              points={hexPoints(cx, cy, r - 1)}
              fill="none"
              stroke={zoneColor}
              strokeWidth={1.5}
            />
          )}
          {world && (
            <>
              {/* World dot */}
              <circle
                cx={cx}
                cy={cy - 4}
                r={world.hasCharacter ? 3.5 : 2.5}
                fill={world.hasCharacter ? "var(--hud-accent)" : "var(--hud-text-dim)"}
              />
              {/* World name (clipped) */}
              <text
                x={cx}
                y={cy + 8}
                textAnchor="middle"
                fontSize={5}
                fill="var(--hud-text-dim)"
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
                fill="var(--hud-text-dim)"
                fontFamily="monospace"
              >
                {world.starport}
              </text>
            </>
          )}
        </g>
      );
    }
  }

  return (
    <div className="overflow-auto">
      <svg
        width={svgWidth}
        height={svgHeight}
        viewBox={`0 0 ${svgWidth} ${svgHeight}`}
        className="block"
      >
        {hexElements}
      </svg>
    </div>
  );
}
