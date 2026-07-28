import { Html } from "@react-three/drei";
import { useMemo } from "react";
import {
  pointKey,
  tacticalBaseLightingLevelAt,
  tacticalLightPatchVisibleAt,
  tacticalLightSources,
} from "@/plugins/characterCombat/geometry";
import type { CombatScenario } from "@/plugins/characterCombat/types";

export const tacticalFogCellKeys = (
  scenario: CombatScenario,
  visible: ReadonlyMap<string, unknown>,
  explored: ReadonlySet<string>,
) => {
  const exploredKeys: string[] = [];
  const unexploredKeys: string[] = [];
  for (let x = 0; x < scenario.width; x += 1) {
    for (let y = 0; y < scenario.height; y += 1) {
      const key = pointKey({ x, y });
      if (visible.has(key)) continue;
      (explored.has(key) ? exploredKeys : unexploredKeys).push(key);
    }
  }
  return { exploredKeys, unexploredKeys };
};

const TacticalLightingOverlay = ({ scenario }: { scenario: CombatScenario }) => {
  const sourceLitCells = new Map<string, { x: number; y: number }>();
  tacticalLightSources(scenario).forEach((source) => {
    for (let x = Math.max(0, source.position.x - source.range); x <= Math.min(scenario.width - 1, source.position.x + source.range); x += 1) {
      for (let y = Math.max(0, source.position.y - source.range); y <= Math.min(scenario.height - 1, source.position.y + source.range); y += 1) {
        const point = { x, y };
        if (tacticalLightPatchVisibleAt(scenario, source, point)) {
          sourceLitCells.set(pointKey(point), point);
        }
      }
    }
  });
  const darkCells = scenario.exteriorLighting === "illuminated"
    ? (scenario.interiorCells ?? []).filter(
        (point) => tacticalBaseLightingLevelAt(scenario, point) === "dark",
      )
    : [];

  return (
    <>
      {scenario.exteriorLighting !== "illuminated" && (
        <mesh position={[0, 0.006, 0]} rotation={[-Math.PI / 2, 0, 0]} renderOrder={1}>
          <planeGeometry args={[scenario.width, scenario.height]} />
          <meshBasicMaterial color="#00030a" transparent opacity={0.72} depthWrite={false} />
        </mesh>
      )}
      {darkCells.map((point) => (
        <mesh
          key={`dark:${pointKey(point)}`}
          position={[point.x + 0.5 - scenario.width / 2, 0.006, point.y + 0.5 - scenario.height / 2]}
          rotation={[-Math.PI / 2, 0, 0]}
          renderOrder={1}
        >
          <planeGeometry args={[1, 1]} />
          <meshBasicMaterial color="#00030a" transparent opacity={0.72} depthWrite={false} />
        </mesh>
      ))}
      {[...sourceLitCells.values()].map((point) => (
        <mesh
          key={`lit:${pointKey(point)}`}
          position={[point.x + 0.5 - scenario.width / 2, 0.008, point.y + 0.5 - scenario.height / 2]}
          rotation={[-Math.PI / 2, 0, 0]}
          renderOrder={2}
        >
          <planeGeometry args={[1, 1]} />
          <meshBasicMaterial color="#d6c98a" transparent opacity={0.28} depthWrite={false} />
        </mesh>
      ))}
    </>
  );
};

const TacticalFogOverlay = ({
  scenario,
  visible,
  explored,
}: {
  scenario: CombatScenario;
  visible: ReadonlyMap<string, unknown>;
  explored: ReadonlySet<string>;
}) => {
  const [exploredPositions, unexploredPositions] = useMemo(() => {
    const exploredValues: number[] = [];
    const unexploredValues: number[] = [];
    const { exploredKeys, unexploredKeys } = tacticalFogCellKeys(
      scenario,
      visible,
      explored,
    );
    const appendCell = (key: string, values: number[]) => {
      const [x, y] = key.split(":").map(Number);
      const left = x - scenario.width / 2;
      const right = left + 1;
      const top = y - scenario.height / 2;
      const bottom = top + 1;
      values.push(
        left, 0.01, top,
        right, 0.01, top,
        right, 0.01, bottom,
        left, 0.01, top,
        right, 0.01, bottom,
        left, 0.01, bottom,
      );
    };
    exploredKeys.forEach((key) => appendCell(key, exploredValues));
    unexploredKeys.forEach((key) => appendCell(key, unexploredValues));
    return [new Float32Array(exploredValues), new Float32Array(unexploredValues)];
  }, [explored, scenario, visible]);

  return (
    <>
      <mesh renderOrder={3}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[exploredPositions, 3]} />
        </bufferGeometry>
        <meshBasicMaterial color="#07101a" transparent opacity={0.45} depthWrite={false} />
      </mesh>
      <mesh renderOrder={3}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[unexploredPositions, 3]} />
        </bufferGeometry>
        <meshBasicMaterial color="#02040a" transparent opacity={0.9} depthWrite={false} />
      </mesh>
    </>
  );
};

const LastKnownEnemyMarkers = ({
  positions,
  visibleEnemyIds,
  width,
  height,
}: {
  positions: Record<string, { x: number; y: number }>;
  visibleEnemyIds: ReadonlySet<string>;
  width: number;
  height: number;
}) => (
  <>
    {Object.entries(positions)
      .filter(([id]) => !visibleEnemyIds.has(id))
      .map(([id, point]) => (
        <group
          key={id}
          position={[
            point.x + 0.5 - width / 2,
            0.055,
            point.y + 0.5 - height / 2,
          ]}
        >
          <mesh rotation={[-Math.PI / 2, 0, 0]}>
            <ringGeometry args={[0.28, 0.34, 24]} />
            <meshBasicMaterial color="#94a3b8" transparent opacity={0.78} />
          </mesh>
          <mesh rotation={[0, Math.PI / 4, 0]}>
            <boxGeometry args={[0.5, 0.025, 0.055]} />
            <meshBasicMaterial color="#94a3b8" transparent opacity={0.78} />
          </mesh>
          <mesh rotation={[0, -Math.PI / 4, 0]}>
            <boxGeometry args={[0.5, 0.025, 0.055]} />
            <meshBasicMaterial color="#94a3b8" transparent opacity={0.78} />
          </mesh>
          <Html center position={[0, 0.55, 0]} style={{ pointerEvents: "none" }}>
            <div className="whitespace-nowrap border border-slate-400/60 bg-slate-950/85 px-1 font-mono text-[7px] font-bold uppercase text-slate-300">Last seen</div>
          </Html>
        </group>
      ))}
  </>
);

export const TacticalVisibilityLayer = ({
  scenario,
  visible,
  explored,
  lastKnownEnemyPositions,
  visibleEnemyIds,
}: {
  scenario: CombatScenario;
  visible: ReadonlyMap<string, unknown>;
  explored: ReadonlySet<string>;
  lastKnownEnemyPositions: Record<string, { x: number; y: number }>;
  visibleEnemyIds: ReadonlySet<string>;
}) => (
  <>
    <TacticalLightingOverlay scenario={scenario} />
    <TacticalFogOverlay scenario={scenario} visible={visible} explored={explored} />
    <LastKnownEnemyMarkers
      positions={lastKnownEnemyPositions}
      visibleEnemyIds={visibleEnemyIds}
      width={scenario.width}
      height={scenario.height}
    />
  </>
);
