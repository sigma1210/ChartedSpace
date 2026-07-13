"use client";

import { depressurizedCells, doorBlastCells, fireLaneCells, lightingLevelAt, pathContains, pointKey, validCoveringFireTargets } from "./geometry";
import type { CombatScenario, GridPoint, PlannedMove } from "./types";
import { equipmentVisualFor } from "./equipmentPresentation";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { previewCoveringFire, previewDoorCoverage, previewOverwatch } from "./slice";

const cell = 60;
const facingArrow = { north: "↑", east: "→", south: "↓", west: "←" } as const;

export const CombatBoard2D = ({ scenario, currentTurn, selectedCombatantId, lockedTargetId, coveringCombatantIds, overwatchCombatantIds, onSelectCombatant, onSelectTarget, onClearSelection, reachableKeys, validTargetIds, coveredTargetIds, grenadeTargetKeys, grenadeBlastKeys, grenadeTargeting, plannedMove, hoveredDestination, onPreviewMove, onPreviewGrenade, onHoverDestination }: {
  scenario: CombatScenario;
  currentTurn: number;
  selectedCombatantId: string | null;
  lockedTargetId: string | null;
  coveringCombatantIds: Set<string>;
  overwatchCombatantIds: Set<string>;
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
}) => {
  const dispatch = useAppDispatch();
  const { coveringFireTargeting, plannedCoveringFireTarget, coveringFireLanes, overwatchTargeting, plannedOverwatchTarget, overwatchLanes, lastGrenadeImpact, plannedBreachDoorId, placedBreachingChargeByDoorId, leaderIdBySide, moraleStateByCombatantId, observedEnemyIds, lastKnownEnemyPositions, soundContacts, coveredDoorByCombatantId, doorCoverTargeting, plannedCoveredDoorId, weaponReadyCombatantIds, advanceReadyCombatantIds, aimedTargetByCombatantId, weaponDamagedCombatantIds, mobilityImpairedCombatantIds, parryingCombatantIds, guardingCombatantIds } = useAppSelector((state) => state.plugins.characterCombat);
  const advanceReadyPath = selectedCombatantId ? advanceReadyCombatantIds?.includes(selectedCombatantId) ?? false : false;
  const aimedTargetId = selectedCombatantId ? aimedTargetByCombatantId?.[selectedCombatantId] : null;
  const selectedUnit = scenario.combatants.find((unit) => unit.id === selectedCombatantId);
  const doorCoverTargetIds = new Set(doorCoverTargeting && selectedUnit ? scenario.doors.filter((door) => !door.open && Math.abs((door.from.x + door.to.x) / 2 - (selectedUnit.position.x + 0.5)) + Math.abs((door.from.y + door.to.y) / 2 - (selectedUnit.position.y + 0.5)) <= 7).map((door) => door.id) : []);
  const coveringTargetKeys = new Set(coveringFireTargeting && selectedCombatantId ? validCoveringFireTargets(scenario, selectedCombatantId).map(pointKey) : []);
  const overwatchTargetKeys = new Set(overwatchTargeting && selectedCombatantId ? validCoveringFireTargets(scenario, selectedCombatantId).map(pointKey) : []);
  const laneKeys = new Set([...coveringFireLanes, ...overwatchLanes].flatMap((lane) => lane.cells.map(pointKey)));
  const plannedTarget = plannedCoveringFireTarget ?? plannedOverwatchTarget;
  const plannedLaneKeys = new Set(plannedTarget && selectedCombatantId ? fireLaneCells(scenario, scenario.combatants.find((unit) => unit.id === selectedCombatantId)!.position, plannedTarget).map(pointKey) : []);
  const breachDoor = scenario.doors.find((door) => door.id === plannedBreachDoorId);
  const breachKeys = new Set(breachDoor ? doorBlastCells(breachDoor).map(pointKey) : []);
  const vacuumKeys = new Set(depressurizedCells(scenario).keys());
  const fireKeys = new Set((scenario.fireCells ?? []).map(pointKey));
  const smokeKeys = new Set((scenario.smokeCells ?? []).map(pointKey));
  const criticalFireKeys = new Set((scenario.criticalFireCells ?? []).map(pointKey));
  const impactBlastKeys = new Set((lastGrenadeImpact?.blastCells ?? []).map(pointKey));
  return (
  <svg viewBox={`-20 -20 ${scenario.width * cell + 40} ${scenario.height * cell + 40}`} className="h-full w-full" role="img" aria-label="Two dimensional boarding action deck plan" onClick={onClearSelection}>
    <rect x="0" y="0" width={scenario.width * cell} height={scenario.height * cell} rx="8" fill="#101c26" />
    {Array.from({ length: scenario.width }, (_, x) => Array.from({ length: scenario.height }, (_, y) => {
      const point = { x, y };
      const reachable = reachableKeys.has(pointKey(point));
      const inPath = plannedMove ? pathContains(plannedMove.path, point) : false;
      const hovered = hoveredDestination?.x === x && hoveredDestination?.y === y;
      const grenadeTarget = grenadeTargetKeys.has(pointKey(point));
      const grenadeBlast = grenadeBlastKeys.has(pointKey(point));
      const coveringTarget = coveringTargetKeys.has(pointKey(point));
      const overwatchTarget = overwatchTargetKeys.has(pointKey(point));
      const inFireLane = laneKeys.has(pointKey(point)) || plannedLaneKeys.has(pointKey(point));
      const inBreachBlast = breachKeys.has(pointKey(point));
      const inVacuum = vacuumKeys.has(pointKey(point));
      const inEnvironmentalFire = fireKeys.has(pointKey(point));
      const inSmoke = smokeKeys.has(pointKey(point));
      const inImpactBlast = impactBlastKeys.has(pointKey(point));
      const lighting = lightingLevelAt(scenario, point);
      return <rect key={`${x}:${y}`} x={x * cell + 2} y={y * cell + 2} width={cell - 4} height={cell - 4}
        fill={inBreachBlast ? "rgba(249,115,22,0.48)" : inImpactBlast ? "rgba(239,68,68,0.42)" : inEnvironmentalFire ? "#7f1d1d" : inSmoke ? "#475569" : inFireLane ? "rgba(250,204,21,0.32)" : overwatchTarget ? "rgba(232,121,249,0.12)" : coveringTarget ? "rgba(250,204,21,0.10)" : grenadeBlast ? "rgba(251,146,60,0.38)" : grenadeTarget ? "rgba(244,114,182,0.15)" : inPath ? advanceReadyPath ? "rgba(56,189,248,0.32)" : "rgba(251,191,36,0.28)" : hovered && reachable ? "rgba(103,232,249,0.28)" : reachable ? "rgba(52,211,153,0.13)" : inVacuum ? "#172554" : lighting === "dark" ? "#05080b" : lighting === "emergency" ? "#3a2418" : "#172631"}
        stroke={overwatchTarget ? "#e879f9" : inFireLane || coveringTarget ? "#facc15" : grenadeBlast ? "#fb923c" : grenadeTarget ? "#f472b6" : inPath ? advanceReadyPath ? "#38bdf8" : "#fbbf24" : reachable ? "#34d399" : "#29404d"} strokeWidth={inFireLane || grenadeBlast || inPath || hovered ? 3 : 1}
        className={coveringTarget || overwatchTarget || grenadeTarget || (!grenadeTargeting && reachable) ? "cursor-pointer" : "cursor-default"}
        onMouseEnter={() => onHoverDestination(!grenadeTargeting && reachable ? point : null)} onMouseLeave={() => onHoverDestination(null)}
        onClick={(event) => { if (coveringTarget) { event.stopPropagation(); dispatch(previewCoveringFire(point)); } else if (overwatchTarget) { event.stopPropagation(); dispatch(previewOverwatch(point)); } else if (grenadeTarget) { event.stopPropagation(); onPreviewGrenade(point); } else if (!grenadeTargeting && reachable && !coveringFireTargeting && !overwatchTargeting) { event.stopPropagation(); onPreviewMove(point); } }} />;
    }))}
    {lastGrenadeImpact && <g pointerEvents="none">
      {lastGrenadeImpact.scattered && <line x1={(lastGrenadeImpact.intended.x + 0.5) * cell} y1={(lastGrenadeImpact.intended.y + 0.5) * cell} x2={(lastGrenadeImpact.landing.x + 0.5) * cell} y2={(lastGrenadeImpact.landing.y + 0.5) * cell} stroke="#fda4af" strokeWidth="5" strokeDasharray="10 7" />}
      <rect x={lastGrenadeImpact.intended.x * cell + 7} y={lastGrenadeImpact.intended.y * cell + 7} width={cell - 14} height={cell - 14} rx="8" fill="none" stroke="#f9a8d4" strokeWidth="3" strokeDasharray="7 5" />
      <circle cx={(lastGrenadeImpact.landing.x + 0.5) * cell} cy={(lastGrenadeImpact.landing.y + 0.5) * cell} r="20" fill={lastGrenadeImpact.kind === "smoke" ? "#475569" : "#dc2626"} stroke={lastGrenadeImpact.kind === "smoke" ? "#cbd5e1" : "#fef08a"} strokeWidth="5" />
      <text x={(lastGrenadeImpact.landing.x + 0.5) * cell} y={(lastGrenadeImpact.landing.y + 0.5) * cell + 4} textAnchor="middle" fill="white" fontSize="9" fontWeight="bold" fontFamily="monospace">{lastGrenadeImpact.kind === "smoke" ? "SMOKE" : "IMPACT"}</text>
    </g>}
    {(scenario.fireCells ?? []).map((point) => { const critical = criticalFireKeys.has(pointKey(point)); return <g key={`fire:${pointKey(point)}`} pointerEvents="none">{critical && <circle cx={point.x * cell + cell / 2} cy={point.y * cell + cell / 2} r="20" fill="none" stroke="#fde047" strokeWidth="4" />}<circle cx={point.x * cell + cell / 2} cy={point.y * cell + cell / 2} r="13" fill={critical ? "#dc2626" : "#f97316"} opacity="0.9" /><text x={point.x * cell + cell / 2} y={point.y * cell + cell / 2 + 4} textAnchor="middle" fill="#fff7ed" fontSize={critical ? "8" : "10"} fontWeight="bold" fontFamily="monospace">{critical ? "CRITICAL" : "FIRE"}</text></g>; })}
    {(scenario.smokeCells ?? []).map((point) => <g key={`smoke:${pointKey(point)}`} pointerEvents="none"><circle cx={point.x * cell + cell / 2 - 8} cy={point.y * cell + cell / 2} r="12" fill="#94a3b8" opacity="0.62" /><circle cx={point.x * cell + cell / 2 + 8} cy={point.y * cell + cell / 2} r="14" fill="#64748b" opacity="0.72" /><text x={point.x * cell + cell / 2} y={point.y * cell + cell / 2 + 4} textAnchor="middle" fill="#f8fafc" fontSize="9" fontWeight="bold" fontFamily="monospace">SMOKE</text></g>)}
    {(scenario.flareCells ?? []).map((point) => <g key={`flare:${pointKey(point)}`} pointerEvents="none"><rect x={point.x * cell + 5} y={point.y * cell + 5} width={cell - 10} height={cell - 10} rx="12" fill="rgba(253,230,138,0.22)" stroke="#fde68a" strokeWidth="2" /><text x={point.x * cell + cell / 2} y={point.y * cell + cell / 2 + 4} textAnchor="middle" fill="#fef3c7" fontSize="9" fontWeight="bold" fontFamily="monospace">LIT</text></g>)}
    {(scenario.handholds ?? []).map((point) => <g key={`handhold:${pointKey(point)}`} pointerEvents="none"><circle cx={point.x * cell + cell / 2} cy={point.y * cell + cell / 2} r="10" fill="none" stroke="#60a5fa" strokeWidth="4" /><text x={point.x * cell + cell / 2} y={point.y * cell + cell / 2 + 24} textAnchor="middle" fill="#93c5fd" fontSize="8" fontWeight="bold" fontFamily="monospace">HANDHOLD</text></g>)}
    {scenario.id === "boarding-action" && <>
      <rect pointerEvents="none" x="6" y={3 * cell + 6} width={4 * cell - 12} height={3 * cell - 12} rx="8" fill="rgba(16,185,129,0.06)" />
      <rect pointerEvents="none" x={8 * cell + 6} y={2 * cell + 6} width={4 * cell - 12} height={4 * cell - 12} rx="8" fill="rgba(34,211,238,0.06)" />
      <text pointerEvents="none" x="18" y={3 * cell + 22} fill="#6ee7b7" fontSize="12" fontFamily="monospace">BOARDING ENTRY</text>
      <text pointerEvents="none" x={8 * cell + 18} y={2 * cell + 22} fill="#67e8f9" fontSize="12" fontFamily="monospace">COMMAND ROOM</text>
    </>}

    {scenario.objects.map((object) => {
      const x = object.position.x * cell + cell / 2;
      const y = object.position.y * cell + cell / 2;
      return object.kind !== "cover" ? (
        <g key={object.id}>
          {object.kind === "extraction" && <><rect x={x - 29} y={y - 29} width="58" height="58" rx="8" fill="rgba(16,185,129,0.25)" stroke="#6ee7b7" strokeWidth="5" strokeDasharray="7 4" /><text x={x} y={y - 35} textAnchor="middle" fill="#a7f3d0" fontSize="12" fontWeight="bold" fontFamily="monospace">EXTRACTION ZONE · {object.position.x},{object.position.y}</text></>}
          {object.kind === "control" && <circle cx={x} cy={y} r="29" fill="rgba(168,85,247,0.22)" stroke="#c084fc" strokeWidth="5" strokeDasharray="7 4" />}
          <rect x={x - 22} y={y - 18} width="44" height="36" rx="5" fill={object.kind === "extraction" ? "#064e3b" : object.kind === "prisoner" ? "#713f12" : object.kind === "control" ? "#581c87" : "#083344"} stroke={object.kind === "extraction" ? "#34d399" : object.kind === "prisoner" ? "#fbbf24" : object.kind === "control" ? "#c084fc" : "#22d3ee"} strokeWidth="3" />
          <circle cx={x} cy={y} r="6" fill={object.kind === "extraction" ? "#6ee7b7" : object.kind === "prisoner" ? "#fde68a" : "#67e8f9"} />
          <text x={x} y={y + 32} textAnchor="middle" fill="#e2e8f0" fontSize="10" fontFamily="monospace">{object.kind === "extraction" ? "EXTRACT" : object.kind === "prisoner" ? object.completed ? "RELEASED" : "PRISONER" : object.kind === "control" ? "HOLD ZONE" : "OBJECTIVE"}</text>
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
      <g key={door.id} pointerEvents={doorCoverTargetIds.has(door.id) ? "auto" : "none"} className={doorCoverTargetIds.has(door.id) ? "cursor-pointer" : ""} onClick={(event) => { if (doorCoverTargetIds.has(door.id)) { event.stopPropagation(); dispatch(previewDoorCoverage(door.id)); } }}>
        {!door.open && <line x1={door.from.x * cell} y1={door.from.y * cell} x2={door.to.x * cell} y2={door.to.y * cell} stroke={Object.values(coveredDoorByCombatantId ?? {}).includes(door.id) ? "#fde047" : "#f59e0b"} strokeWidth={Object.values(coveredDoorByCombatantId ?? {}).includes(door.id) ? "18" : "12"} />}
        <text x={door.from.x * cell + 8} y={(door.from.y + 0.5) * cell} fill={door.open ? "#6ee7b7" : "#fbbf24"} fontSize="10" fontFamily="monospace">{door.open ? "DOOR OPEN" : "SECURITY DOOR"}</text>
        {placedBreachingChargeByDoorId[door.id] && <text x={door.from.x * cell + 8} y={(door.from.y + 0.5) * cell + 12} fill="#fb7185" fontSize="10" fontWeight="bold" fontFamily="monospace">CHARGE PLACED</text>}
        {Object.values(coveredDoorByCombatantId ?? {}).includes(door.id) && <text x={door.from.x * cell + 8} y={(door.from.y + 0.5) * cell + 24} fill="#fef08a" fontSize="10" fontWeight="bold" fontFamily="monospace">DOOR COVERED</text>}
        {doorCoverTargetIds.has(door.id) && <text x={door.from.x * cell + 8} y={(door.from.y + 0.5) * cell - 8} fill={plannedCoveredDoorId === door.id ? "#ffffff" : "#fde68a"} fontSize="10" fontWeight="bold" fontFamily="monospace">{plannedCoveredDoorId === door.id ? "SELECTED" : "SELECT TO COVER"}</text>}
      </g>
    ))}

    {Object.entries(lastKnownEnemyPositions ?? {}).filter(([id]) => !(observedEnemyIds ?? []).includes(id)).map(([id, point]) => <g key={`last-known:${id}`} pointerEvents="none" opacity="0.55"><circle cx={(point.x + 0.5) * cell} cy={(point.y + 0.5) * cell} r="18" fill="none" stroke="#94a3b8" strokeWidth="3" strokeDasharray="5 5" /><text x={(point.x + 0.5) * cell} y={(point.y + 0.5) * cell + 4} textAnchor="middle" fill="#cbd5e1" fontSize="8" fontWeight="bold" fontFamily="monospace">LAST KNOWN</text></g>)}
    {(soundContacts ?? []).map((contact) => <g key={contact.id} pointerEvents="none"><circle cx={(contact.point.x + 0.5) * cell} cy={(contact.point.y + 0.5) * cell} r="25" fill="rgba(34,211,238,0.10)" stroke="#67e8f9" strokeWidth="3" strokeDasharray="4 4" /><text x={(contact.point.x + 0.5) * cell} y={(contact.point.y + 0.5) * cell + 4} textAnchor="middle" fill="#a5f3fc" fontSize="8" fontWeight="bold" fontFamily="monospace">SOUND</text></g>)}
    {scenario.combatants.filter((unit) => (!unit.reinforcementTurn || unit.reinforcementTurn <= currentTurn) && (unit.side === "player" || (observedEnemyIds ?? []).includes(unit.id))).map((unit) => {
      const x = unit.position.x * cell + cell / 2;
      const y = unit.position.y * cell + cell / 2;
      const player = unit.side === "player";
      const selected = unit.id === selectedCombatantId;
      const validTarget = validTargetIds.has(unit.id);
      const coveredTarget = coveredTargetIds.has(unit.id);
      const lockedTarget = unit.id === lockedTargetId;
      const covering = coveringCombatantIds.has(unit.id);
      const overwatched = overwatchCombatantIds.has(unit.id);
      const weaponReady = weaponReadyCombatantIds?.includes(unit.id) ?? false;
      const active = !unit.defeated;
      const equipment = equipmentVisualFor(unit);
      return (
        <g key={unit.id} opacity={active ? 1 : 0.5} pointerEvents={active ? "auto" : "none"} onClick={(event) => { if ((player && active) || validTarget) event.stopPropagation(); if (player && active) onSelectCombatant(unit.id); else if (validTarget) onSelectTarget(unit.id); }} className={(player && active) || validTarget ? "cursor-pointer" : "cursor-default"}>
          {selected && <rect x={unit.position.x * cell + 3} y={unit.position.y * cell + 3} width={cell - 6} height={cell - 6} rx="7" fill="rgba(52,211,153,0.16)" stroke="#f8fafc" strokeWidth="4" />}
          {validTarget && <><circle cx={x} cy={y} r="27" fill="none" stroke="#f87171" strokeWidth="3" strokeDasharray="5 3" /><text x={x} y={y + 31} textAnchor="middle" fill="#fecaca" fontSize="9" fontWeight="bold" fontFamily="monospace">TARGET</text></>}
          {lockedTarget && <><circle cx={x} cy={y} r="31" fill="none" stroke="#67e8f9" strokeWidth="2" /><text x={x} y={y + 51} textAnchor="middle" fill="#a5f3fc" fontSize="8" fontWeight="bold" fontFamily="monospace">LOCK</text></>}
          {covering && <text x={x} y={y + 51} textAnchor="middle" fill="#fde68a" fontSize="8" fontWeight="bold" fontFamily="monospace">COVERING</text>}
          {overwatched && <text x={x} y={y + 51} textAnchor="middle" fill="#f0abfc" fontSize="8" fontWeight="bold" fontFamily="monospace">OVERWATCH</text>}
          {weaponReady && <text x={x} y={y + 59} textAnchor="middle" fill="#7dd3fc" fontSize="8" fontWeight="bold" fontFamily="monospace">READY +1</text>}
          {coveredTarget && <text x={x} y={y + 42} textAnchor="middle" fill="#fbbf24" fontSize="8" fontWeight="bold" fontFamily="monospace">COVER</text>}
          <circle cx={x} cy={y} r="22" fill={player ? "#064e3b" : "#7f1d1d"} stroke={player ? "#6ee7b7" : "#fca5a5"} strokeWidth="3" />
          <g transform={`translate(${x} ${y - 3})`} fill={player ? "#d1fae5" : "#fee2e2"} stroke={player ? "#d1fae5" : "#fee2e2"} strokeLinecap="round" strokeLinejoin="round">
            <circle cx="0" cy="-9" r="5" stroke="none" />
            <path d="M -7 -1 Q 0 -5 7 -1 L 6 8 L -6 8 Z" stroke="none" />
            <path d="M -6 0 L -12 7 M 6 0 L 12 7 M -3 8 L -7 15 M 3 8 L 7 15" fill="none" strokeWidth="4" />
          </g>
          <text x={x + 14} y={y + 18} textAnchor="middle" fill="white" fontSize="13" fontWeight="bold">{facingArrow[unit.facing]}</text>
          <rect x={x - 48} y={y - 43} width="96" height="27" rx="3" fill="rgba(0,0,0,0.82)" />
          <text x={x} y={y - 28} textAnchor="middle" fill={player ? "#a7f3d0" : "#fecaca"} fontSize="10" fontFamily="monospace">{unit.name.toUpperCase()}{scenario.captureTargetId === unit.id ? " · CAPTURE ALIVE" : ""}{leaderIdBySide?.[unit.side] === unit.id ? " · LEADER" : ""}{unit.stunnedUntilTurn ? " · STUNNED" : ""}{(moraleStateByCombatantId?.[unit.id] ?? "steady") !== "steady" ? ` · ${(moraleStateByCombatantId?.[unit.id] ?? "steady").toUpperCase()}` : ""}</text>
          <text x={x} y={y - 19} textAnchor="middle" fill="#cbd5e1" fontSize="7" fontFamily="monospace">{equipment.weaponLabel} · {equipment.armorLabel.toUpperCase()}</text>
          {unit.surrendered ? <text x={x} y={y + 42} textAnchor="middle" fill="#fde68a" fontSize="8" fontWeight="bold" fontFamily="monospace">SURRENDERED</text> : unit.woundState !== "healthy" && <text x={x} y={y + 42} textAnchor="middle" fill={unit.woundState === "light" ? "#fbbf24" : "#fca5a5"} fontSize="8" fontWeight="bold" fontFamily="monospace">{unit.woundState.toUpperCase()}</text>}
          {unit.posture === "prone" && <text x={x} y={y - 34} textAnchor="middle" fill="#e2e8f0" fontSize="8" fontWeight="bold" fontFamily="monospace">PRONE</text>}
          {unit.id === aimedTargetId && <text x={x} y={y + 50} textAnchor="middle" fill="#67e8f9" fontSize="8" fontWeight="bold" fontFamily="monospace">AIM LOCK</text>}
          {(weaponDamagedCombatantIds?.includes(unit.id) || mobilityImpairedCombatantIds?.includes(unit.id)) && <text x={x} y={y + 59} textAnchor="middle" fill="#fda4af" fontSize="8" fontWeight="bold" fontFamily="monospace">{weaponDamagedCombatantIds?.includes(unit.id) ? "WEAPON −1" : "MOBILITY −2"}</text>}
          {(parryingCombatantIds?.includes(unit.id) || guardingCombatantIds?.includes(unit.id)) && <text x={x} y={y + 68} textAnchor="middle" fill="#c4b5fd" fontSize="8" fontWeight="bold" fontFamily="monospace">{parryingCombatantIds?.includes(unit.id) ? "PARRY −2" : "GUARD −1"}</text>}
        </g>
      );
    })}
  </svg>
  );
};
