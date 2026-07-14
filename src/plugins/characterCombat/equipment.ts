import type { ArmoryLoadoutId, CombatScenario, WeaponProfile } from "./types";

export const characterCombatWeapons = {
  holdoutPistol: { name: "Holdout Pistol", effectiveRange: 4, longRange: 8, extremeRange: 13, penetration: 1, automatic: false, magazineSize: 6, visualCategory: "pistol", accuracyByRange: { long: -1, extreme: -2 }, penetrationByRange: { effective: 1, long: 0, extreme: 0 } },
  autopistol: { name: "Autopistol", effectiveRange: 6, longRange: 13, extremeRange: 33, penetration: 1, automatic: false, magazineSize: 12, visualCategory: "pistol", penetrationByRange: { effective: 1, long: 0, extreme: 0 } },
  shotgun: { name: "Shotgun", effectiveRange: 20, longRange: 40, extremeRange: 40, penetration: 3, automatic: false, inherentAutomaticFireBonus: true, automaticFireBonusByRange: { effective: 5, long: 2 }, magazineSize: 6, visualCategory: "shotgun", penetrationByRange: { effective: 3, long: 0, extreme: 0 } },
  smg: { name: "Submachine Gun", effectiveRange: 13, longRange: 26, extremeRange: 40, penetration: 2, automatic: true, automaticFireBonusByRange: { effective: 4, long: 3, extreme: 1 }, magazineSize: 30, visualCategory: "smg", penetrationByRange: { effective: 2, long: 1, extreme: 0 } },
  laserRifle: { name: "Laser Rifle", effectiveRange: 400, longRange: 800, extremeRange: 800, penetration: 6, automatic: false, magazineSize: 20, visualCategory: "laser-rifle", accuracy: 1, penetrationByRange: { effective: 6, long: 3, extreme: 3 } },
  gaussRifle: { name: "Gauss Rifle", effectiveRange: 266, longRange: 533, extremeRange: 533, penetration: 6, automatic: true, automaticFireBonusByRange: { effective: 3, long: 2 }, magazineSize: 20, visualCategory: "gauss-rifle", penetrationByRange: { effective: 6, long: 3, extreme: 3 } },
  plasmaGun: { name: "Plasma Gun", effectiveRange: 200, longRange: 400, extremeRange: 666, penetration: 12, penetrationByRange: { effective: 12, long: 8, extreme: 4 }, automatic: false, highEnergy: true, enhancedVision: true, collateralBlast: true, magazineSize: 4, visualCategory: "rifle" },
  fusionGun: { name: "Fusion Gun", effectiveRange: 200, longRange: 400, extremeRange: 666, penetration: 14, penetrationByRange: { effective: 14, long: 10, extreme: 6 }, automatic: false, highEnergy: true, enhancedVision: true, collateralBlast: true, magazineSize: 4, visualCategory: "rifle" },
  actionRam: {
    name: "4cm RAM", effectiveRange: 200, longRange: 400, extremeRange: 600, penetration: 3, penetrationByRange: { effective: 3, long: 3, extreme: 3 }, automatic: false, magazineSize: 4, visualCategory: "rifle", ammunitionKind: "he", woundEscalation: true, collateralBlast: true,
    ammunitionProfiles: [
      { kind: "he", label: "HE", effectiveRange: 200, longRange: 400, extremeRange: 600, penetration: 3, penetrationByRange: { effective: 3, long: 3, extreme: 3 }, woundEscalation: true, collateralBlast: true },
      { kind: "heap", label: "HEAP", effectiveRange: 200, longRange: 400, extremeRange: 400, penetration: 8, penetrationByRange: { effective: 8, long: 8, extreme: 8 }, woundEscalation: true, collateralBlast: false },
      { kind: "flechette", label: "Flechette", effectiveRange: 50, longRange: 100, extremeRange: 100, penetration: 2, automatic: true, automaticFireBonusByRange: { effective: 3, long: 1, extreme: 0 }, penetrationByRange: { effective: 2, long: 0, extreme: 0 } },
    ],
  },
  lightAssaultGun: {
    name: "Light Assault Gun", effectiveRange: 220, longRange: 440, extremeRange: 800, penetration: 6, penetrationByRange: { effective: 6, long: 4, extreme: 2 }, automatic: false, magazineSize: 4, visualCategory: "rifle", ammunitionKind: "discard-sabot",
    ammunitionProfiles: [
      { kind: "discard-sabot", label: "Discard Sabot", effectiveRange: 220, longRange: 440, extremeRange: 800, penetration: 6, penetrationByRange: { effective: 6, long: 4, extreme: 2 } },
      { kind: "he", label: "HE", effectiveRange: 200, longRange: 400, extremeRange: 600, penetration: 3, penetrationByRange: { effective: 3, long: 3, extreme: 1 }, woundEscalation: true, collateralBlast: true },
      { kind: "flechette", label: "Flechette", effectiveRange: 50, longRange: 100, extremeRange: 100, penetration: 2, automatic: true, automaticFireBonusByRange: { effective: 3, long: 1, extreme: 0 }, penetrationByRange: { effective: 2, long: 0, extreme: 0 } },
    ],
  },
} satisfies Record<string, WeaponProfile>;

