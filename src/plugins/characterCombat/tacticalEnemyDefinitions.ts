import { characterCombatArmor, characterCombatWeapons } from "./equipment";
import type { TacticalEnemyPlacement, TacticalEnemyType } from "./tacticalScenarioDefinitions";
import type { Combatant } from "./types";

export const tacticalEnemyAvatarPaths = [
  "/generated/avatars/pool/female/female-athletic-black-black-blue-v1.png",
  "/generated/avatars/pool/female/female-athletic-black-black-blue-v2.png",
  "/generated/avatars/pool/female/female-athletic-black-black-brown-v1.png",
  "/generated/avatars/pool/female/female-athletic-black-black-green-v1.png",
  "/generated/avatars/pool/male/male-athletic-black-black-blue-v1.png",
  "/generated/avatars/pool/male/male-athletic-black-black-blue-v2.png",
  "/generated/avatars/pool/male/male-athletic-black-black-brown-v1.png",
  "/generated/avatars/pool/male/male-athletic-black-black-green-v1.png",
] as const;

export const tacticalEnemyPalette: { id: TacticalEnemyType; label: string; equipment: string }[] = [
  { id: "gang-member", label: "Gang Member", equipment: "Knife" },
  { id: "gang-leader", label: "Gang Leader", equipment: "Body Pistol · Knife" },
];

export const randomTacticalEnemyAvatarPath = (random = Math.random) => tacticalEnemyAvatarPaths[Math.floor(random() * tacticalEnemyAvatarPaths.length)] ?? tacticalEnemyAvatarPaths[0];

export const buildTacticalEnemyCombatant = (placement: TacticalEnemyPlacement): Combatant => {
  const leader = placement.type === "gang-leader";
  return {
    id: placement.id,
    name: placement.name,
    side: "enemy",
    avatarPath: placement.avatarPath,
    position: { ...placement.position },
    facing: "north",
    posture: "standing",
    health: 1,
    defeated: false,
    surrendered: false,
    weapon: { ...(leader ? characterCombatWeapons.bodyPistol : characterCombatWeapons.noRangedWeapon) },
    weaponSkill: leader ? 1 : -1,
    meleeWeapon: { name: "Knife", penetration: 1 },
    meleeRating: 1,
    moraleFactor: 7,
    leadershipRating: leader ? 1 : 0,
    armor: characterCombatArmor.clothing.value,
    armorName: characterCombatArmor.clothing.name,
    grenades: 0,
    medkits: 0,
    woundState: "healthy",
  };
};
