"use client";

import { Html } from "@react-three/drei";
import { Suspense, useState } from "react";
import {
  AnimatedCombatantFallback,
  AnimatedCombatantModel,
} from "@/plugins/characterCombat/AnimatedCombatantModel";
import { AnimatedCombatantPlacement } from "@/plugins/characterCombat/AnimatedCombatantPlacement";
import type {
  Combatant,
  CombatantMovementAnimation,
  TacticalMapState,
} from "@/plugins/characterCombat/types";
import {
  tacticalCombatantHeight,
  tacticalWorldMovement,
} from "./tacticalSceneGeometry";
import { tacticalVisibleCombatants } from "./tacticalCombatantVisibility";

type WorldMovement = {
  sequence: number;
  path: [number, number, number][];
  mode: "walk" | "run";
};

type TacticalCombatantLayerProps = {
  tacticalMap: TacticalMapState;
  visibleEnemyPointKeys: ReadonlySet<string>;
  selectedCombatantId: string | null;
  validTargetIds: ReadonlySet<string>;
  validMeleeTargetIds: ReadonlySet<string>;
  validMeleeDiveTargetIds: ReadonlySet<string>;
  onSelectCombatant: (combatant: Combatant) => void;
};

const MapCombatant = ({
  combatant,
  mapWidth,
  mapHeight,
  elevation,
  movement,
  selected,
  deploymentFacingIndicator,
  targetable,
  targeted,
  onSelect,
  onMovementComplete,
}: {
  combatant: Combatant;
  mapWidth: number;
  mapHeight: number;
  elevation: number;
  movement?: WorldMovement;
  selected: boolean;
  deploymentFacingIndicator: boolean;
  targetable: boolean;
  targeted: boolean;
  onSelect: () => void;
  onMovementComplete?: (sequence: number) => void;
}) => {
  const enemy = combatant.side === "enemy";
  const accent = enemy ? "#ef4444" : "#22d3ee";
  const facingMarkerPosition: [number, number, number] =
    combatant.facing === "north"
      ? [0, 0.025, -0.55]
      : combatant.facing === "east"
        ? [0.55, 0.025, 0]
        : combatant.facing === "south"
          ? [0, 0.025, 0.55]
          : [-0.55, 0.025, 0];

  return (
    <AnimatedCombatantPlacement
      position={[
        combatant.position.x - mapWidth / 2 + 0.5,
        elevation + 0.02,
        combatant.position.y - mapHeight / 2 + 0.5,
      ]}
      rotation={[0, 0, 0]}
      finalFacing={combatant.facing}
      movement={movement}
      onMovementComplete={onMovementComplete}
      onClick={(event) => {
        event.stopPropagation();
        onSelect();
      }}
    >
      {(moving, visualFacing) => (
        <>
          {(!enemy || targetable || targeted) && (
            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.018, 0]}>
              <ringGeometry
                args={
                  targeted
                    ? [0.29, 0.49, 32]
                    : targetable
                      ? [0.37, 0.44, 32]
                      : [0.34, 0.47, 32]
                }
              />
              <meshBasicMaterial
                color={
                  targeted ? "#ff1f1f" : selected ? "#facc15" : accent
                }
                transparent
                opacity={targetable || selected || targeted ? 1 : 0.72}
              />
            </mesh>
          )}
          {deploymentFacingIndicator && (
            <mesh
              position={facingMarkerPosition}
              rotation={[-Math.PI / 2, 0, 0]}
            >
              <circleGeometry args={[0.13, 3]} />
              <meshBasicMaterial color="#facc15" />
            </mesh>
          )}
          <Suspense fallback={<AnimatedCombatantFallback color={accent} />}>
            <AnimatedCombatantModel
              animation={moving ? movement?.mode ?? "walk" : "idle"}
              facing={visualFacing}
              pose={combatant.woundState === "dead" ? "stunned" : null}
              modelPath={combatant.modelPath}
            />
          </Suspense>
          <Html
            center
            position={[0, 1.25, 0]}
            style={{ pointerEvents: "none" }}
          >
            <div
              className={`whitespace-nowrap border px-2 py-1 font-mono text-[10px] font-bold uppercase tracking-wider ${
                selected || targeted
                  ? "border-yellow-300 bg-yellow-950/95 text-yellow-100"
                  : enemy
                    ? "border-red-500/70 bg-slate-950/90 text-red-100"
                    : "border-cyan-500/70 bg-slate-950/90 text-cyan-100"
              }`}
            >
              {combatant.name}
            </div>
          </Html>
        </>
      )}
    </AnimatedCombatantPlacement>
  );
};

export const TacticalCombatantLayer = ({
  tacticalMap,
  visibleEnemyPointKeys,
  selectedCombatantId,
  validTargetIds,
  validMeleeTargetIds,
  validMeleeDiveTargetIds,
  onSelectCombatant,
}: TacticalCombatantLayerProps) => {
  const { scenario } = tacticalMap;
  const [completedMovements, setCompletedMovements] = useState<
    Record<string, CombatantMovementAnimation | undefined>
  >({});

  return (
    <>
      {tacticalVisibleCombatants(
        tacticalMap,
        visibleEnemyPointKeys,
        completedMovements,
      ).map(
        (combatant) => {
          const animation =
            tacticalMap.movementAnimationByCharacterId[combatant.id];
          const selected = selectedCombatantId === combatant.id;
          return (
            <MapCombatant
              key={combatant.id}
              combatant={combatant}
              mapWidth={scenario.width}
              mapHeight={scenario.height}
              elevation={tacticalCombatantHeight(scenario, combatant)}
              movement={
                animation
                  ? tacticalWorldMovement(animation, scenario)
                  : undefined
              }
              selected={selected}
              deploymentFacingIndicator={
                tacticalMap.scenarioStatus === "setup" && selected
              }
              targetable={
                validTargetIds.has(combatant.id) ||
                validMeleeTargetIds.has(combatant.id) ||
                validMeleeDiveTargetIds.has(combatant.id)
              }
              targeted={
                tacticalMap.plannedAttackTargetId === combatant.id ||
                tacticalMap.plannedMeleeTargetId === combatant.id
              }
              onSelect={() => onSelectCombatant(combatant)}
              onMovementComplete={() => {
                if (!animation) return;
                setCompletedMovements((current) =>
                  current[combatant.id] === animation
                    ? current
                    : {
                        ...current,
                        [combatant.id]: animation,
                      },
                );
              }}
            />
          );
        },
      )}
    </>
  );
};
