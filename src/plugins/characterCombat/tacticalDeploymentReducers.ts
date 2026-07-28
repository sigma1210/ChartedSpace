import type { PayloadAction } from "@reduxjs/toolkit";
import { equipmentCatalogById } from "@/plugins/equipmentCatalog/catalog";
import { characterCombatArmor, characterCombatWeapons } from "./equipment";
import { pointKey } from "./geometry";
import { applyAmmunitionProfile } from "./tacticalAmmunition";
import { tacticalCombatant } from "./tacticalStateHelpers";
import { tacticalTerrainBlockedCells, tacticalTerrainObjectsForScenario } from "./tacticalTerrain";
import type { CharacterCombatState, GridPoint } from "./types";

export const tacticalDeploymentReducers = {
  selectTacticalDeploymentCharacter: (state: CharacterCombatState, action: PayloadAction<string>) => {
    const map = state.tacticalMap;
    const unit = map ? tacticalCombatant(map, action.payload) : null;
    if (!map || map.scenarioStatus !== "setup" || unit?.side !== "player") return;
    map.deploymentCharacterId = unit.id;
  },
  deployTacticalCharacter: (state: CharacterCombatState, action: PayloadAction<GridPoint>) => {
    const map = state.tacticalMap;
    const unit = map ? tacticalCombatant(map, map.deploymentCharacterId) : null;
    if (!map || map.scenarioStatus !== "setup" || unit?.side !== "player") return;
    const destination = action.payload;
    const destinationKey = pointKey(destination);
    if (!(map.scenario.deploymentCells ?? []).some((cell) => pointKey(cell) === destinationKey)) return;
    const blocked = tacticalTerrainBlockedCells(tacticalTerrainObjectsForScenario(map.scenario));
    if (blocked.has(destinationKey) || (map.scenario.closeMachineryCells ?? []).some((cell) => pointKey(cell) === destinationKey) || (map.scenario.fireCells ?? []).some((cell) => pointKey(cell) === destinationKey)) return;
    const deployedIds = new Set(map.deployedCharacterIds ?? []);
    const occupied = map.scenario.combatants.some((candidate) => candidate.id !== unit.id && (candidate.side === "enemy" || deployedIds.has(candidate.id)) && pointKey(candidate.position) === destinationKey);
    if (occupied) return;
    unit.position = { ...destination };
    unit.elevationLevel = map.scenario.elevationLevelByCell?.[destinationKey] ?? 0;
    if (!deployedIds.has(unit.id)) map.deployedCharacterIds = [...deployedIds, unit.id];
    map.events.unshift(`${unit.name} deployed at ${destination.x},${destination.y}`);
  },
  rotateTacticalDeploymentCharacter: (state: CharacterCombatState, action: PayloadAction<"left" | "right">) => {
    const map = state.tacticalMap;
    const unit = map ? tacticalCombatant(map, map.deploymentCharacterId) : null;
    if (!map || map.scenarioStatus !== "setup" || unit?.side !== "player" || !(map.deployedCharacterIds ?? []).includes(unit.id)) return;
    const directions = ["north", "east", "south", "west"] as const;
    const currentIndex = directions.indexOf(unit.facing);
    const offset = action.payload === "right" ? 1 : directions.length - 1;
    unit.facing = directions[(currentIndex + offset) % directions.length];
  },
  setTacticalDeploymentPosture: (state: CharacterCombatState, action: PayloadAction<"standing" | "prone">) => {
    const map = state.tacticalMap;
    const unit = map ? tacticalCombatant(map, map.deploymentCharacterId) : null;
    if (!map || map.scenarioStatus !== "setup" || unit?.side !== "player" || !(map.deployedCharacterIds ?? []).includes(unit.id)) return;
    unit.posture = action.payload;
  },
  equipTacticalDeploymentItem: (state: CharacterCombatState, action: PayloadAction<{ characterId: string; lockerItemId: string; catalogItemId: string }>) => {
    const map = state.tacticalMap;
    const unit = map ? tacticalCombatant(map, action.payload.characterId) : null;
    const catalogItem = equipmentCatalogById.get(action.payload.catalogItemId);
    if (!map || map.scenarioStatus !== "setup" || unit?.side !== "player" || !catalogItem) return;
    const assignments = { ...(map.deploymentLoadoutByCharacterId ?? {}) };
    Object.entries(assignments).forEach(([characterId, assignment]) => {
      if (assignment.weaponLockerItemId !== action.payload.lockerItemId && assignment.armorLockerItemId !== action.payload.lockerItemId) return;
      const previousUnit = tacticalCombatant(map, characterId);
      if (previousUnit && assignment.weaponLockerItemId === action.payload.lockerItemId) {
        previousUnit.weapon = { ...characterCombatWeapons.noRangedWeapon };
        map.ammunitionByCharacterId[previousUnit.id] = 0;
        delete map.ammunitionByCombatantAndKind[previousUnit.id];
      }
      if (previousUnit && assignment.armorLockerItemId === action.payload.lockerItemId) {
        previousUnit.armor = 0;
        previousUnit.armorName = "No Armor";
      }
      assignments[characterId] = {
        ...assignment,
        ...(assignment.weaponLockerItemId === action.payload.lockerItemId ? { weaponLockerItemId: undefined } : {}),
        ...(assignment.armorLockerItemId === action.payload.lockerItemId ? { armorLockerItemId: undefined } : {}),
      };
    });
    const currentAssignment = assignments[unit.id] ?? {};
    if (catalogItem.kind === "weapon") {
      const weapon = characterCombatWeapons[catalogItem.combatEquipmentId as keyof typeof characterCombatWeapons];
      if (!weapon) return;
      assignments[unit.id] = { ...currentAssignment, weaponLockerItemId: action.payload.lockerItemId };
      unit.weapon = { ...weapon };
      const profiles = unit.weapon.ammunitionProfiles;
      if (profiles?.length) {
        const selectedProfile = profiles.find((profile) => profile.kind === unit.weapon.ammunitionKind) ?? profiles[0];
        applyAmmunitionProfile(unit.weapon, selectedProfile);
        map.ammunitionByCombatantAndKind[unit.id] = Object.fromEntries(profiles.map((profile) => [profile.kind, unit.weapon.magazineSize ?? 12]));
      } else delete map.ammunitionByCombatantAndKind[unit.id];
      map.ammunitionByCharacterId[unit.id] = unit.weapon.magazineSize ?? 0;
    } else {
      const armor = characterCombatArmor[catalogItem.combatEquipmentId as keyof typeof characterCombatArmor];
      if (!armor) return;
      assignments[unit.id] = { ...currentAssignment, armorLockerItemId: action.payload.lockerItemId };
      unit.armor = armor.value;
      unit.armorName = armor.name;
    }
    map.deploymentLoadoutByCharacterId = assignments;
  },
  unequipTacticalDeploymentItem: (state: CharacterCombatState, action: PayloadAction<{ characterId: string; kind: "weapon" | "armor" }>) => {
    const map = state.tacticalMap;
    const unit = map ? tacticalCombatant(map, action.payload.characterId) : null;
    if (!map || map.scenarioStatus !== "setup" || unit?.side !== "player") return;
    const assignments = { ...(map.deploymentLoadoutByCharacterId ?? {}) };
    const currentAssignment = assignments[unit.id] ?? {};
    if (action.payload.kind === "weapon") {
      assignments[unit.id] = { ...currentAssignment, weaponLockerItemId: undefined };
      unit.weapon = { ...characterCombatWeapons.noRangedWeapon };
      map.ammunitionByCharacterId[unit.id] = 0;
      delete map.ammunitionByCombatantAndKind[unit.id];
    } else {
      assignments[unit.id] = { ...currentAssignment, armorLockerItemId: undefined };
      unit.armor = 0;
      unit.armorName = "No Armor";
    }
    map.deploymentLoadoutByCharacterId = assignments;
  },
};