export const characterCombatArmor = {
  clothing: { name: "Clothing", value: 0 },
  flakVest: { name: "Flak Vest", value: 4 },
  combatArmor: { name: "Combat Armor", value: 6 },
  battleDress: { name: "Battle Dress", value: 8 },
} as const;

export const armoryLoadouts: Record<ArmoryLoadoutId, { id: ArmoryLoadoutId; label: string; weapon: WeaponProfile; armor: { name: string; value: number } }> = {
  scout: { id: "scout", label: "Scout", weapon: characterCombatWeapons.laserRifle, armor: characterCombatArmor.flakVest },
  breacher: { id: "breacher", label: "Breacher", weapon: characterCombatWeapons.shotgun, armor: characterCombatArmor.combatArmor },
  assault: { id: "assault", label: "Assault", weapon: characterCombatWeapons.smg, armor: characterCombatArmor.combatArmor },
  heavy: { id: "heavy", label: "Heavy", weapon: characterCombatWeapons.gaussRifle, armor: characterCombatArmor.battleDress },
  plasma: { id: "plasma", label: "Plasma", weapon: characterCombatWeapons.plasmaGun, armor: characterCombatArmor.combatArmor },
  fusion: { id: "fusion", label: "Fusion", weapon: characterCombatWeapons.fusionGun, armor: characterCombatArmor.combatArmor },
  "action-ram": { id: "action-ram", label: "RAM", weapon: characterCombatWeapons.actionRam, armor: characterCombatArmor.combatArmor },
  lag: { id: "lag", label: "LAG", weapon: characterCombatWeapons.lightAssaultGun, armor: characterCombatArmor.combatArmor },
};

export const applyArmoryLoadouts = (scenario: CombatScenario, loadoutIds: ArmoryLoadoutId[]) => {
  const players = scenario.combatants.filter((unit) => unit.side === "player");
  players.slice(0, Math.min(5, loadoutIds.length)).forEach((unit, index) => {
    const loadout = armoryLoadouts[loadoutIds[index]];
    unit.weapon = { ...loadout.weapon };
    unit.armor = loadout.armor.value;
    unit.armorName = loadout.armor.name;
  });
  if (scenario.id === "suppress-strongpoint") {
    players[0].smokeGrenades = 1;
    players[2].smokeGrenades = 1;
    players[3].stunGrenades = 1;
    const enemies = scenario.combatants.filter((unit) => unit.side === "enemy");
    enemies[1].smokeGrenades = 1;
    enemies[3].smokeGrenades = 1;
  }
  if (scenario.id === "capture-commander") {
    players[2].stunGrenades = 1;
    players[3].stunGrenades = 1;
  }
  return scenario;
};
