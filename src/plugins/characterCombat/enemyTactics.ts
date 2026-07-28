import type { CombatScenario, Combatant, GridPoint, WeaponRangeBand } from "./types";
import { equipmentVisualFor } from "./equipmentPresentation";
import { snapShotTarget } from "./combatResolution";
import { coverProtection, inFieldOfFire } from "./geometry";

export const distanceBetween = (a: GridPoint, b: GridPoint) => Math.abs(a.x - b.x) + Math.abs(a.y - b.y);

const facings = ["north", "east", "south", "west"] as const;

export const facingTowardFieldOfFire = (unit: Combatant, target: GridPoint) => facings
  .map((facing) => {
    const difference = Math.abs(facings.indexOf(facing) - facings.indexOf(unit.facing));
    return { facing, turns: Math.min(difference, facings.length - difference) };
  })
  .filter(({ facing }) => inFieldOfFire({ position: unit.position, facing }, target))
  .sort((a, b) => a.turns - b.turns || facings.indexOf(a.facing) - facings.indexOf(b.facing))[0] ?? null;

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
