"use client";

import Link from "next/link";
import Image from "next/image";
import { Canvas } from "@react-three/fiber";
import { Html, Line, OrbitControls, OrthographicCamera } from "@react-three/drei";
import { Suspense, useEffect, useMemo, useState } from "react";
import { FloatingPluginHud } from "@/components/hud/FloatingPluginHud";
import { PluginHudLayer } from "@/components/hud/PluginHudLayer";
import { AnimatedCombatantFallback, AnimatedCombatantModel } from "@/plugins/characterCombat/AnimatedCombatantModel";
import { AnimatedCombatantPlacement } from "@/plugins/characterCombat/AnimatedCombatantPlacement";
import { activateTacticalCharacter, aimTacticalAttack, beginTacticalCoveringFire, beginTacticalDragging, beginTacticalGrenadeTargeting, beginTacticalSatchelPlacement, beginTacticalSmokeGrenadeTargeting, braceTacticalWeapon, cancelTacticalAttack, cancelTacticalCoveringFire, cancelTacticalExtinguishFire, cancelTacticalGrenadeTargeting, cancelTacticalMelee, cancelTacticalSatchelPlacement, cancelTacticalTreatment, confirmTacticalAttack, confirmTacticalCoveringFire, confirmTacticalExtinguishFire, confirmTacticalGrenade, confirmTacticalMelee, confirmTacticalMove, confirmTacticalSatchelPlacement, confirmTacticalTreatment, defuseTacticalSatchelCharge, detonateTacticalSatchelCharge, finishTacticalActivation, fireAtTacticalTerrain, initializeTacticalMap, interactWithTacticalTerrain, previewTacticalCoveringFire, previewTacticalEnemyEntry, previewTacticalExtinguishFire, previewTacticalGrenadeTarget, previewTacticalMelee, previewTacticalMeleeDive, previewTacticalMove, previewTacticalTreatment, rallyTacticalCharacter, releaseTacticalDraggedCombatant, reloadTacticalWeapon, resetTacticalScenario, resolveTacticalAdjacencyReaction, resolveTacticalCoveringFireSnap, runTacticalEnemyPhase, selectTacticalAttackMode, selectTacticalAttackTarget, selectTacticalTerrainObject, selectTacticalWeaponAmmunition, setTacticalMovementMode, toggleTacticalPosture, turnTacticalCharacter, updateTacticalActionHud, updateTacticalCharacterHud, updateTacticalCharacterInformationHud, updateTacticalEventsHud } from "@/plugins/characterCombat/slice";
import { updateTacticalEnemyHud, updateTacticalScenarioHud } from "@/plugins/characterCombat/slice";
import { activeOccupantCounts, automaticFireSecondaryTargets, collateralBlastCells, coverProtection, coveringFireDangerSpaceCells, grenadeBlastCells, meleeEnemies, pointKey, rangedEnemies, reachableOpenMapMovement, sidestepAndBackstepMoves, treatableAllies, validCoveringFireTargets, visibilityAssessment } from "@/plugins/characterCombat/geometry";
import { automaticFireModifierForRange, snapShotTarget, weaponAccuracyForRange, weaponPenetrationForRange } from "@/plugins/characterCombat/combatResolution";
import type { Combatant, TacticalMapState } from "@/plugins/characterCombat/types";
import { buildDefaultTacticalScenario } from "@/plugins/characterCombat/defaultTacticalScenario";
import { FIRST_TACTICAL_CONTROL_ROOM, tacticalTerrainBlockedCells, tacticalTerrainBlockedEdges, tacticalWallCornerPoints, tacticalWallVisualRuns, type TacticalTerrainObject, type TacticalWallVisualRun } from "@/plugins/characterCombat/tacticalTerrain";
import {
  fetchCharacters,
  selectCharacters,
  selectCharactersStatus,
  selectSelectedProfileCharacter,
  setSelectedProfileCharacter,
  type CharacterSummary,
} from "@/plugins/characters";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { selectActiveShip, selectShipStatus } from "@/plugins/ship";

const DEFAULT_MAP: TacticalMapState = { scenario: buildDefaultTacticalScenario(), gridSize: 1, movementAnimationByCharacterId: {}, characterHudLayout: { visible: true, pinned: false, position: { x: 16, y: 86 } }, enemyHudLayout: { visible: true, pinned: false, position: { x: 840, y: 86 } }, actionHudLayout: { visible: true, pinned: false, position: { x: 16, y: 190 } }, characterInformationHudLayout: { visible: true, pinned: false, position: { x: 320, y: 86 } }, eventsHudLayout: { visible: true, pinned: false, position: { x: 580, y: 86 } }, movementMode: "walk", plannedDestination: null, plannedEnemyEntryTargetId: null, enemySquareEnteredCombatantIds: [], plannedAttackTargetId: null, plannedAttackMode: null, plannedMeleeTargetId: null, aimedTargetId: null, grenadeTargeting: false, grenadeKind: null, plannedGrenadeTarget: null, smokeClearsAtTurnByCell: {}, lastGrenadeImpact: null, lastWeaponImpact: null, satchelCharges: [], satchelPlacementPending: false, lastSatchelImpact: null, coveringFireTargeting: false, plannedCoveringFireTarget: null, coveringFireLanes: [], coveringFireCommittedCombatantIds: [], pendingCoveringFireSnapIds: [], plannedTreatmentTargetId: null, draggingCombatantByCarrierId: {}, ahlMeleeStunUntilTurnById: {}, selectedTerrainObjectId: null, doorOpenById: {}, actionPhaseStartPositionByCombatantId: {}, pendingDoorCommandsById: {}, terminalActiveById: {}, terrainDamageById: {}, destroyedTerrainObjectIds: [], ammunitionByCharacterId: {}, ammunitionByCombatantAndKind: {}, evadingCombatantIds: [], bracedCombatantIds: [], suppressedCombatantIds: [], movedCombatantIds: [], processedEnemyPhaseCombatantIds: [], movingAdjacentMoraleResultByLeaderId: {}, pendingAdjacencyReaction: null, events: [], turn: 1, actionPointsByCharacterId: {}, actedCharacterIds: [], activeCharacterId: null };
const TACTICAL_TERRAIN = FIRST_TACTICAL_CONTROL_ROOM.objects;
const TACTICAL_BLOCKED_CELLS = tacticalTerrainBlockedCells(TACTICAL_TERRAIN);
const TACTICAL_WALL_CORNERS = tacticalWallCornerPoints(TACTICAL_TERRAIN);
const TACTICAL_WALL_HEIGHT = 1.26;
const TACTICAL_WALL_CENTER_Y = TACTICAL_WALL_HEIGHT / 2;
const TACTICAL_DOOR_HEIGHT = 1.23;
const TACTICAL_DOOR_CENTER_Y = TACTICAL_DOOR_HEIGHT / 2;
const rollDicePair = () => ({ first: Math.floor(Math.random() * 6) + 1, second: Math.floor(Math.random() * 6) + 1 });

const TacticalGrid = ({ width, height, gridSize, onSelectCell }: { width: number; height: number; gridSize: number; onSelectCell: (point: { x: number; y: number }) => void }) => {
  const positions = useMemo(() => {
    const values: number[] = [];
    for (let x = 0; x <= width; x += gridSize) values.push(x - width / 2, 0.012, -height / 2, x - width / 2, 0.012, height / 2);
    for (let y = 0; y <= height; y += gridSize) values.push(-width / 2, 0.012, y - height / 2, width / 2, 0.012, y - height / 2);
    return new Float32Array(values);
  }, [gridSize, height, width]);

  return <>
    <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow onClick={(event) => { event.stopPropagation(); onSelectCell({ x: Math.floor(event.point.x + width / 2), y: Math.floor(event.point.z + height / 2) }); }}>
      <planeGeometry args={[width, height]} />
      <meshStandardMaterial color="#101b2a" roughness={0.92} />
    </mesh>
    <lineSegments>
      <bufferGeometry><bufferAttribute attach="attributes-position" args={[positions, 3]} /></bufferGeometry>
      <lineBasicMaterial color="#2f6f82" transparent opacity={0.55} />
    </lineSegments>
  </>;
};

const MovementPerimeter = ({ cells, width, height }: { cells: Map<string, { x: number; y: number }>; width: number; height: number }) => {
  const positions = useMemo(() => {
    const values: number[] = [];
    const occupied = new Set(cells.keys());
    const edge = (fromX: number, fromY: number, toX: number, toY: number) => values.push(fromX - width / 2, 0.045, fromY - height / 2, toX - width / 2, 0.045, toY - height / 2);
    cells.forEach((cell) => {
      if (!occupied.has(pointKey({ x: cell.x, y: cell.y - 1 }))) edge(cell.x, cell.y, cell.x + 1, cell.y);
      if (!occupied.has(pointKey({ x: cell.x + 1, y: cell.y }))) edge(cell.x + 1, cell.y, cell.x + 1, cell.y + 1);
      if (!occupied.has(pointKey({ x: cell.x, y: cell.y + 1 }))) edge(cell.x + 1, cell.y + 1, cell.x, cell.y + 1);
      if (!occupied.has(pointKey({ x: cell.x - 1, y: cell.y }))) edge(cell.x, cell.y + 1, cell.x, cell.y);
    });
    return new Float32Array(values);
  }, [cells, height, width]);

  if (positions.length === 0) return null;
  return <lineSegments>
    <bufferGeometry><bufferAttribute attach="attributes-position" args={[positions, 3]} /></bufferGeometry>
    <lineBasicMaterial color="#facc15" />
  </lineSegments>;
};

const MovementPreview = ({ origin, path, destination, width, height }: { origin: { x: number; y: number }; path: { x: number; y: number }[]; destination: { x: number; y: number }; width: number; height: number }) => {
  const worldPoint = (point: { x: number; y: number }): [number, number, number] => [point.x + 0.5 - width / 2, 0.075, point.y + 0.5 - height / 2];
  return <>
    <Line points={[worldPoint(origin), ...path.map(worldPoint)]} color="#67e8f9" lineWidth={2} />
    <mesh position={worldPoint(destination)} rotation={[-Math.PI / 2, 0, 0]}>
      <ringGeometry args={[0.22, 0.38, 24]} />
      <meshBasicMaterial color="#facc15" />
    </mesh>
  </>;
};

const CoveringFirePreview = ({ cells, width, height, color }: { cells: { x: number; y: number }[]; width: number; height: number; color: string }) => {
  const worldPoint = (point: { x: number; y: number }): [number, number, number] => [point.x + 0.5 - width / 2, 0.085, point.y + 0.5 - height / 2];
  return <>
    {cells.map((cell) => <group key={`${cell.x}:${cell.y}`} position={worldPoint(cell)}>
      <mesh rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.31, 0.35, 32]} />
        <meshBasicMaterial color={color} />
      </mesh>
      <Line points={[[-0.22, 0.004, -0.22], [0.22, 0.004, 0.22]]} color={color} lineWidth={1} />
      <Line points={[[-0.22, 0.004, 0.22], [0.22, 0.004, -0.22]]} color={color} lineWidth={1} />
    </group>)}
  </>;
};

