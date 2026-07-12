"use client";

import { Canvas } from "@react-three/fiber";
import { Html, OrthographicCamera } from "@react-three/drei";
import { useRef, type PointerEvent as ReactPointerEvent } from "react";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { adjacentObjectives, closedDoorsAdjacentTo, coverProtection, depressurizedCells, doorBlastCells, fireLaneCells, grenadeBlastCells, pathContains, pointKey, proneRotationForFacing, rangedEnemies, reachableMovement, validCoveringFireTargets, validGrenadeTargets, zeroGravityPushes } from "./geometry";
import { adjustCameraZoom, panCameraBy, previewAttack, previewCoveringFire, previewGrenadeTarget, previewMove, previewOpenDoor, previewSecureObjective, rotateCameraBy, selectPlayerCombatant, setHoveredDestination } from "./slice";
import type { DoorSegment, WallSegment } from "./types";
import { equipmentVisualFor } from "./equipmentPresentation";

const WeaponMesh = ({ category, facing }: { category: ReturnType<typeof equipmentVisualFor>["weaponCategory"]; facing: "north" | "east" | "south" | "west" }) => {
  const rotationY = facing === "east" ? -Math.PI / 2 : facing === "south" ? Math.PI : facing === "west" ? Math.PI / 2 : 0;
  const dimensions: [number, number, number] = category === "pistol" ? [0.12, 0.12, 0.32] : category === "smg" ? [0.2, 0.17, 0.45] : category === "shotgun" ? [0.15, 0.15, 0.72] : category === "gauss-rifle" ? [0.18, 0.16, 0.88] : [0.12, 0.13, 0.82];
  const z = -dimensions[2] / 2 + 0.02;
  const color = category === "laser-rifle" ? "#22d3ee" : category === "gauss-rifle" ? "#94a3b8" : category === "shotgun" ? "#a16207" : "#334155";
  return <group rotation={[0, rotationY, 0]}>
    <mesh position={[0.25, 0.56, z]} castShadow><boxGeometry args={dimensions} /><meshStandardMaterial color={color} emissive={category === "laser-rifle" ? "#0891b2" : "#000000"} emissiveIntensity={category === "laser-rifle" ? 0.8 : 0} /></mesh>
    {category === "gauss-rifle" && <mesh position={[0.25, 0.42, -0.28]}><boxGeometry args={[0.16, 0.22, 0.18]} /><meshStandardMaterial color="#475569" /></mesh>}
    {category === "smg" && <mesh position={[0.25, 0.43, -0.1]}><boxGeometry args={[0.13, 0.2, 0.12]} /><meshStandardMaterial color="#1e293b" /></mesh>}
  </group>;
};

const SegmentMesh = ({ segment, width, height, color, wallHeight = 0.9, cutaway = false }: { segment: WallSegment; width: number; height: number; color: string; wallHeight?: number; cutaway?: boolean }) => {
  const horizontal = segment.from.y === segment.to.y;
  const length = horizontal ? Math.abs(segment.to.x - segment.from.x) : Math.abs(segment.to.y - segment.from.y);
  const x = (segment.from.x + segment.to.x) / 2 - width / 2;
  const z = (segment.from.y + segment.to.y) / 2 - height / 2;
  const visibleHeight = cutaway ? 0.34 : wallHeight;
  return <mesh position={[x, visibleHeight / 2, z]} castShadow={!cutaway} receiveShadow><boxGeometry args={horizontal ? [length, visibleHeight, 0.12] : [0.12, visibleHeight, length]} /><meshStandardMaterial color={color} roughness={0.72} transparent={cutaway} opacity={cutaway ? 0.42 : 1} /></mesh>;
};

