import Image from "next/image";
import { useState } from "react";
import { FloatingPluginHud } from "@/components/hud/FloatingPluginHud";
import {
  meleeEnemies,
  tacticalRangedEnemies,
  tacticalVisibilityAssessment,
} from "@/plugins/characterCombat/geometry";
import {
  previewTacticalMelee,
  selectTacticalAttackTarget,
  updateTacticalEnemyHud,
} from "@/plugins/characterCombat/slice";
import type { Combatant, TacticalMapState } from "@/plugins/characterCombat/types";
import { useAppDispatch } from "@/store/hooks";

const TacticalEnemyStatusCard = ({
  combatant,
  state,
  sight,
  selected,
  onSelect,
}: {
  combatant: Combatant;
  state: string;
  sight: "target" | "los" | "no-los";
  selected: boolean;
  onSelect: () => void;
}) => {
  const [failedPortraitPath, setFailedPortraitPath] = useState<string | null>(null);
  const wound = `${combatant.woundState}${(combatant.seriousWounds ?? 0) > 0 ? ` · serious ${combatant.seriousWounds}/2` : ""}`;
  const sightLabel = sight === "target" ? "Target" : sight === "los" ? "LOS" : "No LOS";
  const portraitPath = combatant.avatarPath ?? null;
  const showPortrait = portraitPath && failedPortraitPath !== portraitPath;

  return (
    <button
      type="button"
      disabled={sight !== "target"}
      onClick={onSelect}
      aria-label={`${sight === "target" ? "Target" : "Enemy"} ${combatant.name}, ${sightLabel}, state ${state}, wound ${wound}`}
      aria-pressed={selected}
      className={`relative flex h-16 w-24 shrink-0 flex-col justify-end border p-1 text-left transition-colors ${selected ? "border-red-100 bg-red-500/25 text-red-50 shadow-[0_0_12px_rgba(248,113,113,0.4)]" : sight === "target" ? "border-red-300 bg-red-950/80 text-red-100 hover:bg-red-900/80" : sight === "los" ? "border-red-500/50 bg-red-950/50 text-red-200" : "border-slate-600/60 bg-slate-950/80 text-slate-500"} disabled:cursor-not-allowed`}
    >
      <span className="absolute left-1 top-1 flex h-7 w-7 items-center justify-center overflow-hidden border border-red-400/40 bg-black/60 text-xs font-bold uppercase">
        {showPortrait ? <Image src={portraitPath} alt="" fill sizes="28px" onError={() => setFailedPortraitPath(portraitPath)} className="object-cover" /> : combatant.name.slice(0, 1)}
      </span>
      <span className={`absolute right-1 top-1 border px-1 text-[6px] font-bold uppercase ${sight === "target" ? "border-red-300 bg-red-950 text-red-100" : sight === "los" ? "border-amber-300/70 bg-amber-950 text-amber-100" : "border-slate-600 bg-slate-950 text-slate-400"}`}>{sightLabel}</span>
      <span className="w-full truncate text-[7px] font-bold leading-none">{combatant.name}</span>
      <span className="mt-1 w-full truncate text-[6px] uppercase leading-none">State: {state}</span>
      <span className="mt-0.5 w-full truncate text-[6px] uppercase leading-none">Wound: {wound}</span>
    </button>
  );
};

const tacticalEnemyState = (
  tacticalMap: TacticalMapState,
  enemy: Combatant,
) => enemy.surrendered
  ? "Surrendered"
  : enemy.woundState === "dead"
    ? "Dead"
    : enemy.defeated
      ? "Incapacitated"
      : tacticalMap.ahlMeleeStunUntilTurnById[enemy.id]
        ? "Stunned"
        : tacticalMap.suppressedCombatantIds.includes(enemy.id)
          ? "Suppressed"
          : enemy.posture === "prone"
            ? "Prone"
            : "Active";

export const TacticalEnemyRosterHud = ({
  tacticalMap,
  enemies,
  visibleEnemies,
  activeCombatant,
}: {
  tacticalMap: TacticalMapState;
  enemies: Combatant[];
  visibleEnemies: Combatant[];
  activeCombatant: Combatant | null;
}) => {
  const dispatch = useAppDispatch();
  const draggedCombatant = activeCombatant
    ? tacticalMap.scenario.combatants.find(
        (unit) => unit.id === tacticalMap.draggingCombatantByCarrierId[activeCombatant.id],
      ) ?? null
    : null;
  const rangedTargets = activeCombatant && !draggedCombatant
    ? tacticalRangedEnemies(tacticalMap.scenario, activeCombatant.id)
    : [];
  const meleeTargets = activeCombatant && !draggedCombatant
    ? meleeEnemies(tacticalMap.scenario, activeCombatant.id)
    : [];
  const rangedTargetIds = new Set(rangedTargets.map((unit) => unit.id));
  const meleeTargetIds = new Set(meleeTargets.map((unit) => unit.id));

  return (
    <FloatingPluginHud
      title="Enemies"
      layout={tacticalMap.enemyHudLayout}
      onLayoutChange={(layout) => dispatch(updateTacticalEnemyHud(layout))}
      className="font-mono text-[8px] uppercase tracking-wider text-(--hud-text)"
    >
      <nav aria-label="Tactical enemy roster" className="flex max-w-[75vw] gap-1 overflow-x-auto p-1">
        {visibleEnemies.map((enemy) => {
          const targetable = rangedTargetIds.has(enemy.id) || meleeTargetIds.has(enemy.id);
          const inLineOfSight = Boolean(
            activeCombatant
            && tacticalVisibilityAssessment(
              tacticalMap.scenario,
              activeCombatant,
              enemy,
            ).observable,
          );
          const sight = targetable ? "target" as const : inLineOfSight ? "los" as const : "no-los" as const;
          return (
            <TacticalEnemyStatusCard
              key={enemy.id}
              combatant={enemy}
              state={tacticalEnemyState(tacticalMap, enemy)}
              sight={sight}
              selected={
                tacticalMap.plannedAttackTargetId === enemy.id
                || tacticalMap.plannedMeleeTargetId === enemy.id
              }
              onSelect={() => {
                if (rangedTargetIds.has(enemy.id)) {
                  dispatch(selectTacticalAttackTarget(enemy.id));
                } else if (meleeTargetIds.has(enemy.id)) {
                  dispatch(previewTacticalMelee(enemy.id));
                }
              }}
            />
          );
        })}
        {enemies.length === 0 && <span className="px-3 py-4 text-(--hud-text-dim)">No enemies</span>}
      </nav>
    </FloatingPluginHud>
  );
};
