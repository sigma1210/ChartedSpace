"use client";

import { Html, Line } from "@react-three/drei";
import { pointKey } from "@/plugins/characterCombat/geometry";
import type {
  CombatScenario,
  TacticalMapState,
} from "@/plugins/characterCombat/types";
import { tacticalVisualHeightAt } from "./tacticalSceneGeometry";

type TacticalEffectsLayerProps = {
  tacticalMap: TacticalMapState;
  selectedPosition: { x: number; y: number } | null;
  coveringFireTargetOptions: { x: number; y: number }[];
  plannedCoveringFireCells: { x: number; y: number }[];
  plannedGrenadeBlastCells: { x: number; y: number }[];
  activeCombatantIds: ReadonlySet<string>;
};

const CoveringFirePreview = ({
  cells,
  width,
  height,
  color,
}: {
  cells: { x: number; y: number }[];
  width: number;
  height: number;
  color: string;
}) => {
  const worldPoint = (point: {
    x: number;
    y: number;
  }): [number, number, number] => [
    point.x + 0.5 - width / 2,
    0.085,
    point.y + 0.5 - height / 2,
  ];

  return (
    <>
      {cells.map((cell) => (
        <group key={`${cell.x}:${cell.y}`} position={worldPoint(cell)}>
          <mesh rotation={[-Math.PI / 2, 0, 0]}>
            <ringGeometry args={[0.31, 0.35, 32]} />
            <meshBasicMaterial color={color} />
          </mesh>
          <Line
            points={[
              [-0.22, 0.004, -0.22],
              [0.22, 0.004, 0.22],
            ]}
            color={color}
            lineWidth={1}
          />
          <Line
            points={[
              [-0.22, 0.004, 0.22],
              [0.22, 0.004, -0.22],
            ]}
            color={color}
            lineWidth={1}
          />
        </group>
      ))}
    </>
  );
};

const BlastAreaPreview = ({
  center,
  cells,
  width,
  height,
  resolved,
  label,
  color: requestedColor,
}: {
  center: { x: number; y: number };
  cells: { x: number; y: number }[];
  width: number;
  height: number;
  resolved: boolean;
  label: string;
  color?: string;
}) => {
  const worldPoint = (point: {
    x: number;
    y: number;
  }): [number, number, number] => [
    point.x + 0.5 - width / 2,
    0.095,
    point.y + 0.5 - height / 2,
  ];
  const color = requestedColor ?? (resolved ? "#dc2626" : "#f9a8d4");

  return (
    <>
      {cells.map((cell) => (
        <mesh
          key={`${cell.x}:${cell.y}`}
          position={worldPoint(cell)}
          rotation={[-Math.PI / 2, 0, 0]}
        >
          <ringGeometry args={[0.36, 0.41, 24]} />
          <meshBasicMaterial color={color} />
        </mesh>
      ))}
      <group position={worldPoint(center)}>
        <mesh>
          <sphereGeometry args={[resolved ? 0.24 : 0.16, 16, 12]} />
          <meshStandardMaterial
            color={color}
            emissive={color}
            emissiveIntensity={resolved ? 1.5 : 0.7}
          />
        </mesh>
        <Html center position={[0, 0.62, 0]} style={{ pointerEvents: "none" }}>
          <div
            className={`whitespace-nowrap border bg-black/95 px-1.5 py-0.5 font-mono text-[8px] font-bold uppercase ${
              resolved
                ? "border-red-300 text-red-100"
                : "border-pink-300 text-pink-100"
            }`}
          >
            {label}
          </div>
        </Html>
      </group>
    </>
  );
};

const SatchelChargeMarkers = ({
  charges,
  width,
  height,
}: {
  charges: TacticalMapState["satchelCharges"];
  width: number;
  height: number;
}) => (
  <>
    {charges.map((charge) => (
      <group
        key={charge.id}
        position={[
          charge.position.x + 0.5 - width / 2,
          0.16,
          charge.position.y + 0.5 - height / 2,
        ]}
      >
        <mesh rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.2, 0.31, 20]} />
          <meshBasicMaterial color="#fb923c" />
        </mesh>
        <mesh position={[0, 0.05, 0]}>
          <boxGeometry args={[0.28, 0.12, 0.2]} />
          <meshStandardMaterial
            color="#7c2d12"
            emissive="#ea580c"
            emissiveIntensity={0.8}
          />
        </mesh>
        <Html center position={[0, 0.62, 0]} style={{ pointerEvents: "none" }}>
          <div className="whitespace-nowrap border border-orange-300 bg-black/95 px-1.5 py-0.5 font-mono text-[8px] font-bold uppercase text-orange-100">
            Satchel armed
          </div>
        </Html>
      </group>
    ))}
  </>
);

