import { Hand, Image as ImageIcon, Layers3, MousePointer2, RotateCw, Settings2, Spline } from "lucide-react";
import type { ReactNode } from "react";
import { FloatingPluginHud } from "@/components/hud/FloatingPluginHud";
import type { TacticalEditorHudLayout } from "@/plugins/characterCombat/editor/lib/hudLayouts";
import type {
  TacticalEditorPrimaryTool,
  TacticalEditorToolGroup,
} from "@/plugins/characterCombat/editor/redux/tacticalEditorSlice";
import {
  CIRCLE_AREA_TOOL_ID,
  EDITOR_DRAWING_TOOL_GROUPS,
  PEN_AREA_TOOL_ID,
  RECTANGLE_AREA_TOOL_ID,
} from "@/plugins/characterCombat/editor/lib/tacticalEditorSupport";

type TacticalEditorToolsHudProps = {
  layout: TacticalEditorHudLayout;
  onLayoutChange: (layout: TacticalEditorHudLayout) => void;
  primaryTool: TacticalEditorPrimaryTool;
  placementKind: string | null;
  enemyToolActive: boolean;
  openToolGroup: TacticalEditorToolGroup | null;
  selectedPlacementId: string | null;
  tracingTemplateVisible: boolean;
  layersVisible: boolean;
  drawingPrecisionControl: ReactNode;
  mapWidth: number;
  mapHeight: number;
  selectedLiquidHydrogenFilled: boolean | null;
  penDraftSegmentCount: number | null;
  rampDrawing: boolean;
  onActivatePrimaryTool: (tool: TacticalEditorPrimaryTool) => void;
  onToggleToolGroup: (group: TacticalEditorToolGroup) => void;
  onActivateDrawingTool: (toolId: string) => void;
  onRotateSelectedPlacement: () => void;
  onOpenTracingTemplate: () => void;
  onOpenLayers: () => void;
  onUpdateMapDimension: (field: "width" | "height", value: string) => void;
  onUpdateLiquidHydrogenFilled: (filled: boolean) => void;
  onFinishPenArea: () => void;
  onCancelPenArea: () => void;
  onCancelRamp: () => void;
};

const primaryButtonClass = (active: boolean) => `group relative grid h-9 w-9 place-items-center border transition-colors ${active ? "border-cyan-200 bg-cyan-300/20 text-cyan-50" : "border-slate-700 text-slate-400 hover:border-cyan-500 hover:text-cyan-100"}`;

