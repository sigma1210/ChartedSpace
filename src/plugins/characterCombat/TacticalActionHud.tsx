import { FloatingPluginHud } from "@/components/hud/FloatingPluginHud";
import { resetTacticalDraftPlaytest, resetTacticalScenario, runTacticalEnemyPhase, updateTacticalActionHud } from "@/plugins/characterCombat/slice";
import { meleeEnemies, tacticalRangedEnemies } from "@/plugins/characterCombat/geometry";
import type { TacticalConsoleVictoryDefinitionFile } from "@/plugins/characterCombat/tacticalConsoleVictory";
import type { TacticalMovementPreview } from "@/plugins/characterCombat/tacticalMovementPreview";
import { buildTacticalEnemyPhaseRolls } from "@/plugins/characterCombat/tacticalRolls";
import type { TacticalScenarioDefinitionFile } from "@/plugins/characterCombat/tacticalScenarioDefinitions";
import type { Combatant, TacticalMapState } from "@/plugins/characterCombat/types";
import { useAppDispatch } from "@/store/hooks";
import { TacticalCombatControls } from "./TacticalCombatControls";
import { TacticalMovementControls } from "./TacticalMovementControls";
import { hasTacticalReactionControls, TacticalReactionControls } from "./TacticalReactionControls";
import { TacticalSupportControls } from "./TacticalSupportControls";
import type { QuestPlaytestRuntime } from "@/plugins/quest/playtest/questPlaytest";

type TacticalActionHudProps = {
  tacticalMap: TacticalMapState;
  activeCombatant: Combatant | null;
  enemies: Combatant[];
  movementPreview: TacticalMovementPreview;
  draftPlaytest?: {
    definition: TacticalScenarioDefinitionFile;
    consoleVictory: TacticalConsoleVictoryDefinitionFile;
  };
  questPlaytest?: QuestPlaytestRuntime;
};

export const TacticalActionHud = ({
  tacticalMap,
  activeCombatant,
  enemies,
  movementPreview,
  draftPlaytest,
  questPlaytest,
}: TacticalActionHudProps) => {
  const dispatch = useAppDispatch();
  const tacticalScenarioStatus = tacticalMap.scenarioStatus ?? "active";
  const selectedPosition = activeCombatant?.position ?? null;
  const selectedActionPoints = activeCombatant ? tacticalMap.actionPointsByCharacterId[activeCombatant.id] ?? 0 : 0;
  const selectedProne = activeCombatant?.posture === "prone";
  const draggedCombatant = activeCombatant ? tacticalMap.scenario.combatants.find((unit) => unit.id === tacticalMap.draggingCombatantByCarrierId[activeCombatant.id]) ?? null : null;
  const livingPlayerIds = tacticalMap.scenario.combatants.filter((unit) => unit.side === "player" && !unit.defeated).map((unit) => unit.id);
  const playerPhaseComplete = livingPlayerIds.length > 0 && livingPlayerIds.every((id) => tacticalMap.actedCharacterIds.includes(id) || (tacticalMap.actionPointsByCharacterId[id] ?? 0) === 0);
  const rangedTargets = activeCombatant && !draggedCombatant ? tacticalRangedEnemies(tacticalMap.scenario, activeCombatant.id) : [];
  const meleeTargets = activeCombatant && !draggedCombatant ? meleeEnemies(tacticalMap.scenario, activeCombatant.id) : [];
  const reactionPending = hasTacticalReactionControls(tacticalMap, activeCombatant);

  return tacticalScenarioStatus !== "setup" ? <FloatingPluginHud title="Current Action" layout={tacticalMap.actionHudLayout} onLayoutChange={(layout) => dispatch(updateTacticalActionHud(layout))} className="w-72 font-mono text-[8px] uppercase tracking-wider text-(--hud-text)">
        <section className="flex max-h-[60vh] flex-col gap-2 overflow-y-auto pr-1 normal-case tracking-normal">
          {tacticalScenarioStatus !== "active" ? <div className={`flex flex-col gap-2 border p-2 ${tacticalScenarioStatus === "victory" ? "border-emerald-300/70 text-emerald-100" : "border-red-300/70 text-red-100"}`}>
            <div className="font-bold uppercase tracking-wider">{tacticalScenarioStatus === "victory" ? "Victory — Security Terminal Secured" : "Defeat — Crew Incapacitated"}</div>
            <div className="text-(--hud-text-dim)">{tacticalScenarioStatus === "victory" ? "The Control Room Assault objective is complete." : "No crew member remains able to continue the assault."}</div>
          </div> : reactionPending ? <TacticalReactionControls tacticalMap={tacticalMap} activeCombatant={activeCombatant} rangedTargets={rangedTargets} /> : activeCombatant && selectedPosition ? <>
            <div className="font-bold uppercase tracking-wider text-cyan-100">{activeCombatant.name}</div>
            <div className="text-(--hud-text-dim)">Grid position <span className="text-(--hud-text)">{selectedPosition.x}, {selectedPosition.y}</span> · <span className="text-emerald-200">{selectedActionPoints} AP</span> · <span className={selectedProne ? "text-amber-200" : "text-(--hud-text-dim)"}>{selectedProne ? "Prone" : "Standing"}</span></div>
            <TacticalCombatControls tacticalMap={tacticalMap} activeCombatant={activeCombatant} draggedCombatant={draggedCombatant} rangedTargets={rangedTargets} meleeTargets={meleeTargets}>
            <TacticalSupportControls section="recovery" tacticalMap={tacticalMap} activeCombatant={activeCombatant} draggedCombatant={draggedCombatant} questPlaytest={questPlaytest} />
            </TacticalCombatControls>
            <TacticalMovementControls tacticalMap={tacticalMap} activeCombatant={activeCombatant} draggedCombatant={draggedCombatant} enemies={enemies} movementPreview={movementPreview}>
            <TacticalSupportControls section="terrain" tacticalMap={tacticalMap} activeCombatant={activeCombatant} draggedCombatant={draggedCombatant} questPlaytest={questPlaytest} />
            </TacticalMovementControls>
          </> : playerPhaseComplete ? <>
            <div className="text-amber-100">Crew activations complete. End the turn to run enemy actions.</div>
            <button type="button" onClick={() => dispatch(runTacticalEnemyPhase(buildTacticalEnemyPhaseRolls(tacticalMap)))} className="h-7 w-full border border-amber-300 px-2 text-[8px] font-bold uppercase tracking-wider text-amber-100 transition-colors hover:bg-amber-300/15">End Turn</button>
          </> : <div className="text-(--hud-text-dim)">Select a green character.</div>}
          <button type="button" onClick={() => dispatch(draftPlaytest ? resetTacticalDraftPlaytest({ definition: draftPlaytest.definition, consoleVictory: draftPlaytest.consoleVictory }) : resetTacticalScenario())} className="h-7 w-full border border-red-300 px-2 text-[8px] font-bold uppercase tracking-wider text-red-100 transition-colors hover:bg-red-300/15">Reset Scenario</button>
        </section>
  </FloatingPluginHud> : null;
};
