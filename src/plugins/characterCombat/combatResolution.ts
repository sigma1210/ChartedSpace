import type { Combatant, FireMode, WeaponProfile, WeaponRangeBand, WoundState } from "./types";

export interface DicePair { first: number; second: number }
export type AttackArc = "front" | "side" | "rear";
export interface SnapShotResult { hit: boolean; hitRoll: number; hitModifier: number; hitTotal: number; targetNumber: number; range: number; rangeBand: WeaponRangeBand; weaponAccuracy: number; weaponPenetration: number; attackArc: AttackArc; arcModifier: number; evadeModifier: number; postureModifier: number; bracedModifier: number; visibilityModifier: number; readyModifier: number; aimModifier: number; situationalHitModifier: number; situationalWoundModifier: number; woundRoll: number | null; woundTotal: number | null; cover: number; woundState: WoundState }
export interface MeleeResult { roll: number; modifier: number; total: number; attackArc: AttackArc; arcModifier: number; postureModifier: number; techniqueHitModifier: number; techniquePenetration: number; defenderModifier: number; woundState: WoundState }

export const rollDicePair = (): DicePair => ({ first: Math.floor(Math.random() * 6) + 1, second: Math.floor(Math.random() * 6) + 1 });
export const distanceInSquares = (attacker: Combatant, target: Combatant) => Math.ceil(Math.hypot(target.position.x - attacker.position.x, target.position.y - attacker.position.y));
const facingVector: Record<Combatant["facing"], { x: number; y: number }> = { north: { x: 0, y: -1 }, east: { x: 1, y: 0 }, south: { x: 0, y: 1 }, west: { x: -1, y: 0 } };
export const attackArcAgainstTarget = (attacker: Pick<Combatant, "position">, target: Pick<Combatant, "position" | "facing">): AttackArc => {
  const direction = facingVector[target.facing];
  const offset = { x: attacker.position.x - target.position.x, y: attacker.position.y - target.position.y };
  const forward = offset.x * direction.x + offset.y * direction.y;
  const sideways = offset.x * -direction.y + offset.y * direction.x;
  if (forward >= Math.abs(sideways)) return "front";
  if (-forward >= Math.abs(sideways)) return "rear";
  return "side";
};
export const attackArcModifier = (arc: AttackArc) => arc === "rear" ? 2 : arc === "side" ? 1 : 0;

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
export const resolveMelee = (attacker: Combatant, target: Combatant, die: number, attackerSuppressed = false, techniqueHitModifier = 0, techniquePenetration = attacker.meleeWeapon.penetration, defenderModifier = 0): MeleeResult => {
  const attackArc = attackArcAgainstTarget(attacker, target);
  const arcModifier = attackArcModifier(attackArc);
  const postureModifier = (attacker.posture === "prone" ? -2 : 0) + (target.posture === "prone" ? 2 : 0);
  const modifier = attacker.meleeRating - target.meleeRating + techniquePenetration - target.armor - (attacker.woundState === "light" ? 1 : 0) + arcModifier + postureModifier + techniqueHitModifier + defenderModifier - (attackerSuppressed ? 1 : 0);
  const total = die + modifier;
  const woundState: WoundState = total <= 2 ? "healthy" : total <= 4 ? "light" : total === 5 ? "serious" : total === 6 ? "unconscious" : "dead";
  return { roll: die, modifier, total, attackArc, arcModifier, postureModifier, techniqueHitModifier, techniquePenetration, defenderModifier, woundState };
};

export const resolveSnapShot = (attacker: Combatant, target: Combatant, hitDice: DicePair, woundDice: DicePair, cover = 0, fireMode: FireMode = "snap", targetEvading = false, attackerSuppressed = false, attackerBraced = false, visibilityModifier = 0, attackerReady = false, attackerAimed = false, situationalHitModifier = 0, situationalWoundModifier = 0): SnapShotResult | null => {
  const profile = snapShotTarget(attacker, target);
  if (!profile) return null;
  const hitRoll = hitDice.first + hitDice.second;
  const weaponAccuracy = weaponAccuracyForRange(attacker.weapon, profile.rangeBand);
  const weaponPenetration = weaponPenetrationForRange(attacker.weapon, profile.rangeBand);
  const attackArc = attackArcAgainstTarget(attacker, target);
  const arcModifier = attackArcModifier(attackArc);
  const evadeModifier = targetEvading ? -2 : 0;
  const postureModifier = target.posture === "prone" ? -2 : 0;
  const bracedModifier = attackerBraced ? 1 : 0;
  const readyModifier = attackerReady ? 1 : 0;
  const aimModifier = attackerAimed ? 1 : 0;
  const hitModifier = attacker.weaponSkill + weaponAccuracy - (attacker.woundState === "light" ? 1 : 0) - (fireMode === "snap" ? 1 : 0) - (fireMode === "covering" || fireMode === "suppressive" ? 2 : 0) + (fireMode === "automatic" ? 4 : 0) + arcModifier + evadeModifier + postureModifier + bracedModifier + readyModifier + aimModifier + visibilityModifier + situationalHitModifier - (attackerSuppressed ? 1 : 0);
  const hitTotal = hitRoll + hitModifier;
  if (hitTotal < profile.targetNumber) return { ...profile, hit: false, hitRoll, hitModifier, hitTotal, weaponAccuracy, weaponPenetration, attackArc, arcModifier, evadeModifier, postureModifier, bracedModifier, visibilityModifier, readyModifier, aimModifier, situationalHitModifier, situationalWoundModifier, woundRoll: null, woundTotal: null, cover, woundState: target.woundState };
  const woundRoll = woundDice.first + woundDice.second;
  const woundTotal = woundRoll + weaponPenetration - target.armor - cover + situationalWoundModifier;
  return { ...profile, hit: true, hitRoll, hitModifier, hitTotal, weaponAccuracy, weaponPenetration, attackArc, arcModifier, evadeModifier, postureModifier, bracedModifier, visibilityModifier, readyModifier, aimModifier, situationalHitModifier, situationalWoundModifier, woundRoll, woundTotal, cover, woundState: woundStateForTotal(woundTotal) };
};
