"use client";

import { useEffect, useMemo, useState } from "react";
import { useAppDispatch, useAppSelector } from "../../store/hooks";
import { loadSector } from "../../store/slices/galaxySlice";
import { selectAllSectors } from "../../store/selectors/galaxy.selectors";
import { selectShip } from "../../store/selectors/ship.selectors";
import { setJumpDestination, closeModal } from "../../store/slices/uiSlice";
import { parseHex } from "../../lib/hex";
import { HEX_RADIUS } from "../map/hexGeometry";
import type { RootState } from "../../store/index";

const selectActiveModal = (state: RootState) => state.ui.activeModal;

const SQRT3       = Math.sqrt(3);
const COL_STEP    = HEX_RADIUS * 1.5;          // 30 — horizontal center-to-center per axial q
const ROW_STEP_Q  = HEX_RADIUS * SQRT3 / 2;    // ~17.3 — vertical contribution from q
const ROW_STEP_R  = HEX_RADIUS * SQRT3;         // ~34.6 — vertical center-to-center per axial r
const INNER_R     = HEX_RADIUS - 1;
const PAD         = 12;

// Offset (1-based Traveller col/row) → axial cube q,r
const offsetToAxial = (col: number, row: number) => ({
  q: col - 1,
  r: (row - 1) - Math.floor((col - 1) / 2),
});

// Axial q,r → offset (1-based Traveller col/row)
const axialToOffset = (q: number, r: number) => ({
  col: q + 1,
  row: r + Math.floor(q / 2) + 1,
});

// All axial cells in a hex-shaped grid of radius R
const hexShapeCells = (R: number): Array<[number, number]> => {
  const cells: Array<[number, number]> = [];
  for (let q = -R; q <= R; q++) {
    for (let r = Math.max(-R, -q - R); r <= Math.min(R, -q + R); r++) {
      cells.push([q, r]);
    }
  }
  return cells;
};

// Axial delta → pixel offset from center (flat-top geometry, same as hexGeometry.ts)
const axialToPixel = (dq: number, dr: number) => ({
  x: COL_STEP   * dq,
  y: ROW_STEP_Q * dq + ROW_STEP_R * dr,
});

const hexPointsStr = (cx: number, cy: number, r: number): string =>
  Array.from({ length: 6 }, (_, i) => {
    const angle = (Math.PI / 180) * 60 * i;
    return `${(cx + r * Math.cos(angle)).toFixed(2)},${(cy + r * Math.sin(angle)).toFixed(2)}`;
  }).join(" ");

const fmtHex = (col: number, row: number): string =>
  `${String(col).padStart(2, "0")}${String(row).padStart(2, "0")}`;

interface CellData {
  key:        string;
  dq:         number;
  dr:         number;
  px:         number;
  py:         number;
  isCenter:   boolean;
  hasWorld:   boolean;
  inRange:    boolean;
  worldHex:   string | null;
  sectorAbbr: string | null;
  worldName:  string | null;
  starport:   string | null;
}