const DoorMesh = ({ door, width, height, actionable, charged, onOpen }: { door: DoorSegment; width: number; height: number; actionable: boolean; charged: boolean; onOpen: () => void }) => {
  const horizontal = door.from.y === door.to.y;
  const length = horizontal ? Math.abs(door.to.x - door.from.x) : Math.abs(door.to.y - door.from.y);
  const wallHeight = door.open ? 0.08 : 0.72;
  const x = (door.from.x + door.to.x) / 2 - width / 2;
  const z = (door.from.y + door.to.y) / 2 - height / 2;
  return <mesh position={[x, wallHeight / 2, z]} castShadow receiveShadow onClick={(event) => { if (actionable) { event.stopPropagation(); onOpen(); } }}>
    <boxGeometry args={horizontal ? [length, wallHeight, actionable ? 0.2 : 0.12] : [actionable ? 0.2 : 0.12, wallHeight, length]} />
    <meshStandardMaterial color={door.open ? "#34d399" : charged ? "#fb7185" : actionable ? "#fbbf24" : "#f59e0b"} emissive={charged ? "#881337" : actionable ? "#78350f" : "#000000"} roughness={0.72} />
    {actionable && <Html center position={[0, 0.68, 0]} style={{ pointerEvents: "none" }}><div className="whitespace-nowrap border border-amber-300 bg-black/85 px-1.5 py-0.5 font-mono text-[9px] font-bold text-amber-100">OPEN DOOR</div></Html>}
    {charged && <Html center position={[0, 0.92, 0]} style={{ pointerEvents: "none" }}><div className="whitespace-nowrap border border-rose-300 bg-black/85 px-1.5 py-0.5 font-mono text-[9px] font-bold text-rose-100">CHARGE PLACED</div></Html>}
  </mesh>;
};

