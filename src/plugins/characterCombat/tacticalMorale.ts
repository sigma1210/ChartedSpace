import { resolveAhlMoraleCheck, type DicePair } from "./combatResolution";
import { filledLiquidHydrogenCellKeys, hasLineOfSight, pointKey, prepareTacticalVisibilityContext, reachableOpenMapMovement, tacticalOccupantCounts } from "./geometry";
import { recordTacticalMovementAnimation, recordTacticalObservedEvent } from "./tacticalObservation";
import { tacticalCombatant } from "./tacticalStateHelpers";
import { activeTacticalTerrainObjects, tacticalTerrainBlockedCells, tacticalTerrainBlockedEdges } from "./tacticalTerrain";
import type { CombatScenario, GridPoint, TacticalMapState } from "./types";

export const queueTacticalCasualtyMoraleChecks = (map: TacticalMapState, casualty: CombatScenario["combatants"][number]) => {
  map.pendingCasualtyMoraleChecks ??= [];
  map.casualtyMoraleOccurrence = (map.casualtyMoraleOccurrence ?? 0) + 1;
  const occurrence = map.casualtyMoraleOccurrence;
  map.scenario.combatants
    .filter((witness) => witness.id !== casualty.id && witness.side === casualty.side && !witness.defeated && !(map.panickedCombatantIds ?? []).includes(witness.id) && !(map.coweringCombatantIds ?? []).includes(witness.id) && hasLineOfSight(map.scenario, witness.position, casualty.position))
    .forEach((witness) => { map.pendingCasualtyMoraleChecks!.push({ witnessId: witness.id, casualtyId: casualty.id, occurrence }); });
};

export const queueTacticalUnexpectedFireMoraleCheck = (map: TacticalMapState, attacker: CombatScenario["combatants"][number], target: CombatScenario["combatants"][number]) => {
  if (target.defeated || (map.panickedCombatantIds ?? []).includes(target.id) || (map.coweringCombatantIds ?? []).includes(target.id) || (map.visibleHostileIdsAtPhaseStartByCombatantId?.[target.id] ?? []).includes(attacker.id)) return;
  map.pendingUnexpectedFireMoraleChecks ??= [];
  map.unexpectedFireMoraleOccurrence = (map.unexpectedFireMoraleOccurrence ?? 0) + 1;
  map.pendingUnexpectedFireMoraleChecks.push({ combatantId: target.id, attackerId: attacker.id, occurrence: map.unexpectedFireMoraleOccurrence });
};

export const resolveTacticalCoweringRecovery = (map: TacticalMapState, side: CombatScenario["combatants"][number]["side"], rolls: Record<string, DicePair>) => {
  const coweringIds = map.coweringCombatantIds ?? [];
  for (const id of coweringIds) {
    const unit = tacticalCombatant(map, id);
    const dice = rolls[id];
    if (!unit || unit.side !== side || unit.defeated || unit.moraleFactor === undefined || !dice) continue;
    const leadershipModifier = map.scenario.combatants
      .filter((leader) => leader.id !== unit.id && leader.side === unit.side && !leader.defeated && !coweringIds.includes(leader.id) && pointKey(leader.position) === pointKey(unit.position))
      .reduce((total, leader) => total + Math.max(0, leader.leadershipRating ?? 0), 0);
    const result = resolveAhlMoraleCheck({ moraleFactor: unit.moraleFactor, woundState: unit.woundState }, dice, leadershipModifier);
    if (result.passed) map.coweringCombatantIds = (map.coweringCombatantIds ?? []).filter((combatantId) => combatantId !== unit.id);
    recordTacticalObservedEvent(map, unit, `${unit.name} cowering recovery ${result.roll}/${result.modifiedMorale}${result.lightWoundModifier ? " · light wound −1" : ""}${result.leadershipModifier ? ` · leadership +${result.leadershipModifier}` : ""}: ${result.passed ? "recovered" : "remains cowering"}`);
  }
};

