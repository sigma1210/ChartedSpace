import { automaticFireModifierForRange, distanceInSquares, resolveAhlMelee, resolveSnapShot, snapShotTarget, type DicePair } from "./combatResolution";
import { automaticFireSecondaryTargets, coverProtection, meleeEnemies, pointKey, tacticalRangedEnemies, tacticalVisibilityAssessment } from "./geometry";
import { characterCombatWeapons } from "./equipment";
import { compareEnemyRangedTargets, distanceBetween, facingTowardFieldOfFire, shouldImproveEnemyRange } from "./enemyTactics";
import { reloadTacticalAmmunition, spendTacticalAmmunition } from "./tacticalAmmunition";
import { tacticalHitRollEvent } from "./tacticalFire";
import { queueTacticalUnexpectedFireMoraleCheck } from "./tacticalMorale";
import { recordTacticalObservedEvent } from "./tacticalObservation";
import type { Combatant, TacticalMapState } from "./types";
import { applyTacticalAhlMeleeEffect, applyTacticalWound } from "./tacticalWounds";

type EnemyActionDice = { hitDice: DicePair; woundDice: DicePair };

export const resolveTacticalEnemyMeleeAction = (map: TacticalMapState, enemy: Combatant, dice: EnemyActionDice) => {
  const meleeTarget = enemy.weapon.name === characterCombatWeapons.noRangedWeapon.name
    ? meleeEnemies(map.scenario, enemy.id).find((unit) => unit.side === "player") ?? null
    : null;
  if (!meleeTarget) return false;
  const sameSquare = pointKey(enemy.position) === pointKey(meleeTarget.position);
  const attackResult = resolveAhlMelee(enemy, meleeTarget, dice.hitDice.first, sameSquare, false);
  const returnEligible = meleeEnemies(map.scenario, meleeTarget.id).some((unit) => unit.id === enemy.id);
  const returnResult = returnEligible ? resolveAhlMelee(meleeTarget, enemy, dice.hitDice.second, sameSquare, false) : null;
  applyTacticalAhlMeleeEffect(map, meleeTarget, attackResult.effect);
  if (returnResult) applyTacticalAhlMeleeEffect(map, enemy, returnResult.effect);
  map.events.unshift(`${enemy.name} → ${meleeTarget.name}: MF ${attackResult.differential}, column ${attackResult.tableDifferential}, roll ${attackResult.roll}${attackResult.modifiedRoll !== attackResult.roll ? ` → ${attackResult.modifiedRoll}` : ""}: ${attackResult.effect}`);
  if (returnResult) map.events.unshift(`${meleeTarget.name} → ${enemy.name}: MF ${returnResult.differential}, column ${returnResult.tableDifferential}, roll ${returnResult.roll}${returnResult.modifiedRoll !== returnResult.roll ? ` → ${returnResult.modifiedRoll}` : ""}: ${returnResult.effect}`);
  map.events.unshift(`AHL melee exchange resolved simultaneously: ${enemy.name} and ${meleeTarget.name}`);
  map.actionPointsByCharacterId[enemy.id] = 0;
  return true;
};

