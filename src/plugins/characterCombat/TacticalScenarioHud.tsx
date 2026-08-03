import { FloatingPluginHud } from "@/components/hud/FloatingPluginHud";
import { updateTacticalScenarioHud } from "@/plugins/characterCombat/slice";
import type {
  CharacterCombatHudLayout,
  TacticalMapState,
} from "@/plugins/characterCombat/types";
import { useAppDispatch } from "@/store/hooks";
import { TacticalDeploymentControls } from "./TacticalDeploymentHud";

export const DEFAULT_TACTICAL_SCENARIO_HUD_LAYOUT: CharacterCombatHudLayout = {
  visible: true,
  pinned: false,
  position: { x: 320, y: 190 },
};

export const TacticalScenarioHud = ({
  tacticalMap,
  layout,
}: {
  tacticalMap: TacticalMapState;
  layout: CharacterCombatHudLayout;
}) => {
  const dispatch = useAppDispatch();
  const status = tacticalMap.scenarioStatus ?? "active";

  return (
    <FloatingPluginHud
      title="Scenario"
      layout={layout}
      onLayoutChange={(nextLayout) => dispatch(updateTacticalScenarioHud(nextLayout))}
      className="w-72 font-mono text-[8px] uppercase tracking-wider text-(--hud-text)"
    >
      <div className="flex flex-col gap-2 normal-case tracking-normal">
        <div className="flex items-center justify-between gap-3 uppercase tracking-wider">
          <span className="font-bold text-cyan-100">{tacticalMap.scenario.title}</span>
          <span className={status === "victory" ? "text-emerald-200" : status === "defeat" ? "text-red-200" : status === "setup" ? "text-amber-200" : "text-cyan-200"}>{status}</span>
        </div>
        <div className="text-(--hud-text-dim)">{tacticalMap.scenario.briefing}</div>
        <div className="border-t border-(--hud-border) pt-2">
          <span className="uppercase text-(--hud-text-dim)">Objective</span>
          <div className="mt-1 font-bold text-(--hud-text)">{tacticalMap.scenario.objective}</div>
        </div>
        {status === "setup" && <TacticalDeploymentControls tacticalMap={tacticalMap} />}
        <div className="text-(--hud-text-dim)">Turn {tacticalMap.turn}</div>
      </div>
    </FloatingPluginHud>
  );
};
