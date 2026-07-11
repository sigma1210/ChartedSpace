import type { Combatant, FireMode, WeaponProfile, WeaponRangeBand, WoundState } from "./types";

export interface DicePair { first: number; second: number }
export interface SnapShotResult { hit: boolean; hitRoll: number; hitModifier: number; hitTotal: number; targetNumber: number; range: number; rangeBand: WeaponRangeBand; weaponAccuracy: number; weaponPenetration: number; woundRoll: number | null; woundTotal: number | null; cover: number; woundState: WoundState }
export interface MeleeResult { roll: number; modifier: number; total: number; woundState: WoundState }

export const rollDicePair = (): DicePair => ({ first: Math.floor(Math.random() * 6) + 1, second: Math.floor(Math.random() * 6) + 1 });
export const distanceInSquares = (attacker: Combatant, target: Combatant) => Math.ceil(Math.hypot(target.position.x - attacker.position.x, target.position.y - attacker.position.y));

export const snapShotTarget = (attacker: Combatant, target: Combatant) => {
  const range = distanceInSquares(attacker, target);
  if (range <= attacker.weapon.effectiveRange) return { range, rangeBand: "effective" as const, targetNumber: 8 };
  if (range <= attacker.weapon.longRange) return { range, rangeBand: "long" as const, targetNumber: 10 };
  if (range <= attacker.weapon.extremeRange) return { range, rangeBand: "extreme" as const, targetNumber: 12 };
  return null;
};
export const weaponAccuracyForRange = (weapon: WeaponProfile, rangeBand: WeaponRangeBand) => (weapon.accuracy ?? 0) + (weapon.accuracyByRange?.[rangeBand] ?? 0);
export const weaponPenetrationForRange = (weapon: WeaponProfile, rangeBand: WeaponRangeBand) => weapon.penetrationByRange?.[rangeBand] ?? weapon.penetration;

export const woundStateForTotal = (total: number): WoundState => total <= 4 ? "healthy" : total <= 6 ? "light" : total <= 8 ? "serious" : total <= 10 ? "unconscious" : "dead";
export const resolveMelee = (attacker: Combatant, target: Combatant, die: number): MeleeResult => {
  const modifier = attacker.meleeRating - target.meleeRating + attacker.meleeWeapon.penetration - target.armor - (attacker.woundState === "light" ? 1 : 0);
  const total = die + modifier;
  const woundState: WoundState = total <= 2 ? "healthy" : total <= 4 ? "light" : total === 5 ? "serious" : total === 6 ? "unconscious" : "dead";
  return { roll: die, modifier, total, woundState };
};

export const resolveSnapShot = (attacker: Combatant, target: Combatant, hitDice: DicePair, woundDice: DicePair, cover = 0, fireMode: FireMode = "snap"): SnapShotResult | null => {
  const profile = snapShotTarget(attacker, target);
  if (!profile) return null;
  const hitRoll = hitDice.first + hitDice.second;
  const weaponAccuracy = weaponAccuracyForRange(attacker.weapon, profile.rangeBand);
  const weaponPenetration = weaponPenetrationForRange(attacker.weapon, profile.rangeBand);
  const hitModifier = attacker.weaponSkill + weaponAccuracy - (attacker.woundState === "light" ? 1 : 0) - (fireMode === "snap" ? 1 : 0) - (fireMode === "covering" ? 2 : 0) + (fireMode === "automatic" ? 4 : 0);
  const hitTotal = hitRoll + hitModifier;
  if (hitTotal < profile.targetNumber) return { ...profile, hit: false, hitRoll, hitModifier, hitTotal, weaponAccuracy, weaponPenetration, woundRoll: null, woundTotal: null, cover, woundState: target.woundState };
  const woundRoll = woundDice.first + woundDice.second;
  const woundTotal = woundRoll + weaponPenetration - target.armor - cover;
  return { ...profile, hit: true, hitRoll, hitModifier, hitTotal, weaponAccuracy, weaponPenetration, woundRoll, woundTotal, cover, woundState: woundStateForTotal(woundTotal) };
};
