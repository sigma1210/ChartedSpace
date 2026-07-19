"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState, type PointerEvent as ReactPointerEvent } from "react";
import { Provider } from "react-redux";
import { FloatingPluginHud, type FloatingPluginHudLayout } from "@/components/hud/FloatingPluginHud";
import { PluginHudLayer } from "@/components/hud/PluginHudLayer";
import TacticalMapPageClient from "../TacticalMapPageClient";
import { cloneTacticalScenarioDefinition, defaultTacticalScenarioDefinition, resolveTacticalScenarioTerrain, tacticalTerrainPalette, type TacticalScenarioDefinitionFile, type TacticalTerrainPlacement } from "@/plugins/characterCombat/tacticalScenarioDefinitions";
import type { TacticalTerminalKind } from "@/plugins/characterCombat/tacticalTerrain";
import { createAppStore, store, type AppStore } from "@/store";

const freshDefaultDraft = () => cloneTacticalScenarioDefinition(defaultTacticalScenarioDefinition);
const definitionsMatch = (first: TacticalScenarioDefinitionFile, second: TacticalScenarioDefinitionFile) => JSON.stringify(first) === JSON.stringify(second);
type ScenarioSummary = { id: string; title: string; isDefault: boolean };
const fetchScenarioList = async () => {
  const response = await fetch("/api/tactical/scenarios", { cache: "no-store" });
  const body = await response.json() as { scenarios?: ScenarioSummary[]; error?: string };
  if (!response.ok || !body.scenarios) throw new Error(body.error ?? "Could not list scenario files.");
  return body.scenarios;
};
const FIRE_TOOL_ID = "scenario-fire";
const IRIS_VALVE_ID = "iris-valve";
const cellKey = (point: { x: number; y: number }) => `${point.x}:${point.y}`;
type EditorMapPoint = { x: number; y: number; edgeRotation?: TacticalTerrainPlacement["rotation"] };
const placementRotations = (terrainDefinitionId: string, edgeRotation?: TacticalTerrainPlacement["rotation"]): TacticalTerrainPlacement["rotation"][] => terrainDefinitionId === IRIS_VALVE_ID && edgeRotation !== undefined
  ? [edgeRotation]
  : terrainDefinitionId.startsWith("bridge-") || terrainDefinitionId === IRIS_VALVE_ID ? [0, 90, 180, 270] : [0];
const irisEdge = (origin: { x: number; y: number }, rotation: TacticalTerrainPlacement["rotation"]) => rotation === 90
  ? { from: { x: origin.x + 1, y: origin.y }, to: { x: origin.x + 1, y: origin.y + 1 } }
  : rotation === 180
    ? { from: { x: origin.x + 1, y: origin.y + 1 }, to: { x: origin.x, y: origin.y + 1 } }
    : rotation === 270
      ? { from: { x: origin.x, y: origin.y + 1 }, to: { x: origin.x, y: origin.y } }
      : { from: { x: origin.x, y: origin.y }, to: { x: origin.x + 1, y: origin.y } };
