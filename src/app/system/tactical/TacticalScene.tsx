"use client";

import { OrbitControls, OrthographicCamera } from "@react-three/drei";
import { activateTacticalCharacter, deployTacticalCharacter, previewTacticalCoveringFire, previewTacticalGrenadeTarget, previewTacticalMelee, previewTacticalMeleeDive, previewTacticalMove, selectTacticalAttackTarget, selectTacticalTerrainObject } from "@/plugins/characterCombat/slice";
import { pointKey } from "@/plugins/characterCombat/geometry";
import type { Combatant, PlannedMove } from "@/plugins/characterCombat/types";
import { setSelectedProfileCharacter } from "@/plugins/characters";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { TacticalCombatantLayer } from "./TacticalCombatantLayer";
import { TacticalEffectsLayer } from "./TacticalEffectsLayer";
import {
  TacticalMovementPathLayer,
  TacticalMovementPerimeterLayer,
} from "./TacticalMovementPreviewLayer";
import { TacticalTerrainLayer } from "./TacticalTerrainLayer";
import { TacticalVisibilityLayer } from "./TacticalVisibilityLayer";
import { DEFAULT_TACTICAL_MAP } from "./tacticalMapDefaults";
import { resolveTacticalCombatantSelection } from "./tacticalSceneInteractions";
import { useTacticalSceneState } from "./useTacticalSceneState";

export const TacticalScene = ({ crewVisibility, exploredCells, lastKnownEnemyPositions, reachableMoves, visibleEnemyIds }: { crewVisibility: ReadonlyMap<string, unknown>; exploredCells: ReadonlySet<string>; lastKnownEnemyPositions: Record<string, { x: number; y: number }>; reachableMoves: ReadonlyMap<string, PlannedMove>; visibleEnemyIds: ReadonlySet<string> }) => {
  const dispatch = useAppDispatch();
  const tacticalMap = useAppSelector((state) => state.plugins.characterCombat.tacticalMap) ?? DEFAULT_TACTICAL_MAP;
  const {
    activeCombatantIds,
    coveringFireTargetOptions,
    focusX,
    focusZ,
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
  } = useTacticalSceneState({ tacticalMap, reachableMoves });
  const selectMapCell = (point: { x: number; y: number }) => tacticalMap.scenarioStatus === "setup"
    ? dispatch(deployTacticalCharacter(point))
    : tacticalMap.coveringFireTargeting ? dispatch(previewTacticalCoveringFire(point))
    : tacticalMap.grenadeTargeting
      ? dispatch(previewTacticalGrenadeTarget(point))
      : dispatch(previewTacticalMove(reachableMoves.has(pointKey(point)) ? point : null));
  const selectTerrain = (
    object: { id: string },
    point: { x: number; y: number },
  ) => tacticalMap.coveringFireTargeting
    ? dispatch(previewTacticalCoveringFire(point))
    : dispatch(selectTacticalTerrainObject(object.id));
  const selectCombatant = (combatant: Combatant) => {
    const selection = resolveTacticalCombatantSelection({
      combatant,
      coveringFireTargeting: tacticalMap.coveringFireTargeting,
      grenadeTargeting: tacticalMap.grenadeTargeting,
      validMeleeDiveTargetIds,
      validTargetIds,
      validMeleeTargetIds,
    });

    switch (selection.type) {
      case "preview-covering-fire":
        dispatch(previewTacticalCoveringFire(selection.point));
        return;
      case "preview-grenade":
        dispatch(previewTacticalGrenadeTarget(selection.point));
        return;
      case "preview-melee-dive":
        dispatch(previewTacticalMeleeDive(selection.combatantId));
        return;
      case "select-attack-target":
        dispatch(selectTacticalAttackTarget(selection.combatantId));
        return;
      case "preview-melee":
        dispatch(previewTacticalMelee(selection.combatantId));
        return;
      case "activate-character":
        dispatch(activateTacticalCharacter(selection.combatantId));
        dispatch(
          setSelectedProfileCharacter(selection.profileCharacterId),
        );
        return;
      case "none":
        return;
    }
  };

  return <>
    <color attach="background" args={["#050a12"]} />
    <ambientLight intensity={1.4} />
    <directionalLight position={[5, 10, 6]} intensity={2.2} castShadow />
    <OrthographicCamera makeDefault position={[focusX + 8, 12, focusZ + 10]} zoom={42} near={0.1} far={300} />
    <OrbitControls makeDefault target={[focusX, 0, focusZ]} enableDamping dampingFactor={0.12} screenSpacePanning minZoom={8} maxZoom={120} minPolarAngle={0.2} maxPolarAngle={Math.PI / 2.05} />
    <TacticalTerrainLayer
      section="base"
      tacticalMap={tacticalMap}
      onSelectCell={selectMapCell}
      onSelectTerrain={selectTerrain}
    />
    <TacticalVisibilityLayer
      scenario={tacticalMap.scenario}
      visible={crewVisibility}
      explored={exploredCells}
      lastKnownEnemyPositions={lastKnownEnemyPositions}
      visibleEnemyIds={visibleEnemyIds}
    />
    <TacticalMovementPerimeterLayer
      scenario={tacticalMap.scenario}
      reachableCells={reachableCells}
      hidden={
        tacticalMap.coveringFireTargeting ||
        tacticalMap.grenadeTargeting
      }
    />
    <TacticalEffectsLayer
      tacticalMap={tacticalMap}
      selectedPosition={selectedPosition}
      coveringFireTargetOptions={coveringFireTargetOptions}
      plannedCoveringFireCells={plannedCoveringFireCells}
      plannedGrenadeBlastCells={plannedGrenadeBlastCells}
      activeCombatantIds={activeCombatantIds}
    />
    <TacticalTerrainLayer
      section="structures"
      tacticalMap={tacticalMap}
      onSelectCell={selectMapCell}
      onSelectTerrain={selectTerrain}
    />
    <TacticalMovementPathLayer
      scenario={tacticalMap.scenario}
      selectedPosition={selectedPosition}
      selectedElevationLevel={selected?.elevationLevel}
      plannedMove={plannedMove}
      liquidHydrogenEntry={plannedLiquidHydrogenEntry}
    />
    <TacticalCombatantLayer
      tacticalMap={tacticalMap}
      crewVisibility={crewVisibility}
      selectedCombatantId={selected?.id ?? null}
      validTargetIds={validTargetIds}
      validMeleeTargetIds={validMeleeTargetIds}
      validMeleeDiveTargetIds={validMeleeDiveTargetIds}
      onSelectCombatant={selectCombatant}
    />
  </>;
};
