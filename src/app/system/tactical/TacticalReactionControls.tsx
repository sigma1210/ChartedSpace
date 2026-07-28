import {
  resolveTacticalAdjacencyReaction,
  resolveTacticalCoveringFireSnap,
  runTacticalEnemyPhase,
} from "@/plugins/characterCombat/slice";
import {
  buildTacticalAdjacencyReactionRolls,
  buildTacticalCoveringFireSnapRolls,
  buildTacticalEnemyPhaseRolls,
} from "@/plugins/characterCombat/tacticalRolls";
import type { Combatant, TacticalMapState } from "@/plugins/characterCombat/types";
import { useAppDispatch } from "@/store/hooks";

type TacticalReactionControlsProps = {
  tacticalMap: TacticalMapState;
  activeCombatant: Combatant | null;
  rangedTargets: Combatant[];
};

const adjacencyReactionCombatants = (tacticalMap: TacticalMapState) => {
  const pending = tacticalMap.pendingAdjacencyReaction;
  return {
    pending,
    defender: tacticalMap.scenario.combatants.find(
      (unit) => unit.id === pending?.defenderIds[0],
    ) ?? null,
    mover: tacticalMap.scenario.combatants.find(
      (unit) => unit.id === pending?.moverId,
    ) ?? null,
  };
};

export const hasTacticalReactionControls = (
  tacticalMap: TacticalMapState,
  activeCombatant: Combatant | null,
) => {
  const { pending, defender, mover } = adjacencyReactionCombatants(tacticalMap);
  return Boolean(
    (pending && defender && mover)
    || (tacticalMap.pendingCoveringFireSnapIds.length > 0 && activeCombatant),
  );
};

export const TacticalReactionControls = ({
  tacticalMap,
  activeCombatant,
  rangedTargets,
}: TacticalReactionControlsProps) => {
  const dispatch = useAppDispatch();
  const { pending, defender, mover } = adjacencyReactionCombatants(tacticalMap);

  if (pending && defender && mover) {
    const completeReaction = (fire: boolean) => {
      dispatch(resolveTacticalAdjacencyReaction(
        buildTacticalAdjacencyReactionRolls(fire),
      ));
      dispatch(runTacticalEnemyPhase(buildTacticalEnemyPhaseRolls(tacticalMap)));
    };

    return <div className="flex flex-col gap-2 border border-red-300/70 p-2">
      <div className="font-bold uppercase tracking-wider text-red-100">Defensive Snap Shot</div>
      <div className="text-(--hud-text-dim)">{mover.name} moved adjacent to {defender.name}.</div>
      <div className="text-red-100">{tacticalMap.actionPointsByCharacterId[defender.id] ?? 0} AP · {tacticalMap.ammunitionByCharacterId[defender.id] ?? 0} ammo</div>
      <div className="grid grid-cols-2 gap-1">
        <button type="button" onClick={() => completeReaction(true)} className="h-7 w-full border border-red-300 px-2 text-[8px] font-bold uppercase tracking-wider text-red-100">Fire · 3 AP</button>
        <button type="button" onClick={() => completeReaction(false)} className="h-7 w-full border border-(--hud-border) px-2 text-[8px] font-bold uppercase tracking-wider text-(--hud-text-dim)">Decline</button>
      </div>
    </div>;
  }

  if (tacticalMap.pendingCoveringFireSnapIds.length > 0 && activeCombatant) {
    const selectedActionPoints = tacticalMap.actionPointsByCharacterId[activeCombatant.id] ?? 0;
    const selectedAmmunition = tacticalMap.ammunitionByCharacterId[activeCombatant.id] ?? 0;
    const completeSnap = (fire: boolean, targetId?: string) => dispatch(
      resolveTacticalCoveringFireSnap(
        buildTacticalCoveringFireSnapRolls(tacticalMap, fire, targetId),
      ),
    );

    return <div className="flex flex-col gap-2 border border-yellow-300/70 p-2">
      <div className="font-bold uppercase tracking-wider text-yellow-100">Retained Covering-Fire AP</div>
      <div className="text-(--hud-text-dim)">{activeCombatant.name} may take one legal snap shot before the next turn, or decline.</div>
      <div className="text-yellow-100">{selectedActionPoints} AP · {selectedAmmunition} ammo</div>
      {rangedTargets.map((target) => <button key={target.id} type="button" onClick={() => completeSnap(true, target.id)} className="h-7 w-full border border-red-300 px-2 text-[8px] font-bold uppercase tracking-wider text-red-100">Snap Shot {target.name} · 3 AP · 1 ammo</button>)}
      {rangedTargets.length === 0 && <div className="text-(--hud-text-dim)">No legal snap-shot target.</div>}
      <button type="button" onClick={() => completeSnap(false)} className="h-7 w-full border border-(--hud-border) px-2 text-[8px] font-bold uppercase tracking-wider text-(--hud-text-dim)">Decline</button>
    </div>;
  }

  return null;
};
