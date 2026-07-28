import {
  pointKey,
  reachableOpenMapMovement,
  sidestepAndBackstepMoves,
  tacticalOccupantCounts,
} from "./geometry";
import {
  activeTacticalTerrainObjects,
  tacticalTerrainBlockedCells,
  tacticalTerrainBlockedEdges,
} from "./tacticalTerrain";
import type { Combatant, PlannedMove, TacticalMapState } from "./types";

export type TacticalMovementPreview = {
  candidateMoves: Map<string, PlannedMove>;
  legalMoves: Map<string, PlannedMove>;
};

export const buildTacticalMovementPreview = (
  map: TacticalMapState,
  combatant: Combatant | null,
): TacticalMovementPreview => {
  const mode = map.movementMode;
  if (!combatant || !mode || combatant.posture === "prone") {
    return { candidateMoves: new Map(), legalMoves: new Map() };
  }

  const actionPoints = map.actionPointsByCharacterId[combatant.id] ?? 0;
  const terrain = activeTacticalTerrainObjects(
    map.scenario,
    map.doorOpenById,
    map.destroyedTerrainObjectIds,
  );
  const blockedCells = tacticalTerrainBlockedCells(terrain);
  const blockedEdges = tacticalTerrainBlockedEdges(terrain);
  const activeOccupantsByCell = tacticalOccupantCounts(map.scenario, combatant.id);
  const moves = mode === "sidestep"
    ? sidestepAndBackstepMoves({
      width: map.scenario.width,
      height: map.scenario.height,
      origin: combatant.position,
      facing: combatant.facing,
      allowance: actionPoints,
      blockedCells,
      blockedEdges,
      activeOccupantsByCell,
      terrainByCell: map.scenario.terrainByCell,
      elevationLevelByCell: map.scenario.elevationLevelByCell,
      closeMachineryCells: map.scenario.closeMachineryCells,
      elevationAccessCells: map.scenario.elevationAccessCells,
    })
    : reachableOpenMapMovement({
      width: map.scenario.width,
      height: map.scenario.height,
      origin: combatant.position,
      originElevationLevel: combatant.elevationLevel,
      facing: combatant.facing,
      allowance: Math.min(6, actionPoints),
      trotting: mode === "trot",
      blockedCells,
      blockedEdges,
      activeOccupantsByCell,
      terrainByCell: map.scenario.terrainByCell,
      elevationLevelByCell: map.scenario.elevationLevelByCell,
      bridges: map.scenario.bridges,
      closeMachineryCells: map.scenario.closeMachineryCells,
      elevationAccessCells: map.scenario.elevationAccessCells,
    });

  const suppressed = map.suppressedCombatantIds.includes(combatant.id);
  const dragging = Boolean(map.draggingCombatantByCarrierId[combatant.id]);
  const candidateMoves = new Map([...moves].filter(([, move]) => (
    mode === "evade"
      ? move.path.length === 1 && (activeOccupantsByCell.get(pointKey(move.destination)) ?? 0) === 0
      : (!suppressed && !dragging) || move.path.length <= 2
  )));

  const enemyPositions = new Set(
    map.scenario.combatants
      .filter((unit) => unit.side === "enemy" && !unit.defeated)
      .map((unit) => `${pointKey(unit.position)}@${unit.elevationLevel
        ?? map.scenario.elevationLevelByCell?.[pointKey(unit.position)]
        ?? 0}`),
  );
  const entryTarget = map.scenario.combatants.find(
    (unit) => unit.id === map.plannedEnemyEntryTargetId,
  );
  const legalMoves = new Map([...candidateMoves].filter(([, move]) => {
    const enemyStepIndex = move.path.findIndex((point, index) => enemyPositions.has(
      `${pointKey(point)}@${move.pathElevationLevels?.[index]
        ?? map.scenario.elevationLevelByCell?.[pointKey(point)]
        ?? 0}`,
    ));
    const plannedEntry = entryTarget
      && pointKey(move.destination) === pointKey(entryTarget.position)
      && move.finalElevationLevel === (
        entryTarget.elevationLevel
        ?? map.scenario.elevationLevelByCell?.[pointKey(entryTarget.position)]
        ?? 0
      );
    return enemyStepIndex < 0 || (plannedEntry && enemyStepIndex === move.path.length - 1);
  }));

  return { candidateMoves, legalMoves };
};
