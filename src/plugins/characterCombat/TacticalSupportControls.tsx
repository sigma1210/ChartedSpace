import { attemptTacticalConsoleCheck, beginTacticalDragging, cancelTacticalExtinguishFire, cancelTacticalTreatment, confirmTacticalExtinguishFire, confirmTacticalTreatment, fireAtTacticalTerrain, interactWithTacticalTerrain, previewTacticalExtinguishFire, previewTacticalTreatment, releaseTacticalDraggedCombatant } from "@/plugins/characterCombat/slice";
import { depressurizedCells, pointKey, treatableAllies } from "@/plugins/characterCombat/geometry";
import { consoleOperationAvailable, travellerTaskTarget, type TacticalConsoleOperation, type TacticalConsoleTaskCheck } from "@/plugins/characterCombat/tacticalConsoleVictory";
import { buildTacticalConsoleCheckRolls, buildTacticalStructuralFireRolls } from "@/plugins/characterCombat/tacticalRolls";
import { activeTacticalTerrainObjects } from "@/plugins/characterCombat/tacticalTerrain";
import type { Combatant, TacticalMapState } from "@/plugins/characterCombat/types";
import { useAppDispatch } from "@/store/hooks";
import { characterHasQuestRequirement, inactiveQuestPlaytestRuntime, questChainForOperation, type QuestPlaytestRuntime } from "@/plugins/quest/playtest/questPlaytest";
import { questPlaytestChainAttempted, questPlaytestChainResolved } from "@/plugins/quest/questSlice";

type TacticalSupportControlsProps = {
  section: "recovery" | "terrain";
  tacticalMap: TacticalMapState;
  activeCombatant: Combatant;
  draggedCombatant: Combatant | null;
  questPlaytest?: QuestPlaytestRuntime;
};

const INACTIVE_QUEST_PLAYTEST = inactiveQuestPlaytestRuntime();

