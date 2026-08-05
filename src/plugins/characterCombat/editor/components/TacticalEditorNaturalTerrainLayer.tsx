import type { PointerEvent as ReactPointerEvent } from "react";
import { tacticalNaturalTerrainFootprintCells } from "@/plugins/characterCombat/tacticalNaturalTerrain";
import type {
  TacticalNaturalTerrainPlacement,
  TacticalScenarioDefinitionFile,
} from "@/plugins/characterCombat/tacticalScenarioDefinitions";
import { cellKey, naturalTerrainEditorColor } from "@/plugins/characterCombat/editor/lib/tacticalEditorSupport";

export type TacticalEditorNaturalTerrainLayerProps = {
  placements: TacticalNaturalTerrainPlacement[];
  map: TacticalScenarioDefinitionFile["map"];
  selectedNaturalTerrainId: string | null;
  interactionDisabled: boolean;
  onBeginPositionDrag: (id: string, event: ReactPointerEvent<SVGElement>) => void;
  onBeginRadiusDrag: (id: string) => void;
};

const TacticalEditorNaturalTerrainLayer = ({
  placements,
  map,
  selectedNaturalTerrainId,
  interactionDisabled,
  onBeginPositionDrag,
  onBeginRadiusDrag,
}: TacticalEditorNaturalTerrainLayerProps) => <>
  {placements.map((placement) => {
    const selected = placement.id === selectedNaturalTerrainId;
    const center = {
      x: placement.position.x + 0.5,
      y: placement.position.y + 0.5,
    };
    const footprint = tacticalNaturalTerrainFootprintCells(
      placement,
      map.width,
      map.height,
    );
    const colors = naturalTerrainEditorColor(placement.kind);
    const beginPositionDrag = (event: ReactPointerEvent<SVGElement>) => {
      if (interactionDisabled) return;
      event.preventDefault();
      event.stopPropagation();
      event.currentTarget.setPointerCapture(event.pointerId);
      onBeginPositionDrag(placement.id, event);
    };
    const beginRadiusDrag = (event: ReactPointerEvent<SVGCircleElement>) => {
      if (interactionDisabled) return;
      event.preventDefault();
      event.stopPropagation();
      event.currentTarget.setPointerCapture(event.pointerId);
      onBeginRadiusDrag(placement.id);
    };
    return <g key={placement.id} data-testid={`natural-terrain-${placement.id}`}>
      {selected && footprint.map((cell) => <rect
        key={`footprint:${cellKey(cell)}`}
        data-testid={`natural-terrain-${placement.id}-footprint-${cellKey(cell)}`}
        x={cell.x + 0.06}
        y={cell.y + 0.06}
        width="0.88"
        height="0.88"
        fill={colors.footprint}
        fillOpacity="0.2"
        stroke="#fef08a"
        strokeWidth="0.08"
        pointerEvents="none"
      />)}
      <circle
        cx={center.x}
        cy={center.y}
        r={placement.radius}
        fill={colors.fill}
        fillOpacity={placement.kind === "tree" ? "0.42" : "0.5"}
        stroke={selected ? "#fef08a" : colors.stroke}
        strokeWidth={selected ? "0.2" : "0.1"}
        className={interactionDisabled ? undefined : "cursor-move"}
        onPointerDown={beginPositionDrag}
      />
      {placement.kind === "tree" && <rect
        x={placement.position.x + 0.32}
        y={placement.position.y + 0.32}
        width="0.36"
        height="0.36"
        rx="0.08"
        fill="#78350f"
        stroke="#fbbf24"
        strokeWidth="0.07"
        pointerEvents="none"
      />}
      <text x={center.x} y={center.y + 0.12} textAnchor="middle" fill="#ecfccb" fontSize="0.3" fontWeight="bold" pointerEvents="none">
        {colors.marker}
      </text>
      {selected && <>
        <line x1={center.x} y1={center.y} x2={center.x + placement.radius} y2={center.y} stroke="#fef08a" strokeWidth="0.07" strokeDasharray="0.2 0.12" pointerEvents="none" />
        <circle
          data-testid={`natural-terrain-${placement.id}-radius-handle`}
          aria-label={`Resize ${placement.id}`}
          cx={center.x + placement.radius}
          cy={center.y}
          r="0.25"
          fill={colors.fill}
          stroke="#fef9c3"
          strokeWidth="0.09"
          className="cursor-ew-resize"
          onPointerDown={beginRadiusDrag}
        />
      </>}
    </g>;
  })}
</>;

export default TacticalEditorNaturalTerrainLayer;
