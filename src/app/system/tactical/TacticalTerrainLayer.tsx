import { Html } from "@react-three/drei";
import { Suspense, useMemo } from "react";
import { Path, Shape } from "three";
import {
  AnimatedCombatantFallback,
  AnimatedCombatantModel,
} from "@/plugins/characterCombat/AnimatedCombatantModel";
import { pointKey } from "@/plugins/characterCombat/geometry";
import type { CombatScenario, TacticalMapState } from "@/plugins/characterCombat/types";
import {
  activeTacticalTerrainObjects,
  interactiveHumanModelFacingForTacticalRotation,
  tacticalWallCornerPoints,
  tacticalWallVisualRuns,
  type TacticalTerrainObject,
  type TacticalWallVisualRun,
} from "@/plugins/characterCombat/tacticalTerrain";
import {
  TACTICAL_DOOR_CENTER_Y,
  TACTICAL_DOOR_HEIGHT,
  TACTICAL_WALL_CENTER_Y,
  TACTICAL_WALL_HEIGHT,
  tacticalRaisedSurfaceHeightAt,
  tacticalVisualHeightAt,
} from "./tacticalSceneGeometry";

const IRIS_WALL_SHAPE = (() => {
  const wallBottom = -TACTICAL_DOOR_CENTER_Y;
  const wallTop = TACTICAL_WALL_HEIGHT - TACTICAL_DOOR_CENTER_Y;
  const shape = new Shape();
  shape.moveTo(-0.5, wallBottom);
  shape.lineTo(0.5, wallBottom);
  shape.lineTo(0.5, wallTop);
  shape.lineTo(-0.5, wallTop);
  shape.closePath();
  const opening = new Path();
  opening.absarc(0, 0, 0.31, 0, Math.PI * 2, true);
  shape.holes.push(opening);
  return shape;
})();

const IRIS_WALL_EXTRUSION = {
  depth: 0.22,
  bevelEnabled: false,
} as const;

const TacticalGrid = ({
  width,
  height,
  gridSize,
  onSelectCell,
}: {
  width: number;
  height: number;
  gridSize: number;
  onSelectCell: (point: { x: number; y: number }) => void;
}) => {
  const positions = useMemo(() => {
    const values: number[] = [];
    for (let x = 0; x <= width; x += gridSize) {
      values.push(
        x - width / 2, 0.012, -height / 2,
        x - width / 2, 0.012, height / 2,
      );
    }
    for (let y = 0; y <= height; y += gridSize) {
      values.push(
        -width / 2, 0.012, y - height / 2,
        width / 2, 0.012, y - height / 2,
      );
    }
    return new Float32Array(values);
  }, [gridSize, height, width]);

  return (
    <>
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        receiveShadow
        onClick={(event) => {
          event.stopPropagation();
          onSelectCell({
            x: Math.floor(event.point.x + width / 2),
            y: Math.floor(event.point.z + height / 2),
          });
        }}
      >
        <planeGeometry args={[width, height]} />
        <meshStandardMaterial color="#101b2a" roughness={0.92} />
      </mesh>
      <lineSegments>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[positions, 3]} />
        </bufferGeometry>
        <lineBasicMaterial color="#2f6f82" transparent opacity={0.55} />
      </lineSegments>
    </>
  );
};

