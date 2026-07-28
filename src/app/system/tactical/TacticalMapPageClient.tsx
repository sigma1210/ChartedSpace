"use client";

import Link from "next/link";
import Image from "next/image";
import { Canvas, events as createCanvasEvents } from "@react-three/fiber";
import { Html, Line, OrbitControls, OrthographicCamera } from "@react-three/drei";
import { Suspense, useEffect, useMemo, useState, type ComponentProps } from "react";
import { Path, Shape } from "three";
import { FloatingPluginHud } from "@/components/hud/FloatingPluginHud";
import { PluginHudLayer } from "@/components/hud/PluginHudLayer";
import { AnimatedCombatantFallback, AnimatedCombatantModel } from "@/plugins/characterCombat/AnimatedCombatantModel";
import { AnimatedCombatantPlacement } from "@/plugins/characterCombat/AnimatedCombatantPlacement";
import { activateTacticalCharacter, aimTacticalAttack, beginTacticalCoveringFire, beginTacticalDragging, beginTacticalGrenadeTargeting, beginTacticalSatchelPlacement, beginTacticalSmokeGrenadeTargeting, braceTacticalWeapon, cancelTacticalAttack, cancelTacticalCoveringFire, cancelTacticalExtinguishFire, cancelTacticalGrenadeTargeting, cancelTacticalMelee, cancelTacticalSatchelPlacement, cancelTacticalTreatment, confirmTacticalAttack, confirmTacticalCoveringFire, confirmTacticalExtinguishFire, confirmTacticalGrenade, confirmTacticalMelee, confirmTacticalMove, confirmTacticalSatchelPlacement, confirmTacticalTreatment, defuseTacticalSatchelCharge, deployTacticalCharacter, detonateTacticalSatchelCharge, equipTacticalDeploymentItem, finishTacticalActivation, fireAtTacticalTerrain, initializeTacticalDraftPlaytest, initializeTacticalMapSetup, interactWithTacticalTerrain, previewTacticalCoveringFire, previewTacticalEnemyEntry, previewTacticalExtinguishFire, previewTacticalGrenadeTarget, previewTacticalMelee, previewTacticalMeleeDive, previewTacticalMove, previewTacticalTreatment, rallyTacticalCharacter, releaseTacticalDraggedCombatant, reloadTacticalWeapon, resetTacticalDraftPlaytest, resetTacticalScenario, resolveTacticalAdjacencyReaction, resolveTacticalCoveringFireSnap, rotateTacticalDeploymentCharacter, runTacticalEnemyPhase, selectTacticalAttackMode, selectTacticalAttackTarget, selectTacticalDeploymentCharacter, selectTacticalLightingPreset, selectTacticalTerrainObject, selectTacticalWeaponAmmunition, setTacticalDeploymentPosture, setTacticalMovementMode, setTacticalTerrainLights, startTacticalScenario, toggleTacticalPosture, turnTacticalCharacter, unequipTacticalDeploymentItem, updateTacticalActionHud, updateTacticalCharacterHud, updateTacticalCharacterInformationHud, updateTacticalDeploymentHud, updateTacticalEventsHud } from "@/plugins/characterCombat/slice";
import { updateTacticalEnemyHud, updateTacticalScenarioHud } from "@/plugins/characterCombat/slice";
import { attemptTacticalConsoleCheck } from "@/plugins/characterCombat/slice";
import { recordTacticalExploration } from "@/plugins/characterCombat/slice";
import { recordTacticalEnemySightings } from "@/plugins/characterCombat/slice";
import { automaticFireSecondaryTargets, collateralBlastCells, coverProtection, coveringFireDangerSpaceCells, depressurizedCells, filledLiquidHydrogenCellKeys, grenadeBlastCells, meleeEnemies, pointKey, reachableOpenMapMovement, sidestepAndBackstepMoves, tacticalBaseLightingLevelAt, tacticalCrewVisibilityMask, tacticalLightingLevelAt, tacticalLightPatchVisibleAt, tacticalLightSources, tacticalOccupantCounts, tacticalRangedEnemies, tacticalVisibilityAssessment, terrainHeightAt, treatableAllies, validCoveringFireTargets } from "@/plugins/characterCombat/geometry";
import { automaticFireModifierForRange, snapShotTarget, weaponAccuracyForRange, weaponPenetrationForRange } from "@/plugins/characterCombat/combatResolution";
import type { Combatant, CombatScenario, TacticalMapState } from "@/plugins/characterCombat/types";
import { buildDefaultTacticalScenario } from "@/plugins/characterCombat/defaultTacticalScenario";
import type { TacticalScenarioDefinitionFile } from "@/plugins/characterCombat/tacticalScenarioDefinitions";
import { consoleOperationAvailable, type TacticalConsoleVictoryDefinitionFile } from "@/plugins/characterCombat/tacticalConsoleVictory";
import { activeTacticalTerrainObjects, interactiveHumanModelFacingForTacticalRotation, tacticalTerrainBlockedCells, tacticalTerrainBlockedEdges, tacticalWallCornerPoints, tacticalWallVisualRuns, type TacticalTerrainObject, type TacticalWallVisualRun } from "@/plugins/characterCombat/tacticalTerrain";
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

const DEFAULT_MAP: TacticalMapState = { scenario: buildDefaultTacticalScenario("exterior-dark"), scenarioStatus: "setup", lightingPreset: "exterior-dark", gridSize: 1, movementAnimationByCharacterId: {}, characterHudLayout: { visible: true, pinned: false, position: { x: 16, y: 86 } }, enemyHudLayout: { visible: true, pinned: false, position: { x: 840, y: 86 } }, actionHudLayout: { visible: true, pinned: false, position: { x: 16, y: 190 } }, characterInformationHudLayout: { visible: true, pinned: false, position: { x: 320, y: 86 } }, eventsHudLayout: { visible: true, pinned: false, position: { x: 580, y: 86 } }, movementMode: "walk", plannedDestination: null, plannedEnemyEntryTargetId: null, enemySquareEnteredCombatantIds: [], plannedAttackTargetId: null, plannedAttackMode: null, plannedMeleeTargetId: null, aimedTargetId: null, grenadeTargeting: false, grenadeKind: null, plannedGrenadeTarget: null, smokeClearsAtTurnByCell: {}, lastGrenadeImpact: null, lastWeaponImpact: null, satchelCharges: [], satchelPlacementPending: false, lastSatchelImpact: null, coveringFireTargeting: false, plannedCoveringFireTarget: null, coveringFireLanes: [], coveringFireCommittedCombatantIds: [], pendingCoveringFireSnapIds: [], plannedTreatmentTargetId: null, draggingCombatantByCarrierId: {}, ahlMeleeStunUntilTurnById: {}, selectedTerrainObjectId: null, doorOpenById: {}, actionPhaseStartPositionByCombatantId: {}, pendingDoorCommandsById: {}, terminalActiveById: {}, terrainDamageById: {}, destroyedTerrainObjectIds: [], ammunitionByCharacterId: {}, ammunitionByCombatantAndKind: {}, evadingCombatantIds: [], bracedCombatantIds: [], suppressedCombatantIds: [], movedCombatantIds: [], processedEnemyPhaseCombatantIds: [], movingAdjacentMoraleResultByLeaderId: {}, pendingAdjacencyReaction: null, events: [], turn: 1, actionPointsByCharacterId: {}, actedCharacterIds: [], activeCharacterId: null };
const TACTICAL_WALL_HEIGHT = 1.26;
const TACTICAL_WALL_CENTER_Y = TACTICAL_WALL_HEIGHT / 2;
const TACTICAL_DOOR_HEIGHT = 1.23;
const TACTICAL_DOOR_CENTER_Y = TACTICAL_DOOR_HEIGHT / 2;
const IRIS_WALL_SHAPE = (() => {
  const wallBottom = -TACTICAL_DOOR_CENTER_Y;
  const wallTop = TACTICAL_WALL_HEIGHT - TACTICAL_DOOR_CENTER_Y;
  const shape = new Shape();
  shape.moveTo(-0.5, wallBottom);
  shape.lineTo(0.5, wallBottom);
  shape.lineTo(0.5, wallTop);
  shape.lineTo(-0.5, wallTop);
  shape.closePath();
  const opening = new Path();
  opening.absarc(0, 0, 0.31, 0, Math.PI * 2, true);
  shape.holes.push(opening);
  return shape;
})();
const IRIS_WALL_EXTRUSION = { depth: 0.22, bevelEnabled: false } as const;
const tacticalRaisedSurfaceHeightAt = (scenario: CombatScenario, point: { x: number; y: number }) => terrainHeightAt(scenario, point) / 0.65 * TACTICAL_WALL_HEIGHT;
const tacticalVisualHeightAt = (scenario: CombatScenario, point: { x: number; y: number }) => {
  const surfaceHeight = tacticalRaisedSurfaceHeightAt(scenario, point);
  return scenario.elevationAccessCells?.some((cell) => pointKey(cell) === pointKey(point)) ? surfaceHeight + TACTICAL_WALL_HEIGHT / 2 : surfaceHeight;
};
const tacticalCombatantHeight = (scenario: CombatScenario, combatant: Combatant) => {
  const bridgeLevel = scenario.bridges?.find((bridge) => bridge.cells.some((cell) => pointKey(cell) === pointKey(combatant.position)))?.elevationLevel;
  return bridgeLevel !== undefined && combatant.elevationLevel === bridgeLevel ? bridgeLevel * TACTICAL_WALL_HEIGHT : tacticalVisualHeightAt(scenario, combatant.position);
};
const rollDicePair = () => ({ first: Math.floor(Math.random() * 6) + 1, second: Math.floor(Math.random() * 6) + 1 });
const safeCanvasEvents: NonNullable<ComponentProps<typeof Canvas>["events"]> = (store) => {
  const manager = createCanvasEvents(store);
  const connect = manager.connect;
  return { ...manager, connect: (target) => { if (target) connect?.(target); } };
};

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

