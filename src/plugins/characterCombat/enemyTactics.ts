import type { Combatant, WeaponRangeBand } from "./types";
import { equipmentVisualFor } from "./equipmentPresentation";

export const shouldImproveEnemyRange = (enemy: Combatant, rangeBand: WeaponRangeBand) => {
  const category = equipmentVisualFor(enemy).weaponCategory;
  if (category === "shotgun") return rangeBand === "extreme";
  if (category === "smg") return rangeBand === "long" || rangeBand === "extreme";
  if (category === "pistol") return rangeBand === "extreme";
  return false;
};