export const TacticalSupportControls = ({
  section,
  tacticalMap,
  activeCombatant,
  draggedCombatant,
  questPlaytest = INACTIVE_QUEST_PLAYTEST,
}: TacticalSupportControlsProps) => {
  const dispatch = useAppDispatch();
  const selectedActionPoints = tacticalMap.actionPointsByCharacterId[activeCombatant.id] ?? 0;

  if (section === "recovery") {
    const adjacentFireCells = (tacticalMap.scenario.fireCells ?? []).filter(
      (fire) => Math.abs(fire.x - activeCombatant.position.x)
        + Math.abs(fire.y - activeCombatant.position.y) === 1,
    );
    const plannedExtinguishFire = tacticalMap.plannedExtinguishFire
      && adjacentFireCells.some(
        (fire) => pointKey(fire) === pointKey(tacticalMap.plannedExtinguishFire!),
      )
      ? tacticalMap.plannedExtinguishFire
      : null;
    const treatmentTargets = treatableAllies(
      tacticalMap.scenario,
      activeCombatant.id,
    );
    const plannedTreatmentTarget = treatmentTargets.find(
      (unit) => unit.id === tacticalMap.plannedTreatmentTargetId,
    ) ?? null;
    const draggableAllies = !draggedCombatant
      ? tacticalMap.scenario.combatants.filter(
        (unit) => unit.side === activeCombatant.side
          && unit.defeated
          && unit.woundState !== "dead"
          && Math.abs(unit.position.x - activeCombatant.position.x)
            + Math.abs(unit.position.y - activeCombatant.position.y) === 1
          && !Object.values(tacticalMap.draggingCombatantByCarrierId).includes(unit.id),
      )
      : [];

    return <>
            {plannedExtinguishFire ? <div className="flex flex-col gap-2 border border-orange-300/60 p-2">
              <div className="font-bold uppercase tracking-wider text-orange-100">Extinguish Fire</div>
              <div className="text-(--hud-text-dim)">Fire at {plannedExtinguishFire.x}, {plannedExtinguishFire.y} will be replaced by smoke until the next turn.</div>
              <div className="grid grid-cols-2 gap-1">
                <button type="button" onClick={() => dispatch(confirmTacticalExtinguishFire())} className="h-7 w-full border border-orange-300 px-2 text-[8px] font-bold uppercase tracking-wider text-orange-100">Confirm · 3 AP</button>
                <button type="button" onClick={() => dispatch(cancelTacticalExtinguishFire())} className="h-7 w-full border border-(--hud-border) px-2 text-[8px] font-bold uppercase tracking-wider text-(--hud-text-dim)">Cancel</button>
              </div>
            </div> : adjacentFireCells.length > 0 && !tacticalMap.grenadeTargeting && !tacticalMap.coveringFireTargeting ? <div className="flex flex-col gap-1">
              <div className="border-b border-orange-300/40 pb-0.5 font-bold uppercase tracking-wider text-orange-200">Fire</div>
              {adjacentFireCells.map((fire) => <button key={`extinguish:${pointKey(fire)}`} type="button" disabled={selectedActionPoints < 3} onClick={() => dispatch(previewTacticalExtinguishFire(fire))} className="h-7 w-full border border-orange-300 px-2 text-[8px] font-bold uppercase tracking-wider text-orange-100 disabled:cursor-not-allowed disabled:opacity-40">Extinguish Fire {fire.x}, {fire.y} · 3 AP</button>)}
            </div> : null}
            {plannedTreatmentTarget ? <div className="flex flex-col gap-2 border border-emerald-300/60 p-2">
              <div className="font-bold uppercase tracking-wider text-emerald-100">Treat {plannedTreatmentTarget.name}</div>
              <div className="text-(--hud-text-dim)">{plannedTreatmentTarget.woundState} · {plannedTreatmentTarget.defeated ? "will be stabilized and remain incapacitated" : "light wound will be treated"}</div>
              <div className="grid grid-cols-2 gap-1">
                <button type="button" onClick={() => dispatch(confirmTacticalTreatment())} className="h-7 w-full border border-emerald-300 px-2 text-[8px] font-bold uppercase tracking-wider text-emerald-100">Confirm Treatment</button>
                <button type="button" onClick={() => dispatch(cancelTacticalTreatment())} className="h-7 w-full border border-(--hud-border) px-2 text-[8px] font-bold uppercase tracking-wider text-(--hud-text-dim)">Cancel</button>
              </div>
            </div> : treatmentTargets.length > 0 && !tacticalMap.grenadeTargeting && !tacticalMap.coveringFireTargeting ? <div className="flex flex-col gap-1">
              <div className="border-b border-emerald-300/40 pb-0.5 font-bold uppercase tracking-wider text-emerald-200">Treatment</div>
              {treatmentTargets.map((patient) => <button key={patient.id} type="button" disabled={selectedActionPoints < 6 || (activeCombatant?.medkits ?? 0) < 1} onClick={() => dispatch(previewTacticalTreatment(patient.id))} className="h-7 w-full border border-emerald-300 px-2 text-[8px] font-bold uppercase tracking-wider text-emerald-100 disabled:cursor-not-allowed disabled:opacity-40">Treat {patient.name} · 6 AP · 1 medkit</button>)}
            </div> : null}
            {(draggableAllies.length > 0 || draggedCombatant) && <div className="flex flex-col gap-1">
              <div className="border-b border-blue-300/40 pb-0.5 font-bold uppercase tracking-wider text-blue-200">Recovery movement</div>
              {draggableAllies.map((ally) => <button key={ally.id} type="button" onClick={() => dispatch(beginTacticalDragging(ally.id))} className="h-7 w-full border border-blue-300 px-2 text-[8px] font-bold uppercase tracking-wider text-blue-100">Drag {ally.name}</button>)}
              {draggedCombatant && <><div className="font-bold uppercase tracking-wider text-blue-200">Dragging {draggedCombatant.name} · movement limit 2 · attacks unavailable</div><button type="button" onClick={() => dispatch(releaseTacticalDraggedCombatant())} className="h-7 w-full border border-blue-300 px-2 text-[8px] font-bold uppercase tracking-wider text-blue-100">Release {draggedCombatant.name}</button></>}
            </div>}
    </>;
  }

  const selectedPosition = activeCombatant.position;
  const selectedBraced = tacticalMap.bracedCombatantIds.includes(activeCombatant.id);
  const tacticalTerrain = activeTacticalTerrainObjects(
    tacticalMap.scenario,
    tacticalMap.doorOpenById,
    tacticalMap.destroyedTerrainObjectIds,
  );
  const selectedTerrain = tacticalTerrain.find(
    (object) => object.id === tacticalMap.selectedTerrainObjectId,
  ) ?? null;
  const terrainInteractionCost = selectedTerrain?.kind === "door"
    ? 2
    : selectedTerrain?.kind === "terminal" || selectedTerrain?.kind === "hatch"
      ? 6
      : 0;
  const selectedDoorCommand = selectedTerrain?.kind === "door"
    || selectedTerrain?.kind === "hatch"
    ? tacticalMap.pendingDoorCommandsById[selectedTerrain.id]
    : null;
  const vacuumCells = depressurizedCells(tacticalMap.scenario);
  const selectedPortalPressureBlocked = selectedTerrain?.kind === "door"
    && selectedTerrain.portalType === "iris-valve"
    && !selectedTerrain.open
    ? vacuumCells.has(pointKey(selectedTerrain.separates.first))
      !== vacuumCells.has(pointKey(selectedTerrain.separates.second))
    : false;
  const phaseStartPosition = tacticalMap.actionPhaseStartPositionByCombatantId[
    activeCombatant.id
  ];
  const terrainAdjacent = Boolean(selectedTerrain && (
    selectedTerrain.kind === "door"
      ? phaseStartPosition
        && [selectedTerrain.separates.first, selectedTerrain.separates.second].some(
          (point) => point.x === phaseStartPosition.x
            && point.y === phaseStartPosition.y,
        )
      : selectedTerrain.kind === "hatch"
        ? phaseStartPosition
          && Math.abs(selectedTerrain.position.x - phaseStartPosition.x)
            + Math.abs(selectedTerrain.position.y - phaseStartPosition.y) === 1
        : selectedTerrain.kind === "terminal"
          && Math.abs(selectedTerrain.position.x - selectedPosition.x)
            + Math.abs(selectedTerrain.position.y - selectedPosition.y) === 1
  ));
  const terminalAlreadyActive = selectedTerrain?.kind === "terminal"
    && Boolean(tacticalMap.terminalActiveById[selectedTerrain.id]);
  const selectedConsoleOperations = selectedTerrain?.kind === "terminal"
    ? (tacticalMap.scenario.consoleVictory?.operations ?? []).filter(
      (operation) => `${operation.consolePlacementId}:terminal` === selectedTerrain.id,
    )
    : [];
  const questScenario = questPlaytest.definition?.scenarioInstances.find((scenario) => scenario.id === questPlaytest.currentScenarioInstanceId) ?? null;
  const questOperationAvailable = (operationId: string) => {
    if (tacticalMap.consoleOperationProgressById?.[operationId]) return true;
    if (!questScenario) return true;
    const questChain = questChainForOperation(questScenario, operationId);
    return !questChain || characterHasQuestRequirement(questPlaytest, questChain.chain, activeCombatant.id);
  };
  const unresolvedConsoleOperations = selectedConsoleOperations.filter(
    (operation) => !(tacticalMap.resolvedConsoleOperationIds ?? []).includes(operation.id),
  );
  const attemptConsoleOperation = (operation: TacticalConsoleOperation, check: TacticalConsoleTaskCheck, completedCheckCount: number, carriedModifier: number, successImpossible: boolean) => {
    const rolls = buildTacticalConsoleCheckRolls(operation.id);
    const questChain = questScenario ? questChainForOperation(questScenario, operation.id) : null;
    let itemModifier = 0;
    if (questChain) {
      if (completedCheckCount === 0) dispatch(questPlaytestChainAttempted({ chainId: questChain.chain.id, characterId: activeCombatant.id }));
      itemModifier = questChain.chain.itemRequirements.reduce((total, requirement) => {
        const definition = questPlaytest.definition?.itemDefinitions.find((item) => item.id === requirement.itemDefinitionId);
        if (!definition?.requiredSkill || activeCombatant.skills?.some((skill) => skill.name.toLowerCase() === definition.requiredSkill?.toLowerCase())) return total;
        return total + definition.unskilledDm;
      }, 0);
      const raw = rolls.dice.first + rolls.dice.second;
      const skillLevel = activeCombatant.skills?.find((skill) => skill.name.toLowerCase() === check.skill.toLowerCase())?.level ?? 0;
      const passed = raw + skillLevel + carriedModifier + itemModifier >= travellerTaskTarget(check.difficulty);
      const criticalFailure = raw === 2;
      const finalTask = completedCheckCount + 1 === operation.checks.length;
      const outcome = !passed && !criticalFailure
        ? "failure"
        : finalTask && (successImpossible || criticalFailure)
          ? criticalFailure ? "critical-failure" : "failure"
          : finalTask
            ? raw === 12 ? "critical-success" : "success"
            : null;
      if (outcome) dispatch(questPlaytestChainResolved({ chainId: questChain.chain.id, nodeId: questChain.nodeId, characterId: activeCombatant.id, outcome }));
    }
    dispatch(attemptTacticalConsoleCheck({ ...rolls, modifier: itemModifier }));
  };
  const selectedWeapon = activeCombatant.weapon;
  const selectedAmmunition = tacticalMap.ammunitionByCharacterId[activeCombatant.id] ?? 0;
  const structuralWeaponEligible = selectedWeapon.highEnergy
    ? selectedBraced
    : Boolean(selectedWeapon.structuralDamage);
  const selectedStructure = selectedTerrain?.kind === "wall"
    || selectedTerrain?.kind === "door"
    ? selectedTerrain
    : null;
  const selectedStructureThreshold = selectedStructure?.kind === "door"
    ? selectedStructure.portalType === "iris-valve" ? 10 : 5
    : 25;
  const selectedStructureDamage = selectedStructure
    ? tacticalMap.terrainDamageById[selectedStructure.id] ?? 0
    : 0;

  return <>
            {selectedTerrain && <div className="flex flex-col gap-2">
              <div className="border-b border-amber-300/40 pb-0.5 font-bold uppercase tracking-wider text-amber-200">Interaction</div>
              <div className="font-bold text-amber-100">{selectedTerrain.kind === "wall" ? "Wall segment" : selectedTerrain.kind === "door" ? `${selectedTerrain.open ? "Open" : "Closed"} ${selectedTerrain.portalType === "iris-valve" ? "iris valve" : "door"}` : selectedTerrain.kind === "hatch" ? `${selectedTerrain.open ? "Open" : "Closed"} hatch` : selectedTerrain.label}</div>
              {selectedTerrain.kind !== "wall" && <><div className={`mt-1 ${terrainAdjacent ? "text-emerald-200" : "text-rose-200"}`}>{terrainAdjacent ? selectedTerrain.kind === "door" ? "Adjacent at phase start" : "Adjacent" : selectedTerrain.kind === "door" ? "Must begin the phase adjacent" : "Move adjacent to interact"}</div>
                {selectedDoorCommand ? <div className="text-amber-200">{selectedTerrain.kind === "hatch" ? "Hatch" : selectedTerrain.kind === "door" && selectedTerrain.portalType === "iris-valve" ? "Iris valve" : "Door"} will {selectedDoorCommand.open ? "open" : "close"} at the start of Turn {selectedDoorCommand.resolvesAtTurn}</div> : selectedPortalPressureBlocked ? <div className="text-rose-200">Cannot open across a pressure differential</div> : selectedTerrain.kind === "terminal" ? <div className="flex flex-col gap-1">
                  {unresolvedConsoleOperations.map((operation) => {
                    const progress = tacticalMap.consoleOperationProgressById?.[operation.id];
                    const check = operation.checks.find((candidate) => !progress?.completedCheckIds.includes(candidate.id));
                    if (!check) return null;
                    const completed = progress?.completedCheckIds.length ?? 0;
                    const predecessorBlocked = !consoleOperationAvailable(operation, tacticalMap.completedConsoleOperationIds ?? []);
                    const itemBlocked = !questOperationAvailable(operation.id);
                    const disabledReason = predecessorBlocked
                      ? "Complete the preceding task chain first"
                      : itemBlocked
                        ? "Required quest item is not held by this character"
                        : !terrainAdjacent
                          ? "Move adjacent to interact"
                          : selectedActionPoints < check.apCost
                            ? `Requires ${check.apCost} AP`
                            : null;
                    return <div key={operation.id} className="grid gap-1"><button type="button" disabled={Boolean(disabledReason)} onClick={() => attemptConsoleOperation(operation, check, completed, progress?.nextCheckModifier ?? 0, Boolean(progress?.successImpossible))} className="min-h-8 w-full border border-amber-300 px-2 py-1 text-left text-[8px] font-bold uppercase tracking-wider text-amber-100 disabled:cursor-not-allowed disabled:border-slate-700 disabled:text-slate-500">
                      <span className="block">{operation.label} · {check.apCost} AP</span>
                      <span className="block text-[7px] font-normal text-amber-200">{check.skill} · {check.difficulty.replace("-", " ")} {({ simple: 2, easy: 4, routine: 6, average: 8, difficult: 10, "very-difficult": 12, formidable: 14 } as const)[check.difficulty]}+ · check {completed + 1}/{operation.checks.length}</span>
                    </button>{disabledReason && <div className="border-l-2 border-amber-700 pl-2 text-[7px] text-amber-200">{disabledReason}</div>}</div>;
                  })}
                  {unresolvedConsoleOperations.length === 0 && <div className={terminalAlreadyActive ? "text-emerald-200" : "text-slate-400"}>{terminalAlreadyActive ? selectedTerrain.visualKind === "human" ? "Interaction completed" : "Console operation completed" : selectedTerrain.visualKind === "human" ? "No quest interaction defined" : "No quest console operation defined"}</div>}
                </div> : <button type="button" disabled={!terrainAdjacent || selectedActionPoints < terrainInteractionCost || selectedPortalPressureBlocked} onClick={() => dispatch(interactWithTacticalTerrain())} className="h-7 w-full border border-amber-300 px-2 text-[8px] font-bold uppercase tracking-wider text-amber-100 transition-colors disabled:cursor-not-allowed disabled:opacity-40">
                  {selectedTerrain.kind === "door" ? `${selectedTerrain.open ? "Close" : "Open"} ${selectedTerrain.portalType === "iris-valve" ? "iris valve" : "door"} next phase · 2 AP` : `${selectedTerrain.open ? "Close" : "Open"} hatch next phase · 6 AP`}
                </button>}</>}
              {selectedStructure && <div className="flex flex-col gap-1 border-t border-(--hud-border-subtle) pt-2">
                <div>Integrity damage <span className="text-fuchsia-100">{selectedStructureDamage}/{selectedStructureThreshold}</span></div>
                <div className="mt-1">{selectedWeapon?.name ?? "No weapon"} · {selectedAmmunition} ammunition</div>
                {selectedWeapon?.highEnergy && !selectedBraced && <div className="mt-1 text-orange-200">High-energy weapon must be braced</div>}
                {!structuralWeaponEligible && !selectedWeapon?.highEnergy && <div className="mt-1 text-orange-200">Current ammunition cannot damage structures</div>}
                <button type="button" disabled={Boolean(draggedCombatant) || !structuralWeaponEligible || selectedActionPoints < 6 || selectedAmmunition < 1} onClick={() => dispatch(fireAtTacticalTerrain(buildTacticalStructuralFireRolls()))} className="h-7 w-full border border-fuchsia-300 px-2 text-[8px] font-bold uppercase tracking-wider text-fuchsia-100 transition-colors disabled:cursor-not-allowed disabled:opacity-40">Fire at structure · 6 AP</button>
              </div>}
            </div>}
  </>;
};