const SmokeArea = ({
  cells,
  width,
  height,
}: {
  cells: { x: number; y: number }[];
  width: number;
  height: number;
}) => (
  <>
    {cells.map((point) => (
      <group
        key={`smoke:${pointKey(point)}`}
        position={[
          point.x + 0.5 - width / 2,
          0.48,
          point.y + 0.5 - height / 2,
        ]}
      >
        <mesh position={[-0.18, 0, 0]}>
          <sphereGeometry args={[0.34, 12, 8]} />
          <meshStandardMaterial
            color="#94a3b8"
            transparent
            opacity={0.5}
            depthWrite={false}
          />
        </mesh>
        <mesh position={[0.2, 0.12, 0.05]}>
          <sphereGeometry args={[0.4, 12, 8]} />
          <meshStandardMaterial
            color="#64748b"
            transparent
            opacity={0.55}
            depthWrite={false}
          />
        </mesh>
      </group>
    ))}
  </>
);

const FireArea = ({
  cells,
  selected,
  scenario,
}: {
  cells: { x: number; y: number }[];
  selected: { x: number; y: number } | null;
  scenario: CombatScenario;
}) => (
  <>
    {cells.map((point) => {
      const highlighted = Boolean(
        selected && pointKey(selected) === pointKey(point),
      );
      return (
        <group
          key={`fire:${pointKey(point)}`}
          position={[
            point.x + 0.5 - scenario.width / 2,
            tacticalVisualHeightAt(scenario, point) + 0.24,
            point.y + 0.5 - scenario.height / 2,
          ]}
        >
          <mesh>
            <coneGeometry
              args={[
                highlighted ? 0.36 : 0.3,
                highlighted ? 0.72 : 0.58,
                12,
              ]}
            />
            <meshStandardMaterial
              color="#fb923c"
              emissive="#ef4444"
              emissiveIntensity={highlighted ? 2.4 : 1.6}
            />
          </mesh>
          <mesh position={[0, -0.2, 0]} rotation={[-Math.PI / 2, 0, 0]}>
            <ringGeometry args={[0.34, 0.42, 24]} />
            <meshBasicMaterial
              color={highlighted ? "#fef08a" : "#f97316"}
            />
          </mesh>
        </group>
      );
    })}
  </>
);

export const TacticalEffectsLayer = ({
  tacticalMap,
  selectedPosition,
  coveringFireTargetOptions,
  plannedCoveringFireCells,
  plannedGrenadeBlastCells,
  activeCombatantIds,
}: TacticalEffectsLayerProps) => {
  const { scenario } = tacticalMap;
  const { width, height } = scenario;

  return (
    <>
      {tacticalMap.coveringFireTargeting && (
        <CoveringFirePreview
          cells={coveringFireTargetOptions}
          width={width}
          height={height}
          color="#64748b"
        />
      )}
      {selectedPosition && tacticalMap.plannedCoveringFireTarget && (
        <CoveringFirePreview
          cells={plannedCoveringFireCells}
          width={width}
          height={height}
          color="#94a3b8"
        />
      )}
      {tacticalMap.coveringFireLanes.map((lane) =>
        activeCombatantIds.has(lane.attackerId) ? (
          <CoveringFirePreview
            key={lane.attackerId}
            cells={lane.cells}
            width={width}
            height={height}
            color="#ef4444"
          />
        ) : null,
      )}
      {tacticalMap.plannedGrenadeTarget && (
        <BlastAreaPreview
          center={tacticalMap.plannedGrenadeTarget}
          cells={plannedGrenadeBlastCells}
          width={width}
          height={height}
          resolved={false}
          label={`${
            tacticalMap.grenadeKind === "smoke" ? "Smoke" : "Grenade"
          } target`}
          color={
            tacticalMap.grenadeKind === "smoke" ? "#94a3b8" : undefined
          }
        />
      )}
      {tacticalMap.lastGrenadeImpact && (
        <BlastAreaPreview
          center={tacticalMap.lastGrenadeImpact.landing}
          cells={tacticalMap.lastGrenadeImpact.blastCells}
          width={width}
          height={height}
          resolved
          label={`${
            tacticalMap.lastGrenadeImpact.kind === "smoke"
              ? "Smoke"
              : "Grenade"
          } impact`}
          color={
            tacticalMap.lastGrenadeImpact.kind === "smoke"
              ? "#64748b"
              : undefined
          }
        />
      )}
      {tacticalMap.lastWeaponImpact && (
        <BlastAreaPreview
          center={tacticalMap.lastWeaponImpact.point}
          cells={tacticalMap.lastWeaponImpact.blastCells}
          width={width}
          height={height}
          resolved
          label={`${tacticalMap.lastWeaponImpact.weaponName} ${tacticalMap.lastWeaponImpact.ammunitionLabel} impact`}
        />
      )}
      {tacticalMap.lastSatchelImpact && (
        <BlastAreaPreview
          center={tacticalMap.lastSatchelImpact.point}
          cells={tacticalMap.lastSatchelImpact.blastCells}
          width={width}
          height={height}
          resolved
          label="Satchel impact · penetration 30"
          color="#f97316"
        />
      )}
      <SatchelChargeMarkers
        charges={tacticalMap.satchelCharges}
        width={width}
        height={height}
      />
      <FireArea
        cells={scenario.fireCells ?? []}
        selected={tacticalMap.plannedExtinguishFire ?? null}
        scenario={scenario}
      />
      <SmokeArea
        cells={scenario.smokeCells ?? []}
        width={width}
        height={height}
      />
    </>
  );
};
