import type { CombatScenario, Combatant, WeaponRangeBand } from "./types";
import { equipmentVisualFor } from "./equipmentPresentation";
import { snapShotTarget } from "./combatResolution";
import { coverProtection } from "./geometry";

export const shouldImproveEnemyRange = (enemy: Combatant, rangeBand: WeaponRangeBand) => {
  const category = equipmentVisualFor(enemy).weaponCategory;
  if (category === "shotgun") return rangeBand === "extreme";
  if (category === "smg") return rangeBand === "long" || rangeBand === "extreme";
  if (category === "pistol") return rangeBand === "extreme";
  return false;
};

export const compareEnemyRangedTargets = (scenario: CombatScenario, enemy: Combatant, a: Combatant, b: Combatant, evadingCombatantIds: string[]) => {
  const score = (target: Combatant) => {
    const profile = snapShotTarget(enemy, target);
    return {
      difficulty: (profile?.targetNumber ?? Number.POSITIVE_INFINITY) + coverProtection(scenario, enemy.id, target.id) + (target.posture === "prone" ? 2 : 0) + (evadingCombatantIds.includes(target.id) ? 2 : 0),
      distance: Math.abs(enemy.position.x - target.position.x) + Math.abs(enemy.position.y - target.position.y),
    };
  };
  const first = score(a);
  const second = score(b);
  return first.difficulty - second.difficulty || first.distance - second.distance || a.id.localeCompare(b.id);
};
