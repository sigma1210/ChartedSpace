import type { Combatant, FireMode, WeaponProfile, WeaponRangeBand, WoundState } from "./types";

export interface DicePair { first: number; second: number }
export type AttackArc = "front" | "side" | "rear";
export interface SnapShotResult { hit: boolean; hitRoll: number; hitModifier: number; hitTotal: number; targetNumber: number; range: number; rangeBand: WeaponRangeBand; weaponAccuracy: number; weaponPenetration: number; attackArc: AttackArc; arcModifier: number; evadeModifier: number; postureModifier: number; bracedModifier: number; visibilityModifier: number; readyModifier: number; aimModifier: number; situationalHitModifier: number; situationalWoundModifier: number; woundRoll: number | null; woundTotal: number | null; cover: number; woundState: WoundState }
export type AhlMeleeEffect = "none" | "stun" | "light" | "unconscious" | "dead";
export interface AhlMeleeResult { roll: number; modifiedRoll: number; differential: number; tableDifferential: -6 | -4 | -2 | 0 | 1 | 3 | 5 | 7 | 9; armorColumnShift: number; effect: AhlMeleeEffect }
export interface AhlMoraleResult { roll: number; baseMorale: number; lightWoundModifier: 0 | -1; leadershipModifier: number; modifiedMorale: number; passed: boolean }

export const resolveAhlMoraleCheck = (combatant: { moraleFactor: number; woundState: WoundState }, dice: DicePair, leadershipModifier = 0): AhlMoraleResult => {
  const roll = dice.first + dice.second;
  const lightWoundModifier = combatant.woundState === "light" ? -1 : 0;
  const modifiedMorale = combatant.moraleFactor + lightWoundModifier + leadershipModifier;
  return { roll, baseMorale: combatant.moraleFactor, lightWoundModifier, leadershipModifier, modifiedMorale, passed: roll <= modifiedMorale };
};
export const distanceInSquares = (attacker: Combatant, target: Combatant) => {
  const horizontal = Math.abs(target.position.x - attacker.position.x);
  const vertical = Math.abs(target.position.y - attacker.position.y);
  const diagonalSquares = Math.min(horizontal, vertical);
  const straightSquares = Math.max(horizontal, vertical) - diagonalSquares;
  return Math.ceil(straightSquares + diagonalSquares * 1.5);
};
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
const defaultAutomaticFireBonuses: Partial<Record<WeaponRangeBand, number>> = { effective: 4, long: 3, extreme: 1 };
export const automaticFireModifierForRange = (rangeBand: WeaponRangeBand, bonuses: Partial<Record<WeaponRangeBand, number>> = defaultAutomaticFireBonuses) => bonuses[rangeBand] ?? null;

export const woundStateForTotal = (total: number): WoundState => total <= 4 ? "healthy" : total <= 7 ? "light" : total <= 11 ? "serious" : "dead";
export const escalateWoundState = (woundState: WoundState): WoundState => woundState === "healthy" ? "light" : woundState === "light" ? "serious" : "dead";
export interface AccumulatedWound { woundState: WoundState; seriousWounds: number }
export const accumulateWound = (current: WoundState, incoming: WoundState, recordedSeriousWounds?: number): AccumulatedWound => {
  const seriousWounds = recordedSeriousWounds ?? (current === "serious" || current === "unconscious" ? 1 : current === "dead" ? 2 : 0);
  if (current === "dead" || incoming === "dead") return { woundState: "dead", seriousWounds: Math.max(2, seriousWounds) };
  if (incoming === "serious" || incoming === "unconscious") {
    if (seriousWounds >= 1) return { woundState: "dead", seriousWounds: 2 };
    return { woundState: incoming, seriousWounds: 1 };
  }
  if (current === "serious" || current === "unconscious") return { woundState: current, seriousWounds: Math.max(1, seriousWounds) };
  if (current === "light" || incoming === "light") return { woundState: "light", seriousWounds: 0 };
  return { woundState: "healthy", seriousWounds: 0 };
};
const meleeDifferentials = [-6, -4, -2, 0, 1, 3, 5, 7, 9] as const;
const meleeTable: Record<(typeof meleeDifferentials)[number], AhlMeleeEffect[]> = {
  [-6]: ["none", "none", "none", "none", "none", "stun"],
  [-4]: ["none", "none", "none", "none", "stun", "stun"],
  [-2]: ["none", "none", "none", "none", "stun", "light"],
  0: ["none", "none", "none", "stun", "stun", "light"],
  1: ["none", "none", "stun", "stun", "light", "light"],
  3: ["none", "stun", "stun", "light", "light", "unconscious"],
  5: ["stun", "stun", "light", "light", "unconscious", "unconscious"],
  7: ["stun", "light", "light", "unconscious", "unconscious", "dead"],
  9: ["light", "light", "light", "unconscious", "dead", "dead"],
};