const CombatScene3D = () => {
  const dispatch = useAppDispatch();
  const { scenario, camera, status, turn, selectedCombatantId, plannedMove, plannedAttackTargetId, plannedGrenadeTarget, plannedBreachDoorId, placedBreachingChargeByDoorId, coveringFireTargeting, plannedCoveringFireTarget, coveringFireLanes, plannedObjectiveId, hoveredDestination, actionPointsById, actedCombatantIds, grenadeTargeting, trottingCombatantIds, suppressedCombatantIds, draggingCombatantByCarrierId, maintainedTargetByCombatantId } = useAppSelector((state) => state.plugins.characterCombat);
  if (!scenario) return null;
  const span = Math.max(scenario.width, scenario.height);
  const focusX = (camera.focus ? camera.focus.x + 0.5 - scenario.width / 2 : 0) + camera.pan.x;
  const focusZ = (camera.focus ? camera.focus.y + 0.5 - scenario.height / 2 : 0) + camera.pan.y;
  const cameraX = Math.cos(camera.azimuth);
  const cameraZ = Math.sin(camera.azimuth);
  const cameraFacingOuterWall = (wall: WallSegment) => (cameraX > 0 && wall.from.x === scenario.width && wall.to.x === scenario.width)
    || (cameraX < 0 && wall.from.x === 0 && wall.to.x === 0)
    || (cameraZ > 0 && wall.from.y === scenario.height && wall.to.y === scenario.height)
    || (cameraZ < 0 && wall.from.y === 0 && wall.to.y === 0);
  const selectedActionPoints = selectedCombatantId ? actionPointsById[selectedCombatantId] ?? 0 : 0;
  const selectedHasActed = selectedCombatantId ? actedCombatantIds.includes(selectedCombatantId) || selectedActionPoints === 0 : false;
  const selectedUnit = scenario.combatants.find((unit) => unit.id === selectedCombatantId);
  const selectedIsTrotting = selectedCombatantId ? trottingCombatantIds.includes(selectedCombatantId) : false;
  const selectedIsProne = selectedUnit?.posture === "prone";
  const selectedIsSuppressed = selectedCombatantId ? suppressedCombatantIds.includes(selectedCombatantId) : false;
  const selectedIsDragging = selectedCombatantId ? Boolean(draggingCombatantByCarrierId[selectedCombatantId]) : false;
  const reachable = status === "active" && selectedCombatantId && !selectedHasActed && !grenadeTargeting ? scenario.gravityMode === "zero-g" ? selectedActionPoints >= 3 ? zeroGravityPushes(scenario, selectedCombatantId) : new Map() : reachableMovement(scenario, selectedCombatantId, Math.min(selectedIsProne ? 1 : selectedIsDragging || selectedIsSuppressed ? 2 : selectedIsTrotting ? 6 : 4, selectedActionPoints)) : new Map();
  const validTargetIds = new Set(status === "active" && selectedCombatantId && !selectedHasActed && !grenadeTargeting && !selectedIsTrotting ? rangedEnemies(scenario, selectedCombatantId).map((unit) => unit.id) : []);
  const maintainedTargetId = selectedCombatantId ? maintainedTargetByCombatantId[selectedCombatantId] : null;
  const coveringCombatantIds = new Set(coveringFireLanes.map((lane) => lane.attackerId));
  const coveredTargetIds = new Set<string>();
  const actionableDoorIds = new Set(status === "active" && selectedCombatantId && !selectedHasActed && selectedActionPoints >= 6 && !grenadeTargeting ? closedDoorsAdjacentTo(scenario, selectedCombatantId).map((door) => door.id) : []);
  const actionableObjectiveIds = new Set(status === "active" && selectedCombatantId && !selectedHasActed && !grenadeTargeting ? adjacentObjectives(scenario, selectedCombatantId).map((objective) => objective.id) : []);
  const grenadeTargetKeys = new Set(grenadeTargeting && selectedCombatantId ? validGrenadeTargets(scenario, selectedCombatantId).map(pointKey) : []);
  const grenadeBlastKeys = new Set(plannedGrenadeTarget ? grenadeBlastCells(scenario, plannedGrenadeTarget).map(pointKey) : []);
  const coveringTargetKeys = new Set(coveringFireTargeting && selectedCombatantId ? validCoveringFireTargets(scenario, selectedCombatantId).map(pointKey) : []);
  const laneKeys = new Set(coveringFireLanes.flatMap((lane) => lane.cells.map(pointKey)));
  const plannedLaneKeys = new Set(plannedCoveringFireTarget && selectedUnit ? fireLaneCells(scenario, selectedUnit.position, plannedCoveringFireTarget).map(pointKey) : []);
  const breachDoor = scenario.doors.find((door) => door.id === plannedBreachDoorId);
  const breachKeys = new Set(breachDoor ? doorBlastCells(breachDoor).map(pointKey) : []);
  const vacuumKeys = new Set(depressurizedCells(scenario).keys());
  const fireKeys = new Set((scenario.fireCells ?? []).map(pointKey));
  const smokeKeys = new Set((scenario.smokeCells ?? []).map(pointKey));
  const criticalFireKeys = new Set((scenario.criticalFireCells ?? []).map(pointKey));

  return <>
    <color attach="background" args={["#03070a"]} />
    <ambientLight intensity={0.85} />
    <directionalLight position={[8, 14, 9]} intensity={2.2} castShadow />
    <OrthographicCamera makeDefault position={[focusX + cameraX * span * 1.25 * Math.cos(camera.elevation), span * 1.25 * Math.sin(camera.elevation), focusZ + cameraZ * span * 1.25 * Math.cos(camera.elevation)]} zoom={camera.zoom} near={0.1} far={100} onUpdate={(activeCamera) => activeCamera.lookAt(focusX, 0, focusZ)} />

    {Array.from({ length: scenario.width }, (_, x) => Array.from({ length: scenario.height }, (_, y) => {
      const point = { x, y };
      const key = pointKey(point);
      const canMove = reachable.has(key);
      const canTargetGrenade = grenadeTargetKeys.has(key);
      const inGrenadeBlast = grenadeBlastKeys.has(key);
      const coveringTarget = coveringTargetKeys.has(key);
      const inFireLane = laneKeys.has(key) || plannedLaneKeys.has(key);
      const inBreachBlast = breachKeys.has(key);
      const inVacuum = vacuumKeys.has(key);
      const inEnvironmentalFire = fireKeys.has(key);
      const inSmoke = smokeKeys.has(key);
      const inPath = plannedMove ? pathContains(plannedMove.path, point) : false;
      const hovered = hoveredDestination?.x === x && hoveredDestination?.y === y;
      const color = inBreachBlast ? "#c2410c" : inEnvironmentalFire ? "#7f1d1d" : inSmoke ? "#475569" : inFireLane ? "#a16207" : coveringTarget ? "#713f12" : inGrenadeBlast ? "#ea580c" : canTargetGrenade ? "#9d174d" : inPath ? "#d97706" : hovered && canMove ? "#0891b2" : canMove ? "#14532d" : inVacuum ? "#172554" : (x + y) % 2 === 0 ? "#172631" : "#13222c";
      return <mesh key={`floor:${key}`} position={[x + 0.5 - scenario.width / 2, -0.05, y + 0.5 - scenario.height / 2]} receiveShadow
        onPointerOver={(event) => { if (canMove) { event.stopPropagation(); dispatch(setHoveredDestination(point)); } }}
        onPointerOut={() => { if (hovered) dispatch(setHoveredDestination(null)); }}
        onClick={(event) => { event.stopPropagation(); if (coveringTarget) dispatch(previewCoveringFire(point)); else if (canTargetGrenade) dispatch(previewGrenadeTarget(point)); else if (canMove && !coveringFireTargeting) dispatch(previewMove(point)); else if (!grenadeTargeting && !coveringFireTargeting) dispatch(selectPlayerCombatant(null)); }}>
        <boxGeometry args={[0.94, inGrenadeBlast || inPath || hovered ? 0.14 : 0.1, 0.94]} />
        <meshStandardMaterial color={color} emissive={inGrenadeBlast ? "#9a3412" : canTargetGrenade ? "#500724" : inPath ? "#78350f" : canMove ? "#052e16" : "#000000"} roughness={0.9} />
      </mesh>;
    }))}

    {(scenario.fireCells ?? []).map((point) => { const critical = criticalFireKeys.has(pointKey(point)); return <group key={`fire:${pointKey(point)}`} position={[point.x + 0.5 - scenario.width / 2, 0.2, point.y + 0.5 - scenario.height / 2]}>{critical && <><mesh position={[0, -0.08, 0]} rotation={[Math.PI / 2, 0, 0]}><torusGeometry args={[0.46, 0.07, 8, 32]} /><meshBasicMaterial color="#fde047" /></mesh><Html center position={[0, 1.15, 0]} style={{ pointerEvents: "none" }}><div className="whitespace-nowrap border-2 border-yellow-300 bg-red-950/95 px-1.5 py-0.5 font-mono text-[9px] font-bold text-yellow-100">CRITICAL FIRE</div></Html></>}<mesh><coneGeometry args={[critical ? 0.34 : 0.28, critical ? 0.9 : 0.75, 10]} /><meshStandardMaterial color={critical ? "#dc2626" : "#fb923c"} emissive="#dc2626" emissiveIntensity={1.5} /></mesh><pointLight color={critical ? "#fde047" : "#f97316"} intensity={critical ? 2.2 : 1.5} distance={2.5} /></group>; })}
    {(scenario.smokeCells ?? []).map((point) => <group key={`smoke:${pointKey(point)}`} position={[point.x + 0.5 - scenario.width / 2, 0.48, point.y + 0.5 - scenario.height / 2]}><mesh position={[-0.18, 0, 0]}><sphereGeometry args={[0.34, 12, 8]} /><meshStandardMaterial color="#94a3b8" transparent opacity={0.5} /></mesh><mesh position={[0.2, 0.12, 0.05]}><sphereGeometry args={[0.4, 12, 8]} /><meshStandardMaterial color="#64748b" transparent opacity={0.55} /></mesh></group>)}

    {(scenario.handholds ?? []).map((point) => <mesh key={`handhold:${pointKey(point)}`} position={[point.x + 0.5 - scenario.width / 2, 0.08, point.y + 0.5 - scenario.height / 2]} rotation={[Math.PI / 2, 0, 0]}><torusGeometry args={[0.25, 0.05, 8, 24]} /><meshBasicMaterial color="#60a5fa" /></mesh>)}

    {scenario.walls.map((wall) => <SegmentMesh key={wall.id} segment={wall} width={scenario.width} height={scenario.height} color="#b8c8d0" cutaway={cameraFacingOuterWall(wall)} />)}
    {scenario.doors.map((door) => <DoorMesh key={door.id} door={door} width={scenario.width} height={scenario.height} actionable={actionableDoorIds.has(door.id)} charged={Boolean(placedBreachingChargeByDoorId[door.id])} onOpen={() => dispatch(previewOpenDoor(door.id))} />)}

    {scenario.objects.map((object) => {
      const objective = object.kind !== "cover";
      const position: [number, number, number] = [object.position.x + 0.5 - scenario.width / 2, objective ? 0.38 : 0.32, object.position.y + 0.5 - scenario.height / 2];
      const actionable = actionableObjectiveIds.has(object.id);
      const planned = plannedObjectiveId === object.id;
      const objectiveColor = object.kind === "extraction" ? "#10b981" : object.kind === "prisoner" ? "#f59e0b" : object.kind === "control" ? "#a855f7" : "#22d3ee";
      return objective ? <group key={object.id} position={position} onClick={(event) => { if (actionable) { event.stopPropagation(); dispatch(previewSecureObjective(object.id)); } }}>
        {object.kind === "extraction" && <><mesh position={[0, -0.3, 0]} rotation={[Math.PI / 2, 0, 0]}><ringGeometry args={[0.46, 0.68, 32]} /><meshBasicMaterial color="#34d399" transparent opacity={0.72} /></mesh><Html center position={[0, 1.32, 0]} style={{ pointerEvents: "none" }}><div className="whitespace-nowrap border-2 border-emerald-300 bg-emerald-950/95 px-2 py-1 font-mono text-[11px] font-bold text-emerald-100">EXTRACTION ZONE · {object.position.x},{object.position.y}</div></Html></>}
        <pointLight position={[0, 0.72, 0]} color={objectiveColor} intensity={1.2} distance={2.2} />
        {object.kind !== "extraction" && <Html center position={[0, 1.02, 0]} style={{ pointerEvents: "none" }}><div className="whitespace-nowrap border bg-black/85 px-1.5 py-0.5 font-mono text-[9px] font-bold text-cyan-100" style={{ borderColor: objectiveColor }}>{object.label.toUpperCase()}{object.completed ? " · RELEASED" : ""}</div></Html>}
        {(actionable || planned) && <mesh position={[0, -0.3, 0]} rotation={[Math.PI / 2, 0, 0]}><torusGeometry args={[planned ? 0.52 : 0.45, planned ? 0.07 : 0.04, 8, 32]} /><meshBasicMaterial color={planned ? "#ecfeff" : objectiveColor} /></mesh>}
        <mesh castShadow><boxGeometry args={[0.62, 0.7, 0.5]} /><meshStandardMaterial color={objectiveColor} emissive={objectiveColor} emissiveIntensity={0.25} /></mesh>
        <mesh position={[0, 0.18, -0.27]} rotation={[-0.25, 0, 0]}><boxGeometry args={[0.42, 0.25, 0.04]} /><meshStandardMaterial color="#e2e8f0" emissive={objectiveColor} emissiveIntensity={0.8} /></mesh>
      </group> : <mesh key={object.id} position={position} castShadow receiveShadow><boxGeometry args={[0.76, 0.64, 0.76]} /><meshStandardMaterial color="#725338" roughness={0.85} /></mesh>;
    })}

    {scenario.combatants.filter((unit) => !unit.reinforcementTurn || unit.reinforcementTurn <= turn).map((unit) => {
      const selected = unit.id === selectedCombatantId;
      const inactive = unit.defeated;
      const color = unit.surrendered ? "#eab308" : inactive ? "#64748b" : unit.side === "player" ? "#10b981" : "#dc2626";
      const selectable = unit.side === "player" && !inactive && status === "active" && !grenadeTargeting;
      const validTarget = validTargetIds.has(unit.id);
      const plannedTarget = unit.id === plannedAttackTargetId;
      const maintainedTarget = unit.id === maintainedTargetId;
      const covered = selectedCombatantId ? coverProtection(scenario, selectedCombatantId, unit.id) > 0 : false;
      const covering = coveringCombatantIds.has(unit.id);
      const overwatched = coveredTargetIds.has(unit.id);
      const grenadeRisk = grenadeBlastKeys.has(pointKey(unit.position));
      const equipment = equipmentVisualFor(unit);
      const facing = unit.facing === "east" ? { position: [0.34, 0.12, 0] as [number, number, number], rotation: [0, 0, -Math.PI / 2] as [number, number, number] }
        : unit.facing === "west" ? { position: [-0.34, 0.12, 0] as [number, number, number], rotation: [0, 0, Math.PI / 2] as [number, number, number] }
          : unit.facing === "south" ? { position: [0, 0.12, 0.34] as [number, number, number], rotation: [Math.PI / 2, 0, 0] as [number, number, number] }
            : { position: [0, 0.12, -0.34] as [number, number, number], rotation: [-Math.PI / 2, 0, 0] as [number, number, number] };
      const showLabel = selected || validTarget || plannedTarget;
      return <group key={unit.id} position={[unit.position.x + 0.5 - scenario.width / 2, unit.posture === "prone" ? 0.28 : 0.12, unit.position.y + 0.5 - scenario.height / 2]} rotation={inactive && !unit.surrendered ? [0, 0, Math.PI / 2] : unit.posture === "prone" ? proneRotationForFacing(unit.facing) : [0, 0, 0]}
        onClick={(event) => { if (selectable || validTarget) event.stopPropagation(); if (selectable) dispatch(selectPlayerCombatant(unit.id)); else if (validTarget) dispatch(previewAttack(unit.id)); }}>
        {showLabel && <Html center position={[0, 1.18, 0]} style={{ pointerEvents: "none" }}><div className={`whitespace-nowrap border bg-black/85 px-1.5 py-0.5 font-mono text-[9px] font-bold ${unit.side === "player" ? "border-emerald-300 text-emerald-100" : "border-red-300 text-red-100"}`}>{unit.name.toUpperCase()}{unit.posture === "prone" ? " · PRONE" : ""}{unit.woundState !== "healthy" ? ` · ${unit.woundState.toUpperCase()}` : ""}</div></Html>}
        {selected && <mesh position={[0, 0.02, 0]} rotation={[Math.PI / 2, 0, 0]}><torusGeometry args={[0.43, 0.05, 8, 32]} /><meshBasicMaterial color="#f8fafc" /></mesh>}
        {validTarget && <mesh position={[0, 0.04, 0]} rotation={[Math.PI / 2, 0, 0]}><torusGeometry args={[plannedTarget ? 0.52 : 0.46, plannedTarget ? 0.075 : 0.045, 8, 32]} /><meshBasicMaterial color={plannedTarget ? "#fef2f2" : "#ef4444"} /></mesh>}
        {maintainedTarget && <mesh position={[0, 0.08, 0]} rotation={[Math.PI / 2, 0, 0]}><torusGeometry args={[0.56, 0.025, 8, 32]} /><meshBasicMaterial color="#22d3ee" /></mesh>}
        {grenadeRisk && <mesh position={[0, 0.12, 0]} rotation={[Math.PI / 2, 0, 0]}><torusGeometry args={[0.61, 0.065, 8, 32]} /><meshBasicMaterial color="#fb923c" /></mesh>}
        {covering && <mesh position={[-0.34, 0.18, 0]}><boxGeometry args={[0.12, 0.12, 0.12]} /><meshBasicMaterial color="#facc15" /></mesh>}
        {overwatched && <mesh position={[0.34, 0.18, 0]}><boxGeometry args={[0.12, 0.12, 0.12]} /><meshBasicMaterial color="#e879f9" /></mesh>}
        {validTarget && covered && <mesh position={[0, 0.16, 0.36]}><boxGeometry args={[0.32, 0.08, 0.08]} /><meshBasicMaterial color="#f59e0b" /></mesh>}
        <mesh position={[0, 0.38, 0]} castShadow>{equipment.armorClass === "light" && unit.side === "player" ? <cylinderGeometry args={[0.18, 0.25, 0.58, 12]} /> : <boxGeometry args={equipment.armorClass === "battle-dress" ? [0.56, 0.66, 0.46] : equipment.armorClass === "combat" ? [0.48, 0.62, 0.4] : [0.42, 0.58, 0.32]} />}<meshStandardMaterial color={color} roughness={0.65} /></mesh>
        {(equipment.armorClass === "combat" || equipment.armorClass === "battle-dress") && <><mesh position={[-0.34, 0.58, 0]} castShadow><boxGeometry args={[equipment.armorClass === "battle-dress" ? 0.22 : 0.16, 0.18, 0.38]} /><meshStandardMaterial color={color} /></mesh><mesh position={[0.34, 0.58, 0]} castShadow><boxGeometry args={[equipment.armorClass === "battle-dress" ? 0.22 : 0.16, 0.18, 0.38]} /><meshStandardMaterial color={color} /></mesh></>}
        {equipment.armorClass === "flak" && <mesh position={[0, 0.42, 0]}><boxGeometry args={[0.43, 0.38, 0.35]} /><meshStandardMaterial color="#475569" transparent opacity={0.82} /></mesh>}
        {equipment.armorClass === "battle-dress" && <mesh position={[0, 0.45, 0.3]} castShadow><boxGeometry args={[0.4, 0.5, 0.22]} /><meshStandardMaterial color="#334155" /></mesh>}
        <mesh position={[0, 0.78, 0]} castShadow><sphereGeometry args={[0.2, 16, 12]} /><meshStandardMaterial color={color} roughness={0.65} /></mesh>
        {!inactive && <WeaponMesh category={equipment.weaponCategory} facing={unit.facing} />}
        {!inactive && <mesh position={facing.position} rotation={facing.rotation}><coneGeometry args={[0.11, 0.28, 3]} /><meshBasicMaterial color="#f8fafc" /></mesh>}
        {unit.surrendered ? <><mesh position={[-0.27, 0.72, 0]} rotation={[0, 0, 0.62]}><boxGeometry args={[0.09, 0.48, 0.09]} /><meshStandardMaterial color={color} /></mesh><mesh position={[0.27, 0.72, 0]} rotation={[0, 0, -0.62]}><boxGeometry args={[0.09, 0.48, 0.09]} /><meshStandardMaterial color={color} /></mesh></> : <><mesh position={[-0.27, 0.46, 0]} rotation={[0, 0, -0.22]}><boxGeometry args={[0.09, 0.42, 0.09]} /><meshStandardMaterial color={color} /></mesh><mesh position={[0.27, 0.46, 0]} rotation={[0, 0, 0.22]}><boxGeometry args={[0.09, 0.42, 0.09]} /><meshStandardMaterial color={color} /></mesh></>}
        {unit.woundState === "light" && <mesh position={[0.24, 0.55, 0]}><sphereGeometry args={[0.07, 8, 6]} /><meshBasicMaterial color="#fbbf24" /></mesh>}
      </group>;
    })}
  </>;
};

