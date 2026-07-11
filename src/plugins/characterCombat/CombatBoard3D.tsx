"use client";

import { Canvas } from "@react-three/fiber";
import { Html, OrthographicCamera } from "@react-three/drei";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { adjacentObjectives, closedDoorsAdjacentTo, coverProtection, grenadeBlastCells, pathContains, pointKey, rangedEnemies, reachableMovement, validGrenadeTargets } from "./geometry";
import { openDoor, previewAttack, previewGrenadeTarget, previewMove, previewSecureObjective, selectPlayerCombatant, setHoveredDestination } from "./slice";
import type { DoorSegment, WallSegment } from "./types";

const SegmentMesh = ({ segment, width, height, color, wallHeight = 0.9, cutaway = false }: { segment: WallSegment; width: number; height: number; color: string; wallHeight?: number; cutaway?: boolean }) => {
  const horizontal = segment.from.y === segment.to.y;
  const length = horizontal ? Math.abs(segment.to.x - segment.from.x) : Math.abs(segment.to.y - segment.from.y);
  const x = (segment.from.x + segment.to.x) / 2 - width / 2;
  const z = (segment.from.y + segment.to.y) / 2 - height / 2;
  const visibleHeight = cutaway ? 0.34 : wallHeight;
  return <mesh position={[x, visibleHeight / 2, z]} castShadow={!cutaway} receiveShadow><boxGeometry args={horizontal ? [length, visibleHeight, 0.12] : [0.12, visibleHeight, length]} /><meshStandardMaterial color={color} roughness={0.72} transparent={cutaway} opacity={cutaway ? 0.42 : 1} /></mesh>;
};

const DoorMesh = ({ door, width, height, actionable, onOpen }: { door: DoorSegment; width: number; height: number; actionable: boolean; onOpen: () => void }) => {
  const horizontal = door.from.y === door.to.y;
  const length = horizontal ? Math.abs(door.to.x - door.from.x) : Math.abs(door.to.y - door.from.y);
  const wallHeight = door.open ? 0.08 : 0.72;
  const x = (door.from.x + door.to.x) / 2 - width / 2;
  const z = (door.from.y + door.to.y) / 2 - height / 2;
  return <mesh position={[x, wallHeight / 2, z]} castShadow receiveShadow onClick={(event) => { if (actionable) { event.stopPropagation(); onOpen(); } }}>
    <boxGeometry args={horizontal ? [length, wallHeight, actionable ? 0.2 : 0.12] : [actionable ? 0.2 : 0.12, wallHeight, length]} />
    <meshStandardMaterial color={door.open ? "#34d399" : actionable ? "#fbbf24" : "#f59e0b"} emissive={actionable ? "#78350f" : "#000000"} roughness={0.72} />
    {actionable && <Html center position={[0, 0.68, 0]} style={{ pointerEvents: "none" }}><div className="whitespace-nowrap border border-amber-300 bg-black/85 px-1.5 py-0.5 font-mono text-[9px] font-bold text-amber-100">OPEN DOOR</div></Html>}
  </mesh>;
};

