import type { Draft, PayloadAction } from "@reduxjs/toolkit";
import { resolveAhlMelee, resolveAhlMoraleCheck, resolveSnapShot, type DicePair } from "./combatResolution";
import {
  activeOccupantCounts,
  adjacencyEntryStepIndex,
  coverProtection,
  filledLiquidHydrogenCellKeys,
  hasLineOfSight,
  pathWithinMovementAllowance,
  pointKey,
  reachableOpenMapMovement,
  sidestepAndBackstepMoves,
  tacticalOccupantCounts,
  tacticalVisibilityAssessment,
} from "./geometry";
import { spendTacticalAmmunition } from "./tacticalAmmunition";
import { tacticalHitRollEvent } from "./tacticalFire";
import { firstTacticalAdjacencyEntry, resolveTacticalMovingAdjacentSnapShot } from "./tacticalEnemyMovementReactions";
import { queueTacticalUnexpectedFireMoraleCheck } from "./tacticalMorale";
import { advanceTacticalPlayerActivation, tacticalCombatant } from "./tacticalStateHelpers";
import {
  activeTacticalTerrainObjects,
  tacticalTerrainBlockedCells,
  tacticalTerrainBlockedEdges,
} from "./tacticalTerrain";
import type { CharacterCombatState, GridPoint } from "./types";
import { applyTacticalAhlMeleeEffect, applyTacticalWound } from "./tacticalWounds";

export type TacticalMoveConfirmation = {
  moraleDice: DicePair;
  snapDice: { hitDice: DicePair; woundDice: DicePair };
  enemyReactionRolls?: Record<string, { hitDice: DicePair; woundDice: DicePair }>;
  meleeDice?: { attackRoll: number; responseRoll: number };
};

