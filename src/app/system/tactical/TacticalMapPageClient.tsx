"use client";

import Link from "next/link";
import Image from "next/image";
import { Canvas } from "@react-three/fiber";
import { Html, Line, OrbitControls, OrthographicCamera } from "@react-three/drei";
import { Suspense, useEffect, useMemo, useState } from "react";
import { ArrowDown, ArrowUp, ChevronsRight, Footprints, RotateCcw, RotateCw } from "lucide-react";
import { FloatingPluginHud } from "@/components/hud/FloatingPluginHud";
import { PluginHudLayer } from "@/components/hud/PluginHudLayer";
import { AnimatedCombatantFallback, AnimatedCombatantModel } from "@/plugins/characterCombat/AnimatedCombatantModel";
import { AnimatedCombatantPlacement } from "@/plugins/characterCombat/AnimatedCombatantPlacement";
import { activateTacticalCharacter, confirmTacticalMove, finishTacticalActivation, fireAtTacticalTerrain, initializeTacticalMap, interactWithTacticalTerrain, previewTacticalMove, selectTacticalTerrainObject, setTacticalMovementMode, toggleTacticalPosture, turnTacticalCharacter, updateTacticalActionHud, updateTacticalCharacterHud } from "@/plugins/characterCombat/slice";
import { pointKey, reachableOpenMapMovement } from "@/plugins/characterCombat/geometry";
import type { TacticalMapState } from "@/plugins/characterCombat/types";
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
import { armoryLoadouts } from "@/plugins/characterCombat/equipment";

const DEFAULT_MAP: TacticalMapState = { width: 100, height: 100, gridSize: 1, characterPositions: {}, facingByCharacterId: {}, postureByCharacterId: {}, movementAnimationByCharacterId: {}, characterHudLayout: { visible: true, pinned: false, position: { x: 16, y: 86 } }, actionHudLayout: { visible: true, pinned: false, position: { x: 16, y: 190 } }, movementMode: "walk", plannedDestination: null, selectedTerrainObjectId: null, doorOpenById: {}, terminalActiveById: {}, terrainDamageById: {}, destroyedTerrainObjectIds: [], weaponSkillByCharacterId: {}, ammunitionByCharacterId: {}, turn: 1, actionPointsByCharacterId: {}, actedCharacterIds: [], activeCharacterId: null };
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

const TacticalTerrainPiece = ({ object, mapWidth, mapHeight, selected, terminalActive, damage, onSelect }: { object: TacticalTerrainObject; mapWidth: number; mapHeight: number; selected: boolean; terminalActive: boolean; damage: number; onSelect: () => void }) => {
  if (object.kind === "terminal") {
    const position: [number, number, number] = [object.position.x + 0.5 - mapWidth / 2, 0.38, object.position.y + 0.5 - mapHeight / 2];
    return <group position={position} rotation={[0, object.facing * Math.PI / 180, 0]} onClick={(event) => { event.stopPropagation(); onSelect(); }}>
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
  if (object.kind === "wall") return <mesh position={position} onClick={(event) => { event.stopPropagation(); onSelect(); }}>
    <boxGeometry args={horizontal ? [Math.abs(dx), TACTICAL_WALL_HEIGHT, 0.22] : [0.22, TACTICAL_WALL_HEIGHT, Math.abs(dy)]} />
    <meshBasicMaterial color={selected ? "#facc15" : "#f97316"} transparent opacity={selected ? 0.55 : damage > 0 ? 0.4 : 0} depthWrite={false} />
  </mesh>;
  const openScale = object.open ? 0.18 : 1;
  const doorLength = horizontal ? Math.abs(dx) : Math.abs(dy);
  const retractionOffset = object.open ? -doorLength * (1 - openScale) / 2 : 0;
  const doorPosition: [number, number, number] = [position[0] + (horizontal ? retractionOffset : 0), position[1], position[2] + (horizontal ? 0 : retractionOffset)];
  return <mesh position={doorPosition} scale={horizontal ? [openScale, 1, 1] : [1, 1, openScale]} castShadow receiveShadow onClick={(event) => { event.stopPropagation(); onSelect(); }}>
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

const MapCharacter = ({ character, x, y, mapWidth, mapHeight, facing, movement, selected, onSelect }: { character: CharacterSummary; x: number; y: number; mapWidth: number; mapHeight: number; facing: "north" | "east" | "south" | "west"; movement?: { sequence: number; path: [number, number, number][]; mode: "walk" | "run" }; selected: boolean; onSelect: () => void }) => <AnimatedCombatantPlacement position={[x - mapWidth / 2 + 0.5, 0.02, y - mapHeight / 2 + 0.5]} rotation={[0, 0, 0]} finalFacing={facing} movement={movement} onClick={(event) => { event.stopPropagation(); onSelect(); }}>
  {(moving, visualFacing) => <>
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.018, 0]}>
      <ringGeometry args={[0.34, 0.47, 32]} />
      <meshBasicMaterial color={selected ? "#facc15" : "#22d3ee"} transparent opacity={selected ? 1 : 0.72} />
    </mesh>
    <Suspense fallback={<AnimatedCombatantFallback color="#22d3ee" />}>
      <AnimatedCombatantModel animation={moving ? movement?.mode ?? "walk" : "idle"} facing={visualFacing} />
    </Suspense>
    <Html center position={[0, 1.25, 0]} style={{ pointerEvents: "none" }}>
      <div className={`whitespace-nowrap border px-2 py-1 font-mono text-[10px] font-bold uppercase tracking-wider ${selected ? "border-yellow-300 bg-yellow-950/95 text-yellow-100" : "border-cyan-500/70 bg-slate-950/90 text-cyan-100"}`}>{character.name}</div>
    </Html>
  </>}
