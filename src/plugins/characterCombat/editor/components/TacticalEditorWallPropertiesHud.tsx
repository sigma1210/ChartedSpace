import { BrickWall } from "lucide-react";
import { useEffect, useState } from "react";
import { FloatingPluginHud } from "@/components/hud/FloatingPluginHud";
import type { TacticalDrawnWall } from "@/plugins/characterCombat/tacticalScenarioDefinitions";
import type { TacticalEditorHudLayout } from "@/plugins/characterCombat/editor/lib/hudLayouts";

type TacticalEditorWallPropertiesHudProps = {
  layout: TacticalEditorHudLayout;
  onLayoutChange: (layout: TacticalEditorHudLayout) => void;
  wall: TacticalDrawnWall;
  onUpdate: (update: { elevation?: number }) => void;
  onDelete: () => void;
};

const TacticalEditorWallPropertiesHud = ({
  layout,
  onLayoutChange,
  wall,
  onUpdate,
  onDelete,
}: TacticalEditorWallPropertiesHudProps) => {
  const elevation = wall.elevation ?? 0;
  const [levelValue, setLevelValue] = useState(String(elevation));
  useEffect(() => setLevelValue(String(elevation)), [elevation, wall.id]);

  return (
    <FloatingPluginHud
      title="Wall Properties"
      layout={layout}
      onLayoutChange={onLayoutChange}
      className="w-80 font-mono text-[10px] uppercase tracking-wider text-(--hud-text)"
    >
      <div className="py-1">
        <div className="mb-3 flex items-start justify-between gap-3 border-b border-slate-700 pb-2">
          <div>
            <div className="font-bold text-cyan-100">{wall.id}</div>
            <div className="mt-1 normal-case tracking-normal text-slate-400">
              A wall remains on its authored level even when a raised area overlaps it.
            </div>
          </div>
          <BrickWall size={22} className="shrink-0 text-cyan-300" aria-hidden="true" />
        </div>
        <div className="mb-3 grid grid-cols-[1fr_auto_auto] items-end gap-1">
          <label className="block font-bold text-cyan-200">Level
            <input
              aria-label="Wall elevation level"
              type="number"
              min="0"
              step="0.5"
              value={levelValue}
              onChange={(event) => {
                const value = event.target.value;
                setLevelValue(value);
                const nextElevation = Number.parseFloat(value);
                if (value.trim()
                  && Number.isFinite(nextElevation)
                  && nextElevation >= 0
                  && Number.isInteger(nextElevation * 2)) {
                  onUpdate({ elevation: nextElevation });
                }
              }}
              onBlur={() => {
                const nextElevation = Number.parseFloat(levelValue);
                if (!Number.isFinite(nextElevation)
                  || nextElevation < 0
                  || !Number.isInteger(nextElevation * 2)) setLevelValue(String(elevation));
              }}
              className="mt-1 h-9 w-full border border-slate-600 bg-slate-950 px-2 text-[11px] text-slate-100"
            />
          </label>
          <button
            type="button"
            aria-label="Lower wall by half level"
            disabled={elevation <= 0}
            onClick={() => onUpdate({ elevation: Math.max(0, elevation - 0.5) })}
            className="h-9 w-9 border border-slate-600 text-lg text-cyan-100 disabled:opacity-35"
          >−</button>
          <button
            type="button"
            aria-label="Raise wall by half level"
            onClick={() => onUpdate({ elevation: elevation + 0.5 })}
            className="h-9 w-9 border border-slate-600 text-lg text-cyan-100"
          >+</button>
        </div>
        {(wall.portals?.length ?? 0) > 0 && (
          <div className="mb-3 border border-cyan-900 bg-cyan-950/30 p-2 normal-case leading-relaxed tracking-normal text-cyan-100/80">
            This level also applies to every door and iris valve in the wall.
          </div>
        )}
        <button type="button" onClick={onDelete} className="h-9 w-full border border-red-500 font-bold text-red-100">
          Delete wall
        </button>
      </div>
    </FloatingPluginHud>
  );
};

export default TacticalEditorWallPropertiesHud;
