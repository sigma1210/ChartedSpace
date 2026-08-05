import { FloatingPluginHud } from "@/components/hud/FloatingPluginHud";
import type {
  TacticalDrawnCirclePrimitive,
  TacticalTerrainPrimitiveType,
} from "@/plugins/characterCombat/tacticalScenarioDefinitions";
import type { TacticalEditorHudLayout } from "@/plugins/characterCombat/editor/state/hudLayouts";

type LegacyCircleUpdate = Partial<Pick<
  TacticalDrawnCirclePrimitive,
  "center" | "radius" | "terrainType" | "settings" | "portals"
>>;

type TacticalEditorLegacyCircleHudProps = {
  layout: TacticalEditorHudLayout;
  onLayoutChange: (layout: TacticalEditorHudLayout) => void;
  circle: TacticalDrawnCirclePrimitive | null;
  creationTerrainType: TacticalTerrainPrimitiveType;
  onChangeTerrainType: (terrainType: TacticalTerrainPrimitiveType) => void;
  onUpdateCircle: (update: LegacyCircleUpdate) => void;
  onDeleteCircle: () => void;
};

const creationDescription = (terrainType: TacticalTerrainPrimitiveType) => {
  if (terrainType === "wall") return "a wall";
  if (terrainType === "raised-area") return "a raised area";
  if (terrainType === "close-machinery") return "machinery";
  return "liquid hydrogen";
};

const TacticalEditorLegacyCircleHud = ({
  layout,
  onLayoutChange,
  circle,
  creationTerrainType,
  onChangeTerrainType,
  onUpdateCircle,
  onDeleteCircle,
}: TacticalEditorLegacyCircleHudProps) => {
  const activeType = circle?.terrainType ?? creationTerrainType;

  return (
    <FloatingPluginHud
      title="Legacy Circle Properties"
      layout={layout}
      onLayoutChange={onLayoutChange}
      className="w-56 font-mono text-[8px] uppercase tracking-wider text-(--hud-text)"
    >
      <div aria-label="Legacy circle properties" className="py-1">
        <div className="border border-violet-700 bg-violet-950/20 p-2">
          <div className="mb-2 font-bold text-violet-200">
            {circle ? `Legacy circle · ${circle.id}` : "Legacy circle compatibility"}
          </div>
          <div className="mb-2 grid grid-cols-2 gap-1">
            {([
              ["wall", "Wall"],
              ["raised-area", "Raised"],
              ["close-machinery", "Machinery"],
              ["liquid-hydrogen", "Liquid H₂"],
            ] as const).map(([terrainType, label]) => (
              <button
                key={terrainType}
                type="button"
                aria-label={`Circle type ${label}`}
                aria-pressed={activeType === terrainType}
                onClick={() => onChangeTerrainType(terrainType)}
                className={`h-8 border px-1 font-bold uppercase ${activeType === terrainType ? "border-white bg-white/15 text-white" : "border-violet-800 text-violet-200"}`}
              >
                {label}
              </button>
            ))}
          </div>
          <div className="mb-2 normal-case text-violet-200/70">
            {circle
              ? "Change type here. Use the handles on the map to move or resize."
              : `The Boundaries HUD activated this compatibility tool. Use Circle Area for ordinary circles. This legacy circle will be ${creationDescription(creationTerrainType)}.`}
          </div>
          {circle && <>
            <div className="mb-2 grid grid-cols-3 gap-1">
              {(["x", "y"] as const).map((axis) => <label key={axis} className="font-bold text-violet-200">Center {axis}
                <input
                  aria-label={`Circle center ${axis}`}
                  type="number"
                  step="0.25"
                  value={circle.center[axis]}
                  onChange={(event) => onUpdateCircle({
                    center: {
                      ...circle.center,
                      [axis]: Number.parseFloat(event.target.value),
                    },
                  })}
                  className="mt-1 h-7 w-full border border-violet-800 bg-slate-950 px-1 text-[9px] text-slate-100"
                />
              </label>)}
              <label className="font-bold text-violet-200">Radius
                <input
                  aria-label="Circle radius"
                  type="number"
                  min="0.01"
                  step="0.25"
                  value={circle.radius}
                  onChange={(event) => onUpdateCircle({ radius: Number.parseFloat(event.target.value) })}
                  className="mt-1 h-7 w-full border border-violet-800 bg-slate-950 px-1 text-[9px] text-slate-100"
                />
              </label>
            </div>
            {circle.terrainType === "liquid-hydrogen" && (
              <label className="mb-2 flex items-center gap-2 border-t border-violet-800 pt-2 font-bold text-sky-200">
                <input
                  aria-label="Circle liquid hydrogen filled"
                  type="checkbox"
                  checked={circle.settings?.filled ?? true}
                  onChange={(event) => onUpdateCircle({ settings: { filled: event.target.checked } })}
                /> Filled
              </label>
            )}
            <button
              type="button"
              onClick={onDeleteCircle}
              className="h-7 w-full border border-red-500 font-bold uppercase text-red-100"
            >
              Delete Circle
            </button>
          </>}
        </div>
      </div>
    </FloatingPluginHud>
  );
};

export default TacticalEditorLegacyCircleHud;
