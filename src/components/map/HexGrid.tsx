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
  /** Uniform scale applied to the rendered SVG dimensions; viewBox unchanged so aspect ratio is preserved. Defaults to 1. */
  scale?: number;
}

// Flat-top hex geometry: columns run left→right, rows top→bottom.
// Even columns (hexX % 2 === 0) are offset down by half a row-height.
const HEX_RADIUS = 20;
const COL_SPACING = HEX_RADIUS * 1.5;                   // 30 — horizontal center-to-center
const ROW_SPACING = HEX_RADIUS * Math.sqrt(3);          // ≈34.6 — vertical center-to-center
const EVEN_COL_OFFSET = ROW_SPACING / 2;                // ≈17.3 — even-column downward shift

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

const HexGrid = ({
  worlds,
  cols,
  rows,
  onSelectWorld,
  scale = 1,
}: HexGridProps) => {
  const worldMap = new Map(worlds.map((w) => [`${w.hexX},${w.hexY}`, w]));

  const PAD = 4;
  const svgWidth = (cols - 1) * COL_SPACING + HEX_RADIUS * 2 + PAD * 2;
  const svgHeight = rows * ROW_SPACING + EVEN_COL_OFFSET + PAD * 2;

  const hexElements: React.ReactNode[] = [];

  for (let col = 1; col <= cols; col++) {
    for (let row = 1; row <= rows; row++) {
      const cx = (col - 1) * COL_SPACING + HEX_RADIUS + PAD;
      const cy = (row - 1) * ROW_SPACING + ROW_SPACING / 2 + PAD + (col % 2 === 0 ? EVEN_COL_OFFSET : 0);
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
            points={hexPoints(cx, cy, HEX_RADIUS - 1)}
            fill="#1a3a5c"
            stroke={world ? "var(--hud-border)" : "var(--hud-border-subtle)"}
            strokeWidth={world ? 0.8 : 0.4}
          />
          {/* Travel zone ring */}
          {zoneColor !== "transparent" && (
            <polygon
              points={hexPoints(cx, cy, HEX_RADIUS - 1)}
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
                fill="var(--hud-text)"
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
      >
        {hexElements}
      </svg>
    </div>
  );
}
export default HexGrid
