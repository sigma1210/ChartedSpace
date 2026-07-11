import type { ArmoryLoadoutId, CombatScenario, WeaponProfile } from "./types";

export const characterCombatWeapons = {
  holdoutPistol: { name: "Holdout Pistol", effectiveRange: 2, longRange: 4, extremeRange: 6, penetration: 0, automatic: false, magazineSize: 6, visualCategory: "pistol", accuracyByRange: { long: -1, extreme: -2 } },
  autopistol: { name: "Autopistol", effectiveRange: 3, longRange: 6, extremeRange: 9, penetration: 1, automatic: false, magazineSize: 12, visualCategory: "pistol" },
  shotgun: { name: "Shotgun", effectiveRange: 2, longRange: 4, extremeRange: 6, penetration: 2, automatic: false, magazineSize: 6, visualCategory: "shotgun", penetrationByRange: { effective: 3, long: 1, extreme: 0 } },
  smg: { name: "Submachine Gun", effectiveRange: 3, longRange: 6, extremeRange: 8, penetration: 1, automatic: true, magazineSize: 30, visualCategory: "smg" },
  laserRifle: { name: "Laser Rifle", effectiveRange: 6, longRange: 12, extremeRange: 18, penetration: 2, automatic: false, magazineSize: 20, visualCategory: "laser-rifle", accuracy: 1 },
  gaussRifle: { name: "Gauss Rifle", effectiveRange: 6, longRange: 12, extremeRange: 20, penetration: 4, automatic: true, magazineSize: 20, visualCategory: "gauss-rifle" },
} satisfies Record<string, WeaponProfile>;

export const characterCombatArmor = {
  clothing: { name: "Clothing", value: 0 },
  flakVest: { name: "Flak Vest", value: 1 },
  combatArmor: { name: "Combat Armor", value: 2 },
  battleDress: { name: "Battle Dress", value: 4 },
} as const;

export const armoryLoadouts: Record<ArmoryLoadoutId, { id: ArmoryLoadoutId; label: string; weapon: WeaponProfile; armor: { name: string; value: number } }> = {
  scout: { id: "scout", label: "Scout", weapon: characterCombatWeapons.laserRifle, armor: characterCombatArmor.flakVest },
  breacher: { id: "breacher", label: "Breacher", weapon: characterCombatWeapons.shotgun, armor: characterCombatArmor.combatArmor },
  assault: { id: "assault", label: "Assault", weapon: characterCombatWeapons.smg, armor: characterCombatArmor.combatArmor },
  heavy: { id: "heavy", label: "Heavy", weapon: characterCombatWeapons.gaussRifle, armor: characterCombatArmor.battleDress },
};

export const applyArmoryLoadouts = (scenario: CombatScenario, loadoutIds: [ArmoryLoadoutId, ArmoryLoadoutId]) => {
  if (scenario.id !== "armory-sweep" && scenario.id !== "capture-the-bridge") return scenario;
  scenario.combatants.filter((unit) => unit.side === "player").slice(0, 2).forEach((unit, index) => {
    const loadout = armoryLoadouts[loadoutIds[index]];
    unit.weapon = { ...loadout.weapon };
    unit.armor = loadout.armor.value;
    unit.armorName = loadout.armor.name;
  });
  return scenario;
};