export const CombatBoard3D = () => {
  const dispatch = useAppDispatch();
  const { grenadeTargeting, camera } = useAppSelector((state) => state.plugins.characterCombat);
  const drag = useRef({ pointerId: -1, x: 0, y: 0, startX: 0, startY: 0, moved: false, captured: false, mode: "rotate" as "pan" | "rotate" });
  const startPan = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.button !== 0 && event.button !== 2) return;
    const rightButton = event.button === 2;
    drag.current = { pointerId: event.pointerId, x: event.clientX, y: event.clientY, startX: event.clientX, startY: event.clientY, moved: false, captured: rightButton, mode: rightButton ? "pan" : "rotate" };
    if (rightButton) event.currentTarget.setPointerCapture(event.pointerId);
  };
  const continuePan = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (drag.current.pointerId !== event.pointerId || event.buttons === 0) return;
    const dx = event.clientX - drag.current.x;
    const dy = event.clientY - drag.current.y;
    if (!drag.current.moved && Math.abs(event.clientX - drag.current.startX) + Math.abs(event.clientY - drag.current.startY) < 4) return;
    if (!drag.current.captured) {
      event.currentTarget.setPointerCapture(event.pointerId);
      drag.current.captured = true;
    }
    drag.current.x = event.clientX;
    drag.current.y = event.clientY;
    drag.current.moved = true;
    if (drag.current.mode === "rotate") {
      dispatch(rotateCameraBy({ azimuth: -dx * 0.012, elevation: dy * 0.008 }));
    } else {
      const cameraX = Math.cos(camera.azimuth);
      const cameraY = Math.sin(camera.azimuth);
      const scale = 0.7 / camera.zoom;
      dispatch(panCameraBy({ x: (-dx * cameraY + dy * cameraX) * scale, y: (dx * cameraX + dy * cameraY) * scale }));
    }
  };
  const finishPan = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (drag.current.pointerId !== event.pointerId) return;
    if (drag.current.captured && event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
    drag.current.pointerId = -1;
    if (drag.current.mode === "pan") drag.current.moved = false;
  };
  return <div className="h-full w-full cursor-grab active:cursor-grabbing" onContextMenu={(event) => event.preventDefault()} onWheel={(event) => { event.preventDefault(); dispatch(adjustCameraZoom(event.deltaY < 0 ? 1 : -1)); }} onPointerDown={startPan} onPointerMove={continuePan} onPointerUp={finishPan} onPointerCancel={finishPan} onClickCapture={(event) => { if (drag.current.moved) { event.preventDefault(); event.stopPropagation(); drag.current.moved = false; } }}>
    <Canvas shadows frameloop="demand" dpr={[1, 1.5]} onPointerMissed={() => { if (!grenadeTargeting && !drag.current.moved) dispatch(selectPlayerCombatant(null)); }}><CombatScene3D /></Canvas>
  </div>;
};