const JumpRangeModal = () => {
  const dispatch      = useAppDispatch();
  const activeModal   = useAppSelector(selectActiveModal);
  const ship          = useAppSelector(selectShip);
  const allSectors    = useAppSelector(selectAllSectors);
  const loadingStatus = useAppSelector((state: RootState) => state.galaxy.loadingStatus);
  const sectorDataAll = useAppSelector((state: RootState) => state.galaxy.sectorData);

  const [hoveredKey, setHoveredKey] = useState<string | null>(null);

  const shipCoord      = ship?.hex ? parseHex(ship.hex) : null;
  const jumpRating     = ship?.jumpRating ?? 1;

  const shipSectorMeta = useMemo(
    () => allSectors.find(s => s.Abbreviation === ship?.sectorAbbr) ?? null,
    [allSectors, ship?.sectorAbbr],
  );

  const cells = useMemo(() => hexShapeCells(jumpRating), [jumpRating]);

  const neededSectorAbbrs = useMemo(() => {
    if (!shipCoord || !shipSectorMeta || !ship?.sectorAbbr || activeModal !== "jumpRangeSelector") {
      return ship?.sectorAbbr ? [ship.sectorAbbr] : [];
    }
    const shipAxial = offsetToAxial(shipCoord.col, shipCoord.row);
    const abbrs = new Set<string>([ship.sectorAbbr]);

    for (const [dq, dr] of cells) {
      const { col, row } = axialToOffset(shipAxial.q + dq, shipAxial.r + dr);
      const sectorDx = Math.floor((col - 1) / 32);
      const sectorDy = Math.floor((row - 1) / 40);
      if (sectorDx !== 0 || sectorDy !== 0) {
        const meta = allSectors.find(
          s => s.X === shipSectorMeta.X + sectorDx && s.Y === shipSectorMeta.Y + sectorDy,
        );
        if (meta) abbrs.add(meta.Abbreviation);
      }
    }
    return Array.from(abbrs);
  }, [shipCoord, shipSectorMeta, cells, allSectors, activeModal, ship?.sectorAbbr]);

  useEffect(() => {
    if (activeModal !== "jumpRangeSelector") return;
    for (const abbr of neededSectorAbbrs) {
      dispatch(loadSector(abbr));
    }
  }, [activeModal, neededSectorAbbrs, dispatch]);

  const allLoaded = neededSectorAbbrs.length > 0 &&
    neededSectorAbbrs.every(a => loadingStatus[a] === "loaded");
  const anyError  = neededSectorAbbrs.some(a => loadingStatus[a] === "error");

  // ─── Early returns (all hooks above) ─────────────────────────────────────────

  if (activeModal !== "jumpRangeSelector") return null;

  if (!ship || !ship.hex || !ship.sectorAbbr || !shipCoord || !shipSectorMeta) {
    return (
      <div className="fixed inset-0 z-20 flex items-center justify-center">
        <div className="hud-panel p-4">
          <p className="font-mono text-xs uppercase tracking-widest text-(--hud-error)">
            Ship location unknown
          </p>
        </div>
      </div>
    );
  }

  if (!allLoaded && !anyError) {
    return (
      <div className="fixed inset-0 z-20 flex items-center justify-center">
        <div className="hud-panel p-8 flex items-center justify-center">
          <p className="animate-pulse font-mono text-xs uppercase tracking-widest text-(--hud-text-dim)">
            Loading sector data…
          </p>
        </div>
      </div>
    );
  }

  if (anyError) {
    return (
      <div className="fixed inset-0 z-20 flex items-center justify-center">
        <div className="hud-panel p-8 flex items-center justify-center">
          <p className="font-mono text-xs uppercase tracking-widest text-(--hud-error)">
            Failed to load sector data
          </p>
        </div>
      </div>
    );
  }

  // ─── Build cell data ──────────────────────────────────────────────────────────

  const shipAxial = offsetToAxial(shipCoord.col, shipCoord.row);

  // Compute raw pixel positions (centered around 0,0)
  const rawCells = cells.map(([dq, dr]): CellData => {
    const { x, y } = axialToPixel(dq, dr);
    const key      = `${dq},${dr}`;
    const isCenter = dq === 0 && dr === 0;

    if (isCenter) {
      const centerWorld = sectorDataAll[ship.sectorAbbr!]?.worlds.find(w => w.hex === ship.hex);
      return {
        key, dq, dr, px: x, py: y, isCenter: true,
        hasWorld: true, inRange: false,
        worldHex:   ship.hex,
        sectorAbbr: ship.sectorAbbr!,
        worldName:  centerWorld?.name ?? null,
        starport:   centerWorld?.uwp.starport ?? null,
      };
    }

    const { col, row } = axialToOffset(shipAxial.q + dq, shipAxial.r + dr);
    const sectorDx  = Math.floor((col - 1) / 32);
    const sectorDy  = Math.floor((row - 1) / 40);
    const localCol  = col - sectorDx * 32;
    const localRow  = row - sectorDy * 40;

    let targetAbbr: string | null;
    if (sectorDx === 0 && sectorDy === 0) {
      targetAbbr = ship.sectorAbbr!;
    } else {
      const meta = allSectors.find(
        s => s.X === shipSectorMeta.X + sectorDx && s.Y === shipSectorMeta.Y + sectorDy,
      );
      targetAbbr = meta?.Abbreviation ?? null;
    }

    if (!targetAbbr || !sectorDataAll[targetAbbr]) {
      return {
        key, dq, dr, px: x, py: y, isCenter: false,
        hasWorld: false, inRange: false,
        worldHex: null, sectorAbbr: null, worldName: null, starport: null,
      };
    }

    const localHex = fmtHex(localCol, localRow);
    const world    = sectorDataAll[targetAbbr].worlds.find(w => w.hex === localHex);

    return {
      key, dq, dr, px: x, py: y, isCenter: false,
      hasWorld:   !!world,
      inRange:    !!world,
      worldHex:   world?.hex ?? null,
      sectorAbbr: targetAbbr,
      worldName:  world?.name ?? null,
      starport:   world?.uwp.starport ?? null,
    };
  });

  // Shift all cells so the grid is centered in the SVG
  const xs    = rawCells.map(c => c.px);
  const ys    = rawCells.map(c => c.py);
  const minX  = Math.min(...xs);
  const minY  = Math.min(...ys);
  const maxX  = Math.max(...xs);
  const maxY  = Math.max(...ys);

  const svgW     = maxX - minX + HEX_RADIUS * 2 + PAD * 2;
  const svgH     = maxY - minY + HEX_RADIUS * 2 + PAD * 2;
  const offsetX  = -minX + HEX_RADIUS + PAD;
  const offsetY  = -minY + HEX_RADIUS + PAD;

  const cellData = rawCells.map(c => ({ ...c, px: c.px + offsetX, py: c.py + offsetY }));

  const inRangeCount = cellData.filter(c => c.inRange).length;

  const handleSelect = (cell: CellData) => {
    if (!cell.inRange || !cell.worldHex || !cell.sectorAbbr || !cell.worldName) return;
    dispatch(setJumpDestination({ hex: cell.worldHex, sectorAbbr: cell.sectorAbbr, name: cell.worldName }));
  };

  return (
    <div className="fixed inset-0 z-20 flex items-center justify-center">
      <div className="hud-panel flex flex-col items-center gap-3 p-4 w-fit" style={{ maxHeight: "90vh", overflowY: "auto" }}>
        <div className="hud-panel-header">
          ◈ Select Jump Destination
          <span className="ml-4 text-(--hud-text-dim)">Jump-{jumpRating} range</span>
        </div>

        <div className="text-xs font-mono text-(--hud-text-dim) uppercase tracking-widest">
          {inRangeCount === 0
            ? "No reachable worlds in range"
            : `${inRangeCount} world${inRangeCount !== 1 ? "s" : ""} in range — click to select`}
        </div>

        <svg
          width={svgW}
          height={svgH}
          viewBox={`0 0 ${svgW} ${svgH}`}
          style={{ display: "block" }}
        >
          {cellData.map(cell => {
            const pts       = hexPointsStr(cell.px, cell.py, INNER_R);
            const isHovered = hoveredKey === cell.key && cell.inRange;

            // Fill and stroke match HexGrid conventions
            let fill:   string;
            let stroke: string;
            let sw:     number;

            if (cell.isCenter) {
              fill   = "rgba(6,182,212,0.25)";
              stroke = "var(--hud-accent)";
              sw     = 1.5;
            } else if (isHovered) {
              fill   = "rgba(34,211,238,0.20)";
              stroke = "var(--hud-accent)";
              sw     = 1;
            } else if (cell.hasWorld) {
              fill   = "#1a3a5c";
              stroke = "var(--hud-border)";
              sw     = 0.8;
            } else {
              fill   = "transparent";
              stroke = "var(--hud-border)";
              sw     = 0.4;
            }

            const dotColor  = cell.isCenter ? "var(--hud-accent)" : "var(--hud-text-dim)";
            const nameColor = isHovered ? "white" : "var(--hud-text)";
            const spColor   = isHovered ? "var(--hud-text)" : "var(--hud-text-dim)";

            const displayName = cell.worldName
              ? cell.worldName.length > 7 ? cell.worldName.slice(0, 7) : cell.worldName
              : null;

            return (
              <g
                key={cell.key}
                onClick={() => handleSelect(cell)}
                onMouseEnter={() => cell.inRange && setHoveredKey(cell.key)}
                onMouseLeave={() => setHoveredKey(null)}
                style={{ cursor: cell.inRange ? "pointer" : "default" }}
              >
                <polygon
                  points={pts}
                  fill={fill}
                  stroke={stroke}
                  strokeWidth={sw}
                />

                {/* Center cell — ship marker */}
                {cell.isCenter && (
                  <>
                    <circle cx={cell.px} cy={cell.py - 4} r={3.5} fill="var(--hud-accent)" />
                    {displayName && (
                      <text
                        x={cell.px} y={cell.py + 8}
                        textAnchor="middle" fontSize={5}
                        fill="var(--hud-accent)" fontFamily="monospace"
                      >
                        {displayName}
                      </text>
                    )}
                  </>
                )}

                {/* World cells */}
                {!cell.isCenter && cell.hasWorld && (
                  <>
                    <circle cx={cell.px} cy={cell.py - 4} r={2.5} fill={dotColor} />
                    {displayName && (
                      <text
                        x={cell.px} y={cell.py + 8}
                        textAnchor="middle" fontSize={5}
                        fill={nameColor} fontFamily="monospace"
                      >
                        {displayName}
                      </text>
                    )}
                    {cell.starport && (
                      <text
                        x={cell.px} y={cell.py + 14}
                        textAnchor="middle" fontSize={4.5}
                        fill={spColor} fontFamily="monospace"
                      >
                        {cell.starport}
                      </text>
                    )}
                  </>
                )}
              </g>
            );
          })}
        </svg>

        <button
          onClick={() => dispatch(closeModal())}
          className="self-end font-mono text-xs uppercase tracking-widest text-(--hud-text-dim) hover:text-(--hud-text) transition-colors"
        >
          Cancel
        </button>
      </div>
    </div>
  );
};

export default JumpRangeModal;
