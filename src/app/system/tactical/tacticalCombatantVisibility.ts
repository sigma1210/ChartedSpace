import { pointKey } from "@/plugins/characterCombat/geometry";
import type {
  CombatantMovementAnimation,
  TacticalMapState,
} from "@/plugins/characterCombat/types";

export const tacticalVisibleCombatants = (
  tacticalMap: TacticalMapState,
  visibleEnemyPointKeys: ReadonlySet<string>,
  completedMovements: Readonly<
    Record<string, CombatantMovementAnimation | undefined>
  > = {},
) =>
  tacticalMap.scenario.combatants.filter((combatant) => {
    if (combatant.side === "player") {
      return (
        tacticalMap.scenarioStatus !== "setup" ||
        (tacticalMap.deployedCharacterIds ?? []).includes(combatant.id)
      );
    }

    if (tacticalMap.scenarioStatus === "setup") return false;

    const movement =
      tacticalMap.movementAnimationByCharacterId[combatant.id];
    return (
      visibleEnemyPointKeys.has(pointKey(combatant.position)) ||
      Boolean(
        movement &&
          completedMovements[combatant.id] !== movement &&
          movement.path.some((point) =>
            visibleEnemyPointKeys.has(pointKey(point)),
          ),
      )
    );
  });