const BlastAreaPreview = ({ center, cells, width, height, resolved, label, color: requestedColor }: { center: { x: number; y: number }; cells: { x: number; y: number }[]; width: number; height: number; resolved: boolean; label: string; color?: string }) => {
  const worldPoint = (point: { x: number; y: number }): [number, number, number] => [point.x + 0.5 - width / 2, 0.095, point.y + 0.5 - height / 2];
  const color = requestedColor ?? (resolved ? "#dc2626" : "#f9a8d4");
  return <>
    {cells.map((cell) => <mesh key={`${cell.x}:${cell.y}`} position={worldPoint(cell)} rotation={[-Math.PI / 2, 0, 0]}>
      <ringGeometry args={[0.36, 0.41, 24]} />
      <meshBasicMaterial color={color} />
    </mesh>)}
    <group position={worldPoint(center)}>
      <mesh>
        <sphereGeometry args={[resolved ? 0.24 : 0.16, 16, 12]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={resolved ? 1.5 : 0.7} />
      </mesh>
      <Html center position={[0, 0.62, 0]} style={{ pointerEvents: "none" }}><div className={`whitespace-nowrap border bg-black/95 px-1.5 py-0.5 font-mono text-[8px] font-bold uppercase ${resolved ? "border-red-300 text-red-100" : "border-pink-300 text-pink-100"}`}>{label}</div></Html>
    </group>
  </>;
};

const SatchelChargeMarkers = ({ charges, width, height }: { charges: TacticalMapState["satchelCharges"]; width: number; height: number }) => <>
  {charges.map((charge) => <group key={charge.id} position={[charge.position.x + 0.5 - width / 2, 0.16, charge.position.y + 0.5 - height / 2]}>
    <mesh rotation={[-Math.PI / 2, 0, 0]}>
      <ringGeometry args={[0.2, 0.31, 20]} />
      <meshBasicMaterial color="#fb923c" />
    </mesh>
    <mesh position={[0, 0.05, 0]}>
      <boxGeometry args={[0.28, 0.12, 0.2]} />
      <meshStandardMaterial color="#7c2d12" emissive="#ea580c" emissiveIntensity={0.8} />
    </mesh>
    <Html center position={[0, 0.62, 0]} style={{ pointerEvents: "none" }}><div className="whitespace-nowrap border border-orange-300 bg-black/95 px-1.5 py-0.5 font-mono text-[8px] font-bold uppercase text-orange-100">Satchel armed</div></Html>
  </group>)}
</>;

const SmokeArea = ({ cells, width, height }: { cells: { x: number; y: number }[]; width: number; height: number }) => <>
  {cells.map((point) => <group key={`smoke:${pointKey(point)}`} position={[point.x + 0.5 - width / 2, 0.48, point.y + 0.5 - height / 2]}>
    <mesh position={[-0.18, 0, 0]}>
      <sphereGeometry args={[0.34, 12, 8]} />
      <meshStandardMaterial color="#94a3b8" transparent opacity={0.5} depthWrite={false} />
    </mesh>
    <mesh position={[0.2, 0.12, 0.05]}>
      <sphereGeometry args={[0.4, 12, 8]} />
      <meshStandardMaterial color="#64748b" transparent opacity={0.55} depthWrite={false} />
    </mesh>
  </group>)}
</>;

const FireArea = ({ cells, selected, width, height }: { cells: { x: number; y: number }[]; selected: { x: number; y: number } | null; width: number; height: number }) => <>
  {cells.map((point) => {
    const highlighted = Boolean(selected && pointKey(selected) === pointKey(point));
    return <group key={`fire:${pointKey(point)}`} position={[point.x + 0.5 - width / 2, 0.24, point.y + 0.5 - height / 2]}>
      <mesh>
        <coneGeometry args={[highlighted ? 0.36 : 0.3, highlighted ? 0.72 : 0.58, 12]} />
        <meshStandardMaterial color="#fb923c" emissive="#ef4444" emissiveIntensity={highlighted ? 2.4 : 1.6} />
      </mesh>
      <mesh position={[0, -0.2, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.34, 0.42, 24]} />
        <meshBasicMaterial color={highlighted ? "#fef08a" : "#f97316"} />
      </mesh>
    </group>;
  })}
</>;

const TacticalTerrainPiece = ({ object, mapWidth, mapHeight, selected, terminalActive, damage, onSelect }: { object: TacticalTerrainObject; mapWidth: number; mapHeight: number; selected: boolean; terminalActive: boolean; damage: number; onSelect: (point: { x: number; y: number }) => void }) => {
  if (object.kind === "terminal") {
    const position: [number, number, number] = [object.position.x + 0.5 - mapWidth / 2, 0.38, object.position.y + 0.5 - mapHeight / 2];
    return <group position={position} rotation={[0, object.facing * Math.PI / 180, 0]} onClick={(event) => { event.stopPropagation(); onSelect(object.position); }}>
    <mesh castShadow receiveShadow>
      <boxGeometry args={[0.72, 0.72, 0.72]} />
      <meshStandardMaterial color={selected ? "#facc15" : terminalActive ? "#22c55e" : object.operational ? "#0891b2" : "#475569"} roughness={0.52} metalness={0.35} />
    </mesh>
    <mesh position={[0, 0.18, -0.371]}>
      <planeGeometry args={[0.44, 0.24]} />
      <meshBasicMaterial color={terminalActive ? "#bbf7d0" : object.operational ? "#67e8f9" : "#1e293b"} />
    </mesh>
    <Html center position={[0, 0.78, 0]} style={{ pointerEvents: "none" }}><div className="whitespace-nowrap border border-cyan-500/60 bg-slate-950/90 px-1.5 py-0.5 font-mono text-[7px] uppercase tracking-wider text-cyan-100">{object.label}</div></Html>
    </group>;
  }

  const dx = object.edge.to.x - object.edge.from.x;
  const dy = object.edge.to.y - object.edge.from.y;
  const horizontal = dy === 0;
  const position: [number, number, number] = [(object.edge.from.x + object.edge.to.x) / 2 - mapWidth / 2, object.kind === "wall" ? TACTICAL_WALL_CENTER_Y : TACTICAL_DOOR_CENTER_Y, (object.edge.from.y + object.edge.to.y) / 2 - mapHeight / 2];
  if (object.kind === "wall") return <mesh position={position} onClick={(event) => { event.stopPropagation(); onSelect({ x: Math.floor(event.point.x + mapWidth / 2), y: Math.floor(event.point.z + mapHeight / 2) }); }}>
    <boxGeometry args={horizontal ? [Math.abs(dx), TACTICAL_WALL_HEIGHT, 0.22] : [0.22, TACTICAL_WALL_HEIGHT, Math.abs(dy)]} />
    <meshBasicMaterial color={selected ? "#facc15" : "#f97316"} transparent opacity={selected ? 0.55 : damage > 0 ? 0.4 : 0} depthWrite={false} />
  </mesh>;
  const openScale = object.open ? 0.18 : 1;
  const doorLength = horizontal ? Math.abs(dx) : Math.abs(dy);
  const retractionOffset = object.open ? -doorLength * (1 - openScale) / 2 : 0;
  const doorPosition: [number, number, number] = [position[0] + (horizontal ? retractionOffset : 0), position[1], position[2] + (horizontal ? 0 : retractionOffset)];
  return <mesh position={doorPosition} scale={horizontal ? [openScale, 1, 1] : [1, 1, openScale]} castShadow receiveShadow onClick={(event) => { event.stopPropagation(); onSelect({ x: Math.floor(event.point.x + mapWidth / 2), y: Math.floor(event.point.z + mapHeight / 2) }); }}>
    <boxGeometry args={horizontal ? [Math.abs(dx), TACTICAL_DOOR_HEIGHT, 0.2] : [0.2, TACTICAL_DOOR_HEIGHT, Math.abs(dy)]} />
    <meshStandardMaterial color={selected ? "#facc15" : object.open ? "#22c55e" : "#0e7490"} roughness={0.62} metalness={0.32} />
  </mesh>;
};

const TacticalWallRun = ({ run, mapWidth, mapHeight }: { run: TacticalWallVisualRun; mapWidth: number; mapHeight: number }) => {
  const dx = run.edge.to.x - run.edge.from.x;
  const dy = run.edge.to.y - run.edge.from.y;
  const horizontal = dy === 0;
  const position: [number, number, number] = [(run.edge.from.x + run.edge.to.x) / 2 - mapWidth / 2, TACTICAL_WALL_CENTER_Y, (run.edge.from.y + run.edge.to.y) / 2 - mapHeight / 2];
  return <mesh position={position} castShadow receiveShadow>
    <boxGeometry args={horizontal ? [Math.abs(dx), TACTICAL_WALL_HEIGHT, 0.22] : [0.22, TACTICAL_WALL_HEIGHT, Math.abs(dy)]} />
    <meshStandardMaterial color="#64748b" roughness={0.72} metalness={0.22} />
  </mesh>;
};

const MapCombatant = ({ combatant, mapWidth, mapHeight, movement, selected, targetable, targeted, onSelect }: { combatant: Combatant; mapWidth: number; mapHeight: number; movement?: { sequence: number; path: [number, number, number][]; mode: "walk" | "run" }; selected: boolean; targetable: boolean; targeted: boolean; onSelect: () => void }) => {
  const enemy = combatant.side === "enemy";
  const accent = enemy ? "#ef4444" : "#22d3ee";
  return <AnimatedCombatantPlacement position={[combatant.position.x - mapWidth / 2 + 0.5, 0.02, combatant.position.y - mapHeight / 2 + 0.5]} rotation={[0, 0, 0]} finalFacing={combatant.facing} movement={movement} onClick={(event) => { event.stopPropagation(); onSelect(); }}>
  {(moving, visualFacing) => <>
    {(!enemy || targetable || targeted) && <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.018, 0]}>
      <ringGeometry args={targeted ? [0.29, 0.49, 32] : targetable ? [0.37, 0.44, 32] : [0.34, 0.47, 32]} />
      <meshBasicMaterial color={targeted ? "#ff1f1f" : selected ? "#facc15" : accent} transparent opacity={targetable || selected || targeted ? 1 : 0.72} />
    </mesh>}
    <Suspense fallback={<AnimatedCombatantFallback color={accent} />}>
      <AnimatedCombatantModel animation={moving ? movement?.mode ?? "walk" : "idle"} facing={visualFacing} pose={combatant.woundState === "dead" ? "stunned" : null} />
    </Suspense>
    <Html center position={[0, 1.25, 0]} style={{ pointerEvents: "none" }}>
      <div className={`whitespace-nowrap border px-2 py-1 font-mono text-[10px] font-bold uppercase tracking-wider ${selected || targeted ? "border-yellow-300 bg-yellow-950/95 text-yellow-100" : enemy ? "border-red-500/70 bg-slate-950/90 text-red-100" : "border-cyan-500/70 bg-slate-950/90 text-cyan-100"}`}>{combatant.name}</div>
    </Html>
  </>}
</AnimatedCombatantPlacement>;
};

