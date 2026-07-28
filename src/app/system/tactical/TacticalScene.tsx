"use client";

import { Html, Line, OrbitControls, OrthographicCamera } from "@react-three/drei";
import { Suspense, useMemo } from "react";
import { Path, Shape } from "three";
import { AnimatedCombatantFallback, AnimatedCombatantModel } from "@/plugins/characterCombat/AnimatedCombatantModel";
import { AnimatedCombatantPlacement } from "@/plugins/characterCombat/AnimatedCombatantPlacement";
import { activateTacticalCharacter, deployTacticalCharacter, previewTacticalCoveringFire, previewTacticalGrenadeTarget, previewTacticalMelee, previewTacticalMeleeDive, previewTacticalMove, selectTacticalAttackTarget, selectTacticalTerrainObject } from "@/plugins/characterCombat/slice";
import { collateralBlastCells, coveringFireDangerSpaceCells, filledLiquidHydrogenCellKeys, grenadeBlastCells, meleeEnemies, pointKey, tacticalBaseLightingLevelAt, tacticalLightPatchVisibleAt, tacticalLightSources, tacticalRangedEnemies, terrainHeightAt, validCoveringFireTargets } from "@/plugins/characterCombat/geometry";
import type { Combatant, CombatScenario, PlannedMove, TacticalMapState } from "@/plugins/characterCombat/types";
import { buildDefaultTacticalScenario } from "@/plugins/characterCombat/defaultTacticalScenario";
import { activeTacticalTerrainObjects, interactiveHumanModelFacingForTacticalRotation, tacticalWallCornerPoints, tacticalWallVisualRuns, type TacticalTerrainObject, type TacticalWallVisualRun } from "@/plugins/characterCombat/tacticalTerrain";
import { setSelectedProfileCharacter } from "@/plugins/characters";
import { useAppDispatch, useAppSelector } from "@/store/hooks";

export const DEFAULT_TACTICAL_MAP: TacticalMapState = { scenario: buildDefaultTacticalScenario("exterior-dark"), scenarioStatus: "setup", lightingPreset: "exterior-dark", gridSize: 1, movementAnimationByCharacterId: {}, characterHudLayout: { visible: true, pinned: false, position: { x: 16, y: 86 } }, enemyHudLayout: { visible: true, pinned: false, position: { x: 840, y: 86 } }, actionHudLayout: { visible: true, pinned: false, position: { x: 16, y: 190 } }, characterInformationHudLayout: { visible: true, pinned: false, position: { x: 320, y: 86 } }, eventsHudLayout: { visible: true, pinned: false, position: { x: 580, y: 86 } }, movementMode: "walk", plannedDestination: null, plannedEnemyEntryTargetId: null, enemySquareEnteredCombatantIds: [], plannedAttackTargetId: null, plannedAttackMode: null, plannedMeleeTargetId: null, aimedTargetId: null, grenadeTargeting: false, grenadeKind: null, plannedGrenadeTarget: null, smokeClearsAtTurnByCell: {}, lastGrenadeImpact: null, lastWeaponImpact: null, satchelCharges: [], satchelPlacementPending: false, lastSatchelImpact: null, coveringFireTargeting: false, plannedCoveringFireTarget: null, coveringFireLanes: [], coveringFireCommittedCombatantIds: [], pendingCoveringFireSnapIds: [], plannedTreatmentTargetId: null, draggingCombatantByCarrierId: {}, ahlMeleeStunUntilTurnById: {}, selectedTerrainObjectId: null, doorOpenById: {}, actionPhaseStartPositionByCombatantId: {}, pendingDoorCommandsById: {}, terminalActiveById: {}, terrainDamageById: {}, destroyedTerrainObjectIds: [], ammunitionByCharacterId: {}, ammunitionByCombatantAndKind: {}, evadingCombatantIds: [], bracedCombatantIds: [], suppressedCombatantIds: [], movedCombatantIds: [], processedEnemyPhaseCombatantIds: [], movingAdjacentMoraleResultByLeaderId: {}, pendingAdjacencyReaction: null, events: [], turn: 1, actionPointsByCharacterId: {}, actedCharacterIds: [], activeCharacterId: null };
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

export const TacticalScene = ({ crewVisibility, exploredCells, lastKnownEnemyPositions, reachableMoves, visibleEnemyIds }: { crewVisibility: ReadonlyMap<string, unknown>; exploredCells: ReadonlySet<string>; lastKnownEnemyPositions: Record<string, { x: number; y: number }>; reachableMoves: ReadonlyMap<string, PlannedMove>; visibleEnemyIds: ReadonlySet<string> }) => {
  const dispatch = useAppDispatch();
  const tacticalMap = useAppSelector((state) => state.plugins.characterCombat.tacticalMap) ?? DEFAULT_TACTICAL_MAP;
  const mapWidth = tacticalMap.scenario.width;
  const mapHeight = tacticalMap.scenario.height;
  const combatants = tacticalMap.scenario.combatants;
  const focusX = combatants.length > 0 ? combatants.reduce((total, unit) => total + unit.position.x + 0.5 - mapWidth / 2, 0) / combatants.length : 0;
  const focusZ = combatants.length > 0 ? combatants.reduce((total, unit) => total + unit.position.y + 0.5 - mapHeight / 2, 0) / combatants.length : 0;
  const selectedId = tacticalMap.scenarioStatus === "setup" ? tacticalMap.deploymentCharacterId : tacticalMap.activeCharacterId;
  const selected = combatants.find((unit) => unit.id === selectedId && unit.side === "player") ?? null;
  const selectedPosition = selected?.position ?? null;
  const selectedProne = selected?.posture === "prone";
  const selectedSuppressed = Boolean(selected && tacticalMap.suppressedCombatantIds.includes(selected.id));
  const selectedDragging = Boolean(selected && tacticalMap.draggingCombatantByCarrierId[selected.id]);
  const validTargetIds = new Set(selected && !selectedDragging ? tacticalRangedEnemies(tacticalMap.scenario, selected.id).map((unit) => unit.id) : []);
  const validMeleeTargetIds = new Set(selected && !selectedDragging ? meleeEnemies(tacticalMap.scenario, selected.id).map((unit) => unit.id) : []);
  const tacticalTerrain = useMemo(() => activeTacticalTerrainObjects(tacticalMap.scenario, tacticalMap.doorOpenById, tacticalMap.destroyedTerrainObjectIds), [tacticalMap.destroyedTerrainObjectIds, tacticalMap.doorOpenById, tacticalMap.scenario]);
  const wallRuns = useMemo(() => tacticalWallVisualRuns(tacticalTerrain), [tacticalTerrain]);
  const wallCorners = useMemo(() => tacticalWallCornerPoints(tacticalTerrain), [tacticalTerrain]);
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
