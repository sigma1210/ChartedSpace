import type { PointerEvent as ReactPointerEvent } from "react";
import type { TacticalDrawnTerrainPrimitive } from "@/plugins/characterCombat/tacticalScenarioDefinitions";
import type { CirclePrimitiveDrag } from "@/plugins/characterCombat/editor/lib/tacticalEditorInteractionState";

export type TacticalEditorLegacyCircleLayerProps = {
  primitives: TacticalDrawnTerrainPrimitive[];
  selectedPrimitiveId: string | null;
  interactionDisabled: boolean;
  onSelectPrimitive: (id: string) => void;
  onBeginDrag: (id: string, kind: CirclePrimitiveDrag["kind"]) => void;
};

const TacticalEditorLegacyCircleLayer = ({
  primitives,
  selectedPrimitiveId,
  interactionDisabled,
  onSelectPrimitive,
  onBeginDrag,
}: TacticalEditorLegacyCircleLayerProps) => <>
  {primitives.map((primitive) => {
    const selected = primitive.id === selectedPrimitiveId;
    const wall = primitive.terrainType === "wall";
    const raised = primitive.terrainType === "raised-area";
    const machinery = primitive.terrainType === "close-machinery";
    const fill = raised ? "#22d3ee" : machinery ? "#b45309" : "#0284c7";
    const outline = selected ? "#fef08a" : wall ? "#cbd5e1" : raised ? "#67e8f9" : machinery ? "#fbbf24" : "#7dd3fc";
    const selectCircle = (event: ReactPointerEvent<SVGElement>) => {
      if (interactionDisabled) return;
      event.stopPropagation();
      onSelectPrimitive(primitive.id);
    };
    const beginHandleDrag = (
      event: ReactPointerEvent<SVGCircleElement>,
      kind: CirclePrimitiveDrag["kind"],
    ) => {
      if (interactionDisabled) return;
      event.preventDefault();
      event.stopPropagation();
      event.currentTarget.setPointerCapture(event.pointerId);
      onSelectPrimitive(primitive.id);
      onBeginDrag(primitive.id, kind);
    };
    return <g key={primitive.id} data-testid={`terrain-circle-${primitive.id}`}>
      <circle
        cx={primitive.center.x}
        cy={primitive.center.y}
        r={primitive.radius}
        fill={fill}
        fillOpacity={wall ? "0" : primitive.terrainType === "liquid-hydrogen" && primitive.settings?.filled === false ? "0.08" : raised ? "0.12" : "0.28"}
        stroke={outline}
        strokeWidth={selected ? "0.34" : "0.24"}
        className={interactionDisabled ? undefined : "cursor-pointer"}
        onPointerDown={selectCircle}
      />
      {selected && <>
        <line
          x1={primitive.center.x}
          y1={primitive.center.y}
          x2={primitive.center.x + primitive.radius}
          y2={primitive.center.y}
          stroke="#fef08a"
          strokeWidth="0.08"
          strokeDasharray="0.25 0.15"
          pointerEvents="none"
        />
        <circle
          data-testid={`terrain-circle-${primitive.id}-center-handle`}
          aria-label={`Move ${primitive.id} center`}
          cx={primitive.center.x}
          cy={primitive.center.y}
          r="0.32"
          fill="#0891b2"
          stroke="#cffafe"
          strokeWidth="0.1"
          className="cursor-move"
          onPointerDown={(event) => beginHandleDrag(event, "center")}
        />
        <circle
          data-testid={`terrain-circle-${primitive.id}-radius-handle`}
          aria-label={`Resize ${primitive.id} radius`}
          cx={primitive.center.x + primitive.radius}
          cy={primitive.center.y}
          r="0.32"
          fill="#d97706"
          stroke="#fef3c7"
          strokeWidth="0.1"
          className="cursor-ew-resize"
          onPointerDown={(event) => beginHandleDrag(event, "radius")}
        />
      </>}
    </g>;
  })}
</>;

export default TacticalEditorLegacyCircleLayer;
