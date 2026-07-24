import { characterCombatArmor, characterCombatWeapons } from "./equipment";
import type { CombatSide, Combatant, GridPoint } from "./types";

export const tacticalHumanWeaponIds = ["noRangedWeapon", "bodyPistol", "holdoutPistol", "autopistol", "shotgun", "smg", "laserRifle", "gaussRifle", "plasmaGun", "fusionGun", "actionRam", "lightAssaultGun"] as const;
export const tacticalHumanArmorIds = ["clothing", "flakVest", "combatArmor", "battleDress"] as const;
export type TacticalHumanWeaponId = typeof tacticalHumanWeaponIds[number];
export type TacticalHumanArmorId = typeof tacticalHumanArmorIds[number];

export interface TacticalInteractiveHumanCombatProfile {
  weaponId: TacticalHumanWeaponId;
  weaponSkill: number;
  armorId: TacticalHumanArmorId;
  meleeWeaponName: string;
  meleePenetration: number;
  meleeRating: number;
  moraleFactor: number;
  leadershipRating: number;
  skills: { name: string; level: number }[];
}

export const defaultTacticalInteractiveHumanCombatProfile: TacticalInteractiveHumanCombatProfile = {
  weaponId: "bodyPistol",
  weaponSkill: 0,
  armorId: "clothing",
  meleeWeaponName: "Unarmed",
  meleePenetration: 0,
  meleeRating: 0,
  moraleFactor: 7,
  leadershipRating: 0,
  skills: [],
};

export const tacticalHumanWeaponOptions = tacticalHumanWeaponIds.map((id) => ({ id, label: characterCombatWeapons[id].name }));
export const tacticalHumanArmorOptions = tacticalHumanArmorIds.map((id) => ({ id, label: characterCombatArmor[id].name }));

export const validateTacticalInteractiveHumanCombatProfile = (profile: TacticalInteractiveHumanCombatProfile) => {
  if (!tacticalHumanWeaponIds.includes(profile.weaponId)) throw new Error(`Unknown interactive-human weapon: ${profile.weaponId}.`);
  if (!tacticalHumanArmorIds.includes(profile.armorId)) throw new Error(`Unknown interactive-human armor: ${profile.armorId}.`);
  if (!profile.meleeWeaponName.trim()) throw new Error("Interactive-human melee weapon requires a name.");
  for (const [label, value] of [["weapon skill", profile.weaponSkill], ["melee penetration", profile.meleePenetration], ["melee rating", profile.meleeRating], ["morale", profile.moraleFactor], ["leadership", profile.leadershipRating]] as const) {
    if (!Number.isInteger(value)) throw new Error(`Interactive-human ${label} must be an integer.`);
  }
  profile.skills.forEach((skill) => {
    if (!skill.name.trim() || !Number.isInteger(skill.level)) throw new Error("Interactive-human skills require a name and integer level.");
  });
  return profile;
};

export const buildTransformedInteractiveHuman = ({ id, name, side, position, modelPath, profile }: { id: string; name: string; side: CombatSide; position: GridPoint; modelPath?: string; profile: TacticalInteractiveHumanCombatProfile }): Combatant => {
  validateTacticalInteractiveHumanCombatProfile(profile);
  const weapon = characterCombatWeapons[profile.weaponId];
  const armor = characterCombatArmor[profile.armorId];
  return {
    id,
    name,
    side,
    modelPath,
    position: { ...position },
    facing: "north",
    posture: "standing",
    health: 1,
    defeated: false,
    surrendered: false,
    weapon: { ...weapon },
    weaponSkill: profile.weaponSkill,
    skills: profile.skills.map((skill) => ({ ...skill })),
    meleeWeapon: { name: profile.meleeWeaponName, penetration: profile.meleePenetration },
    meleeRating: profile.meleeRating,
    moraleFactor: profile.moraleFactor,
    leadershipRating: profile.leadershipRating,
    armor: armor.value,
    armorName: armor.name,
    grenades: 0,
    smokeGrenades: 0,
    medkits: 0,
    woundState: "healthy",
  };
};