const rotatePreviewCell = (point: { x: number; y: number }, size: { width: number; height: number }, rotation: TacticalTerrainPlacement["rotation"]) => {
  if (rotation === 90) return { x: size.height - 1 - point.y, y: point.x };
  if (rotation === 180) return { x: size.width - 1 - point.x, y: size.height - 1 - point.y };
  if (rotation === 270) return { x: point.y, y: size.width - 1 - point.x };
  return point;
};
const placementCandidates = (terrainDefinitionId: string, anchor: EditorMapPoint) => {
  const paletteItem = tacticalTerrainPalette.find((item) => item.id === terrainDefinitionId);
  if (!paletteItem) return [];
  const candidates = placementRotations(terrainDefinitionId, anchor.edgeRotation).flatMap((rotation) => {
    const cells = paletteItem.previewCells.map((cell) => rotatePreviewCell(cell, paletteItem.size, rotation));
    const anchors = terrainDefinitionId.startsWith("bridge-") ? cells : [{ x: 0, y: 0 }];
    return anchors.map((cell) => ({ rotation, cells, origin: { x: anchor.x - cell.x, y: anchor.y - cell.y } }));
  });
  const seen = new Set<string>();
  return candidates.filter((candidate) => {
    const key = `${candidate.origin.x}:${candidate.origin.y}:${candidate.rotation}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
};

const DraftPreview = ({ definition, selectedPlacementId, selectedFire, placementKind, placementHover, dragPlacement, selectPlacement, selectFire, hoverPlacement, beginDrag, endDrag, placeTerrain, moveTerrain }: {
  definition: TacticalScenarioDefinitionFile;
  selectedPlacementId: string | null;
  selectedFire: { x: number; y: number } | null;
  placementKind: string | null;
  placementHover: EditorMapPoint | null;
  dragPlacement: { id: string; offset: { x: number; y: number } } | null;
  selectPlacement: (id: string | null) => void;
  selectFire: (point: { x: number; y: number } | null) => void;
  hoverPlacement: (point: EditorMapPoint | null) => void;
  beginDrag: (drag: { id: string; offset: { x: number; y: number } }) => void;
  endDrag: () => void;
  placeTerrain: (point: EditorMapPoint) => void;
  moveTerrain: (id: string, origin: { x: number; y: number }) => void;
}) => {
  const resolved = useMemo(() => {
    try {
      return { terrain: resolveTacticalScenarioTerrain(definition), error: null };
    } catch (error) {
      return { terrain: null, error: error instanceof Error ? error.message : "The draft could not be resolved." };
    }
  }, [definition]);

  const mapPoint = (event: ReactPointerEvent<SVGElement>) => {
    const svg = event.currentTarget instanceof SVGSVGElement ? event.currentTarget : event.currentTarget.ownerSVGElement;
    const matrix = svg?.getScreenCTM();
    if (!svg || !matrix) return null;
    const point = svg.createSVGPoint();
    point.x = event.clientX;
    point.y = event.clientY;
    const local = point.matrixTransform(matrix.inverse());
    const x = Math.floor(local.x);
    const y = Math.floor(local.y);
    const fractionX = local.x - x;
    const fractionY = local.y - y;
    const edgeRotation = ([
      { distance: fractionY, rotation: 0 as const },
      { distance: 1 - fractionX, rotation: 90 as const },
      { distance: 1 - fractionY, rotation: 180 as const },
      { distance: fractionX, rotation: 270 as const },
    ]).sort((first, second) => first.distance - second.distance)[0].rotation;
    return { x, y, edgeRotation };
  };
  const placementSize = (placement: TacticalTerrainPlacement) => {
    const definition = tacticalTerrainPalette.find((item) => item.id === placement.terrainDefinitionId);
    if (!definition) return { width: 1, height: 1 };
    return placement.rotation === 90 || placement.rotation === 270
      ? { width: definition.size.height, height: definition.size.width }
      : definition.size;
  };
  const placementPreview = (() => {
    if (!placementKind || !placementHover) return null;
    if (placementKind === FIRE_TOOL_ID) {
      const valid = placementHover.x >= 0
        && placementHover.y >= 0
        && placementHover.x < definition.map.width
        && placementHover.y < definition.map.height
        && !definition.fireCells.some((cell) => cellKey(cell) === cellKey(placementHover));
      return { kind: "fire" as const, origin: placementHover, cells: [{ x: 0, y: 0 }], valid };
    }
    const paletteItem = tacticalTerrainPalette.find((item) => item.id === placementKind);
    if (!paletteItem) return null;
    for (const candidate of placementCandidates(placementKind, placementHover)) {
      const previewPlacement: TacticalTerrainPlacement = { id: "terrain-placement-preview", terrainDefinitionId: placementKind, origin: candidate.origin, rotation: candidate.rotation };
      try {
        resolveTacticalScenarioTerrain({ ...definition, terrainPlacements: [...definition.terrainPlacements, previewPlacement] });
        if (placementKind === IRIS_VALVE_ID) return { kind: "iris" as const, edge: irisEdge(candidate.origin, candidate.rotation), valid: true };
        return { kind: "terrain" as const, origin: candidate.origin, cells: candidate.cells, valid: true };
      } catch {
        // Try the next bridge orientation.
      }
    }
    if (placementKind === IRIS_VALVE_ID) return { kind: "iris" as const, edge: irisEdge(placementHover, placementHover.edgeRotation ?? 0), valid: false };
    return { kind: "terrain" as const, origin: placementHover, cells: paletteItem.previewCells, valid: false };
  })();

  if (!resolved.terrain) return <div className="flex h-full items-center justify-center p-8 font-mono text-sm text-red-200">{resolved.error}</div>;
  const { terrain } = resolved;
  const orderedPlacements = [...definition.terrainPlacements].sort((first, second) => {
    const firstSize = placementSize(first);
    const secondSize = placementSize(second);
    return secondSize.width * secondSize.height - firstSize.width * firstSize.height;
  });
  return <svg viewBox={`0 0 ${definition.map.width} ${definition.map.height}`} preserveAspectRatio="xMidYMid meet" className={`h-full w-full bg-[#050a12] ${placementKind ? "cursor-crosshair" : ""}`} aria-label="Scenario draft map preview"
    onPointerDown={(event) => {
      const point = mapPoint(event);
      if (!point) return;
      if (placementKind) placeTerrain(point);
      else {
        selectPlacement(null);
        selectFire(null);
      }
    }}
    onPointerMove={(event) => {
      const point = mapPoint(event);
      if (!point) return;
      if (dragPlacement) moveTerrain(dragPlacement.id, { x: point.x - dragPlacement.offset.x, y: point.y - dragPlacement.offset.y });
      else if (placementKind) hoverPlacement(point);
    }} onPointerLeave={() => hoverPlacement(null)} onPointerUp={endDrag} onPointerCancel={endDrag}>
    <defs>
      <pattern id="draft-grid" width="1" height="1" patternUnits="userSpaceOnUse">
        <path d="M 1 0 L 0 0 0 1" fill="none" stroke="#29434d" strokeWidth="0.04" />
      </pattern>
    </defs>
    <rect x="0" y="0" width={definition.map.width} height={definition.map.height} fill="url(#draft-grid)" />
    {terrain.interiorCells.map((cell) => <rect key={`interior:${cell.x}:${cell.y}`} x={cell.x} y={cell.y} width="1" height="1" fill="#164e63" opacity="0.28" />)}
    {Object.entries(terrain.terrainByCell).map(([key, terrainType]) => {
      const [x, y] = key.split(":").map(Number);
      const elevationLevel = terrain.elevationLevelByCell[key] ?? 0;
      const elevatedColor = elevationLevel >= 3 ? "#67e8f9" : elevationLevel === 2 ? "#22d3ee" : "#0e7490";
      return <rect key={`terrain:${key}`} x={x} y={y} width="1" height="1" fill={terrainType === "elevated" ? elevatedColor : terrainType === "close-machinery" ? "#b45309" : "#475569"} opacity={terrainType === "elevated" ? Math.min(0.42 + elevationLevel * 0.12, 0.78) : 0.46} />;
    })}
    {terrain.closeMachineryCells.map((cell) => <rect key={`close-machinery:${cell.x}:${cell.y}`} x={cell.x} y={cell.y} width="1" height="1" fill="#b45309" opacity="0.62" />)}
    {terrain.liquidHydrogenAreas.flatMap((area) => area.cells.map((cell) => <rect key={`liquid-hydrogen:${area.id}:${cell.x}:${cell.y}`} x={cell.x + 0.06} y={cell.y + 0.06} width="0.88" height="0.88" fill={area.filled ? "#67e8f9" : "#0f172a"} stroke={area.filled ? "#cffafe" : "#64748b"} strokeWidth="0.08" opacity={area.filled ? 0.7 : 0.85} />))}
    {terrain.bridges.flatMap((bridge) => bridge.cells.map((cell, index) => <rect key={`bridge:${bridge.id}:${index}`} x={cell.x + 0.08} y={cell.y + 0.08} width="0.84" height="0.84" fill="#7c3aed" stroke="#c4b5fd" strokeWidth="0.1" opacity="0.78" />))}
    {terrain.elevationAccessCells.map((cell) => <rect key={`stairs:${cell.x}:${cell.y}`} x={cell.x + 0.08} y={cell.y + 0.08} width="0.84" height="0.84" fill="#cbd5e1" stroke="#0891b2" strokeWidth="0.12" />)}
    {terrain.walls.map((wall) => <line key={wall.id} x1={wall.from.x} y1={wall.from.y} x2={wall.to.x} y2={wall.to.y} stroke="#94a3b8" strokeWidth="0.22" />)}
    {terrain.doors.filter((door) => door.portalType !== "iris-valve").map((door) => <line key={door.id} x1={door.from.x} y1={door.from.y} x2={door.to.x} y2={door.to.y} stroke="#fbbf24" strokeWidth="0.32" />)}
    {terrain.doors.filter((door) => door.portalType === "iris-valve").map((door) => {
      const center = { x: (door.from.x + door.to.x) / 2, y: (door.from.y + door.to.y) / 2 };
      return <g key={door.id}>
        <circle cx={center.x} cy={center.y} r="0.3" fill="#334155" stroke="#fbbf24" strokeWidth="0.1" />
        {[0, 60, 120].map((angle) => <line key={angle} x1={center.x - 0.25 * Math.cos(angle * Math.PI / 180)} y1={center.y - 0.25 * Math.sin(angle * Math.PI / 180)} x2={center.x + 0.25 * Math.cos(angle * Math.PI / 180)} y2={center.y + 0.25 * Math.sin(angle * Math.PI / 180)} stroke="#94a3b8" strokeWidth="0.035" />)}
      </g>;
    })}
    {terrain.terrainObjects.filter((object) => object.kind === "hatch").map((hatch) => <g key={hatch.id}>
      <rect x={hatch.position.x + 0.12} y={hatch.position.y + 0.12} width="0.76" height="0.76" rx="0.08" fill="#334155" stroke="#fbbf24" strokeWidth="0.1" />
      <line x1={hatch.position.x + 0.2} y1={hatch.position.y + 0.2} x2={hatch.position.x + 0.8} y2={hatch.position.y + 0.8} stroke="#94a3b8" strokeWidth="0.045" />
      <line x1={hatch.position.x + 0.8} y1={hatch.position.y + 0.2} x2={hatch.position.x + 0.2} y2={hatch.position.y + 0.8} stroke="#94a3b8" strokeWidth="0.045" />
    </g>)}
    {terrain.objects.map((object) => <g key={object.id}>
      <rect x={object.position.x + 0.15} y={object.position.y + 0.15} width="0.7" height="0.7" fill="#22d3ee" />
      <title>{object.label}</title>
    </g>)}
    {placementPreview?.kind === "terrain" && placementPreview.cells.map((cell) => <rect key={`placement-preview:${cell.x}:${cell.y}`} x={placementPreview.origin.x + cell.x} y={placementPreview.origin.y + cell.y} width="1" height="1"
      fill={placementPreview.valid ? "#94a3b8" : "#ef4444"} fillOpacity="0.28" stroke={placementPreview.valid ? "#e2e8f0" : "#fecaca"} strokeWidth="0.12" pointerEvents="none" />)}
    {placementPreview?.kind === "fire" && <circle cx={placementPreview.origin.x + 0.5} cy={placementPreview.origin.y + 0.5} r="0.34" fill={placementPreview.valid ? "#f97316" : "#ef4444"} fillOpacity="0.58" stroke={placementPreview.valid ? "#fed7aa" : "#fecaca"} strokeWidth="0.12" pointerEvents="none" />}
    {placementPreview?.kind === "iris" && <g pointerEvents="none">
      <line x1={placementPreview.edge.from.x} y1={placementPreview.edge.from.y} x2={placementPreview.edge.to.x} y2={placementPreview.edge.to.y} stroke={placementPreview.valid ? "#94a3b8" : "#ef4444"} strokeWidth="0.22" />
      <circle cx={(placementPreview.edge.from.x + placementPreview.edge.to.x) / 2} cy={(placementPreview.edge.from.y + placementPreview.edge.to.y) / 2} r="0.3" fill={placementPreview.valid ? "#64748b" : "#ef4444"} fillOpacity="0.7" stroke={placementPreview.valid ? "#fbbf24" : "#fecaca"} strokeWidth="0.1" />
    </g>}
    {orderedPlacements.map((placement) => {
      const size = placementSize(placement);
      const selected = placement.id === selectedPlacementId;
      const raised = placement.terrainDefinitionId.startsWith("raised-area");
      return <rect key={`placement-control:${placement.id}`} x={placement.origin.x} y={placement.origin.y} width={size.width} height={size.height}
        fill={selected ? "#22d3ee" : "transparent"} fillOpacity={selected ? 0.16 : 0} stroke={selected ? "#fef08a" : raised ? "#67e8f9" : "transparent"} strokeOpacity={selected ? 1 : 0.72} strokeWidth={selected ? "0.24" : "0.12"}
        className="cursor-move" onPointerDown={(event) => {
          if (placementKind) return;
          event.stopPropagation();
          const point = mapPoint(event);
          if (!point) return;
          selectFire(null);
          selectPlacement(placement.id);
          event.currentTarget.setPointerCapture(event.pointerId);
          beginDrag({ id: placement.id, offset: { x: point.x - placement.origin.x, y: point.y - placement.origin.y } });
        }} />;
    })}
    {definition.fireCells.map((cell) => {
      const selected = selectedFire && cellKey(selectedFire) === cellKey(cell);
      return <circle key={`fire:${cell.x}:${cell.y}`} cx={cell.x + 0.5} cy={cell.y + 0.5} r="0.32" fill="#f97316" stroke={selected ? "#fef08a" : "#fed7aa"} strokeWidth={selected ? "0.18" : "0.08"}
        className={placementKind ? undefined : "cursor-pointer"} onPointerDown={(event) => {
          if (placementKind) return;
          event.stopPropagation();
          selectPlacement(null);
          selectFire(cell);
        }} />;
    })}
  </svg>;
};

const TacticalScenarioEditorClient = () => {
  const [draft, setDraft] = useState<TacticalScenarioDefinitionFile>(freshDefaultDraft);
  const [baseline, setBaseline] = useState<TacticalScenarioDefinitionFile>(freshDefaultDraft);
  const [currentScenario, setCurrentScenario] = useState<ScenarioSummary>({ id: defaultTacticalScenarioDefinition.id, title: defaultTacticalScenarioDefinition.title, isDefault: true });
  const [availableScenarios, setAvailableScenarios] = useState<ScenarioSummary[]>([]);
  const [scenarioToLoad, setScenarioToLoad] = useState(defaultTacticalScenarioDefinition.id);
  const [saveAsName, setSaveAsName] = useState("");
  const [fileBusy, setFileBusy] = useState(false);
  const [fileMessage, setFileMessage] = useState<{ kind: "error" | "success"; text: string } | null>(null);
  const [playtest, setPlaytest] = useState<{ definition: TacticalScenarioDefinitionFile; sandbox: AppStore } | null>(null);
  const [selectedPlacementId, setSelectedPlacementId] = useState<string | null>(null);
  const [selectedFire, setSelectedFire] = useState<{ x: number; y: number } | null>(null);
  const [placementKind, setPlacementKind] = useState<string | null>(null);
  const [placementHover, setPlacementHover] = useState<EditorMapPoint | null>(null);
  const [dragPlacement, setDragPlacement] = useState<{ id: string; offset: { x: number; y: number } } | null>(null);
  const [placementError, setPlacementError] = useState<string | null>(null);
  const [terrainPaletteLayout, setTerrainPaletteLayout] = useState<FloatingPluginHudLayout>({ visible: true, pinned: false, position: { x: 24, y: 64 } });
  const dirty = !definitionsMatch(draft, baseline);
  const refreshScenarioList = useCallback(async () => {
    const scenarios = await fetchScenarioList();
    setAvailableScenarios(scenarios);
    setScenarioToLoad((current) => scenarios.some((scenario) => scenario.id === current) ? current : scenarios[0]?.id ?? "");
  }, []);
  useEffect(() => {
    let cancelled = false;
    void fetchScenarioList().then((scenarios) => {
      if (cancelled) return;
      setAvailableScenarios(scenarios);
      setScenarioToLoad((current) => scenarios.some((scenario) => scenario.id === current) ? current : scenarios[0]?.id ?? "");
    }).catch((error) => {
      if (!cancelled) setFileMessage({ kind: "error", text: error instanceof Error ? error.message : "Could not list scenario files." });
    });
    return () => { cancelled = true; };
  }, []);
  const resolutionError = useMemo(() => {
    try {
      resolveTacticalScenarioTerrain(draft);
      return null;
    } catch (error) {
      return error instanceof Error ? error.message : "The draft could not be resolved.";
    }
  }, [draft]);
  const updateText = (field: "title" | "briefing" | "objective", value: string) => setDraft((current) => ({ ...current, [field]: value }));
  const updateDimension = (field: "width" | "height", value: string) => {
    const parsed = Number.parseInt(value, 10);
    setDraft((current) => ({ ...current, map: { ...current.map, [field]: Number.isFinite(parsed) ? parsed : 0 } }));
  };
  const updatePlacements = (placements: TacticalTerrainPlacement[]) => {
    const candidate = { ...draft, terrainPlacements: placements };
    try {
      resolveTacticalScenarioTerrain(candidate);
      setDraft(candidate);
      setPlacementError(null);
      return true;
    } catch (error) {
      setPlacementError(error instanceof Error ? error.message : "That terrain placement is not valid.");
      return false;
    }
  };
  const moveTerrain = (id: string, origin: { x: number; y: number }) => {
    const placement = draft.terrainPlacements.find((item) => item.id === id);
    if (!placement || (placement.origin.x === origin.x && placement.origin.y === origin.y)) return;
    updatePlacements(draft.terrainPlacements.map((item) => item.id === id ? { ...item, origin } : item));
  };
  const placeTerrain = (origin: EditorMapPoint) => {
    if (!placementKind) return;
    if (placementKind === FIRE_TOOL_ID) {
      const inBounds = origin.x >= 0 && origin.y >= 0 && origin.x < draft.map.width && origin.y < draft.map.height;
      if (!inBounds) {
        setPlacementError("Fire must be placed inside the map.");
        return;
      }
      if (draft.fireCells.some((cell) => cellKey(cell) === cellKey(origin))) {
        setPlacementError(`A fire already exists at ${cellKey(origin)}.`);
        return;
      }
      setDraft({ ...draft, fireCells: [...draft.fireCells, { ...origin }] });
      setPlacementError(null);
      return;
    }
    let suffix = 1;
    let id = `${placementKind}-${suffix}`;
    while (draft.terrainPlacements.some((placement) => placement.id === id)) {
      suffix += 1;
      id = `${placementKind}-${suffix}`;
    }
    let lastError = "That terrain placement is not valid.";
    for (const placementCandidate of placementCandidates(placementKind, origin)) {
      const placement: TacticalTerrainPlacement = { id, terrainDefinitionId: placementKind, origin: placementCandidate.origin, rotation: placementCandidate.rotation };
      const candidate = { ...draft, terrainPlacements: [...draft.terrainPlacements, placement] };
      try {
        resolveTacticalScenarioTerrain(candidate);
        setDraft(candidate);
        setPlacementError(null);
        setSelectedPlacementId(id);
        return;
      } catch (error) {
        lastError = error instanceof Error ? error.message : lastError;
      }
    }
    setPlacementError(lastError);
  };
  const selectedPlacement = draft.terrainPlacements.find((placement) => placement.id === selectedPlacementId) ?? null;
  const selectedHasTerminal = selectedPlacement?.terrainDefinitionId === "control-room" || selectedPlacement?.terrainDefinitionId === "console-1x1";
  const selectedIsLiquidHydrogen = selectedPlacement?.terrainDefinitionId.startsWith("liquid-hydrogen-") ?? false;
  const updateSelectedTerminal = (settings: { label?: string; terminalKind?: TacticalTerminalKind; operational?: boolean; completesScenario?: boolean }) => {
    if (!selectedPlacement || !selectedHasTerminal) return;
    updatePlacements(draft.terrainPlacements.map((placement) => placement.id === selectedPlacement.id ? {
      ...placement,
      objectSettings: {
        ...placement.objectSettings,
        terminal: { ...placement.objectSettings?.terminal, ...settings },
      },
    } : placement));
  };
  const rotateSelectedPlacement = () => {
    if (!selectedPlacement) return;
    const rotation = ((selectedPlacement.rotation + 90) % 360) as TacticalTerrainPlacement["rotation"];
    updatePlacements(draft.terrainPlacements.map((placement) => placement.id === selectedPlacement.id ? { ...placement, rotation } : placement));
  };
  const updateSelectedLiquidHydrogen = (filled: boolean) => {
    if (!selectedPlacement || !selectedIsLiquidHydrogen) return;
    updatePlacements(draft.terrainPlacements.map((placement) => placement.id === selectedPlacement.id ? { ...placement, terrainSettings: { ...placement.terrainSettings, filled } } : placement));
  };
  const deleteSelectedPlacement = () => {
    if (!selectedPlacement) return;
    if (updatePlacements(draft.terrainPlacements.filter((placement) => placement.id !== selectedPlacement.id))) setSelectedPlacementId(null);
  };
  const deleteSelectedFire = () => {
    if (!selectedFire) return;
    setDraft((current) => ({ ...current, fireCells: current.fireCells.filter((cell) => cellKey(cell) !== cellKey(selectedFire)) }));
    setSelectedFire(null);
    setPlacementError(null);
  };
  useEffect(() => {
    const deleteSelection = (event: KeyboardEvent) => {
      if (event.key !== "Delete") return;
      const target = event.target;
      if (target instanceof HTMLElement && (target.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName))) return;
      if (selectedPlacement) {
        const candidate = { ...draft, terrainPlacements: draft.terrainPlacements.filter((placement) => placement.id !== selectedPlacement.id) };
        try {
          resolveTacticalScenarioTerrain(candidate);
          setDraft(candidate);
          setSelectedPlacementId(null);
          setPlacementError(null);
        } catch (error) {
          setPlacementError(error instanceof Error ? error.message : "That terrain placement cannot be deleted.");
        }
      } else if (selectedFire) {
        setDraft((current) => ({ ...current, fireCells: current.fireCells.filter((cell) => cellKey(cell) !== cellKey(selectedFire)) }));
        setSelectedFire(null);
        setPlacementError(null);
      } else return;
      event.preventDefault();
    };
    window.addEventListener("keydown", deleteSelection);
    return () => window.removeEventListener("keydown", deleteSelection);
  }, [draft, selectedFire, selectedPlacement]);
  const beginPlaytest = () => {
    if (resolutionError || draft.map.width < 1 || draft.map.height < 1) return;
    setPlaytest({ definition: cloneTacticalScenarioDefinition(draft), sandbox: createAppStore(store.getState()) });
  };
  const clearEditorSelection = () => {
    setSelectedPlacementId(null);
    setSelectedFire(null);
    setPlacementKind(null);
    setPlacementHover(null);
    setDragPlacement(null);
    setPlacementError(null);
  };
  const loadScenario = async () => {
    if (!scenarioToLoad || fileBusy) return;
    if (dirty && !window.confirm("Load another scenario and discard the unsaved changes in this draft?")) return;
    setFileBusy(true);
    setFileMessage(null);
    try {
      const response = await fetch(`/api/tactical/scenarios/${encodeURIComponent(scenarioToLoad)}`, { cache: "no-store" });
      const body = await response.json() as { definition?: TacticalScenarioDefinitionFile; error?: string };
      if (!response.ok || !body.definition) throw new Error(body.error ?? "Could not load the scenario.");
      const loaded = cloneTacticalScenarioDefinition(body.definition);
      resolveTacticalScenarioTerrain(loaded);
      const summary = availableScenarios.find((scenario) => scenario.id === loaded.id) ?? { id: loaded.id, title: loaded.title, isDefault: loaded.id === defaultTacticalScenarioDefinition.id };
      setDraft(loaded);
      setBaseline(cloneTacticalScenarioDefinition(loaded));
      setCurrentScenario(summary);
      clearEditorSelection();
      setFileMessage({ kind: "success", text: `Loaded ${loaded.title}.` });
    } catch (error) {
      setFileMessage({ kind: "error", text: error instanceof Error ? error.message : "Could not load the scenario." });
    } finally {
      setFileBusy(false);
    }
  };
  const saveScenarioAs = async () => {
    if (!saveAsName.trim() || fileBusy || resolutionError) return;
    setFileBusy(true);
    setFileMessage(null);
    try {
      const response = await fetch("/api/tactical/scenarios", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: saveAsName, definition: draft }),
      });
      const body = await response.json() as { scenario?: ScenarioSummary; definition?: TacticalScenarioDefinitionFile; error?: string };
      if (!response.ok || !body.scenario || !body.definition) throw new Error(body.error ?? "Could not save the scenario.");
      const saved = cloneTacticalScenarioDefinition(body.definition);
      setDraft(saved);
      setBaseline(cloneTacticalScenarioDefinition(saved));
      setCurrentScenario(body.scenario);
      setScenarioToLoad(body.scenario.id);
      setSaveAsName("");
      await refreshScenarioList();
      setFileMessage({ kind: "success", text: `Saved ${body.scenario.id}.json.` });
    } catch (error) {
      setFileMessage({ kind: "error", text: error instanceof Error ? error.message : "Could not save the scenario." });
    } finally {
      setFileBusy(false);
    }
  };

  if (playtest) return <Provider store={playtest.sandbox}>
    <TacticalMapPageClient draftPlaytest={{ definition: playtest.definition, onExit: () => setPlaytest(null) }} />
  </Provider>;

  return <main className="flex h-screen w-screen flex-col overflow-hidden bg-[#050a12] font-mono text-slate-100">
    <header className="flex h-16 shrink-0 items-center justify-between border-b border-cyan-800 bg-slate-950 px-5">
      <div>
        <div className="text-sm font-bold uppercase tracking-[0.22em] text-cyan-100">Scenario Editor</div>
        <div className="mt-1 text-[10px] uppercase tracking-wider text-slate-500">{currentScenario.title} · {currentScenario.isDefault ? "immutable source" : "saved scenario"} · editable draft</div>
      </div>
      <div className="flex items-center gap-2">
        <span className={`border px-2 py-1 text-[9px] font-bold uppercase tracking-wider ${dirty ? "border-amber-400 text-amber-200" : "border-slate-600 text-slate-400"}`}>{dirty ? "Unsaved draft" : "Unchanged"}</span>
        <Link href="/system/tactical" className="border border-cyan-500 px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-cyan-100 hover:bg-cyan-950">Return to tactical map</Link>
      </div>
    </header>
    <div className="grid min-h-0 flex-1 grid-cols-[21rem_1fr]">
      <aside className="overflow-y-auto border-r border-cyan-900 bg-[#071019] p-4">
        <div className="mb-4 border border-slate-700 bg-slate-950/70 p-3 text-[10px] text-slate-400">
          Changes exist only in this draft. Playtesting uses a separate temporary game store and cannot overwrite the active tactical session.
        </div>
        <div className="mb-4 border border-cyan-800 bg-slate-950/70 p-3">
          <div className="mb-2 text-[9px] font-bold uppercase tracking-wider text-cyan-200">Scenario files</div>
          <label className="mb-2 block text-[9px] font-bold uppercase tracking-wider text-slate-400">Load scenario
            <select aria-label="Load scenario" value={scenarioToLoad} onChange={(event) => setScenarioToLoad(event.target.value)} disabled={fileBusy || availableScenarios.length === 0} className="mt-1 h-9 w-full border border-slate-600 bg-slate-950 px-2 text-xs normal-case tracking-normal text-slate-100 outline-none focus:border-cyan-400 disabled:opacity-40">
              {availableScenarios.map((scenario) => <option key={scenario.id} value={scenario.id}>{scenario.title}{scenario.isDefault ? " (default)" : ""}</option>)}
            </select>
          </label>
          <button type="button" onClick={() => void loadScenario()} disabled={fileBusy || !scenarioToLoad} className="mb-3 h-8 w-full border border-cyan-500 text-[9px] font-bold uppercase tracking-wider text-cyan-100 disabled:opacity-40">Load scenario</button>
          <label className="mb-2 block text-[9px] font-bold uppercase tracking-wider text-slate-400">New scenario name
            <input aria-label="New scenario name" value={saveAsName} onChange={(event) => setSaveAsName(event.target.value)} placeholder="Boarding action" className="mt-1 h-9 w-full border border-slate-600 bg-slate-950 px-2 text-xs normal-case tracking-normal text-slate-100 outline-none placeholder:text-slate-700 focus:border-cyan-400" />
          </label>
          <button type="button" onClick={() => void saveScenarioAs()} disabled={fileBusy || !saveAsName.trim() || Boolean(resolutionError)} className="h-8 w-full border border-emerald-500 text-[9px] font-bold uppercase tracking-wider text-emerald-100 disabled:opacity-40">Save as new scenario</button>
          <div className="mt-2 text-[9px] text-slate-500">Save As creates a new JSON file and never overwrites an existing scenario.</div>
          {fileMessage && <div role="status" className={`mt-2 border p-2 text-[10px] ${fileMessage.kind === "error" ? "border-red-500/70 bg-red-950/60 text-red-100" : "border-emerald-500/70 bg-emerald-950/50 text-emerald-100"}`}>{fileMessage.text}</div>}
        </div>
        <label className="mb-3 block text-[9px] font-bold uppercase tracking-wider text-cyan-200">Title
          <input value={draft.title} onChange={(event) => updateText("title", event.target.value)} className="mt-1 h-9 w-full border border-slate-600 bg-slate-950 px-2 text-xs normal-case tracking-normal text-slate-100 outline-none focus:border-cyan-400" />
        </label>
        <label className="mb-3 block text-[9px] font-bold uppercase tracking-wider text-cyan-200">Briefing
          <textarea value={draft.briefing} onChange={(event) => updateText("briefing", event.target.value)} rows={4} className="mt-1 w-full resize-none border border-slate-600 bg-slate-950 p-2 text-xs normal-case tracking-normal text-slate-100 outline-none focus:border-cyan-400" />
        </label>
        <label className="mb-3 block text-[9px] font-bold uppercase tracking-wider text-cyan-200">Objective
          <textarea value={draft.objective} onChange={(event) => updateText("objective", event.target.value)} rows={3} className="mt-1 w-full resize-none border border-slate-600 bg-slate-950 p-2 text-xs normal-case tracking-normal text-slate-100 outline-none focus:border-cyan-400" />
        </label>
        <div className="mb-4 grid grid-cols-2 gap-2">
          <label className="text-[9px] font-bold uppercase tracking-wider text-cyan-200">Map width
            <input type="number" min="1" value={draft.map.width} onChange={(event) => updateDimension("width", event.target.value)} className="mt-1 h-9 w-full border border-slate-600 bg-slate-950 px-2 text-xs text-slate-100 outline-none focus:border-cyan-400" />
          </label>
          <label className="text-[9px] font-bold uppercase tracking-wider text-cyan-200">Map height
            <input type="number" min="1" value={draft.map.height} onChange={(event) => updateDimension("height", event.target.value)} className="mt-1 h-9 w-full border border-slate-600 bg-slate-950 px-2 text-xs text-slate-100 outline-none focus:border-cyan-400" />
          </label>
        </div>
        <div className="mb-4 border-t border-slate-700 pt-3">
          <div className="mb-2 text-[9px] font-bold uppercase tracking-wider text-cyan-200">Terrain placements</div>
          {draft.terrainPlacements.map((placement) => <button type="button" key={placement.id} onClick={() => { setSelectedPlacementId(placement.id); setSelectedFire(null); setPlacementKind(null); setPlacementError(null); }} className={`mb-2 block w-full border p-2 text-left text-[10px] ${placement.id === selectedPlacementId ? "border-cyan-300 bg-cyan-950/60 text-cyan-100" : "border-slate-700 bg-slate-950/70 text-slate-300"}`}>
            <div className="font-bold text-slate-100">{placement.id}</div>
            <div>{placement.terrainDefinitionId} · {placement.origin.x},{placement.origin.y} · {placement.rotation}°</div>
          </button>)}
        </div>
        {selectedPlacement && <div className="mb-4 border border-cyan-700 bg-slate-950/70 p-3">
          <div className="mb-2 text-[9px] font-bold uppercase tracking-wider text-cyan-200">Selected placement</div>
          <div className="mb-2 text-[10px] text-slate-300">{selectedPlacement.id}</div>
          <div className="mb-2 grid grid-cols-2 gap-2">
            {(["x", "y"] as const).map((axis) => <label key={axis} className="text-[9px] font-bold uppercase tracking-wider text-cyan-200">{axis}
              <input type="number" value={selectedPlacement.origin[axis]} onChange={(event) => moveTerrain(selectedPlacement.id, { ...selectedPlacement.origin, [axis]: Number.parseInt(event.target.value, 10) || 0 })} className="mt-1 h-8 w-full border border-slate-600 bg-slate-950 px-2 text-xs text-slate-100 outline-none focus:border-cyan-400" />
            </label>)}
          </div>
          {selectedHasTerminal && <div className="mb-3 border-t border-slate-700 pt-3">
            <label className="mb-2 block text-[9px] font-bold uppercase tracking-wider text-cyan-200">Console label
              <input value={selectedPlacement.objectSettings?.terminal?.label ?? (selectedPlacement.terrainDefinitionId === "console-1x1" ? "Console" : "Control Room Console")} onChange={(event) => updateSelectedTerminal({ label: event.target.value })} className="mt-1 h-8 w-full border border-slate-600 bg-slate-950 px-2 text-xs normal-case tracking-normal text-slate-100 outline-none focus:border-cyan-400" />
            </label>
            <label className="mb-2 block text-[9px] font-bold uppercase tracking-wider text-cyan-200">Console type
              <select value={selectedPlacement.objectSettings?.terminal?.terminalKind ?? "generic"} onChange={(event) => updateSelectedTerminal({ terminalKind: event.target.value as TacticalTerminalKind })} className="mt-1 h-8 w-full border border-slate-600 bg-slate-950 px-2 text-xs normal-case tracking-normal text-slate-100 outline-none focus:border-cyan-400">
                {(["generic", "navigation", "engineering", "security", "communications"] as const).map((kind) => <option key={kind} value={kind}>{kind}</option>)}
              </select>
            </label>
            <label className="mb-2 flex items-center gap-2 text-[9px] font-bold uppercase tracking-wider text-cyan-200">
              <input type="checkbox" checked={selectedPlacement.objectSettings?.terminal?.operational ?? true} onChange={(event) => updateSelectedTerminal({ operational: event.target.checked })} /> Operational
            </label>
            <label className="flex items-center gap-2 text-[9px] font-bold uppercase tracking-wider text-cyan-200">
              <input type="checkbox" checked={selectedPlacement.objectSettings?.terminal?.completesScenario ?? selectedPlacement.terrainDefinitionId === "control-room"} onChange={(event) => updateSelectedTerminal({ completesScenario: event.target.checked })} /> Completes scenario
            </label>
          </div>}
          {selectedIsLiquidHydrogen && <div className="mb-3 border-t border-slate-700 pt-3">
            <label className="flex items-center gap-2 text-[9px] font-bold uppercase tracking-wider text-cyan-200">
              <input type="checkbox" checked={selectedPlacement.terrainSettings?.filled ?? true} onChange={(event) => updateSelectedLiquidHydrogen(event.target.checked)} /> Filled with liquid hydrogen
            </label>
          </div>}
          <div className="grid grid-cols-2 gap-2">
            <button type="button" onClick={rotateSelectedPlacement} className="h-8 border border-amber-400 text-[9px] font-bold uppercase text-amber-100">Rotate 90°</button>
            <button type="button" onClick={deleteSelectedPlacement} className="h-8 border border-red-400 text-[9px] font-bold uppercase text-red-100">Delete</button>
          </div>
        </div>}
        {selectedFire && <div className="mb-4 border border-orange-500 bg-slate-950/70 p-3">
          <div className="mb-2 text-[9px] font-bold uppercase tracking-wider text-orange-200">Selected fire</div>
          <div className="mb-3 text-[10px] text-slate-300">Square {selectedFire.x},{selectedFire.y}</div>
          <button type="button" onClick={deleteSelectedFire} className="h-8 w-full border border-red-400 text-[9px] font-bold uppercase text-red-100">Delete fire</button>
        </div>}
        {placementError && <div className="mb-3 border border-amber-500/70 bg-amber-950/60 p-2 text-[10px] text-amber-100">{placementError}</div>}
        {resolutionError && <div className="mb-3 border border-red-500/70 bg-red-950/60 p-2 text-[10px] text-red-100">{resolutionError}</div>}
        <div className="grid grid-cols-2 gap-2">
          <button type="button" disabled={!dirty} onClick={() => { setDraft(cloneTacticalScenarioDefinition(baseline)); clearEditorSelection(); }} className="h-9 border border-slate-500 text-[9px] font-bold uppercase tracking-wider text-slate-200 disabled:cursor-not-allowed disabled:opacity-40">Discard draft</button>
          <button type="button" disabled={Boolean(resolutionError) || draft.map.width < 1 || draft.map.height < 1} onClick={beginPlaytest} className="h-9 border border-emerald-400 text-[9px] font-bold uppercase tracking-wider text-emerald-100 disabled:cursor-not-allowed disabled:opacity-40">Playtest draft</button>
        </div>
      </aside>
      <section className="relative min-h-0 overflow-hidden">
        <PluginHudLayer hiddenHuds={terrainPaletteLayout.visible ? [] : [{ id: "terrain-palette", title: "Terrain Palette" }]} onRestoreHud={() => setTerrainPaletteLayout((current) => ({ ...current, visible: true }))} className="p-5">
          <div className="absolute left-7 top-7 z-10 border border-cyan-700 bg-slate-950/90 px-3 py-2 text-[9px] uppercase tracking-wider text-cyan-100">Draft preview · {draft.map.width}×{draft.map.height}</div>
          <div className="h-full w-full overflow-hidden border border-cyan-900 bg-black shadow-[0_0_30px_rgba(8,145,178,0.12)]">
            <DraftPreview definition={draft} selectedPlacementId={selectedPlacementId} selectedFire={selectedFire} placementKind={placementKind} placementHover={placementHover} dragPlacement={dragPlacement} selectPlacement={setSelectedPlacementId} selectFire={setSelectedFire} hoverPlacement={setPlacementHover} beginDrag={setDragPlacement} endDrag={() => setDragPlacement(null)} placeTerrain={placeTerrain} moveTerrain={moveTerrain} />
          </div>
          <FloatingPluginHud title="Terrain Palette" layout={terrainPaletteLayout} onLayoutChange={setTerrainPaletteLayout} className="w-56 font-mono text-[8px] uppercase tracking-wider text-(--hud-text)">
            <div aria-label="Terrain options" className="grid max-h-[65vh] grid-cols-2 gap-1.5 overflow-y-auto overscroll-contain py-1 pr-1">
              <button type="button" aria-pressed={placementKind === null} onClick={() => { setPlacementKind(null); setPlacementHover(null); setPlacementError(null); }} className={`min-h-10 border px-2 py-2 text-[8px] font-bold uppercase tracking-wider ${placementKind === null ? "border-cyan-200 bg-cyan-300/20 text-cyan-50" : "border-(--hud-border) text-(--hud-text) hover:border-(--hud-accent)"}`}>Pointer</button>
              <button type="button" aria-pressed={placementKind === FIRE_TOOL_ID} onClick={() => { setPlacementKind(FIRE_TOOL_ID); setSelectedPlacementId(null); setSelectedFire(null); setPlacementHover(null); setPlacementError(null); }} className={`min-h-10 border px-2 py-2 text-[8px] font-bold uppercase tracking-wider ${placementKind === FIRE_TOOL_ID ? "border-orange-200 bg-orange-300/20 text-orange-50" : "border-(--hud-border) text-orange-200 hover:border-orange-300"}`}>Fire</button>
              {tacticalTerrainPalette.map((item) => <button type="button" aria-pressed={placementKind === item.id} key={item.id} onClick={() => { setPlacementKind(item.id); setSelectedPlacementId(null); setSelectedFire(null); setPlacementHover(null); setPlacementError(null); }} className={`min-h-10 border px-2 py-2 text-[8px] font-bold uppercase tracking-wider ${placementKind === item.id ? "border-amber-200 bg-amber-300/20 text-amber-50" : "border-(--hud-border) text-(--hud-text) hover:border-(--hud-accent)"}`}>{item.label}</button>)}
            </div>
          </FloatingPluginHud>
        </PluginHudLayer>
      </section>
    </div>
  </main>;
};

export default TacticalScenarioEditorClient;
