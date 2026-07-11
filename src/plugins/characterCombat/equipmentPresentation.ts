import type { Combatant, WeaponVisualCategory } from "./types";

const fallbackCategory = (name: string): WeaponVisualCategory => {
  const normalized = name.toLowerCase();
  if (normalized.includes("shotgun")) return "shotgun";
  if (normalized.includes("submachine") || normalized.includes("smg")) return "smg";
  if (normalized.includes("laser")) return "laser-rifle";
  if (normalized.includes("gauss")) return "gauss-rifle";
  if (normalized.includes("rifle") || normalized.includes("carbine")) return "rifle";
  return "pistol";
};

export const equipmentVisualFor = (combatant: Combatant) => {
  const weaponCategory = combatant.weapon.visualCategory ?? fallbackCategory(combatant.weapon.name);
  const weaponLabel: Record<WeaponVisualCategory, string> = { pistol: "PST", shotgun: "SG", smg: "SMG", rifle: "RFL", "laser-rifle": "LSR", "gauss-rifle": "GSS" };
  const armorClass = combatant.armor >= 4 ? "battle-dress" : combatant.armor >= 2 ? "combat" : combatant.armor >= 1 ? "flak" : "light";
  return { weaponCategory, weaponLabel: weaponLabel[weaponCategory], armorClass, armorLabel: combatant.armorName ?? `Armor ${combatant.armor}` } as const;
};