const TacticalEditorToolsHud = ({
  layout,
  onLayoutChange,
  primaryTool,
  placementKind,
  enemyToolActive,
  openToolGroup,
  selectedPlacementId,
  tracingTemplateVisible,
  layersVisible,
  drawingPrecisionControl,
  mapWidth,
  mapHeight,
  selectedLiquidHydrogenFilled,
  penDraftSegmentCount,
  rampDrawing,
  onActivatePrimaryTool,
  onToggleToolGroup,
  onActivateDrawingTool,
  onRotateSelectedPlacement,
  onOpenTracingTemplate,
  onOpenLayers,
  onUpdateMapDimension,
  onUpdateLiquidHydrogenFilled,
  onFinishPenArea,
  onCancelPenArea,
  onCancelRamp,
}: TacticalEditorToolsHudProps) => {
  const primarySelectionActive = primaryTool === "select"
    && placementKind === null
    && !enemyToolActive;
  const expandedToolGroup = EDITOR_DRAWING_TOOL_GROUPS
    .find((group) => group.id === openToolGroup) ?? null;

  return (
    <FloatingPluginHud
      title="Tools"
      layout={layout}
      onLayoutChange={onLayoutChange}
      className="font-mono text-[8px] uppercase tracking-wider text-(--hud-text)"
    >
      <div role="toolbar" aria-label="Primary drawing tools" aria-orientation="horizontal" className="flex items-center gap-1 py-1">
        <button type="button" aria-label="Select tool" aria-pressed={primarySelectionActive} onClick={() => onActivatePrimaryTool("select")} className={primaryButtonClass(primarySelectionActive)}>
          <MousePointer2 size={17} aria-hidden="true" />
          <span className="pointer-events-none absolute left-1/2 top-full z-50 mt-1 hidden -translate-x-1/2 whitespace-nowrap border border-cyan-600 bg-slate-950 px-3 py-2 text-[11px] normal-case tracking-normal text-cyan-50 shadow-xl group-hover:block group-focus-visible:block">Select · V</span>
        </button>
        <button type="button" aria-label="Node edit tool" aria-pressed={primaryTool === "node"} onClick={() => onActivatePrimaryTool("node")} className={primaryButtonClass(primaryTool === "node")}>
          <Spline size={18} aria-hidden="true" />
          <span className="pointer-events-none absolute left-1/2 top-full z-50 mt-1 hidden -translate-x-1/2 whitespace-nowrap border border-cyan-600 bg-slate-950 px-3 py-2 text-[11px] normal-case tracking-normal text-cyan-50 shadow-xl group-hover:block group-focus-visible:block">Node edit · N</span>
        </button>
        <button type="button" aria-label="Hand tool" aria-pressed={primaryTool === "hand"} onClick={() => onActivatePrimaryTool("hand")} className={primaryButtonClass(primaryTool === "hand")}>
          <Hand size={17} aria-hidden="true" />
          <span className="pointer-events-none absolute left-1/2 top-full z-50 mt-1 hidden -translate-x-1/2 whitespace-nowrap border border-cyan-600 bg-slate-950 px-3 py-2 text-[11px] normal-case tracking-normal text-cyan-50 shadow-xl group-hover:block group-focus-visible:block">Hand · H</span>
        </button>
        <button type="button" title="Drawing Settings" aria-label="Open Drawing Settings" aria-expanded={openToolGroup === "drawing-settings"} onClick={() => onToggleToolGroup("drawing-settings")} className={primaryButtonClass(openToolGroup === "drawing-settings")}>
          <Settings2 size={17} aria-hidden="true" />
          <span className="pointer-events-none absolute left-1/2 top-full z-50 mt-1 hidden -translate-x-1/2 whitespace-nowrap border border-cyan-600 bg-slate-950 px-3 py-2 text-[11px] normal-case tracking-normal text-cyan-50 shadow-xl group-hover:block group-focus-visible:block">Drawing Settings</span>
        </button>
        <div className="mx-1 h-7 w-px bg-slate-700" aria-hidden="true" />
        {EDITOR_DRAWING_TOOL_GROUPS.map((group) => {
          const Icon = group.icon;
          const expanded = openToolGroup === group.id;
          const containsActiveTool = group.tools.some((tool) => tool.id === placementKind);
          return <button key={group.id} type="button" title={group.label} aria-label={`Open ${group.label} tools`} aria-expanded={expanded} onClick={() => onToggleToolGroup(group.id)} className={primaryButtonClass(expanded || containsActiveTool)}>
            <Icon size={18} aria-hidden="true" />
            <span className="pointer-events-none absolute left-1/2 top-full z-50 mt-1 hidden -translate-x-1/2 whitespace-nowrap border border-cyan-600 bg-slate-950 px-3 py-2 text-[11px] normal-case tracking-normal text-cyan-50 shadow-xl group-hover:block group-focus-visible:block">{group.label}</span>
          </button>;
        })}
        {selectedPlacementId && <button type="button" title={`Rotate ${selectedPlacementId} 90° · R`} aria-label="Rotate selected placement 90 degrees" onClick={onRotateSelectedPlacement} className="group relative grid h-9 w-9 place-items-center border border-amber-500 text-amber-200 transition-colors hover:border-amber-200 hover:bg-amber-300/20 hover:text-amber-50">
          <RotateCw size={17} aria-hidden="true" />
          <span className="pointer-events-none absolute left-1/2 top-full z-50 mt-1 hidden -translate-x-1/2 whitespace-nowrap border border-amber-500 bg-slate-950 px-3 py-2 text-[11px] normal-case tracking-normal text-amber-50 shadow-xl group-hover:block group-focus-visible:block">Rotate selected · R</span>
        </button>}
        <div className="mx-1 h-7 w-px bg-slate-700" aria-hidden="true" />
        <button type="button" aria-label="Open tracing template" aria-pressed={tracingTemplateVisible} onClick={onOpenTracingTemplate} className={primaryButtonClass(tracingTemplateVisible)}>
          <ImageIcon size={17} aria-hidden="true" />
          <span className="pointer-events-none absolute left-1/2 top-full z-50 mt-1 hidden -translate-x-1/2 whitespace-nowrap border border-cyan-600 bg-slate-950 px-3 py-2 text-[11px] normal-case tracking-normal text-cyan-50 shadow-xl group-hover:block group-focus-visible:block">Tracing Template</span>
        </button>
        <button type="button" aria-label="Open layers" aria-pressed={layersVisible} onClick={onOpenLayers} className={primaryButtonClass(layersVisible)}>
          <Layers3 size={17} aria-hidden="true" />
          <span className="pointer-events-none absolute left-1/2 top-full z-50 mt-1 hidden -translate-x-1/2 whitespace-nowrap border border-cyan-600 bg-slate-950 px-3 py-2 text-[11px] normal-case tracking-normal text-cyan-50 shadow-xl group-hover:block group-focus-visible:block">Layers</span>
        </button>
      </div>
      {openToolGroup === "drawing-settings" && <div role="group" aria-label="Drawing settings" className="grid max-w-[36rem] grid-cols-[minmax(10rem,1fr)_6rem_6rem] gap-2 border-t border-slate-700 py-2">
        {drawingPrecisionControl}
        <label className="block font-bold text-cyan-200">Map width
          <input aria-label="Map width" type="number" min="1" value={mapWidth} onChange={(event) => onUpdateMapDimension("width", event.target.value)} className="mt-1 h-8 w-full border border-cyan-700 bg-slate-950 px-2 text-[9px] text-cyan-50 outline-none focus:border-cyan-400" />
        </label>
        <label className="block font-bold text-cyan-200">Map height
          <input aria-label="Map height" type="number" min="1" value={mapHeight} onChange={(event) => onUpdateMapDimension("height", event.target.value)} className="mt-1 h-8 w-full border border-cyan-700 bg-slate-950 px-2 text-[9px] text-cyan-50 outline-none focus:border-cyan-400" />
        </label>
      </div>}
      {selectedLiquidHydrogenFilled !== null && <div role="group" aria-label="Selected liquid hydrogen settings" className="max-w-[36rem] border-t border-sky-800 py-2">
        <label className="flex h-8 items-center gap-2 border border-sky-700 px-2 font-bold text-sky-200">
          <input aria-label="Filled with liquid hydrogen" type="checkbox" checked={selectedLiquidHydrogenFilled} onChange={(event) => onUpdateLiquidHydrogenFilled(event.target.checked)} /> Filled with liquid hydrogen
        </label>
      </div>}
      {expandedToolGroup && <div className="border-t border-slate-700 py-1.5">
        <div className="mb-1 px-1 text-[9px] normal-case tracking-normal text-slate-400">{expandedToolGroup.label}</div>
        <div role="toolbar" aria-label={`${expandedToolGroup.label} tools`} aria-orientation="horizontal" className="flex max-w-[36rem] flex-wrap gap-1">
          {expandedToolGroup.tools.map((tool) => {
            const Icon = tool.icon;
            const active = placementKind === tool.id;
            return <button key={tool.id} type="button" title={tool.label} aria-label={`Choose ${tool.label} tool`} aria-pressed={active} onClick={() => onActivateDrawingTool(tool.id)} className={primaryButtonClass(active)}>
              <Icon size={18} aria-hidden="true" />
              <span className="pointer-events-none absolute left-1/2 top-full z-50 mt-1 hidden -translate-x-1/2 whitespace-nowrap border border-cyan-600 bg-slate-950 px-3 py-2 text-[11px] normal-case tracking-normal text-cyan-50 shadow-xl group-hover:block group-focus-visible:block">{tool.label}</span>
            </button>;
          })}
        </div>
      </div>}
      {penDraftSegmentCount !== null && <div className="max-w-[36rem] border-t border-cyan-800 px-1 py-2 normal-case leading-relaxed tracking-normal text-cyan-100">
        <div>Click for corners. Click and drag a point to create curve handles. Click the cyan start, double-click, or press Enter to close. Backspace removes the last point.</div>
        <div className="mt-2 flex gap-2">
          <button type="button" disabled={penDraftSegmentCount < 2} onClick={onFinishPenArea} className="h-8 flex-1 border border-emerald-500 px-3 font-bold uppercase tracking-wider text-emerald-100 disabled:opacity-35">Finish area</button>
          <button type="button" onClick={onCancelPenArea} className="h-8 flex-1 border border-red-500 px-3 font-bold uppercase tracking-wider text-red-100">Cancel outline</button>
        </div>
      </div>}
      {placementKind === PEN_AREA_TOOL_ID && penDraftSegmentCount === null && <div className="max-w-[36rem] border-t border-cyan-800 px-2 py-2 text-[10px] normal-case leading-relaxed tracking-normal text-cyan-100">Click to begin a path. Click for straight corners; click and drag for curved points.</div>}
      {placementKind === RECTANGLE_AREA_TOOL_ID && <div className="max-w-[36rem] border-t border-cyan-800 px-2 py-2 text-[10px] normal-case leading-relaxed tracking-normal text-cyan-100">Drag from one corner to the opposite corner. Hold Shift while dragging to draw a square.</div>}
      {placementKind === CIRCLE_AREA_TOOL_ID && <div className="max-w-[36rem] border-t border-cyan-800 px-2 py-2 text-[10px] normal-case leading-relaxed tracking-normal text-cyan-100">Drag from the center to the radius. The completed circle remains circular and uses the standard Area Properties.</div>}
      {rampDrawing && <div className="max-w-[36rem] border-t border-purple-700 px-2 py-2 text-[10px] normal-case leading-relaxed tracking-normal text-purple-100">
        Move straight outward over at least two squares. Finish on lower terrain for a ramp or on a matching raised platform for a flat bridge.
        <button type="button" onClick={onCancelRamp} className="mt-2 h-8 w-full border border-red-400 font-bold uppercase text-red-100">Cancel ramp</button>
      </div>}
    </FloatingPluginHud>
  );
};

export default TacticalEditorToolsHud;
