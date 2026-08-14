import { LandPlot } from "lucide-react";
import { useEffect, useState } from "react";
import { FloatingPluginHud } from "@/components/hud/FloatingPluginHud";
import type { TacticalDrawnArea } from "@/plugins/characterCombat/tacticalScenarioDefinitions";
import type { TacticalEditorHudLayout } from "@/plugins/characterCombat/editor/lib/hudLayouts";

type TacticalEditorAreaPropertiesHudProps = {
  layout: TacticalEditorHudLayout;
  onLayoutChange: (layout: TacticalEditorHudLayout) => void;
  area: TacticalDrawnArea;
  nodeEditing: boolean;
  onUpdate: (update: Partial<TacticalDrawnArea>) => void;
  onDelete: () => void;
};

const areaEditingGuidance = (area: TacticalDrawnArea, nodeEditing: boolean) => {
  if (area.geometry?.kind === "circle") {
    return "Drag the cyan center to move the circle or the orange radius handle to resize it. It always remains circular.";
  }
  if (area.geometry?.kind === "rectangle") {
    return "Drag the cyan center to move the rectangle or an orange corner to resize it. It always remains rectangular.";
  }
  return nodeEditing
    ? "Drag cyan points to edit the Pen outline. Double-click a segment to add a point. Select an amber point and press Delete or Backspace to remove it."
    : "Drag cyan points or purple curve handles to reshape the Pen area. Choose Node Edit (N) to add or remove points.";
};

const TacticalEditorAreaPropertiesHud = ({
  layout,
  onLayoutChange,
  area,
  nodeEditing,
  onUpdate,
  onDelete,
}: TacticalEditorAreaPropertiesHudProps) => {
  const [levelValue, setLevelValue] = useState(String(area.elevation));
  useEffect(() => setLevelValue(String(area.elevation)), [area.elevation, area.id]);

  return (
  <FloatingPluginHud
    title="Area Properties"
    layout={layout}
    onLayoutChange={onLayoutChange}
    className="w-80 font-mono text-[10px] uppercase tracking-wider text-(--hud-text)"
  >
    <div className="py-1">
      <div className="mb-3 flex items-start justify-between gap-3 border-b border-slate-700 pb-2">
        <div>
          <div className="font-bold text-cyan-100">{area.id}</div>
          <div className="mt-1 normal-case tracking-normal text-slate-400">
            Surface, level, boundary, and deployment use are independent.
          </div>
        </div>
        <LandPlot size={22} className="shrink-0 text-cyan-300" aria-hidden="true" />
      </div>
      <div className="mb-3 border border-cyan-900 bg-cyan-950/30 p-2 normal-case leading-relaxed tracking-normal text-cyan-100">
        {areaEditingGuidance(area, nodeEditing)}
      </div>
      <label className="mb-3 block font-bold text-cyan-200">Surface
        <select
          aria-label="Area surface fill"
          value={area.surface}
          onChange={(event) => onUpdate({ surface: event.target.value as TacticalDrawnArea["surface"] })}
          className="mt-1 h-9 w-full border border-slate-600 bg-slate-950 px-2 text-[11px] normal-case tracking-normal text-slate-100"
        >
          <option value="none">None</option>
          <option value="grass">Grass</option>
          <option value="sand">Sand</option>
          <option value="water">Water</option>
          <option value="close-machinery">Closed machinery</option>
          <option value="liquid-hydrogen">Liquid hydrogen</option>
        </select>
      </label>
      <div className="mb-3 grid grid-cols-[1fr_auto_auto] items-end gap-1">
        <label className="block font-bold text-cyan-200">Level
          <input
            aria-label="Area elevation level"
            type="number"
            min="0"
            step="0.5"
            value={levelValue}
            onChange={(event) => {
              const value = event.target.value;
              setLevelValue(value);
              const elevation = Number.parseFloat(value);
              if (value.trim() && Number.isFinite(elevation) && elevation >= 0) onUpdate({ elevation });
            }}
            onBlur={() => {
              const elevation = Number.parseFloat(levelValue);
              if (!Number.isFinite(elevation) || elevation < 0) setLevelValue(String(area.elevation));
            }}
            className="mt-1 h-9 w-full border border-slate-600 bg-slate-950 px-2 text-[11px] text-slate-100"
          />
        </label>
        <button
          type="button"
          aria-label="Lower area by half level"
          disabled={area.elevation <= 0}
          onClick={() => onUpdate({ elevation: Math.max(0, area.elevation - 0.5) })}
          className="h-9 w-9 border border-slate-600 text-lg text-cyan-100 disabled:opacity-35"
        >−</button>
        <button
          type="button"
          aria-label="Raise area by half level"
          onClick={() => onUpdate({ elevation: area.elevation + 0.5 })}
          className="h-9 w-9 border border-slate-600 text-lg text-cyan-100"
        >+</button>
      </div>
      <label className="mb-3 block font-bold text-cyan-200">Boundary
        <select
          aria-label="Area boundary"
          value={area.boundary}
          onChange={(event) => onUpdate({ boundary: event.target.value as TacticalDrawnArea["boundary"] })}
          className="mt-1 h-9 w-full border border-slate-600 bg-slate-950 px-2 text-[11px] normal-case tracking-normal text-slate-100"
        >
          <option value="none">None</option>
          <option value="wall">Wall around boundary</option>
        </select>
      </label>
      <label className="mb-3 block font-bold text-cyan-200">Area use
        <select
          aria-label="Area use"
          value={area.deployment ? "crew-deployment" : "normal"}
          onChange={(event) => onUpdate({ deployment: event.target.value === "crew-deployment" || undefined })}
          className="mt-1 h-9 w-full border border-slate-600 bg-slate-950 px-2 text-[11px] normal-case tracking-normal text-slate-100"
        >
          <option value="normal">Normal area</option>
          <option value="crew-deployment">Crew deployment area</option>
        </select>
      </label>
      {area.surface === "liquid-hydrogen" && (
        <label className="mb-3 flex h-9 items-center gap-2 border border-sky-700 px-2 font-bold text-sky-200">
          <input
            aria-label="Area liquid hydrogen filled"
            type="checkbox"
            checked={area.settings?.filled ?? true}
            onChange={(event) => onUpdate({ settings: { ...area.settings, filled: event.target.checked } })}
          /> Filled
        </label>
      )}
      <div className="mb-3 border border-cyan-900 bg-cyan-950/30 p-2 normal-case leading-relaxed tracking-normal text-cyan-100/80">
        Changes apply immediately. Select this area again from the map or Layers panel to reopen these controls.
      </div>
      <button type="button" onClick={onDelete} className="h-9 w-full border border-red-500 font-bold text-red-100">
        Delete area
      </button>
    </div>
  </FloatingPluginHud>
  );
};

export default TacticalEditorAreaPropertiesHud;