const TacticalScene = () => {
  const dispatch = useAppDispatch();
  const tacticalMap = useAppSelector((state) => state.plugins.characterCombat.tacticalMap) ?? DEFAULT_MAP;
  const mapWidth = tacticalMap.scenario.width;
  const mapHeight = tacticalMap.scenario.height;
  const combatants = tacticalMap.scenario.combatants;
  const focusX = combatants.length > 0 ? combatants.reduce((total, unit) => total + unit.position.x + 0.5 - mapWidth / 2, 0) / combatants.length : 0;
  const focusZ = combatants.length > 0 ? combatants.reduce((total, unit) => total + unit.position.y + 0.5 - mapHeight / 2, 0) / combatants.length : 0;
  const selected = combatants.find((unit) => unit.id === tacticalMap.activeCharacterId && unit.side === "player") ?? null;
  const selectedPosition = selected?.position ?? null;
  const selectedActionPoints = selected ? tacticalMap.actionPointsByCharacterId[selected.id] ?? 0 : 0;
  const selectedFacing = selected?.facing ?? "south";
  const selectedProne = selected?.posture === "prone";
  const selectedSuppressed = Boolean(selected && tacticalMap.suppressedCombatantIds.includes(selected.id));
  const selectedDragging = Boolean(selected && tacticalMap.draggingCombatantByCarrierId[selected.id]);
  const validTargetIds = new Set(selected && !selectedDragging ? rangedEnemies(tacticalMap.scenario, selected.id).map((unit) => unit.id) : []);
  const validMeleeTargetIds = new Set(selected && !selectedDragging ? meleeEnemies(tacticalMap.scenario, selected.id).map((unit) => unit.id) : []);
  const tacticalTerrain = useMemo(() => TACTICAL_TERRAIN.filter((object) => !tacticalMap.destroyedTerrainObjectIds.includes(object.id)).map((object) => object.kind === "door" ? { ...object, open: tacticalMap.doorOpenById[object.id] ?? object.open } : object), [tacticalMap.destroyedTerrainObjectIds, tacticalMap.doorOpenById]);
  const blockedEdges = useMemo(() => tacticalTerrainBlockedEdges(tacticalTerrain), [tacticalTerrain]);
  const wallRuns = useMemo(() => tacticalWallVisualRuns(tacticalTerrain), [tacticalTerrain]);
  const reachableMoves = useMemo(() => {
    if (!selectedPosition || !tacticalMap.movementMode) return new Map();
    if (selectedProne) return new Map();
    const activeOccupantsByCell = activeOccupantCounts(combatants, selected?.id);
    const moves = tacticalMap.movementMode === "sidestep"
      ? sidestepAndBackstepMoves({ width: mapWidth, height: mapHeight, origin: selectedPosition, facing: selectedFacing, allowance: selectedActionPoints, blockedCells: TACTICAL_BLOCKED_CELLS, blockedEdges, activeOccupantsByCell })
      : reachableOpenMapMovement({ width: mapWidth, height: mapHeight, origin: selectedPosition, facing: selectedFacing, allowance: Math.min(6, selectedActionPoints), trotting: tacticalMap.movementMode === "trot", blockedCells: TACTICAL_BLOCKED_CELLS, blockedEdges, activeOccupantsByCell });
    const enemyPositions = new Set(combatants.filter((unit) => unit.side === "enemy" && !unit.defeated).map((unit) => pointKey(unit.position)));
    const legalMoves = new Map([...moves].filter(([, move]) => {
      const enemyStepIndex = move.path.findIndex((point) => enemyPositions.has(pointKey(point)));
      const plannedEntry = tacticalMap.plannedEnemyEntryTargetId && pointKey(move.destination) === pointKey(combatants.find((unit) => unit.id === tacticalMap.plannedEnemyEntryTargetId)?.position ?? { x: -1, y: -1 });
      return enemyStepIndex < 0 || (plannedEntry && enemyStepIndex === move.path.length - 1);
    }));
    return tacticalMap.movementMode === "evade"
      ? new Map([...legalMoves].filter(([, move]) => move.path.length === 1 && (activeOccupantsByCell.get(pointKey(move.destination)) ?? 0) === 0))
      : selectedSuppressed || selectedDragging ? new Map([...legalMoves].filter(([, move]) => move.path.length <= 2)) : legalMoves;
  }, [blockedEdges, combatants, mapHeight, mapWidth, selected?.id, selectedActionPoints, selectedDragging, selectedFacing, selectedPosition, selectedProne, selectedSuppressed, tacticalMap.movementMode, tacticalMap.plannedEnemyEntryTargetId]);
  const reachableCells = useMemo(() => {
    const cells = new Map([...reachableMoves].map(([key, move]) => [key, move.destination]));
    if (selectedPosition && tacticalMap.movementMode && reachableMoves.size > 0) cells.set(pointKey(selectedPosition), selectedPosition);
    return cells;
  }, [reachableMoves, selectedPosition, tacticalMap.movementMode]);
  const validMeleeDiveTargetIds = new Set(selected && tacticalMap.movementMode === "trot" && !selectedProne && !selectedSuppressed && !selectedDragging
    ? combatants.filter((unit) => unit.side === "enemy" && !unit.defeated && reachableMoves.has(pointKey(unit.position))).map((unit) => unit.id)
    : []);
  const plannedMove = tacticalMap.plannedDestination ? reachableMoves.get(pointKey(tacticalMap.plannedDestination)) ?? null : null;
  const coveringFireTargetOptions = useMemo(() => selected && tacticalMap.coveringFireTargeting ? validCoveringFireTargets(tacticalMap.scenario, selected.id) : [], [selected, tacticalMap.coveringFireTargeting, tacticalMap.scenario]);
  const plannedCoveringFireCells = selectedPosition && selected?.weapon && tacticalMap.plannedCoveringFireTarget ? coveringFireDangerSpaceCells(tacticalMap.scenario, selectedPosition, tacticalMap.plannedCoveringFireTarget, selected.weapon.extremeRange) : [];
  const plannedGrenadeBlastCells = tacticalMap.plannedGrenadeTarget ? tacticalMap.grenadeKind === "smoke" ? grenadeBlastCells(tacticalMap.scenario, tacticalMap.plannedGrenadeTarget) : collateralBlastCells(tacticalMap.scenario, tacticalMap.plannedGrenadeTarget) : [];

  return <>
    <color attach="background" args={["#050a12"]} />
    <ambientLight intensity={1.4} />
    <directionalLight position={[5, 10, 6]} intensity={2.2} castShadow />
    <OrthographicCamera makeDefault position={[focusX + 8, 12, focusZ + 10]} zoom={42} near={0.1} far={300} />
    <OrbitControls makeDefault target={[focusX, 0, focusZ]} enableDamping dampingFactor={0.12} screenSpacePanning minZoom={8} maxZoom={120} minPolarAngle={0.2} maxPolarAngle={Math.PI / 2.05} />
    <TacticalGrid width={mapWidth} height={mapHeight} gridSize={tacticalMap.gridSize} onSelectCell={(point) => tacticalMap.coveringFireTargeting ? dispatch(previewTacticalCoveringFire(point)) : tacticalMap.grenadeTargeting ? dispatch(previewTacticalGrenadeTarget(point)) : dispatch(previewTacticalMove(reachableMoves.has(pointKey(point)) ? point : null))} />
    {!tacticalMap.coveringFireTargeting && !tacticalMap.grenadeTargeting && <MovementPerimeter cells={reachableCells} width={mapWidth} height={mapHeight} />}
    {tacticalMap.coveringFireTargeting && <CoveringFirePreview cells={coveringFireTargetOptions} width={mapWidth} height={mapHeight} color="#64748b" />}
    {selectedPosition && tacticalMap.plannedCoveringFireTarget && <CoveringFirePreview cells={plannedCoveringFireCells} width={mapWidth} height={mapHeight} color="#94a3b8" />}
    {tacticalMap.coveringFireLanes.map((lane) => {
      const attacker = combatants.find((unit) => unit.id === lane.attackerId);
      return attacker ? <CoveringFirePreview key={lane.attackerId} cells={lane.cells} width={mapWidth} height={mapHeight} color="#ef4444" /> : null;
    })}
    {tacticalMap.plannedGrenadeTarget && <BlastAreaPreview center={tacticalMap.plannedGrenadeTarget} cells={plannedGrenadeBlastCells} width={mapWidth} height={mapHeight} resolved={false} label={`${tacticalMap.grenadeKind === "smoke" ? "Smoke" : "Grenade"} target`} color={tacticalMap.grenadeKind === "smoke" ? "#94a3b8" : undefined} />}
    {tacticalMap.lastGrenadeImpact && <BlastAreaPreview center={tacticalMap.lastGrenadeImpact.landing} cells={tacticalMap.lastGrenadeImpact.blastCells} width={mapWidth} height={mapHeight} resolved label={`${tacticalMap.lastGrenadeImpact.kind === "smoke" ? "Smoke" : "Grenade"} impact`} color={tacticalMap.lastGrenadeImpact.kind === "smoke" ? "#64748b" : undefined} />}
    {tacticalMap.lastWeaponImpact && <BlastAreaPreview center={tacticalMap.lastWeaponImpact.point} cells={tacticalMap.lastWeaponImpact.blastCells} width={mapWidth} height={mapHeight} resolved label={`${tacticalMap.lastWeaponImpact.weaponName} ${tacticalMap.lastWeaponImpact.ammunitionLabel} impact`} />}
    {tacticalMap.lastSatchelImpact && <BlastAreaPreview center={tacticalMap.lastSatchelImpact.point} cells={tacticalMap.lastSatchelImpact.blastCells} width={mapWidth} height={mapHeight} resolved label="Satchel impact · penetration 30" color="#f97316" />}
    <SatchelChargeMarkers charges={tacticalMap.satchelCharges} width={mapWidth} height={mapHeight} />
    <FireArea cells={tacticalMap.scenario.fireCells ?? []} selected={tacticalMap.plannedExtinguishFire ?? null} width={mapWidth} height={mapHeight} />
    <SmokeArea cells={tacticalMap.scenario.smokeCells ?? []} width={mapWidth} height={mapHeight} />
    {wallRuns.map((run) => <TacticalWallRun key={run.segmentIds.join(":")} run={run} mapWidth={mapWidth} mapHeight={mapHeight} />)}
    {TACTICAL_WALL_CORNERS.map((corner) => <mesh key={`${corner.x}:${corner.y}`} position={[corner.x - mapWidth / 2, TACTICAL_WALL_CENTER_Y, corner.y - mapHeight / 2]} castShadow receiveShadow>
      <boxGeometry args={[0.22, TACTICAL_WALL_HEIGHT, 0.22]} />
      <meshStandardMaterial color="#64748b" roughness={0.72} metalness={0.22} />
    </mesh>)}
    {tacticalTerrain.map((object) => <TacticalTerrainPiece key={object.id} object={object} mapWidth={mapWidth} mapHeight={mapHeight} selected={tacticalMap.selectedTerrainObjectId === object.id} terminalActive={object.kind === "terminal" && Boolean(tacticalMap.terminalActiveById[object.id])} damage={tacticalMap.terrainDamageById[object.id] ?? 0} onSelect={(point) => tacticalMap.coveringFireTargeting ? dispatch(previewTacticalCoveringFire(point)) : dispatch(selectTacticalTerrainObject(object.id))} />)}
    {selectedPosition && plannedMove && <MovementPreview origin={selectedPosition} path={plannedMove.path} destination={plannedMove.destination} width={mapWidth} height={mapHeight} />}
    {combatants.map((combatant) => {
      const animation = tacticalMap.movementAnimationByCharacterId[combatant.id];
      const worldMovement = animation ? { ...animation, path: animation.path.map((point) => [point.x + 0.5 - mapWidth / 2, 0.02, point.y + 0.5 - mapHeight / 2] as [number, number, number]) } : undefined;
      return <MapCombatant key={combatant.id} combatant={combatant} mapWidth={mapWidth} mapHeight={mapHeight} movement={worldMovement} selected={selected?.id === combatant.id} targetable={validTargetIds.has(combatant.id) || validMeleeTargetIds.has(combatant.id) || validMeleeDiveTargetIds.has(combatant.id)} targeted={tacticalMap.plannedAttackTargetId === combatant.id || tacticalMap.plannedMeleeTargetId === combatant.id} onSelect={() => {
        if (tacticalMap.coveringFireTargeting) {
          dispatch(previewTacticalCoveringFire(combatant.position));
          return;
        }
        if (combatant.side === "enemy") {
          if (tacticalMap.grenadeTargeting) {
            dispatch(previewTacticalGrenadeTarget(combatant.position));
            return;
          }
          if (validMeleeDiveTargetIds.has(combatant.id)) {
            dispatch(previewTacticalMeleeDive(combatant.id));
            return;
          }
          if (validTargetIds.has(combatant.id)) {
            dispatch(selectTacticalAttackTarget(combatant.id));
            return;
          }
          if (validMeleeTargetIds.has(combatant.id)) dispatch(previewTacticalMelee(combatant.id));
          return;
        }
        dispatch(activateTacticalCharacter(combatant.id));
        dispatch(setSelectedProfileCharacter(combatant.sourceCharacterId ?? combatant.id));
      }} />;
    })}
  </>;
};

const TacticalCharacterButton = ({ character, actionPoints, selected, onSelect }: { character: CharacterSummary; actionPoints: number; selected: boolean; onSelect: () => void }) => {
  const portraitPath = character.avatar?.currentPortraitPath ?? null;
  const [failedPortraitPath, setFailedPortraitPath] = useState<string | null>(null);
  const showPortrait = portraitPath && failedPortraitPath !== portraitPath;

  return <button type="button" disabled={actionPoints < 1} onClick={onSelect} aria-label={`Select ${character.name}, ${actionPoints} AP`} aria-pressed={selected} title={`Select ${character.name} · ${actionPoints} AP`} className={`group relative flex h-16 w-16 shrink-0 flex-col items-center justify-end border p-1 transition-colors ${selected ? "border-yellow-200 bg-yellow-300/20 text-yellow-50 shadow-[0_0_12px_rgba(250,204,21,0.35)]" : "border-(--hud-border) bg-(--hud-bg)/90 text-(--hud-text-dim) hover:border-cyan-300 hover:text-(--hud-text)"} disabled:cursor-not-allowed disabled:grayscale disabled:opacity-45`}>
    <span className="absolute right-0.5 top-0.5 border border-emerald-400/60 bg-emerald-950 px-1 text-[7px] text-emerald-100">{actionPoints} AP</span>
    <span className="relative mb-1 h-10 w-10 overflow-hidden rounded-sm border border-(--hud-border-subtle) bg-black/50">
      {showPortrait ? <Image src={portraitPath} alt="" fill sizes="40px" onError={() => setFailedPortraitPath(portraitPath)} className="object-cover" /> : <span className="flex h-full w-full items-center justify-center text-sm font-bold uppercase">{character.name.slice(0, 1)}</span>}
    </span>
    <span className="w-full truncate text-center text-[7px] font-bold leading-none">{character.name}</span>
  </button>;
};

const TacticalEnemyStatusCard = ({ combatant, state, sight, selected, onSelect }: { combatant: Combatant; state: string; sight: "target" | "los" | "no-los"; selected: boolean; onSelect: () => void }) => {
  const wound = `${combatant.woundState}${(combatant.seriousWounds ?? 0) > 0 ? ` · serious ${combatant.seriousWounds}/2` : ""}`;
  const sightLabel = sight === "target" ? "Target" : sight === "los" ? "LOS" : "No LOS";
  return <button type="button" disabled={sight !== "target"} onClick={onSelect} aria-label={`${sight === "target" ? "Target" : "Enemy"} ${combatant.name}, ${sightLabel}, state ${state}, wound ${wound}`} aria-pressed={selected} className={`relative flex h-16 w-24 shrink-0 flex-col justify-end border p-1 text-left transition-colors ${selected ? "border-red-100 bg-red-500/25 text-red-50 shadow-[0_0_12px_rgba(248,113,113,0.4)]" : sight === "target" ? "border-red-300 bg-red-950/80 text-red-100 hover:bg-red-900/80" : sight === "los" ? "border-red-500/50 bg-red-950/50 text-red-200" : "border-slate-600/60 bg-slate-950/80 text-slate-500"} disabled:cursor-not-allowed`}>
    <span className="absolute left-1 top-1 flex h-7 w-7 items-center justify-center border border-red-400/40 bg-black/60 text-xs font-bold uppercase">{combatant.name.slice(0, 1)}</span>
    <span className={`absolute right-1 top-1 border px-1 text-[6px] font-bold uppercase ${sight === "target" ? "border-red-300 bg-red-950 text-red-100" : sight === "los" ? "border-amber-300/70 bg-amber-950 text-amber-100" : "border-slate-600 bg-slate-950 text-slate-400"}`}>{sightLabel}</span>
    <span className="w-full truncate text-[7px] font-bold leading-none">{combatant.name}</span>
    <span className="mt-1 w-full truncate text-[6px] uppercase leading-none">State: {state}</span>
    <span className="mt-0.5 w-full truncate text-[6px] uppercase leading-none">Wound: {wound}</span>
  </button>;
};

