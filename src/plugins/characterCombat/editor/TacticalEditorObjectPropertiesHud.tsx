import { FloatingPluginHud } from "@/components/hud/FloatingPluginHud";
import type {
  TacticalDrawnTerrainRegion,
  TacticalNaturalTerrainPlacement,
} from "@/plugins/characterCombat/tacticalScenarioDefinitions";
import type { TacticalEditorHudLayout } from "@/plugins/characterCombat/editor/state/hudLayouts";
import { naturalTerrainLabel } from "@/plugins/characterCombat/editor/tacticalEditorSupport";

type TacticalEditorObjectPropertiesHudProps = {
  layout: TacticalEditorHudLayout;
  onLayoutChange: (layout: TacticalEditorHudLayout) => void;
  naturalTerrain: TacticalNaturalTerrainPlacement | null;
  naturalTerrainFootprintCellCount: number;
  terrainRegion: TacticalDrawnTerrainRegion | null;
  onUpdateNaturalTerrainRadius: (radius: number) => void;
  onDeleteNaturalTerrain: () => void;
  onUpdateTerrainRegionFilled: (filled: boolean) => void;
  onDeleteTerrainRegion: () => void;
};

const TacticalEditorObjectPropertiesHud = ({
  layout,
  onLayoutChange,
  naturalTerrain,
  naturalTerrainFootprintCellCount,
  terrainRegion,
  onUpdateNaturalTerrainRadius,
  onDeleteNaturalTerrain,
  onUpdateTerrainRegionFilled,
  onDeleteTerrainRegion,
}: TacticalEditorObjectPropertiesHudProps) => (
  <FloatingPluginHud
    title="Object Properties"
    layout={layout}
    onLayoutChange={onLayoutChange}
    className="w-64 font-mono text-[9px] uppercase tracking-wider text-(--hud-text)"
  >
    <div className="max-h-[65vh] overflow-y-auto py-1 pr-1">
      {naturalTerrain && <>
        <div className="mb-2 font-bold text-lime-200">
          {naturalTerrainLabel(naturalTerrain.kind)}
        </div>
        <div className="mb-3 normal-case text-(--hud-text-dim)">
          Center {naturalTerrain.position.x},{naturalTerrain.position.y} · {naturalTerrain.kind === "tree"
            ? "trunk blocks one square"
            : `${naturalTerrainFootprintCellCount} cover squares${naturalTerrain.kind === "rock" ? " · 3 AP" : " · 2 AP"}`}
        </div>
        <label className="mb-3 block font-bold text-lime-200">Radius
          <input
            aria-label={`${naturalTerrainLabel(naturalTerrain.kind)} radius`}
            type="number"
            min="0.25"
            step="0.25"
            value={naturalTerrain.radius}
            onChange={(event) => onUpdateNaturalTerrainRadius(Number.parseFloat(event.target.value))}
            className="mt-1 h-8 w-full border border-lime-700 bg-slate-950 px-2 text-[10px] text-slate-100"
          />
        </label>
        <div className="mb-3 normal-case text-lime-100/70">
          Move and resize directly on the map. Delete or Backspace also removes the selection.
        </div>
        <button
          type="button"
          onClick={onDeleteNaturalTerrain}
          className="h-8 w-full border border-red-500 font-bold text-red-100"
        >
          Delete {naturalTerrain.kind}
        </button>
      </>}
      {terrainRegion?.kind === "liquid-hydrogen" && <>
        <div className="mb-2 font-bold text-sky-200">Legacy liquid hydrogen region</div>
        <label className="mb-3 flex h-8 items-center gap-2 border border-sky-700 px-2 font-bold text-sky-200">
          <input
            aria-label="Liquid hydrogen region filled"
            type="checkbox"
            checked={terrainRegion.settings?.filled ?? true}
            onChange={(event) => onUpdateTerrainRegionFilled(event.target.checked)}
          /> Filled
        </label>
        <button
          type="button"
          onClick={onDeleteTerrainRegion}
          className="h-8 w-full border border-red-500 font-bold text-red-100"
        >
          Delete terrain region
        </button>
      </>}
    </div>
  </FloatingPluginHud>
);

export default TacticalEditorObjectPropertiesHud;
