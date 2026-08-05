import type { PointerEvent as ReactPointerEvent } from "react";
import type {
  ResolvedTacticalScenarioTerrain,
  TacticalDrawnArea,
  TacticalDrawnTerrainPrimitive,
  TacticalDrawnWall,
} from "@/plugins/characterCombat/tacticalScenarioDefinitions";

export type TacticalEditorWallPortalsLayerProps = {
  doors: ResolvedTacticalScenarioTerrain["doors"];
  drawnWalls: TacticalDrawnWall[];
  drawnAreas: TacticalDrawnArea[];
  circlePrimitives: TacticalDrawnTerrainPrimitive[];
  selectedPortalId: string | null;
  interactionDisabled: boolean;
  onBeginPortalDrag: (id: string) => void;
};

const TacticalEditorWallPortalsLayer = ({
  doors,
  drawnWalls,
  drawnAreas,
  circlePrimitives,
  selectedPortalId,
  interactionDisabled,
  onBeginPortalDrag,
}: TacticalEditorWallPortalsLayerProps) => {
  const editablePortalIds = new Set([
    ...drawnWalls.flatMap((wall) => (wall.portals ?? []).map((portal) => portal.id)),
    ...drawnAreas.flatMap((area) => (area.portals ?? []).map((portal) => portal.id)),
    ...circlePrimitives.flatMap((primitive) => (primitive.portals ?? []).map((portal) => portal.id)),
  ]);
  const beginPortalDrag = (doorId: string, event: ReactPointerEvent<SVGElement>) => {
    if (!editablePortalIds.has(doorId) || interactionDisabled) return;
    event.stopPropagation();
    event.currentTarget.setPointerCapture(event.pointerId);
    onBeginPortalDrag(doorId);
  };

  return <>
    {doors.filter((door) => door.portalType !== "iris-valve").map((door) => <line
      key={door.id}
      data-testid={editablePortalIds.has(door.id) ? `wall-portal-${door.id}` : undefined}
      x1={door.from.x}
      y1={door.from.y}
      x2={door.to.x}
      y2={door.to.y}
      stroke={door.id === selectedPortalId ? "#fef08a" : "#fbbf24"}
      strokeWidth={door.id === selectedPortalId ? "0.46" : "0.32"}
      className={editablePortalIds.has(door.id) && !interactionDisabled ? "cursor-move" : undefined}
      onPointerDown={(event) => beginPortalDrag(door.id, event)}
    />)}
    {doors.filter((door) => door.portalType === "iris-valve").map((door) => {
      const center = { x: (door.from.x + door.to.x) / 2, y: (door.from.y + door.to.y) / 2 };
      return <g
        key={door.id}
        data-testid={editablePortalIds.has(door.id) ? `wall-portal-${door.id}` : undefined}
        className={editablePortalIds.has(door.id) && !interactionDisabled ? "cursor-move" : undefined}
        onPointerDown={(event) => beginPortalDrag(door.id, event)}
      >
        <circle cx={center.x} cy={center.y} r="0.3" fill="#334155" stroke={door.id === selectedPortalId ? "#fef08a" : "#fbbf24"} strokeWidth={door.id === selectedPortalId ? "0.16" : "0.1"} />
        {[0, 60, 120].map((angle) => <line key={angle} x1={center.x - 0.25 * Math.cos(angle * Math.PI / 180)} y1={center.y - 0.25 * Math.sin(angle * Math.PI / 180)} x2={center.x + 0.25 * Math.cos(angle * Math.PI / 180)} y2={center.y + 0.25 * Math.sin(angle * Math.PI / 180)} stroke="#94a3b8" strokeWidth="0.035" />)}
      </g>;
    })}
  </>;
};

export default TacticalEditorWallPortalsLayer;
