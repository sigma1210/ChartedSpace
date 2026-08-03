"use client";

import { Html, Line } from "@react-three/drei";
import { useMemo } from "react";
import { pointKey } from "@/plugins/characterCombat/geometry";
import type {
  CombatScenario,
  PlannedMove,
} from "@/plugins/characterCombat/types";
import {
  tacticalMovementVisualHeightAt,
  tacticalVisualHeightAt,
} from "./tacticalSceneGeometry";

type ReachableCell = {
  x: number;
  y: number;
  elevationLevel?: number;
};

export const tacticalMovementPerimeterPositions = (
  cells: ReadonlyMap<string, ReachableCell>,
  scenario: CombatScenario,
) => {
  const values: number[] = [];
  const occupied = new Set(cells.keys());
  const edge = (
    cell: ReachableCell,
    fromX: number,
    fromY: number,
    toX: number,
    toY: number,
  ) => {
    const elevation =
      tacticalMovementVisualHeightAt(
        scenario,
        cell,
        cell.elevationLevel,
      ) + 0.045;
    values.push(
      fromX - scenario.width / 2,
      elevation,
      fromY - scenario.height / 2,
      toX - scenario.width / 2,
      elevation,
      toY - scenario.height / 2,
    );
  };

  cells.forEach((cell) => {
    if (!occupied.has(pointKey({ x: cell.x, y: cell.y - 1 }))) {
      edge(cell, cell.x, cell.y, cell.x + 1, cell.y);
    }
    if (!occupied.has(pointKey({ x: cell.x + 1, y: cell.y }))) {
      edge(cell, cell.x + 1, cell.y, cell.x + 1, cell.y + 1);
    }
    if (!occupied.has(pointKey({ x: cell.x, y: cell.y + 1 }))) {
      edge(cell, cell.x + 1, cell.y + 1, cell.x, cell.y + 1);
    }
    if (!occupied.has(pointKey({ x: cell.x - 1, y: cell.y }))) {
      edge(cell, cell.x, cell.y + 1, cell.x, cell.y);
    }
  });

  return new Float32Array(values);
};

export const TacticalMovementPerimeterLayer = ({
  scenario,
  reachableCells,
  hidden,
}: {
  scenario: CombatScenario;
  reachableCells: ReadonlyMap<string, ReachableCell>;
  hidden: boolean;
}) => {
  const positions = useMemo(
    () =>
      hidden
        ? new Float32Array()
        : tacticalMovementPerimeterPositions(reachableCells, scenario),
    [hidden, reachableCells, scenario],
  );

  if (positions.length === 0) return null;
  return (
    <lineSegments>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          args={[positions, 3]}
        />
      </bufferGeometry>
      <lineBasicMaterial color="#facc15" />
    </lineSegments>
  );
};

const MovementPath = ({
  origin,
  originElevationLevel,
  plannedMove,
  scenario,
}: {
  origin: { x: number; y: number };
  originElevationLevel?: number;
  plannedMove: PlannedMove;
  scenario: CombatScenario;
}) => {
  const worldPoint = (
    point: { x: number; y: number },
    level?: number,
  ): [number, number, number] => [
    point.x + 0.5 - scenario.width / 2,
    tacticalMovementVisualHeightAt(scenario, point, level) + 0.075,
    point.y + 0.5 - scenario.height / 2,
  ];

  return (
    <>
      <Line
        points={[
          worldPoint(origin, originElevationLevel),
          ...plannedMove.path.map((point, index) =>
            worldPoint(
              point,
              plannedMove.pathElevationLevels?.[index],
            ),
          ),
        ]}
        color="#67e8f9"
        lineWidth={2}
      />
      <mesh
        position={worldPoint(
          plannedMove.destination,
          plannedMove.pathElevationLevels?.[
            plannedMove.pathElevationLevels.length - 1
          ],
        )}
        rotation={[-Math.PI / 2, 0, 0]}
      >
        <ringGeometry args={[0.22, 0.38, 24]} />
        <meshBasicMaterial color="#facc15" />
      </mesh>
    </>
  );
};

export const TacticalMovementPathLayer = ({
  scenario,
  selectedPosition,
  selectedElevationLevel,
  plannedMove,
  liquidHydrogenEntry,
}: {
  scenario: CombatScenario;
  selectedPosition: { x: number; y: number } | null;
  selectedElevationLevel?: number;
  plannedMove: PlannedMove | null;
  liquidHydrogenEntry: { x: number; y: number } | null;
}) => (
  <>
    {selectedPosition && plannedMove && (
      <MovementPath
        origin={selectedPosition}
        originElevationLevel={selectedElevationLevel}
        plannedMove={plannedMove}
        scenario={scenario}
      />
    )}
    {liquidHydrogenEntry && (
      <group
        position={[
          liquidHydrogenEntry.x + 0.5 - scenario.width / 2,
          tacticalVisualHeightAt(scenario, liquidHydrogenEntry) + 0.12,
          liquidHydrogenEntry.y + 0.5 - scenario.height / 2,
        ]}
      >
        <mesh rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.28, 0.46, 32]} />
          <meshBasicMaterial color="#ef4444" />
        </mesh>
        <Html
          center
          position={[0, 0.52, 0]}
          style={{ pointerEvents: "none" }}
        >
          <div className="whitespace-nowrap border border-red-400 bg-black/95 px-1.5 py-0.5 font-mono text-[8px] font-bold uppercase text-red-100">
            Lethal liquid hydrogen
          </div>
        </Html>
      </group>
    )}
  </>
);
