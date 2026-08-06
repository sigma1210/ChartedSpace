import type { PointerEvent as ReactPointerEvent } from "react";
import type {
  TacticalEnemyPlacement,
  TacticalTerrainPlacement,
} from "@/plugins/characterCombat/tacticalScenarioDefinitions";
import type { GridPoint } from "@/plugins/characterCombat/types";
import {
  cellKey,
  facingName,
  facingVector,
} from "@/plugins/characterCombat/editor/lib/tacticalEditorSupport";
import type { TacticalEditorPlacementControl } from "@/plugins/characterCombat/editor/hooks/useTacticalEditorPlacementControls";

export type TacticalEditorScenarioMarkersLayerProps = {
  placementControls: TacticalEditorPlacementControl[];
  fireCells: GridPoint[];
  enemies: TacticalEnemyPlacement[];
  enemyHover: GridPoint | null;
  enemyPreviewActive: boolean;
  selectedPlacementId: string | null;
  selectedEnemyId: string | null;
  selectedFire: GridPoint | null;
  interactionDisabled: boolean;
  onBeginPlacementDrag: (placement: TacticalTerrainPlacement, event: ReactPointerEvent<SVGRectElement>) => void;
  onSelectFire: (cell: GridPoint) => void;
  onBeginEnemyDrag: (enemy: TacticalEnemyPlacement, event: ReactPointerEvent<SVGGElement>) => void;
};

const TacticalEditorScenarioMarkersLayer = ({
  placementControls,
  fireCells,
  enemies,
  enemyHover,
  enemyPreviewActive,
  selectedPlacementId,
  selectedEnemyId,
  selectedFire,
  interactionDisabled,
  onBeginPlacementDrag,
  onSelectFire,
  onBeginEnemyDrag,
}: TacticalEditorScenarioMarkersLayerProps) => <>
  {placementControls.map(({ placement, size }) => {
    const selected = placement.id === selectedPlacementId;
    return <rect key={`placement-control:${placement.id}`} data-testid={`terrain-placement-control-${placement.id}`} data-rotation={placement.rotation} x={placement.origin.x} y={placement.origin.y} width={size.width} height={size.height}
      fill={selected ? "#22d3ee" : "transparent"} fillOpacity={selected ? 0.16 : 0} stroke={selected ? "#fef08a" : "transparent"} strokeOpacity={selected ? 1 : 0.72} strokeWidth={selected ? "0.24" : "0.12"}
      className={interactionDisabled ? undefined : "cursor-move"} onPointerDown={(event) => {
        if (interactionDisabled) return;
        event.stopPropagation();
        onBeginPlacementDrag(placement, event);
      }} />;
  })}
  {fireCells.map((cell) => {
    const selected = selectedFire && cellKey(selectedFire) === cellKey(cell);
    return <circle key={`fire:${cell.x}:${cell.y}`} cx={cell.x + 0.5} cy={cell.y + 0.5} r="0.32" fill="#f97316" stroke={selected ? "#fef08a" : "#fed7aa"} strokeWidth={selected ? "0.18" : "0.08"}
      className={interactionDisabled ? undefined : "cursor-pointer"} onPointerDown={(event) => {
        if (interactionDisabled) return;
        event.stopPropagation();
        onSelectFire(cell);
      }} />;
  })}
  {enemyPreviewActive && enemyHover && <g data-testid="enemy-placement-preview" pointerEvents="none">
    <circle cx={enemyHover.x + 0.5} cy={enemyHover.y + 0.5} r="0.38" fill="#ef4444" fillOpacity="0.35" stroke="#fecaca" strokeWidth="0.12" />
    <text x={enemyHover.x + 0.5} y={enemyHover.y + 0.62} textAnchor="middle" fill="#fee2e2" fontSize="0.34" fontWeight="bold">E</text>
    <line x1={enemyHover.x + 0.5} y1={enemyHover.y + 0.5} x2={enemyHover.x + 0.5} y2={enemyHover.y + 0.1} stroke="#fef08a" strokeWidth="0.1" />
    <circle cx={enemyHover.x + 0.5} cy={enemyHover.y + 0.1} r="0.08" fill="#fef08a" />
  </g>}
  {enemies.map((enemy) => {
    const selected = enemy.id === selectedEnemyId;
    const direction = facingVector(enemy.facing ?? "north");
    return <g key={enemy.id} data-testid={`enemy-marker-${enemy.id}`} aria-label={`${enemy.name} · facing ${facingName(enemy.facing ?? "north")}`} className={interactionDisabled ? undefined : "cursor-move"} onPointerDown={(event) => {
      if (interactionDisabled) return;
      event.stopPropagation();
      onBeginEnemyDrag(enemy, event);
    }}>
      <circle cx={enemy.position.x + 0.5} cy={enemy.position.y + 0.5} r="0.58" fill="transparent" pointerEvents="all" />
      <circle cx={enemy.position.x + 0.5} cy={enemy.position.y + 0.5} r="0.38" fill="#7f1d1d" stroke={selected ? "#fef08a" : "#f87171"} strokeWidth={selected ? "0.18" : "0.1"} />
      <text x={enemy.position.x + 0.5} y={enemy.position.y + 0.62} textAnchor="middle" fill="#fee2e2" fontSize="0.34" fontWeight="bold">E</text>
      <line x1={enemy.position.x + 0.5} y1={enemy.position.y + 0.5} x2={enemy.position.x + 0.5 + direction.x * 0.4} y2={enemy.position.y + 0.5 + direction.y * 0.4} stroke="#fef08a" strokeWidth="0.1" />
      <circle cx={enemy.position.x + 0.5 + direction.x * 0.4} cy={enemy.position.y + 0.5 + direction.y * 0.4} r="0.08" fill="#fef08a" />
    </g>;
  })}
</>;

export default TacticalEditorScenarioMarkersLayer;