const TacticalElevationTerrain = ({ scenario, onSelectCell }: { scenario: CombatScenario; onSelectCell: (point: { x: number; y: number }) => void }) => <>
  {Object.entries(scenario.terrainByCell ?? {}).map(([key, terrain]) => {
    if (terrain !== "elevated") return null;
    const [x, y] = key.split(":").map(Number);
    const height = tacticalVisualHeightAt(scenario, { x, y });
    return <group key={`elevated:${key}`} position={[x + 0.5 - scenario.width / 2, 0, y + 0.5 - scenario.height / 2]} onClick={(event) => { event.stopPropagation(); onSelectCell({ x, y }); }}>
      <mesh position={[0, height / 2, 0]} receiveShadow castShadow>
        <boxGeometry args={[1, height, 1]} />
        <meshStandardMaterial color="#64748b" roughness={0.72} metalness={0.22} />
      </mesh>
      <mesh position={[0, height + 0.003, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[0.94, 0.94]} />
        <meshStandardMaterial color="#263b46" roughness={0.9} metalness={0.08} />
      </mesh>
    </group>;
  })}
  {(scenario.elevationAccessCells ?? []).map((point) => {
    const baseHeight = tacticalRaisedSurfaceHeightAt(scenario, point);
    const elevatedNeighbor = [{ x: point.x + 1, y: point.y }, { x: point.x - 1, y: point.y }, { x: point.x, y: point.y + 1 }, { x: point.x, y: point.y - 1 }].find((candidate) => tacticalRaisedSurfaceHeightAt(scenario, candidate) > baseHeight);
    if (!elevatedNeighbor) return null;
    const dx = elevatedNeighbor.x - point.x;
    const dz = elevatedNeighbor.y - point.y;
    const riseHeight = tacticalRaisedSurfaceHeightAt(scenario, elevatedNeighbor) - baseHeight;
    return <group key={`stairs:${pointKey(point)}`} position={[point.x + 0.5 - scenario.width / 2, baseHeight, point.y + 0.5 - scenario.height / 2]}>
      {Array.from({ length: 4 }, (_, index) => {
        const stepHeight = riseHeight * (index + 1) / 4;
        const offset = -0.375 + index * 0.25;
        return <mesh key={index} position={[dx * offset, stepHeight / 2, dz * offset]} receiveShadow castShadow onClick={(event) => { event.stopPropagation(); onSelectCell(point); }}>
          <boxGeometry args={dx === 0 ? [0.86, stepHeight, 0.24] : [0.24, stepHeight, 0.86]} />
          <meshStandardMaterial color="#cbd5e1" roughness={0.72} />
        </mesh>;
      })}
    </group>;
  })}
</>;

const TacticalCloseMachineryTerrain = ({ scenario, onSelectCell }: { scenario: CombatScenario; onSelectCell: (point: { x: number; y: number }) => void }) => <>
  {(scenario.closeMachineryCells ?? []).map(({ x, y }) => {
    const key = `${x}:${y}`;
    return <group key={`close-machinery:${key}`} position={[x + 0.5 - scenario.width / 2, tacticalVisualHeightAt(scenario, { x, y }), y + 0.5 - scenario.height / 2]} onClick={(event) => { event.stopPropagation(); onSelectCell({ x, y }); }}>
      {[[-0.31, -0.31], [0.31, -0.31], [-0.31, 0.31], [0.31, 0.31]].map(([offsetX, offsetZ], index) => <mesh key={`column:${index}`} position={[offsetX, 0.28, offsetZ]} castShadow receiveShadow>
        <boxGeometry args={[0.2, 0.56, 0.2]} />
        <meshStandardMaterial color="#475569" roughness={0.62} metalness={0.42} />
      </mesh>)}
      <mesh position={[0, 0.2, -0.28]} rotation={[0, 0, Math.PI / 2]} castShadow receiveShadow>
        <cylinderGeometry args={[0.075, 0.075, 0.76, 10]} />
        <meshStandardMaterial color="#b45309" roughness={0.48} metalness={0.5} />
      </mesh>
      <mesh position={[0.28, 0.38, 0]} rotation={[Math.PI / 2, 0, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[0.065, 0.065, 0.76, 10]} />
        <meshStandardMaterial color="#0e7490" roughness={0.48} metalness={0.5} />
      </mesh>
    </group>;
  })}
</>;

const TacticalBridges = ({ scenario, onSelectCell }: { scenario: CombatScenario; onSelectCell: (point: { x: number; y: number }) => void }) => <>
  {(scenario.bridges ?? []).flatMap((bridge) => {
    const first = bridge.cells[0];
    const last = bridge.cells[bridge.cells.length - 1];
    const vertical = first.x === last.x;
    const deckHeight = bridge.elevationLevel * TACTICAL_WALL_HEIGHT;
    return bridge.cells.map((cell, index) => <group key={`bridge:${bridge.id}:${index}`} position={[cell.x + 0.5 - scenario.width / 2, deckHeight, cell.y + 0.5 - scenario.height / 2]} onClick={(event) => { event.stopPropagation(); onSelectCell(cell); }}>
      <mesh position={[0, -0.07, 0]} castShadow receiveShadow>
        <boxGeometry args={[0.92, 0.14, 0.92]} />
        <meshStandardMaterial color="#64748b" roughness={0.66} metalness={0.3} />
      </mesh>
      {[-0.43, 0.43].map((side) => <mesh key={side} position={vertical ? [side, 0.18, 0] : [0, 0.18, side]} castShadow>
        <boxGeometry args={vertical ? [0.06, 0.3, 0.92] : [0.92, 0.3, 0.06]} />
        <meshStandardMaterial color="#94a3b8" roughness={0.55} metalness={0.4} />
      </mesh>)}
    </group>);
  })}
</>;

const TacticalLightingOverlay = ({ scenario }: { scenario: CombatScenario }) => {
  const sourceLitCells = new Map<string, { x: number; y: number }>();
  tacticalLightSources(scenario).forEach((source) => {
    for (let x = Math.max(0, source.position.x - source.range); x <= Math.min(scenario.width - 1, source.position.x + source.range); x += 1) {
      for (let y = Math.max(0, source.position.y - source.range); y <= Math.min(scenario.height - 1, source.position.y + source.range); y += 1) {
        const point = { x, y };
        if (tacticalLightPatchVisibleAt(scenario, source, point)) sourceLitCells.set(pointKey(point), point);
      }
    }
  });
  const darkCells = scenario.exteriorLighting === "illuminated" ? (scenario.interiorCells ?? []).filter((point) => tacticalBaseLightingLevelAt(scenario, point) === "dark") : [];
  return <>
    {scenario.exteriorLighting !== "illuminated" && <mesh position={[0, 0.006, 0]} rotation={[-Math.PI / 2, 0, 0]} renderOrder={1}>
      <planeGeometry args={[scenario.width, scenario.height]} />
      <meshBasicMaterial color="#00030a" transparent opacity={0.72} depthWrite={false} />
    </mesh>}
    {darkCells.map((point) => <mesh
      key={`dark:${pointKey(point)}`}
      position={[point.x + 0.5 - scenario.width / 2, 0.006, point.y + 0.5 - scenario.height / 2]}
      rotation={[-Math.PI / 2, 0, 0]}
      renderOrder={1}
    >
      <planeGeometry args={[1, 1]} />
      <meshBasicMaterial color="#00030a" transparent opacity={0.72} depthWrite={false} />
    </mesh>)}
    {[...sourceLitCells.values()].map((point) => <mesh key={`lit:${pointKey(point)}`} position={[point.x + 0.5 - scenario.width / 2, 0.008, point.y + 0.5 - scenario.height / 2]} rotation={[-Math.PI / 2, 0, 0]} renderOrder={2}>
      <planeGeometry args={[1, 1]} />
      <meshBasicMaterial color="#d6c98a" transparent opacity={0.28} depthWrite={false} />
    </mesh>)}
  </>;
};

const TacticalFogOverlay = ({ scenario, visible, explored }: { scenario: CombatScenario; visible: ReadonlyMap<string, unknown>; explored: ReadonlySet<string> }) => {
  const [exploredPositions, unexploredPositions] = useMemo(() => {
    const exploredValues: number[] = [];
    const unexploredValues: number[] = [];
    for (let x = 0; x < scenario.width; x += 1) {
      for (let y = 0; y < scenario.height; y += 1) {
        const key = pointKey({ x, y });
        if (visible.has(key)) continue;
        const left = x - scenario.width / 2;
        const right = left + 1;
        const top = y - scenario.height / 2;
        const bottom = top + 1;
        const values = explored.has(key) ? exploredValues : unexploredValues;
        values.push(left, 0.01, top, right, 0.01, top, right, 0.01, bottom, left, 0.01, top, right, 0.01, bottom, left, 0.01, bottom);
      }
    }
    return [new Float32Array(exploredValues), new Float32Array(unexploredValues)];
  }, [explored, scenario, visible]);

  return <>
    <mesh renderOrder={3}>
      <bufferGeometry><bufferAttribute attach="attributes-position" args={[exploredPositions, 3]} /></bufferGeometry>
      <meshBasicMaterial color="#07101a" transparent opacity={0.45} depthWrite={false} />
    </mesh>
    <mesh renderOrder={3}>
      <bufferGeometry><bufferAttribute attach="attributes-position" args={[unexploredPositions, 3]} /></bufferGeometry>
      <meshBasicMaterial color="#02040a" transparent opacity={0.9} depthWrite={false} />
    </mesh>
  </>;
};

const LastKnownEnemyMarkers = ({ positions, visibleEnemyIds, width, height }: { positions: Record<string, { x: number; y: number }>; visibleEnemyIds: ReadonlySet<string>; width: number; height: number }) => <>
  {Object.entries(positions).filter(([id]) => !visibleEnemyIds.has(id)).map(([id, point]) => <group key={id} position={[point.x + 0.5 - width / 2, 0.055, point.y + 0.5 - height / 2]}>
    <mesh rotation={[-Math.PI / 2, 0, 0]}>
      <ringGeometry args={[0.28, 0.34, 24]} />
      <meshBasicMaterial color="#94a3b8" transparent opacity={0.78} />
    </mesh>
    <mesh rotation={[0, Math.PI / 4, 0]}><boxGeometry args={[0.5, 0.025, 0.055]} /><meshBasicMaterial color="#94a3b8" transparent opacity={0.78} /></mesh>
    <mesh rotation={[0, -Math.PI / 4, 0]}><boxGeometry args={[0.5, 0.025, 0.055]} /><meshBasicMaterial color="#94a3b8" transparent opacity={0.78} /></mesh>
    <Html center position={[0, 0.55, 0]} style={{ pointerEvents: "none" }}><div className="whitespace-nowrap border border-slate-400/60 bg-slate-950/85 px-1 font-mono text-[7px] font-bold uppercase text-slate-300">Last seen</div></Html>
  </group>)}
</>;

const MovementPerimeter = ({ cells, scenario }: { cells: Map<string, { x: number; y: number; elevationLevel?: number }>; scenario: CombatScenario }) => {
  const positions = useMemo(() => {
    const values: number[] = [];
    const occupied = new Set(cells.keys());
    const edge = (cell: { x: number; y: number; elevationLevel?: number }, fromX: number, fromY: number, toX: number, toY: number) => {
      const elevation = (cell.elevationLevel !== undefined ? cell.elevationLevel * TACTICAL_WALL_HEIGHT : tacticalVisualHeightAt(scenario, cell)) + 0.045;
      values.push(fromX - scenario.width / 2, elevation, fromY - scenario.height / 2, toX - scenario.width / 2, elevation, toY - scenario.height / 2);
    };
    cells.forEach((cell) => {
      if (!occupied.has(pointKey({ x: cell.x, y: cell.y - 1 }))) edge(cell, cell.x, cell.y, cell.x + 1, cell.y);
      if (!occupied.has(pointKey({ x: cell.x + 1, y: cell.y }))) edge(cell, cell.x + 1, cell.y, cell.x + 1, cell.y + 1);
      if (!occupied.has(pointKey({ x: cell.x, y: cell.y + 1 }))) edge(cell, cell.x + 1, cell.y + 1, cell.x, cell.y + 1);
      if (!occupied.has(pointKey({ x: cell.x - 1, y: cell.y }))) edge(cell, cell.x, cell.y + 1, cell.x, cell.y);
    });
    return new Float32Array(values);
  }, [cells, scenario]);

  if (positions.length === 0) return null;
  return <lineSegments>
    <bufferGeometry><bufferAttribute attach="attributes-position" args={[positions, 3]} /></bufferGeometry>
    <lineBasicMaterial color="#facc15" />
  </lineSegments>;
};

const MovementPreview = ({ origin, originElevationLevel, path, elevationLevels, destination, scenario }: { origin: { x: number; y: number }; originElevationLevel?: number; path: { x: number; y: number }[]; elevationLevels?: number[]; destination: { x: number; y: number }; scenario: CombatScenario }) => {
  const worldPoint = (point: { x: number; y: number }, level?: number): [number, number, number] => [point.x + 0.5 - scenario.width / 2, (level !== undefined ? level * TACTICAL_WALL_HEIGHT : tacticalVisualHeightAt(scenario, point)) + 0.075, point.y + 0.5 - scenario.height / 2];
  return <>
    <Line points={[worldPoint(origin, originElevationLevel), ...path.map((point, index) => worldPoint(point, elevationLevels?.[index]))]} color="#67e8f9" lineWidth={2} />
    <mesh position={worldPoint(destination, elevationLevels?.[elevationLevels.length - 1])} rotation={[-Math.PI / 2, 0, 0]}>
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

const DeploymentArea = ({ scenario, onSelectCell }: { scenario: CombatScenario; onSelectCell: (point: { x: number; y: number }) => void }) => <>
  {(scenario.deploymentCells ?? []).map((cell) => <mesh key={`deployment:${cell.x}:${cell.y}`} position={[cell.x + 0.5 - scenario.width / 2, tacticalVisualHeightAt(scenario, cell) + 0.04, cell.y + 0.5 - scenario.height / 2]} rotation={[-Math.PI / 2, 0, 0]} onClick={(event) => { event.stopPropagation(); onSelectCell(cell); }}>
    <planeGeometry args={[0.88, 0.88]} />
    <meshBasicMaterial color="#22c55e" transparent opacity={0.22} depthWrite={false} />
  </mesh>)}
</>;

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

const FireArea = ({ cells, selected, scenario }: { cells: { x: number; y: number }[]; selected: { x: number; y: number } | null; scenario: CombatScenario }) => <>
  {cells.map((point) => {
    const highlighted = Boolean(selected && pointKey(selected) === pointKey(point));
    return <group key={`fire:${pointKey(point)}`} position={[point.x + 0.5 - scenario.width / 2, tacticalVisualHeightAt(scenario, point) + 0.24, point.y + 0.5 - scenario.height / 2]}>
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

const LiquidHydrogenAreas = ({ scenario }: { scenario: CombatScenario }) => <>
  {(scenario.liquidHydrogenAreas ?? []).map((area) => {
    const minX = Math.min(...area.cells.map((cell) => cell.x));
    const maxX = Math.max(...area.cells.map((cell) => cell.x));
    const minY = Math.min(...area.cells.map((cell) => cell.y));
    const maxY = Math.max(...area.cells.map((cell) => cell.y));
    const width = maxX - minX + 1;
    const depth = maxY - minY + 1;
    const position: [number, number, number] = [minX + width / 2 - scenario.width / 2, tacticalVisualHeightAt(scenario, area.cells[0]), minY + depth / 2 - scenario.height / 2];
    return <group key={area.id} position={position}>
      {[[0, -depth / 2 + 0.08, width, 0.16], [0, depth / 2 - 0.08, width, 0.16], [-width / 2 + 0.08, 0, 0.16, depth], [width / 2 - 0.08, 0, 0.16, depth]].map(([x, z, rimWidth, rimDepth], index) => <mesh key={index} position={[x, 0.09, z]} castShadow receiveShadow>
        <boxGeometry args={[rimWidth, 0.18, rimDepth]} />
        <meshStandardMaterial color="#64748b" roughness={0.58} metalness={0.4} />
      </mesh>)}
      <mesh position={[0, area.filled ? 0.065 : 0.018, 0]} receiveShadow>
        <boxGeometry args={[width - 0.24, area.filled ? 0.08 : 0.025, depth - 0.24]} />
        <meshStandardMaterial color={area.filled ? "#67e8f9" : "#0f172a"} emissive={area.filled ? "#0891b2" : "#000000"} emissiveIntensity={area.filled ? 0.32 : 0} roughness={area.filled ? 0.16 : 0.82} metalness={area.filled ? 0.18 : 0.3} transparent={area.filled} opacity={area.filled ? 0.82 : 1} />
      </mesh>
    </group>;
  })}
</>;

const TacticalTerrainPiece = ({ object, mapWidth, mapHeight, elevation, selected, terminalActive, damage, onSelect }: { object: TacticalTerrainObject; mapWidth: number; mapHeight: number; elevation: number; selected: boolean; terminalActive: boolean; damage: number; onSelect: (point: { x: number; y: number }) => void }) => {
  if (object.kind === "terminal") {
    if (object.visualKind === "human") {
      const position: [number, number, number] = [object.position.x + 0.5 - mapWidth / 2, elevation + 0.02, object.position.y + 0.5 - mapHeight / 2];
      return <group position={position} onClick={(event) => { event.stopPropagation(); onSelect(object.position); }}>
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.018, 0]}>
          <ringGeometry args={[0.35, 0.44, 32]} />
          <meshBasicMaterial color={selected ? "#facc15" : terminalActive ? "#22c55e" : "#a855f7"} transparent opacity={0.9} />
        </mesh>
        <Suspense fallback={<AnimatedCombatantFallback color="#a855f7" />}>
          <AnimatedCombatantModel animation="idle" facing={interactiveHumanModelFacingForTacticalRotation(object.facing)} modelPath={object.modelPath ?? "/models/character-combat/female.glb"} />
        </Suspense>
        <Html center position={[0, 1.25, 0]} style={{ pointerEvents: "none" }}><div className="whitespace-nowrap border border-purple-400/70 bg-slate-950/90 px-1.5 py-0.5 font-mono text-[7px] uppercase tracking-wider text-purple-100">{object.label}</div></Html>
      </group>;
    }
    const position: [number, number, number] = [object.position.x + 0.5 - mapWidth / 2, elevation + 0.38, object.position.y + 0.5 - mapHeight / 2];
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
  if (object.kind === "hatch") {
    const position: [number, number, number] = [object.position.x + 0.5 - mapWidth / 2, elevation + 0.035, object.position.y + 0.5 - mapHeight / 2];
    const rimColor = selected ? "#facc15" : object.open ? "#22c55e" : "#d97706";
    return <group position={position} onClick={(event) => { event.stopPropagation(); onSelect(object.position); }}>
      {[[0, 0.39, 0.78, 0.08], [0, -0.39, 0.78, 0.08], [0.39, 0, 0.08, 0.78], [-0.39, 0, 0.08, 0.78]].map(([x, z, width, depth], index) => <mesh key={index} position={[x, 0.015, z]} castShadow receiveShadow>
        <boxGeometry args={[width, 0.08, depth]} />
        <meshStandardMaterial color={rimColor} roughness={0.5} metalness={0.62} />
      </mesh>)}
      {object.open ? <mesh position={[0, -0.025, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[0.7, 0.7]} />
        <meshBasicMaterial color="#020617" />
      </mesh> : <>
        <mesh position={[0, 0.015, 0]} castShadow receiveShadow>
          <boxGeometry args={[0.7, 0.06, 0.7]} />
          <meshStandardMaterial color="#475569" roughness={0.58} metalness={0.55} />
        </mesh>
        {[Math.PI / 4, -Math.PI / 4].map((angle) => <mesh key={angle} position={[0, 0.051, 0]} rotation={[0, angle, 0]}>
          <boxGeometry args={[0.72, 0.01, 0.018]} />
          <meshBasicMaterial color="#cbd5e1" />
        </mesh>)}
      </>}
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
  if (object.portalType === "iris-valve") {
    return <group position={position} rotation={[0, horizontal ? 0 : Math.PI / 2, 0]} onClick={(event) => { event.stopPropagation(); onSelect({ x: Math.floor(event.point.x + mapWidth / 2), y: Math.floor(event.point.z + mapHeight / 2) }); }}>
      <mesh position={[0, 0, -0.11]} castShadow receiveShadow>
        <extrudeGeometry args={[IRIS_WALL_SHAPE, IRIS_WALL_EXTRUSION]} />
        <meshStandardMaterial color="#64748b" roughness={0.72} metalness={0.22} />
      </mesh>
      <mesh castShadow receiveShadow>
        <torusGeometry args={[0.33, 0.055, 10, 32]} />
        <meshStandardMaterial color={selected ? "#facc15" : object.open ? "#22c55e" : "#d97706"} roughness={0.48} metalness={0.65} />
      </mesh>
      {!object.open && <>
        <mesh rotation={[Math.PI / 2, 0, 0]} castShadow receiveShadow>
          <cylinderGeometry args={[0.29, 0.29, 0.08, 6]} />
          <meshStandardMaterial color="#475569" roughness={0.55} metalness={0.58} />
        </mesh>
        {[-0.047, 0.047].flatMap((faceZ) => [0, Math.PI / 3, 2 * Math.PI / 3].map((angle) => <mesh key={`${faceZ}:${angle}`} position={[0, 0, faceZ]} rotation={[0, 0, angle]}>
          <boxGeometry args={[0.55, 0.012, 0.008]} />
          <meshBasicMaterial color="#cbd5e1" />
        </mesh>))}
      </>}
    </group>;
  }
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

const MapCombatant = ({ combatant, mapWidth, mapHeight, elevation, movement, selected, deploymentFacingIndicator, targetable, targeted, onSelect }: { combatant: Combatant; mapWidth: number; mapHeight: number; elevation: number; movement?: { sequence: number; path: [number, number, number][]; mode: "walk" | "run" }; selected: boolean; deploymentFacingIndicator: boolean; targetable: boolean; targeted: boolean; onSelect: () => void }) => {
  const enemy = combatant.side === "enemy";
  const accent = enemy ? "#ef4444" : "#22d3ee";
  const facingMarkerPosition: [number, number, number] = combatant.facing === "north" ? [0, 0.025, -0.55] : combatant.facing === "east" ? [0.55, 0.025, 0] : combatant.facing === "south" ? [0, 0.025, 0.55] : [-0.55, 0.025, 0];
  return <AnimatedCombatantPlacement position={[combatant.position.x - mapWidth / 2 + 0.5, elevation + 0.02, combatant.position.y - mapHeight / 2 + 0.5]} rotation={[0, 0, 0]} finalFacing={combatant.facing} movement={movement} onClick={(event) => { event.stopPropagation(); onSelect(); }}>
  {(moving, visualFacing) => <>
    {(!enemy || targetable || targeted) && <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.018, 0]}>
      <ringGeometry args={targeted ? [0.29, 0.49, 32] : targetable ? [0.37, 0.44, 32] : [0.34, 0.47, 32]} />
      <meshBasicMaterial color={targeted ? "#ff1f1f" : selected ? "#facc15" : accent} transparent opacity={targetable || selected || targeted ? 1 : 0.72} />
    </mesh>}
    {deploymentFacingIndicator && <mesh position={facingMarkerPosition} rotation={[-Math.PI / 2, 0, 0]}>
      <circleGeometry args={[0.13, 3]} />
      <meshBasicMaterial color="#facc15" />
    </mesh>}
    <Suspense fallback={<AnimatedCombatantFallback color={accent} />}>
      <AnimatedCombatantModel animation={moving ? movement?.mode ?? "walk" : "idle"} facing={visualFacing} pose={combatant.woundState === "dead" ? "stunned" : null} modelPath={combatant.modelPath} />
    </Suspense>
    <Html center position={[0, 1.25, 0]} style={{ pointerEvents: "none" }}>
      <div className={`whitespace-nowrap border px-2 py-1 font-mono text-[10px] font-bold uppercase tracking-wider ${selected || targeted ? "border-yellow-300 bg-yellow-950/95 text-yellow-100" : enemy ? "border-red-500/70 bg-slate-950/90 text-red-100" : "border-cyan-500/70 bg-slate-950/90 text-cyan-100"}`}>{combatant.name}</div>
    </Html>
  </>}
</AnimatedCombatantPlacement>;
};

const TacticalScene = ({ crewVisibility, exploredCells, lastKnownEnemyPositions, visibleEnemyIds }: { crewVisibility: ReadonlyMap<string, unknown>; exploredCells: ReadonlySet<string>; lastKnownEnemyPositions: Record<string, { x: number; y: number }>; visibleEnemyIds: ReadonlySet<string> }) => {
  const dispatch = useAppDispatch();
  const tacticalMap = useAppSelector((state) => state.plugins.characterCombat.tacticalMap) ?? DEFAULT_MAP;
  const mapWidth = tacticalMap.scenario.width;
  const mapHeight = tacticalMap.scenario.height;
  const combatants = tacticalMap.scenario.combatants;
  const focusX = combatants.length > 0 ? combatants.reduce((total, unit) => total + unit.position.x + 0.5 - mapWidth / 2, 0) / combatants.length : 0;
  const focusZ = combatants.length > 0 ? combatants.reduce((total, unit) => total + unit.position.y + 0.5 - mapHeight / 2, 0) / combatants.length : 0;
  const selectedId = tacticalMap.scenarioStatus === "setup" ? tacticalMap.deploymentCharacterId : tacticalMap.activeCharacterId;
  const selected = combatants.find((unit) => unit.id === selectedId && unit.side === "player") ?? null;
  const selectedPosition = selected?.position ?? null;
  const selectedActionPoints = selected ? tacticalMap.actionPointsByCharacterId[selected.id] ?? 0 : 0;
  const selectedFacing = selected?.facing ?? "south";
  const selectedProne = selected?.posture === "prone";
  const selectedSuppressed = Boolean(selected && tacticalMap.suppressedCombatantIds.includes(selected.id));
  const selectedDragging = Boolean(selected && tacticalMap.draggingCombatantByCarrierId[selected.id]);
  const validTargetIds = new Set(selected && !selectedDragging ? tacticalRangedEnemies(tacticalMap.scenario, selected.id).map((unit) => unit.id) : []);
  const validMeleeTargetIds = new Set(selected && !selectedDragging ? meleeEnemies(tacticalMap.scenario, selected.id).map((unit) => unit.id) : []);
  const tacticalTerrain = useMemo(() => activeTacticalTerrainObjects(tacticalMap.scenario, tacticalMap.doorOpenById, tacticalMap.destroyedTerrainObjectIds), [tacticalMap.destroyedTerrainObjectIds, tacticalMap.doorOpenById, tacticalMap.scenario]);
  const blockedCells = useMemo(() => tacticalTerrainBlockedCells(tacticalTerrain), [tacticalTerrain]);
  const blockedEdges = useMemo(() => tacticalTerrainBlockedEdges(tacticalTerrain), [tacticalTerrain]);
  const wallRuns = useMemo(() => tacticalWallVisualRuns(tacticalTerrain), [tacticalTerrain]);
  const wallCorners = useMemo(() => tacticalWallCornerPoints(tacticalTerrain), [tacticalTerrain]);
  const reachableMoves = useMemo(() => {
    if (!selectedPosition || !tacticalMap.movementMode) return new Map();
    if (selectedProne) return new Map();
    const activeOccupantsByCell = tacticalOccupantCounts(tacticalMap.scenario, selected?.id);
    const moves = tacticalMap.movementMode === "sidestep"
      ? sidestepAndBackstepMoves({ width: mapWidth, height: mapHeight, origin: selectedPosition, facing: selectedFacing, allowance: selectedActionPoints, blockedCells, blockedEdges, activeOccupantsByCell, terrainByCell: tacticalMap.scenario.terrainByCell, elevationLevelByCell: tacticalMap.scenario.elevationLevelByCell, closeMachineryCells: tacticalMap.scenario.closeMachineryCells, elevationAccessCells: tacticalMap.scenario.elevationAccessCells })
      : reachableOpenMapMovement({ width: mapWidth, height: mapHeight, origin: selectedPosition, originElevationLevel: selected?.elevationLevel, facing: selectedFacing, allowance: Math.min(6, selectedActionPoints), trotting: tacticalMap.movementMode === "trot", blockedCells, blockedEdges, activeOccupantsByCell, terrainByCell: tacticalMap.scenario.terrainByCell, elevationLevelByCell: tacticalMap.scenario.elevationLevelByCell, bridges: tacticalMap.scenario.bridges, closeMachineryCells: tacticalMap.scenario.closeMachineryCells, elevationAccessCells: tacticalMap.scenario.elevationAccessCells });
    const enemyPositions = new Set(combatants.filter((unit) => unit.side === "enemy" && !unit.defeated).map((unit) => `${pointKey(unit.position)}@${unit.elevationLevel ?? tacticalMap.scenario.elevationLevelByCell?.[pointKey(unit.position)] ?? 0}`));
    const legalMoves = new Map([...moves].filter(([, move]) => {
      const enemyStepIndex = move.path.findIndex((point, index) => enemyPositions.has(`${pointKey(point)}@${move.pathElevationLevels?.[index] ?? tacticalMap.scenario.elevationLevelByCell?.[pointKey(point)] ?? 0}`));
      const entryTarget = combatants.find((unit) => unit.id === tacticalMap.plannedEnemyEntryTargetId);
      const plannedEntry = entryTarget && pointKey(move.destination) === pointKey(entryTarget.position) && move.finalElevationLevel === (entryTarget.elevationLevel ?? tacticalMap.scenario.elevationLevelByCell?.[pointKey(entryTarget.position)] ?? 0);
      return enemyStepIndex < 0 || (plannedEntry && enemyStepIndex === move.path.length - 1);
    }));
    return tacticalMap.movementMode === "evade"
      ? new Map([...legalMoves].filter(([, move]) => move.path.length === 1 && (activeOccupantsByCell.get(pointKey(move.destination)) ?? 0) === 0))
      : selectedSuppressed || selectedDragging ? new Map([...legalMoves].filter(([, move]) => move.path.length <= 2)) : legalMoves;
  }, [blockedCells, blockedEdges, combatants, mapHeight, mapWidth, selected?.elevationLevel, selected?.id, selectedActionPoints, selectedDragging, selectedFacing, selectedPosition, selectedProne, selectedSuppressed, tacticalMap.movementMode, tacticalMap.plannedEnemyEntryTargetId, tacticalMap.scenario]);
  const reachableCells = useMemo(() => {
    const cells = new Map([...reachableMoves].map(([key, move]) => [key, { ...move.destination, elevationLevel: move.finalElevationLevel }]));
    if (selectedPosition && tacticalMap.movementMode && reachableMoves.size > 0) cells.set(pointKey(selectedPosition), { ...selectedPosition, elevationLevel: selected?.elevationLevel });
    return cells;
  }, [reachableMoves, selected?.elevationLevel, selectedPosition, tacticalMap.movementMode]);
  const validMeleeDiveTargetIds = new Set(selected && tacticalMap.movementMode === "trot" && !selectedProne && !selectedSuppressed && !selectedDragging
    ? combatants.filter((unit) => unit.side === "enemy" && !unit.defeated && reachableMoves.has(pointKey(unit.position))).map((unit) => unit.id)
    : []);
  const plannedMove = tacticalMap.plannedDestination ? reachableMoves.get(pointKey(tacticalMap.plannedDestination)) ?? null : null;
  const plannedLiquidHydrogenEntry = plannedMove?.path.find((point: { x: number; y: number }) => filledLiquidHydrogenCellKeys(tacticalMap.scenario).has(pointKey(point))) ?? null;
  const coveringFireTargetOptions = useMemo(() => selected && tacticalMap.coveringFireTargeting ? validCoveringFireTargets(tacticalMap.scenario, selected.id) : [], [selected, tacticalMap.coveringFireTargeting, tacticalMap.scenario]);
  const plannedCoveringFireCells = selectedPosition && selected?.weapon && tacticalMap.plannedCoveringFireTarget ? coveringFireDangerSpaceCells(tacticalMap.scenario, selectedPosition, tacticalMap.plannedCoveringFireTarget, selected.weapon.extremeRange) : [];
  const plannedGrenadeBlastCells = tacticalMap.plannedGrenadeTarget ? tacticalMap.grenadeKind === "smoke" ? grenadeBlastCells(tacticalMap.scenario, tacticalMap.plannedGrenadeTarget) : collateralBlastCells(tacticalMap.scenario, tacticalMap.plannedGrenadeTarget) : [];
  const selectMapCell = (point: { x: number; y: number }) => tacticalMap.scenarioStatus === "setup"
    ? dispatch(deployTacticalCharacter(point))
    : tacticalMap.coveringFireTargeting ? dispatch(previewTacticalCoveringFire(point))
    : tacticalMap.grenadeTargeting
      ? dispatch(previewTacticalGrenadeTarget(point))
      : dispatch(previewTacticalMove(reachableMoves.has(pointKey(point)) ? point : null));

  return <>
    <color attach="background" args={["#050a12"]} />
    <ambientLight intensity={1.4} />
    <directionalLight position={[5, 10, 6]} intensity={2.2} castShadow />
    <OrthographicCamera makeDefault position={[focusX + 8, 12, focusZ + 10]} zoom={42} near={0.1} far={300} />
    <OrbitControls makeDefault target={[focusX, 0, focusZ]} enableDamping dampingFactor={0.12} screenSpacePanning minZoom={8} maxZoom={120} minPolarAngle={0.2} maxPolarAngle={Math.PI / 2.05} />
    <TacticalGrid width={mapWidth} height={mapHeight} gridSize={tacticalMap.gridSize} onSelectCell={selectMapCell} />
    <TacticalElevationTerrain scenario={tacticalMap.scenario} onSelectCell={selectMapCell} />
    <TacticalBridges scenario={tacticalMap.scenario} onSelectCell={selectMapCell} />
    <TacticalCloseMachineryTerrain scenario={tacticalMap.scenario} onSelectCell={selectMapCell} />
    {tacticalMap.scenarioStatus === "setup" && <DeploymentArea scenario={tacticalMap.scenario} onSelectCell={selectMapCell} />}
    <TacticalLightingOverlay scenario={tacticalMap.scenario} />
    <TacticalFogOverlay scenario={tacticalMap.scenario} visible={crewVisibility} explored={exploredCells} />
    <LastKnownEnemyMarkers positions={lastKnownEnemyPositions} visibleEnemyIds={visibleEnemyIds} width={mapWidth} height={mapHeight} />
    {!tacticalMap.coveringFireTargeting && !tacticalMap.grenadeTargeting && <MovementPerimeter cells={reachableCells} scenario={tacticalMap.scenario} />}
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
    <LiquidHydrogenAreas scenario={tacticalMap.scenario} />
    <FireArea cells={tacticalMap.scenario.fireCells ?? []} selected={tacticalMap.plannedExtinguishFire ?? null} scenario={tacticalMap.scenario} />
    <SmokeArea cells={tacticalMap.scenario.smokeCells ?? []} width={mapWidth} height={mapHeight} />
    {wallRuns.map((run) => <TacticalWallRun key={run.segmentIds.join(":")} run={run} mapWidth={mapWidth} mapHeight={mapHeight} />)}
    {wallCorners.map((corner) => <mesh key={`${corner.x}:${corner.y}`} position={[corner.x - mapWidth / 2, TACTICAL_WALL_CENTER_Y, corner.y - mapHeight / 2]} castShadow receiveShadow>
      <boxGeometry args={[0.22, TACTICAL_WALL_HEIGHT, 0.22]} />
      <meshStandardMaterial color="#64748b" roughness={0.72} metalness={0.22} />
    </mesh>)}
    {tacticalTerrain.map((object) => <TacticalTerrainPiece key={object.id} object={object} mapWidth={mapWidth} mapHeight={mapHeight} elevation={object.kind === "terminal" || object.kind === "hatch" ? tacticalVisualHeightAt(tacticalMap.scenario, object.position) : 0} selected={tacticalMap.selectedTerrainObjectId === object.id} terminalActive={object.kind === "terminal" && Boolean(tacticalMap.terminalActiveById[object.id])} damage={tacticalMap.terrainDamageById[object.id] ?? 0} onSelect={(point) => tacticalMap.coveringFireTargeting ? dispatch(previewTacticalCoveringFire(point)) : dispatch(selectTacticalTerrainObject(object.id))} />)}
    {selectedPosition && plannedMove && <MovementPreview origin={selectedPosition} originElevationLevel={selected?.elevationLevel} path={plannedMove.path} elevationLevels={plannedMove.pathElevationLevels} destination={plannedMove.destination} scenario={tacticalMap.scenario} />}
    {plannedLiquidHydrogenEntry && <group position={[plannedLiquidHydrogenEntry.x + 0.5 - mapWidth / 2, tacticalVisualHeightAt(tacticalMap.scenario, plannedLiquidHydrogenEntry) + 0.12, plannedLiquidHydrogenEntry.y + 0.5 - mapHeight / 2]}>
      <mesh rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.28, 0.46, 32]} />
        <meshBasicMaterial color="#ef4444" />
      </mesh>
      <Html center position={[0, 0.52, 0]} style={{ pointerEvents: "none" }}><div className="whitespace-nowrap border border-red-400 bg-black/95 px-1.5 py-0.5 font-mono text-[8px] font-bold uppercase text-red-100">Lethal liquid hydrogen</div></Html>
    </group>}
    {combatants.filter((combatant) => (combatant.side === "player" ? tacticalMap.scenarioStatus !== "setup" || (tacticalMap.deployedCharacterIds ?? []).includes(combatant.id) : crewVisibility.has(pointKey(combatant.position)))).map((combatant) => {
      const animation = tacticalMap.movementAnimationByCharacterId[combatant.id];
      const worldMovement = animation ? { ...animation, path: animation.path.map((point, index) => [point.x + 0.5 - mapWidth / 2, (animation.elevationLevels?.[index] !== undefined ? animation.elevationLevels[index] * TACTICAL_WALL_HEIGHT : tacticalVisualHeightAt(tacticalMap.scenario, point)) + 0.02, point.y + 0.5 - mapHeight / 2] as [number, number, number]) } : undefined;
      return <MapCombatant key={combatant.id} combatant={combatant} mapWidth={mapWidth} mapHeight={mapHeight} elevation={tacticalCombatantHeight(tacticalMap.scenario, combatant)} movement={worldMovement} selected={selected?.id === combatant.id} deploymentFacingIndicator={tacticalMap.scenarioStatus === "setup" && selected?.id === combatant.id} targetable={validTargetIds.has(combatant.id) || validMeleeTargetIds.has(combatant.id) || validMeleeDiveTargetIds.has(combatant.id)} targeted={tacticalMap.plannedAttackTargetId === combatant.id || tacticalMap.plannedMeleeTargetId === combatant.id} onSelect={() => {
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

const TacticalCharacterButton = ({ character, actionPoints, selected, disabled, setup, onSelect }: { character: CharacterSummary; actionPoints: number; selected: boolean; disabled: boolean; setup: boolean; onSelect: () => void }) => {
  const portraitPath = character.avatar?.currentPortraitPath ?? null;
  const [failedPortraitPath, setFailedPortraitPath] = useState<string | null>(null);
  const showPortrait = portraitPath && failedPortraitPath !== portraitPath;

  return <button type="button" disabled={disabled} onClick={onSelect} aria-label={`Select ${character.name}${setup ? " for deployment" : `, ${actionPoints} AP`}`} aria-pressed={selected} title={`Select ${character.name}${setup ? " for deployment" : ` · ${actionPoints} AP`}`} className={`group relative flex h-16 w-16 shrink-0 flex-col items-center justify-end border p-1 transition-colors ${selected ? "border-yellow-200 bg-yellow-300/20 text-yellow-50 shadow-[0_0_12px_rgba(250,204,21,0.35)]" : "border-(--hud-border) bg-(--hud-bg)/90 text-(--hud-text-dim) hover:border-cyan-300 hover:text-(--hud-text)"} disabled:cursor-not-allowed disabled:grayscale disabled:opacity-45`}>
    <span className="absolute right-0.5 top-0.5 border border-emerald-400/60 bg-emerald-950 px-1 text-[7px] text-emerald-100">{setup ? "Deploy" : `${actionPoints} AP`}</span>
    <span className="relative mb-1 h-10 w-10 overflow-hidden rounded-sm border border-(--hud-border-subtle) bg-black/50">
      {showPortrait ? <Image src={portraitPath} alt="" fill sizes="40px" onError={() => setFailedPortraitPath(portraitPath)} className="object-cover" /> : <span className="flex h-full w-full items-center justify-center text-sm font-bold uppercase">{character.name.slice(0, 1)}</span>}
    </span>
    <span className="w-full truncate text-center text-[7px] font-bold leading-none">{character.name}</span>
  </button>;
};

const TacticalAllyButton = ({ combatant, actionPoints, selected, onSelect }: { combatant: Combatant; actionPoints: number; selected: boolean; onSelect: () => void }) => <button type="button" disabled={actionPoints < 1} onClick={onSelect} aria-label={`Select ally ${combatant.name}, ${actionPoints} AP`} aria-pressed={selected} className={`group relative flex h-16 w-16 shrink-0 flex-col items-center justify-end border p-1 transition-colors ${selected ? "border-yellow-200 bg-yellow-300/20 text-yellow-50" : "border-emerald-500/70 bg-emerald-950/70 text-emerald-100 hover:border-emerald-200"} disabled:cursor-not-allowed disabled:grayscale disabled:opacity-45`}>
  <span className="absolute right-0.5 top-0.5 border border-emerald-400/60 bg-emerald-950 px-1 text-[7px] text-emerald-100">{actionPoints} AP</span>
  <span className="mb-1 flex h-10 w-10 items-center justify-center rounded-sm border border-emerald-600/60 bg-black/50 text-sm font-bold uppercase">{combatant.name.slice(0, 1)}</span>
  <span className="w-full truncate text-center text-[7px] font-bold leading-none">{combatant.name}</span>
</button>;

const TacticalEnemyStatusCard = ({ combatant, state, sight, selected, onSelect }: { combatant: Combatant; state: string; sight: "target" | "los" | "no-los"; selected: boolean; onSelect: () => void }) => {
  const [failedPortraitPath, setFailedPortraitPath] = useState<string | null>(null);
  const wound = `${combatant.woundState}${(combatant.seriousWounds ?? 0) > 0 ? ` · serious ${combatant.seriousWounds}/2` : ""}`;
  const sightLabel = sight === "target" ? "Target" : sight === "los" ? "LOS" : "No LOS";
  const portraitPath = combatant.avatarPath ?? null;
  const showPortrait = portraitPath && failedPortraitPath !== portraitPath;
  return <button type="button" disabled={sight !== "target"} onClick={onSelect} aria-label={`${sight === "target" ? "Target" : "Enemy"} ${combatant.name}, ${sightLabel}, state ${state}, wound ${wound}`} aria-pressed={selected} className={`relative flex h-16 w-24 shrink-0 flex-col justify-end border p-1 text-left transition-colors ${selected ? "border-red-100 bg-red-500/25 text-red-50 shadow-[0_0_12px_rgba(248,113,113,0.4)]" : sight === "target" ? "border-red-300 bg-red-950/80 text-red-100 hover:bg-red-900/80" : sight === "los" ? "border-red-500/50 bg-red-950/50 text-red-200" : "border-slate-600/60 bg-slate-950/80 text-slate-500"} disabled:cursor-not-allowed`}>
    <span className="absolute left-1 top-1 flex h-7 w-7 items-center justify-center overflow-hidden border border-red-400/40 bg-black/60 text-xs font-bold uppercase">{showPortrait ? <Image src={portraitPath} alt="" fill sizes="28px" onError={() => setFailedPortraitPath(portraitPath)} className="object-cover" /> : combatant.name.slice(0, 1)}</span>
    <span className={`absolute right-1 top-1 border px-1 text-[6px] font-bold uppercase ${sight === "target" ? "border-red-300 bg-red-950 text-red-100" : sight === "los" ? "border-amber-300/70 bg-amber-950 text-amber-100" : "border-slate-600 bg-slate-950 text-slate-400"}`}>{sightLabel}</span>
    <span className="w-full truncate text-[7px] font-bold leading-none">{combatant.name}</span>
    <span className="mt-1 w-full truncate text-[6px] uppercase leading-none">State: {state}</span>
    <span className="mt-0.5 w-full truncate text-[6px] uppercase leading-none">Wound: {wound}</span>
  </button>;
};

const TacticalMapPageClient = ({ draftPlaytest }: { draftPlaytest?: { definition: TacticalScenarioDefinitionFile; consoleVictory: TacticalConsoleVictoryDefinitionFile; onExit: () => void } }) => {
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
  const terrainLightsOn = (tacticalMap.scenario.lightSources ?? []).some((source) => source.on !== false);
  const scenarioHudLayout = tacticalMap.scenarioHudLayout ?? { visible: true, pinned: false, position: { x: 320, y: 190 } };
  const deploymentHudLayout = tacticalMap.deploymentHudLayout ?? { visible: true, pinned: false, position: { x: 16, y: 190 } };
  const crewVisibility = useMemo(() => tacticalCrewVisibilityMask(tacticalMap.scenario), [tacticalMap.scenario]);
  const exploredCells = useMemo(() => new Set(tacticalMap.exploredCellKeys ?? []), [tacticalMap.exploredCellKeys]);
  const visibleCellKeys = useMemo(() => [...crewVisibility.keys()], [crewVisibility]);
  const enemies = useMemo(() => tacticalMap.scenario.combatants.filter((unit) => unit.side === "enemy"), [tacticalMap.scenario.combatants]);
  const visibleEnemies = useMemo(() => enemies.filter((enemy) => crewVisibility.has(pointKey(enemy.position))), [crewVisibility, enemies]);
  const visibleEnemyIds = useMemo(() => new Set(visibleEnemies.map((enemy) => enemy.id)), [visibleEnemies]);
  const visibleEnemySightings = useMemo(() => visibleEnemies.map((enemy) => ({ id: enemy.id, position: { ...enemy.position } })), [visibleEnemies]);
  const selectedTacticalCharacterId = tacticalScenarioStatus === "setup" ? tacticalMap.deploymentCharacterId : tacticalMap.activeCharacterId;
  const activeCombatant = tacticalMap.scenario.combatants.find((unit) => unit.id === selectedTacticalCharacterId && unit.side === "player") ?? null;
  const selectedPosition = activeCombatant?.position ?? null;
  const selectedLighting = selectedPosition ? tacticalLightingLevelAt(tacticalMap.scenario, selectedPosition) : null;
  const selectedActionPoints = activeCombatant ? tacticalMap.actionPointsByCharacterId[activeCombatant.id] ?? 0 : 0;
  const selectedProne = activeCombatant?.posture === "prone";
  const selectedSuppressed = Boolean(activeCombatant && tacticalMap.suppressedCombatantIds.includes(activeCombatant.id));
  const selectedBraced = Boolean(activeCombatant && tacticalMap.bracedCombatantIds.includes(activeCombatant.id));
  const draggedCombatant = activeCombatant ? tacticalMap.scenario.combatants.find((unit) => unit.id === tacticalMap.draggingCombatantByCarrierId[activeCombatant.id]) ?? null : null;
  const draggableAllies = activeCombatant && !draggedCombatant ? tacticalMap.scenario.combatants.filter((unit) => unit.side === activeCombatant.side && unit.defeated && unit.woundState !== "dead" && Math.abs(unit.position.x - activeCombatant.position.x) + Math.abs(unit.position.y - activeCombatant.position.y) === 1 && !Object.values(tacticalMap.draggingCombatantByCarrierId).includes(unit.id)) : [];
  const livingPlayerIds = tacticalMap.scenario.combatants.filter((unit) => unit.side === "player" && !unit.defeated).map((unit) => unit.id);
  const transformedAllies = tacticalMap.scenario.combatants.filter((unit) => unit.side === "player" && unit.id.endsWith(":combatant"));
  const crewDeploymentComplete = livingPlayerIds.length > 0 && livingPlayerIds.every((id) => (tacticalMap.deployedCharacterIds ?? []).includes(id));
  const selectedCrewDeployed = Boolean(activeCombatant && (tacticalMap.deployedCharacterIds ?? []).includes(activeCombatant.id));
  const deploymentLoadouts = tacticalMap.deploymentLoadoutByCharacterId ?? {};
  const assignedLockerItemIds = new Set(Object.values(deploymentLoadouts).flatMap((loadout) => [
    ...(loadout.weaponLockerItemId ? [loadout.weaponLockerItemId] : []),
    ...(loadout.armorLockerItemId ? [loadout.armorLockerItemId] : []),
  ]));
  const selectedDeploymentLoadout = activeCombatant ? deploymentLoadouts[activeCombatant.id] ?? {} : {};
  const lockerItems = ship?.locker ?? [];
  const equippedWeaponItem = lockerItems.find((item) => item.id === selectedDeploymentLoadout.weaponLockerItemId) ?? null;
  const equippedArmorItem = lockerItems.find((item) => item.id === selectedDeploymentLoadout.armorLockerItemId) ?? null;
  const availableLockerWeapons = lockerItems.filter((item) => item.kind === "weapon" && !assignedLockerItemIds.has(item.id));
  const availableLockerArmor = lockerItems.filter((item) => item.kind === "armor" && !assignedLockerItemIds.has(item.id));
  const playerPhaseComplete = livingPlayerIds.length > 0 && livingPlayerIds.every((id) => tacticalMap.actedCharacterIds.includes(id) || (tacticalMap.actionPointsByCharacterId[id] ?? 0) === 0);
  const tacticalTerrain = useMemo(() => activeTacticalTerrainObjects(tacticalMap.scenario, tacticalMap.doorOpenById, tacticalMap.destroyedTerrainObjectIds), [tacticalMap.destroyedTerrainObjectIds, tacticalMap.doorOpenById, tacticalMap.scenario]);
  const blockedCells = useMemo(() => tacticalTerrainBlockedCells(tacticalTerrain), [tacticalTerrain]);
  const blockedEdges = useMemo(() => tacticalTerrainBlockedEdges(tacticalTerrain), [tacticalTerrain]);
  const selectedTerrain = tacticalTerrain.find((object) => object.id === tacticalMap.selectedTerrainObjectId) ?? null;
  const terrainInteractionCost = selectedTerrain?.kind === "door" ? 2 : selectedTerrain?.kind === "terminal" || selectedTerrain?.kind === "hatch" ? 6 : 0;
  const selectedDoorCommand = selectedTerrain?.kind === "door" || selectedTerrain?.kind === "hatch" ? tacticalMap.pendingDoorCommandsById[selectedTerrain.id] : null;
  const vacuumCells = depressurizedCells(tacticalMap.scenario);
  const selectedPortalPressureBlocked = selectedTerrain?.kind === "door" && selectedTerrain.portalType === "iris-valve" && !selectedTerrain.open
    ? vacuumCells.has(pointKey(selectedTerrain.separates.first)) !== vacuumCells.has(pointKey(selectedTerrain.separates.second))
    : false;
  const phaseStartPosition = activeCombatant ? tacticalMap.actionPhaseStartPositionByCombatantId[activeCombatant.id] : null;
  const terrainAdjacent = Boolean(selectedTerrain && (selectedTerrain.kind === "door"
    ? phaseStartPosition && [selectedTerrain.separates.first, selectedTerrain.separates.second].some((point) => point.x === phaseStartPosition.x && point.y === phaseStartPosition.y)
    : selectedTerrain.kind === "hatch"
      ? phaseStartPosition && Math.abs(selectedTerrain.position.x - phaseStartPosition.x) + Math.abs(selectedTerrain.position.y - phaseStartPosition.y) === 1
      : selectedTerrain.kind === "terminal" && selectedPosition && Math.abs(selectedTerrain.position.x - selectedPosition.x) + Math.abs(selectedTerrain.position.y - selectedPosition.y) === 1));
  const terminalAlreadyActive = selectedTerrain?.kind === "terminal" && Boolean(tacticalMap.terminalActiveById[selectedTerrain.id]);
  const selectedConsoleOperations = selectedTerrain?.kind === "terminal"
    ? (tacticalMap.scenario.consoleVictory?.operations ?? []).filter((operation) => `${operation.consolePlacementId}:terminal` === selectedTerrain.id)
    : [];
  const availableConsoleOperations = selectedConsoleOperations.filter((operation) => !(tacticalMap.resolvedConsoleOperationIds ?? []).includes(operation.id) && consoleOperationAvailable(operation, tacticalMap.completedConsoleOperationIds ?? []));
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
  const rangedTargets = activeCombatant && !draggedCombatant ? tacticalRangedEnemies(tacticalMap.scenario, activeCombatant.id) : [];
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
  const selectedStructureThreshold = selectedStructure?.kind === "door" ? selectedStructure.portalType === "iris-valve" ? 10 : 5 : 25;
  const selectedStructureDamage = selectedStructure ? tacticalMap.terrainDamageById[selectedStructure.id] ?? 0 : 0;
  const activeOccupantsByCell = tacticalOccupantCounts(tacticalMap.scenario, activeCombatant?.id);
  const previewedMoves = selectedPosition && activeCombatant && tacticalMap.movementMode
    ? selectedProne
      ? new Map()
      : new Map([...(tacticalMap.movementMode === "sidestep"
        ? sidestepAndBackstepMoves({ width: tacticalMap.scenario.width, height: tacticalMap.scenario.height, origin: selectedPosition, facing: activeCombatant.facing, allowance: selectedActionPoints, blockedCells, blockedEdges, activeOccupantsByCell, terrainByCell: tacticalMap.scenario.terrainByCell, elevationLevelByCell: tacticalMap.scenario.elevationLevelByCell, closeMachineryCells: tacticalMap.scenario.closeMachineryCells, elevationAccessCells: tacticalMap.scenario.elevationAccessCells })
        : reachableOpenMapMovement({ width: tacticalMap.scenario.width, height: tacticalMap.scenario.height, origin: selectedPosition, originElevationLevel: activeCombatant.elevationLevel, facing: activeCombatant.facing, allowance: Math.min(6, selectedActionPoints), trotting: tacticalMap.movementMode === "trot", blockedCells, blockedEdges, activeOccupantsByCell, terrainByCell: tacticalMap.scenario.terrainByCell, elevationLevelByCell: tacticalMap.scenario.elevationLevelByCell, bridges: tacticalMap.scenario.bridges, closeMachineryCells: tacticalMap.scenario.closeMachineryCells, elevationAccessCells: tacticalMap.scenario.elevationAccessCells }))]
        .filter(([, move]) => tacticalMap.movementMode === "evade" ? move.path.length === 1 && (activeOccupantsByCell.get(pointKey(move.destination)) ?? 0) === 0 : (!selectedSuppressed && !draggedCombatant) || move.path.length <= 2))
    : null;
  const previewedMove = tacticalMap.plannedDestination ? previewedMoves?.get(pointKey(tacticalMap.plannedDestination)) ?? null : null;
  const previewedLiquidHydrogenEntry = previewedMove?.path.find((point: { x: number; y: number }) => filledLiquidHydrogenCellKeys(tacticalMap.scenario).has(pointKey(point))) ?? null;
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
    const newlyExplored = visibleCellKeys.filter((key) => !exploredCells.has(key));
    if (newlyExplored.length > 0) dispatch(recordTacticalExploration(newlyExplored));
  }, [dispatch, exploredCells, visibleCellKeys]);
  useEffect(() => {
    dispatch(recordTacticalEnemySightings({ visibleCellKeys, enemies: visibleEnemySightings }));
  }, [dispatch, visibleCellKeys, visibleEnemySightings]);
  useEffect(() => {
    if (status !== "loaded" || shipStatus !== "loaded") return;
    const crew = characters.map((character) => ({ id: character.id, name: character.name, weaponSkill: character.skills.find((skill) => skill.name === "Gun Combat")?.level ?? 0, meleeRating: character.skills.find((skill) => skill.name === "Melee")?.level ?? 0, skills: character.skills }));
    dispatch(draftPlaytest ? initializeTacticalDraftPlaytest({ crew, definition: draftPlaytest.definition, consoleVictory: draftPlaytest.consoleVictory }) : initializeTacticalMapSetup(crew));
  }, [characters, dispatch, draftPlaytest, shipStatus, status]);
  useEffect(() => {
    const profileId = activeCombatant?.sourceCharacterId ?? activeCombatant?.id ?? null;
    if (profileId && selected?.id !== profileId) dispatch(setSelectedProfileCharacter(profileId));
  }, [activeCombatant?.id, activeCombatant?.sourceCharacterId, dispatch, selected?.id]);

  const hiddenHuds = [
    ...(!tacticalMap.characterHudLayout.visible ? [{ id: "characters", title: "Characters" }] : []),
    ...(!tacticalMap.enemyHudLayout.visible ? [{ id: "enemies", title: "Enemies" }] : []),
    ...(tacticalScenarioStatus !== "setup" && !tacticalMap.actionHudLayout.visible ? [{ id: "action", title: "Current Action" }] : []),
    ...(tacticalScenarioStatus === "setup" && !deploymentHudLayout.visible ? [{ id: "deployment", title: "Crew Deployment" }] : []),
    ...(!tacticalMap.characterInformationHudLayout.visible ? [{ id: "character-information", title: "Selected Character" }] : []),
    ...(!tacticalMap.eventsHudLayout.visible ? [{ id: "events", title: "Events" }] : []),
    ...(!scenarioHudLayout.visible ? [{ id: "scenario", title: "Scenario" }] : []),
  ];

  return <main className="h-screen w-screen overflow-hidden bg-[#050a12] [--hud-accent:#a5f3fc] [--hud-bg:#071019] [--hud-border:#42616e] [--hud-border-subtle:#29434d] [--hud-text:#e2f3f6] [--hud-text-dim:#8faab3]">
    <PluginHudLayer hiddenHuds={hiddenHuds} onRestoreHud={(id) => {
      if (id === "action") dispatch(updateTacticalActionHud({ ...tacticalMap.actionHudLayout, visible: true }));
      else if (id === "deployment") dispatch(updateTacticalDeploymentHud({ ...deploymentHudLayout, visible: true }));
      else if (id === "enemies") dispatch(updateTacticalEnemyHud({ ...tacticalMap.enemyHudLayout, visible: true }));
      else if (id === "character-information") dispatch(updateTacticalCharacterInformationHud({ ...tacticalMap.characterInformationHudLayout, visible: true }));
      else if (id === "events") dispatch(updateTacticalEventsHud({ ...tacticalMap.eventsHudLayout, visible: true }));
      else if (id === "scenario") dispatch(updateTacticalScenarioHud({ ...scenarioHudLayout, visible: true }));
      else dispatch(updateTacticalCharacterHud({ ...tacticalMap.characterHudLayout, visible: true }));
    }}>
      <Canvas events={safeCanvasEvents} shadows="basic" frameloop="demand" dpr={[1, 1.5]} onPointerMissed={() => { dispatch(setSelectedProfileCharacter(null)); dispatch(selectTacticalTerrainObject(null)); }}>
        <TacticalScene crewVisibility={crewVisibility} exploredCells={exploredCells} lastKnownEnemyPositions={tacticalMap.lastKnownEnemyPositions ?? {}} visibleEnemyIds={visibleEnemyIds} />
      </Canvas>
      <div className="pointer-events-none absolute left-4 top-4 border border-cyan-500/50 bg-slate-950/90 px-3 py-2 font-mono text-cyan-100 shadow-lg">
        <div className="text-xs font-bold uppercase tracking-[0.22em]">Tactical Map</div>
        <div className="mt-1 text-[10px] text-slate-400">Turn {tacticalMap.turn} · {tacticalMap.scenario.width}×{tacticalMap.scenario.height} implicit grid · {characters.length}/2 crew members</div>
        <div className="mt-1 text-[9px] uppercase tracking-wider text-slate-500">Drag to rotate · Right-drag to pan · Wheel to zoom</div>
      </div>
      {draftPlaytest
        ? <button type="button" onClick={draftPlaytest.onExit} className="absolute right-4 top-14 z-50 border border-amber-300/70 bg-slate-950/90 px-3 py-2 font-mono text-xs font-bold uppercase tracking-[0.18em] text-amber-100 hover:bg-amber-950">Return to editor</button>
        : <><Link href="/system" className="absolute right-4 top-14 z-50 border border-cyan-400/70 bg-slate-950/90 px-3 py-2 font-mono text-xs font-bold uppercase tracking-[0.18em] text-cyan-100 hover:bg-cyan-950">System view</Link><Link href="/system/tactical/editor" className="absolute right-4 top-24 z-50 border border-amber-300/70 bg-slate-950/90 px-3 py-2 font-mono text-xs font-bold uppercase tracking-[0.18em] text-amber-100 hover:bg-amber-950">Scenario editor</Link></>}
      <FloatingPluginHud title="Scenario" layout={scenarioHudLayout} onLayoutChange={(layout) => dispatch(updateTacticalScenarioHud(layout))} className="w-72 font-mono text-[8px] uppercase tracking-wider text-(--hud-text)">
        <div className="flex flex-col gap-2 normal-case tracking-normal">
          <div className="flex items-center justify-between gap-3 uppercase tracking-wider">
            <span className="font-bold text-cyan-100">{tacticalMap.scenario.title}</span>
            <span className={tacticalScenarioStatus === "victory" ? "text-emerald-200" : tacticalScenarioStatus === "defeat" ? "text-red-200" : tacticalScenarioStatus === "setup" ? "text-amber-200" : "text-cyan-200"}>{tacticalScenarioStatus}</span>
          </div>
          <div className="text-(--hud-text-dim)">{tacticalMap.scenario.briefing}</div>
          <div className="border-t border-(--hud-border) pt-2"><span className="uppercase text-(--hud-text-dim)">Objective</span><div className="mt-1 font-bold text-(--hud-text)">{tacticalMap.scenario.objective}</div></div>
          {tacticalScenarioStatus === "setup" && <div className="flex flex-col gap-2 border-t border-(--hud-border) pt-2">
            <div className="font-bold uppercase tracking-wider text-emerald-100">Crew deployment</div>
            <div className="text-(--hud-text-dim)">Select each crew member, then click a green deployment square.</div>
            <div className={crewDeploymentComplete ? "text-emerald-200" : "text-amber-200"}>{(tacticalMap.deployedCharacterIds ?? []).length}/{livingPlayerIds.length} crew deployed</div>
            <div className="font-bold uppercase tracking-wider text-amber-100">Starting illumination</div>
            <button type="button" aria-pressed={(tacticalMap.lightingPreset ?? "exterior-dark") === "exterior-dark"} onClick={() => dispatch(selectTacticalLightingPreset("exterior-dark"))} className={`border px-2 py-2 text-left ${tacticalMap.lightingPreset !== "exterior-lit" ? "border-cyan-200 bg-cyan-300/15 text-cyan-50" : "border-(--hud-border) text-(--hud-text-dim)"}`}>
              <span className="block font-bold uppercase">Exterior dark</span>
              <span className="block">Interiors require light sources</span>
            </button>
            <button type="button" aria-pressed={tacticalMap.lightingPreset === "exterior-lit"} onClick={() => dispatch(selectTacticalLightingPreset("exterior-lit"))} className={`border px-2 py-2 text-left ${tacticalMap.lightingPreset === "exterior-lit" ? "border-cyan-200 bg-cyan-300/15 text-cyan-50" : "border-(--hud-border) text-(--hud-text-dim)"}`}>
              <span className="block font-bold uppercase">Exterior illuminated</span>
              <span className="block">Interiors still require light sources</span>
            </button>
            <div className="font-bold uppercase tracking-wider text-amber-100">Control-room lights</div>
            <div className="grid grid-cols-2 gap-2">
              <button type="button" aria-pressed={terrainLightsOn} onClick={() => dispatch(setTacticalTerrainLights(true))} className={`border px-2 py-2 font-bold uppercase ${terrainLightsOn ? "border-amber-200 bg-amber-300/15 text-amber-50" : "border-(--hud-border) text-(--hud-text-dim)"}`}>On</button>
              <button type="button" aria-pressed={!terrainLightsOn} onClick={() => dispatch(setTacticalTerrainLights(false))} className={`border px-2 py-2 font-bold uppercase ${!terrainLightsOn ? "border-slate-200 bg-slate-300/15 text-slate-50" : "border-(--hud-border) text-(--hud-text-dim)"}`}>Off</button>
            </div>
            <button type="button" disabled={!crewDeploymentComplete} onClick={() => dispatch(startTacticalScenario())} className="h-8 border border-emerald-300 px-2 font-bold uppercase tracking-wider text-emerald-100 disabled:cursor-not-allowed disabled:opacity-40">Start Scenario</button>
          </div>}
          <div className="text-(--hud-text-dim)">Turn {tacticalMap.turn}</div>
        </div>
      </FloatingPluginHud>
      <FloatingPluginHud title="Characters" layout={tacticalMap.characterHudLayout} onLayoutChange={(layout) => dispatch(updateTacticalCharacterHud(layout))} className="font-mono text-[8px] uppercase tracking-wider text-(--hud-text)">
        <nav aria-label="Tactical character roster" className="flex max-w-[75vw] gap-1 p-1">
          {characters.map((character) => <TacticalCharacterButton key={character.id} character={character} actionPoints={tacticalMap.actionPointsByCharacterId[character.id] ?? 0} selected={activeCombatant?.id === character.id} disabled={tacticalScenarioStatus !== "setup" && (tacticalMap.actionPointsByCharacterId[character.id] ?? 0) < 1} setup={tacticalScenarioStatus === "setup"} onSelect={() => { dispatch(tacticalScenarioStatus === "setup" ? selectTacticalDeploymentCharacter(character.id) : activateTacticalCharacter(character.id)); dispatch(setSelectedProfileCharacter(character.id)); }} />)}
          {transformedAllies.map((ally) => <TacticalAllyButton key={ally.id} combatant={ally} actionPoints={tacticalMap.actionPointsByCharacterId[ally.id] ?? 0} selected={activeCombatant?.id === ally.id} onSelect={() => { dispatch(activateTacticalCharacter(ally.id)); dispatch(setSelectedProfileCharacter(null)); }} />)}
          {status === "loaded" && shipStatus === "loaded" && characters.length === 0 && <span className="px-3 py-4 text-(--hud-text-dim)">No assigned character crew</span>}
        </nav>
      </FloatingPluginHud>
      <FloatingPluginHud title="Enemies" layout={tacticalMap.enemyHudLayout} onLayoutChange={(layout) => dispatch(updateTacticalEnemyHud(layout))} className="font-mono text-[8px] uppercase tracking-wider text-(--hud-text)">
        <nav aria-label="Tactical enemy roster" className="flex max-w-[75vw] gap-1 overflow-x-auto p-1">
          {visibleEnemies.map((enemy) => {
            const targetable = rangedTargetIds.has(enemy.id) || meleeTargetIds.has(enemy.id);
            const inLineOfSight = Boolean(activeCombatant && tacticalVisibilityAssessment(tacticalMap.scenario, activeCombatant, enemy).observable);
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
          <span className="text-(--hud-text-dim)">Lighting</span><span className={selectedLighting === "dark" ? "text-slate-300" : "text-amber-100"}>{selectedLighting === "dark" ? "Dark" : "Illuminated"}</span>
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
      {tacticalScenarioStatus === "setup" && <FloatingPluginHud title="Crew Deployment" layout={deploymentHudLayout} onLayoutChange={(layout) => dispatch(updateTacticalDeploymentHud(layout))} className="w-72 font-mono text-[8px] uppercase tracking-wider text-(--hud-text)">
        <section className="flex flex-col gap-2 normal-case tracking-normal">
          <div className="font-bold uppercase tracking-wider text-emerald-100">Pregame crew state</div>
          {!activeCombatant ? <div className="text-(--hud-text-dim)">Select a crew member in the Characters HUD.</div> : <>
            <div className="font-bold text-cyan-100">{activeCombatant.name}</div>
            <div className="grid grid-cols-[4rem_1fr_auto] items-center gap-1 border-t border-(--hud-border) pt-2">
              <span className="uppercase text-(--hud-text-dim)">Weapon</span>
              <span className={equippedWeaponItem ? "font-bold text-cyan-100" : "text-(--hud-text-dim)"}>{equippedWeaponItem?.name ?? "Unarmed"}</span>
              <button type="button" disabled={!equippedWeaponItem} onClick={() => dispatch(unequipTacticalDeploymentItem({ characterId: activeCombatant.id, kind: "weapon" }))} className="border border-(--hud-border) px-1 py-0.5 text-[7px] uppercase text-(--hud-text-dim) disabled:opacity-30">Unequip</button>
              <span className="uppercase text-(--hud-text-dim)">Armor</span>
              <span className={equippedArmorItem ? "font-bold text-cyan-100" : "text-(--hud-text-dim)"}>{equippedArmorItem?.name ?? "No Armor"}</span>
              <button type="button" disabled={!equippedArmorItem} onClick={() => dispatch(unequipTacticalDeploymentItem({ characterId: activeCombatant.id, kind: "armor" }))} className="border border-(--hud-border) px-1 py-0.5 text-[7px] uppercase text-(--hud-text-dim) disabled:opacity-30">Unequip</button>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="min-w-0">
                <div className="mb-1 font-bold uppercase tracking-wider text-(--hud-text-dim)">Locker weapons</div>
                <div className="flex max-h-24 flex-col gap-1 overflow-y-auto pr-1">
                  {availableLockerWeapons.map((item) => <button key={item.id} type="button" onClick={() => dispatch(equipTacticalDeploymentItem({ characterId: activeCombatant.id, lockerItemId: item.id, catalogItemId: item.catalogItemId }))} className="border border-cyan-500/60 px-1 py-1 text-left text-[7px] text-cyan-100 hover:border-cyan-200">{item.name}</button>)}
                  {availableLockerWeapons.length === 0 && <span className="text-[7px] text-(--hud-text-dim)">No weapons available</span>}
                </div>
              </div>
              <div className="min-w-0">
                <div className="mb-1 font-bold uppercase tracking-wider text-(--hud-text-dim)">Locker armor</div>
                <div className="flex max-h-24 flex-col gap-1 overflow-y-auto pr-1">
                  {availableLockerArmor.map((item) => <button key={item.id} type="button" onClick={() => dispatch(equipTacticalDeploymentItem({ characterId: activeCombatant.id, lockerItemId: item.id, catalogItemId: item.catalogItemId }))} className="border border-cyan-500/60 px-1 py-1 text-left text-[7px] text-cyan-100 hover:border-cyan-200">{item.name}</button>)}
                  {availableLockerArmor.length === 0 && <span className="text-[7px] text-(--hud-text-dim)">No armor available</span>}
                </div>
              </div>
            </div>
            {!selectedCrewDeployed ? <div className="border border-amber-300/60 p-2 text-amber-100">Place this crew member on a green deployment square before setting facing or stance.</div> : <>
              <div className="grid grid-cols-2 gap-x-3 gap-y-1">
                <span className="text-(--hud-text-dim)">Facing</span><span className="font-bold capitalize text-yellow-100">{activeCombatant.facing}</span>
                <span className="text-(--hud-text-dim)">Stance</span><span className="font-bold capitalize">{selectedProne ? "Prone" : "Standing"}</span>
              </div>
              <div className="grid grid-cols-2 gap-1">
                <button type="button" onClick={() => dispatch(rotateTacticalDeploymentCharacter("left"))} className="h-7 border border-yellow-300 px-2 font-bold uppercase tracking-wider text-yellow-100">Rotate left</button>
                <button type="button" onClick={() => dispatch(rotateTacticalDeploymentCharacter("right"))} className="h-7 border border-yellow-300 px-2 font-bold uppercase tracking-wider text-yellow-100">Rotate right</button>
              </div>
              <button type="button" onClick={() => dispatch(setTacticalDeploymentPosture(selectedProne ? "standing" : "prone"))} className="h-7 border border-slate-300 px-2 font-bold uppercase tracking-wider text-slate-100">{selectedProne ? "Stand up" : "Set prone"}</button>
            </>}
          </>}
        </section>
      </FloatingPluginHud>}
      {tacticalScenarioStatus !== "setup" && <FloatingPluginHud title="Current Action" layout={tacticalMap.actionHudLayout} onLayoutChange={(layout) => dispatch(updateTacticalActionHud(layout))} className="w-72 font-mono text-[8px] uppercase tracking-wider text-(--hud-text)">
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
          </div> : activeCombatant && selectedPosition ? <>
            <div className="font-bold uppercase tracking-wider text-cyan-100">{activeCombatant.name}</div>
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
              <div className="font-bold text-amber-100">{selectedTerrain.kind === "wall" ? "Wall segment" : selectedTerrain.kind === "door" ? `${selectedTerrain.open ? "Open" : "Closed"} ${selectedTerrain.portalType === "iris-valve" ? "iris valve" : "door"}` : selectedTerrain.kind === "hatch" ? `${selectedTerrain.open ? "Open" : "Closed"} hatch` : selectedTerrain.label}</div>
              {selectedTerrain.kind !== "wall" && <><div className={`mt-1 ${terrainAdjacent ? "text-emerald-200" : "text-rose-200"}`}>{terrainAdjacent ? selectedTerrain.kind === "door" ? "Adjacent at phase start" : "Adjacent" : selectedTerrain.kind === "door" ? "Must begin the phase adjacent" : "Move adjacent to interact"}</div>
                {selectedDoorCommand ? <div className="text-amber-200">{selectedTerrain.kind === "hatch" ? "Hatch" : selectedTerrain.kind === "door" && selectedTerrain.portalType === "iris-valve" ? "Iris valve" : "Door"} will {selectedDoorCommand.open ? "open" : "close"} at the start of Turn {selectedDoorCommand.resolvesAtTurn}</div> : selectedPortalPressureBlocked ? <div className="text-rose-200">Cannot open across a pressure differential</div> : selectedTerrain.kind === "terminal" ? <div className="flex flex-col gap-1">
                  {availableConsoleOperations.map((operation) => {
                    const progress = tacticalMap.consoleOperationProgressById?.[operation.id];
                    const check = operation.checks.find((candidate) => !progress?.completedCheckIds.includes(candidate.id));
                    if (!check) return null;
                    const completed = progress?.completedCheckIds.length ?? 0;
                    return <button key={operation.id} type="button" disabled={!terrainAdjacent || selectedActionPoints < check.apCost} onClick={() => dispatch(attemptTacticalConsoleCheck({ operationId: operation.id, dice: rollDicePair() }))} className="min-h-8 w-full border border-amber-300 px-2 py-1 text-left text-[8px] font-bold uppercase tracking-wider text-amber-100 disabled:cursor-not-allowed disabled:opacity-40">
                      <span className="block">{operation.label} · {check.apCost} AP</span>
                      <span className="block text-[7px] font-normal text-amber-200">{check.skill} · {check.difficulty.replace("-", " ")} {({ simple: 2, easy: 4, routine: 6, average: 8, difficult: 10, "very-difficult": 12, formidable: 14 } as const)[check.difficulty]}+ · check {completed + 1}/{operation.checks.length}</span>
                    </button>;
                  })}
                  {availableConsoleOperations.length === 0 && <div className={terminalAlreadyActive ? "text-emerald-200" : "text-slate-400"}>{terminalAlreadyActive ? selectedTerrain.visualKind === "human" ? "Interaction completed" : "Console operation completed" : selectedTerrain.visualKind === "human" ? "No interaction currently unlocked" : "No console operation currently unlocked"}</div>}
                </div> : <button type="button" disabled={!terrainAdjacent || selectedActionPoints < terrainInteractionCost || selectedPortalPressureBlocked} onClick={() => dispatch(interactWithTacticalTerrain())} className="h-7 w-full border border-amber-300 px-2 text-[8px] font-bold uppercase tracking-wider text-amber-100 transition-colors disabled:cursor-not-allowed disabled:opacity-40">
                  {selectedTerrain.kind === "door" ? `${selectedTerrain.open ? "Close" : "Open"} ${selectedTerrain.portalType === "iris-valve" ? "iris valve" : "door"} next phase · 2 AP` : `${selectedTerrain.open ? "Close" : "Open"} hatch next phase · 6 AP`}
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
              {previewedLiquidHydrogenEntry && <div className="font-bold uppercase tracking-wider text-red-200">Lethal: movement stops at liquid hydrogen {previewedLiquidHydrogenEntry.x},{previewedLiquidHydrogenEntry.y}</div>}
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
          <button type="button" onClick={() => dispatch(draftPlaytest ? resetTacticalDraftPlaytest({ definition: draftPlaytest.definition, consoleVictory: draftPlaytest.consoleVictory }) : resetTacticalScenario())} className="h-7 w-full border border-red-300 px-2 text-[8px] font-bold uppercase tracking-wider text-red-100 transition-colors hover:bg-red-300/15">Reset Scenario</button>
        </section>
      </FloatingPluginHud>}
      {(status === "loading" || shipStatus === "loading") && <div className="absolute inset-x-0 bottom-8 text-center font-mono text-xs uppercase tracking-widest text-cyan-200">Loading crew…</div>}
      {(status === "error" || shipStatus === "error") && <div className="absolute inset-x-0 bottom-8 text-center font-mono text-xs uppercase tracking-widest text-rose-300">Crew could not be loaded</div>}
    </PluginHudLayer>
  </main>;
};

export default TacticalMapPageClient;