</AnimatedCombatantPlacement>;

const TacticalScene = ({ characters }: { characters: CharacterSummary[] }) => {
  const dispatch = useAppDispatch();
  const tacticalMap = useAppSelector((state) => state.plugins.characterCombat.tacticalMap) ?? DEFAULT_MAP;
  const selected = useAppSelector(selectSelectedProfileCharacter);
  const characterPoints = characters.flatMap((character) => {
    const position = tacticalMap.characterPositions[character.id];
    return position ? [position] : [];
  });
  const focusX = characterPoints.length > 0 ? characterPoints.reduce((total, point) => total + point.x + 0.5 - tacticalMap.width / 2, 0) / characterPoints.length : 0;
  const focusZ = characterPoints.length > 0 ? characterPoints.reduce((total, point) => total + point.y + 0.5 - tacticalMap.height / 2, 0) / characterPoints.length : 0;
  const selectedPosition = selected ? tacticalMap.characterPositions[selected.id] : null;
  const selectedActionPoints = selected ? tacticalMap.actionPointsByCharacterId[selected.id] ?? 0 : 0;
  const selectedFacing = selected ? tacticalMap.facingByCharacterId[selected.id] ?? "south" : "south";
  const selectedProne = selected ? tacticalMap.postureByCharacterId[selected.id] === "prone" : false;
  const tacticalTerrain = useMemo(() => TACTICAL_TERRAIN.filter((object) => !tacticalMap.destroyedTerrainObjectIds.includes(object.id)).map((object) => object.kind === "door" ? { ...object, open: tacticalMap.doorOpenById[object.id] ?? object.open } : object), [tacticalMap.destroyedTerrainObjectIds, tacticalMap.doorOpenById]);
  const blockedEdges = useMemo(() => tacticalTerrainBlockedEdges(tacticalTerrain), [tacticalTerrain]);
  const wallRuns = useMemo(() => tacticalWallVisualRuns(tacticalTerrain), [tacticalTerrain]);
  const reachableMoves = useMemo(() => {
    if (!selectedPosition || !tacticalMap.movementMode) return new Map();
    if (selectedProne) return new Map();
    return reachableOpenMapMovement({ width: tacticalMap.width, height: tacticalMap.height, origin: selectedPosition, facing: selectedFacing, allowance: Math.min(6, selectedActionPoints), trotting: tacticalMap.movementMode === "trot", blockedCells: TACTICAL_BLOCKED_CELLS, blockedEdges });
  }, [blockedEdges, selectedActionPoints, selectedFacing, selectedPosition, selectedProne, tacticalMap.height, tacticalMap.movementMode, tacticalMap.width]);
  const reachableCells = useMemo(() => {
    const cells = new Map([...reachableMoves].map(([key, move]) => [key, move.destination]));
    if (selectedPosition && tacticalMap.movementMode && reachableMoves.size > 0) cells.set(pointKey(selectedPosition), selectedPosition);
    return cells;
  }, [reachableMoves, selectedPosition, tacticalMap.movementMode]);
  const plannedMove = tacticalMap.plannedDestination ? reachableMoves.get(pointKey(tacticalMap.plannedDestination)) ?? null : null;

  return <>
    <color attach="background" args={["#050a12"]} />
    <ambientLight intensity={1.4} />
    <directionalLight position={[5, 10, 6]} intensity={2.2} castShadow />
    <OrthographicCamera makeDefault position={[focusX + 8, 12, focusZ + 10]} zoom={42} near={0.1} far={300} />
    <OrbitControls makeDefault target={[focusX, 0, focusZ]} enableDamping dampingFactor={0.12} screenSpacePanning minZoom={8} maxZoom={120} minPolarAngle={0.2} maxPolarAngle={Math.PI / 2.05} />
    <TacticalGrid width={tacticalMap.width} height={tacticalMap.height} gridSize={tacticalMap.gridSize} onSelectCell={(point) => dispatch(previewTacticalMove(reachableMoves.has(pointKey(point)) ? point : null))} />
    <MovementPerimeter cells={reachableCells} width={tacticalMap.width} height={tacticalMap.height} />
    {wallRuns.map((run) => <TacticalWallRun key={run.segmentIds.join(":")} run={run} mapWidth={tacticalMap.width} mapHeight={tacticalMap.height} />)}
    {TACTICAL_WALL_CORNERS.map((corner) => <mesh key={`${corner.x}:${corner.y}`} position={[corner.x - tacticalMap.width / 2, TACTICAL_WALL_CENTER_Y, corner.y - tacticalMap.height / 2]} castShadow receiveShadow>
      <boxGeometry args={[0.22, TACTICAL_WALL_HEIGHT, 0.22]} />
      <meshStandardMaterial color="#64748b" roughness={0.72} metalness={0.22} />
    </mesh>)}
    {tacticalTerrain.map((object) => <TacticalTerrainPiece key={object.id} object={object} mapWidth={tacticalMap.width} mapHeight={tacticalMap.height} selected={tacticalMap.selectedTerrainObjectId === object.id} terminalActive={object.kind === "terminal" && Boolean(tacticalMap.terminalActiveById[object.id])} damage={tacticalMap.terrainDamageById[object.id] ?? 0} onSelect={() => dispatch(selectTacticalTerrainObject(object.id))} />)}
    {selectedPosition && plannedMove && <MovementPreview origin={selectedPosition} path={plannedMove.path} destination={plannedMove.destination} width={tacticalMap.width} height={tacticalMap.height} />}
    {characters.map((character) => {
      const position = tacticalMap.characterPositions[character.id];
      if (!position) return null;
      const animation = tacticalMap.movementAnimationByCharacterId[character.id];
      const worldMovement = animation ? { ...animation, path: animation.path.map((point) => [point.x + 0.5 - tacticalMap.width / 2, 0.02, point.y + 0.5 - tacticalMap.height / 2] as [number, number, number]) } : undefined;
      return <MapCharacter key={character.id} character={character} x={position.x} y={position.y} mapWidth={tacticalMap.width} mapHeight={tacticalMap.height} facing={tacticalMap.facingByCharacterId[character.id] ?? "south"} movement={worldMovement} selected={selected?.id === character.id} onSelect={() => { dispatch(activateTacticalCharacter(character.id)); dispatch(setSelectedProfileCharacter(character.id)); }} />;
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
  const selectedCrewMember = selected ? characters.find((character) => character.id === selected.id) ?? null : null;
  const selectedPosition = selectedCrewMember ? tacticalMap.characterPositions[selectedCrewMember.id] ?? null : null;
  const selectedActionPoints = selectedCrewMember ? tacticalMap.actionPointsByCharacterId[selectedCrewMember.id] ?? 0 : 0;
  const selectedProne = selectedCrewMember ? tacticalMap.postureByCharacterId[selectedCrewMember.id] === "prone" : false;
  const tacticalTerrain = useMemo(() => TACTICAL_TERRAIN.filter((object) => !tacticalMap.destroyedTerrainObjectIds.includes(object.id)).map((object) => object.kind === "door" ? { ...object, open: tacticalMap.doorOpenById[object.id] ?? object.open } : object), [tacticalMap.destroyedTerrainObjectIds, tacticalMap.doorOpenById]);
  const blockedEdges = useMemo(() => tacticalTerrainBlockedEdges(tacticalTerrain), [tacticalTerrain]);
  const selectedTerrain = tacticalTerrain.find((object) => object.id === tacticalMap.selectedTerrainObjectId) ?? null;
  const terrainInteractionCost = selectedTerrain?.kind === "door" ? selectedTerrain.open ? 3 : 6 : selectedTerrain?.kind === "terminal" ? 6 : 0;
  const terrainAdjacent = Boolean(selectedPosition && selectedTerrain && (selectedTerrain.kind === "door"
    ? [selectedTerrain.separates.first, selectedTerrain.separates.second].some((point) => point.x === selectedPosition.x && point.y === selectedPosition.y)
    : selectedTerrain.kind === "terminal" && Math.abs(selectedTerrain.position.x - selectedPosition.x) + Math.abs(selectedTerrain.position.y - selectedPosition.y) === 1));
  const terminalAlreadyActive = selectedTerrain?.kind === "terminal" && Boolean(tacticalMap.terminalActiveById[selectedTerrain.id]);
  const selectedLoadoutIndex = selectedCrewMember ? characters.findIndex((character) => character.id === selectedCrewMember.id) : -1;
  const activeLoadoutIds = combat.extendedArmoryLoadoutIds ?? combat.armoryLoadoutIds;
  const selectedLoadout = selectedLoadoutIndex >= 0 ? armoryLoadouts[activeLoadoutIds[selectedLoadoutIndex] ?? combat.armoryLoadoutIds[selectedLoadoutIndex]] : null;
  const selectedWeapon = selectedLoadout?.weapon ?? null;
  const selectedAmmunition = selectedCrewMember ? tacticalMap.ammunitionByCharacterId[selectedCrewMember.id] ?? 0 : 0;
  const structuralWeaponEligible = Boolean(selectedWeapon && !selectedWeapon.highEnergy && (selectedWeapon.ammunitionKind === "he" || selectedWeapon.ammunitionKind === "heap" || selectedWeapon.ammunitionKind === "discard-sabot"));
  const selectedStructure = selectedTerrain?.kind === "wall" || selectedTerrain?.kind === "door" ? selectedTerrain : null;
  const selectedStructureThreshold = selectedStructure?.kind === "door" ? 5 : 25;
  const selectedStructureDamage = selectedStructure ? tacticalMap.terrainDamageById[selectedStructure.id] ?? 0 : 0;
  const previewedMoves = selectedPosition && selectedCrewMember && tacticalMap.movementMode
    ? selectedProne
      ? new Map()
      : reachableOpenMapMovement({ width: tacticalMap.width, height: tacticalMap.height, origin: selectedPosition, facing: tacticalMap.facingByCharacterId[selectedCrewMember.id] ?? "south", allowance: Math.min(6, selectedActionPoints), trotting: tacticalMap.movementMode === "trot", blockedCells: TACTICAL_BLOCKED_CELLS, blockedEdges })
    : null;
  const previewedMove = tacticalMap.plannedDestination ? previewedMoves?.get(pointKey(tacticalMap.plannedDestination)) ?? null : null;

  useEffect(() => { if (status === "idle") void dispatch(fetchCharacters()); }, [dispatch, status]);
  useEffect(() => {
    if (status === "loaded" && shipStatus === "loaded") dispatch(initializeTacticalMap(characters.map((character) => ({ id: character.id, weaponSkill: character.skills.find((skill) => skill.name === "Gun Combat")?.level ?? 0 }))));
  }, [characters, dispatch, shipStatus, status]);
  useEffect(() => {
    if (tacticalMap.activeCharacterId && selected?.id !== tacticalMap.activeCharacterId) dispatch(setSelectedProfileCharacter(tacticalMap.activeCharacterId));
  }, [dispatch, selected?.id, tacticalMap.activeCharacterId]);

  const hiddenHuds = [
    ...(!tacticalMap.characterHudLayout.visible ? [{ id: "characters", title: "Characters" }] : []),
    ...(!tacticalMap.actionHudLayout.visible ? [{ id: "action", title: "Current Action" }] : []),
  ];

  return <main className="h-screen w-screen overflow-hidden bg-[#050a12] [--hud-accent:#a5f3fc] [--hud-bg:#071019] [--hud-border:#42616e] [--hud-border-subtle:#29434d] [--hud-text:#e2f3f6] [--hud-text-dim:#8faab3]">
    <PluginHudLayer hiddenHuds={hiddenHuds} onRestoreHud={(id) => dispatch(id === "action" ? updateTacticalActionHud({ ...tacticalMap.actionHudLayout, visible: true }) : updateTacticalCharacterHud({ ...tacticalMap.characterHudLayout, visible: true }))}>
      <Canvas shadows frameloop="demand" dpr={[1, 1.5]} onPointerMissed={() => { dispatch(setSelectedProfileCharacter(null)); dispatch(selectTacticalTerrainObject(null)); }}>
        <TacticalScene characters={characters} />
      </Canvas>
      <div className="pointer-events-none absolute left-4 top-4 border border-cyan-500/50 bg-slate-950/90 px-3 py-2 font-mono text-cyan-100 shadow-lg">
        <div className="text-xs font-bold uppercase tracking-[0.22em]">Tactical Map</div>
        <div className="mt-1 text-[10px] text-slate-400">Turn {tacticalMap.turn} · 100×100 implicit grid · {characters.length}/2 crew members</div>
        <div className="mt-1 text-[9px] uppercase tracking-wider text-slate-500">Drag to rotate · Right-drag to pan · Wheel to zoom</div>
      </div>
      <Link href="/system" className="absolute right-4 top-14 z-40 border border-cyan-400/70 bg-slate-950/90 px-3 py-2 font-mono text-xs font-bold uppercase tracking-[0.18em] text-cyan-100 hover:bg-cyan-950">System view</Link>
      <FloatingPluginHud title="Characters" layout={tacticalMap.characterHudLayout} onLayoutChange={(layout) => dispatch(updateTacticalCharacterHud(layout))} className="font-mono text-[8px] uppercase tracking-wider text-(--hud-text)">
        <nav aria-label="Tactical character roster" className="flex max-w-[75vw] gap-1 p-1">
          {characters.map((character) => <TacticalCharacterButton key={character.id} character={character} actionPoints={tacticalMap.actionPointsByCharacterId[character.id] ?? 0} selected={selected?.id === character.id} onSelect={() => { dispatch(activateTacticalCharacter(character.id)); dispatch(setSelectedProfileCharacter(character.id)); }} />)}
          {status === "loaded" && shipStatus === "loaded" && characters.length === 0 && <span className="px-3 py-4 text-(--hud-text-dim)">No assigned character crew</span>}
        </nav>
      </FloatingPluginHud>
      <FloatingPluginHud title="Current Action" layout={tacticalMap.actionHudLayout} onLayoutChange={(layout) => dispatch(updateTacticalActionHud(layout))} className="w-52 font-mono text-[8px] uppercase tracking-wider text-(--hud-text)">
        <section className="p-2">
          {selectedCrewMember && selectedPosition ? <>
            <div className="font-bold text-cyan-100">{selectedCrewMember.name}</div>
            <div className="mt-1 text-(--hud-text-dim)">Grid position <span className="text-(--hud-text)">{selectedPosition.x}, {selectedPosition.y}</span> · <span className="text-emerald-200">{selectedActionPoints} AP</span> · <span className={selectedProne ? "text-amber-200" : "text-(--hud-text-dim)"}>{selectedProne ? "Prone" : "Standing"}</span></div>
            <div className="mt-2 flex items-center justify-start gap-1 border-t border-(--hud-border-subtle) pt-2">
              <button type="button" title={selectedProne ? "Movement unavailable while prone" : tacticalMap.movementMode === "trot" ? "Trot mode · switch to walk" : selectedActionPoints === 6 ? "Walk mode · switch to trot" : "Walk mode · trot unavailable"} aria-label={selectedProne ? "Movement unavailable while prone" : tacticalMap.movementMode === "trot" ? "Trot mode, switch to walk" : selectedActionPoints === 6 ? "Walk mode, switch to trot" : "Walk mode, trot unavailable"} disabled={selectedProne || selectedActionPoints < 1 || (tacticalMap.movementMode !== "trot" && selectedActionPoints !== 6)} onClick={() => dispatch(setTacticalMovementMode(tacticalMap.movementMode === "trot" ? "walk" : "trot"))} className={`flex h-7 w-9 items-center justify-center border ${tacticalMap.movementMode === "trot" ? "border-yellow-300 bg-yellow-300/20 text-yellow-100" : "border-(--hud-border) text-(--hud-text-dim) hover:border-cyan-300 hover:text-(--hud-text)"} disabled:cursor-not-allowed disabled:opacity-35`}>
                {tacticalMap.movementMode === "trot" ? <ChevronsRight size={15} /> : <Footprints size={14} />}
              </button>
              <button type="button" title={`Turn left · ${tacticalMap.movementMode === "trot" ? 2 : 1} AP`} aria-label={`Turn left, ${tacticalMap.movementMode === "trot" ? 2 : 1} AP`} disabled={selectedProne || selectedActionPoints < (tacticalMap.movementMode === "trot" ? 2 : 1)} onClick={() => dispatch(turnTacticalCharacter("left"))} className="flex h-7 w-7 items-center justify-center border border-(--hud-border) text-(--hud-text-dim) hover:border-cyan-300 hover:text-(--hud-text) disabled:cursor-not-allowed disabled:opacity-35"><RotateCcw size={13} /></button>
              <button type="button" title={`Turn right · ${tacticalMap.movementMode === "trot" ? 2 : 1} AP`} aria-label={`Turn right, ${tacticalMap.movementMode === "trot" ? 2 : 1} AP`} disabled={selectedProne || selectedActionPoints < (tacticalMap.movementMode === "trot" ? 2 : 1)} onClick={() => dispatch(turnTacticalCharacter("right"))} className="flex h-7 w-7 items-center justify-center border border-(--hud-border) text-(--hud-text-dim) hover:border-cyan-300 hover:text-(--hud-text) disabled:cursor-not-allowed disabled:opacity-35"><RotateCw size={13} /></button>
              <button type="button" title={selectedProne ? "Stand up · 2 AP" : "Go prone · 1 AP"} aria-label={selectedProne ? "Stand up, 2 AP" : "Go prone, 1 AP"} disabled={selectedActionPoints < (selectedProne ? 2 : 1)} onClick={() => dispatch(toggleTacticalPosture())} className={`flex h-7 w-7 items-center justify-center border ${selectedProne ? "border-amber-400/70 bg-amber-300/10 text-amber-100" : "border-(--hud-border) text-(--hud-text-dim) hover:border-cyan-300 hover:text-(--hud-text)"} disabled:cursor-not-allowed disabled:opacity-35`}>{selectedProne ? <ArrowUp size={13} /> : <ArrowDown size={13} />}</button>
            </div>
            <div className="mt-2 text-[7px] tracking-widest text-(--hud-text-dim)">{selectedProne ? "Stand before moving" : tacticalMap.movementMode ? `${tacticalMap.movementMode} perimeter shown` : "No action selected"}</div>
            {selectedTerrain && <div className="mt-2 border-t border-(--hud-border-subtle) pt-2">
              <div className="font-bold text-amber-100">{selectedTerrain.kind === "wall" ? "Wall segment" : selectedTerrain.kind === "door" ? `${selectedTerrain.open ? "Open" : "Closed"} door` : selectedTerrain.label}</div>
              {selectedTerrain.kind !== "wall" && <><div className={`mt-1 ${terrainAdjacent ? "text-emerald-200" : "text-rose-200"}`}>{terrainAdjacent ? "Adjacent" : "Move adjacent to interact"}</div>
                {selectedTerrain.kind === "terminal" && terminalAlreadyActive ? <div className="mt-2 text-emerald-200">Terminal active</div> : <button type="button" disabled={!terrainAdjacent || selectedActionPoints < terrainInteractionCost} onClick={() => dispatch(interactWithTacticalTerrain())} className="mt-2 h-7 w-full border border-cyan-400/70 text-cyan-100 hover:bg-cyan-300/10 disabled:cursor-not-allowed disabled:opacity-35">
                  {selectedTerrain.kind === "door" ? selectedTerrain.open ? "Close door · 3 AP" : "Open door · 6 AP" : "Activate terminal · 6 AP"}
                </button>}</>}
              {selectedStructure && <div className="mt-2 border-t border-(--hud-border-subtle) pt-2">
                <div>Integrity damage <span className="text-fuchsia-100">{selectedStructureDamage}/{selectedStructureThreshold}</span></div>
                <div className="mt-1">{selectedWeapon?.name ?? "No weapon"} · {selectedAmmunition} ammunition</div>
                {selectedWeapon?.highEnergy && <div className="mt-1 text-orange-200">High-energy weapon must be braced</div>}
                {!structuralWeaponEligible && !selectedWeapon?.highEnergy && <div className="mt-1 text-orange-200">Current ammunition cannot damage structures</div>}
                <button type="button" disabled={!structuralWeaponEligible || selectedActionPoints < 6 || selectedAmmunition < 1} onClick={() => dispatch(fireAtTacticalTerrain({ hitDice: rollDicePair() }))} className="mt-2 h-7 w-full border border-fuchsia-400/70 text-fuchsia-100 hover:bg-fuchsia-300/10 disabled:cursor-not-allowed disabled:opacity-35">Fire at structure · 6 AP</button>
              </div>}
            </div>}
            {previewedMove && <div className="mt-2 border-t border-(--hud-border-subtle) pt-2">
              <div>Destination <span className="text-cyan-100">{previewedMove.destination.x}, {previewedMove.destination.y}</span></div>
              <div className="mt-1">Movement cost <span className="text-cyan-100">{previewedMove.cost}</span></div>
              <div className="mt-2 grid grid-cols-2 gap-1">
                <button type="button" onClick={() => dispatch(confirmTacticalMove())} className="h-7 border border-emerald-400/70 text-emerald-100 hover:bg-emerald-300/10">Confirm</button>
                <button type="button" onClick={() => dispatch(previewTacticalMove(null))} className="h-7 border border-(--hud-border) text-(--hud-text-dim) hover:border-cyan-300 hover:text-(--hud-text)">Cancel</button>
              </div>
            </div>}
            <button type="button" onClick={() => dispatch(finishTacticalActivation())} className="mt-2 h-7 w-full border border-amber-400/70 text-amber-100 hover:bg-amber-300/10">Finish activation</button>
          </> : <div className="py-2 text-center text-(--hud-text-dim)">Select a crew member</div>}
        </section>
      </FloatingPluginHud>
      {(status === "loading" || shipStatus === "loading") && <div className="absolute inset-x-0 bottom-8 text-center font-mono text-xs uppercase tracking-widest text-cyan-200">Loading crew…</div>}
      {(status === "error" || shipStatus === "error") && <div className="absolute inset-x-0 bottom-8 text-center font-mono text-xs uppercase tracking-widest text-rose-300">Crew could not be loaded</div>}
    </PluginHudLayer>
  </main>;
};

export default TacticalMapPageClient;
