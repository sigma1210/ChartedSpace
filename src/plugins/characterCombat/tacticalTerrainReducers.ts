import type { Draft, PayloadAction } from "@reduxjs/toolkit";
import { weaponPenetrationForRange } from "./combatResolution";
import { distanceBetween } from "./enemyTactics";
import { pointKey } from "./geometry";
import { prepareTacticalAmmunition, spendTacticalAmmunition } from "./tacticalAmmunition";
import {
  tacticalStructureBreachThreshold,
  tacticalStructurePenetrationModifier,
} from "./tacticalCollateral";
import {
  consoleOperationAvailable,
  travellerTaskTarget,
} from "./tacticalConsoleVictory";
import { irisValveAcrossPressureDifferential, tacticalTerrainObject } from "./tacticalDoors";
import type { TacticalConsoleCheckRolls, TacticalStructuralFireRolls } from "./tacticalRolls";
import { randomTacticalEnemyAvatarPath } from "./tacticalEnemyDefinitions";
import {
  buildTransformedInteractiveHuman,
  defaultTacticalInteractiveHumanCombatProfile,
} from "./tacticalInteractiveHuman";
import { tacticalVisibilitySnapshot } from "./tacticalObservation";
import { concludeTacticalScenario } from "./tacticalScenarioOutcome";
import { advanceTacticalPlayerActivation, tacticalCombatant } from "./tacticalStateHelpers";
import {
  combatantFacingForTacticalRotation,
  type TacticalDoor,
  type TacticalTerminal,
} from "./tacticalTerrain";
import type { CharacterCombatState, TacticalMapState } from "./types";

const transformTacticalInteractiveHuman = (
  map: TacticalMapState,
  terminal: TacticalTerminal,
  allegiance: "ally" | "enemy",
) => {
  const combatantId = terminal.id.endsWith(":terminal")
    ? `${terminal.id.slice(0, -":terminal".length)}:combatant`
    : `${terminal.id}:combatant`;
  if (map.scenario.combatants.some((unit) => unit.id === combatantId)) return;
  const combatant = buildTransformedInteractiveHuman({
    id: combatantId,
    name: terminal.label,
    side: allegiance === "ally" ? "player" : "enemy",
    position: terminal.position,
    facing: combatantFacingForTacticalRotation(terminal.facing),
    modelPath: terminal.modelPath,
    profile: terminal.combatProfile ?? defaultTacticalInteractiveHumanCombatProfile,
  });
  if (allegiance === "enemy") combatant.avatarPath = randomTacticalEnemyAvatarPath();
  combatant.elevationLevel = map.scenario.elevationLevelByCell?.[pointKey(terminal.position)] ?? 0;
  map.scenario.terrainObjects = (map.scenario.terrainObjects ?? []).filter((object) => object.id !== terminal.id);
  map.scenario.objects = map.scenario.objects.filter((object) => object.id !== terminal.id);
  map.scenario.combatants.push(combatant);
  map.selectedTerrainObjectId = null;
  map.terminalActiveById[terminal.id] = true;
  map.actionPointsByCharacterId[combatant.id] = allegiance === "ally" ? 0 : 6;
  map.ammunitionByCharacterId[combatant.id] = combatant.weapon.magazineSize ?? 12;
  const preparedAmmunition = prepareTacticalAmmunition(map.scenario)[combatant.id];
  if (preparedAmmunition) map.ammunitionByCombatantAndKind[combatant.id] = preparedAmmunition;
  if (allegiance === "ally" && !map.actedCharacterIds.includes(combatant.id)) {
    map.actedCharacterIds.push(combatant.id);
  }
  map.visibleHostileIdsAtPhaseStartByCombatantId = tacticalVisibilitySnapshot(map.scenario);
  map.events.unshift(`${terminal.label} became ${allegiance === "ally" ? "an ally" : "an enemy"} and may act in the next ${allegiance === "ally" ? "player" : "enemy"} phase`);
};