const TacticalMapPageClient = () => {
  const dispatch = useAppDispatch();
  const status = useAppSelector(selectCharactersStatus);
  const allCharacters = useAppSelector(selectCharacters);
  const ship = useAppSelector(selectActiveShip);
  const shipStatus = useAppSelector(selectShipStatus);
  const characters = useMemo(() => {
    const charactersById = new Map(allCharacters.map((character) => [character.id, character]));
    return (ship?.crew ?? []).flatMap((member) => member.characterId ? charactersById.get(member.characterId) ?? [] : []).slice(0, 2);
  }, [allCharacters, ship?.crew]);
  const selected = useAppSelector(selectSelectedProfileCharacter);
  const combat = useAppSelector((state) => state.plugins.characterCombat);
  const tacticalMap = combat.tacticalMap ?? DEFAULT_MAP;
  const tacticalScenarioStatus = tacticalMap.scenarioStatus ?? "active";
  const scenarioHudLayout = tacticalMap.scenarioHudLayout ?? { visible: true, pinned: false, position: { x: 320, y: 190 } };
  const enemies = tacticalMap.scenario.combatants.filter((unit) => unit.side === "enemy");
  const activeCombatant = tacticalMap.scenario.combatants.find((unit) => unit.id === tacticalMap.activeCharacterId && unit.side === "player") ?? null;
  const selectedCrewMember = activeCombatant ? characters.find((character) => character.id === (activeCombatant.sourceCharacterId ?? activeCombatant.id)) ?? null : null;
  const selectedPosition = activeCombatant?.position ?? null;
  const selectedActionPoints = activeCombatant ? tacticalMap.actionPointsByCharacterId[activeCombatant.id] ?? 0 : 0;
  const selectedProne = activeCombatant?.posture === "prone";
  const selectedSuppressed = Boolean(activeCombatant && tacticalMap.suppressedCombatantIds.includes(activeCombatant.id));
  const selectedBraced = Boolean(activeCombatant && tacticalMap.bracedCombatantIds.includes(activeCombatant.id));
  const draggedCombatant = activeCombatant ? tacticalMap.scenario.combatants.find((unit) => unit.id === tacticalMap.draggingCombatantByCarrierId[activeCombatant.id]) ?? null : null;
  const draggableAllies = activeCombatant && !draggedCombatant ? tacticalMap.scenario.combatants.filter((unit) => unit.side === activeCombatant.side && unit.defeated && unit.woundState !== "dead" && Math.abs(unit.position.x - activeCombatant.position.x) + Math.abs(unit.position.y - activeCombatant.position.y) === 1 && !Object.values(tacticalMap.draggingCombatantByCarrierId).includes(unit.id)) : [];
  const livingPlayerIds = tacticalMap.scenario.combatants.filter((unit) => unit.side === "player" && !unit.defeated).map((unit) => unit.id);
  const playerPhaseComplete = livingPlayerIds.length > 0 && livingPlayerIds.every((id) => tacticalMap.actedCharacterIds.includes(id) || (tacticalMap.actionPointsByCharacterId[id] ?? 0) === 0);
  const tacticalTerrain = useMemo(() => TACTICAL_TERRAIN.filter((object) => !tacticalMap.destroyedTerrainObjectIds.includes(object.id)).map((object) => object.kind === "door" ? { ...object, open: tacticalMap.doorOpenById[object.id] ?? object.open } : object), [tacticalMap.destroyedTerrainObjectIds, tacticalMap.doorOpenById]);
  const blockedEdges = useMemo(() => tacticalTerrainBlockedEdges(tacticalTerrain), [tacticalTerrain]);
  const selectedTerrain = tacticalTerrain.find((object) => object.id === tacticalMap.selectedTerrainObjectId) ?? null;
  const terrainInteractionCost = selectedTerrain?.kind === "door" ? 2 : selectedTerrain?.kind === "terminal" ? 6 : 0;
  const selectedDoorCommand = selectedTerrain?.kind === "door" ? tacticalMap.pendingDoorCommandsById[selectedTerrain.id] : null;
  const phaseStartPosition = activeCombatant ? tacticalMap.actionPhaseStartPositionByCombatantId[activeCombatant.id] : null;
  const terrainAdjacent = Boolean(selectedTerrain && (selectedTerrain.kind === "door"
    ? phaseStartPosition && [selectedTerrain.separates.first, selectedTerrain.separates.second].some((point) => point.x === phaseStartPosition.x && point.y === phaseStartPosition.y)
    : selectedTerrain.kind === "terminal" && selectedPosition && Math.abs(selectedTerrain.position.x - selectedPosition.x) + Math.abs(selectedTerrain.position.y - selectedPosition.y) === 1));
  const terminalAlreadyActive = selectedTerrain?.kind === "terminal" && Boolean(tacticalMap.terminalActiveById[selectedTerrain.id]);
  const selectedWeapon = activeCombatant?.weapon ?? null;
  const selectedAmmunition = activeCombatant ? tacticalMap.ammunitionByCharacterId[activeCombatant.id] ?? 0 : 0;
  const coveringFireAmmunition = selectedWeapon?.burstSize ?? (selectedWeapon?.automatic ? 3 : 1);
  const coveringFireWeaponReady = Boolean(selectedWeapon && (!selectedWeapon.highEnergy || selectedBraced));
  const plannedCoveringFireCells = selectedPosition && selectedWeapon && tacticalMap.plannedCoveringFireTarget ? coveringFireDangerSpaceCells(tacticalMap.scenario, selectedPosition, tacticalMap.plannedCoveringFireTarget, selectedWeapon.extremeRange) : [];
  const plannedGrenadeBlastCells = tacticalMap.plannedGrenadeTarget ? tacticalMap.grenadeKind === "smoke" ? grenadeBlastCells(tacticalMap.scenario, tacticalMap.plannedGrenadeTarget) : collateralBlastCells(tacticalMap.scenario, tacticalMap.plannedGrenadeTarget) : [];
  const adjacentFireCells = activeCombatant ? (tacticalMap.scenario.fireCells ?? []).filter((fire) => Math.abs(fire.x - activeCombatant.position.x) + Math.abs(fire.y - activeCombatant.position.y) === 1) : [];
  const plannedExtinguishFire = tacticalMap.plannedExtinguishFire && adjacentFireCells.some((fire) => pointKey(fire) === pointKey(tacticalMap.plannedExtinguishFire!)) ? tacticalMap.plannedExtinguishFire : null;
  const satchelsInActiveSquare = activeCombatant ? tacticalMap.satchelCharges.filter((charge) => pointKey(charge.position) === pointKey(activeCombatant.position)) : [];
  const satchelsPlacedByActiveCharacter = activeCombatant ? tacticalMap.satchelCharges.filter((charge) => charge.placerId === activeCombatant.id) : [];
  const treatmentTargets = activeCombatant ? treatableAllies(tacticalMap.scenario, activeCombatant.id) : [];
  const plannedTreatmentTarget = treatmentTargets.find((unit) => unit.id === tacticalMap.plannedTreatmentTargetId) ?? null;
  const rangedTargets = activeCombatant && !draggedCombatant ? rangedEnemies(tacticalMap.scenario, activeCombatant.id) : [];
  const meleeTargets = activeCombatant && !draggedCombatant ? meleeEnemies(tacticalMap.scenario, activeCombatant.id) : [];
  const rangedTargetIds = new Set(rangedTargets.map((unit) => unit.id));
  const meleeTargetIds = new Set(meleeTargets.map((unit) => unit.id));
  const plannedDestinationKey = tacticalMap.plannedDestination ? pointKey(tacticalMap.plannedDestination) : null;
  const plannedMeleeDiveTarget = tacticalMap.movementMode === "trot" && plannedDestinationKey
    ? tacticalMap.scenario.combatants.find((unit) => unit.id === tacticalMap.plannedMeleeTargetId && pointKey(unit.position) === plannedDestinationKey) ?? null
    : null;
  const plannedMeleeTarget = plannedMeleeDiveTarget ? null : meleeTargets.find((unit) => unit.id === tacticalMap.plannedMeleeTargetId) ?? null;
  const plannedAttackTarget = tacticalMap.scenario.combatants.find((unit) => unit.id === tacticalMap.plannedAttackTargetId) ?? null;
  const plannedAttackProfile = activeCombatant && plannedAttackTarget ? snapShotTarget(activeCombatant, plannedAttackTarget) : null;
  const plannedAttackCover = activeCombatant && plannedAttackTarget ? coverProtection(tacticalMap.scenario, activeCombatant.id, plannedAttackTarget.id) : 0;
  const plannedAttackAccuracy = selectedWeapon && plannedAttackProfile ? weaponAccuracyForRange(selectedWeapon, plannedAttackProfile.rangeBand) : 0;
  const plannedAttackPenetration = selectedWeapon && plannedAttackProfile ? weaponPenetrationForRange(selectedWeapon, plannedAttackProfile.rangeBand) : 0;
  const plannedAutomaticModifier = selectedWeapon?.automatic && plannedAttackProfile ? automaticFireModifierForRange(plannedAttackProfile.rangeBand, selectedWeapon.automaticFireBonusByRange) : null;
  const plannedAutomaticRisks = activeCombatant && plannedAttackTarget ? automaticFireSecondaryTargets(tacticalMap.scenario, activeCombatant.id, plannedAttackTarget.id) : [];
  const structuralWeaponEligible = Boolean(selectedWeapon && (selectedWeapon.highEnergy ? selectedBraced : selectedWeapon.structuralDamage));
  const selectedStructure = selectedTerrain?.kind === "wall" || selectedTerrain?.kind === "door" ? selectedTerrain : null;
  const selectedStructureThreshold = selectedStructure?.kind === "door" ? 5 : 25;
  const selectedStructureDamage = selectedStructure ? tacticalMap.terrainDamageById[selectedStructure.id] ?? 0 : 0;
  const activeOccupantsByCell = activeOccupantCounts(tacticalMap.scenario.combatants, activeCombatant?.id);
  const previewedMoves = selectedPosition && activeCombatant && tacticalMap.movementMode
    ? selectedProne
      ? new Map()
      : new Map([...(tacticalMap.movementMode === "sidestep"
        ? sidestepAndBackstepMoves({ width: tacticalMap.scenario.width, height: tacticalMap.scenario.height, origin: selectedPosition, facing: activeCombatant.facing, allowance: selectedActionPoints, blockedCells: TACTICAL_BLOCKED_CELLS, blockedEdges, activeOccupantsByCell })
        : reachableOpenMapMovement({ width: tacticalMap.scenario.width, height: tacticalMap.scenario.height, origin: selectedPosition, facing: activeCombatant.facing, allowance: Math.min(6, selectedActionPoints), trotting: tacticalMap.movementMode === "trot", blockedCells: TACTICAL_BLOCKED_CELLS, blockedEdges, activeOccupantsByCell }))]
        .filter(([, move]) => tacticalMap.movementMode === "evade" ? move.path.length === 1 && (activeOccupantsByCell.get(pointKey(move.destination)) ?? 0) === 0 : (!selectedSuppressed && !draggedCombatant) || move.path.length <= 2))
    : null;
  const previewedMove = tacticalMap.plannedDestination ? previewedMoves?.get(pointKey(tacticalMap.plannedDestination)) ?? null : null;
  const selectedEnteredEnemySquare = Boolean(activeCombatant && tacticalMap.enemySquareEnteredCombatantIds.includes(activeCombatant.id));
  const enemyEntryOptions = activeCombatant && tacticalMap.movementMode === "walk" && !selectedProne && !draggedCombatant && !selectedEnteredEnemySquare
    ? enemies.filter((enemy) => !enemy.defeated).flatMap((enemy) => {
      const move = previewedMoves?.get(pointKey(enemy.position));
      if (!move || (selectedSuppressed && move.path.length > 2)) return [];
      return [{ enemy, move }];
    })
    : [];
  const plannedEnemyEntryTarget = tacticalMap.plannedEnemyEntryTargetId ? enemies.find((enemy) => enemy.id === tacticalMap.plannedEnemyEntryTargetId) ?? null : null;
  const pendingAdjacencyReaction = tacticalMap.pendingAdjacencyReaction;
  const adjacencyDefender = tacticalMap.scenario.combatants.find((unit) => unit.id === pendingAdjacencyReaction?.defenderIds[0]) ?? null;
  const adjacencyMover = tacticalMap.scenario.combatants.find((unit) => unit.id === pendingAdjacencyReaction?.moverId) ?? null;
  const enemyPhaseRolls = () => {
    const activeEnemies = tacticalMap.scenario.combatants.filter((unit) => unit.side === "enemy" && !unit.defeated);
    const rollsFor = () => ({ hitDice: rollDicePair(), woundDice: rollDicePair() });
    return {
      enemyRolls: Object.fromEntries(activeEnemies.map((enemy) => [enemy.id, rollsFor()])),
      coveringFireRolls: Object.fromEntries(tacticalMap.coveringFireLanes.map((lane) => [lane.attackerId, Object.fromEntries(tacticalMap.scenario.combatants.map((unit) => [unit.id, rollsFor()]))])),
      dangerSpaceRolls: Object.fromEntries(activeEnemies.map((enemy) => [enemy.id, Object.fromEntries(tacticalMap.scenario.combatants.map((unit) => [unit.id, rollsFor()]))])),
      coweringRecoveryRolls: Object.fromEntries((tacticalMap.coweringCombatantIds ?? []).map((id) => [id, rollDicePair()])),
      casualtyMoraleRolls: Object.fromEntries(tacticalMap.scenario.combatants.map((witness) => [witness.id, Object.fromEntries(tacticalMap.scenario.combatants.map((casualty) => [casualty.id, rollDicePair()]))])),
      unexpectedFireMoraleRolls: Object.fromEntries(tacticalMap.scenario.combatants.map((target) => [target.id, Object.fromEntries(tacticalMap.scenario.combatants.map((attacker) => [attacker.id, rollDicePair()]))])),
      coveringFireMoraleRolls: Object.fromEntries(activeEnemies.map((enemy) => [enemy.id, rollDicePair()])),
      movingAdjacentMoraleRolls: Object.fromEntries(activeEnemies.map((enemy) => [enemy.id, rollDicePair()])),
      movingAdjacentSnapRolls: Object.fromEntries(activeEnemies.map((enemy) => [enemy.id, { hitDice: rollDicePair(), woundDice: rollDicePair() }])),
    };
  };
  const completeAdjacencyReaction = (fire: boolean) => {
    dispatch(resolveTacticalAdjacencyReaction({ fire, hitDice: rollDicePair(), woundDice: rollDicePair() }));
    dispatch(runTacticalEnemyPhase(enemyPhaseRolls()));
  };
  const completeCoveringFireSnap = (fire: boolean, targetId?: string) => dispatch(resolveTacticalCoveringFireSnap({
    fire,
    targetId,
    hitDice: rollDicePair(),
    woundDice: rollDicePair(),
    phaseRolls: enemyPhaseRolls(),
  }));

  useEffect(() => { if (status === "idle") void dispatch(fetchCharacters()); }, [dispatch, status]);
  useEffect(() => {
    if (status === "loaded" && shipStatus === "loaded") dispatch(initializeTacticalMap(characters.map((character) => ({ id: character.id, name: character.name, weaponSkill: character.skills.find((skill) => skill.name === "Gun Combat")?.level ?? 0, meleeRating: character.skills.find((skill) => skill.name === "Melee")?.level ?? 0 }))));
  }, [characters, dispatch, shipStatus, status]);
  useEffect(() => {
    const profileId = activeCombatant?.sourceCharacterId ?? activeCombatant?.id ?? null;
    if (profileId && selected?.id !== profileId) dispatch(setSelectedProfileCharacter(profileId));
  }, [activeCombatant?.id, activeCombatant?.sourceCharacterId, dispatch, selected?.id]);

  const hiddenHuds = [
    ...(!tacticalMap.characterHudLayout.visible ? [{ id: "characters", title: "Characters" }] : []),
    ...(!tacticalMap.enemyHudLayout.visible ? [{ id: "enemies", title: "Enemies" }] : []),
    ...(!tacticalMap.actionHudLayout.visible ? [{ id: "action", title: "Current Action" }] : []),
    ...(!tacticalMap.characterInformationHudLayout.visible ? [{ id: "character-information", title: "Selected Character" }] : []),
    ...(!tacticalMap.eventsHudLayout.visible ? [{ id: "events", title: "Events" }] : []),
    ...(!scenarioHudLayout.visible ? [{ id: "scenario", title: "Scenario" }] : []),
  ];

  return <main className="h-screen w-screen overflow-hidden bg-[#050a12] [--hud-accent:#a5f3fc] [--hud-bg:#071019] [--hud-border:#42616e] [--hud-border-subtle:#29434d] [--hud-text:#e2f3f6] [--hud-text-dim:#8faab3]">
    <PluginHudLayer hiddenHuds={hiddenHuds} onRestoreHud={(id) => {
      if (id === "action") dispatch(updateTacticalActionHud({ ...tacticalMap.actionHudLayout, visible: true }));
      else if (id === "enemies") dispatch(updateTacticalEnemyHud({ ...tacticalMap.enemyHudLayout, visible: true }));
      else if (id === "character-information") dispatch(updateTacticalCharacterInformationHud({ ...tacticalMap.characterInformationHudLayout, visible: true }));
      else if (id === "events") dispatch(updateTacticalEventsHud({ ...tacticalMap.eventsHudLayout, visible: true }));
      else if (id === "scenario") dispatch(updateTacticalScenarioHud({ ...scenarioHudLayout, visible: true }));
      else dispatch(updateTacticalCharacterHud({ ...tacticalMap.characterHudLayout, visible: true }));
    }}>
      <Canvas shadows frameloop="demand" dpr={[1, 1.5]} onPointerMissed={() => { dispatch(setSelectedProfileCharacter(null)); dispatch(selectTacticalTerrainObject(null)); }}>
        <TacticalScene />
      </Canvas>
      <div className="pointer-events-none absolute left-4 top-4 border border-cyan-500/50 bg-slate-950/90 px-3 py-2 font-mono text-cyan-100 shadow-lg">
        <div className="text-xs font-bold uppercase tracking-[0.22em]">Tactical Map</div>
        <div className="mt-1 text-[10px] text-slate-400">Turn {tacticalMap.turn} · {tacticalMap.scenario.width}×{tacticalMap.scenario.height} implicit grid · {characters.length}/2 crew members</div>
        <div className="mt-1 text-[9px] uppercase tracking-wider text-slate-500">Drag to rotate · Right-drag to pan · Wheel to zoom</div>
      </div>
      <Link href="/system" className="absolute right-4 top-14 z-40 border border-cyan-400/70 bg-slate-950/90 px-3 py-2 font-mono text-xs font-bold uppercase tracking-[0.18em] text-cyan-100 hover:bg-cyan-950">System view</Link>
      <FloatingPluginHud title="Scenario" layout={scenarioHudLayout} onLayoutChange={(layout) => dispatch(updateTacticalScenarioHud(layout))} className="w-72 font-mono text-[8px] uppercase tracking-wider text-(--hud-text)">
        <div className="flex flex-col gap-2 normal-case tracking-normal">
          <div className="flex items-center justify-between gap-3 uppercase tracking-wider">
            <span className="font-bold text-cyan-100">{tacticalMap.scenario.title}</span>
            <span className={tacticalScenarioStatus === "victory" ? "text-emerald-200" : tacticalScenarioStatus === "defeat" ? "text-red-200" : "text-cyan-200"}>{tacticalScenarioStatus}</span>
          </div>
          <div className="text-(--hud-text-dim)">{tacticalMap.scenario.briefing}</div>
          <div className="border-t border-(--hud-border) pt-2"><span className="uppercase text-(--hud-text-dim)">Objective</span><div className="mt-1 font-bold text-(--hud-text)">{tacticalMap.scenario.objective}</div></div>
          <div className="text-(--hud-text-dim)">Turn {tacticalMap.turn}</div>
        </div>
      </FloatingPluginHud>
      <FloatingPluginHud title="Characters" layout={tacticalMap.characterHudLayout} onLayoutChange={(layout) => dispatch(updateTacticalCharacterHud(layout))} className="font-mono text-[8px] uppercase tracking-wider text-(--hud-text)">
        <nav aria-label="Tactical character roster" className="flex max-w-[75vw] gap-1 p-1">
          {characters.map((character) => <TacticalCharacterButton key={character.id} character={character} actionPoints={tacticalMap.actionPointsByCharacterId[character.id] ?? 0} selected={activeCombatant?.id === character.id} onSelect={() => { dispatch(activateTacticalCharacter(character.id)); dispatch(setSelectedProfileCharacter(character.id)); }} />)}
          {status === "loaded" && shipStatus === "loaded" && characters.length === 0 && <span className="px-3 py-4 text-(--hud-text-dim)">No assigned character crew</span>}
        </nav>
      </FloatingPluginHud>
      <FloatingPluginHud title="Enemies" layout={tacticalMap.enemyHudLayout} onLayoutChange={(layout) => dispatch(updateTacticalEnemyHud(layout))} className="font-mono text-[8px] uppercase tracking-wider text-(--hud-text)">
        <nav aria-label="Tactical enemy roster" className="flex max-w-[75vw] gap-1 overflow-x-auto p-1">
          {enemies.map((enemy) => {
            const targetable = rangedTargetIds.has(enemy.id) || meleeTargetIds.has(enemy.id);
            const inLineOfSight = Boolean(activeCombatant && visibilityAssessment(tacticalMap.scenario, activeCombatant, enemy).visible);
            const sight = targetable ? "target" as const : inLineOfSight ? "los" as const : "no-los" as const;
            const state = enemy.surrendered
              ? "Surrendered"
              : enemy.woundState === "dead"
                ? "Dead"
                : enemy.defeated
                  ? "Incapacitated"
                  : tacticalMap.ahlMeleeStunUntilTurnById[enemy.id]
                    ? "Stunned"
                    : tacticalMap.suppressedCombatantIds.includes(enemy.id)
                      ? "Suppressed"
                      : enemy.posture === "prone"
                        ? "Prone"
                        : "Active";
            return <TacticalEnemyStatusCard key={enemy.id} combatant={enemy} state={state} sight={sight} selected={tacticalMap.plannedAttackTargetId === enemy.id || tacticalMap.plannedMeleeTargetId === enemy.id} onSelect={() => {
              if (rangedTargetIds.has(enemy.id)) dispatch(selectTacticalAttackTarget(enemy.id));
              else if (meleeTargetIds.has(enemy.id)) dispatch(previewTacticalMelee(enemy.id));
            }} />;
          })}
          {enemies.length === 0 && <span className="px-3 py-4 text-(--hud-text-dim)">No enemies</span>}
        </nav>
      </FloatingPluginHud>
      <FloatingPluginHud title="Selected Character" layout={tacticalMap.characterInformationHudLayout} onLayoutChange={(layout) => dispatch(updateTacticalCharacterInformationHud(layout))} className="w-60 font-mono text-[8px] uppercase tracking-wider text-(--hud-text)">
        {activeCombatant ? <div className="grid grid-cols-2 gap-x-3 gap-y-1 normal-case tracking-normal">
          <span className="text-(--hud-text-dim)">Name</span><span>{activeCombatant.name}</span>
          <span className="text-(--hud-text-dim)">Position</span><span>{activeCombatant.position.x}, {activeCombatant.position.y}</span>
          <span className="text-(--hud-text-dim)">Facing</span><span>{activeCombatant.facing}</span>
          <span className="text-(--hud-text-dim)">AP</span><span>{selectedActionPoints}/6</span>
          <span className="text-(--hud-text-dim)">Weapon</span><span>{activeCombatant.weapon.name} · skill +{activeCombatant.weaponSkill}</span>
          <span className="text-(--hud-text-dim)">Ammo</span><span>{selectedAmmunition}/{activeCombatant.weapon.magazineSize ?? 12}</span>
          <span className="text-(--hud-text-dim)">Ranges</span><span>{activeCombatant.weapon.effectiveRange}/{activeCombatant.weapon.longRange}/{activeCombatant.weapon.extremeRange}</span>
          <span className="text-(--hud-text-dim)">Pen / Auto</span><span>+{activeCombatant.weapon.penetration} / {activeCombatant.weapon.automatic ? "yes" : "no"}</span>
          <span className="text-(--hud-text-dim)">Grenades</span><span>{activeCombatant.grenades}</span>
          <span className="text-(--hud-text-dim)">Smoke grenades</span><span>{activeCombatant.smokeGrenades ?? 0}</span>
          <span className="text-(--hud-text-dim)">Satchel charges</span><span>{activeCombatant.breachingCharges ?? 0}</span>
          <span className="text-(--hud-text-dim)">Medkits</span><span>{activeCombatant.medkits}</span>
          <span className="text-(--hud-text-dim)">Armor</span><span>{activeCombatant.armorName ?? "Armor"} · {activeCombatant.armor}</span>
          <span className="text-(--hud-text-dim)">Wound</span><span>{activeCombatant.woundState}{(activeCombatant.seriousWounds ?? 0) > 0 ? ` · serious ${activeCombatant.seriousWounds}/2` : ""}</span>
          <span className="text-(--hud-text-dim)">Suppression</span><span>{selectedSuppressed ? "Suppressed" : "Clear"}</span>
          <span className="text-(--hud-text-dim)">Action</span><span>{tacticalMap.actedCharacterIds.includes(activeCombatant.id) ? "Complete" : "Available"}</span>
        </div> : <div className="normal-case tracking-normal text-(--hud-text-dim)">No character selected.</div>}
      </FloatingPluginHud>
      <FloatingPluginHud title="Events" layout={tacticalMap.eventsHudLayout} onLayoutChange={(layout) => dispatch(updateTacticalEventsHud(layout))} className="w-72 font-mono text-[8px] uppercase tracking-wider text-(--hud-text)">
        {tacticalMap.events.length ? <div className="flex max-h-28 flex-col gap-1 overflow-y-auto normal-case tracking-normal">{tacticalMap.events.slice(0, 6).map((event, index) => <div key={`${index}:${event}`} className="border-b border-(--hud-border)/50 pb-1 last:border-0">{event}</div>)}</div> : <div className="normal-case tracking-normal text-(--hud-text-dim)">No events.</div>}
      </FloatingPluginHud>
      <FloatingPluginHud title="Current Action" layout={tacticalMap.actionHudLayout} onLayoutChange={(layout) => dispatch(updateTacticalActionHud(layout))} className="w-72 font-mono text-[8px] uppercase tracking-wider text-(--hud-text)">
        <section className="flex max-h-[60vh] flex-col gap-2 overflow-y-auto pr-1 normal-case tracking-normal">
          {tacticalScenarioStatus !== "active" ? <div className={`flex flex-col gap-2 border p-2 ${tacticalScenarioStatus === "victory" ? "border-emerald-300/70 text-emerald-100" : "border-red-300/70 text-red-100"}`}>
            <div className="font-bold uppercase tracking-wider">{tacticalScenarioStatus === "victory" ? "Victory — Security Terminal Secured" : "Defeat — Crew Incapacitated"}</div>
            <div className="text-(--hud-text-dim)">{tacticalScenarioStatus === "victory" ? "The Control Room Assault objective is complete." : "No crew member remains able to continue the assault."}</div>
          </div> : pendingAdjacencyReaction && adjacencyDefender && adjacencyMover ? <div className="flex flex-col gap-2 border border-red-300/70 p-2">
            <div className="font-bold uppercase tracking-wider text-red-100">Defensive Snap Shot</div>
            <div className="text-(--hud-text-dim)">{adjacencyMover.name} moved adjacent to {adjacencyDefender.name}.</div>
            <div className="text-red-100">{tacticalMap.actionPointsByCharacterId[adjacencyDefender.id] ?? 0} AP · {tacticalMap.ammunitionByCharacterId[adjacencyDefender.id] ?? 0} ammo</div>
            <div className="grid grid-cols-2 gap-1">
              <button type="button" onClick={() => completeAdjacencyReaction(true)} className="h-7 w-full border border-red-300 px-2 text-[8px] font-bold uppercase tracking-wider text-red-100">Fire · 3 AP</button>
              <button type="button" onClick={() => completeAdjacencyReaction(false)} className="h-7 w-full border border-(--hud-border) px-2 text-[8px] font-bold uppercase tracking-wider text-(--hud-text-dim)">Decline</button>
            </div>
          </div> : tacticalMap.pendingCoveringFireSnapIds.length > 0 && activeCombatant ? <div className="flex flex-col gap-2 border border-yellow-300/70 p-2">
            <div className="font-bold uppercase tracking-wider text-yellow-100">Retained Covering-Fire AP</div>
            <div className="text-(--hud-text-dim)">{activeCombatant.name} may take one legal snap shot before the next turn, or decline.</div>
            <div className="text-yellow-100">{selectedActionPoints} AP · {selectedAmmunition} ammo</div>
            {rangedTargets.map((target) => <button key={target.id} type="button" onClick={() => completeCoveringFireSnap(true, target.id)} className="h-7 w-full border border-red-300 px-2 text-[8px] font-bold uppercase tracking-wider text-red-100">Snap Shot {target.name} · 3 AP · 1 ammo</button>)}
            {rangedTargets.length === 0 && <div className="text-(--hud-text-dim)">No legal snap-shot target.</div>}
            <button type="button" onClick={() => completeCoveringFireSnap(false)} className="h-7 w-full border border-(--hud-border) px-2 text-[8px] font-bold uppercase tracking-wider text-(--hud-text-dim)">Decline</button>
          </div> : selectedCrewMember && selectedPosition ? <>
            <div className="font-bold uppercase tracking-wider text-cyan-100">{selectedCrewMember.name}</div>
            <div className="text-(--hud-text-dim)">Grid position <span className="text-(--hud-text)">{selectedPosition.x}, {selectedPosition.y}</span> · <span className="text-emerald-200">{selectedActionPoints} AP</span> · <span className={selectedProne ? "text-amber-200" : "text-(--hud-text-dim)"}>{selectedProne ? "Prone" : "Standing"}</span></div>
            {selectedWeapon?.ammunitionProfiles && selectedWeapon.ammunitionProfiles.length > 1 && <div className="space-y-1 border border-cyan-300/50 p-1">
              <div className="font-bold uppercase tracking-wider text-cyan-100">{selectedWeapon.name} ammunition</div>
              <div className="grid grid-cols-2 gap-1">
                {selectedWeapon.ammunitionProfiles.map((profile) => {
                  const selected = selectedWeapon.ammunitionKind === profile.kind;
                  const count = selected ? selectedAmmunition : activeCombatant ? tacticalMap.ammunitionByCombatantAndKind[activeCombatant.id]?.[profile.kind] ?? selectedWeapon.magazineSize ?? 12 : 0;
                  return <button key={profile.kind} type="button" disabled={count <= 0 && !selected} onClick={() => dispatch(selectTacticalWeaponAmmunition(profile.kind))} className={`h-7 w-full border px-2 text-[8px] font-bold uppercase tracking-wider disabled:cursor-not-allowed disabled:opacity-30 ${selected ? "border-cyan-200 bg-cyan-300/20 text-cyan-50" : "border-(--hud-border) text-(--hud-text-dim)"}`}>{profile.label} · {count}</button>;
                })}
              </div>
            </div>}
            {tacticalMap.coveringFireTargeting ? <div className="flex flex-col gap-2 border border-yellow-300/60 p-2">
              <div className="font-bold uppercase tracking-wider text-yellow-100">Covering Fire</div>
              <div className="text-(--hud-text-dim)">Select a map square to define the danger-space lane.</div>
              {tacticalMap.plannedCoveringFireTarget && <div className="text-yellow-100">Lane to {tacticalMap.plannedCoveringFireTarget.x}, {tacticalMap.plannedCoveringFireTarget.y} · {plannedCoveringFireCells.length} danger spaces</div>}
              <div className="grid grid-cols-2 gap-1">
                <button type="button" disabled={!tacticalMap.plannedCoveringFireTarget} onClick={() => dispatch(confirmTacticalCoveringFire())} className="h-7 w-full border border-yellow-300 px-2 text-[8px] font-bold uppercase tracking-wider text-yellow-100 disabled:cursor-not-allowed disabled:opacity-40">Confirm Lane</button>
                <button type="button" onClick={() => dispatch(cancelTacticalCoveringFire())} className="h-7 w-full border border-(--hud-border) px-2 text-[8px] font-bold uppercase tracking-wider text-(--hud-text-dim)">Cancel</button>
              </div>
            </div> : <button type="button" disabled={Boolean(draggedCombatant) || tacticalMap.grenadeTargeting || selectedActionPoints < 3 || selectedAmmunition < coveringFireAmmunition || !coveringFireWeaponReady} onClick={() => dispatch(beginTacticalCoveringFire())} className="h-7 w-full border border-yellow-300 px-2 text-[8px] font-bold uppercase tracking-wider text-yellow-100 disabled:cursor-not-allowed disabled:opacity-40">Covering Fire · 3 AP · reserve {coveringFireAmmunition} ammo</button>}
            {tacticalMap.grenadeTargeting ? <div className={`flex flex-col gap-2 border p-2 ${tacticalMap.grenadeKind === "smoke" ? "border-slate-300/60" : "border-pink-300/60"}`}>
              <div className={`font-bold uppercase tracking-wider ${tacticalMap.grenadeKind === "smoke" ? "text-slate-100" : "text-pink-100"}`}>{tacticalMap.grenadeKind === "smoke" ? "Smoke Grenade" : "Fragmentation Grenade"}</div>
              <div className="text-(--hud-text-dim)">Select a map square. {tacticalMap.grenadeKind === "smoke" ? "Grey markers show the smoke area." : "Pink markers show the possible blast area."}</div>
              {tacticalMap.plannedGrenadeTarget && <div className={tacticalMap.grenadeKind === "smoke" ? "text-slate-100" : "text-pink-100"}>Target {tacticalMap.plannedGrenadeTarget.x}, {tacticalMap.plannedGrenadeTarget.y} · {plannedGrenadeBlastCells.length} {tacticalMap.grenadeKind === "smoke" ? "smoke" : "blast"} squares</div>}
              <div className="grid grid-cols-2 gap-1">
                <button type="button" disabled={!tacticalMap.plannedGrenadeTarget} onClick={() => dispatch(confirmTacticalGrenade({
                  rollsByCombatantId: Object.fromEntries(tacticalMap.scenario.combatants.filter((unit) => !unit.defeated).map((unit) => [unit.id, rollDicePair()])),
                  throwDice: rollDicePair(),
                  scatterDice: rollDicePair(),
                  occupiedSquareRolls: Object.fromEntries(tacticalMap.scenario.combatants.filter((unit) => !unit.defeated).map((unit) => [pointKey(unit.position), Math.floor(Math.random() * 6) + 1])),
                  collateralRolls: Object.fromEntries(tacticalMap.scenario.combatants.filter((unit) => !unit.defeated).map((unit) => [unit.id, { checkDice: rollDicePair(), woundDice: rollDicePair() }])),
                }))} className={`h-7 w-full border px-2 text-[8px] font-bold uppercase tracking-wider disabled:cursor-not-allowed disabled:opacity-40 ${tacticalMap.grenadeKind === "smoke" ? "border-slate-300 text-slate-100" : "border-pink-300 text-pink-100"}`}>Confirm Throw</button>
                <button type="button" onClick={() => dispatch(cancelTacticalGrenadeTargeting())} className="h-7 w-full border border-(--hud-border) px-2 text-[8px] font-bold uppercase tracking-wider text-(--hud-text-dim)">Cancel</button>
              </div>
            </div> : <div className="grid grid-cols-1 gap-1">
              <button type="button" disabled={Boolean(draggedCombatant) || tacticalMap.coveringFireTargeting || selectedActionPoints < 6 || (activeCombatant?.grenades ?? 0) < 1} onClick={() => dispatch(beginTacticalGrenadeTargeting())} className="h-7 w-full border border-pink-300 px-2 text-[8px] font-bold uppercase tracking-wider text-pink-100 disabled:cursor-not-allowed disabled:opacity-40">Throw Fragmentation Grenade · {activeCombatant?.grenades ?? 0} · 6 AP</button>
              <button type="button" disabled={Boolean(draggedCombatant) || tacticalMap.coveringFireTargeting || selectedActionPoints < 6 || (activeCombatant?.smokeGrenades ?? 0) < 1} onClick={() => dispatch(beginTacticalSmokeGrenadeTargeting())} className="h-7 w-full border border-slate-300 px-2 text-[8px] font-bold uppercase tracking-wider text-slate-100 disabled:cursor-not-allowed disabled:opacity-40">Throw Smoke Grenade · {activeCombatant?.smokeGrenades ?? 0} · 6 AP</button>
            </div>}
            {tacticalMap.satchelPlacementPending ? <div className="flex flex-col gap-2 border border-orange-300/60 p-2">
              <div className="font-bold uppercase tracking-wider text-orange-100">Emplace Satchel Charge</div>
              <div className="text-(--hud-text-dim)">The charge remains in {activeCombatant?.position.x}, {activeCombatant?.position.y}. Placement spends the entire activation. Only {activeCombatant?.name} may detonate it later.</div>
              <div className="grid grid-cols-2 gap-1">
                <button type="button" onClick={() => dispatch(confirmTacticalSatchelPlacement())} className="h-7 border border-orange-300 text-orange-100">Confirm Placement</button>
                <button type="button" onClick={() => dispatch(cancelTacticalSatchelPlacement())} className="h-7 border border-(--hud-border) text-(--hud-text-dim)">Cancel</button>
              </div>
            </div> : <div className="flex flex-col gap-1">
              {activeCombatant && (activeCombatant.breachingCharges ?? 0) > 0 && selectedActionPoints === 6 && !tacticalMap.grenadeTargeting && !tacticalMap.coveringFireTargeting && !draggedCombatant && <button type="button" onClick={() => dispatch(beginTacticalSatchelPlacement())} className="h-7 w-full border border-orange-300 px-2 text-[8px] font-bold uppercase tracking-wider text-orange-100">Emplace Satchel Charge · {activeCombatant.breachingCharges} · entire activation</button>}
              {satchelsPlacedByActiveCharacter.map((charge) => <button key={`detonate:${charge.id}`} type="button" disabled={selectedActionPoints < 1} onClick={() => dispatch(detonateTacticalSatchelCharge({ chargeId: charge.id, rollsByCombatantId: Object.fromEntries(tacticalMap.scenario.combatants.filter((unit) => !unit.defeated).map((unit) => [unit.id, { checkDice: rollDicePair(), woundDice: rollDicePair() }])) }))} className="h-7 w-full border border-red-300 px-2 text-[8px] font-bold uppercase tracking-wider text-red-100 disabled:opacity-40">Detonate Satchel at {charge.position.x}, {charge.position.y} · 1 AP</button>)}
              {satchelsInActiveSquare.map((charge) => <button key={`defuse:${charge.id}`} type="button" disabled={selectedActionPoints !== 6 || Boolean(draggedCombatant)} onClick={() => dispatch(defuseTacticalSatchelCharge(charge.id))} className="h-7 w-full border border-amber-300 px-2 text-[8px] font-bold uppercase tracking-wider text-amber-100 disabled:opacity-40">Defuse Satchel · entire activation</button>)}
            </div>}
            {plannedExtinguishFire ? <div className="flex flex-col gap-2 border border-orange-300/60 p-2">
              <div className="font-bold uppercase tracking-wider text-orange-100">Extinguish Fire</div>
              <div className="text-(--hud-text-dim)">Fire at {plannedExtinguishFire.x}, {plannedExtinguishFire.y} will be replaced by smoke until the next turn.</div>
              <div className="grid grid-cols-2 gap-1">
                <button type="button" onClick={() => dispatch(confirmTacticalExtinguishFire())} className="h-7 w-full border border-orange-300 px-2 text-[8px] font-bold uppercase tracking-wider text-orange-100">Confirm · 3 AP</button>
                <button type="button" onClick={() => dispatch(cancelTacticalExtinguishFire())} className="h-7 w-full border border-(--hud-border) px-2 text-[8px] font-bold uppercase tracking-wider text-(--hud-text-dim)">Cancel</button>
              </div>
            </div> : adjacentFireCells.length > 0 && !tacticalMap.grenadeTargeting && !tacticalMap.coveringFireTargeting ? <div className="flex flex-col gap-1">
              <div className="border-b border-orange-300/40 pb-0.5 font-bold uppercase tracking-wider text-orange-200">Fire</div>
              {adjacentFireCells.map((fire) => <button key={`extinguish:${pointKey(fire)}`} type="button" disabled={selectedActionPoints < 3} onClick={() => dispatch(previewTacticalExtinguishFire(fire))} className="h-7 w-full border border-orange-300 px-2 text-[8px] font-bold uppercase tracking-wider text-orange-100 disabled:cursor-not-allowed disabled:opacity-40">Extinguish Fire {fire.x}, {fire.y} · 3 AP</button>)}
            </div> : null}
            {plannedTreatmentTarget ? <div className="flex flex-col gap-2 border border-emerald-300/60 p-2">
              <div className="font-bold uppercase tracking-wider text-emerald-100">Treat {plannedTreatmentTarget.name}</div>
              <div className="text-(--hud-text-dim)">{plannedTreatmentTarget.woundState} · {plannedTreatmentTarget.defeated ? "will be stabilized and remain incapacitated" : "light wound will be treated"}</div>
              <div className="grid grid-cols-2 gap-1">
                <button type="button" onClick={() => dispatch(confirmTacticalTreatment())} className="h-7 w-full border border-emerald-300 px-2 text-[8px] font-bold uppercase tracking-wider text-emerald-100">Confirm Treatment</button>
                <button type="button" onClick={() => dispatch(cancelTacticalTreatment())} className="h-7 w-full border border-(--hud-border) px-2 text-[8px] font-bold uppercase tracking-wider text-(--hud-text-dim)">Cancel</button>
              </div>
            </div> : treatmentTargets.length > 0 && !tacticalMap.grenadeTargeting && !tacticalMap.coveringFireTargeting ? <div className="flex flex-col gap-1">
              <div className="border-b border-emerald-300/40 pb-0.5 font-bold uppercase tracking-wider text-emerald-200">Treatment</div>
              {treatmentTargets.map((patient) => <button key={patient.id} type="button" disabled={selectedActionPoints < 6 || (activeCombatant?.medkits ?? 0) < 1} onClick={() => dispatch(previewTacticalTreatment(patient.id))} className="h-7 w-full border border-emerald-300 px-2 text-[8px] font-bold uppercase tracking-wider text-emerald-100 disabled:cursor-not-allowed disabled:opacity-40">Treat {patient.name} · 6 AP · 1 medkit</button>)}
            </div> : null}
            {(draggableAllies.length > 0 || draggedCombatant) && <div className="flex flex-col gap-1">
              <div className="border-b border-blue-300/40 pb-0.5 font-bold uppercase tracking-wider text-blue-200">Recovery movement</div>
              {draggableAllies.map((ally) => <button key={ally.id} type="button" onClick={() => dispatch(beginTacticalDragging(ally.id))} className="h-7 w-full border border-blue-300 px-2 text-[8px] font-bold uppercase tracking-wider text-blue-100">Drag {ally.name}</button>)}
              {draggedCombatant && <><div className="font-bold uppercase tracking-wider text-blue-200">Dragging {draggedCombatant.name} · movement limit 2 · attacks unavailable</div><button type="button" onClick={() => dispatch(releaseTacticalDraggedCombatant())} className="h-7 w-full border border-blue-300 px-2 text-[8px] font-bold uppercase tracking-wider text-blue-100">Release {draggedCombatant.name}</button></>}
            </div>}
            {plannedMeleeTarget ? <div className="flex flex-col gap-2 border border-amber-300/60 p-2">
              <div className="font-bold uppercase tracking-wider text-amber-100">Melee with {plannedMeleeTarget.name}</div>
              <div className="text-(--hud-text-dim)">MF {activeCombatant?.meleeRating ?? 0} − {plannedMeleeTarget.meleeRating} = {(activeCombatant?.meleeRating ?? 0) - plannedMeleeTarget.meleeRating} · armor shifts table column · 1d6 · no AP · activation ends · eligible return attack resolves simultaneously</div>
              <div className="grid grid-cols-2 gap-1">
                <button type="button" onClick={() => dispatch(confirmTacticalMelee({ attackRoll: Math.floor(Math.random() * 6) + 1, responseRoll: Math.floor(Math.random() * 6) + 1 }))} className="h-7 w-full border border-amber-300 px-2 text-[8px] font-bold uppercase tracking-wider text-amber-100">Resolve Exchange</button>
                <button type="button" onClick={() => dispatch(cancelTacticalMelee())} className="h-7 w-full border border-(--hud-border) px-2 text-[8px] font-bold uppercase tracking-wider text-(--hud-text-dim)">Cancel</button>
              </div>
            </div> : meleeTargets.length > 0 ? <div className="flex flex-col gap-1">
              <div className="border-b border-amber-300/40 pb-0.5 font-bold uppercase tracking-wider text-amber-200">Adjacent targets</div>
              {meleeTargets.map((target) => <div key={target.id} className={`grid gap-1 ${rangedTargetIds.has(target.id) ? "grid-cols-2" : "grid-cols-1"}`}>
                {rangedTargetIds.has(target.id) && <button type="button" onClick={() => dispatch(selectTacticalAttackTarget(target.id))} className="h-7 w-full border border-red-300 px-2 text-[8px] font-bold uppercase tracking-wider text-red-100">Fire at {target.name}</button>}
                <button type="button" onClick={() => dispatch(previewTacticalMelee(target.id))} className="h-7 w-full border border-amber-300 px-2 text-[8px] font-bold uppercase tracking-wider text-amber-100">Melee {target.name}</button>
              </div>)}
            </div> : null}
            <div className="border-b border-red-300/40 pb-0.5 font-bold uppercase tracking-wider text-red-200">Attack</div>
            {plannedAttackTarget && plannedAttackProfile ? <div className="flex flex-col gap-2">
              <div className="text-red-200">Attack {plannedAttackTarget.name} · {plannedAttackTarget.woundState} · {plannedAttackTarget.armorName ?? "Armor"} {plannedAttackTarget.armor}{tacticalMap.suppressedCombatantIds.includes(plannedAttackTarget.id) ? " · Suppressed" : ""}</div>
              {!tacticalMap.plannedAttackMode ? <div className="grid grid-cols-2 gap-1">
                {tacticalMap.aimedTargetId !== plannedAttackTarget.id && <button type="button" disabled={selectedSuppressed || selectedActionPoints < 2} onClick={() => dispatch(aimTacticalAttack())} className="col-span-2 h-7 w-full border border-cyan-200 px-2 text-[8px] font-bold uppercase tracking-wider text-cyan-100 disabled:cursor-not-allowed disabled:opacity-40">Aim · 2 AP · +1 hit</button>}
                {tacticalMap.aimedTargetId === plannedAttackTarget.id && <div className="col-span-2 text-cyan-200">Aimed at {plannedAttackTarget.name} · +1 hit</div>}
                <button type="button" disabled={Boolean(selectedWeapon?.highEnergy && !selectedBraced) || selectedActionPoints < 3 || selectedAmmunition < 1} onClick={() => dispatch(selectTacticalAttackMode("snap"))} className="h-7 w-full border border-red-300 px-2 text-[8px] font-bold uppercase tracking-wider text-red-100 disabled:cursor-not-allowed disabled:opacity-40">Snap Shot · 3 AP</button>
                <button type="button" disabled={Boolean(selectedWeapon?.highEnergy && !selectedBraced) || selectedActionPoints < 6 || selectedAmmunition < 1} onClick={() => dispatch(selectTacticalAttackMode("aimed"))} className="h-7 w-full border border-cyan-300 px-2 text-[8px] font-bold uppercase tracking-wider text-cyan-100 disabled:cursor-not-allowed disabled:opacity-40">Aimed Fire · 6 AP</button>
                {selectedWeapon?.automatic && <button type="button" disabled={selectedActionPoints < 6 || selectedAmmunition < 3 || plannedAutomaticModifier === null} onClick={() => dispatch(selectTacticalAttackMode("automatic"))} className="col-span-2 h-7 w-full border border-fuchsia-300 px-2 text-[8px] font-bold uppercase tracking-wider text-fuchsia-100 disabled:cursor-not-allowed disabled:opacity-40">{plannedAutomaticModifier === null ? "Automatic unavailable" : `Automatic · +${plannedAutomaticModifier} · 6 AP · 3 ammo`}</button>}
                {selectedWeapon?.automatic && !tacticalMap.suppressedCombatantIds.includes(plannedAttackTarget.id) && <button type="button" disabled={selectedActionPoints < 6 || selectedAmmunition < 3} onClick={() => dispatch(selectTacticalAttackMode("suppressive"))} className="col-span-2 h-7 w-full border border-orange-300 px-2 text-[8px] font-bold uppercase tracking-wider text-orange-100 disabled:cursor-not-allowed disabled:opacity-40">Suppress Target · 6 AP · 3 ammo</button>}
                <button type="button" onClick={() => dispatch(cancelTacticalAttack())} className="col-span-2 h-7 w-full border border-(--hud-border) px-2 text-[8px] font-bold uppercase tracking-wider text-(--hud-text-dim)">Cancel Target</button>
              </div> : <>
                {tacticalMap.plannedAttackMode === "suppressive" && <div className="font-bold text-orange-200">Suppressive fire · no wound · 2d6 + skill + weapon −2 vs range target + cover {plannedAttackCover}</div>}
                {tacticalMap.plannedAttackMode === "automatic" && plannedAutomaticRisks.length > 0 && <div className="border border-orange-300/70 bg-orange-300/10 p-1 text-orange-100">Danger space: {plannedAutomaticRisks.map((unit) => `${unit.name} (${unit.side})`).join(" · ")}</div>}
                <div className="grid grid-cols-2 gap-x-2 text-(--hud-text-dim)">
                  <span>Mode</span><span>{tacticalMap.plannedAttackMode} ({tacticalMap.plannedAttackMode === "snap" || tacticalMap.plannedAttackMode === "suppressive" ? "-2" : tacticalMap.plannedAttackMode === "automatic" ? `+${plannedAutomaticModifier}` : "0"})</span>
                  <span>Weapon</span><span>{selectedWeapon?.name} · ammo {selectedAmmunition}/{selectedWeapon?.magazineSize ?? 12}</span>
                  <span>Range</span><span>{plannedAttackProfile.range} ({plannedAttackProfile.rangeBand})</span>
                  <span>Hit</span><span>2d6 + skill {activeCombatant?.weaponSkill ?? 0} + weapon {plannedAttackAccuracy >= 0 ? "+" : ""}{plannedAttackAccuracy} + mode {tacticalMap.plannedAttackMode === "snap" || tacticalMap.plannedAttackMode === "suppressive" ? -2 : tacticalMap.plannedAttackMode === "automatic" ? plannedAutomaticModifier : 0}{selectedBraced ? " + brace 1" : ""}{tacticalMap.aimedTargetId === plannedAttackTarget.id ? " + aim 1" : ""} - cover {plannedAttackCover} vs {plannedAttackProfile.targetNumber}+</span>
                  <span>Wound</span><span>2d6 + penetration {plannedAttackPenetration} - armor {plannedAttackTarget.armor} + cover {plannedAttackCover}</span>
                </div>
                <div className="grid grid-cols-2 gap-1">
                  <button type="button" onClick={() => dispatch(confirmTacticalAttack({ hitDice: rollDicePair(), woundDice: rollDicePair(), secondaryRolls: Object.fromEntries(plannedAutomaticRisks.map((unit) => [unit.id, { hitDice: rollDicePair(), woundDice: rollDicePair() }])), collateralRolls: Object.fromEntries(tacticalMap.scenario.combatants.map((unit) => [unit.id, { checkDice: rollDicePair(), woundDice: rollDicePair() }])) }))} className="h-7 w-full border border-red-300 px-2 text-[8px] font-bold uppercase tracking-wider text-red-100">Confirm Attack</button>
                  <button type="button" onClick={() => dispatch(cancelTacticalAttack())} className="h-7 w-full border border-(--hud-border) px-2 text-[8px] font-bold uppercase tracking-wider text-(--hud-text-dim)">Cancel</button>
                </div>
              </>}
            </div> : <div className="text-(--hud-text-dim)">{draggedCombatant ? "Attacks unavailable while dragging." : "Select a visible red enemy on the map."}</div>}
            {selectedWeapon && selectedAmmunition < (selectedWeapon.magazineSize ?? 12) && selectedActionPoints >= 3 && <button type="button" onClick={() => dispatch(reloadTacticalWeapon())} className="h-7 w-full border border-sky-300 px-2 text-[8px] font-bold uppercase tracking-wider text-sky-100">Reload · 3 AP</button>}
            <div className="border-b border-lime-300/40 pb-0.5 font-bold uppercase tracking-wider text-lime-200">Movement &amp; defense</div>
            {selectedEnteredEnemySquare && <div className="font-bold uppercase tracking-wider text-amber-200">Enemy square entered · no further movement · melee remains optional</div>}
            {enemyEntryOptions.map(({ enemy, move }) => <button key={`enemy-entry:${enemy.id}`} type="button" onClick={() => dispatch(previewTacticalEnemyEntry(enemy.id))} className="h-7 w-full border border-amber-300 px-2 text-[8px] font-bold uppercase tracking-wider text-amber-100">Enter {enemy.name}&apos;s square · {move.cost} AP</button>)}
            {selectedSuppressed && <>
              <div className="font-bold uppercase tracking-wider text-orange-200">Suppressed · −1 attacks · movement limit 2</div>
              <button type="button" disabled={selectedActionPoints < 3} onClick={() => dispatch(rallyTacticalCharacter())} className="h-7 w-full border border-orange-300 px-2 text-[8px] font-bold uppercase tracking-wider text-orange-100 disabled:cursor-not-allowed disabled:opacity-40">Rally · 3 AP</button>
            </>}
            <button type="button" disabled={selectedEnteredEnemySquare || Boolean(draggedCombatant) || selectedProne || selectedActionPoints !== 6} onClick={() => dispatch(setTacticalMovementMode(tacticalMap.movementMode === "evade" ? "walk" : "evade"))} className={`h-7 w-full border px-2 text-[8px] font-bold uppercase tracking-wider transition-colors ${tacticalMap.movementMode === "evade" ? "border-teal-200 bg-teal-300/15 text-teal-100" : "border-teal-300 text-teal-100"} disabled:cursor-not-allowed disabled:opacity-40`}>{tacticalMap.movementMode === "evade" ? "Evade mode · cancel" : "Evade · move 1 · 6 AP · −2 ranged hit"}</button>
            <button type="button" disabled={selectedEnteredEnemySquare || Boolean(draggedCombatant) || selectedProne || selectedActionPoints < 4} onClick={() => dispatch(setTacticalMovementMode(tacticalMap.movementMode === "sidestep" ? "walk" : "sidestep"))} className={`h-7 w-full border px-2 text-[8px] font-bold uppercase tracking-wider transition-colors ${tacticalMap.movementMode === "sidestep" ? "border-cyan-200 bg-cyan-300/15 text-cyan-100" : "border-cyan-300 text-cyan-100"} disabled:cursor-not-allowed disabled:opacity-40`}>{tacticalMap.movementMode === "sidestep" ? "Sidestep/backstep mode · cancel" : "Sidestep/backstep · 4 AP · keep facing"}</button>
            <button type="button" title={selectedEnteredEnemySquare ? "Further movement unavailable after entering an enemy square" : selectedProne ? "Movement unavailable while prone" : selectedSuppressed ? "Trot unavailable while suppressed" : draggedCombatant ? "Trot unavailable while dragging" : tacticalMap.movementMode === "trot" ? "Trot mode · switch to walk" : selectedActionPoints === 6 ? "Walk mode · switch to trot" : "Walk mode · trot unavailable"} aria-label={selectedEnteredEnemySquare ? "Further movement unavailable after entering an enemy square" : selectedProne ? "Movement unavailable while prone" : selectedSuppressed ? "Trot unavailable while suppressed" : draggedCombatant ? "Trot unavailable while dragging" : tacticalMap.movementMode === "trot" ? "Trot mode, switch to walk" : selectedActionPoints === 6 ? "Walk mode, switch to trot" : "Walk mode, trot unavailable"} disabled={selectedEnteredEnemySquare || Boolean(draggedCombatant) || selectedProne || selectedSuppressed || selectedActionPoints < 1 || (tacticalMap.movementMode !== "trot" && selectedActionPoints !== 6)} onClick={() => dispatch(setTacticalMovementMode(tacticalMap.movementMode === "trot" ? "walk" : "trot"))} className={`h-7 w-full border px-2 text-[8px] font-bold uppercase tracking-wider transition-colors ${tacticalMap.movementMode === "trot" ? "border-yellow-300 bg-yellow-300/20 text-yellow-100" : "border-lime-300 text-lime-100"} disabled:cursor-not-allowed disabled:opacity-40`}>
              {tacticalMap.movementMode === "trot" ? "Trot mode · switch to walk" : "Walk mode · switch to trot"}
            </button>
            <div className="grid grid-cols-2 gap-1">
              <button type="button" title={`Turn left · ${tacticalMap.movementMode === "trot" ? 2 : 1} AP`} aria-label={`Turn left, ${tacticalMap.movementMode === "trot" ? 2 : 1} AP`} disabled={selectedProne || tacticalMap.movementMode === "evade" || selectedActionPoints < (tacticalMap.movementMode === "trot" ? 2 : 1)} onClick={() => dispatch(turnTacticalCharacter("left"))} className="h-7 w-full border border-(--hud-border) px-2 text-[8px] font-bold uppercase tracking-wider text-(--hud-text-dim) transition-colors hover:border-cyan-300 hover:text-(--hud-text) disabled:cursor-not-allowed disabled:opacity-40">Turn left · {tacticalMap.movementMode === "trot" ? 2 : 1} AP</button>
              <button type="button" title={`Turn right · ${tacticalMap.movementMode === "trot" ? 2 : 1} AP`} aria-label={`Turn right, ${tacticalMap.movementMode === "trot" ? 2 : 1} AP`} disabled={selectedProne || tacticalMap.movementMode === "evade" || selectedActionPoints < (tacticalMap.movementMode === "trot" ? 2 : 1)} onClick={() => dispatch(turnTacticalCharacter("right"))} className="h-7 w-full border border-(--hud-border) px-2 text-[8px] font-bold uppercase tracking-wider text-(--hud-text-dim) transition-colors hover:border-cyan-300 hover:text-(--hud-text) disabled:cursor-not-allowed disabled:opacity-40">Turn right · {tacticalMap.movementMode === "trot" ? 2 : 1} AP</button>
            </div>
            <button type="button" title={selectedProne ? "Stand up · 6 AP" : "Go prone · 1 AP"} aria-label={selectedProne ? "Stand up, 6 AP" : "Go prone, 1 AP"} disabled={Boolean(draggedCombatant) || tacticalMap.movementMode === "evade" || selectedActionPoints < (selectedProne ? 6 : 1)} onClick={() => dispatch(toggleTacticalPosture())} className="h-7 w-full border border-slate-300 px-2 text-[8px] font-bold uppercase tracking-wider text-slate-100 transition-colors disabled:cursor-not-allowed disabled:opacity-40">{selectedProne ? "Stand up · 6 AP" : "Go prone · 1 AP"}</button>
            {selectedProne && !selectedBraced && <button type="button" disabled={Boolean(draggedCombatant) || selectedSuppressed || selectedActionPoints < 2} onClick={() => dispatch(braceTacticalWeapon())} className="h-7 w-full border border-cyan-300 px-2 text-[8px] font-bold uppercase tracking-wider text-cyan-100 transition-colors disabled:cursor-not-allowed disabled:opacity-40">Brace Weapon · 2 AP</button>}
            {selectedBraced && <div className="font-bold uppercase tracking-wider text-cyan-200">Braced · +1 ranged accuracy · lost on move or stand</div>}
            <div className="text-[7px] tracking-widest text-(--hud-text-dim)">{selectedProne ? "Stand before moving" : tacticalMap.movementMode ? `${tacticalMap.movementMode} perimeter shown` : "No action selected"}</div>
            {selectedTerrain && <div className="flex flex-col gap-2">
              <div className="border-b border-amber-300/40 pb-0.5 font-bold uppercase tracking-wider text-amber-200">Interaction</div>
              <div className="font-bold text-amber-100">{selectedTerrain.kind === "wall" ? "Wall segment" : selectedTerrain.kind === "door" ? `${selectedTerrain.open ? "Open" : "Closed"} door` : selectedTerrain.label}</div>
              {selectedTerrain.kind !== "wall" && <><div className={`mt-1 ${terrainAdjacent ? "text-emerald-200" : "text-rose-200"}`}>{terrainAdjacent ? selectedTerrain.kind === "door" ? "Adjacent at phase start" : "Adjacent" : selectedTerrain.kind === "door" ? "Must begin the phase adjacent" : "Move adjacent to interact"}</div>
                {selectedDoorCommand ? <div className="text-amber-200">Door will {selectedDoorCommand.open ? "open" : "close"} at the start of Turn {selectedDoorCommand.resolvesAtTurn}</div> : selectedTerrain.kind === "terminal" && terminalAlreadyActive ? <div className="text-emerald-200">Terminal active</div> : <button type="button" disabled={!terrainAdjacent || selectedActionPoints < terrainInteractionCost} onClick={() => dispatch(interactWithTacticalTerrain())} className="h-7 w-full border border-amber-300 px-2 text-[8px] font-bold uppercase tracking-wider text-amber-100 transition-colors disabled:cursor-not-allowed disabled:opacity-40">
                  {selectedTerrain.kind === "door" ? `${selectedTerrain.open ? "Close" : "Open"} door next phase · 2 AP` : "Activate terminal · 6 AP"}
                </button>}</>}
              {selectedStructure && <div className="flex flex-col gap-1 border-t border-(--hud-border-subtle) pt-2">
                <div>Integrity damage <span className="text-fuchsia-100">{selectedStructureDamage}/{selectedStructureThreshold}</span></div>
                <div className="mt-1">{selectedWeapon?.name ?? "No weapon"} · {selectedAmmunition} ammunition</div>
                {selectedWeapon?.highEnergy && !selectedBraced && <div className="mt-1 text-orange-200">High-energy weapon must be braced</div>}
                {!structuralWeaponEligible && !selectedWeapon?.highEnergy && <div className="mt-1 text-orange-200">Current ammunition cannot damage structures</div>}
                <button type="button" disabled={Boolean(draggedCombatant) || !structuralWeaponEligible || selectedActionPoints < 6 || selectedAmmunition < 1} onClick={() => dispatch(fireAtTacticalTerrain({ hitDice: rollDicePair() }))} className="h-7 w-full border border-fuchsia-300 px-2 text-[8px] font-bold uppercase tracking-wider text-fuchsia-100 transition-colors disabled:cursor-not-allowed disabled:opacity-40">Fire at structure · 6 AP</button>
              </div>}
            </div>}
            {previewedMove && <div className="flex flex-col gap-1 border border-cyan-300/50 p-1">
              <div>Destination <span className="text-cyan-100">{previewedMove.destination.x}, {previewedMove.destination.y}</span></div>
              <div className="mt-1">Movement cost <span className="text-cyan-100">{tacticalMap.movementMode === "evade" ? 6 : previewedMove.cost}</span></div>
              {previewedMove.costBreakdown?.filter((entry: string) => entry.startsWith("congestion")).map((entry: string, index: number) => <div key={`${entry}:${index}`} className="text-amber-200">Occupied square · {entry}</div>)}
              {plannedMeleeDiveTarget && <div className="font-bold text-amber-100">Melee dive into {plannedMeleeDiveTarget.name} · +2 melee roll · no same-square −1 · simultaneous exchange · activation ends</div>}
              {plannedEnemyEntryTarget && <div className="font-bold text-amber-100">Enter {plannedEnemyEntryTarget.name}&apos;s square · defensive fire resolves first · movement ends · melee remains optional</div>}
              <div className="mt-2 grid grid-cols-2 gap-1">
                <button type="button" onClick={() => dispatch(confirmTacticalMove({ moraleDice: rollDicePair(), snapDice: { hitDice: rollDicePair(), woundDice: rollDicePair() }, enemyReactionRolls: Object.fromEntries(enemies.filter((enemy) => !enemy.defeated).map((enemy) => [enemy.id, { hitDice: rollDicePair(), woundDice: rollDicePair() }])), meleeDice: { attackRoll: Math.floor(Math.random() * 6) + 1, responseRoll: Math.floor(Math.random() * 6) + 1 } }))} className="h-7 w-full border border-emerald-300 px-2 text-[8px] font-bold uppercase tracking-wider text-emerald-100 transition-colors">{plannedMeleeDiveTarget ? "Confirm Melee Dive" : plannedEnemyEntryTarget ? "Confirm Enemy Entry" : "Confirm"}</button>
                <button type="button" onClick={() => dispatch(previewTacticalMove(null))} className="h-7 w-full border border-(--hud-border) px-2 text-[8px] font-bold uppercase tracking-wider text-(--hud-text-dim) transition-colors">Cancel</button>
              </div>
            </div>}
            <button type="button" onClick={() => dispatch(finishTacticalActivation())} className="h-7 w-full border border-(--hud-border) px-2 text-[8px] font-bold uppercase tracking-wider text-(--hud-text-dim) transition-colors">Finish Activation · retain {selectedActionPoints} AP for reactions</button>
          </> : playerPhaseComplete ? <>
            <div className="text-amber-100">Crew activations complete. End the turn to run enemy actions.</div>
            <button type="button" onClick={() => dispatch(runTacticalEnemyPhase(enemyPhaseRolls()))} className="h-7 w-full border border-amber-300 px-2 text-[8px] font-bold uppercase tracking-wider text-amber-100 transition-colors hover:bg-amber-300/15">End Turn</button>
          </> : <div className="text-(--hud-text-dim)">Select a green character.</div>}
          <button type="button" onClick={() => dispatch(resetTacticalScenario())} className="h-7 w-full border border-red-300 px-2 text-[8px] font-bold uppercase tracking-wider text-red-100 transition-colors hover:bg-red-300/15">Reset Scenario</button>
        </section>
      </FloatingPluginHud>
      {(status === "loading" || shipStatus === "loading") && <div className="absolute inset-x-0 bottom-8 text-center font-mono text-xs uppercase tracking-widest text-cyan-200">Loading crew…</div>}
      {(status === "error" || shipStatus === "error") && <div className="absolute inset-x-0 bottom-8 text-center font-mono text-xs uppercase tracking-widest text-rose-300">Crew could not be loaded</div>}
    </PluginHudLayer>
  </main>;
};

export default TacticalMapPageClient;
