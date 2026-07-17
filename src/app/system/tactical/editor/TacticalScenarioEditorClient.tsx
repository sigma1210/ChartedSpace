"use client";

import Link from "next/link";
import { useMemo, useState, type PointerEvent as ReactPointerEvent } from "react";
import { Provider } from "react-redux";
import { FloatingPluginHud, type FloatingPluginHudLayout } from "@/components/hud/FloatingPluginHud";
import { PluginHudLayer } from "@/components/hud/PluginHudLayer";
import TacticalMapPageClient from "../TacticalMapPageClient";
import { cloneTacticalScenarioDefinition, defaultTacticalScenarioDefinition, resolveTacticalScenarioTerrain, tacticalTerrainPalette, type TacticalScenarioDefinitionFile, type TacticalTerrainPlacement } from "@/plugins/characterCombat/tacticalScenarioDefinitions";
import type { TacticalTerminalKind } from "@/plugins/characterCombat/tacticalTerrain";
import { createAppStore, store, type AppStore } from "@/store";

const freshDefaultDraft = () => cloneTacticalScenarioDefinition(defaultTacticalScenarioDefinition);
const definitionsMatch = (first: TacticalScenarioDefinitionFile, second: TacticalScenarioDefinitionFile) => JSON.stringify(first) === JSON.stringify(second);

const DraftPreview = ({ definition, selectedPlacementId, placementKind, placementHover, dragPlacement, selectPlacement, hoverPlacement, beginDrag, endDrag, placeTerrain, moveTerrain }: {
  definition: TacticalScenarioDefinitionFile;
  selectedPlacementId: string | null;
  placementKind: string | null;
  placementHover: { x: number; y: number } | null;
  dragPlacement: { id: string; offset: { x: number; y: number } } | null;
  selectPlacement: (id: string | null) => void;
  hoverPlacement: (point: { x: number; y: number } | null) => void;
  beginDrag: (drag: { id: string; offset: { x: number; y: number } }) => void;
  endDrag: () => void;
  placeTerrain: (point: { x: number; y: number }) => void;
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
    return { x: Math.floor(local.x), y: Math.floor(local.y) };
  };
  const placementSize = (placement: TacticalTerrainPlacement) => {
    const definition = tacticalTerrainPalette.find((item) => item.id === placement.terrainDefinitionId);
    if (!definition) return { width: 1, height: 1 };
    return placement.rotation === 90 || placement.rotation === 270
      ? { width: definition.size.height, height: definition.size.width }
      : definition.size;
  };
  const placementPreview = useMemo(() => {
    if (!placementKind || !placementHover) return null;
    const paletteItem = tacticalTerrainPalette.find((item) => item.id === placementKind);
    if (!paletteItem) return null;
    const previewPlacement: TacticalTerrainPlacement = { id: "terrain-placement-preview", terrainDefinitionId: placementKind, origin: placementHover, rotation: 0 };
    try {
      resolveTacticalScenarioTerrain({ ...definition, terrainPlacements: [...definition.terrainPlacements, previewPlacement] });
      return { origin: placementHover, cells: paletteItem.previewCells, valid: true };
    } catch {
      return { origin: placementHover, cells: paletteItem.previewCells, valid: false };
    }
  }, [definition, placementHover, placementKind]);

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
      else selectPlacement(null);
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
    {terrain.elevationAccessCells.map((cell) => <rect key={`stairs:${cell.x}:${cell.y}`} x={cell.x + 0.08} y={cell.y + 0.08} width="0.84" height="0.84" fill="#cbd5e1" stroke="#0891b2" strokeWidth="0.12" />)}
    {terrain.walls.map((wall) => <line key={wall.id} x1={wall.from.x} y1={wall.from.y} x2={wall.to.x} y2={wall.to.y} stroke="#94a3b8" strokeWidth="0.22" />)}
    {terrain.doors.map((door) => <line key={door.id} x1={door.from.x} y1={door.from.y} x2={door.to.x} y2={door.to.y} stroke="#fbbf24" strokeWidth="0.32" />)}
    {terrain.objects.map((object) => <g key={object.id}>
      <rect x={object.position.x + 0.15} y={object.position.y + 0.15} width="0.7" height="0.7" fill="#22d3ee" />
      <title>{object.label}</title>
    </g>)}
    {definition.fireCells.map((cell) => <circle key={`fire:${cell.x}:${cell.y}`} cx={cell.x + 0.5} cy={cell.y + 0.5} r="0.32" fill="#f97316" />)}
    {placementPreview?.cells.map((cell) => <rect key={`placement-preview:${cell.x}:${cell.y}`} x={placementPreview.origin.x + cell.x} y={placementPreview.origin.y + cell.y} width="1" height="1"
      fill={placementPreview.valid ? "#94a3b8" : "#ef4444"} fillOpacity="0.28" stroke={placementPreview.valid ? "#e2e8f0" : "#fecaca"} strokeWidth="0.12" pointerEvents="none" />)}
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
          selectPlacement(placement.id);
          event.currentTarget.setPointerCapture(event.pointerId);
          beginDrag({ id: placement.id, offset: { x: point.x - placement.origin.x, y: point.y - placement.origin.y } });
        }} />;
    })}
  </svg>;
};

