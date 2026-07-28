import type { PayloadAction } from "@reduxjs/toolkit";
import { escalateWoundState, woundStateForTotal, type DicePair } from "./combatResolution";
import { collateralBlastCells, grenadeBlastCells, grenadeLandingPoint, grenadeThrowCoverModifier, grenadeThrowRangeModifier, pointKey, validGrenadeTargets } from "./geometry";
import { collateralCheckPasses, detonateTacticalSatchelsReceivingCollateral, resolveTacticalSatchelCharge, type TacticalCollateralRolls } from "./tacticalCollateral";
import { advanceTacticalPlayerActivation, tacticalCombatant } from "./tacticalStateHelpers";
import type { CharacterCombatState, GridPoint } from "./types";
import { applyTacticalWound } from "./tacticalWounds";

export const tacticalExplosivesReducers = {
  beginTacticalGrenadeTargeting: (state: CharacterCombatState) => {
    const map = state.tacticalMap;
    const id = map?.activeCharacterId;
    const attacker = map ? tacticalCombatant(map, id) : null;
    if (!map || !id || !attacker || attacker.defeated || attacker.grenades < 1 || map.draggingCombatantByCarrierId[id] || (map.actionPointsByCharacterId[id] ?? 0) < 6) return;
    map.grenadeTargeting = true;
    map.grenadeKind = "fragmentation";
    map.plannedGrenadeTarget = null;
    map.lastGrenadeImpact = null;
    map.plannedDestination = null;
    map.plannedAttackTargetId = null;
    map.plannedAttackMode = null;
    map.coveringFireTargeting = false;
    map.plannedCoveringFireTarget = null;
    map.plannedTreatmentTargetId = null;
    map.plannedExtinguishFire = null;
    map.selectedTerrainObjectId = null;
    map.movementMode = null;
  },
  beginTacticalSmokeGrenadeTargeting: (state: CharacterCombatState) => {
    const map = state.tacticalMap;
    const id = map?.activeCharacterId;
    const attacker = map ? tacticalCombatant(map, id) : null;
    if (!map || !id || !attacker || attacker.defeated || (attacker.smokeGrenades ?? 0) < 1 || map.draggingCombatantByCarrierId[id] || (map.actionPointsByCharacterId[id] ?? 0) < 6) return;
    map.grenadeTargeting = true;
    map.grenadeKind = "smoke";
    map.plannedGrenadeTarget = null;
    map.lastGrenadeImpact = null;
    map.plannedDestination = null;
    map.plannedAttackTargetId = null;
    map.plannedAttackMode = null;
    map.coveringFireTargeting = false;
    map.plannedCoveringFireTarget = null;
    map.plannedTreatmentTargetId = null;
    map.plannedExtinguishFire = null;
    map.selectedTerrainObjectId = null;
    map.movementMode = null;
  },
  previewTacticalGrenadeTarget: (state: CharacterCombatState, action: PayloadAction<GridPoint | null>) => {
    const map = state.tacticalMap;
    const id = map?.activeCharacterId;
    const target = action.payload;
    if (!map || !id || !map.grenadeTargeting) return;
    if (target === null) {
      map.plannedGrenadeTarget = null;
      return;
    }
    if (validGrenadeTargets(map.scenario, id).some((point) => pointKey(point) === pointKey(target))) map.plannedGrenadeTarget = target;
  },
  cancelTacticalGrenadeTargeting: (state: CharacterCombatState) => {
    const map = state.tacticalMap;
    if (!map) return;
    map.grenadeTargeting = false;
    map.grenadeKind = null;
    map.plannedGrenadeTarget = null;
    map.movementMode = "walk";
  },
  confirmTacticalGrenade: (state: CharacterCombatState, action: PayloadAction<{ rollsByCombatantId: Record<string, DicePair>; throwDice: DicePair; scatterDice: DicePair; occupiedSquareRolls?: Record<string, number>; collateralRolls: TacticalCollateralRolls }>) => {
    const map = state.tacticalMap;
    const attackerId = map?.activeCharacterId;
    const center = map?.plannedGrenadeTarget;
    const attacker = map ? tacticalCombatant(map, attackerId) : null;
    const grenadeKind = map?.grenadeKind ?? "fragmentation";
    const hasGrenade = attacker ? grenadeKind === "smoke" ? (attacker.smokeGrenades ?? 0) > 0 : attacker.grenades > 0 : false;
    if (!map || !attackerId || !attacker || !center || !map.grenadeTargeting || attacker.defeated || !hasGrenade || map.draggingCombatantByCarrierId[attackerId] || (map.actionPointsByCharacterId[attackerId] ?? 0) < 6) return;
    if (!validGrenadeTargets(map.scenario, attackerId).some((point) => pointKey(point) === pointKey(center))) return;
    const throwModifier = grenadeThrowRangeModifier(attacker.position, center) + grenadeThrowCoverModifier(map.scenario, attacker.id, center);
    const throwResult = grenadeLandingPoint(map.scenario, attacker.position, center, action.payload.throwDice, action.payload.scatterDice, throwModifier, action.payload.occupiedSquareRolls);
    const landing = throwResult.landing;
    const blastCells = grenadeKind === "smoke" ? grenadeBlastCells(map.scenario, landing) : collateralBlastCells(map.scenario, landing);
    const blastKeys = new Set(blastCells.map(pointKey));
    map.lastGrenadeImpact = { kind: grenadeKind, intended: center, landing, scattered: !throwResult.hit, blastCells };
    if (grenadeKind === "smoke") {
      map.scenario.smokeCells ??= [];
      blastCells.forEach((cell) => {
        const key = pointKey(cell);
        if (!map.scenario.smokeCells!.some((smoke) => pointKey(smoke) === key)) map.scenario.smokeCells!.push({ ...cell });
        map.smokeClearsAtTurnByCell[key] = map.turn + 3;
      });
    } else map.scenario.combatants.filter((unit) => !unit.defeated && blastKeys.has(pointKey(unit.position))).forEach((target) => {
      const distance = Math.max(Math.abs(target.position.x - landing.x), Math.abs(target.position.y - landing.y));
      const rolls = action.payload.collateralRolls[target.id] ?? (action.payload.rollsByCombatantId[target.id] ? { checkDice: action.payload.rollsByCombatantId[target.id], woundDice: action.payload.rollsByCombatantId[target.id] } : null);
      if (!rolls) return;
      const checkTotal = rolls.checkDice.first + rolls.checkDice.second;
      if (!collateralCheckPasses(distance, checkTotal)) {
        map.events.unshift(`${target.name} avoided fragmentation collateral at ${distance} square${distance === 1 ? "" : "s"} (${checkTotal})`);
        return;
      }
      const penetration = Math.floor(3 / (2 ** distance));
      if (penetration <= 0) return;
      const woundRoll = rolls.woundDice.first + rolls.woundDice.second;
      const total = woundRoll + penetration - target.armor;
      applyTacticalWound(map, target, escalateWoundState(woundStateForTotal(total)));
      map.events.unshift(`${target.name} caught in grenade blast at ${distance} square${distance === 1 ? "" : "s"}: ${woundRoll} +${penetration} penetration -${target.armor} armor = ${total}; HE escalation (${target.woundState})`);
    });
    if (grenadeKind !== "smoke") detonateTacticalSatchelsReceivingCollateral(map, landing, 3, action.payload.collateralRolls);
    if (grenadeKind === "smoke") attacker.smokeGrenades = (attacker.smokeGrenades ?? 0) - 1;
    else attacker.grenades -= 1;
    map.actionPointsByCharacterId[attackerId] = 0;
    if (!map.actedCharacterIds.includes(attackerId)) map.actedCharacterIds.push(attackerId);
    map.events.unshift(throwResult.hit
      ? `${attacker.name} landed a ${grenadeKind} grenade at ${landing.x},${landing.y} (${action.payload.throwDice.first + action.payload.throwDice.second}${throwModifier ? ` ${throwModifier > 0 ? "+" : ""}${throwModifier}` : ""} vs 8, 6 AP)`
      : `${attacker.name} threw ${grenadeKind} at ${center.x},${center.y}; grenade scattered to ${landing.x},${landing.y} (6 AP)`);
    map.grenadeTargeting = false;
    map.grenadeKind = null;
    map.plannedGrenadeTarget = null;
    map.movementMode = "walk";
    advanceTacticalPlayerActivation(map);
  },
  previewTacticalExtinguishFire: (state: CharacterCombatState, action: PayloadAction<GridPoint>) => {
    const map = state.tacticalMap;
    const characterId = map?.activeCharacterId;
    const character = map ? tacticalCombatant(map, characterId) : null;
    const fire = action.payload;
    if (!map || map.scenarioStatus !== "active" || !characterId || !character || character.defeated || (map.actionPointsByCharacterId[characterId] ?? 0) < 3) return;
    const adjacent = Math.abs(character.position.x - fire.x) + Math.abs(character.position.y - fire.y) === 1;
    if (!adjacent || !map.scenario.fireCells?.some((cell) => pointKey(cell) === pointKey(fire))) return;
    map.plannedExtinguishFire = { ...fire };
    map.plannedDestination = null;
    map.plannedEnemyEntryTargetId = null;
    map.plannedAttackTargetId = null;
    map.plannedAttackMode = null;
    map.plannedMeleeTargetId = null;
    map.grenadeTargeting = false;
    map.grenadeKind = null;
    map.plannedGrenadeTarget = null;
    map.coveringFireTargeting = false;
    map.plannedCoveringFireTarget = null;
    map.plannedTreatmentTargetId = null;
    map.selectedTerrainObjectId = null;
    map.movementMode = null;
  },
  confirmTacticalExtinguishFire: (state: CharacterCombatState) => {
    const map = state.tacticalMap;
    const characterId = map?.activeCharacterId;
    const character = map ? tacticalCombatant(map, characterId) : null;
    const fire = map?.plannedExtinguishFire;
    if (!map || map.scenarioStatus !== "active" || !characterId || !character || !fire || character.defeated || (map.actionPointsByCharacterId[characterId] ?? 0) < 3) return;
    const fireIndex = map.scenario.fireCells?.findIndex((cell) => pointKey(cell) === pointKey(fire)) ?? -1;
    if (fireIndex < 0 || Math.abs(character.position.x - fire.x) + Math.abs(character.position.y - fire.y) !== 1) return;
    map.scenario.fireCells!.splice(fireIndex, 1);
    map.scenario.smokeCells ??= [];
    if (!map.scenario.smokeCells.some((cell) => pointKey(cell) === pointKey(fire))) map.scenario.smokeCells.push({ ...fire });
    map.smokeClearsAtTurnByCell[pointKey(fire)] = map.turn + 1;
    map.actionPointsByCharacterId[characterId] -= 3;
    map.plannedExtinguishFire = null;
    map.movementMode = "walk";
    map.events.unshift(`${character.name} extinguished fire at ${fire.x},${fire.y} (3 AP)`);
    if (map.actionPointsByCharacterId[characterId] > 0) return;
    if (!map.actedCharacterIds.includes(characterId)) map.actedCharacterIds.push(characterId);
    advanceTacticalPlayerActivation(map);
  },
  cancelTacticalExtinguishFire: (state: CharacterCombatState) => {
    const map = state.tacticalMap;
    if (!map) return;
    map.plannedExtinguishFire = null;
    map.movementMode = "walk";
  },
  beginTacticalSatchelPlacement: (state: CharacterCombatState) => {
    const map = state.tacticalMap;
    const characterId = map?.activeCharacterId;
    const character = map ? tacticalCombatant(map, characterId) : null;
    if (!map || map.scenarioStatus !== "active" || !characterId || !character || character.defeated || map.actedCharacterIds.includes(characterId) || map.draggingCombatantByCarrierId[characterId] || (map.actionPointsByCharacterId[characterId] ?? 0) !== 6 || (character.breachingCharges ?? 0) < 1) return;
    map.satchelPlacementPending = true;
    map.plannedDestination = null;
    map.plannedEnemyEntryTargetId = null;
    map.plannedAttackTargetId = null;
    map.plannedAttackMode = null;
    map.plannedMeleeTargetId = null;
    map.grenadeTargeting = false;
    map.grenadeKind = null;
    map.plannedGrenadeTarget = null;
    map.plannedExtinguishFire = null;
    map.coveringFireTargeting = false;
    map.plannedCoveringFireTarget = null;
    map.plannedTreatmentTargetId = null;
    map.selectedTerrainObjectId = null;
    map.movementMode = null;
  },
  confirmTacticalSatchelPlacement: (state: CharacterCombatState) => {
    const map = state.tacticalMap;
    const characterId = map?.activeCharacterId;
    const character = map ? tacticalCombatant(map, characterId) : null;
    if (!map || map.scenarioStatus !== "active" || !map.satchelPlacementPending || !characterId || !character || character.defeated || map.actedCharacterIds.includes(characterId) || map.draggingCombatantByCarrierId[characterId] || (map.actionPointsByCharacterId[characterId] ?? 0) !== 6 || (character.breachingCharges ?? 0) < 1) return;
    const charge = { id: `satchel:${map.turn}:${characterId}:${map.satchelCharges.length + 1}`, placerId: characterId, position: { ...character.position }, placedTurn: map.turn };
    map.satchelCharges.push(charge);
    character.breachingCharges = (character.breachingCharges ?? 0) - 1;
    map.actionPointsByCharacterId[characterId] = 0;
    if (!map.actedCharacterIds.includes(characterId)) map.actedCharacterIds.push(characterId);
    map.satchelPlacementPending = false;
    map.movementMode = "walk";
    map.events.unshift(`${character.name} emplaced a satchel charge at ${charge.position.x},${charge.position.y}; only ${character.name} may detonate it`);
    advanceTacticalPlayerActivation(map);
  },
  cancelTacticalSatchelPlacement: (state: CharacterCombatState) => {
    if (!state.tacticalMap) return;
    state.tacticalMap.satchelPlacementPending = false;
    state.tacticalMap.movementMode = "walk";
  },
  detonateTacticalSatchelCharge: (state: CharacterCombatState, action: PayloadAction<{ chargeId: string; rollsByCombatantId: TacticalCollateralRolls }>) => {
    const map = state.tacticalMap;
    const characterId = map?.activeCharacterId;
    const character = map ? tacticalCombatant(map, characterId) : null;
    const charge = map?.satchelCharges.find((candidate) => candidate.id === action.payload.chargeId);
    if (!map || map.scenarioStatus !== "active" || !characterId || !character || !charge || charge.placerId !== characterId || character.defeated || map.actedCharacterIds.includes(characterId) || (map.actionPointsByCharacterId[characterId] ?? 0) < 1) return;
    map.actionPointsByCharacterId[characterId] -= 1;
    resolveTacticalSatchelCharge(map, charge.id, action.payload.rollsByCombatantId);
    map.events.unshift(`${character.name} detonated their satchel charge (1 AP)`);
    if (!character.defeated && map.actionPointsByCharacterId[characterId] > 0) return;
    if (!map.actedCharacterIds.includes(characterId)) map.actedCharacterIds.push(characterId);
    advanceTacticalPlayerActivation(map);
  },
  defuseTacticalSatchelCharge: (state: CharacterCombatState, action: PayloadAction<string>) => {
    const map = state.tacticalMap;
    const characterId = map?.activeCharacterId;
    const character = map ? tacticalCombatant(map, characterId) : null;
    const charge = map?.satchelCharges.find((candidate) => candidate.id === action.payload);
    if (!map || map.scenarioStatus !== "active" || !characterId || !character || !charge || character.defeated || map.actedCharacterIds.includes(characterId) || map.draggingCombatantByCarrierId[characterId] || (map.actionPointsByCharacterId[characterId] ?? 0) !== 6 || pointKey(character.position) !== pointKey(charge.position)) return;
    map.satchelCharges = map.satchelCharges.filter((candidate) => candidate.id !== charge.id);
    map.actionPointsByCharacterId[characterId] = 0;
    if (!map.actedCharacterIds.includes(characterId)) map.actedCharacterIds.push(characterId);
    map.events.unshift(`${character.name} spent the entire activation defusing the satchel charge at ${charge.position.x},${charge.position.y}`);
    advanceTacticalPlayerActivation(map);
  },
};
