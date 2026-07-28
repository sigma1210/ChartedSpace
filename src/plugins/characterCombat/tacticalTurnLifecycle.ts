import type { PayloadAction } from "@reduxjs/toolkit";
import { resolveSnapShot, type DicePair } from "./combatResolution";
import { coverProtection, pointKey, tacticalRangedEnemies, tacticalVisibilityAssessment } from "./geometry";
import { spendTacticalAmmunition } from "./tacticalAmmunition";
import { resolveTacticalPendingDoorCommands } from "./tacticalDoors";
import { tacticalHitRollEvent } from "./tacticalFire";
import { queueTacticalUnexpectedFireMoraleCheck, resolveTacticalCasualtyMoraleChecks, resolveTacticalCoweringRecovery, resolveTacticalPanicFlight, resolveTacticalUnexpectedFireMoraleChecks } from "./tacticalMorale";
import { tacticalVisibilitySnapshot } from "./tacticalObservation";
import { advanceTacticalPlayerActivation, tacticalCombatant, tacticalPlayerIds } from "./tacticalStateHelpers";
import type { CharacterCombatState, TacticalMapState } from "./types";
import { applyTacticalWound } from "./tacticalWounds";

export type TacticalEnemyPhaseRolls = {
  enemyRolls: Record<string, { hitDice: DicePair; woundDice: DicePair }>;
  coveringFireRolls?: Record<string, Record<string, { hitDice: DicePair; woundDice: DicePair }>>;
  dangerSpaceRolls?: Record<string, Record<string, { hitDice: DicePair; woundDice: DicePair }>>;
  coweringRecoveryRolls?: Record<string, DicePair>;
  casualtyMoraleRolls?: Record<string, Record<string, DicePair>>;
  unexpectedFireMoraleRolls?: Record<string, Record<string, DicePair>>;
  coveringFireMoraleRolls?: Record<string, DicePair>;
  movingAdjacentMoraleRolls?: Record<string, DicePair>;
  movingAdjacentSnapRolls?: Record<string, { hitDice: DicePair; woundDice: DicePair }>;
};

export const beginNextTacticalTurn = (map: TacticalMapState, rolls: TacticalEnemyPhaseRolls) => {
  map.turn += 1;
  const clearingSmoke = new Set(Object.entries(map.smokeClearsAtTurnByCell).filter(([, clearTurn]) => clearTurn <= map.turn).map(([key]) => key));
  map.scenario.smokeCells = (map.scenario.smokeCells ?? []).filter((cell) => !clearingSmoke.has(pointKey(cell)));
  clearingSmoke.forEach((key) => { delete map.smokeClearsAtTurnByCell[key]; });
  resolveTacticalPendingDoorCommands(map);
  map.lastWeaponImpact = null;
  map.lastSatchelImpact = null;
  map.actedCharacterIds = [];
  map.movedCombatantIds = [];
  map.processedEnemyPhaseCombatantIds = [];
  map.movingAdjacentMoraleResultByLeaderId = {};
  map.pendingAdjacencyReaction = null;
  map.plannedDestination = null;
  map.plannedEnemyEntryTargetId = null;
  map.enemySquareEnteredCombatantIds = [];
  map.plannedAttackTargetId = null;
  map.plannedAttackMode = null;
  map.plannedMeleeTargetId = null;
  map.aimedTargetId = null;
  map.grenadeTargeting = false;
  map.grenadeKind = null;
  map.plannedGrenadeTarget = null;
  map.plannedExtinguishFire = null;
  map.satchelPlacementPending = false;
  map.lastGrenadeImpact = null;
  map.coveringFireTargeting = false;
  map.plannedCoveringFireTarget = null;
  map.coveringFireLanes = [];
  map.coveringFireCommittedCombatantIds = [];
  map.pendingCoveringFireSnapIds = [];
  map.plannedTreatmentTargetId = null;
  map.selectedTerrainObjectId = null;
  map.evadingCombatantIds = [];
  Object.entries(map.ahlMeleeStunUntilTurnById).forEach(([id, expires]) => {
    if (expires > map.turn) return;
    const unit = tacticalCombatant(map, id);
    if (unit?.woundState === "light" && (unit.seriousWounds ?? 0) === 0) unit.woundState = "healthy";
    delete map.ahlMeleeStunUntilTurnById[id];
  });
  resolveTacticalCoweringRecovery(map, "player", rolls.coweringRecoveryRolls ?? {});
  resolveTacticalCasualtyMoraleChecks(map, "player", rolls.casualtyMoraleRolls ?? {});
  resolveTacticalUnexpectedFireMoraleChecks(map, "player", rolls.unexpectedFireMoraleRolls ?? {});
  resolveTacticalPanicFlight(map, "player");
  const livingPlayerIds = tacticalPlayerIds(map).filter((id) => !tacticalCombatant(map, id)?.defeated && !(map.coweringCombatantIds ?? []).includes(id) && !(map.panickedCombatantIds ?? []).includes(id));
  map.actionPointsByCharacterId = Object.fromEntries(map.scenario.combatants.map((unit) => [unit.id, unit.defeated || (map.coweringCombatantIds ?? []).includes(unit.id) || (map.panickedCombatantIds ?? []).includes(unit.id) ? 0 : 6]));
  map.actionPhaseStartPositionByCombatantId = Object.fromEntries(map.scenario.combatants.map((unit) => [unit.id, { ...unit.position }]));
  map.activeCharacterId = livingPlayerIds[0] ?? null;
  map.visibleHostileIdsAtPhaseStartByCombatantId = tacticalVisibilitySnapshot(map.scenario);
  map.events.unshift(`Turn ${map.turn} begins`);
};