export const tacticalTerrainReducers = {
  selectTacticalTerrainObject: (
    state: Draft<CharacterCombatState>,
    action: PayloadAction<string | null>,
  ) => {
    if (state.tacticalMap) {
      state.tacticalMap.selectedTerrainObjectId = action.payload;
      state.tacticalMap.plannedDestination = null;
      state.tacticalMap.plannedAttackTargetId = null;
      state.tacticalMap.plannedAttackMode = null;
    }
  },
  interactWithTacticalTerrain: (state: Draft<CharacterCombatState>) => {
    const map = state.tacticalMap;
    const characterId = map?.activeCharacterId;
    const object = map ? tacticalTerrainObject(map, map.selectedTerrainObjectId) : null;
    const character = map ? tacticalCombatant(map, characterId) : null;
    if (!map || map.scenarioStatus !== "active" || !characterId || !object || !character) return;
    let interactionEvent: string;
    if (object.kind === "door") {
      const door = object as TacticalDoor;
      const startPosition = map.actionPhaseStartPositionByCombatantId[characterId];
      const adjacentAtPhaseStart = Boolean(
        startPosition
        && [door.separates.first, door.separates.second].some(
          (position) => position.x === startPosition.x && position.y === startPosition.y,
        ),
      );
      const open = map.doorOpenById[door.id] ?? door.open;
      if (!adjacentAtPhaseStart
        || map.pendingDoorCommandsById[door.id]
        || (map.actionPointsByCharacterId[characterId] ?? 0) < 2) return;
      if (!open && irisValveAcrossPressureDifferential(map, door.id)) {
        map.events.unshift(`${character.name} could not open ${door.id} across a pressure differential`);
        return;
      }
      map.pendingDoorCommandsById[door.id] = {
        open: !open,
        resolvesAtTurn: map.turn + 1,
        characterId,
      };
      map.actionPointsByCharacterId[characterId] -= 2;
      interactionEvent = `${character.name} activated the ${door.portalType === "iris-valve" ? "iris valve" : "control-room door"} to ${open ? "close" : "open"} at the start of Turn ${map.turn + 1} (2 AP)`;
    } else if (object.kind === "hatch") {
      const hatch = object;
      const startPosition = map.actionPhaseStartPositionByCombatantId[characterId];
      const adjacentAtPhaseStart = Boolean(startPosition && distanceBetween(startPosition, hatch.position) === 1);
      const open = map.doorOpenById[hatch.id] ?? hatch.open;
      if (!adjacentAtPhaseStart
        || map.pendingDoorCommandsById[hatch.id]
        || (map.actionPointsByCharacterId[characterId] ?? 0) < 6) return;
      map.pendingDoorCommandsById[hatch.id] = {
        open: !open,
        resolvesAtTurn: map.turn + 1,
        characterId,
      };
      map.actionPointsByCharacterId[characterId] -= 6;
      interactionEvent = `${character.name} activated the hatch to ${open ? "close" : "open"} at the start of Turn ${map.turn + 1} (6 AP)`;
    } else if (object.kind === "terminal") {
      const terminal = object as TacticalTerminal;
      if (map.scenario.consoleVictory?.operations.some(
        (operation) => `${operation.consolePlacementId}:terminal` === terminal.id,
      )) return;
      const adjacent = Math.abs(terminal.position.x - character.position.x)
        + Math.abs(terminal.position.y - character.position.y) === 1;
      if (!terminal.operational
        || !adjacent
        || map.terminalActiveById[terminal.id]
        || (map.actionPointsByCharacterId[characterId] ?? 0) < 6) return;
      map.terminalActiveById[terminal.id] = true;
      map.actionPointsByCharacterId[characterId] = 0;
      interactionEvent = `${character.name} activated ${object.label}`;
    } else return;
    map.events.unshift(interactionEvent);
    if (object.kind === "terminal" && object.completesScenario !== false) {
      concludeTacticalScenario(map, "victory", `Victory — ${character.name} secured ${object.label}`);
      return;
    }
    map.selectedTerrainObjectId = null;
    map.movementMode = "walk";
    if (map.actionPointsByCharacterId[characterId] > 0) return;
    if (!map.actedCharacterIds.includes(characterId)) map.actedCharacterIds.push(characterId);
    advanceTacticalPlayerActivation(map);
  },
  attemptTacticalConsoleCheck: (
    state: Draft<CharacterCombatState>,
    action: PayloadAction<TacticalConsoleCheckRolls>,
  ) => {
    const map = state.tacticalMap;
    const characterId = map?.activeCharacterId;
    const character = map && characterId ? tacticalCombatant(map, characterId) : null;
    const terminal = map ? tacticalTerrainObject(map, map.selectedTerrainObjectId) : null;
    const definition = map?.scenario.consoleVictory;
    const operation = definition?.operations.find((candidate) => candidate.id === action.payload.operationId);
    if (!map
      || map.scenarioStatus !== "active"
      || !characterId
      || !character
      || terminal?.kind !== "terminal"
      || !operation) return;
    map.completedConsoleOperationIds ??= [];
    map.resolvedConsoleOperationIds ??= [];
    map.consoleOperationProgressById ??= {};
    if (`${operation.consolePlacementId}:terminal` !== terminal.id
      || !terminal.operational
      || map.resolvedConsoleOperationIds.includes(operation.id)
      || !consoleOperationAvailable(operation, map.completedConsoleOperationIds)) return;
    const adjacent = distanceBetween(terminal.position, character.position) === 1;
    const progress = map.consoleOperationProgressById[operation.id]
      ?? { completedCheckIds: [], nextCheckModifier: null };
    const check = operation.checks.find((candidate) => !progress.completedCheckIds.includes(candidate.id));
    if (!adjacent || !check || (map.actionPointsByCharacterId[characterId] ?? 0) < check.apCost) return;
    const skillLevel = character.skills?.find(
      (skill) => skill.name.toLowerCase() === check.skill.toLowerCase(),
    )?.level ?? 0;
    const raw = action.payload.dice.first + action.payload.dice.second;
    const carriedModifier = progress.nextCheckModifier ?? 0;
    const total = raw + skillLevel + carriedModifier;
    const target = travellerTaskTarget(check.difficulty);
    const passed = total >= target;
    const nextProgress = {
      completedCheckIds: passed ? [...progress.completedCheckIds, check.id] : [...progress.completedCheckIds],
      nextCheckModifier: raw === 12
        ? operation.criticalSuccessNextCheckModifier ?? 0
        : raw === 2
          ? operation.criticalFailureNextCheckModifier ?? 0
          : null,
    };
    map.consoleOperationProgressById[operation.id] = nextProgress;
    map.actionPointsByCharacterId[characterId] -= check.apCost;
    map.events.unshift(`${character.name} attempted ${operation.label} — ${check.skill} ${check.difficulty} ${target}+ · raw 2d6 ${raw} · skill ${skillLevel >= 0 ? "+" : ""}${skillLevel}${carriedModifier ? ` · carried ${carriedModifier >= 0 ? "+" : ""}${carriedModifier}` : ""} · total ${total}/${target}: ${passed ? "passed" : "failed"}`);
    if (!passed && operation.failureTransformation) {
      if (!map.resolvedConsoleOperationIds.includes(operation.id)) {
        map.resolvedConsoleOperationIds.push(operation.id);
      }
      map.events.unshift(`${operation.label} resolved after the failed check`);
      transformTacticalInteractiveHuman(map, terminal, operation.failureTransformation);
      if ((map.actionPointsByCharacterId[characterId] ?? 0) <= 0) {
        if (!map.actedCharacterIds.includes(characterId)) map.actedCharacterIds.push(characterId);
        advanceTacticalPlayerActivation(map);
      }
      return;
    }
    if (passed && nextProgress.completedCheckIds.length === operation.checks.length) {
      if (!map.completedConsoleOperationIds.includes(operation.id)) {
        map.completedConsoleOperationIds.push(operation.id);
      }
      if (!map.resolvedConsoleOperationIds.includes(operation.id)) {
        map.resolvedConsoleOperationIds.push(operation.id);
      }
      map.events.unshift(`${operation.label} completed`);
      if (operation.successTransformation) {
        transformTacticalInteractiveHuman(map, terminal, operation.successTransformation);
      }
      if (operation.result.type === "victory") {
        map.terminalActiveById[terminal.id] = true;
        concludeTacticalScenario(map, "victory", `Victory — ${character.name} completed ${operation.label}`);
        return;
      }
      operation.result.operationIds.forEach((unlockedOperationId) => {
        const unlocked = definition?.operations.find((candidate) => candidate.id === unlockedOperationId);
        if (unlocked && consoleOperationAvailable(unlocked, map.completedConsoleOperationIds ?? [])) {
          map.terminalActiveById[`${unlocked.consolePlacementId}:terminal`] = false;
        }
      });
      const anotherAvailable = definition?.operations.some(
        (candidate) => candidate.consolePlacementId === operation.consolePlacementId
          && consoleOperationAvailable(candidate, map.completedConsoleOperationIds ?? []),
      ) ?? false;
      map.terminalActiveById[terminal.id] = !anotherAvailable;
    }
    if ((map.actionPointsByCharacterId[characterId] ?? 0) > 0) return;
    if (!map.actedCharacterIds.includes(characterId)) map.actedCharacterIds.push(characterId);
    advanceTacticalPlayerActivation(map);
  },
  fireAtTacticalTerrain: (
    state: Draft<CharacterCombatState>,
    action: PayloadAction<TacticalStructuralFireRolls>,
  ) => {
    const map = state.tacticalMap;
    const characterId = map?.activeCharacterId;
    const object = map ? tacticalTerrainObject(map, map.selectedTerrainObjectId) : null;
    if (!map
      || !characterId
      || map.draggingCombatantByCarrierId[characterId]
      || !object
      || (object.kind !== "wall" && object.kind !== "door")
      || map.destroyedTerrainObjectIds.includes(object.id)) return;
    const character = tacticalCombatant(map, characterId);
    const weapon = character?.weapon;
    if (!weapon
      || !character
      || (weapon.highEnergy ? !map.bracedCombatantIds.includes(characterId) : !weapon.structuralDamage)
      || (map.actionPointsByCharacterId[characterId] ?? 0) < 6
      || (map.ammunitionByCharacterId[characterId] ?? 0) < 1) return;
    const impact = {
      x: (object.edge.from.x + object.edge.to.x) / 2,
      y: (object.edge.from.y + object.edge.to.y) / 2,
    };
    const range = Math.ceil(
      Math.hypot(impact.x - character.position.x - 0.5, impact.y - character.position.y - 0.5),
    );
    const rangeBand = range <= weapon.effectiveRange
      ? "effective"
      : range <= weapon.longRange
        ? "long"
        : range <= weapon.extremeRange
          ? "extreme"
          : null;
    if (!rangeBand) return;
    map.actionPointsByCharacterId[characterId] = 0;
    spendTacticalAmmunition(map, character, 1);
    const hitTotal = action.payload.hitDice.first
      + action.payload.hitDice.second
      + character.weaponSkill
      + 1;
    const targetNumber = rangeBand === "effective" ? 8 : rangeBand === "long" ? 10 : 12;
    if (hitTotal >= targetNumber) {
      const penetration = weaponPenetrationForRange(weapon, rangeBand);
      const damage = object.kind === "door" && object.portalType === "iris-valve"
        ? Math.max(0, penetration + tacticalStructurePenetrationModifier(object))
        : weapon.structuralDamage ?? Math.max(0, penetration + tacticalStructurePenetrationModifier(object));
      map.terrainDamageById[object.id] = (map.terrainDamageById[object.id] ?? 0) + damage;
      const threshold = tacticalStructureBreachThreshold(object);
      if (map.terrainDamageById[object.id] >= threshold) {
        if (!map.destroyedTerrainObjectIds.includes(object.id)) {
          map.destroyedTerrainObjectIds.push(object.id);
        }
        if (object.kind === "door") map.doorOpenById[object.id] = true;
      }
    }
    map.selectedTerrainObjectId = null;
    map.events.unshift(`${character.name} fired at ${object.kind} ${object.id}${map.destroyedTerrainObjectIds.includes(object.id) ? " and destroyed it" : ""}`);
    if (!map.actedCharacterIds.includes(characterId)) map.actedCharacterIds.push(characterId);
    advanceTacticalPlayerActivation(map);
  },
};