export const resolveTacticalCasualtyMoraleChecks = (map: TacticalMapState, side: CombatScenario["combatants"][number]["side"], rolls: Record<string, Record<string, DicePair>>) => {
  const pending = map.pendingCasualtyMoraleChecks ?? [];
  const occurrences = [...new Set(pending.filter((check) => tacticalCombatant(map, check.witnessId)?.side === side).map((check) => check.occurrence))];
  for (const occurrence of occurrences) {
    const casualtyId = pending.find((check) => check.occurrence === occurrence)!.casualtyId;
    const casualty = tacticalCombatant(map, casualtyId);
    const leadershipResults: { leader: CombatScenario["combatants"][number]; passed: boolean }[] = [];
    const witnesses = pending
      .filter((check) => check.occurrence === occurrence)
      .flatMap((check) => tacticalCombatant(map, check.witnessId) ?? [])
      .filter((witness) => witness.side === side && !witness.defeated && witness.moraleFactor !== undefined)
      .sort((a, b) => (b.leadershipRating ?? 0) - (a.leadershipRating ?? 0) || a.id.localeCompare(b.id));
    for (const witness of witnesses) {
      const dice = rolls[witness.id]?.[casualtyId];
      if (!dice) continue;
      const leadershipModifier = leadershipResults
        .filter(({ leader }) => hasLineOfSight(map.scenario, leader.position, witness.position))
        .reduce((total, result) => total + (result.passed ? 1 : -1) * Math.max(0, result.leader.leadershipRating ?? 0), 0);
      const result = resolveAhlMoraleCheck({ moraleFactor: witness.moraleFactor!, woundState: witness.woundState }, dice, leadershipModifier);
      if ((witness.leadershipRating ?? 0) > 0) leadershipResults.push({ leader: witness, passed: result.passed });
      if (!result.passed && !(map.panickedCombatantIds ?? []).includes(witness.id)) {
        map.panickedCombatantIds ??= [];
        map.panickedCombatantIds.push(witness.id);
      }
      recordTacticalObservedEvent(map, witness, `${witness.name} friendly-casualty morale after ${casualty?.name ?? casualtyId}: ${result.roll}/${result.modifiedMorale}${result.lightWoundModifier ? " · light wound −1" : ""}${result.leadershipModifier ? ` · leadership ${result.leadershipModifier > 0 ? "+" : ""}${result.leadershipModifier}` : ""}: ${result.passed ? "passed" : "panicked"}`);
    }
  }
  map.pendingCasualtyMoraleChecks = pending.filter((check) => tacticalCombatant(map, check.witnessId)?.side !== side);
};

export const resolveTacticalUnexpectedFireMoraleChecks = (map: TacticalMapState, side: CombatScenario["combatants"][number]["side"], rolls: Record<string, Record<string, DicePair>>) => {
  const pending = map.pendingUnexpectedFireMoraleChecks ?? [];
  const leadershipResults = new Map<string, boolean>();
  const checks = pending
    .filter((check) => tacticalCombatant(map, check.combatantId)?.side === side)
    .sort((a, b) => (tacticalCombatant(map, b.combatantId)?.leadershipRating ?? 0) - (tacticalCombatant(map, a.combatantId)?.leadershipRating ?? 0) || a.occurrence - b.occurrence);
  for (const check of checks) {
    const combatant = tacticalCombatant(map, check.combatantId);
    const attacker = tacticalCombatant(map, check.attackerId);
    const dice = rolls[check.combatantId]?.[check.attackerId];
    if (!combatant || combatant.defeated || combatant.moraleFactor === undefined || !dice) continue;
    const leadershipModifier = [...leadershipResults.entries()].reduce((total, [leaderId, passed]) => {
      const leader = tacticalCombatant(map, leaderId);
      return leader && leader.side === combatant.side && hasLineOfSight(map.scenario, leader.position, combatant.position) ? total + (passed ? 1 : -1) * Math.max(0, leader.leadershipRating ?? 0) : total;
    }, 0);
    const result = resolveAhlMoraleCheck({ moraleFactor: combatant.moraleFactor, woundState: combatant.woundState }, dice, leadershipModifier);
    if ((combatant.leadershipRating ?? 0) > 0) leadershipResults.set(combatant.id, result.passed);
    if (!result.passed && !(map.panickedCombatantIds ?? []).includes(combatant.id)) {
      map.panickedCombatantIds ??= [];
      map.panickedCombatantIds.push(combatant.id);
    }
    recordTacticalObservedEvent(map, combatant, `${combatant.name} unexpected-fire morale from ${attacker?.name ?? check.attackerId}: ${result.roll}/${result.modifiedMorale}${result.lightWoundModifier ? " · light wound −1" : ""}${result.leadershipModifier ? ` · leadership ${result.leadershipModifier > 0 ? "+" : ""}${result.leadershipModifier}` : ""}: ${result.passed ? "passed" : "panicked"}`);
  }
  map.pendingUnexpectedFireMoraleChecks = pending.filter((check) => tacticalCombatant(map, check.combatantId)?.side !== side);
};