const TacticalScenarioEditorClient = () => {
  const [draft, setDraft] = useState<TacticalScenarioDefinitionFile>(freshDefaultDraft);
  const [playtest, setPlaytest] = useState<{ definition: TacticalScenarioDefinitionFile; sandbox: AppStore } | null>(null);
  const [selectedPlacementId, setSelectedPlacementId] = useState<string | null>(null);
  const [placementKind, setPlacementKind] = useState<string | null>(null);
  const [placementHover, setPlacementHover] = useState<{ x: number; y: number } | null>(null);
  const [dragPlacement, setDragPlacement] = useState<{ id: string; offset: { x: number; y: number } } | null>(null);
  const [placementError, setPlacementError] = useState<string | null>(null);
  const [terrainPaletteLayout, setTerrainPaletteLayout] = useState<FloatingPluginHudLayout>({ visible: true, pinned: false, position: { x: 24, y: 64 } });
  const dirty = !definitionsMatch(draft, defaultTacticalScenarioDefinition);
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
  const placeTerrain = (origin: { x: number; y: number }) => {
    if (!placementKind) return;
    let suffix = 1;
    let id = `${placementKind}-${suffix}`;
    while (draft.terrainPlacements.some((placement) => placement.id === id)) {
      suffix += 1;
      id = `${placementKind}-${suffix}`;
    }
    const placement: TacticalTerrainPlacement = { id, terrainDefinitionId: placementKind, origin, rotation: 0 };
    if (updatePlacements([...draft.terrainPlacements, placement])) {
      setSelectedPlacementId(id);
    }
  };
  const selectedPlacement = draft.terrainPlacements.find((placement) => placement.id === selectedPlacementId) ?? null;
  const selectedHasTerminal = selectedPlacement?.terrainDefinitionId === "control-room" || selectedPlacement?.terrainDefinitionId === "console-1x1";
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
  const deleteSelectedPlacement = () => {
    if (!selectedPlacement) return;
    if (updatePlacements(draft.terrainPlacements.filter((placement) => placement.id !== selectedPlacement.id))) setSelectedPlacementId(null);
  };
  const beginPlaytest = () => {
    if (resolutionError || draft.map.width < 1 || draft.map.height < 1) return;
    setPlaytest({ definition: cloneTacticalScenarioDefinition(draft), sandbox: createAppStore(store.getState()) });
  };

  if (playtest) return <Provider store={playtest.sandbox}>
    <TacticalMapPageClient draftPlaytest={{ definition: playtest.definition, onExit: () => setPlaytest(null) }} />
  </Provider>;

  return <main className="flex h-screen w-screen flex-col overflow-hidden bg-[#050a12] font-mono text-slate-100">
    <header className="flex h-16 shrink-0 items-center justify-between border-b border-cyan-800 bg-slate-950 px-5">
      <div>
        <div className="text-sm font-bold uppercase tracking-[0.22em] text-cyan-100">Scenario Editor</div>
        <div className="mt-1 text-[10px] uppercase tracking-wider text-slate-500">Default base scenario · immutable source · editable draft</div>
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
          {draft.terrainPlacements.map((placement) => <button type="button" key={placement.id} onClick={() => { setSelectedPlacementId(placement.id); setPlacementKind(null); setPlacementError(null); }} className={`mb-2 block w-full border p-2 text-left text-[10px] ${placement.id === selectedPlacementId ? "border-cyan-300 bg-cyan-950/60 text-cyan-100" : "border-slate-700 bg-slate-950/70 text-slate-300"}`}>
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
          <div className="grid grid-cols-2 gap-2">
            <button type="button" onClick={rotateSelectedPlacement} className="h-8 border border-amber-400 text-[9px] font-bold uppercase text-amber-100">Rotate 90°</button>
            <button type="button" onClick={deleteSelectedPlacement} className="h-8 border border-red-400 text-[9px] font-bold uppercase text-red-100">Delete</button>
          </div>
        </div>}
        {placementError && <div className="mb-3 border border-amber-500/70 bg-amber-950/60 p-2 text-[10px] text-amber-100">{placementError}</div>}
        {resolutionError && <div className="mb-3 border border-red-500/70 bg-red-950/60 p-2 text-[10px] text-red-100">{resolutionError}</div>}
        <div className="grid grid-cols-2 gap-2">
          <button type="button" disabled={!dirty} onClick={() => { setDraft(freshDefaultDraft()); setSelectedPlacementId(null); setPlacementKind(null); setPlacementHover(null); setPlacementError(null); }} className="h-9 border border-slate-500 text-[9px] font-bold uppercase tracking-wider text-slate-200 disabled:cursor-not-allowed disabled:opacity-40">Discard draft</button>
          <button type="button" disabled={Boolean(resolutionError) || draft.map.width < 1 || draft.map.height < 1} onClick={beginPlaytest} className="h-9 border border-emerald-400 text-[9px] font-bold uppercase tracking-wider text-emerald-100 disabled:cursor-not-allowed disabled:opacity-40">Playtest draft</button>
        </div>
      </aside>
      <section className="relative min-h-0 overflow-hidden">
        <PluginHudLayer hiddenHuds={terrainPaletteLayout.visible ? [] : [{ id: "terrain-palette", title: "Terrain Palette" }]} onRestoreHud={() => setTerrainPaletteLayout((current) => ({ ...current, visible: true }))} className="p-5">
          <div className="absolute left-7 top-7 z-10 border border-cyan-700 bg-slate-950/90 px-3 py-2 text-[9px] uppercase tracking-wider text-cyan-100">Draft preview · {draft.map.width}×{draft.map.height}</div>
          <div className="h-full w-full overflow-hidden border border-cyan-900 bg-black shadow-[0_0_30px_rgba(8,145,178,0.12)]">
            <DraftPreview definition={draft} selectedPlacementId={selectedPlacementId} placementKind={placementKind} placementHover={placementHover} dragPlacement={dragPlacement} selectPlacement={setSelectedPlacementId} hoverPlacement={setPlacementHover} beginDrag={setDragPlacement} endDrag={() => setDragPlacement(null)} placeTerrain={placeTerrain} moveTerrain={moveTerrain} />
          </div>
          <FloatingPluginHud title="Terrain Palette" layout={terrainPaletteLayout} onLayoutChange={setTerrainPaletteLayout} className="w-56 font-mono text-[8px] uppercase tracking-wider text-(--hud-text)">
            <div className="grid grid-cols-2 gap-1.5 py-1">
              <button type="button" aria-pressed={placementKind === null} onClick={() => { setPlacementKind(null); setPlacementHover(null); setPlacementError(null); }} className={`min-h-10 border px-2 py-2 text-[8px] font-bold uppercase tracking-wider ${placementKind === null ? "border-cyan-200 bg-cyan-300/20 text-cyan-50" : "border-(--hud-border) text-(--hud-text) hover:border-(--hud-accent)"}`}>Pointer</button>
              {tacticalTerrainPalette.map((item) => <button type="button" aria-pressed={placementKind === item.id} key={item.id} onClick={() => { setPlacementKind(item.id); setSelectedPlacementId(null); setPlacementHover(null); setPlacementError(null); }} className={`min-h-10 border px-2 py-2 text-[8px] font-bold uppercase tracking-wider ${placementKind === item.id ? "border-amber-200 bg-amber-300/20 text-amber-50" : "border-(--hud-border) text-(--hud-text) hover:border-(--hud-accent)"}`}>{item.label}</button>)}
            </div>
          </FloatingPluginHud>
        </PluginHudLayer>
      </section>
    </div>
  </main>;
};

export default TacticalScenarioEditorClient;
