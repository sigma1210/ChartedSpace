import type { PointerEvent as ReactPointerEvent } from "react";
import type {
  ResolvedTacticalScenarioTerrain,
  TacticalDrawnTerrainPrimitive,
  TacticalDrawnWall,
} from "@/plugins/characterCombat/tacticalScenarioDefinitions";
import type { WallEndpoint } from "@/plugins/characterCombat/editor/lib/tacticalEditorInteractionState";

export type TacticalEditorWallsLayerProps = {
  resolvedWalls: ResolvedTacticalScenarioTerrain["walls"];
  drawnWalls: TacticalDrawnWall[];
  circlePrimitives: TacticalDrawnTerrainPrimitive[];
  selectedWallId: string | null;
  interactionDisabled: boolean;
  onBeginMove: (id: string, event: ReactPointerEvent<SVGElement>) => void;
  onBeginControlDrag: (id: string) => void;
  onBeginEndpointDrag: (id: string, endpoint: WallEndpoint) => void;
};

const TacticalEditorWallsLayer = ({
  resolvedWalls,
  drawnWalls,
  circlePrimitives,
  selectedWallId,
  interactionDisabled,
  onBeginMove,
  onBeginControlDrag,
  onBeginEndpointDrag,
}: TacticalEditorWallsLayerProps) => <>
  {resolvedWalls.filter((wall) =>
    !drawnWalls.some((drawnWall) =>
      drawnWall.id === wall.id
      || (drawnWall.control && wall.id.startsWith(`${drawnWall.id}:curve:`)))
    && !circlePrimitives.some((primitive) =>
      primitive.terrainType === "wall"
      && wall.id.startsWith(`${primitive.id}:wall:`)))
    .map((wall) => <line key={wall.id} x1={wall.from.x} y1={wall.from.y} x2={wall.to.x} y2={wall.to.y} stroke="#94a3b8" strokeWidth="0.22" />)}
  {drawnWalls.map((wall) => {
    const selected = wall.id === selectedWallId;
    const beginMove = (event: ReactPointerEvent<SVGElement>) => {
      if (interactionDisabled) return;
      event.stopPropagation();
      onBeginMove(wall.id, event);
    };
    const beginControlDrag = (event: ReactPointerEvent<SVGCircleElement>) => {
      event.preventDefault();
      event.stopPropagation();
      event.currentTarget.setPointerCapture(event.pointerId);
      onBeginControlDrag(wall.id);
    };
    const beginEndpointDrag = (
      event: ReactPointerEvent<SVGCircleElement>,
      endpoint: WallEndpoint,
    ) => {
      event.preventDefault();
      event.stopPropagation();
      event.currentTarget.setPointerCapture(event.pointerId);
      onBeginEndpointDrag(wall.id, endpoint);
    };
    return <g key={wall.id}>
      {wall.control ? <path
        data-testid={`drawn-wall-${wall.id}`}
        d={`M ${wall.from.x} ${wall.from.y} Q ${wall.control.x} ${wall.control.y} ${wall.to.x} ${wall.to.y}`}
        fill="none"
        stroke={selected ? "#fef08a" : "#94a3b8"}
        strokeWidth={selected ? "0.34" : "0.22"}
        className={interactionDisabled ? undefined : "cursor-move"}
        onPointerDown={beginMove}
      /> : <line
        data-testid={`drawn-wall-${wall.id}`}
        x1={wall.from.x}
        y1={wall.from.y}
        x2={wall.to.x}
        y2={wall.to.y}
        stroke={selected ? "#fef08a" : "#94a3b8"}
        strokeWidth={selected ? "0.34" : "0.22"}
        className={interactionDisabled ? undefined : "cursor-move"}
        onPointerDown={beginMove}
      />}
      {selected && wall.control && <g>
        <line x1={wall.from.x} y1={wall.from.y} x2={wall.control.x} y2={wall.control.y} stroke="#a78bfa" strokeWidth="0.08" strokeDasharray="0.3 0.2" pointerEvents="none" />
        <line x1={wall.control.x} y1={wall.control.y} x2={wall.to.x} y2={wall.to.y} stroke="#a78bfa" strokeWidth="0.08" strokeDasharray="0.3 0.2" pointerEvents="none" />
        <circle
          data-testid={`wall-${wall.id}-control-handle`}
          aria-label="Reshape curved wall"
          cx={wall.control.x}
          cy={wall.control.y}
          r="0.32"
          fill="#7c3aed"
          stroke="#ede9fe"
          strokeWidth="0.1"
          className="cursor-move"
          onPointerDown={beginControlDrag}
        />
      </g>}
      {selected && (["from", "to"] as const).map((endpoint) => <circle
        key={endpoint}
        data-testid={`wall-${wall.id}-${endpoint}-handle`}
        aria-label={`Resize wall ${endpoint} endpoint`}
        cx={wall[endpoint].x}
        cy={wall[endpoint].y}
        r="0.28"
        fill={endpoint === "from" ? "#22d3ee" : "#f59e0b"}
        stroke="#f8fafc"
        strokeWidth="0.09"
        className="cursor-move"
        onPointerDown={(event) => beginEndpointDrag(event, endpoint)}
      />)}
    </g>;
  })}
</>;

export default TacticalEditorWallsLayer;
