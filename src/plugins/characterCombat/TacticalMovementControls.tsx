import type { ReactNode } from "react";
import { braceTacticalWeapon, confirmTacticalMove, finishTacticalActivation, previewTacticalEnemyEntry, previewTacticalMove, rallyTacticalCharacter, setTacticalMovementMode, toggleTacticalPosture, turnTacticalCharacter } from "@/plugins/characterCombat/slice";
import { filledLiquidHydrogenCellKeys, pointKey } from "@/plugins/characterCombat/geometry";
import type { TacticalMovementPreview } from "@/plugins/characterCombat/tacticalMovementPreview";
import { buildTacticalMoveConfirmationRolls } from "@/plugins/characterCombat/tacticalRolls";
import type { Combatant, TacticalMapState } from "@/plugins/characterCombat/types";
import { useAppDispatch } from "@/store/hooks";

type TacticalMovementControlsProps = {
  tacticalMap: TacticalMapState;
  activeCombatant: Combatant;
  draggedCombatant: Combatant | null;
  enemies: Combatant[];
  movementPreview: TacticalMovementPreview;
  children: ReactNode;
};

export const TacticalMovementControls = ({
  tacticalMap,
  activeCombatant,
  draggedCombatant,
  enemies,
  movementPreview,
  children,
}: TacticalMovementControlsProps) => {
  const dispatch = useAppDispatch();
  const selectedActionPoints = tacticalMap.actionPointsByCharacterId[activeCombatant.id] ?? 0;
  const selectedProne = activeCombatant.posture === "prone";
  const selectedSuppressed = tacticalMap.suppressedCombatantIds.includes(activeCombatant.id);
  const selectedBraced = tacticalMap.bracedCombatantIds.includes(activeCombatant.id);
  const previewedMoves = movementPreview.candidateMoves;
  const previewedMove = tacticalMap.plannedDestination
    ? previewedMoves.get(pointKey(tacticalMap.plannedDestination)) ?? null
    : null;
  const previewedLiquidHydrogenEntry = previewedMove?.path.find(
    (point: { x: number; y: number }) => filledLiquidHydrogenCellKeys(
      tacticalMap.scenario,
    ).has(pointKey(point)),
  ) ?? null;
  const selectedEnteredEnemySquare = tacticalMap.enemySquareEnteredCombatantIds.includes(
    activeCombatant.id,
  );
  const enemyEntryOptions = tacticalMap.movementMode === "walk"
    && !selectedProne
    && !draggedCombatant
    && !selectedEnteredEnemySquare
    ? enemies.filter((enemy) => !enemy.defeated).flatMap((enemy) => {
      const move = previewedMoves.get(pointKey(enemy.position));
      if (!move || (selectedSuppressed && move.path.length > 2)) return [];
      return [{ enemy, move }];
    })
    : [];
  const plannedEnemyEntryTarget = tacticalMap.plannedEnemyEntryTargetId
    ? enemies.find((enemy) => enemy.id === tacticalMap.plannedEnemyEntryTargetId) ?? null
    : null;
  const plannedDestinationKey = tacticalMap.plannedDestination
    ? pointKey(tacticalMap.plannedDestination)
    : null;
  const plannedMeleeDiveTarget = tacticalMap.movementMode === "trot" && plannedDestinationKey
    ? tacticalMap.scenario.combatants.find(
      (unit) => unit.id === tacticalMap.plannedMeleeTargetId
        && pointKey(unit.position) === plannedDestinationKey,
    ) ?? null
    : null;

  return <>
            <div className="border-b border-lime-300/40 pb-0.5 font-bold uppercase tracking-wider text-lime-200">Movement &amp; defense</div>
            {selectedEnteredEnemySquare && <div className="font-bold uppercase tracking-wider text-amber-200">Enemy square entered · no further movement · melee remains optional</div>}
            {enemyEntryOptions.map(({ enemy, move }) => <button key={`enemy-entry:${enemy.id}`} type="button" onClick={() => dispatch(previewTacticalEnemyEntry(enemy.id))} className="h-7 w-full border border-amber-300 px-2 text-[8px] font-bold uppercase tracking-wider text-amber-100">Enter {enemy.name}&apos;s square · {move.cost} AP</button>)}
            {selectedSuppressed && <>
              <div className="font-bold uppercase tracking-wider text-orange-200">Suppressed · −1 attacks · movement limit 2</div>
              <button type="button" disabled={selectedActionPoints < 3} onClick={() => dispatch(rallyTacticalCharacter())} className="h-7 w-full border border-orange-300 px-2 text-[8px] font-bold uppercase tracking-wider text-orange-100 disabled:cursor-not-allowed disabled:opacity-40">Rally · 3 AP</button>
            </>}
            <button type="button" disabled={selectedEnteredEnemySquare || Boolean(draggedCombatant) || selectedProne || selectedActionPoints !== 6} onClick={() => dispatch(setTacticalMovementMode(tacticalMap.movementMode === "evade" ? "walk" : "evade"))} className={`h-7 w-full border px-2 text-[8px] font-bold uppercase tracking-wider transition-colors ${tacticalMap.movementMode === "evade" ? "border-teal-200 bg-teal-300/15 text-teal-100" : "border-teal-300 text-teal-100"} disabled:cursor-not-allowed disabled:opacity-40`}>{tacticalMap.movementMode === "evade" ? "Evade mode · cancel" : "Evade · move 1 · 6 AP · −2 ranged hit"}</button>
            <button type="button" disabled={selectedEnteredEnemySquare || Boolean(draggedCombatant) || selectedProne || selectedActionPoints < 4} onClick={() => dispatch(setTacticalMovementMode(tacticalMap.movementMode === "sidestep" ? "walk" : "sidestep"))} className={`h-7 w-full border px-2 text-[8px] font-bold uppercase tracking-wider transition-colors ${tacticalMap.movementMode === "sidestep" ? "border-cyan-200 bg-cyan-300/15 text-cyan-100" : "border-cyan-300 text-cyan-100"} disabled:cursor-not-allowed disabled:opacity-40`}>{tacticalMap.movementMode === "sidestep" ? "Sidestep/backstep mode · cancel" : "Sidestep/backstep · 4 AP · keep facing"}</button>
            <button type="button" title={selectedEnteredEnemySquare ? "Further movement unavailable after entering an enemy square" : selectedProne ? "Movement unavailable while prone" : selectedSuppressed ? "Trot unavailable while suppressed" : draggedCombatant ? "Trot unavailable while dragging" : tacticalMap.movementMode === "trot" ? "Trot mode · switch to walk" : selectedActionPoints === 6 ? "Walk mode · switch to trot" : "Walk mode · trot unavailable"} aria-label={selectedEnteredEnemySquare ? "Further movement unavailable after entering an enemy square" : selectedProne ? "Movement unavailable while prone" : selectedSuppressed ? "Trot unavailable while suppressed" : draggedCombatant ? "Trot unavailable while dragging" : tacticalMap.movementMode === "trot" ? "Trot mode, switch to walk" : selectedActionPoints === 6 ? "Walk mode, switch to trot" : "Walk mode, trot unavailable"} disabled={selectedEnteredEnemySquare || Boolean(draggedCombatant) || selectedProne || selectedSuppressed || selectedActionPoints < 1 || (tacticalMap.movementMode !== "trot" && selectedActionPoints !== 6)} onClick={() => dispatch(setTacticalMovementMode(tacticalMap.movementMode === "trot" ? "walk" : "trot"))} className={`h-7 w-full border px-2 text-[8px] font-bold uppercase tracking-wider transition-colors ${tacticalMap.movementMode === "trot" ? "border-yellow-300 bg-yellow-300/20 text-yellow-100" : "border-lime-300 text-lime-100"} disabled:cursor-not-allowed disabled:opacity-40`}>
              {tacticalMap.movementMode === "trot" ? "Trot mode · switch to walk" : "Walk mode · switch to trot"}
            </button>
            <div className="grid grid-cols-2 gap-1">
              <button type="button" title={`Turn left · ${tacticalMap.movementMode === "trot" ? 2 : 1} AP`} aria-label={`Turn left, ${tacticalMap.movementMode === "trot" ? 2 : 1} AP`} disabled={selectedProne || tacticalMap.movementMode === "evade" || selectedActionPoints < (tacticalMap.movementMode === "trot" ? 2 : 1)} onClick={() => dispatch(turnTacticalCharacter("left"))} className="h-7 w-full border border-(--hud-border) px-2 text-[8px] font-bold uppercase tracking-wider text-(--hud-text-dim) transition-colors hover:border-cyan-300 hover:text-(--hud-text) disabled:cursor-not-allowed disabled:opacity-40">Turn left · {tacticalMap.movementMode === "trot" ? 2 : 1} AP</button>
              <button type="button" title={`Turn right · ${tacticalMap.movementMode === "trot" ? 2 : 1} AP`} aria-label={`Turn right, ${tacticalMap.movementMode === "trot" ? 2 : 1} AP`} disabled={selectedProne || tacticalMap.movementMode === "evade" || selectedActionPoints < (tacticalMap.movementMode === "trot" ? 2 : 1)} onClick={() => dispatch(turnTacticalCharacter("right"))} className="h-7 w-full border border-(--hud-border) px-2 text-[8px] font-bold uppercase tracking-wider text-(--hud-text-dim) transition-colors hover:border-cyan-300 hover:text-(--hud-text) disabled:cursor-not-allowed disabled:opacity-40">Turn right · {tacticalMap.movementMode === "trot" ? 2 : 1} AP</button>
            </div>
            <button type="button" title={selectedProne ? "Stand up · 6 AP" : "Go prone · 1 AP"} aria-label={selectedProne ? "Stand up, 6 AP" : "Go prone, 1 AP"} disabled={Boolean(draggedCombatant) || tacticalMap.movementMode === "evade" || selectedActionPoints < (selectedProne ? 6 : 1)} onClick={() => dispatch(toggleTacticalPosture())} className="h-7 w-full border border-slate-300 px-2 text-[8px] font-bold uppercase tracking-wider text-slate-100 transition-colors disabled:cursor-not-allowed disabled:opacity-40">{selectedProne ? "Stand up · 6 AP" : "Go prone · 1 AP"}</button>
            {selectedProne && !selectedBraced && <button type="button" disabled={Boolean(draggedCombatant) || selectedSuppressed || selectedActionPoints < 2} onClick={() => dispatch(braceTacticalWeapon())} className="h-7 w-full border border-cyan-300 px-2 text-[8px] font-bold uppercase tracking-wider text-cyan-100 transition-colors disabled:cursor-not-allowed disabled:opacity-40">Brace Weapon · 2 AP</button>}
            {selectedBraced && <div className="font-bold uppercase tracking-wider text-cyan-200">Braced · +1 ranged accuracy · lost on move or stand</div>}
            <div className="text-[7px] tracking-widest text-(--hud-text-dim)">{selectedProne ? "Stand before moving" : tacticalMap.movementMode ? `${tacticalMap.movementMode} perimeter shown` : "No action selected"}</div>
            {children}
            {previewedMove && <div className="flex flex-col gap-1 border border-cyan-300/50 p-1">
              <div>Destination <span className="text-cyan-100">{previewedMove.destination.x}, {previewedMove.destination.y}</span></div>
              <div className="mt-1">Movement cost <span className="text-cyan-100">{tacticalMap.movementMode === "evade" ? 6 : previewedMove.cost}</span></div>
              {previewedLiquidHydrogenEntry && <div className="font-bold uppercase tracking-wider text-red-200">Lethal: movement stops at liquid hydrogen {previewedLiquidHydrogenEntry.x},{previewedLiquidHydrogenEntry.y}</div>}
              {previewedMove.costBreakdown?.filter((entry: string) => entry.startsWith("congestion")).map((entry: string, index: number) => <div key={`${entry}:${index}`} className="text-amber-200">Occupied square · {entry}</div>)}
              {plannedMeleeDiveTarget && <div className="font-bold text-amber-100">Melee dive into {plannedMeleeDiveTarget.name} · +2 melee roll · no same-square −1 · simultaneous exchange · activation ends</div>}
              {plannedEnemyEntryTarget && <div className="font-bold text-amber-100">Enter {plannedEnemyEntryTarget.name}&apos;s square · defensive fire resolves first · movement ends · melee remains optional</div>}
              <div className="mt-2 grid grid-cols-2 gap-1">
                <button type="button" onClick={() => dispatch(confirmTacticalMove(buildTacticalMoveConfirmationRolls(tacticalMap)))} className="h-7 w-full border border-emerald-300 px-2 text-[8px] font-bold uppercase tracking-wider text-emerald-100 transition-colors">{plannedMeleeDiveTarget ? "Confirm Melee Dive" : plannedEnemyEntryTarget ? "Confirm Enemy Entry" : "Confirm"}</button>
                <button type="button" onClick={() => dispatch(previewTacticalMove(null))} className="h-7 w-full border border-(--hud-border) px-2 text-[8px] font-bold uppercase tracking-wider text-(--hud-text-dim) transition-colors">Cancel</button>
              </div>
            </div>}
            <button type="button" onClick={() => dispatch(finishTacticalActivation())} className="h-7 w-full border border-(--hud-border) px-2 text-[8px] font-bold uppercase tracking-wider text-(--hud-text-dim) transition-colors">Finish Activation · retain {selectedActionPoints} AP for reactions</button>
  </>;
};