export const tacticalPlayerMovementReducers = {
  setTacticalMovementMode: (
    state: Draft<CharacterCombatState>,
    action: PayloadAction<"walk" | "trot" | "evade" | "sidestep" | null>,
  ) => {
    const map = state.tacticalMap;
    const active = map ? tacticalCombatant(map, map.activeCharacterId) : null;
    const dragging = Boolean(active && map?.draggingCombatantByCarrierId[active.id]);
    if (!map
      || (active && map.enemySquareEnteredCombatantIds.includes(active.id) && action.payload !== null)
      || (dragging && action.payload !== "walk" && action.payload !== null)
      || (action.payload === "trot" && map.activeCharacterId && map.suppressedCombatantIds.includes(map.activeCharacterId))
      || (action.payload === "evade"
        && (!active || active.posture === "prone" || (map.actionPointsByCharacterId[active.id] ?? 0) !== 6))
      || (action.payload === "sidestep"
        && (!active || active.posture === "prone" || (map.actionPointsByCharacterId[active.id] ?? 0) < 4))) return;
    map.movementMode = action.payload;
    map.plannedDestination = null;
    map.plannedEnemyEntryTargetId = null;
  },
  previewTacticalMove: (state: Draft<CharacterCombatState>, action: PayloadAction<GridPoint | null>) => {
    if (state.tacticalMap) {
      state.tacticalMap.plannedExtinguishFire = null;
      state.tacticalMap.plannedDestination = action.payload;
      state.tacticalMap.plannedEnemyEntryTargetId = null;
      state.tacticalMap.plannedMeleeTargetId = null;
      if (action.payload) {
        state.tacticalMap.plannedAttackTargetId = null;
        state.tacticalMap.plannedAttackMode = null;
        state.tacticalMap.plannedTreatmentTargetId = null;
      }
    }
  },
  previewTacticalEnemyEntry: (state: Draft<CharacterCombatState>, action: PayloadAction<string>) => {
    const map = state.tacticalMap;
    const moverId = map?.activeCharacterId;
    const mover = map ? tacticalCombatant(map, moverId) : null;
    const target = map ? tacticalCombatant(map, action.payload) : null;
    if (!map
      || !moverId
      || !mover
      || !target
      || mover.defeated
      || target.defeated
      || mover.side === target.side
      || mover.posture === "prone"
      || map.movementMode !== "walk"
      || map.draggingCombatantByCarrierId[moverId]
      || map.enemySquareEnteredCombatantIds.includes(moverId)) return;
    const terrain = activeTacticalTerrainObjects(map.scenario, map.doorOpenById, map.destroyedTerrainObjectIds);
    const moves = reachableOpenMapMovement({
      width: map.scenario.width,
      height: map.scenario.height,
      origin: mover.position,
      originElevationLevel: mover.elevationLevel,
      facing: mover.facing,
      allowance: Math.min(6, map.actionPointsByCharacterId[moverId] ?? 0),
      trotting: false,
      blockedCells: tacticalTerrainBlockedCells(terrain),
      blockedEdges: tacticalTerrainBlockedEdges(terrain),
      activeOccupantsByCell: tacticalOccupantCounts(map.scenario, moverId),
      terrainByCell: map.scenario.terrainByCell,
      elevationLevelByCell: map.scenario.elevationLevelByCell,
      bridges: map.scenario.bridges,
      closeMachineryCells: map.scenario.closeMachineryCells,
      elevationAccessCells: map.scenario.elevationAccessCells,
      elevationTransitions: map.scenario.elevationTransitions,
    });
    const move = moves.get(pointKey(target.position));
    if (!move || (map.suppressedCombatantIds.includes(moverId) && move.path.length > 2)) return;
    const crossedEnemyBeforeDestination = move.path.slice(0, -1).some((point) => map.scenario.combatants.some((unit) => (
      unit.side !== mover.side && !unit.defeated && pointKey(unit.position) === pointKey(point)
    )));
    const activeOccupants = map.scenario.combatants.filter((unit) => (
      unit.id !== moverId && !unit.defeated && pointKey(unit.position) === pointKey(target.position)
    ));
    if (crossedEnemyBeforeDestination || activeOccupants.length >= 4) return;
    map.plannedEnemyEntryTargetId = target.id;
    map.plannedDestination = { ...target.position };
    map.plannedMeleeTargetId = null;
    map.plannedAttackTargetId = null;
    map.plannedAttackMode = null;
    map.grenadeTargeting = false;
    map.plannedGrenadeTarget = null;
    map.plannedExtinguishFire = null;
    map.coveringFireTargeting = false;
    map.plannedCoveringFireTarget = null;
    map.plannedTreatmentTargetId = null;
    map.plannedExtinguishFire = null;
    map.selectedTerrainObjectId = null;
  },
  confirmTacticalMove: (state: Draft<CharacterCombatState>, action: PayloadAction<TacticalMoveConfirmation | undefined>) => {
    const map = state.tacticalMap;
    const id = map?.activeCharacterId;
    const destination = map?.plannedDestination;
    const mode = map?.movementMode;
    if (!map || !id || !destination || !mode) return;
    const character = tacticalCombatant(map, id);
    const origin = character?.position;
    const dragged = map.draggingCombatantByCarrierId[id] ? tacticalCombatant(map, map.draggingCombatantByCarrierId[id]) : null;
    const meleeDiveTarget = mode === "trot" && map.plannedMeleeTargetId ? tacticalCombatant(map, map.plannedMeleeTargetId) : null;
    const enemyEntryTarget = mode === "walk" && map.plannedEnemyEntryTargetId ? tacticalCombatant(map, map.plannedEnemyEntryTargetId) : null;
    const available = map.actionPointsByCharacterId[id] ?? 0;
    if (!origin
      || available < 1
      || (dragged && mode !== "walk")
      || (mode === "evade" && available !== 6)
      || (mode === "trot" && available === 6 ? false : mode === "trot" && !map.movementAnimationByCharacterId[id])) return;
    const prone = character?.posture === "prone";
    if (prone) return;
    const terrain = activeTacticalTerrainObjects(map.scenario, map.doorOpenById, map.destroyedTerrainObjectIds);
    const blockedCells = tacticalTerrainBlockedCells(terrain);
    const moves = mode === "sidestep"
      ? sidestepAndBackstepMoves({
        width: map.scenario.width,
        height: map.scenario.height,
        origin,
        facing: character?.facing ?? "south",
        allowance: available,
        blockedCells,
        blockedEdges: tacticalTerrainBlockedEdges(terrain),
        activeOccupantsByCell: activeOccupantCounts(map.scenario.combatants, id),
        terrainByCell: map.scenario.terrainByCell,
        elevationLevelByCell: map.scenario.elevationLevelByCell,
        closeMachineryCells: map.scenario.closeMachineryCells,
        elevationAccessCells: map.scenario.elevationAccessCells,
      })
      : reachableOpenMapMovement({
        width: map.scenario.width,
        height: map.scenario.height,
        origin,
        originElevationLevel: character?.elevationLevel,
        facing: character?.facing ?? "south",
        allowance: Math.min(6, available),
        trotting: mode === "trot",
        blockedCells,
        blockedEdges: tacticalTerrainBlockedEdges(terrain),
        activeOccupantsByCell: tacticalOccupantCounts(map.scenario, id),
        terrainByCell: map.scenario.terrainByCell,
        elevationLevelByCell: map.scenario.elevationLevelByCell,
        bridges: map.scenario.bridges,
        closeMachineryCells: map.scenario.closeMachineryCells,
        elevationAccessCells: map.scenario.elevationAccessCells,
        elevationTransitions: map.scenario.elevationTransitions,
      });
    const selectedMove = moves.get(pointKey(destination));
    if (!selectedMove) return;
    const liquidHydrogenCells = filledLiquidHydrogenCellKeys(map.scenario);
    const liquidHydrogenStepIndex = selectedMove.path.findIndex((point) => liquidHydrogenCells.has(pointKey(point)));
    const enteredLiquidHydrogen = liquidHydrogenStepIndex >= 0;
    const move = enteredLiquidHydrogen ? {
      ...selectedMove,
      destination: selectedMove.path[liquidHydrogenStepIndex],
      path: selectedMove.path.slice(0, liquidHydrogenStepIndex + 1),
      pathElevationLevels: selectedMove.pathElevationLevels?.slice(0, liquidHydrogenStepIndex + 1),
      finalElevationLevel: selectedMove.pathElevationLevels?.[liquidHydrogenStepIndex]
        ?? map.scenario.elevationLevelByCell?.[pointKey(selectedMove.path[liquidHydrogenStepIndex])]
        ?? 0,
    } : selectedMove;
    const destinationLevel = move.finalElevationLevel ?? map.scenario.elevationLevelByCell?.[pointKey(destination)] ?? 0;
    if ((mode !== "evade" && move.cost > available)
      || (mode === "evade" && (move.path.length !== 1 || (tacticalOccupantCounts(map.scenario, id).get(`${pointKey(destination)}@${destinationLevel}`) ?? 0) > 0))
      || ((dragged || map.suppressedCombatantIds.includes(id)) && move.path.length > 2)) return;
    const hostileEntryStepIndex = move.path.findIndex((point, index) => map.scenario.combatants.some((unit) => unit.side !== character.side
      && !unit.defeated
      && pointKey(unit.position) === pointKey(point)
      && (unit.elevationLevel ?? map.scenario.elevationLevelByCell?.[pointKey(unit.position)] ?? 0)
        === (move.pathElevationLevels?.[index] ?? map.scenario.elevationLevelByCell?.[pointKey(point)] ?? 0)));
    const occupiedDestinationTarget = enemyEntryTarget ?? meleeDiveTarget;
    if (hostileEntryStepIndex >= 0
      && (!occupiedDestinationTarget
        || hostileEntryStepIndex !== move.path.length - 1
        || pointKey(occupiedDestinationTarget.position) !== pointKey(destination))) return;
    const adjacencyEntry = character ? firstTacticalAdjacencyEntry(map, character, move.path) : null;
    if (character && adjacencyEntry && action.payload?.moraleDice && character.moraleFactor !== undefined) {
      const leadershipModifier = Object.entries(map.movingAdjacentMoraleResultByLeaderId).reduce((total, [leaderId, passed]) => {
        const leader = tacticalCombatant(map, leaderId);
        return leader
          && leader.id !== character.id
          && leader.side === character.side
          && !leader.defeated
          && hasLineOfSight(map.scenario, leader.position, character.position)
          ? total + (passed ? 1 : -1) * Math.max(0, leader.leadershipRating ?? 0)
          : total;
      }, 0);
      const morale = resolveAhlMoraleCheck(
        { moraleFactor: character.moraleFactor, woundState: character.woundState },
        action.payload.moraleDice,
        leadershipModifier,
      );
      if ((character.leadershipRating ?? 0) > 0) map.movingAdjacentMoraleResultByLeaderId[character.id] = morale.passed;
      map.events.unshift(`${character.name} moving-adjacent morale ${morale.roll}/${morale.modifiedMorale}${morale.lightWoundModifier ? " · light wound −1" : ""}${morale.leadershipModifier ? ` · leadership ${morale.leadershipModifier > 0 ? "+" : ""}${morale.leadershipModifier}` : ""}: ${morale.passed ? "passed" : `stopped before ${adjacencyEntry.target.name}`}`);
      if (!morale.passed) {
        const safePath = pathWithinMovementAllowance(
          map.scenario,
          origin,
          move.path.slice(0, adjacencyEntry.stepIndex),
          Math.max(0, available - 3),
          character.facing,
          mode === "trot",
        );
        const safeDestination = safePath[safePath.length - 1];
        const safeCost = safeDestination ? moves.get(pointKey(safeDestination))?.cost ?? 0 : 0;
        if (safeDestination) {
          character.position = { ...safeDestination };
          if (!map.movedCombatantIds.includes(id)) map.movedCombatantIds.push(id);
          map.movementAnimationByCharacterId[id] = {
            sequence: (map.movementAnimationByCharacterId[id]?.sequence ?? 0) + 1,
            path: [{ ...origin }, ...safePath.map((point) => ({ ...point }))],
            mode: mode === "trot" ? "run" : "walk",
          };
          map.bracedCombatantIds = map.bracedCombatantIds.filter((combatantId) => combatantId !== id);
          if (dragged) {
            const draggedOrigin = { ...dragged.position };
            const draggedPath = [{ ...origin }, ...safePath.slice(0, -1).map((point) => ({ ...point }))];
            dragged.position = { ...draggedPath[draggedPath.length - 1] };
            map.movementAnimationByCharacterId[dragged.id] = {
              sequence: (map.movementAnimationByCharacterId[dragged.id]?.sequence ?? 0) + 1,
              path: [draggedOrigin, ...draggedPath],
              mode: "walk",
            };
          }
        }
        map.actionPointsByCharacterId[id] = Math.max(0, available - safeCost);
        if (map.actionPointsByCharacterId[id] >= 3
          && resolveTacticalMovingAdjacentSnapShot(map, character, adjacencyEntry.target, action.payload.snapDice)) {
          map.actionPointsByCharacterId[id] -= 3;
        }
        map.plannedDestination = null;
        map.plannedEnemyEntryTargetId = null;
        map.plannedMeleeTargetId = null;
        map.movementMode = "walk";
        if (map.actionPointsByCharacterId[id] === 0) {
          if (!map.actedCharacterIds.includes(id)) map.actedCharacterIds.push(id);
          advanceTacticalPlayerActivation(map);
        }
        return;
      }
    }
    if (character && action.payload?.enemyReactionRolls) {
      const reactions = map.scenario.combatants
        .filter((enemy) => enemy.side === "enemy"
          && !enemy.defeated
          && !enemy.weapon.highEnergy
          && !map.movedCombatantIds.includes(enemy.id)
          && (map.actionPointsByCharacterId[enemy.id] ?? 0) >= 3
          && (map.ammunitionByCharacterId[enemy.id] ?? 0) >= 1
          && action.payload?.enemyReactionRolls?.[enemy.id])
        .map((enemy) => ({
          enemy,
          stepIndex: adjacencyEntryStepIndex(map.scenario, enemy.position, origin, move.path),
        }))
        .filter(({ stepIndex }) => stepIndex >= 0)
        .sort((a, b) => a.stepIndex - b.stepIndex
          || map.scenario.combatants.indexOf(a.enemy) - map.scenario.combatants.indexOf(b.enemy));
      for (const { enemy, stepIndex } of reactions) {
        const dice = action.payload.enemyReactionRolls[enemy.id];
        const triggerPath = move.path.slice(0, stepIndex + 1);
        const trigger = triggerPath[triggerPath.length - 1];
        character.position = { ...trigger };
        const visibility = tacticalVisibilityAssessment(map.scenario, enemy, character);
        const result = resolveSnapShot(
          enemy,
          character,
          dice.hitDice,
          dice.woundDice,
          coverProtection(map.scenario, enemy.id, character.id),
          "snap",
          mode === "evade",
          map.suppressedCombatantIds.includes(enemy.id),
          map.bracedCombatantIds.includes(enemy.id),
          visibility.darknessModifier,
        );
        if (!result) continue;
        map.actionPointsByCharacterId[enemy.id] -= 3;
        spendTacticalAmmunition(map, enemy, 1);
        queueTacticalUnexpectedFireMoraleCheck(map, enemy, character);
        if (result.hit) applyTacticalWound(map, character, result.woundState);
        map.events.unshift(`${enemy.name} defensive snap fired at ${character.name}: ${tacticalHitRollEvent(result)} · ${result.hit ? `wound ${result.woundTotal} (${result.woundState})` : "miss"}`);
        if (character.defeated) {
          const triggerCost = moves.get(pointKey(trigger))?.cost ?? available;
          map.actionPointsByCharacterId[id] = 0;
          map.movementAnimationByCharacterId[id] = {
            sequence: (map.movementAnimationByCharacterId[id]?.sequence ?? 0) + 1,
            path: [{ ...origin }, ...triggerPath.map((point) => ({ ...point }))],
            mode: mode === "trot" ? "run" : "walk",
          };
          if (!map.movedCombatantIds.includes(id)) map.movedCombatantIds.push(id);
          map.events.unshift(`${character.name} movement stopped at ${trigger.x},${trigger.y} after spending ${triggerCost} AP`);
          map.plannedDestination = null;
          map.plannedEnemyEntryTargetId = null;
          map.plannedMeleeTargetId = null;
          map.movementMode = "walk";
          if (!map.actedCharacterIds.includes(id)) map.actedCharacterIds.push(id);
          advanceTacticalPlayerActivation(map);
          return;
        }
      }
      character.position = { ...origin };
    }
    const sequence = (map.movementAnimationByCharacterId[id]?.sequence ?? 0) + 1;
    map.movementAnimationByCharacterId[id] = {
      sequence,
      path: [{ ...origin }, ...move.path.map((point) => ({ ...point }))],
      elevationLevels: [
        character.elevationLevel ?? map.scenario.elevationLevelByCell?.[pointKey(origin)] ?? 0,
        ...(move.pathElevationLevels ?? move.path.map((point) => map.scenario.elevationLevelByCell?.[pointKey(point)] ?? 0)),
      ],
      mode: !prone && mode === "trot" ? "run" : "walk",
    };
    character.position = { ...move.destination };
    character.elevationLevel = move.finalElevationLevel;
    if (!map.movedCombatantIds.includes(id)) map.movedCombatantIds.push(id);
    character.facing = move.finalFacing ?? character.facing ?? "south";
    if (dragged) {
      const draggedOrigin = { ...dragged.position };
      const draggedPath = [{ ...origin }, ...move.path.slice(0, -1).map((point) => ({ ...point }))];
      dragged.position = { ...draggedPath[draggedPath.length - 1] };
      map.movementAnimationByCharacterId[dragged.id] = {
        sequence: (map.movementAnimationByCharacterId[dragged.id]?.sequence ?? 0) + 1,
        path: [draggedOrigin, ...draggedPath],
        mode: "walk",
      };
    }
    map.bracedCombatantIds = map.bracedCombatantIds.filter((combatantId) => combatantId !== id);
    if (enteredLiquidHydrogen) {
      applyTacticalWound(map, character, "dead");
      map.actionPointsByCharacterId[id] = 0;
      map.plannedDestination = null;
      map.plannedEnemyEntryTargetId = null;
      map.plannedMeleeTargetId = null;
      map.movementMode = "walk";
      if (!map.actedCharacterIds.includes(id)) map.actedCharacterIds.push(id);
      map.events.unshift(`${character.name} entered liquid hydrogen at ${character.position.x},${character.position.y} and was killed`);
      advanceTacticalPlayerActivation(map);
      return;
    }
    const enteredEnemySquare = Boolean(
      enemyEntryTarget
      && !enemyEntryTarget.defeated
      && pointKey(enemyEntryTarget.position) === pointKey(character.position),
    );
    map.events.unshift(mode === "evade"
      ? `${character.name} evaded to ${move.destination.x},${move.destination.y} (6 AP)`
      : mode === "sidestep"
        ? `${character.name} sidestepped/backstepped to ${move.destination.x},${move.destination.y} (4 AP)`
        : enteredEnemySquare
          ? `${character.name} entered ${enemyEntryTarget!.name}'s square at ${move.destination.x},${move.destination.y}; movement ended (${move.cost} AP)`
          : `${character.name} moved to ${move.destination.x},${move.destination.y} (${move.cost} AP)`);
    map.actionPointsByCharacterId[id] = mode === "evade" ? 0 : Math.max(0, available - move.cost);
    if (mode === "evade" && !map.evadingCombatantIds.includes(id)) map.evadingCombatantIds.push(id);
    map.plannedDestination = null;
    map.plannedEnemyEntryTargetId = null;
    if (enteredEnemySquare) {
      if (!map.enemySquareEnteredCombatantIds.includes(id)) map.enemySquareEnteredCombatantIds.push(id);
      map.movementMode = null;
    }
    if (meleeDiveTarget
      && !meleeDiveTarget.defeated
      && pointKey(meleeDiveTarget.position) === pointKey(character.position)
      && action.payload?.meleeDice) {
      const attackResult = resolveAhlMelee(character, meleeDiveTarget, action.payload.meleeDice.attackRoll, true, true);
      const returnResult = resolveAhlMelee(meleeDiveTarget, character, action.payload.meleeDice.responseRoll, true, false);
      applyTacticalAhlMeleeEffect(map, meleeDiveTarget, attackResult.effect);
      applyTacticalAhlMeleeEffect(map, character, returnResult.effect);
      map.events.unshift(`${character.name} dive → ${meleeDiveTarget.name}: MF ${attackResult.differential}, column ${attackResult.tableDifferential}, roll ${attackResult.roll} → ${attackResult.modifiedRoll}: ${attackResult.effect}`);
      map.events.unshift(`${meleeDiveTarget.name} → ${character.name}: MF ${returnResult.differential}, column ${returnResult.tableDifferential}, roll ${returnResult.roll}${returnResult.modifiedRoll !== returnResult.roll ? ` → ${returnResult.modifiedRoll}` : ""}: ${returnResult.effect}`);
      map.events.unshift(`AHL melee dive resolved simultaneously: ${character.name} and ${meleeDiveTarget.name}`);
      map.plannedMeleeTargetId = null;
      map.movementMode = "walk";
      if (!map.actedCharacterIds.includes(id)) map.actedCharacterIds.push(id);
      advanceTacticalPlayerActivation(map);
      return;
    }
    map.plannedMeleeTargetId = null;
    if (map.actionPointsByCharacterId[id] > 0) return;
    if (!map.actedCharacterIds.includes(id)) map.actedCharacterIds.push(id);
    map.movementMode = "walk";
    map.selectedTerrainObjectId = null;
    advanceTacticalPlayerActivation(map);
  },
  turnTacticalCharacter: (state: Draft<CharacterCombatState>, action: PayloadAction<"left" | "right">) => {
    const map = state.tacticalMap;
    const id = map?.activeCharacterId;
    const turnCost = map?.movementMode === "trot" ? 2 : 1;
    const character = map ? tacticalCombatant(map, id) : null;
    if (!map
      || !id
      || !character
      || character.posture === "prone"
      || map.movementMode === "evade"
      || (map.actionPointsByCharacterId[id] ?? 0) < turnCost) return;
    const directions = ["north", "east", "south", "west"] as const;
    const currentIndex = directions.indexOf(character.facing ?? "south");
    const offset = action.payload === "right" ? 1 : directions.length - 1;
    character.facing = directions[(currentIndex + offset) % directions.length];
    map.events.unshift(`${character.name} turned ${action.payload} (${turnCost} AP)`);
    map.actionPointsByCharacterId[id] -= turnCost;
    map.plannedDestination = null;
    if (map.actionPointsByCharacterId[id] > 0) return;
    if (!map.actedCharacterIds.includes(id)) map.actedCharacterIds.push(id);
    map.movementMode = "walk";
    map.selectedTerrainObjectId = null;
    advanceTacticalPlayerActivation(map);
  },
  toggleTacticalPosture: (state: Draft<CharacterCombatState>) => {
    const map = state.tacticalMap;
    const id = map?.activeCharacterId;
    if (!map || !id || map.draggingCombatantByCarrierId[id] || map.movementMode === "evade") return;
    const character = tacticalCombatant(map, id);
    if (!character) return;
    const prone = character.posture === "prone";
    const cost = prone ? 6 : 1;
    if ((map.actionPointsByCharacterId[id] ?? 0) < cost) return;
    character.posture = prone ? "standing" : "prone";
    if (prone) map.bracedCombatantIds = map.bracedCombatantIds.filter((combatantId) => combatantId !== id);
    map.events.unshift(`${character.name} ${prone ? "stood up" : "went prone"} (${cost} AP)`);
    map.actionPointsByCharacterId[id] -= cost;
    map.movementMode = "walk";
    map.plannedDestination = null;
    if (map.actionPointsByCharacterId[id] > 0) return;
    if (!map.actedCharacterIds.includes(id)) map.actedCharacterIds.push(id);
    map.selectedTerrainObjectId = null;
    advanceTacticalPlayerActivation(map);
  },
};
