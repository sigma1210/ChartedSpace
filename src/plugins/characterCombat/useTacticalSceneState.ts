"use client";

import { useMemo } from "react";
import {
  collateralBlastCells,
  coveringFireDangerSpaceCells,
  filledLiquidHydrogenCellKeys,
  grenadeBlastCells,
  meleeEnemies,
  pointKey,
  tacticalRangedEnemies,
  validCoveringFireTargets,
} from "@/plugins/characterCombat/geometry";
import type {
  Combatant,
  PlannedMove,
  TacticalMapState,
} from "@/plugins/characterCombat/types";

type TacticalSceneStateOptions = {
  tacticalMap: TacticalMapState;
  reachableMoves: ReadonlyMap<string, PlannedMove>;
};

export const tacticalSceneFocus = (
  combatants: Combatant[],
  mapWidth: number,
  mapHeight: number,
) => {
  if (combatants.length === 0) return { focusX: 0, focusZ: 0 };

  return {
    focusX:
      combatants.reduce(
        (total, unit) =>
          total + unit.position.x + 0.5 - mapWidth / 2,
        0,
      ) / combatants.length,
    focusZ:
      combatants.reduce(
        (total, unit) =>
          total + unit.position.y + 0.5 - mapHeight / 2,
        0,
      ) / combatants.length,
  };
};

export const useTacticalSceneState = ({
  tacticalMap,
  reachableMoves,
}: TacticalSceneStateOptions) => {
  const { scenario } = tacticalMap;
  const combatants = scenario.combatants;
  const mapWidth = scenario.width;
  const mapHeight = scenario.height;
  const { focusX, focusZ } = tacticalSceneFocus(
    combatants,
    mapWidth,
    mapHeight,
  );
  const selectedId =
    tacticalMap.scenarioStatus === "setup"
      ? tacticalMap.deploymentCharacterId
      : tacticalMap.activeCharacterId;
  const selected =
    combatants.find(
      (unit) => unit.id === selectedId && unit.side === "player",
    ) ?? null;
  const selectedPosition = selected?.position ?? null;
  const selectedProne = selected?.posture === "prone";
  const selectedSuppressed = Boolean(
    selected && tacticalMap.suppressedCombatantIds.includes(selected.id),
  );
  const selectedDragging = Boolean(
    selected && tacticalMap.draggingCombatantByCarrierId[selected.id],
  );
  const validTargetIds = new Set(
    selected && !selectedDragging
      ? tacticalRangedEnemies(scenario, selected.id).map((unit) => unit.id)
      : [],
  );
  const validMeleeTargetIds = new Set(
    selected && !selectedDragging
      ? meleeEnemies(scenario, selected.id).map((unit) => unit.id)
      : [],
  );
  const reachableCells = useMemo(() => {
    const cells = new Map(
      [...reachableMoves].map(([key, move]) => [
        key,
        {
          ...move.destination,
          elevationLevel: move.finalElevationLevel,
        },
      ]),
    );
    if (
      selectedPosition &&
      tacticalMap.movementMode &&
      reachableMoves.size > 0
    ) {
      cells.set(pointKey(selectedPosition), {
        ...selectedPosition,
        elevationLevel: selected?.elevationLevel,
      });
    }
    return cells;
  }, [
    reachableMoves,
    selected?.elevationLevel,
    selectedPosition,
    tacticalMap.movementMode,
  ]);
  const validMeleeDiveTargetIds = new Set(
    selected &&
    tacticalMap.movementMode === "trot" &&
    !selectedProne &&
    !selectedSuppressed &&
    !selectedDragging
      ? combatants
          .filter(
            (unit) =>
              unit.side === "enemy" &&
              !unit.defeated &&
              reachableMoves.has(pointKey(unit.position)),
          )
          .map((unit) => unit.id)
      : [],
  );
  const plannedMove = tacticalMap.plannedDestination
    ? reachableMoves.get(pointKey(tacticalMap.plannedDestination)) ?? null
    : null;
  const plannedLiquidHydrogenEntry =
    plannedMove?.path.find((point) =>
      filledLiquidHydrogenCellKeys(scenario).has(pointKey(point)),
    ) ?? null;
  const coveringFireTargetOptions = useMemo(
    () =>
      selected && tacticalMap.coveringFireTargeting
        ? validCoveringFireTargets(scenario, selected.id)
        : [],
    [scenario, selected, tacticalMap.coveringFireTargeting],
  );
  const plannedCoveringFireCells =
    selectedPosition &&
    selected?.weapon &&
    tacticalMap.plannedCoveringFireTarget
      ? coveringFireDangerSpaceCells(
          scenario,
          selectedPosition,
          tacticalMap.plannedCoveringFireTarget,
          selected.weapon.extremeRange,
        )
      : [];
  const plannedGrenadeBlastCells = tacticalMap.plannedGrenadeTarget
    ? tacticalMap.grenadeKind === "smoke"
      ? grenadeBlastCells(scenario, tacticalMap.plannedGrenadeTarget)
      : collateralBlastCells(scenario, tacticalMap.plannedGrenadeTarget)
    : [];
  const activeCombatantIds = new Set(
    combatants.map((combatant) => combatant.id),
  );

  return {
    activeCombatantIds,
    combatants,
    coveringFireTargetOptions,
    focusX,
    focusZ,
    mapHeight,
    mapWidth,
    plannedCoveringFireCells,
    plannedGrenadeBlastCells,
    plannedLiquidHydrogenEntry,
    plannedMove,
    reachableCells,
    selected,
    selectedPosition,
    validMeleeDiveTargetIds,
    validMeleeTargetIds,
    validTargetIds,
  };
};
