import { current, type Draft, type PayloadAction } from "@reduxjs/toolkit";
import { pointKey, prepareTacticalPathfindingContext, prepareTacticalVisibilityContext, scenarioAvoidingLiquidHydrogenForPathfinding, tacticalRangedEnemies } from "./geometry";
import { resolveTacticalCoveringFire } from "./tacticalCoveringFire";
import { resolveTacticalEnemyMeleeAction, resolveTacticalEnemyRangedAction } from "./tacticalEnemyActions";
import { planTacticalEnemyMovement } from "./tacticalEnemyMovement";
import { resolveTacticalEnemyMovementReactions } from "./tacticalEnemyMovementReactions";
import {
  resolveTacticalCasualtyMoraleChecks,
  resolveTacticalCoweringRecovery,
  resolveTacticalPanicFlight,
  resolveTacticalUnexpectedFireMoraleChecks,
} from "./tacticalMorale";
import { recordTacticalObservedEvent, tacticalVisibilitySnapshot } from "./tacticalObservation";
import { tacticalCombatant, tacticalPlayerIds } from "./tacticalStateHelpers";
import { beginNextTacticalTurn, type TacticalEnemyPhaseRolls } from "./tacticalTurnLifecycle";
import type { CharacterCombatState } from "./types";

export const tacticalEnemyPhaseReducers = {
  runTacticalEnemyPhase: (state: Draft<CharacterCombatState>, action: PayloadAction<TacticalEnemyPhaseRolls>) => {
    const map = state.tacticalMap;
    if (!map || map.scenarioStatus !== "active" || map.pendingAdjacencyReaction || map.activeCharacterId !== null) return;
    const playerIds = tacticalPlayerIds(map);
    const playerPhaseComplete = playerIds.every((id) => map.actedCharacterIds.includes(id)
      || (map.actionPointsByCharacterId[id] ?? 0) === 0
      || tacticalCombatant(map, id)?.defeated);
    if (!playerPhaseComplete) return;

    const scenario = map.scenario;
    const startingEnemyPhase = map.processedEnemyPhaseCombatantIds.length === 0;
    if (startingEnemyPhase) {
      resolveTacticalCoweringRecovery(map, "enemy", action.payload.coweringRecoveryRolls ?? {});
      resolveTacticalCasualtyMoraleChecks(map, "enemy", action.payload.casualtyMoraleRolls ?? {});
      resolveTacticalUnexpectedFireMoraleChecks(map, "enemy", action.payload.unexpectedFireMoraleRolls ?? {});
      resolveTacticalPanicFlight(map, "enemy");
      map.visibleHostileIdsAtPhaseStartByCombatantId = tacticalVisibilitySnapshot(map.scenario);
      for (const lane of [...map.coveringFireLanes]) {
        const attacker = tacticalCombatant(map, lane.attackerId);
        const occupants = scenario.combatants.filter((unit) => unit.id !== attacker?.id
          && !unit.defeated
          && lane.cells.some((cell) => pointKey(cell) === pointKey(unit.position)));
        const primary = occupants[0];
        if (!primary) continue;
        const fallbackRolls = Object.fromEntries(occupants.flatMap((unit) => action.payload.enemyRolls[unit.id]
          ? [[unit.id, action.payload.enemyRolls[unit.id]]]
          : []));
        resolveTacticalCoveringFire(
          map,
          primary,
          lane,
          action.payload.coveringFireRolls?.[lane.attackerId] ?? fallbackRolls,
          false,
        );
        if (map.scenarioStatus !== "active") return;
      }
    }
    const enemies = scenario.combatants.filter((unit) => unit.side === "enemy"
      && !unit.defeated
      && !(map.coweringCombatantIds ?? []).includes(unit.id)
      && !(map.panickedCombatantIds ?? []).includes(unit.id));
    let routeScenario = scenarioAvoidingLiquidHydrogenForPathfinding(current(map.scenario));
    let routeDoorState = routeScenario.doors.map((door) => `${door.id}:${door.open}`).join("|");
    let pathfinding = prepareTacticalPathfindingContext(routeScenario);
    const coveringFireLeadershipResults = new Map<string, boolean>();
    const movingAdjacentLeadershipResults = new Map<string, boolean>();
    for (const enemy of enemies) {
      if (map.processedEnemyPhaseCombatantIds.includes(enemy.id)) continue;
      map.processedEnemyPhaseCombatantIds.push(enemy.id);
      const livingPlayers = scenario.combatants.filter((unit) => unit.side === "player" && !unit.defeated);
      if (livingPlayers.length === 0) break;
      const dice = action.payload.enemyRolls[enemy.id];
      if (!dice) continue;
      if (map.actionPointsByCharacterId[enemy.id] === undefined) map.actionPointsByCharacterId[enemy.id] = 6;
      if (map.actionPointsByCharacterId[enemy.id] < 1) {
        recordTacticalObservedEvent(map, enemy, `${enemy.name} had no AP remaining`);
        continue;
      }

      if (resolveTacticalEnemyMeleeAction(map, enemy, dice)) {
        if (map.scenarioStatus !== "active") return;
        continue;
      }

      if (resolveTacticalEnemyRangedAction(map, enemy, dice, action.payload.dangerSpaceRolls?.[enemy.id])) continue;

      routeScenario.combatants = current(map.scenario.combatants);
      const currentDoors = current(map.scenario.doors);
      const currentDoorState = currentDoors.map((door) => `${door.id}:${door.open}`).join("|");
      if (currentDoorState !== routeDoorState) {
        routeScenario = { ...routeScenario, doors: currentDoors };
        routeDoorState = currentDoorState;
        pathfinding = prepareTacticalPathfindingContext(routeScenario);
      }
      const movementPlan = planTacticalEnemyMovement(map, enemy, livingPlayers, routeScenario, pathfinding);
      if (movementPlan.status === "resolved") continue;
      if (resolveTacticalEnemyMovementReactions(
        map,
        enemy,
        movementPlan,
        dice,
        action.payload,
        coveringFireLeadershipResults,
        movingAdjacentLeadershipResults,
      ) === "phase-paused") return;
    }

    resolveTacticalCasualtyMoraleChecks(map, "enemy", action.payload.casualtyMoraleRolls ?? {});
    resolveTacticalUnexpectedFireMoraleChecks(map, "enemy", action.payload.unexpectedFireMoraleRolls ?? {});
    if (map.scenarioStatus !== "active") return;
    map.coveringFireLanes = [];
    const retainedSnapVisibility = map.coveringFireCommittedCombatantIds.length > 0
      ? prepareTacticalVisibilityContext(map.scenario)
      : undefined;
    map.pendingCoveringFireSnapIds = map.coveringFireCommittedCombatantIds.filter((id) => {
      const unit = tacticalCombatant(map, id);
      return Boolean(unit
        && !unit.defeated
        && !unit.weapon.highEnergy
        && (map.actionPointsByCharacterId[id] ?? 0) >= 3
        && (map.ammunitionByCharacterId[id] ?? 0) >= 1
        && tacticalRangedEnemies(map.scenario, id, retainedSnapVisibility).length > 0);
    });
    map.coveringFireCommittedCombatantIds = [];
    if (map.pendingCoveringFireSnapIds.length > 0) {
      map.activeCharacterId = map.pendingCoveringFireSnapIds[0];
      const unit = tacticalCombatant(map, map.activeCharacterId);
      map.events.unshift(`${unit?.name ?? "Character"} may take the retained snap shot or decline`);
      return;
    }
    beginNextTacticalTurn(map, action.payload);
  },
};
