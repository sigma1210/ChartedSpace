import { pointKey } from "@/plugins/characterCombat/geometry";
import type {
  CombatantMovementAnimation,
  TacticalMapState,
} from "@/plugins/characterCombat/types";

export const tacticalVisibleCombatants = (
  tacticalMap: TacticalMapState,
  crewVisibility: ReadonlyMap<string, unknown>,
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

    const movement =
      tacticalMap.movementAnimationByCharacterId[combatant.id];
    return (
      crewVisibility.has(pointKey(combatant.position)) ||
      Boolean(
        movement &&
          completedMovements[combatant.id] !== movement &&
          movement.path.some((point) =>
            crewVisibility.has(pointKey(point)),
          ),
      )
    );
  });
