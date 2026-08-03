import { Html } from "@react-three/drei";
import { memo } from "react";
import {
  pointKey,
  tacticalBaseLightingLevelAt,
  tacticalLightPatchVisibleAt,
  tacticalLightSources,
} from "@/plugins/characterCombat/geometry";
import type { CombatScenario } from "@/plugins/characterCombat/types";
import { tacticalLightingScenarioEqual } from "./tacticalStaticLayerMemo";

const TacticalLightingOverlay = memo(function TacticalLightingOverlay({
  scenario,
}: {
  scenario: CombatScenario;
}) {
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
}, (previous, next) =>
  tacticalLightingScenarioEqual(previous.scenario, next.scenario));

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
  lastKnownEnemyPositions,
  visibleEnemyIds,
}: {
  scenario: CombatScenario;
  lastKnownEnemyPositions: Record<string, { x: number; y: number }>;
  visibleEnemyIds: ReadonlySet<string>;
}) => (
  <>
    <TacticalLightingOverlay scenario={scenario} />
    <LastKnownEnemyMarkers
      positions={lastKnownEnemyPositions}
      visibleEnemyIds={visibleEnemyIds}
      width={scenario.width}
      height={scenario.height}
    />
  </>
);