export const tacticalTurnLifecycleReducers = {
  activateTacticalCharacter: (state: CharacterCombatState, action: PayloadAction<string>) => {
    const map = state.tacticalMap;
    if (!map
      || map.scenarioStatus !== "active"
      || map.actedCharacterIds.includes(action.payload)
      || (map.actionPointsByCharacterId[action.payload] ?? 0) < 1) return;
    if (map.activeCharacterId !== action.payload) map.selectedTerrainObjectId = null;
    if (map.activeCharacterId !== action.payload) map.aimedTargetId = null;
    map.activeCharacterId = action.payload;
    map.movementMode = map.enemySquareEnteredCombatantIds.includes(action.payload) ? null : "walk";
    map.plannedDestination = null;
    map.plannedEnemyEntryTargetId = null;
    map.plannedAttackTargetId = null;
    map.plannedAttackMode = null;
    map.plannedMeleeTargetId = null;
    map.grenadeTargeting = false;
    map.plannedGrenadeTarget = null;
    map.plannedExtinguishFire = null;
    map.lastGrenadeImpact = null;
    map.coveringFireTargeting = false;
    map.plannedCoveringFireTarget = null;
    map.plannedTreatmentTargetId = null;
  },
  finishTacticalActivation: (state: CharacterCombatState) => {
    const map = state.tacticalMap;
    const id = map?.activeCharacterId;
    if (!map || !id) return;
    const character = tacticalCombatant(map, id);
    if (character) map.events.unshift(`${character.name} finished activation`);
    if (!map.actedCharacterIds.includes(id)) map.actedCharacterIds.push(id);
    map.movementMode = "walk";
    map.plannedDestination = null;
    map.grenadeTargeting = false;
    map.plannedGrenadeTarget = null;
    map.coveringFireTargeting = false;
    map.plannedCoveringFireTarget = null;
    map.plannedTreatmentTargetId = null;
    map.plannedMeleeTargetId = null;
    map.selectedTerrainObjectId = null;
    advanceTacticalPlayerActivation(map);
  },
  resolveTacticalCoveringFireSnap: (state: CharacterCombatState, action: PayloadAction<{ fire: boolean; targetId?: string; hitDice: DicePair; woundDice: DicePair; phaseRolls: TacticalEnemyPhaseRolls }>) => {
    const map = state.tacticalMap;
    const shooterId = map?.pendingCoveringFireSnapIds[0];
    const shooter = map ? tacticalCombatant(map, shooterId) : null;
    if (!map || !shooterId || !shooter || map.activeCharacterId !== shooterId) return;
    if (action.payload.fire) {
      const target = tacticalRangedEnemies(map.scenario, shooter.id).find((unit) => unit.id === action.payload.targetId && unit.side !== shooter.side);
      if (!target || shooter.defeated || shooter.weapon.highEnergy || (map.actionPointsByCharacterId[shooter.id] ?? 0) < 3 || (map.ammunitionByCharacterId[shooter.id] ?? 0) < 1) return;
      const result = resolveSnapShot(shooter, target, action.payload.hitDice, action.payload.woundDice, coverProtection(map.scenario, shooter.id, target.id), "snap", map.evadingCombatantIds.includes(target.id), map.suppressedCombatantIds.includes(shooter.id), map.bracedCombatantIds.includes(shooter.id), tacticalVisibilityAssessment(map.scenario, shooter, target).darknessModifier);
      if (!result) return;
      map.actionPointsByCharacterId[shooter.id] -= 3;
      spendTacticalAmmunition(map, shooter, 1);
      queueTacticalUnexpectedFireMoraleCheck(map, shooter, target);
      if (result.hit) applyTacticalWound(map, target, result.woundState);
      map.events.unshift(`${shooter.name} retained snap fired at ${target.name}: ${tacticalHitRollEvent(result)} · ${result.hit ? `wound ${result.woundTotal} (${result.woundState})` : "miss"}`);
    } else map.events.unshift(`${shooter.name} declined the retained snap shot`);
    map.pendingCoveringFireSnapIds.shift();
    map.plannedAttackTargetId = null;
    map.plannedAttackMode = null;
    const nextShooterId = map.pendingCoveringFireSnapIds.find((id) => {
      const unit = tacticalCombatant(map, id);
      return Boolean(unit && !unit.defeated && !unit.weapon.highEnergy && (map.actionPointsByCharacterId[id] ?? 0) >= 3 && (map.ammunitionByCharacterId[id] ?? 0) >= 1);
    });
    if (nextShooterId) {
      map.pendingCoveringFireSnapIds = map.pendingCoveringFireSnapIds.slice(map.pendingCoveringFireSnapIds.indexOf(nextShooterId));
      map.activeCharacterId = nextShooterId;
      map.events.unshift(`${tacticalCombatant(map, nextShooterId)?.name ?? "Character"} may take the retained snap shot or decline`);
      return;
    }
    map.activeCharacterId = null;
    beginNextTacticalTurn(map, action.payload.phaseRolls);
  },
};