export const resolveTacticalPanicFlight = (map: TacticalMapState, side: CombatScenario["combatants"][number]["side"]) => {
  const panickedIds = [...(map.panickedCombatantIds ?? [])];
  const visibility = prepareTacticalVisibilityContext(map.scenario);
  for (const id of panickedIds) {
    const unit = tacticalCombatant(map, id);
    if (!unit || unit.side !== side || unit.defeated) continue;
    const hostiles = map.scenario.combatants.filter((candidate) => candidate.side !== unit.side && !candidate.defeated);
    const visibleHostileCount = (point: GridPoint) => hostiles.filter((hostile) => visibility.lineOfSight(hostile.position, point)).length;
    const nearestHostileDistance = (point: GridPoint) => hostiles.length === 0
      ? Number.POSITIVE_INFINITY
      : Math.min(...hostiles.map((hostile) => Math.hypot(hostile.position.x - point.x, hostile.position.y - point.y)));
    const currentVisibleHostiles = visibleHostileCount(unit.position);
    if (currentVisibleHostiles === 0) {
      map.panickedCombatantIds = (map.panickedCombatantIds ?? []).filter((combatantId) => combatantId !== unit.id);
      if (!(map.coweringCombatantIds ?? []).includes(unit.id)) map.coweringCombatantIds = [...(map.coweringCombatantIds ?? []), unit.id];
      recordTacticalObservedEvent(map, unit, `${unit.name} reached complete cover and is cowering`);
      continue;
    }
    const terrain = activeTacticalTerrainObjects(map.scenario, map.doorOpenById, map.destroyedTerrainObjectIds);
    const blockedCells = tacticalTerrainBlockedCells(terrain, map.scenario.treeTrunkCells);
    map.scenario.objects.filter((object) => object.kind === "cover").forEach((object) => blockedCells.add(pointKey(object.position)));
    filledLiquidHydrogenCellKeys(map.scenario).forEach((key) => blockedCells.add(key));
    const moves = reachableOpenMapMovement({
      width: map.scenario.width,
      height: map.scenario.height,
      origin: unit.position,
      originElevationLevel: unit.elevationLevel,
      facing: unit.facing,
      allowance: 6,
      trotting: true,
      blockedCells,
      blockedEdges: tacticalTerrainBlockedEdges(terrain),
      activeOccupantsByCell: tacticalOccupantCounts(map.scenario, unit.id),
      terrainByCell: map.scenario.terrainByCell,
      elevationLevelByCell: map.scenario.elevationLevelByCell,
      bridges: map.scenario.bridges,
      closeMachineryCells: map.scenario.closeMachineryCells,
      elevationAccessCells: map.scenario.elevationAccessCells,
      elevationTransitions: map.scenario.elevationTransitions,
    });
    const candidates = [...moves.values()].map((move) => ({
      move,
      visibleHostiles: visibleHostileCount(move.destination),
      nearestHostileDistance: nearestHostileDistance(move.destination),
    }));
    const currentNearestHostileDistance = nearestHostileDistance(unit.position);
    const completeCoverChoice = candidates
      .filter((candidate) => candidate.visibleHostiles === 0)
      .sort((first, second) => first.move.cost - second.move.cost
        || first.move.destination.x - second.move.destination.x
        || first.move.destination.y - second.move.destination.y)[0];
    const saferChoice = candidates
      .filter((candidate) => candidate.visibleHostiles < currentVisibleHostiles
        || (candidate.visibleHostiles === currentVisibleHostiles
          && candidate.nearestHostileDistance > currentNearestHostileDistance))
      .sort((first, second) => first.visibleHostiles - second.visibleHostiles
        || second.nearestHostileDistance - first.nearestHostileDistance
        || first.move.cost - second.move.cost
        || first.move.destination.x - second.move.destination.x
        || first.move.destination.y - second.move.destination.y)[0];
    const choice = completeCoverChoice ?? saferChoice;
    if (!choice) {
      recordTacticalObservedEvent(map, unit, `${unit.name} panicked but could not reach complete cover`);
      continue;
    }
    const origin = { ...unit.position };
    unit.position = { ...choice.move.destination };
    unit.elevationLevel = choice.move.finalElevationLevel;
    unit.facing = choice.move.finalFacing ?? unit.facing;
    recordTacticalMovementAnimation(map, unit, origin, choice.move.path, "run");
    if (choice.visibleHostiles === 0) {
      map.panickedCombatantIds = (map.panickedCombatantIds ?? []).filter((combatantId) => combatantId !== unit.id);
      if (!(map.coweringCombatantIds ?? []).includes(unit.id)) map.coweringCombatantIds = [...(map.coweringCombatantIds ?? []), unit.id];
      recordTacticalObservedEvent(map, unit, `${unit.name} fled to ${unit.position.x},${unit.position.y} and is cowering`, [origin, ...choice.move.path]);
    } else recordTacticalObservedEvent(map, unit, `${unit.name} fled to safer ground at ${unit.position.x},${unit.position.y}`, [origin, ...choice.move.path]);
  }
};
