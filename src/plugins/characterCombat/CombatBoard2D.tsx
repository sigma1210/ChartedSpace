"use client";

import { pathContains, pointKey } from "./geometry";
import type { CombatScenario, GridPoint, PlannedMove } from "./types";

const cell = 60;
const facingArrow = { north: "↑", east: "→", south: "↓", west: "←" } as const;

export const CombatBoard2D = ({ scenario, selectedCombatantId, lockedTargetId, coveringCombatantIds, overwatchTargetIds, onSelectCombatant, onSelectTarget, onClearSelection, reachableKeys, validTargetIds, coveredTargetIds, grenadeTargetKeys, grenadeBlastKeys, grenadeTargeting, plannedMove, hoveredDestination, onPreviewMove, onPreviewGrenade, onHoverDestination }: {
  scenario: CombatScenario;
  selectedCombatantId: string | null;
  lockedTargetId: string | null;
  coveringCombatantIds: Set<string>;
  overwatchTargetIds: Set<string>;
  onSelectCombatant: (id: string) => void;
  onSelectTarget: (id: string) => void;
  onClearSelection: () => void;
  reachableKeys: Set<string>;
  validTargetIds: Set<string>;
  coveredTargetIds: Set<string>;
  grenadeTargetKeys: Set<string>;
  grenadeBlastKeys: Set<string>;
  grenadeTargeting: boolean;
  plannedMove: PlannedMove | null;
  hoveredDestination: GridPoint | null;
  onPreviewMove: (point: GridPoint) => void;
  onPreviewGrenade: (point: GridPoint) => void;
  onHoverDestination: (point: GridPoint | null) => void;
}) => (
  <svg viewBox={`-20 -20 ${scenario.width * cell + 40} ${scenario.height * cell + 40}`} className="h-full w-full" role="img" aria-label="Two dimensional boarding action deck plan" onClick={onClearSelection}>
    <rect x="0" y="0" width={scenario.width * cell} height={scenario.height * cell} rx="8" fill="#101c26" />
    {Array.from({ length: scenario.width }, (_, x) => Array.from({ length: scenario.height }, (_, y) => {
      const point = { x, y };
      const reachable = reachableKeys.has(pointKey(point));
      const inPath = plannedMove ? pathContains(plannedMove.path, point) : false;
      const hovered = hoveredDestination?.x === x && hoveredDestination?.y === y;
      const grenadeTarget = grenadeTargetKeys.has(pointKey(point));
      const grenadeBlast = grenadeBlastKeys.has(pointKey(point));
      return <rect key={`${x}:${y}`} x={x * cell + 2} y={y * cell + 2} width={cell - 4} height={cell - 4}
        fill={grenadeBlast ? "rgba(251,146,60,0.38)" : grenadeTarget ? "rgba(244,114,182,0.15)" : inPath ? "rgba(251,191,36,0.28)" : hovered && reachable ? "rgba(103,232,249,0.28)" : reachable ? "rgba(52,211,153,0.13)" : "#172631"}
        stroke={grenadeBlast ? "#fb923c" : grenadeTarget ? "#f472b6" : inPath ? "#fbbf24" : reachable ? "#34d399" : "#29404d"} strokeWidth={grenadeBlast || inPath || hovered ? 3 : 1}
        className={grenadeTarget || (!grenadeTargeting && reachable) ? "cursor-pointer" : "cursor-default"}
        onMouseEnter={() => onHoverDestination(!grenadeTargeting && reachable ? point : null)} onMouseLeave={() => onHoverDestination(null)}
        onClick={(event) => { if (grenadeTarget) { event.stopPropagation(); onPreviewGrenade(point); } else if (!grenadeTargeting && reachable) { event.stopPropagation(); onPreviewMove(point); } }} />;
    }))}
    {scenario.id === "boarding-action" && <>
      <rect pointerEvents="none" x="6" y={3 * cell + 6} width={4 * cell - 12} height={3 * cell - 12} rx="8" fill="rgba(16,185,129,0.06)" />
      <rect pointerEvents="none" x={8 * cell + 6} y={2 * cell + 6} width={4 * cell - 12} height={4 * cell - 12} rx="8" fill="rgba(34,211,238,0.06)" />
      <text pointerEvents="none" x="18" y={3 * cell + 22} fill="#6ee7b7" fontSize="12" fontFamily="monospace">BOARDING ENTRY</text>
      <text pointerEvents="none" x={8 * cell + 18} y={2 * cell + 22} fill="#67e8f9" fontSize="12" fontFamily="monospace">COMMAND ROOM</text>
    </>}

    {scenario.objects.map((object) => {
      const x = object.position.x * cell + cell / 2;
      const y = object.position.y * cell + cell / 2;
      return object.kind === "console" ? (
        <g key={object.id}>
          <rect x={x - 22} y={y - 18} width="44" height="36" rx="5" fill="#083344" stroke="#22d3ee" strokeWidth="3" />
          <circle cx={x} cy={y} r="6" fill="#67e8f9" />
          <text x={x} y={y + 32} textAnchor="middle" fill="#a5f3fc" fontSize="10" fontFamily="monospace">OBJECTIVE</text>
        </g>
      ) : (
        <g key={object.id}>
          <rect x={x - 23} y={y - 20} width="46" height="40" rx="3" fill="#5b4636" stroke="#d6a56d" strokeWidth="2" />
          <path d={`M ${x - 23} ${y} h 46 M ${x} ${y - 20} v 40`} stroke="#d6a56d" strokeWidth="2" />
        </g>
      );
    })}

    {scenario.walls.map((wall) => <line key={wall.id} x1={wall.from.x * cell} y1={wall.from.y * cell} x2={wall.to.x * cell} y2={wall.to.y * cell} stroke="#d5e3ea" strokeWidth="10" strokeLinecap="round" />)}
    {scenario.doors.map((door) => (
      <g key={door.id} pointerEvents="none">
        {!door.open && <line x1={door.from.x * cell} y1={door.from.y * cell} x2={door.to.x * cell} y2={door.to.y * cell} stroke="#f59e0b" strokeWidth="12" />}
        <text x={door.from.x * cell + 8} y={(door.from.y + 0.5) * cell} fill={door.open ? "#6ee7b7" : "#fbbf24"} fontSize="10" fontFamily="monospace">{door.open ? "DOOR OPEN" : "SECURITY DOOR"}</text>
      </g>
    ))}

    {scenario.combatants.map((unit) => {
      const x = unit.position.x * cell + cell / 2;
      const y = unit.position.y * cell + cell / 2;
      const player = unit.side === "player";
      const selected = unit.id === selectedCombatantId;
      const validTarget = validTargetIds.has(unit.id);
      const coveredTarget = coveredTargetIds.has(unit.id);
      const lockedTarget = unit.id === lockedTargetId;
      const covering = coveringCombatantIds.has(unit.id);
      const overwatched = overwatchTargetIds.has(unit.id);
      const active = !unit.defeated;
      return (
        <g key={unit.id} opacity={active ? 1 : 0.5} pointerEvents={active ? "auto" : "none"} onClick={(event) => { if ((player && active) || validTarget) event.stopPropagation(); if (player && active) onSelectCombatant(unit.id); else if (validTarget) onSelectTarget(unit.id); }} className={(player && active) || validTarget ? "cursor-pointer" : "cursor-default"}>
          {selected && <rect x={unit.position.x * cell + 3} y={unit.position.y * cell + 3} width={cell - 6} height={cell - 6} rx="7" fill="rgba(52,211,153,0.16)" stroke="#f8fafc" strokeWidth="4" />}
          {validTarget && <><circle cx={x} cy={y} r="27" fill="none" stroke="#f87171" strokeWidth="3" strokeDasharray="5 3" /><text x={x} y={y + 31} textAnchor="middle" fill="#fecaca" fontSize="9" fontWeight="bold" fontFamily="monospace">TARGET</text></>}
          {lockedTarget && <><circle cx={x} cy={y} r="31" fill="none" stroke="#67e8f9" strokeWidth="2" /><text x={x} y={y + 51} textAnchor="middle" fill="#a5f3fc" fontSize="8" fontWeight="bold" fontFamily="monospace">LOCK</text></>}
          {covering && <text x={x} y={y + 51} textAnchor="middle" fill="#fde68a" fontSize="8" fontWeight="bold" fontFamily="monospace">COVERING</text>}
          {overwatched && <text x={x} y={y + 51} textAnchor="middle" fill="#f0abfc" fontSize="8" fontWeight="bold" fontFamily="monospace">COVERED</text>}
          {coveredTarget && <text x={x} y={y + 42} textAnchor="middle" fill="#fbbf24" fontSize="8" fontWeight="bold" fontFamily="monospace">COVER</text>}
          <circle cx={x} cy={y} r="22" fill={player ? "#064e3b" : "#7f1d1d"} stroke={player ? "#6ee7b7" : "#fca5a5"} strokeWidth="3" />
          <g transform={`translate(${x} ${y - 3})`} fill={player ? "#d1fae5" : "#fee2e2"} stroke={player ? "#d1fae5" : "#fee2e2"} strokeLinecap="round" strokeLinejoin="round">
            <circle cx="0" cy="-9" r="5" stroke="none" />
            <path d="M -7 -1 Q 0 -5 7 -1 L 6 8 L -6 8 Z" stroke="none" />
            <path d="M -6 0 L -12 7 M 6 0 L 12 7 M -3 8 L -7 15 M 3 8 L 7 15" fill="none" strokeWidth="4" />
          </g>
          <text x={x + 14} y={y + 18} textAnchor="middle" fill="white" fontSize="13" fontWeight="bold">{facingArrow[unit.facing]}</text>
          <rect x={x - 48} y={y - 39} width="96" height="16" rx="3" fill="rgba(0,0,0,0.82)" />
          <text x={x} y={y - 28} textAnchor="middle" fill={player ? "#a7f3d0" : "#fecaca"} fontSize="10" fontFamily="monospace">{unit.name.toUpperCase()}</text>
          {unit.surrendered ? <text x={x} y={y + 42} textAnchor="middle" fill="#fde68a" fontSize="8" fontWeight="bold" fontFamily="monospace">SURRENDERED</text> : unit.woundState !== "healthy" && <text x={x} y={y + 42} textAnchor="middle" fill={unit.woundState === "light" ? "#fbbf24" : "#fca5a5"} fontSize="8" fontWeight="bold" fontFamily="monospace">{unit.woundState.toUpperCase()}</text>}
        </g>
      );
    })}
  </svg>
);
