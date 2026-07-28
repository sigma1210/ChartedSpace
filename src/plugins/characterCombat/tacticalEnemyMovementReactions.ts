import type { PayloadAction } from "@reduxjs/toolkit";
import { resolveAhlMoraleCheck, resolveSnapShot, type DicePair } from "./combatResolution";
import { adjacencyEntryStepIndex, coverProtection, hasLineOfSight, movementPathCost, pathWithinMovementAllowance, pointKey, tacticalVisibilityAssessment } from "./geometry";
import { spendTacticalAmmunition } from "./tacticalAmmunition";
import { coveringFireAmmunitionCost, resolveTacticalCoveringFire, tacticalCoverAtPosition } from "./tacticalCoveringFire";
import type { TacticalEnemyMovementPlan } from "./tacticalEnemyMovement";
import { tacticalHitRollEvent } from "./tacticalFire";
import { queueTacticalUnexpectedFireMoraleCheck } from "./tacticalMorale";
import { recordTacticalMovementAnimation, recordTacticalObservedEvent } from "./tacticalObservation";
import { tacticalCombatant } from "./tacticalStateHelpers";
import type { TacticalEnemyPhaseRolls } from "./tacticalTurnLifecycle";
import type { CharacterCombatState, CombatScenario, Combatant, GridPoint, TacticalMapState } from "./types";
import { applyTacticalWound } from "./tacticalWounds";

export const firstTacticalAdjacencyEntry = (map: TacticalMapState, mover: Combatant, path: GridPoint[]) => map.scenario.combatants
  .filter((target) => target.side !== mover.side && !target.defeated)
  .map((target) => ({ target, stepIndex: adjacencyEntryStepIndex(map.scenario, target.position, mover.position, path) }))
  .filter(({ stepIndex }) => stepIndex >= 0)
  .sort((a, b) => a.stepIndex - b.stepIndex || map.scenario.combatants.indexOf(a.target) - map.scenario.combatants.indexOf(b.target))[0] ?? null;

export const resolveTacticalMovingAdjacentSnapShot = (map: TacticalMapState, shooter: Combatant, target: Combatant, dice: { hitDice: DicePair; woundDice: DicePair } | undefined) => {
  const visibility = tacticalVisibilityAssessment(map.scenario, shooter, target);
  if (!dice || (map.ammunitionByCharacterId[shooter.id] ?? 0) < 1 || !visibility.observable) return false;
  const result = resolveSnapShot(shooter, target, dice.hitDice, dice.woundDice, coverProtection(map.scenario, shooter.id, target.id), "snap", map.evadingCombatantIds.includes(target.id), map.suppressedCombatantIds.includes(shooter.id), map.bracedCombatantIds.includes(shooter.id), visibility.darknessModifier);
  if (!result) return false;
  spendTacticalAmmunition(map, shooter, 1);
  queueTacticalUnexpectedFireMoraleCheck(map, shooter, target);
  if (result.hit) applyTacticalWound(map, target, result.woundState);
  map.events.unshift(`${shooter.name} moving-adjacent failure snap fired at ${target.name}: ${tacticalHitRollEvent(result)} · ${result.hit ? `wound ${result.woundTotal} (${result.woundState})` : "miss"}`);
  return true;
};

export type TacticalEnemyMovementReactionOutcome = "completed" | "phase-paused";