export const resolveAhlMelee = (attacker: Pick<Combatant, "meleeRating">, target: Pick<Combatant, "meleeRating" | "armorName" | "vaccSuit">, die: number, sameSquare = false, attackerDived = false): AhlMeleeResult => {
  const differential = attacker.meleeRating - target.meleeRating;
  let baseIndex = -1;
  meleeDifferentials.forEach((value, index) => { if (differential >= value) baseIndex = index; });
  const armorColumnShift = target.armorName === "Combat Armor" ? 2 : target.vaccSuit ? 1 : 0;
  const columnIndex = Math.max(0, baseIndex - armorColumnShift);
  const tableDifferential = meleeDifferentials[columnIndex];
  const modifiedRoll = Math.max(1, Math.min(6, die + (sameSquare ? attackerDived ? 2 : -1 : 0)));
  return { roll: die, modifiedRoll, differential, tableDifferential, armorColumnShift, effect: baseIndex < 0 ? "none" : meleeTable[tableDifferential][modifiedRoll - 1] };
};

export const resolveSnapShot = (attacker: Combatant, target: Combatant, hitDice: DicePair, woundDice: DicePair, cover = 0, fireMode: FireMode = "snap", targetEvading = false, attackerSuppressed = false, attackerBraced = false, visibilityModifier = 0, attackerReady = false, attackerAimed = false, situationalHitModifier = 0, situationalWoundModifier = 0): SnapShotResult | null => {
  const profile = snapShotTarget(attacker, target);
  if (!profile) return null;
  const usesAutomaticFireBonus = fireMode === "automatic" || (fireMode === "covering" && attacker.weapon.automatic) || attacker.weapon.inherentAutomaticFireBonus;
  const automaticFireModifier = usesAutomaticFireBonus ? automaticFireModifierForRange(profile.rangeBand, attacker.weapon.automaticFireBonusByRange) : 0;
  if (automaticFireModifier === null) return null;
  const hitRoll = hitDice.first + hitDice.second;
  const weaponAccuracy = weaponAccuracyForRange(attacker.weapon, profile.rangeBand);
  const weaponPenetration = weaponPenetrationForRange(attacker.weapon, profile.rangeBand);
  const attackArc = attackArcAgainstTarget(attacker, target);
  const arcModifier = attackArcModifier(attackArc);
  const evadeModifier = targetEvading && cover === 0 ? -1 : 0;
  const postureModifier = target.posture === "prone" ? -2 : 0;
  const bracedModifier = attackerBraced ? 1 : 0;
  const readyModifier = attackerReady ? 1 : 0;
  const aimModifier = attackerAimed ? 1 : 0;
  const hitModifier = attacker.weaponSkill + weaponAccuracy - (attacker.woundState === "light" ? 1 : 0) - (fireMode === "snap" ? 2 : 0) - (fireMode === "covering" ? 1 : fireMode === "suppressive" ? 2 : 0) + automaticFireModifier + arcModifier + evadeModifier + postureModifier + bracedModifier + readyModifier + aimModifier + visibilityModifier + situationalHitModifier - (attackerSuppressed ? 1 : 0) - cover;
  const hitTotal = hitRoll + hitModifier;
  if (hitTotal < profile.targetNumber) return { ...profile, hit: false, hitRoll, hitModifier, hitTotal, weaponAccuracy, weaponPenetration, attackArc, arcModifier, evadeModifier, postureModifier, bracedModifier, visibilityModifier, readyModifier, aimModifier, situationalHitModifier, situationalWoundModifier, woundRoll: null, woundTotal: null, cover, woundState: target.woundState };
  const woundRoll = woundDice.first + woundDice.second;
  // AHL rule 12: cover makes a hit harder to obtain, but a successful hit
  // receives +2 damage because only the more vital exposed areas can be hit.
  const woundTotal = woundRoll + weaponPenetration - target.armor + cover + situationalWoundModifier;
  const woundState = woundStateForTotal(woundTotal);
  return { ...profile, hit: true, hitRoll, hitModifier, hitTotal, weaponAccuracy, weaponPenetration, attackArc, arcModifier, evadeModifier, postureModifier, bracedModifier, visibilityModifier, readyModifier, aimModifier, situationalHitModifier, situationalWoundModifier, woundRoll, woundTotal, cover, woundState: attacker.weapon.woundEscalation ? escalateWoundState(woundState) : woundState };
};