const TacticalElevationTerrain = ({
  scenario,
  onSelectCell,
}: {
  scenario: CombatScenario;
  onSelectCell: (point: { x: number; y: number }) => void;
}) => (
  <>
    {Object.entries(scenario.terrainByCell ?? {}).map(([key, terrain]) => {
      if (terrain !== "elevated") return null;
      const [x, y] = key.split(":").map(Number);
      const height = tacticalVisualHeightAt(scenario, { x, y });
      return (
        <group
          key={`elevated:${key}`}
          position={[x + 0.5 - scenario.width / 2, 0, y + 0.5 - scenario.height / 2]}
          onClick={(event) => {
            event.stopPropagation();
            onSelectCell({ x, y });
          }}
        >
          <mesh position={[0, height / 2, 0]} receiveShadow castShadow>
            <boxGeometry args={[1, height, 1]} />
            <meshStandardMaterial color="#64748b" roughness={0.72} metalness={0.22} />
          </mesh>
          <mesh position={[0, height + 0.003, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
            <planeGeometry args={[0.94, 0.94]} />
            <meshStandardMaterial color="#263b46" roughness={0.9} metalness={0.08} />
          </mesh>
        </group>
      );
    })}
    {(scenario.elevationAccessCells ?? []).map((point) => {
      const baseHeight = tacticalRaisedSurfaceHeightAt(scenario, point);
      const elevatedNeighbor = [
        { x: point.x + 1, y: point.y },
        { x: point.x - 1, y: point.y },
        { x: point.x, y: point.y + 1 },
        { x: point.x, y: point.y - 1 },
      ].find((candidate) => tacticalRaisedSurfaceHeightAt(scenario, candidate) > baseHeight);
      if (!elevatedNeighbor) return null;
      const dx = elevatedNeighbor.x - point.x;
      const dz = elevatedNeighbor.y - point.y;
      const riseHeight = tacticalRaisedSurfaceHeightAt(scenario, elevatedNeighbor) - baseHeight;
      return (
        <group
          key={`stairs:${pointKey(point)}`}
          position={[
            point.x + 0.5 - scenario.width / 2,
            baseHeight,
            point.y + 0.5 - scenario.height / 2,
          ]}
        >
          {Array.from({ length: 4 }, (_, index) => {
            const stepHeight = riseHeight * (index + 1) / 4;
            const offset = -0.375 + index * 0.25;
            return (
              <mesh
                key={index}
                position={[dx * offset, stepHeight / 2, dz * offset]}
                receiveShadow
                castShadow
                onClick={(event) => {
                  event.stopPropagation();
                  onSelectCell(point);
                }}
              >
                <boxGeometry args={dx === 0 ? [0.86, stepHeight, 0.24] : [0.24, stepHeight, 0.86]} />
                <meshStandardMaterial color="#cbd5e1" roughness={0.72} />
              </mesh>
            );
          })}
        </group>
      );
    })}
  </>
);

const TacticalCloseMachineryTerrain = ({
  scenario,
  onSelectCell,
}: {
  scenario: CombatScenario;
  onSelectCell: (point: { x: number; y: number }) => void;
}) => (
  <>
    {(scenario.closeMachineryCells ?? []).map(({ x, y }) => (
      <group
        key={`close-machinery:${x}:${y}`}
        position={[
          x + 0.5 - scenario.width / 2,
          tacticalVisualHeightAt(scenario, { x, y }),
          y + 0.5 - scenario.height / 2,
        ]}
        onClick={(event) => {
          event.stopPropagation();
          onSelectCell({ x, y });
        }}
      >
        {[[-0.31, -0.31], [0.31, -0.31], [-0.31, 0.31], [0.31, 0.31]].map(([offsetX, offsetZ], index) => (
          <mesh key={`column:${index}`} position={[offsetX, 0.28, offsetZ]} castShadow receiveShadow>
            <boxGeometry args={[0.2, 0.56, 0.2]} />
            <meshStandardMaterial color="#475569" roughness={0.62} metalness={0.42} />
          </mesh>
        ))}
        <mesh position={[0, 0.2, -0.28]} rotation={[0, 0, Math.PI / 2]} castShadow receiveShadow>
          <cylinderGeometry args={[0.075, 0.075, 0.76, 10]} />
          <meshStandardMaterial color="#b45309" roughness={0.48} metalness={0.5} />
        </mesh>
        <mesh position={[0.28, 0.38, 0]} rotation={[Math.PI / 2, 0, 0]} castShadow receiveShadow>
          <cylinderGeometry args={[0.065, 0.065, 0.76, 10]} />
          <meshStandardMaterial color="#0e7490" roughness={0.48} metalness={0.5} />
        </mesh>
      </group>
    ))}
  </>
);

const TacticalBridges = ({
  scenario,
  onSelectCell,
}: {
  scenario: CombatScenario;
  onSelectCell: (point: { x: number; y: number }) => void;
}) => (
  <>
    {(scenario.bridges ?? []).flatMap((bridge) => {
      const first = bridge.cells[0];
      const last = bridge.cells[bridge.cells.length - 1];
      const vertical = first.x === last.x;
      const deckHeight = bridge.elevationLevel * TACTICAL_WALL_HEIGHT;
      return bridge.cells.map((cell, index) => (
        <group
          key={`bridge:${bridge.id}:${index}`}
          position={[
            cell.x + 0.5 - scenario.width / 2,
            deckHeight,
            cell.y + 0.5 - scenario.height / 2,
          ]}
          onClick={(event) => {
            event.stopPropagation();
            onSelectCell(cell);
          }}
        >
          <mesh position={[0, -0.07, 0]} castShadow receiveShadow>
            <boxGeometry args={[0.92, 0.14, 0.92]} />
            <meshStandardMaterial color="#64748b" roughness={0.66} metalness={0.3} />
          </mesh>
          {[-0.43, 0.43].map((side) => (
            <mesh key={side} position={vertical ? [side, 0.18, 0] : [0, 0.18, side]} castShadow>
              <boxGeometry args={vertical ? [0.06, 0.3, 0.92] : [0.92, 0.3, 0.06]} />
              <meshStandardMaterial color="#94a3b8" roughness={0.55} metalness={0.4} />
            </mesh>
          ))}
        </group>
      ));
    })}
  </>
);

const DeploymentArea = ({
  scenario,
  onSelectCell,
}: {
  scenario: CombatScenario;
  onSelectCell: (point: { x: number; y: number }) => void;
}) => (
  <>
    {(scenario.deploymentCells ?? []).map((cell) => (
      <mesh
        key={`deployment:${cell.x}:${cell.y}`}
        position={[
          cell.x + 0.5 - scenario.width / 2,
          tacticalVisualHeightAt(scenario, cell) + 0.04,
          cell.y + 0.5 - scenario.height / 2,
        ]}
        rotation={[-Math.PI / 2, 0, 0]}
        onClick={(event) => {
          event.stopPropagation();
          onSelectCell(cell);
        }}
      >
        <planeGeometry args={[0.88, 0.88]} />
        <meshBasicMaterial color="#22c55e" transparent opacity={0.22} depthWrite={false} />
      </mesh>
    ))}
  </>
);

const LiquidHydrogenAreas = ({ scenario }: { scenario: CombatScenario }) => (
  <>
    {(scenario.liquidHydrogenAreas ?? []).map((area) => {
      const minX = Math.min(...area.cells.map((cell) => cell.x));
      const maxX = Math.max(...area.cells.map((cell) => cell.x));
      const minY = Math.min(...area.cells.map((cell) => cell.y));
      const maxY = Math.max(...area.cells.map((cell) => cell.y));
      const width = maxX - minX + 1;
      const depth = maxY - minY + 1;
      const position: [number, number, number] = [
        minX + width / 2 - scenario.width / 2,
        tacticalVisualHeightAt(scenario, area.cells[0]),
        minY + depth / 2 - scenario.height / 2,
      ];
      return (
        <group key={area.id} position={position}>
          {[[0, -depth / 2 + 0.08, width, 0.16], [0, depth / 2 - 0.08, width, 0.16], [-width / 2 + 0.08, 0, 0.16, depth], [width / 2 - 0.08, 0, 0.16, depth]].map(([x, z, rimWidth, rimDepth], index) => (
            <mesh key={index} position={[x, 0.09, z]} castShadow receiveShadow>
              <boxGeometry args={[rimWidth, 0.18, rimDepth]} />
              <meshStandardMaterial color="#64748b" roughness={0.58} metalness={0.4} />
            </mesh>
          ))}
          <mesh position={[0, area.filled ? 0.065 : 0.018, 0]} receiveShadow>
            <boxGeometry args={[width - 0.24, area.filled ? 0.08 : 0.025, depth - 0.24]} />
            <meshStandardMaterial color={area.filled ? "#67e8f9" : "#0f172a"} emissive={area.filled ? "#0891b2" : "#000000"} emissiveIntensity={area.filled ? 0.32 : 0} roughness={area.filled ? 0.16 : 0.82} metalness={area.filled ? 0.18 : 0.3} transparent={area.filled} opacity={area.filled ? 0.82 : 1} />
          </mesh>
        </group>
      );
    })}
  </>
);

const TacticalTerrainPiece = ({
  object,
  mapWidth,
  mapHeight,
  elevation,
  selected,
  terminalActive,
  damage,
  onSelect,
}: {
  object: TacticalTerrainObject;
  mapWidth: number;
  mapHeight: number;
  elevation: number;
  selected: boolean;
  terminalActive: boolean;
  damage: number;
  onSelect: (point: { x: number; y: number }) => void;
}) => {
  if (object.kind === "terminal") {
    if (object.visualKind === "human") {
      const position: [number, number, number] = [
        object.position.x + 0.5 - mapWidth / 2,
        elevation + 0.02,
        object.position.y + 0.5 - mapHeight / 2,
      ];
      return (
        <group position={position} onClick={(event) => {
          event.stopPropagation();
          onSelect(object.position);
        }}>
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.018, 0]}>
            <ringGeometry args={[0.35, 0.44, 32]} />
            <meshBasicMaterial color={selected ? "#facc15" : terminalActive ? "#22c55e" : "#a855f7"} transparent opacity={0.9} />
          </mesh>
          <Suspense fallback={<AnimatedCombatantFallback color="#a855f7" />}>
            <AnimatedCombatantModel animation="idle" facing={interactiveHumanModelFacingForTacticalRotation(object.facing)} modelPath={object.modelPath ?? "/models/character-combat/female.glb"} />
          </Suspense>
          <Html center position={[0, 1.25, 0]} style={{ pointerEvents: "none" }}>
            <div className="whitespace-nowrap border border-purple-400/70 bg-slate-950/90 px-1.5 py-0.5 font-mono text-[7px] uppercase tracking-wider text-purple-100">{object.label}</div>
          </Html>
        </group>
      );
    }
    const position: [number, number, number] = [
      object.position.x + 0.5 - mapWidth / 2,
      elevation + 0.38,
      object.position.y + 0.5 - mapHeight / 2,
    ];
    return (
      <group position={position} rotation={[0, object.facing * Math.PI / 180, 0]} onClick={(event) => {
        event.stopPropagation();
        onSelect(object.position);
      }}>
        <mesh castShadow receiveShadow>
          <boxGeometry args={[0.72, 0.72, 0.72]} />
          <meshStandardMaterial color={selected ? "#facc15" : terminalActive ? "#22c55e" : object.operational ? "#0891b2" : "#475569"} roughness={0.52} metalness={0.35} />
        </mesh>
        <mesh position={[0, 0.18, -0.371]}>
          <planeGeometry args={[0.44, 0.24]} />
          <meshBasicMaterial color={terminalActive ? "#bbf7d0" : object.operational ? "#67e8f9" : "#1e293b"} />
        </mesh>
        <Html center position={[0, 0.78, 0]} style={{ pointerEvents: "none" }}>
          <div className="whitespace-nowrap border border-cyan-500/60 bg-slate-950/90 px-1.5 py-0.5 font-mono text-[7px] uppercase tracking-wider text-cyan-100">{object.label}</div>
        </Html>
      </group>
    );
  }

  if (object.kind === "hatch") {
    const position: [number, number, number] = [
      object.position.x + 0.5 - mapWidth / 2,
      elevation + 0.035,
      object.position.y + 0.5 - mapHeight / 2,
    ];
    const rimColor = selected ? "#facc15" : object.open ? "#22c55e" : "#d97706";
    return (
      <group position={position} onClick={(event) => {
        event.stopPropagation();
        onSelect(object.position);
      }}>
        {[[0, 0.39, 0.78, 0.08], [0, -0.39, 0.78, 0.08], [0.39, 0, 0.08, 0.78], [-0.39, 0, 0.08, 0.78]].map(([x, z, width, depth], index) => (
          <mesh key={index} position={[x, 0.015, z]} castShadow receiveShadow>
            <boxGeometry args={[width, 0.08, depth]} />
            <meshStandardMaterial color={rimColor} roughness={0.5} metalness={0.62} />
          </mesh>
        ))}
        {object.open ? (
          <mesh position={[0, -0.025, 0]} rotation={[-Math.PI / 2, 0, 0]}>
            <planeGeometry args={[0.7, 0.7]} />
            <meshBasicMaterial color="#020617" />
          </mesh>
        ) : (
          <>
            <mesh position={[0, 0.015, 0]} castShadow receiveShadow>
              <boxGeometry args={[0.7, 0.06, 0.7]} />
              <meshStandardMaterial color="#475569" roughness={0.58} metalness={0.55} />
            </mesh>
            {[Math.PI / 4, -Math.PI / 4].map((angle) => (
              <mesh key={angle} position={[0, 0.051, 0]} rotation={[0, angle, 0]}>
                <boxGeometry args={[0.72, 0.01, 0.018]} />
                <meshBasicMaterial color="#cbd5e1" />
              </mesh>
            ))}
          </>
        )}
      </group>
    );
  }

  const dx = object.edge.to.x - object.edge.from.x;
  const dy = object.edge.to.y - object.edge.from.y;
  const horizontal = dy === 0;
  const position: [number, number, number] = [
    (object.edge.from.x + object.edge.to.x) / 2 - mapWidth / 2,
    object.kind === "wall" ? TACTICAL_WALL_CENTER_Y : TACTICAL_DOOR_CENTER_Y,
    (object.edge.from.y + object.edge.to.y) / 2 - mapHeight / 2,
  ];
  const selectEdge = (event: { point: { x: number; z: number }; stopPropagation: () => void }) => {
    event.stopPropagation();
    onSelect({
      x: Math.floor(event.point.x + mapWidth / 2),
      y: Math.floor(event.point.z + mapHeight / 2),
    });
  };
  if (object.kind === "wall") {
    return (
      <mesh position={position} onClick={selectEdge}>
        <boxGeometry args={horizontal ? [Math.abs(dx), TACTICAL_WALL_HEIGHT, 0.22] : [0.22, TACTICAL_WALL_HEIGHT, Math.abs(dy)]} />
        <meshBasicMaterial color={selected ? "#facc15" : "#f97316"} transparent opacity={selected ? 0.55 : damage > 0 ? 0.4 : 0} depthWrite={false} />
      </mesh>
    );
  }
  if (object.portalType === "iris-valve") {
    return (
      <group position={position} rotation={[0, horizontal ? 0 : Math.PI / 2, 0]} onClick={selectEdge}>
        <mesh position={[0, 0, -0.11]} castShadow receiveShadow>
          <extrudeGeometry args={[IRIS_WALL_SHAPE, IRIS_WALL_EXTRUSION]} />
          <meshStandardMaterial color="#64748b" roughness={0.72} metalness={0.22} />
        </mesh>
        <mesh castShadow receiveShadow>
          <torusGeometry args={[0.33, 0.055, 10, 32]} />
          <meshStandardMaterial color={selected ? "#facc15" : object.open ? "#22c55e" : "#d97706"} roughness={0.48} metalness={0.65} />
        </mesh>
        {!object.open && (
          <>
            <mesh rotation={[Math.PI / 2, 0, 0]} castShadow receiveShadow>
              <cylinderGeometry args={[0.29, 0.29, 0.08, 6]} />
              <meshStandardMaterial color="#475569" roughness={0.55} metalness={0.58} />
            </mesh>
            {[-0.047, 0.047].flatMap((faceZ) => [0, Math.PI / 3, 2 * Math.PI / 3].map((angle) => (
              <mesh key={`${faceZ}:${angle}`} position={[0, 0, faceZ]} rotation={[0, 0, angle]}>
                <boxGeometry args={[0.55, 0.012, 0.008]} />
                <meshBasicMaterial color="#cbd5e1" />
              </mesh>
            )))}
          </>
        )}
      </group>
    );
  }
  const openScale = object.open ? 0.18 : 1;
  const doorLength = horizontal ? Math.abs(dx) : Math.abs(dy);
  const retractionOffset = object.open ? -doorLength * (1 - openScale) / 2 : 0;
  const doorPosition: [number, number, number] = [
    position[0] + (horizontal ? retractionOffset : 0),
    position[1],
    position[2] + (horizontal ? 0 : retractionOffset),
  ];
  return (
    <mesh position={doorPosition} scale={horizontal ? [openScale, 1, 1] : [1, 1, openScale]} castShadow receiveShadow onClick={selectEdge}>
      <boxGeometry args={horizontal ? [Math.abs(dx), TACTICAL_DOOR_HEIGHT, 0.2] : [0.2, TACTICAL_DOOR_HEIGHT, Math.abs(dy)]} />
      <meshStandardMaterial color={selected ? "#facc15" : object.open ? "#22c55e" : "#0e7490"} roughness={0.62} metalness={0.32} />
    </mesh>
  );
};