export const resolveTacticalEnemyMovementReactions = (
  map: TacticalMapState,
  enemy: Combatant,
  plan: Extract<TacticalEnemyMovementPlan, { status: "move" }>,
  dice: { hitDice: DicePair; woundDice: DicePair },
  rolls: TacticalEnemyPhaseRolls,
  coveringFireLeadershipResults: Map<string, boolean>,
  movingAdjacentLeadershipResults: Map<string, boolean>,
): TacticalEnemyMovementReactionOutcome => {
  const scenario: CombatScenario = map.scenario;
  const { finalFacing, origin, path, trotting } = plan;
  const crossedLane = map.coveringFireLanes
    .map((lane) => ({ lane, stepIndex: path.findIndex((step) => lane.cells.some((cell) => pointKey(cell) === pointKey(step))) }))
    .filter(({ stepIndex }) => stepIndex >= 0)
    .sort((a, b) => a.stepIndex - b.stepIndex)[0];
  const adjacencyEntry = firstTacticalAdjacencyEntry(map, enemy, path);
  const queueAdjacencyReaction = () => {
    if (!adjacencyEntry) return false;
    const triggerPath = path.slice(0, adjacencyEntry.stepIndex + 1);
    const trigger = triggerPath[triggerPath.length - 1];
    const defenderIds = scenario.combatants
      .filter((defender) => defender.side === "player"
        && !defender.defeated
        && !defender.weapon.highEnergy
        && adjacencyEntryStepIndex(scenario, defender.position, origin, path) === adjacencyEntry.stepIndex
        && !map.movedCombatantIds.includes(defender.id)
        && (map.actionPointsByCharacterId[defender.id] ?? 0) >= 3
        && (map.ammunitionByCharacterId[defender.id] ?? 0) >= 1)
      .map((defender) => defender.id);
    if (defenderIds.length === 0) return false;
    enemy.position = { ...trigger };
    map.actionPointsByCharacterId[enemy.id] = Math.max(0, map.actionPointsByCharacterId[enemy.id] - movementPathCost(scenario, origin, triggerPath, enemy.facing, trotting));
    recordTacticalMovementAnimation(map, enemy, origin, triggerPath, trotting ? "run" : "walk");
    map.pendingAdjacencyReaction = { moverId: enemy.id, defenderIds };
    map.events.unshift(`${enemy.name} moved adjacent; ${defenderIds.map((id) => tacticalCombatant(map, id)?.name ?? id).join(", ")} may snap fire`);
    return true;
  };
  const failedMovingAdjacentCheck = () => {
    const moraleDice = rolls.movingAdjacentMoraleRolls?.[enemy.id];
    if (!adjacencyEntry || !moraleDice || enemy.moraleFactor === undefined) return false;
    const leadershipModifier = [...movingAdjacentLeadershipResults.entries()].reduce((total, [leaderId, passed]) => {
      const leader = tacticalCombatant(map, leaderId);
      return leader && hasLineOfSight(scenario, leader.position, enemy.position) ? total + (passed ? 1 : -1) * Math.max(0, leader.leadershipRating ?? 0) : total;
    }, 0);
    const morale = resolveAhlMoraleCheck({ moraleFactor: enemy.moraleFactor, woundState: enemy.woundState }, moraleDice, leadershipModifier);
    if ((enemy.leadershipRating ?? 0) > 0) movingAdjacentLeadershipResults.set(enemy.id, morale.passed);
    recordTacticalObservedEvent(map, enemy, `${enemy.name} moving-adjacent morale ${morale.roll}/${morale.modifiedMorale}${morale.lightWoundModifier ? " · light wound −1" : ""}${morale.leadershipModifier ? ` · leadership ${morale.leadershipModifier > 0 ? "+" : ""}${morale.leadershipModifier}` : ""}: ${morale.passed ? "passed" : `stopped before ${adjacencyEntry.target.name}`}`, [origin, ...path]);
    if (morale.passed) return false;
    const safePath = pathWithinMovementAllowance(scenario, origin, path.slice(0, adjacencyEntry.stepIndex), Math.max(0, map.actionPointsByCharacterId[enemy.id] - 3), enemy.facing, trotting);
    if (safePath.length > 0) {
      enemy.position = { ...safePath[safePath.length - 1] };
      map.actionPointsByCharacterId[enemy.id] = Math.max(0, map.actionPointsByCharacterId[enemy.id] - movementPathCost(scenario, origin, safePath, enemy.facing, trotting));
      recordTacticalMovementAnimation(map, enemy, origin, safePath, trotting ? "run" : "walk");
    }
    if (map.actionPointsByCharacterId[enemy.id] >= 3 && resolveTacticalMovingAdjacentSnapShot(map, enemy, adjacencyEntry.target, rolls.movingAdjacentSnapRolls?.[enemy.id])) map.actionPointsByCharacterId[enemy.id] -= 3;
    return true;
  };

  if (adjacencyEntry && (!crossedLane || adjacencyEntry.stepIndex <= crossedLane.stepIndex) && failedMovingAdjacentCheck()) return "completed";
  if (adjacencyEntry && (!crossedLane || adjacencyEntry.stepIndex <= crossedLane.stepIndex) && queueAdjacencyReaction()) return "phase-paused";
  if (crossedLane) {
    const priorPosition = crossedLane.stepIndex === 0 ? origin : path[crossedLane.stepIndex - 1];
    const moraleDice = rolls.coveringFireMoraleRolls?.[enemy.id];
    const attacker = tacticalCombatant(map, crossedLane.lane.attackerId);
    if (attacker && !attacker.defeated && (map.ammunitionByCharacterId[attacker.id] ?? 0) >= coveringFireAmmunitionCost(attacker.weapon) && moraleDice && enemy.moraleFactor !== undefined && tacticalCoverAtPosition(map, attacker.id, enemy, priorPosition) > 0) {
      const leadershipModifier = [...coveringFireLeadershipResults.entries()].reduce((total, [leaderId, passed]) => {
        const leader = tacticalCombatant(map, leaderId);
        return leader && hasLineOfSight(scenario, leader.position, enemy.position) ? total + (passed ? 1 : -1) * Math.max(0, leader.leadershipRating ?? 0) : total;
      }, 0);
      const morale = resolveAhlMoraleCheck({ moraleFactor: enemy.moraleFactor, woundState: enemy.woundState }, moraleDice, leadershipModifier);
      if ((enemy.leadershipRating ?? 0) > 0) coveringFireLeadershipResults.set(enemy.id, morale.passed);
      recordTacticalObservedEvent(map, enemy, `${enemy.name} exposure-to-covering-fire morale ${morale.roll}/${morale.modifiedMorale}${morale.lightWoundModifier ? " · light wound −1" : ""}${morale.leadershipModifier ? ` · leadership ${morale.leadershipModifier > 0 ? "+" : ""}${morale.leadershipModifier}` : ""}: ${morale.passed ? "passed" : "stopped before danger space"}`, [origin, ...path]);
      if (!morale.passed) {
        const safePath = path.slice(0, crossedLane.stepIndex);
        if (safePath.length > 0) {
          enemy.position = { ...safePath[safePath.length - 1] };
          map.actionPointsByCharacterId[enemy.id] = Math.max(0, map.actionPointsByCharacterId[enemy.id] - movementPathCost(scenario, origin, safePath, enemy.facing, trotting));
          recordTacticalMovementAnimation(map, enemy, origin, safePath, trotting ? "run" : "walk");
        }
        return "completed";
      }
    }
    const triggerPath = path.slice(0, crossedLane.stepIndex + 1);
    enemy.position = { ...triggerPath[triggerPath.length - 1] };
    const triggerCost = movementPathCost(scenario, origin, triggerPath, enemy.facing, trotting);
    if (resolveTacticalCoveringFire(map, enemy, crossedLane.lane, rolls.dangerSpaceRolls?.[enemy.id] ?? { [enemy.id]: dice }, true).has(enemy.id)) {
      map.actionPointsByCharacterId[enemy.id] = Math.max(0, map.actionPointsByCharacterId[enemy.id] - triggerCost);
      recordTacticalMovementAnimation(map, enemy, origin, triggerPath, trotting ? "run" : "walk");
      recordTacticalObservedEvent(map, enemy, `${enemy.name} movement stopped by covering fire`, [origin, ...triggerPath]);
      return "completed";
    }
    enemy.position = origin;
  }
  if (adjacencyEntry && crossedLane && adjacencyEntry.stepIndex > crossedLane.stepIndex && failedMovingAdjacentCheck()) return "completed";
  if (adjacencyEntry && crossedLane && adjacencyEntry.stepIndex > crossedLane.stepIndex && queueAdjacencyReaction()) return "phase-paused";
  const destination = path[path.length - 1];
  map.actionPointsByCharacterId[enemy.id] = Math.max(0, map.actionPointsByCharacterId[enemy.id] - movementPathCost(scenario, origin, path, enemy.facing, trotting));
  enemy.position = { ...destination };
  enemy.facing = finalFacing;
  recordTacticalMovementAnimation(map, enemy, origin, path, trotting ? "run" : "walk");
  recordTacticalObservedEvent(map, enemy, `${enemy.name} moved to ${destination.x},${destination.y}`, [origin, ...path]);
  return "completed";
};

