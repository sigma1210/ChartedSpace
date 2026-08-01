import type { PayloadAction } from "@reduxjs/toolkit";
import { resolveAhlMelee } from "./combatResolution";
import { meleeEnemies, pointKey, reachableOpenMapMovement } from "./geometry";
import type { TacticalMeleeExchangeRolls } from "./tacticalRolls";
import { advanceTacticalPlayerActivation, tacticalCombatant } from "./tacticalStateHelpers";
import { activeTacticalTerrainObjects, tacticalTerrainBlockedCells, tacticalTerrainBlockedEdges } from "./tacticalTerrain";
import type { CharacterCombatState } from "./types";
import { applyTacticalAhlMeleeEffect } from "./tacticalWounds";

export const tacticalMeleeReducers = {
  previewTacticalMelee: (state: CharacterCombatState, action: PayloadAction<string>) => {
    const map = state.tacticalMap;
    const attackerId = map?.activeCharacterId;
    const attacker = map ? tacticalCombatant(map, attackerId) : null;
    if (!map || !attackerId || !attacker || attacker.defeated || map.draggingCombatantByCarrierId[attackerId] || !meleeEnemies(map.scenario, attackerId).some((target) => target.id === action.payload)) return;
    map.plannedMeleeTargetId = action.payload;
    map.plannedDestination = null;
    map.plannedAttackTargetId = null;
    map.plannedAttackMode = null;
    map.grenadeTargeting = false;
    map.plannedGrenadeTarget = null;
    map.coveringFireTargeting = false;
    map.plannedCoveringFireTarget = null;
    map.plannedTreatmentTargetId = null;
    map.plannedExtinguishFire = null;
    map.selectedTerrainObjectId = null;
    map.movementMode = null;
  },
  previewTacticalMeleeDive: (state: CharacterCombatState, action: PayloadAction<string>) => {
    const map = state.tacticalMap;
    const attackerId = map?.activeCharacterId;
    const attacker = map ? tacticalCombatant(map, attackerId) : null;
    const target = map ? tacticalCombatant(map, action.payload) : null;
    if (!map || !attackerId || !attacker || !target || target.side === attacker.side || target.defeated || attacker.defeated || attacker.posture === "prone" || map.movementMode !== "trot" || map.draggingCombatantByCarrierId[attackerId] || map.suppressedCombatantIds.includes(attackerId)) return;
    const terrain = activeTacticalTerrainObjects(map.scenario, map.doorOpenById, map.destroyedTerrainObjectIds);
    const moves = reachableOpenMapMovement({ width: map.scenario.width, height: map.scenario.height, origin: attacker.position, originElevationLevel: attacker.elevationLevel, facing: attacker.facing, allowance: Math.min(6, map.actionPointsByCharacterId[attackerId] ?? 0), trotting: true, blockedCells: tacticalTerrainBlockedCells(terrain, map.scenario.treeTrunkCells), blockedEdges: tacticalTerrainBlockedEdges(terrain), terrainByCell: map.scenario.terrainByCell, elevationLevelByCell: map.scenario.elevationLevelByCell, bridges: map.scenario.bridges, closeMachineryCells: map.scenario.closeMachineryCells, elevationAccessCells: map.scenario.elevationAccessCells, elevationTransitions: map.scenario.elevationTransitions });
    if (!moves.has(pointKey(target.position))) return;
    map.plannedMeleeTargetId = target.id;
    map.plannedDestination = { ...target.position };
    map.plannedAttackTargetId = null;
    map.plannedAttackMode = null;
    map.grenadeTargeting = false;
    map.plannedGrenadeTarget = null;
    map.coveringFireTargeting = false;
    map.plannedCoveringFireTarget = null;
    map.plannedTreatmentTargetId = null;
    map.selectedTerrainObjectId = null;
  },
  cancelTacticalMelee: (state: CharacterCombatState) => {
    const map = state.tacticalMap;
    if (!map) return;
    map.plannedMeleeTargetId = null;
    map.movementMode = "walk";
  },
  confirmTacticalMelee: (state: CharacterCombatState, action: PayloadAction<TacticalMeleeExchangeRolls>) => {
    const map = state.tacticalMap;
    const attackerId = map?.activeCharacterId;
    const targetId = map?.plannedMeleeTargetId;
    const attacker = map ? tacticalCombatant(map, attackerId) : null;
    const target = map && attackerId && targetId ? meleeEnemies(map.scenario, attackerId).find((unit) => unit.id === targetId) : null;
    if (!map || !attackerId || !attacker || !target || attacker.defeated || map.draggingCombatantByCarrierId[attackerId]) return;
    const sameSquare = pointKey(attacker.position) === pointKey(target.position);
    const attackResult = resolveAhlMelee(attacker, target, action.payload.attackRoll, sameSquare, false);
    const returnEligible = meleeEnemies(map.scenario, target.id).some((unit) => unit.id === attacker.id);
    const returnResult = returnEligible ? resolveAhlMelee(target, attacker, action.payload.responseRoll, sameSquare, false) : null;
    applyTacticalAhlMeleeEffect(map, target, attackResult.effect);
    if (returnResult) applyTacticalAhlMeleeEffect(map, attacker, returnResult.effect);
    map.events.unshift(`${attacker.name} → ${target.name}: MF ${attackResult.differential}, column ${attackResult.tableDifferential}, roll ${attackResult.roll}${attackResult.modifiedRoll !== attackResult.roll ? ` → ${attackResult.modifiedRoll}` : ""}: ${attackResult.effect}`);
    if (returnResult) map.events.unshift(`${target.name} → ${attacker.name}: MF ${returnResult.differential}, column ${returnResult.tableDifferential}, roll ${returnResult.roll}${returnResult.modifiedRoll !== returnResult.roll ? ` → ${returnResult.modifiedRoll}` : ""}: ${returnResult.effect}`);
    map.events.unshift(`AHL melee exchange resolved simultaneously: ${attacker.name} and ${target.name}`);
    if (!map.actedCharacterIds.includes(attackerId)) map.actedCharacterIds.push(attackerId);
    map.bracedCombatantIds = map.bracedCombatantIds.filter((id) => id !== attackerId);
    map.plannedMeleeTargetId = null;
    map.movementMode = "walk";
    advanceTacticalPlayerActivation(map);
  },
};