const CombatScene3D = () => {
  const dispatch = useAppDispatch();
  const { scenario, camera, status, selectedCombatantId, plannedMove, plannedAttackTargetId, plannedGrenadeTarget, plannedObjectiveId, hoveredDestination, actionPointsById, actedCombatantIds, grenadeTargeting, maintainedTargetByCombatantId, coveringFireByTargetId } = useAppSelector((state) => state.plugins.characterCombat);
  if (!scenario) return null;
  const span = Math.max(scenario.width, scenario.height);
  const focusX = camera.focus ? camera.focus.x + 0.5 - scenario.width / 2 : 0;
  const focusZ = camera.focus ? camera.focus.y + 0.5 - scenario.height / 2 : 0;
  const cameraDirections = [[1, 1], [1, -1], [-1, -1], [-1, 1]] as const;
  const [cameraX, cameraZ] = cameraDirections[camera.quarterTurn];
  const cameraFacingOuterWall = (wall: WallSegment) => (cameraX > 0 && wall.from.x === scenario.width && wall.to.x === scenario.width)
    || (cameraX < 0 && wall.from.x === 0 && wall.to.x === 0)
    || (cameraZ > 0 && wall.from.y === scenario.height && wall.to.y === scenario.height)
    || (cameraZ < 0 && wall.from.y === 0 && wall.to.y === 0);
  const selectedActionPoints = selectedCombatantId ? actionPointsById[selectedCombatantId] ?? 0 : 0;
  const selectedHasActed = selectedCombatantId ? actedCombatantIds.includes(selectedCombatantId) || selectedActionPoints === 0 : false;
  const reachable = status === "active" && selectedCombatantId && !selectedHasActed && !grenadeTargeting ? reachableMovement(scenario, selectedCombatantId, Math.min(4, selectedActionPoints)) : new Map();
  const validTargetIds = new Set(status === "active" && selectedCombatantId && !selectedHasActed && !grenadeTargeting ? rangedEnemies(scenario, selectedCombatantId).map((unit) => unit.id) : []);
  const maintainedTargetId = selectedCombatantId ? maintainedTargetByCombatantId[selectedCombatantId] : null;
  const coveringCombatantIds = new Set(Object.values(coveringFireByTargetId));
  const coveredTargetIds = new Set(Object.keys(coveringFireByTargetId));
  const actionableDoorIds = new Set(status === "active" && selectedCombatantId && !selectedHasActed && selectedActionPoints >= 6 && !grenadeTargeting ? closedDoorsAdjacentTo(scenario, selectedCombatantId).map((door) => door.id) : []);
  const actionableObjectiveIds = new Set(status === "active" && selectedCombatantId && !selectedHasActed && !grenadeTargeting ? adjacentObjectives(scenario, selectedCombatantId).map((objective) => objective.id) : []);
  const grenadeTargetKeys = new Set(grenadeTargeting && selectedCombatantId ? validGrenadeTargets(scenario, selectedCombatantId).map(pointKey) : []);
  const grenadeBlastKeys = new Set(plannedGrenadeTarget ? grenadeBlastCells(scenario, plannedGrenadeTarget).map(pointKey) : []);

  return <>
    <color attach="background" args={["#03070a"]} />
    <ambientLight intensity={0.85} />
    <directionalLight position={[8, 14, 9]} intensity={2.2} castShadow />
    <OrthographicCamera makeDefault position={[focusX + cameraX * span * 0.82, span * 0.9, focusZ + cameraZ * span * 0.82]} zoom={camera.zoom} near={0.1} far={100} onUpdate={(activeCamera) => activeCamera.lookAt(focusX, 0, focusZ)} />

    {Array.from({ length: scenario.width }, (_, x) => Array.from({ length: scenario.height }, (_, y) => {
      const point = { x, y };
      const key = pointKey(point);
      const canMove = reachable.has(key);
      const canTargetGrenade = grenadeTargetKeys.has(key);
      const inGrenadeBlast = grenadeBlastKeys.has(key);
      const inPath = plannedMove ? pathContains(plannedMove.path, point) : false;
      const hovered = hoveredDestination?.x === x && hoveredDestination?.y === y;
      const color = inGrenadeBlast ? "#ea580c" : canTargetGrenade ? "#9d174d" : inPath ? "#d97706" : hovered && canMove ? "#0891b2" : canMove ? "#14532d" : (x + y) % 2 === 0 ? "#172631" : "#13222c";
      return <mesh key={`floor:${key}`} position={[x + 0.5 - scenario.width / 2, -0.05, y + 0.5 - scenario.height / 2]} receiveShadow
        onPointerOver={(event) => { if (canMove) { event.stopPropagation(); dispatch(setHoveredDestination(point)); } }}
        onPointerOut={() => { if (hovered) dispatch(setHoveredDestination(null)); }}
        onClick={(event) => { event.stopPropagation(); if (canTargetGrenade) dispatch(previewGrenadeTarget(point)); else if (canMove) dispatch(previewMove(point)); else if (!grenadeTargeting) dispatch(selectPlayerCombatant(null)); }}>
        <boxGeometry args={[0.94, inGrenadeBlast || inPath || hovered ? 0.14 : 0.1, 0.94]} />
        <meshStandardMaterial color={color} emissive={inGrenadeBlast ? "#9a3412" : canTargetGrenade ? "#500724" : inPath ? "#78350f" : canMove ? "#052e16" : "#000000"} roughness={0.9} />
      </mesh>;
    }))}

    {scenario.walls.map((wall) => <SegmentMesh key={wall.id} segment={wall} width={scenario.width} height={scenario.height} color="#b8c8d0" cutaway={cameraFacingOuterWall(wall)} />)}
    {scenario.doors.map((door) => <DoorMesh key={door.id} door={door} width={scenario.width} height={scenario.height} actionable={actionableDoorIds.has(door.id)} onOpen={() => dispatch(openDoor(door.id))} />)}

    {scenario.objects.map((object) => {
      const position: [number, number, number] = [object.position.x + 0.5 - scenario.width / 2, object.kind === "console" ? 0.38 : 0.32, object.position.y + 0.5 - scenario.height / 2];
      const actionable = actionableObjectiveIds.has(object.id);
      const planned = plannedObjectiveId === object.id;
      return object.kind === "console" ? <group key={object.id} position={position} onClick={(event) => { if (actionable) { event.stopPropagation(); dispatch(previewSecureObjective(object.id)); } }}>
        <pointLight position={[0, 0.72, 0]} color="#22d3ee" intensity={1.2} distance={2.2} />
        <Html center position={[0, 1.02, 0]} style={{ pointerEvents: "none" }}><div className="whitespace-nowrap border border-cyan-300/70 bg-black/85 px-1.5 py-0.5 font-mono text-[9px] font-bold text-cyan-100">{object.label.toUpperCase()}</div></Html>
        {(actionable || planned) && <mesh position={[0, -0.3, 0]} rotation={[Math.PI / 2, 0, 0]}><torusGeometry args={[planned ? 0.52 : 0.45, planned ? 0.07 : 0.04, 8, 32]} /><meshBasicMaterial color={planned ? "#ecfeff" : "#22d3ee"} /></mesh>}
        <mesh castShadow><boxGeometry args={[0.62, 0.7, 0.5]} /><meshStandardMaterial color="#0e7490" emissive="#083344" /></mesh>
        <mesh position={[0, 0.18, -0.27]} rotation={[-0.25, 0, 0]}><boxGeometry args={[0.42, 0.25, 0.04]} /><meshStandardMaterial color="#67e8f9" emissive="#22d3ee" emissiveIntensity={0.8} /></mesh>
      </group> : <mesh key={object.id} position={position} castShadow receiveShadow><boxGeometry args={[0.76, 0.64, 0.76]} /><meshStandardMaterial color="#725338" roughness={0.85} /></mesh>;
    })}

    {scenario.combatants.map((unit) => {
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
      const facing = unit.facing === "east" ? { position: [0.34, 0.12, 0] as [number, number, number], rotation: [0, 0, -Math.PI / 2] as [number, number, number] }
        : unit.facing === "west" ? { position: [-0.34, 0.12, 0] as [number, number, number], rotation: [0, 0, Math.PI / 2] as [number, number, number] }
          : unit.facing === "south" ? { position: [0, 0.12, 0.34] as [number, number, number], rotation: [Math.PI / 2, 0, 0] as [number, number, number] }
            : { position: [0, 0.12, -0.34] as [number, number, number], rotation: [-Math.PI / 2, 0, 0] as [number, number, number] };
      const showLabel = selected || validTarget || plannedTarget;
      return <group key={unit.id} position={[unit.position.x + 0.5 - scenario.width / 2, 0.12, unit.position.y + 0.5 - scenario.height / 2]} rotation={inactive && !unit.surrendered ? [0, 0, Math.PI / 2] : [0, 0, 0]}
        onClick={(event) => { if (selectable || validTarget) event.stopPropagation(); if (selectable) dispatch(selectPlayerCombatant(unit.id)); else if (validTarget) dispatch(previewAttack(unit.id)); }}>
        {showLabel && <Html center position={[0, 1.18, 0]} style={{ pointerEvents: "none" }}><div className={`whitespace-nowrap border bg-black/85 px-1.5 py-0.5 font-mono text-[9px] font-bold ${unit.side === "player" ? "border-emerald-300 text-emerald-100" : "border-red-300 text-red-100"}`}>{unit.name.toUpperCase()}{unit.woundState !== "healthy" ? ` · ${unit.woundState.toUpperCase()}` : ""}</div></Html>}
        {selected && <mesh position={[0, 0.02, 0]} rotation={[Math.PI / 2, 0, 0]}><torusGeometry args={[0.43, 0.05, 8, 32]} /><meshBasicMaterial color="#f8fafc" /></mesh>}
        {validTarget && <mesh position={[0, 0.04, 0]} rotation={[Math.PI / 2, 0, 0]}><torusGeometry args={[plannedTarget ? 0.52 : 0.46, plannedTarget ? 0.075 : 0.045, 8, 32]} /><meshBasicMaterial color={plannedTarget ? "#fef2f2" : "#ef4444"} /></mesh>}
        {maintainedTarget && <mesh position={[0, 0.08, 0]} rotation={[Math.PI / 2, 0, 0]}><torusGeometry args={[0.56, 0.025, 8, 32]} /><meshBasicMaterial color="#22d3ee" /></mesh>}
        {grenadeRisk && <mesh position={[0, 0.12, 0]} rotation={[Math.PI / 2, 0, 0]}><torusGeometry args={[0.61, 0.065, 8, 32]} /><meshBasicMaterial color="#fb923c" /></mesh>}
        {covering && <mesh position={[-0.34, 0.18, 0]}><boxGeometry args={[0.12, 0.12, 0.12]} /><meshBasicMaterial color="#facc15" /></mesh>}
        {overwatched && <mesh position={[0.34, 0.18, 0]}><boxGeometry args={[0.12, 0.12, 0.12]} /><meshBasicMaterial color="#e879f9" /></mesh>}
        {validTarget && covered && <mesh position={[0, 0.16, 0.36]}><boxGeometry args={[0.32, 0.08, 0.08]} /><meshBasicMaterial color="#f59e0b" /></mesh>}
        <mesh position={[0, 0.38, 0]} castShadow>{unit.side === "player" ? <cylinderGeometry args={[0.2, 0.28, 0.58, 12]} /> : <boxGeometry args={[0.42, 0.58, 0.32]} />}<meshStandardMaterial color={color} roughness={0.65} /></mesh>
        <mesh position={[0, 0.78, 0]} castShadow><sphereGeometry args={[0.2, 16, 12]} /><meshStandardMaterial color={color} roughness={0.65} /></mesh>
        {!inactive && <mesh position={facing.position} rotation={facing.rotation}><coneGeometry args={[0.11, 0.28, 3]} /><meshBasicMaterial color="#f8fafc" /></mesh>}
        {unit.surrendered ? <><mesh position={[-0.27, 0.72, 0]} rotation={[0, 0, 0.62]}><boxGeometry args={[0.09, 0.48, 0.09]} /><meshStandardMaterial color={color} /></mesh><mesh position={[0.27, 0.72, 0]} rotation={[0, 0, -0.62]}><boxGeometry args={[0.09, 0.48, 0.09]} /><meshStandardMaterial color={color} /></mesh></> : <><mesh position={[-0.27, 0.46, 0]} rotation={[0, 0, -0.22]}><boxGeometry args={[0.09, 0.42, 0.09]} /><meshStandardMaterial color={color} /></mesh><mesh position={[0.27, 0.46, 0]} rotation={[0, 0, 0.22]}><boxGeometry args={[0.09, 0.42, 0.09]} /><meshStandardMaterial color={color} /></mesh></>}
        {unit.woundState === "light" && <mesh position={[0.24, 0.55, 0]}><sphereGeometry args={[0.07, 8, 6]} /><meshBasicMaterial color="#fbbf24" /></mesh>}
      </group>;
    })}
  </>;
};

export const CombatBoard3D = () => {
  const dispatch = useAppDispatch();
  const grenadeTargeting = useAppSelector((state) => state.plugins.characterCombat.grenadeTargeting);
  return <Canvas shadows frameloop="demand" dpr={[1, 1.5]} onPointerMissed={() => { if (!grenadeTargeting) dispatch(selectPlayerCombatant(null)); }}><CombatScene3D /></Canvas>;
};
