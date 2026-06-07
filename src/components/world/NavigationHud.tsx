"use client";

import { AlertTriangle, Check, Circle, LoaderCircle } from "lucide-react";
import { HEX_RADIUS } from "../map/hexGeometry";
import type { JumpRangeCell, JumpRangeTarget } from "../../lib/jumpRange";
import { hudActionButtonClass } from "./HudPrimitives";

const SQRT3 = Math.sqrt(3);
const COL_STEP = HEX_RADIUS * 1.5;
const ROW_STEP_Q = (HEX_RADIUS * SQRT3) / 2;
const ROW_STEP_R = HEX_RADIUS * SQRT3;
const INNER_R = HEX_RADIUS - 1;
const PAD = 12;

const axialToPixel = (dq: number, dr: number) => ({
  x: COL_STEP * dq,
  y: ROW_STEP_Q * dq + ROW_STEP_R * dr,
});

const hexPointsStr = (cx: number, cy: number, r: number): string =>
  Array.from({ length: 6 }, (_, i) => {
    const angle = (Math.PI / 180) * 60 * i;
    return `${(cx + r * Math.cos(angle)).toFixed(2)},${(cy + r * Math.sin(angle)).toFixed(2)}`;
  }).join(" ");

interface NavigationHudProps {
  cells: JumpRangeCell[];
  targets: JumpRangeTarget[];
  selectedKey: string | null;
  loading: boolean;
  error: boolean;
  plotStatus: "idle" | "plotting" | "plotted" | "failed";
  actionBusy?: boolean;
  onSelect: (target: JumpRangeTarget) => void;
  onPlotCourse: () => void;
  onExecuteJump: () => void;
}

const NavigationHud = ({
  cells,
  targets,
  selectedKey,
  loading,
  error,
  plotStatus,
  actionBusy = false,
  onSelect,
  onPlotCourse,
  onExecuteJump,
}: NavigationHudProps) => {
  const selected = targets.find((target) => target.key === selectedKey) ?? null;
  const actionLabel = selected?.name ?? "Select";
  const ActionIcon = !selected
    ? Circle
    : plotStatus === "plotting"
      ? LoaderCircle
      : plotStatus === "failed"
        ? AlertTriangle
        : plotStatus === "plotted"
          ? Check
          : Circle;
  const actionDisabled = !selected || plotStatus === "plotting" || actionBusy;
  const handleAction = () => {
    if (!selected) return;
    if (actionBusy) return;
    if (plotStatus === "plotted") {
      onExecuteJump();
      return;
    }
    onPlotCourse();
  };
  const rawCells = cells.map((cell) => ({
    ...cell,
    ...axialToPixel(cell.dq, cell.dr),
  }));
  const xs = rawCells.map((cell) => cell.x);
  const ys = rawCells.map((cell) => cell.y);
  const minX = xs.length > 0 ? Math.min(...xs) : 0;
  const minY = ys.length > 0 ? Math.min(...ys) : 0;
  const maxX = xs.length > 0 ? Math.max(...xs) : 0;
  const maxY = ys.length > 0 ? Math.max(...ys) : 0;
  const svgW = maxX - minX + HEX_RADIUS * 2 + PAD * 2;
  const svgH = maxY - minY + HEX_RADIUS * 2 + PAD * 2;
  const offsetX = -minX + HEX_RADIUS + PAD;
  const offsetY = -minY + HEX_RADIUS + PAD;
  const displayCells = rawCells.map((cell) => ({
    ...cell,
    px: cell.x + offsetX,
    py: cell.y + offsetY,
  }));

  return (
    <div className="flex w-fit select-none flex-col gap-2 font-mono text-[10px] uppercase tracking-wider text-(--hud-text)">
      {loading && (
        <p className="animate-pulse text-(--hud-text-dim)">
          Loading reachable systems
        </p>
      )}

      {error && (
        <p className="text-(--hud-error)">
          Sector data unavailable
        </p>
      )}

      {!loading && !error && targets.length === 0 && (
        <p className="text-(--hud-text-dim)">
          No reachable worlds in range
        </p>
      )}

      {!loading && !error && cells.length > 0 && (
        <div>
          <svg
            width={svgW * 0.54}
            height={svgH * 0.54}
            viewBox={`0 0 ${svgW} ${svgH}`}
            className="block"
          >
            {displayCells.map((cell) => {
              const target = cell.inRange
                ? targets.find((candidate) => candidate.key === `${cell.sectorAbbr}:${cell.hex}`) ?? null
                : null;
              const active = target?.key === selectedKey;
              const pts = hexPointsStr(cell.px, cell.py, INNER_R);
              const displayName = cell.name
                ? cell.name.length > 8 ? cell.name.slice(0, 8) : cell.name
                : null;
              const fill = cell.isCenter
                ? "rgba(6,182,212,0.25)"
                : active
                  ? "rgba(34,211,238,0.24)"
                  : cell.inRange
                    ? "#1a3a5c"
                    : "transparent";
              const stroke = cell.isCenter || active
                ? "var(--hud-accent)"
                : "var(--hud-border)";
              const strokeWidth = cell.isCenter || active ? 1.5 : cell.inRange ? 0.8 : 0.4;

              return (
                <g
                  key={cell.key}
                  onClick={() => target && onSelect(target)}
                  style={{ cursor: target ? "pointer" : "default" }}
                >
                  <polygon
                    points={pts}
                    fill={fill}
                    stroke={stroke}
                    strokeWidth={strokeWidth}
                  />
                  {cell.isCenter && (
                    <circle cx={cell.px} cy={cell.py - 4} r={3.5} fill="var(--hud-accent)" />
                  )}
                  {target && (
                    <circle cx={cell.px} cy={cell.py - 5} r={2.5} fill={active ? "var(--hud-accent)" : "var(--hud-text-dim)"} />
                  )}
                  {displayName && (
                    <text
                      x={cell.px}
                      y={cell.py + 8}
                      textAnchor="middle"
                      fontSize={5}
                      fill={active || cell.isCenter ? "var(--hud-accent)" : "var(--hud-text)"}
                      fontFamily="monospace"
                    >
                      {displayName}
                    </text>
                  )}
                  {target?.starport && (
                    <text
                      x={cell.px}
                      y={cell.py + 14}
                      textAnchor="middle"
                      fontSize={4.5}
                      fill="var(--hud-text-dim)"
                      fontFamily="monospace"
                    >
                      {target.starport}
                    </text>
                  )}
                </g>
              );
            })}
          </svg>
        </div>
      )}

      <div className="flex flex-col gap-1 border-t border-(--hud-border) pt-1.5">
        <button
          type="button"
          onClick={handleAction}
          disabled={actionDisabled}
          className={`${hudActionButtonClass} w-full`}
        >
          <ActionIcon
            size={10}
            aria-hidden="true"
            className={plotStatus === "plotting" || actionBusy ? "animate-spin" : undefined}
          />
          <span className="truncate">{actionLabel}</span>
        </button>
      </div>
    </div>
  );
};

export default NavigationHud;
