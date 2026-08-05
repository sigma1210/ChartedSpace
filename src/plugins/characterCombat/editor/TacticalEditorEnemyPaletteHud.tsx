import { FloatingPluginHud } from "@/components/hud/FloatingPluginHud";
import { tacticalEnemyPalette } from "@/plugins/characterCombat/tacticalEnemyDefinitions";
import type { TacticalEnemyType } from "@/plugins/characterCombat/tacticalScenarioDefinitions";
import type { TacticalEditorHudLayout } from "@/plugins/characterCombat/editor/state/hudLayouts";

type TacticalEditorEnemyPaletteHudProps = {
  layout: TacticalEditorHudLayout;
  onLayoutChange: (layout: TacticalEditorHudLayout) => void;
  activeEnemyType: TacticalEnemyType | null;
  onActivateEnemyType: (enemyType: TacticalEnemyType) => void;
};

const TacticalEditorEnemyPaletteHud = ({
  layout,
  onLayoutChange,
  activeEnemyType,
  onActivateEnemyType,
}: TacticalEditorEnemyPaletteHudProps) => (
  <FloatingPluginHud
    title="Enemy Palette"
    layout={layout}
    onLayoutChange={onLayoutChange}
    className="w-56 font-mono text-[8px] uppercase tracking-wider text-(--hud-text)"
  >
    <div aria-label="Enemy options" className="grid grid-cols-1 gap-1.5 py-1">
      {tacticalEnemyPalette.map((enemy) => (
        <button
          type="button"
          key={enemy.id}
          aria-pressed={activeEnemyType === enemy.id}
          onClick={() => onActivateEnemyType(enemy.id)}
          className={`min-h-11 border px-2 py-2 text-left ${activeEnemyType === enemy.id ? "border-red-200 bg-red-300/20 text-red-50" : "border-(--hud-border) text-(--hud-text) hover:border-red-300"}`}
        >
          <span className="block font-bold">{enemy.label}</span>
          <span className="mt-1 block normal-case text-(--hud-text-dim)">{enemy.equipment}</span>
        </button>
      ))}
    </div>
  </FloatingPluginHud>
);

export default TacticalEditorEnemyPaletteHud;
