import type { CombatScenario, TacticalMapState, WeaponProfile } from "./types";

type AmmunitionProfile = NonNullable<WeaponProfile["ammunitionProfiles"]>[number];

export const prepareTacticalAmmunition = (scenario: CombatScenario) => {
  const ammunitionByCombatantAndKind: Record<string, Record<string, number>> = {};
  scenario.combatants.forEach((unit) => {
    const profiles = unit.weapon.ammunitionProfiles;
    if (!profiles?.length) return;
    const selectedProfile = profiles.find((profile) => profile.kind === unit.weapon.ammunitionKind) ?? profiles[0];
    applyAmmunitionProfile(unit.weapon, selectedProfile);
    ammunitionByCombatantAndKind[unit.id] = Object.fromEntries(
      profiles.map((profile) => [profile.kind, unit.weapon.magazineSize ?? 12]),
    );
  });
  return ammunitionByCombatantAndKind;
};

export const applyAmmunitionProfile = (weapon: WeaponProfile, profile: AmmunitionProfile) => {
  weapon.ammunitionKind = profile.kind;
  weapon.effectiveRange = profile.effectiveRange;
  weapon.longRange = profile.longRange;
  weapon.extremeRange = profile.extremeRange;
  weapon.penetration = profile.penetration;
  weapon.automatic = profile.automatic ?? false;
  weapon.burstSize = profile.burstSize;
  weapon.automaticFireBonusByRange = profile.automaticFireBonusByRange;
  weapon.inherentAutomaticFireBonus = profile.inherentAutomaticFireBonus;
  weapon.attacksEveryoneInSquare = profile.attacksEveryoneInSquare;
  weapon.accuracy = profile.accuracy;
  weapon.accuracyByRange = profile.accuracyByRange;
  weapon.penetrationByRange = profile.penetrationByRange;
  weapon.woundEscalation = profile.woundEscalation;
  weapon.collateralBlast = profile.collateralBlast;
  weapon.impactMarker = profile.impactMarker;
  weapon.structuralDamage = profile.structuralDamage;
};

export const setTacticalAmmunition = (map: TacticalMapState, unit: CombatScenario["combatants"][number], count: number) => {
  map.ammunitionByCharacterId[unit.id] = count;
  const kind = unit.weapon.ammunitionKind;
  if (!kind) return;
  map.ammunitionByCombatantAndKind[unit.id] ??= {};
  map.ammunitionByCombatantAndKind[unit.id][kind] = count;
};

export const spendTacticalAmmunition = (map: TacticalMapState, unit: CombatScenario["combatants"][number], amount: number) => {
  const current = map.ammunitionByCharacterId[unit.id] ?? 0;
  if (current < amount) return false;
  setTacticalAmmunition(map, unit, current - amount);
  return true;
};

export const reloadTacticalAmmunition = (map: TacticalMapState, unit: CombatScenario["combatants"][number]) => {
  setTacticalAmmunition(map, unit, unit.weapon.magazineSize ?? 12);
};
