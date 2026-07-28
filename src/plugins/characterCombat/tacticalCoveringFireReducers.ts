import type { PayloadAction } from "@reduxjs/toolkit";
import { coveringFireDangerSpaceCells, pointKey, validCoveringFireTargets } from "./geometry";
import { coveringFireAmmunitionCost } from "./tacticalCoveringFire";
import { advanceTacticalPlayerActivation, tacticalCombatant } from "./tacticalStateHelpers";
import type { CharacterCombatState, GridPoint } from "./types";

export const tacticalCoveringFireReducers = {
  beginTacticalCoveringFire: (state: CharacterCombatState) => {
    const map = state.tacticalMap;
    const id = map?.activeCharacterId;
    const attacker = map ? tacticalCombatant(map, id) : null;
    const ammunitionCost = attacker ? coveringFireAmmunitionCost(attacker.weapon) : 1;
    if (!map || !id || !attacker || attacker.defeated || (attacker.weapon.highEnergy && !map.bracedCombatantIds.includes(id)) || map.draggingCombatantByCarrierId[id] || (map.actionPointsByCharacterId[id] ?? 0) < 3 || (map.ammunitionByCharacterId[id] ?? 0) < ammunitionCost) return;
    map.coveringFireTargeting = true;
    map.plannedCoveringFireTarget = null;
    map.plannedDestination = null;
    map.plannedAttackTargetId = null;
    map.plannedAttackMode = null;
    map.plannedTreatmentTargetId = null;
    map.plannedExtinguishFire = null;
    map.selectedTerrainObjectId = null;
    map.movementMode = null;
  },
  previewTacticalCoveringFire: (state: CharacterCombatState, action: PayloadAction<GridPoint | null>) => {
    const map = state.tacticalMap;
    const id = map?.activeCharacterId;
    const target = action.payload;
    if (!map || !id || !map.coveringFireTargeting) return;
    if (target === null) {
      map.plannedCoveringFireTarget = null;
      return;
    }
    if (validCoveringFireTargets(map.scenario, id).some((point) => pointKey(point) === pointKey(target))) map.plannedCoveringFireTarget = target;
  },
  confirmTacticalCoveringFire: (state: CharacterCombatState) => {
    const map = state.tacticalMap;
    const id = map?.activeCharacterId;
    const target = map?.plannedCoveringFireTarget;
    const attacker = map ? tacticalCombatant(map, id) : null;
    const ammunitionCost = attacker ? coveringFireAmmunitionCost(attacker.weapon) : 1;
    if (!map || !id || !target || !attacker || attacker.defeated || (attacker.weapon.highEnergy && !map.bracedCombatantIds.includes(id)) || map.draggingCombatantByCarrierId[id] || !map.coveringFireTargeting || (map.actionPointsByCharacterId[id] ?? 0) < 3 || (map.ammunitionByCharacterId[id] ?? 0) < ammunitionCost) return;
    const cells = coveringFireDangerSpaceCells(map.scenario, attacker.position, target, attacker.weapon.extremeRange);
    if (cells.length === 0) return;
    map.coveringFireLanes = [...map.coveringFireLanes.filter((lane) => lane.attackerId !== id), { attackerId: id, target, cells }];
    map.actionPointsByCharacterId[id] -= 3;
    if (!map.coveringFireCommittedCombatantIds.includes(id)) map.coveringFireCommittedCombatantIds.push(id);
    if (!map.actedCharacterIds.includes(id)) map.actedCharacterIds.push(id);
    map.coveringFireTargeting = false;
    map.plannedCoveringFireTarget = null;
    map.movementMode = "walk";
    map.events.unshift(`${attacker.name} covers lane through ${target.x},${target.y} (3 AP, ${ammunitionCost} ammo reserved)`);
    advanceTacticalPlayerActivation(map);
  },
  cancelTacticalCoveringFire: (state: CharacterCombatState) => {
    const map = state.tacticalMap;
    if (!map) return;
    map.coveringFireTargeting = false;
    map.plannedCoveringFireTarget = null;
    map.movementMode = "walk";
  },
};