const TacticalWallRun = ({
  run,
  mapWidth,
  mapHeight,
}: {
  run: TacticalWallVisualRun;
  mapWidth: number;
  mapHeight: number;
}) => {
  const dx = run.edge.to.x - run.edge.from.x;
  const dy = run.edge.to.y - run.edge.from.y;
  const horizontal = dy === 0;
  const position: [number, number, number] = [
    (run.edge.from.x + run.edge.to.x) / 2 - mapWidth / 2,
    TACTICAL_WALL_CENTER_Y,
    (run.edge.from.y + run.edge.to.y) / 2 - mapHeight / 2,
  ];
  return (
    <mesh position={position} castShadow receiveShadow>
      <boxGeometry args={horizontal ? [Math.abs(dx), TACTICAL_WALL_HEIGHT, 0.22] : [0.22, TACTICAL_WALL_HEIGHT, Math.abs(dy)]} />
      <meshStandardMaterial color="#64748b" roughness={0.72} metalness={0.22} />
    </mesh>
  );
};

export const TacticalTerrainLayer = ({
  section,
  tacticalMap,
  onSelectCell,
  onSelectTerrain,
}: {
  section: "base" | "structures";
  tacticalMap: TacticalMapState;
  onSelectCell: (point: { x: number; y: number }) => void;
  onSelectTerrain: (
    object: TacticalTerrainObject,
    point: { x: number; y: number },
  ) => void;
}) => {
  const scenario = tacticalMap.scenario;
  const tacticalTerrain = useMemo(
    () => activeTacticalTerrainObjects(
      scenario,
      tacticalMap.doorOpenById,
      tacticalMap.destroyedTerrainObjectIds,
    ),
    [scenario, tacticalMap.destroyedTerrainObjectIds, tacticalMap.doorOpenById],
  );
  const wallRuns = useMemo(() => tacticalWallVisualRuns(tacticalTerrain), [tacticalTerrain]);
  const wallCorners = useMemo(() => tacticalWallCornerPoints(tacticalTerrain), [tacticalTerrain]);

  if (section === "base") {
    return (
      <>
        <TacticalGrid
          width={scenario.width}
          height={scenario.height}
          gridSize={tacticalMap.gridSize}
          onSelectCell={onSelectCell}
        />
        <TacticalElevationTerrain scenario={scenario} onSelectCell={onSelectCell} />
        <TacticalBridges scenario={scenario} onSelectCell={onSelectCell} />
        <TacticalCloseMachineryTerrain scenario={scenario} onSelectCell={onSelectCell} />
        {tacticalMap.scenarioStatus === "setup" && (
          <DeploymentArea scenario={scenario} onSelectCell={onSelectCell} />
        )}
      </>
    );
  }

  return (
    <>
      <LiquidHydrogenAreas scenario={scenario} />
      {wallRuns.map((run) => (
        <TacticalWallRun
          key={run.segmentIds.join(":")}
          run={run}
          mapWidth={scenario.width}
          mapHeight={scenario.height}
        />
      ))}
      {wallCorners.map((corner) => (
        <mesh
          key={`${corner.x}:${corner.y}`}
          position={[
            corner.x - scenario.width / 2,
            TACTICAL_WALL_CENTER_Y,
            corner.y - scenario.height / 2,
          ]}
          castShadow
          receiveShadow
        >
          <boxGeometry args={[0.22, TACTICAL_WALL_HEIGHT, 0.22]} />
          <meshStandardMaterial color="#64748b" roughness={0.72} metalness={0.22} />
        </mesh>
      ))}
      {tacticalTerrain.map((object) => (
        <TacticalTerrainPiece
          key={object.id}
          object={object}
          mapWidth={scenario.width}
          mapHeight={scenario.height}
          elevation={
            object.kind === "terminal" || object.kind === "hatch"
              ? tacticalVisualHeightAt(scenario, object.position)
              : 0
          }
          selected={tacticalMap.selectedTerrainObjectId === object.id}
          terminalActive={
            object.kind === "terminal"
            && Boolean(tacticalMap.terminalActiveById[object.id])
          }
          damage={tacticalMap.terrainDamageById[object.id] ?? 0}
          onSelect={(point) => onSelectTerrain(object, point)}
        />
      ))}
    </>
  );
};