export const tacticalEnemyMovementReactionReducers = {
  resolveTacticalAdjacencyReaction: (
    state: CharacterCombatState,
    action: PayloadAction<{ fire: boolean; hitDice: DicePair; woundDice: DicePair }>,
  ) => {
    const map = state.tacticalMap;
    const pending = map?.pendingAdjacencyReaction;
    const defenderId = pending?.defenderIds[0];
    const defender = map ? tacticalCombatant(map, defenderId) : null;
    const mover = map ? tacticalCombatant(map, pending?.moverId) : null;
    if (!map || !pending || !defenderId || !defender || !mover) return;
    if (action.payload.fire
      && !defender.defeated
      && !mover.defeated
      && !map.movedCombatantIds.includes(defender.id)
      && (map.actionPointsByCharacterId[defender.id] ?? 0) >= 3
      && (map.ammunitionByCharacterId[defender.id] ?? 0) >= 1) {
      const visibility = tacticalVisibilityAssessment(map.scenario, defender, mover);
      const result = resolveSnapShot(
        defender,
        mover,
        action.payload.hitDice,
        action.payload.woundDice,
        coverProtection(map.scenario, defender.id, mover.id),
        "snap",
        map.evadingCombatantIds.includes(mover.id),
        map.suppressedCombatantIds.includes(defender.id),
        map.bracedCombatantIds.includes(defender.id),
        visibility.darknessModifier,
      );
      if (result) {
        map.actionPointsByCharacterId[defender.id] -= 3;
        spendTacticalAmmunition(map, defender, 1);
        queueTacticalUnexpectedFireMoraleCheck(map, defender, mover);
        if (result.hit) applyTacticalWound(map, mover, result.woundState);
        map.events.unshift(`${defender.name} defensive snap fired at ${mover.name}: ${tacticalHitRollEvent(result)} · ${result.hit ? `wound ${result.woundTotal} (${result.woundState})` : "miss"}`);
      } else {
        map.events.unshift(`${defender.name} could not take the defensive snap shot`);
      }
    } else {
      map.events.unshift(`${defender.name} declined the defensive snap shot`);
    }
    const remainingDefenderIds = mover.defeated
      ? []
      : pending.defenderIds.slice(1).filter((id) => {
        const candidate = tacticalCombatant(map, id);
        return candidate
          && !candidate.defeated
          && !map.movedCombatantIds.includes(id)
          && (map.actionPointsByCharacterId[id] ?? 0) >= 3
          && (map.ammunitionByCharacterId[id] ?? 0) >= 1;
      });
    map.pendingAdjacencyReaction = remainingDefenderIds.length > 0
      ? { ...pending, defenderIds: remainingDefenderIds }
      : null;
  },
};