export const resolveTacticalEnemyRangedAction = (map: TacticalMapState, enemy: Combatant, dice: EnemyActionDice, dangerSpaceRolls: Record<string, EnemyActionDice> = {}) => {
  const scenario = map.scenario;
  const livingPlayers = scenario.combatants.filter((unit) => unit.side === "player" && !unit.defeated);
  const adjacentTarget = meleeEnemies(scenario, enemy.id).find((unit) => unit.side === "player") ?? null;
  let attackTarget: Combatant | null = tacticalRangedEnemies(scenario, enemy.id)
    .filter((unit) => unit.side === "player")
    .sort((a, b) => compareEnemyRangedTargets(scenario, enemy, a, b, map.evadingCombatantIds))[0] ?? null;
  const initialProfile = attackTarget ? snapShotTarget(enemy, attackTarget) : null;
  const shouldMoveCloser = Boolean(initialProfile && shouldImproveEnemyRange(enemy, initialProfile.rangeBand));

  if (!attackTarget) {
    const visibleTarget = livingPlayers
      .filter((unit) => snapShotTarget(enemy, unit) && tacticalVisibilityAssessment(scenario, enemy, unit).observable)
      .sort((a, b) => distanceBetween(enemy.position, a.position) - distanceBetween(enemy.position, b.position) || a.id.localeCompare(b.id))[0];
    const turn = visibleTarget ? facingTowardFieldOfFire(enemy, visibleTarget.position) : null;
    if (turn) {
      if (turn.turns > map.actionPointsByCharacterId[enemy.id]) {
        recordTacticalObservedEvent(map, enemy, `${enemy.name} held position`);
        return true;
      }
      enemy.facing = turn.facing;
      map.actionPointsByCharacterId[enemy.id] -= turn.turns;
      recordTacticalObservedEvent(map, enemy, `${enemy.name} turned toward ${visibleTarget.name}`);
      attackTarget = tacticalRangedEnemies(scenario, enemy.id).find((unit) => unit.id === visibleTarget.id) ?? null;
    }
  }

  if (!attackTarget || shouldMoveCloser) return false;
  const ammunition = map.ammunitionByCharacterId[enemy.id] ?? 0;
  const mustSnapAtAdjacentTarget = adjacentTarget?.id === attackTarget.id;
  if (ammunition === 0) {
    if (map.actionPointsByCharacterId[enemy.id] < 3) {
      recordTacticalObservedEvent(map, enemy, `${enemy.name} lacked AP to reload`);
      return true;
    }
    reloadTacticalAmmunition(map, enemy);
    map.actionPointsByCharacterId[enemy.id] -= 3;
    recordTacticalObservedEvent(map, enemy, `${enemy.name} reloaded`);
    return true;
  }
  const suppressionTarget = !mustSnapAtAdjacentTarget && map.actionPointsByCharacterId[enemy.id] >= 6 && enemy.weapon.automatic && ammunition >= 3 ? tacticalRangedEnemies(scenario, enemy.id)
    .filter((candidate) => candidate.side === "player" && !map.suppressedCombatantIds.includes(candidate.id))
    .map((candidate) => ({ candidate, cover: coverProtection(scenario, enemy.id, candidate.id) }))
    .filter(({ candidate, cover }) => candidate.armor >= 3 || cover > 0)
    .sort((a, b) => b.cover + b.candidate.armor - (a.cover + a.candidate.armor) || compareEnemyRangedTargets(scenario, enemy, a.candidate, b.candidate, map.evadingCombatantIds))[0] : null;
  if (suppressionTarget) {
    const result = resolveSnapShot(enemy, suppressionTarget.candidate, dice.hitDice, dice.woundDice, suppressionTarget.cover, "suppressive", false, map.suppressedCombatantIds.includes(enemy.id), false, tacticalVisibilityAssessment(scenario, enemy, suppressionTarget.candidate).darknessModifier, false, false, map.evadingCombatantIds.includes(suppressionTarget.candidate.id) ? -2 : 0);
    if (!result) return true;
    queueTacticalUnexpectedFireMoraleCheck(map, enemy, suppressionTarget.candidate);
    const threshold = result.targetNumber + result.cover;
    const suppressed = result.hitTotal >= threshold;
    if (suppressed) map.suppressedCombatantIds.push(suppressionTarget.candidate.id);
    spendTacticalAmmunition(map, enemy, 3);
    map.actionPointsByCharacterId[enemy.id] -= 6;
    map.events.unshift(`${enemy.name} suppressive fired at ${suppressionTarget.candidate.name}: ${tacticalHitRollEvent(result, threshold)} · ${suppressed ? "suppressed" : "held position"}`);
    return true;
  }

  const profile = snapShotTarget(enemy, attackTarget);
  const automaticModifier = profile ? automaticFireModifierForRange(profile.rangeBand, enemy.weapon.automaticFireBonusByRange) : null;
  const availableFireAp = map.actionPointsByCharacterId[enemy.id];
  if (availableFireAp < 3) {
    recordTacticalObservedEvent(map, enemy, `${enemy.name} lacked AP to fire`);
    return true;
  }
  const fireMode: "automatic" | "aimed" | "snap" = mustSnapAtAdjacentTarget
    ? "snap"
    : availableFireAp >= 6 && enemy.weapon.automatic && ammunition >= 3 && automaticModifier !== null
      ? "automatic"
      : availableFireAp >= 6
        ? "aimed"
        : "snap";
  const result = resolveSnapShot(enemy, attackTarget, dice.hitDice, dice.woundDice, coverProtection(scenario, enemy.id, attackTarget.id), fireMode, false, map.suppressedCombatantIds.includes(enemy.id), false, tacticalVisibilityAssessment(scenario, enemy, attackTarget).darknessModifier, false, false, map.evadingCombatantIds.includes(attackTarget.id) ? -2 : 0);
  if (!result) return true;
  if (fireMode === "automatic") {
    const dangerTargets = [attackTarget, ...automaticFireSecondaryTargets(scenario, enemy.id, attackTarget.id)]
      .sort((a, b) => distanceInSquares(enemy, a) - distanceInSquares(enemy, b) || scenario.combatants.indexOf(a) - scenario.combatants.indexOf(b));
    let hits = 0;
    for (const [index, dangerTarget] of dangerTargets.entries()) {
      const targetDice = dangerTarget.id === attackTarget.id ? dice : dangerSpaceRolls[dangerTarget.id] ?? dice;
      const dangerResult = dangerTarget.id === attackTarget.id ? result : resolveSnapShot(enemy, dangerTarget, targetDice.hitDice, targetDice.woundDice, coverProtection(scenario, enemy.id, dangerTarget.id), "automatic", false, map.suppressedCombatantIds.includes(enemy.id), false, tacticalVisibilityAssessment(scenario, enemy, dangerTarget).darknessModifier, false, false, map.evadingCombatantIds.includes(dangerTarget.id) ? -2 : 0);
      if (!dangerResult) continue;
      queueTacticalUnexpectedFireMoraleCheck(map, enemy, dangerTarget);
      if (dangerResult.hit) {
        hits += 1;
        applyTacticalWound(map, dangerTarget, dangerResult.woundState);
      } else if (dangerResult.targetNumber - dangerResult.hitTotal <= 2 && !map.suppressedCombatantIds.includes(dangerTarget.id)) map.suppressedCombatantIds.push(dangerTarget.id);
      map.events.unshift(`${enemy.name} automatic fired at ${dangerTarget.name}: ${tacticalHitRollEvent(dangerResult)} · ${dangerResult.hit ? `wound ${dangerResult.woundTotal} (${dangerResult.woundState})` : "miss"}`);
      const nextTarget = dangerTargets[index + 1];
      if (hits >= 2 && (!nextTarget || pointKey(nextTarget.position) !== pointKey(dangerTarget.position))) break;
    }
    spendTacticalAmmunition(map, enemy, 3);
    map.actionPointsByCharacterId[enemy.id] -= 6;
  } else {
    queueTacticalUnexpectedFireMoraleCheck(map, enemy, attackTarget);
    if (result.hit) applyTacticalWound(map, attackTarget, result.woundState);
    else if (result.targetNumber - result.hitTotal <= 2 && !map.suppressedCombatantIds.includes(attackTarget.id)) map.suppressedCombatantIds.push(attackTarget.id);
    spendTacticalAmmunition(map, enemy, 1);
    map.actionPointsByCharacterId[enemy.id] -= fireMode === "aimed" ? 6 : 3;
    map.events.unshift(`${enemy.name} ${fireMode} fired at ${attackTarget.name}: ${tacticalHitRollEvent(result)} · ${result.hit ? `wound ${result.woundTotal} (${result.woundState})` : "miss"}`);
  }
  return true;
};
